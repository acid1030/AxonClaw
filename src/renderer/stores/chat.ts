/**
 * Chat State Store
 * Manages chat messages, sessions, streaming, and thinking state.
 * Communicates with OpenClaw Gateway via renderer WebSocket RPC.
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from './gateway';
import { useAgentsStore } from './agents';
import { buildCronSessionHistoryPath, isCronSessionKey } from './chat/cron-session-utils';

// ── Types ────────────────────────────────────────────────────────

/** Metadata for locally-attached files (not from Gateway) */
export interface AttachedFileMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
  preview: string | null;
  filePath?: string;
}

/** Raw message from OpenClaw chat.history */
export interface RawMessage {
  role: 'user' | 'assistant' | 'system' | 'toolresult';
  content: unknown; // string | ContentBlock[]
  timestamp?: number;
  id?: string;
  toolCallId?: string;
  toolName?: string;
  details?: unknown;
  isError?: boolean;
  /** Local-only: file metadata for user-uploaded attachments (not sent to/from Gateway) */
  _attachedFiles?: AttachedFileMeta[];
}

/** Content block inside a message */
export interface ContentBlock {
  type: 'text' | 'image' | 'thinking' | 'tool_use' | 'tool_result' | 'toolCall' | 'toolResult';
  text?: string;
  thinking?: string;
  source?: { type: string; media_type?: string; data?: string; url?: string };
  /** Flat image format from Gateway tool results (no source wrapper) */
  data?: string;
  mimeType?: string;
  id?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
  content?: unknown;
}

/** Session from sessions.list */
export interface ChatSession {
  key: string;
  label?: string;
  displayName?: string;
  thinkingLevel?: string;
  model?: string;
  updatedAt?: number;
}

export interface ToolStatus {
  id?: string;
  toolCallId?: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
  summary?: string;
  updatedAt: number;
}

interface ChatState {
  // Messages
  messages: RawMessage[];
  loading: boolean;
  error: string | null;

  // Streaming
  sending: boolean;
  activeRunId: string | null;
  streamingText: string;
  streamingMessage: unknown | null;
  streamingTools: ToolStatus[];
  pendingFinal: boolean;
  lastUserMessageAt: number | null;
  /** Images collected from tool results, attached to the next assistant message */
  pendingToolImages: AttachedFileMeta[];

  // Sessions
  sessions: ChatSession[];
  currentSessionKey: string;
  currentAgentId: string;
  /** First user message text per session key, used as display label */
  sessionLabels: Record<string, string>;
  /** Last message timestamp (ms) per session key, used for sorting */
  sessionLastActivity: Record<string, number>;

  // Thinking
  showThinking: boolean;
  thinkingLevel: string | null;

  /** 刚添加的 AI 消息 id，用于打字机效果，30 秒后清除 */
  lastAddedMessageId: string | null;

  // Actions
  loadSessions: () => Promise<void>;
  switchSession: (key: string) => void;
  newSession: () => void;
  deleteSession: (key: string) => Promise<void>;
  cleanupEmptySession: () => void;
  setSessionLabel: (sessionKey: string, label: string) => void;
  loadHistory: (quiet?: boolean) => Promise<void>;
  /** 加载历史，支持指定日期前或更大 limit */
  loadHistoryWithOptions: (options?: { beforeTs?: number; limit?: number }) => Promise<void>;
  sendMessage: (
    text: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>,
    targetAgentId?: string | null,
  ) => Promise<void>;
  abortRun: () => Promise<void>;
  handleChatEvent: (event: Record<string, unknown>) => void;
  toggleThinking: () => void;
  refresh: () => Promise<void>;
  clearError: () => void;
}

// Module-level timestamp tracking the last chat event received.
// Used by the safety timeout to avoid false-positive "no response" errors
// during tool-use conversations where streamingMessage is temporarily cleared
// between tool-result finals and the next delta.
let _lastChatEventAt = 0;
const SESSION_LIST_FETCH_LIMIT = 5000;
const HISTORY_DEFAULT_LIMIT = 5000;
const _emptySessionHitCount = new Map<string, number>();
const _hiddenEmptySessionKeys = new Set<string>();

function noteSessionHasMessages(sessionKey: string): void {
  if (!sessionKey) return;
  _emptySessionHitCount.delete(sessionKey);
  _hiddenEmptySessionKeys.delete(sessionKey);
}

function shouldHideAfterEmpty(sessionKey: string): boolean {
  // Disable auto-hiding: transient empty history responses must not hide
  // valid sessions or make historical conversations disappear.
  void sessionKey;
  return false;
}

/** Normalize a timestamp to milliseconds. Handles both seconds and ms. */
function toMs(ts: number): number {
  // Timestamps < 1e12 are in seconds (before ~2033); >= 1e12 are milliseconds
  return ts < 1e12 ? ts * 1000 : ts;
}

function isGenericSessionLabel(label: string | undefined, sessionKey: string): boolean {
  const normalizedLabel = String(label || '').trim().toLowerCase();
  if (!normalizedLabel) return true;

  const normalizedKey = String(sessionKey || '').trim().toLowerCase();
  if (!normalizedKey) return false;

  if (normalizedLabel === normalizedKey) return true;

  const keyParts = normalizedKey.split(':').filter(Boolean);
  const tail = keyParts[keyParts.length - 1];
  const head = keyParts[0];
  const genericTokens = new Set(['main', 'session', 'chat', 'assistant', '助手', 'ai', 'bot']);

  if (genericTokens.has(normalizedLabel)) return true;
  if (tail && normalizedLabel === tail && genericTokens.has(tail)) return true;
  if (head && normalizedLabel === head && genericTokens.has(head)) return true;

  if (normalizedKey.startsWith('agent:')) {
    const agentId = keyParts[1];
    if (agentId && normalizedLabel === agentId) return true;
    if (agentId && normalizedLabel === `agent:${agentId}`) return true;
  }

  return false;
}

// Timer for fallback history polling during active sends.
// If no streaming events arrive within a few seconds, we periodically
// poll chat.history to surface intermediate tool-call turns.
let _historyPollTimer: ReturnType<typeof setTimeout> | null = null;

// Timer for delayed error finalization. When the Gateway reports a mid-stream
// error (e.g. "terminated"), it may retry internally and recover. We wait
// before committing the error to give the recovery path a chance.
let _errorRecoveryTimer: ReturnType<typeof setTimeout> | null = null;

function clearErrorRecoveryTimer(): void {
  if (_errorRecoveryTimer) {
    clearTimeout(_errorRecoveryTimer);
    _errorRecoveryTimer = null;
  }
}

function clearHistoryPoll(): void {
  if (_historyPollTimer) {
    clearTimeout(_historyPollTimer);
    _historyPollTimer = null;
  }
}

function isTimeoutLikeErrorMessage(message: string): boolean {
  const lower = String(message || '').toLowerCase();
  return (
    lower.includes('timeout')
    || lower.includes('timed out')
    || lower.includes('llm request timed out')
    || lower.includes('gateway ws timeout')
  );
}

function toFriendlyChatSendError(message: string): string {
  if (!message) return 'Failed to send message';
  const lower = String(message || '').toLowerCase();
  if (lower.includes('failed to extract accountid from token')) {
    return 'OpenAI GPT Auth is invalid or expired. Please re-login OpenAI in 模型认证 and retry.';
  }
  if (isTimeoutLikeErrorMessage(message)) {
    return 'LLM request timed out. The selected model may be overloaded or unreachable. Please retry or switch model/provider.';
  }
  return message;
}

function providerFromModelValue(modelValue: string): string {
  const value = String(modelValue || '').trim();
  if (!value) return '';
  if (value.includes('/')) {
    const provider = String(value.split('/')[0] || '').trim().toLowerCase();
    return provider === 'openai-codex' ? 'openai' : provider;
  }
  const lower = value.toLowerCase();
  if (
    lower.includes('codex')
    || lower.startsWith('gpt-')
    || /^o\d/.test(lower)
  ) {
    return 'openai';
  }
  return lower;
}

function isLikelyOpenAiApiKeyValue(rawValue: unknown): boolean {
  const value = String(rawValue || '').trim();
  if (!value) return false;
  return /^sk-[A-Za-z0-9._-]{10,}$/.test(value);
}

async function inspectOpenAiProviderAuthStatus(): Promise<{
  checked: boolean;
  hasUsableAuth: boolean;
  hasValidApiKey: boolean;
  hasOAuthToken: boolean;
  hasProviderCredential: boolean;
  hasInvalidStoredKey: boolean;
}> {
  const candidates = ['openai', 'openai-codex'];
  let checked = false;
  let hasValidApiKey = false;
  let hasProviderCredential = false;
  let hasInvalidStoredKey = false;
  let hasOAuthToken = false;

  for (const providerId of candidates) {
    try {
      const result = await hostApiFetch<{ apiKey?: string | null }>(`/api/providers/${encodeURIComponent(providerId)}/api-key`);
      checked = true;
      const apiKey = String(result?.apiKey || '').trim();
      if (!apiKey) continue;
      if (isLikelyOpenAiApiKeyValue(apiKey)) {
        hasValidApiKey = true;
      } else {
        hasInvalidStoredKey = true;
      }
    } catch {
      // ignore per provider and continue fallback checks
    }
  }

  try {
    const oauthState = await hostApiFetch<{ success?: boolean; accessToken?: string | null }>('/api/app/codex/session-token');
    if (oauthState?.success && String(oauthState?.accessToken || '').trim()) {
      hasOAuthToken = true;
      checked = true;
    }
  } catch {
    // ignore oauth status probe failures
  }

  try {
    const providerStatuses = await hostApiFetch<Array<{ id?: string; type?: string; hasKey?: boolean }>>('/api/providers');
    for (const status of providerStatuses || []) {
      const type = String(status?.type || '').trim().toLowerCase();
      if (type !== 'openai' && type !== 'openai-codex') continue;
      if (Boolean(status?.hasKey)) {
        hasProviderCredential = true;
        checked = true;
        break;
      }
    }
  } catch {
    // ignore providers probe failures
  }

  return {
    checked,
    hasUsableAuth: hasValidApiKey || hasOAuthToken || hasProviderCredential,
    hasValidApiKey,
    hasOAuthToken,
    hasProviderCredential,
    hasInvalidStoredKey,
  };
}

let _openAiAuthRepairInFlight = false;
async function repairOpenAiAuthArtifacts(): Promise<{ hasValidApiKey?: boolean } | null> {
  if (_openAiAuthRepairInFlight) return null;
  _openAiAuthRepairInFlight = true;
  try {
    return await hostApiFetch<{ hasValidApiKey?: boolean }>('/api/app/openai/repair-auth', { method: 'POST' });
  } catch {
    return null;
  } finally {
    _openAiAuthRepairInFlight = false;
  }
}

function extractChatEventErrorMessage(event: Record<string, unknown>): string {
  const candidates: Array<unknown> = [];
  candidates.push(event.errorMessage, event.error);
  const messageObj = event.message && typeof event.message === 'object'
    ? (event.message as Record<string, unknown>)
    : null;
  if (messageObj) {
    candidates.push(
      messageObj.errorMessage,
      messageObj.error,
      messageObj.message,
      messageObj.reason,
      messageObj.details,
    );
  }

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
    if (candidate && typeof candidate === 'object') {
      const obj = candidate as Record<string, unknown>;
      if (typeof obj.message === 'string' && obj.message.trim()) return obj.message.trim();
      if (typeof obj.error === 'string' && obj.error.trim()) return obj.error.trim();
      if (typeof obj.reason === 'string' && obj.reason.trim()) return obj.reason.trim();
    }
  }

  return 'An error occurred';
}

const DEFAULT_CANONICAL_PREFIX = 'agent:main';
const DEFAULT_SESSION_KEY = `${DEFAULT_CANONICAL_PREFIX}:main`;

// ── Local image cache ─────────────────────────────────────────
// The Gateway doesn't store image attachments in session content blocks,
// so we cache them locally keyed by staged file path (which appears in the
// [media attached: <path> ...] reference in the Gateway's user message text).
// Keying by path avoids the race condition of keying by runId (which is only
// available after the RPC returns, but history may load before that).
const IMAGE_CACHE_KEY = 'clawx:image-cache';
const IMAGE_CACHE_MAX = 100; // max entries to prevent unbounded growth

function loadImageCache(): Map<string, AttachedFileMeta> {
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    if (raw) {
      const entries = JSON.parse(raw) as Array<[string, AttachedFileMeta]>;
      return new Map(entries);
    }
  } catch { /* ignore parse errors */ }
  return new Map();
}

function saveImageCache(cache: Map<string, AttachedFileMeta>): void {
  try {
    // Evict oldest entries if over limit
    const entries = Array.from(cache.entries());
    const trimmed = entries.length > IMAGE_CACHE_MAX
      ? entries.slice(entries.length - IMAGE_CACHE_MAX)
      : entries;
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(trimmed));
  } catch { /* ignore quota errors */ }
}

const _imageCache = loadImageCache();

/** Extract plain text from message content (string or content blocks) */
function getMessageText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return (content as Array<{ type?: string; text?: string }>)
      .filter(b => b.type === 'text' && b.text)
      .map(b => b.text!)
      .join('\n');
  }
  return '';
}

/** Extract media file refs from [media attached: <path> (<mime>) | ...] patterns */
function extractMediaRefs(text: string): Array<{ filePath: string; mimeType: string }> {
  const refs: Array<{ filePath: string; mimeType: string }> = [];
  const regex = /\[media attached:\s*([^\s(]+)\s*\(([^)]+)\)\s*\|[^\]]*\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    refs.push({ filePath: match[1], mimeType: match[2] });
  }
  return refs;
}

/** Map common file extensions to MIME types */
function mimeFromExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    // Images
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'bmp': 'image/bmp',
    'avif': 'image/avif',
    'svg': 'image/svg+xml',
    // Documents
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'ppt': 'application/vnd.ms-powerpoint',
    'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'txt': 'text/plain',
    'csv': 'text/csv',
    'md': 'text/markdown',
    'rtf': 'application/rtf',
    'epub': 'application/epub+zip',
    // Archives
    'zip': 'application/zip',
    'tar': 'application/x-tar',
    'gz': 'application/gzip',
    'rar': 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    // Audio
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'aac': 'audio/aac',
    'flac': 'audio/flac',
    'm4a': 'audio/mp4',
    // Video
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska',
    'webm': 'video/webm',
    'm4v': 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

/**
 * Extract raw file paths from message text.
 * Detects absolute paths (Unix: / or ~/, Windows: C:\ etc.) ending with common file extensions.
 * Handles both image and non-image files, consistent with channel push message behavior.
 */
function extractRawFilePaths(text: string): Array<{ filePath: string; mimeType: string }> {
  const refs: Array<{ filePath: string; mimeType: string }> = [];
  const seen = new Set<string>();
  const exts = 'png|jpe?g|gif|webp|bmp|avif|svg|pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|epub|zip|tar|gz|rar|7z|mp3|wav|ogg|aac|flac|m4a|mp4|mov|avi|mkv|webm|m4v';
  // Unix absolute paths (/... or ~/...) — lookbehind rejects mid-token slashes
  // (e.g. "path/to/file.mp4", "https://example.com/file.mp4")
  const unixRegex = new RegExp(`(?<![\\w./:])((?:\\/|~\\/)[^\\s\\n"'()\\[\\],<>]*?\\.(?:${exts}))`, 'gi');
  // Windows absolute paths (C:\... D:\...) — lookbehind rejects drive letter glued to a word
  const winRegex = new RegExp(`(?<![\\w])([A-Za-z]:\\\\[^\\s\\n"'()\\[\\],<>]*?\\.(?:${exts}))`, 'gi');
  for (const regex of [unixRegex, winRegex]) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const p = match[1];
      if (p && !seen.has(p)) {
        seen.add(p);
        refs.push({ filePath: p, mimeType: mimeFromExtension(p) });
      }
    }
  }
  return refs;
}

/**
 * Extract images from a content array (including nested tool_result content).
 * Converts them to AttachedFileMeta entries with preview set to data URL or remote URL.
 */
function extractImagesAsAttachedFiles(content: unknown): AttachedFileMeta[] {
  if (!Array.isArray(content)) return [];
  const files: AttachedFileMeta[] = [];

  for (const block of content as ContentBlock[]) {
    if (block.type === 'image') {
      // Path 1: Anthropic source-wrapped format {source: {type, media_type, data}}
      if (block.source) {
        const src = block.source;
        const mimeType = src.media_type || 'image/jpeg';

        if (src.type === 'base64' && src.data) {
          files.push({
            fileName: 'image',
            mimeType,
            fileSize: 0,
            preview: `data:${mimeType};base64,${src.data}`,
          });
        } else if (src.type === 'url' && src.url) {
          files.push({
            fileName: 'image',
            mimeType,
            fileSize: 0,
            preview: src.url,
          });
        }
      }
      // Path 2: Flat format from Gateway tool results {data, mimeType}
      else if (block.data) {
        const mimeType = block.mimeType || 'image/jpeg';
        files.push({
          fileName: 'image',
          mimeType,
          fileSize: 0,
          preview: `data:${mimeType};base64,${block.data}`,
        });
      }
    }
    // Recurse into tool_result content blocks
    if ((block.type === 'tool_result' || block.type === 'toolResult') && block.content) {
      files.push(...extractImagesAsAttachedFiles(block.content));
    }
  }
  return files;
}

/**
 * Build an AttachedFileMeta entry for a file ref, using cache if available.
 */
function makeAttachedFile(ref: { filePath: string; mimeType: string }): AttachedFileMeta {
  const cached = _imageCache.get(ref.filePath);
  if (cached) return { ...cached, filePath: ref.filePath };
  const fileName = ref.filePath.split(/[\\/]/).pop() || 'file';
  return { fileName, mimeType: ref.mimeType, fileSize: 0, preview: null, filePath: ref.filePath };
}

/**
 * Extract file path from a tool call's arguments by toolCallId.
 * Searches common argument names: file_path, filePath, path, file.
 */
function getToolCallFilePath(msg: RawMessage, toolCallId: string): string | undefined {
  if (!toolCallId) return undefined;

  // Anthropic/normalized format — toolCall blocks in content array
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type === 'tool_use' || block.type === 'toolCall') && block.id === toolCallId) {
        const args = (block.input ?? block.arguments) as Record<string, unknown> | undefined;
        if (args) {
          const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
          if (typeof fp === 'string') return fp;
        }
      }
    }
  }

  // OpenAI format — tool_calls array on the message itself
  const msgAny = msg as unknown as Record<string, unknown>;
  const toolCalls = msgAny.tool_calls ?? msgAny.toolCalls;
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls as Array<Record<string, unknown>>) {
      if (tc.id !== toolCallId) continue;
      const fn = (tc.function ?? tc) as Record<string, unknown>;
      let args: Record<string, unknown> | undefined;
      try {
        args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments ?? fn.input) as Record<string, unknown>;
      } catch { /* ignore */ }
      if (args) {
        const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
        if (typeof fp === 'string') return fp;
      }
    }
  }

  return undefined;
}

/**
 * Collect all tool call file paths from a message into a Map<toolCallId, filePath>.
 */
function collectToolCallPaths(msg: RawMessage, paths: Map<string, string>): void {
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type === 'tool_use' || block.type === 'toolCall') && block.id) {
        const args = (block.input ?? block.arguments) as Record<string, unknown> | undefined;
        if (args) {
          const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
          if (typeof fp === 'string') paths.set(block.id, fp);
        }
      }
    }
  }
  const msgAny = msg as unknown as Record<string, unknown>;
  const toolCalls = msgAny.tool_calls ?? msgAny.toolCalls;
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls as Array<Record<string, unknown>>) {
      const id = typeof tc.id === 'string' ? tc.id : '';
      if (!id) continue;
      const fn = (tc.function ?? tc) as Record<string, unknown>;
      let args: Record<string, unknown> | undefined;
      try {
        args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments ?? fn.input) as Record<string, unknown>;
      } catch { /* ignore */ }
      if (args) {
        const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
        if (typeof fp === 'string') paths.set(id, fp);
      }
    }
  }
}

/**
 * Before filtering tool_result messages from history, scan them for any file/image
 * content and attach those to the immediately following assistant message.
 * This mirrors channel push message behavior where tool outputs surface files to the UI.
 * Handles:
 *   - Image content blocks (base64 / url)
 *   - [media attached: path (mime) | path] text patterns in tool result output
 *   - Raw file paths in tool result text
 */
function enrichWithToolResultFiles(messages: RawMessage[]): RawMessage[] {
  const pending: AttachedFileMeta[] = [];
  const toolCallPaths = new Map<string, string>();

  return messages.map((msg) => {
    // Track file paths from assistant tool call arguments for later matching
    if (msg.role === 'assistant') {
      collectToolCallPaths(msg, toolCallPaths);
    }

    if (isToolResultRole(msg.role)) {
      // Resolve file path from the matching tool call
      const matchedPath = msg.toolCallId ? toolCallPaths.get(msg.toolCallId) : undefined;

      // 1. Image/file content blocks in the structured content array
      const imageFiles = extractImagesAsAttachedFiles(msg.content);
      if (matchedPath) {
        for (const f of imageFiles) {
          if (!f.filePath) {
            f.filePath = matchedPath;
            f.fileName = matchedPath.split(/[\\/]/).pop() || 'image';
          }
        }
      }
      pending.push(...imageFiles);

      // 2. [media attached: ...] patterns in tool result text output
      const text = getMessageText(msg.content);
      if (text) {
        const mediaRefs = extractMediaRefs(text);
        const mediaRefPaths = new Set(mediaRefs.map(r => r.filePath));
        for (const ref of mediaRefs) {
          pending.push(makeAttachedFile(ref));
        }
        // 3. Raw file paths in tool result text (documents, audio, video, etc.)
        for (const ref of extractRawFilePaths(text)) {
          if (!mediaRefPaths.has(ref.filePath)) {
            pending.push(makeAttachedFile(ref));
          }
        }
      }

      return msg; // will be filtered later
    }

    if (msg.role === 'assistant' && pending.length > 0) {
      const toAttach = pending.splice(0);
      // Deduplicate against files already on the assistant message
      const existingPaths = new Set(
        (msg._attachedFiles || []).map(f => f.filePath).filter(Boolean),
      );
      const newFiles = toAttach.filter(f => !f.filePath || !existingPaths.has(f.filePath));
      if (newFiles.length === 0) return msg;
      return {
        ...msg,
        _attachedFiles: [...(msg._attachedFiles || []), ...newFiles],
      };
    }

    return msg;
  });
}

/**
 * Restore _attachedFiles for messages loaded from history.
 * Handles:
 *   1. [media attached: path (mime) | path] patterns (attachment-button flow)
 *   2. Raw image file paths typed in message text (e.g. /Users/.../image.png)
 * Uses local cache for previews when available; missing previews are loaded async.
 *
 * For assistant messages: even when _attachedFiles already exists (e.g. from tool results),
 * we still extract paths from text and merge them so files appear as separate cards outside
 * the bubble instead of raw paths inside the bubble.
 */
function enrichWithCachedImages(messages: RawMessage[]): RawMessage[] {
  return messages.map((msg, idx) => {
    if (msg.role !== 'user' && msg.role !== 'assistant') return msg;
    const text = getMessageText(msg.content);

    // User messages: skip if already enriched (attachments come from upload flow)
    if (msg.role === 'user' && msg._attachedFiles) return msg;

    // Path 1: [media attached: path (mime) | path] — guaranteed format from attachment button
    const mediaRefs = extractMediaRefs(text);
    const mediaRefPaths = new Set(mediaRefs.map(r => r.filePath));

    // Path 2: Raw file paths.
    // For assistant messages: scan own text AND the nearest preceding user message text,
    // but only for non-tool-only assistant messages (i.e. the final answer turn).
    // Tool-only messages (thinking + tool calls) should not show file previews — those
    // belong to the final answer message that comes after the tool results.
    // User messages never get raw-path previews so the image is not shown twice.
    let rawRefs: Array<{ filePath: string; mimeType: string }> = [];
    if (msg.role === 'assistant' && !isToolOnlyMessage(msg)) {
      // Own text
      rawRefs = extractRawFilePaths(text).filter(r => !mediaRefPaths.has(r.filePath));

      // Nearest preceding user message text (look back up to 5 messages)
      const seenPaths = new Set(rawRefs.map(r => r.filePath));
      for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
        const prev = messages[i];
        if (!prev) break;
        if (prev.role === 'user') {
          const prevText = getMessageText(prev.content);
          for (const ref of extractRawFilePaths(prevText)) {
            if (!mediaRefPaths.has(ref.filePath) && !seenPaths.has(ref.filePath)) {
              seenPaths.add(ref.filePath);
              rawRefs.push(ref);
            }
          }
          break; // only use the nearest user message
        }
      }
    }

    const allRefs = [...mediaRefs, ...rawRefs];
    const existingPaths = new Set(
      (msg._attachedFiles || []).map(f => f.filePath).filter(Boolean),
    );
    const newRefs = allRefs.filter(r => !existingPaths.has(r.filePath));
    if (newRefs.length === 0 && !msg._attachedFiles) return msg;

    const newFiles: AttachedFileMeta[] = newRefs.map(ref => {
      const cached = _imageCache.get(ref.filePath);
      if (cached) return { ...cached, filePath: ref.filePath };
      const fileName = ref.filePath.split(/[\\/]/).pop() || 'file';
      return { fileName, mimeType: ref.mimeType, fileSize: 0, preview: null, filePath: ref.filePath };
    });
    const files = [...(msg._attachedFiles || []), ...newFiles];
    return { ...msg, _attachedFiles: files };
  });
}

/**
 * Async: load missing previews from disk via IPC for messages that have
 * _attachedFiles with null previews. Updates messages in-place and triggers re-render.
 * Handles both [media attached: ...] patterns and raw filePath entries.
 */
async function loadMissingPreviews(messages: RawMessage[]): Promise<boolean> {
  // Collect all image paths that need previews
  const needPreview: Array<{ filePath: string; mimeType: string }> = [];
  const seenPaths = new Set<string>();

  for (const msg of messages) {
    if (!msg._attachedFiles) continue;

    // Path 1: files with explicit filePath field (raw path detection or enriched refs)
    for (const file of msg._attachedFiles) {
      const fp = file.filePath;
      if (!fp || seenPaths.has(fp)) continue;
      // Images: need preview. Non-images: need file size (for FileCard display).
      const needsLoad = file.mimeType.startsWith('image/')
        ? !file.preview
        : file.fileSize === 0;
      if (needsLoad) {
        seenPaths.add(fp);
        needPreview.push({ filePath: fp, mimeType: file.mimeType });
      }
    }

    // Path 2: [media attached: ...] patterns (legacy — in case filePath wasn't stored)
    if (msg.role === 'user') {
      const text = getMessageText(msg.content);
      const refs = extractMediaRefs(text);
      for (let i = 0; i < refs.length; i++) {
        const file = msg._attachedFiles[i];
        const ref = refs[i];
        if (!file || !ref || seenPaths.has(ref.filePath)) continue;
        const needsLoad = ref.mimeType.startsWith('image/') ? !file.preview : file.fileSize === 0;
        if (needsLoad) {
          seenPaths.add(ref.filePath);
          needPreview.push(ref);
        }
      }
    }
  }

  if (needPreview.length === 0) return false;

  try {
    const thumbnails = await hostApiFetch<Record<string, { preview: string | null; fileSize: number }>>(
      '/api/files/thumbnails',
      {
        method: 'POST',
        body: JSON.stringify({ paths: needPreview }),
      },
    );

    let updated = false;
    for (const msg of messages) {
      if (!msg._attachedFiles) continue;

      // Update files that have filePath
      for (const file of msg._attachedFiles) {
        const fp = file.filePath;
        if (!fp) continue;
        const thumb = thumbnails[fp];
        if (thumb && (thumb.preview || thumb.fileSize)) {
          if (thumb.preview) file.preview = thumb.preview;
          if (thumb.fileSize) file.fileSize = thumb.fileSize;
          _imageCache.set(fp, { ...file });
          updated = true;
        }
      }

      // Legacy: update by index for [media attached: ...] refs
      if (msg.role === 'user') {
        const text = getMessageText(msg.content);
        const refs = extractMediaRefs(text);
        for (let i = 0; i < refs.length; i++) {
          const file = msg._attachedFiles[i];
          const ref = refs[i];
          if (!file || !ref || file.filePath) continue; // skip if already handled via filePath
          const thumb = thumbnails[ref.filePath];
          if (thumb && (thumb.preview || thumb.fileSize)) {
            if (thumb.preview) file.preview = thumb.preview;
            if (thumb.fileSize) file.fileSize = thumb.fileSize;
            _imageCache.set(ref.filePath, { ...file });
            updated = true;
          }
        }
      }
    }
    if (updated) saveImageCache(_imageCache);
    return updated;
  } catch (err) {
    console.warn('[loadMissingPreviews] Failed:', err);
    return false;
  }
}

function getCanonicalPrefixFromSessions(sessions: ChatSession[]): string | null {
  const canonical = sessions.find((s) => s.key.startsWith('agent:'))?.key;
  if (!canonical) return null;
  const parts = canonical.split(':');
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts[1]}`;
}

function resolveCanonicalSessionKey(sessionKey: string, sessions: ChatSession[]): string {
  const raw = String(sessionKey || '').trim();
  if (!raw) return raw;
  if (sessions.some((session) => String(session.key || '').trim() === raw)) return raw;
  if (raw.startsWith('agent:')) return raw;
  const matches = sessions.filter((session) => {
    const key = String(session.key || '').trim();
    return key.startsWith('agent:') && key.endsWith(`:${raw}`);
  });
  if (matches.length === 1) return matches[0].key;
  return raw;
}

function getAgentIdFromSessionKey(sessionKey: string): string {
  if (!sessionKey.startsWith('agent:')) return 'main';
  const parts = sessionKey.split(':');
  return parts[1] || 'main';
}

function parseSessionUpdatedAtMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return toMs(value);
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function isLocalPendingSessionKey(sessionKey: string): boolean {
  const normalized = String(sessionKey || '').trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith('agent:')) {
    const parts = normalized.split(':');
    const suffix = parts.slice(2).join(':');
    return suffix.startsWith('session-') || suffix.startsWith('tmp-');
  }
  return normalized.startsWith('session-') || normalized.startsWith('tmp-');
}

async function loadCronFallbackMessages(sessionKey: string, limit = 200): Promise<RawMessage[]> {
  if (!isCronSessionKey(sessionKey)) return [];
  try {
    const response = await hostApiFetch<{ messages?: RawMessage[] }>(
      buildCronSessionHistoryPath(sessionKey, limit),
    );
    return Array.isArray(response.messages) ? response.messages : [];
  } catch (error) {
    console.warn('Failed to load cron fallback history:', error);
    return [];
  }
}

function normalizeAgentId(value: string | undefined | null): string {
  return (value ?? '').trim().toLowerCase() || 'main';
}

function buildFallbackMainSessionKey(agentId: string): string {
  return `agent:${normalizeAgentId(agentId)}:main`;
}

function resolveMainSessionKeyForAgent(agentId: string | undefined | null): string | null {
  if (!agentId) return null;
  const normalizedAgentId = normalizeAgentId(agentId);
  const summary = useAgentsStore.getState().agents.find((agent) => agent.id === normalizedAgentId);
  const sessionKey = summary?.mainSessionKey || buildFallbackMainSessionKey(normalizedAgentId);
  if (sessionKey.startsWith('agent:')) return sessionKey;
  if (sessionKey.endsWith(':main')) return `agent:${normalizedAgentId}:main`;
  return buildFallbackMainSessionKey(normalizedAgentId);
}

function ensureSessionEntry(sessions: ChatSession[], sessionKey: string): ChatSession[] {
  if (sessions.some((session) => session.key === sessionKey)) {
    return sessions;
  }
  return [...sessions, { key: sessionKey, displayName: sessionKey }];
}

function clearSessionEntryFromMap<T extends Record<string, unknown>>(entries: T, sessionKey: string): T {
  return Object.fromEntries(Object.entries(entries).filter(([key]) => key !== sessionKey)) as T;
}

function buildSessionSwitchPatch(
  state: Pick<
    ChatState,
    'currentSessionKey' | 'messages' | 'sessions' | 'sessionLabels' | 'sessionLastActivity'
  >,
  nextSessionKey: string,
): Partial<ChatState> {
  const leavingEmpty = !state.currentSessionKey.endsWith(':main') && state.messages.length === 0;
  const nextSessions = leavingEmpty
    ? state.sessions.filter((session) => session.key !== state.currentSessionKey)
    : state.sessions;

  return {
    currentSessionKey: nextSessionKey,
    currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
    sessions: ensureSessionEntry(nextSessions, nextSessionKey),
    sessionLabels: leavingEmpty
      ? clearSessionEntryFromMap(state.sessionLabels, state.currentSessionKey)
      : state.sessionLabels,
    sessionLastActivity: leavingEmpty
      ? clearSessionEntryFromMap(state.sessionLastActivity, state.currentSessionKey)
      : state.sessionLastActivity,
    messages: [],
    streamingText: '',
    streamingMessage: null,
    streamingTools: [],
    lastAddedMessageId: null,
    activeRunId: null,
    error: null,
    pendingFinal: false,
    lastUserMessageAt: null,
    pendingToolImages: [],
  };
}

function buildHideEmptySessionPatch(
  state: Pick<ChatState, 'sessions' | 'sessionLabels' | 'sessionLastActivity' | 'currentSessionKey'>,
  emptySessionKey: string,
): Partial<ChatState> | null {
  const remaining = state.sessions.filter((session) => session.key !== emptySessionKey);
  if (remaining.length === state.sessions.length) return null;
  const nextSessionKey = state.currentSessionKey === emptySessionKey
    ? (remaining[0]?.key ?? DEFAULT_SESSION_KEY)
    : state.currentSessionKey;
  return {
    sessions: remaining,
    sessionLabels: clearSessionEntryFromMap(state.sessionLabels, emptySessionKey),
    sessionLastActivity: clearSessionEntryFromMap(state.sessionLastActivity, emptySessionKey),
    currentSessionKey: nextSessionKey,
    currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
    loading: false,
  };
}

function getCanonicalPrefixFromSessionKey(sessionKey: string): string | null {
  if (!sessionKey.startsWith('agent:')) return null;
  const parts = sessionKey.split(':');
  if (parts.length < 2) return null;
  return `${parts[0]}:${parts[1]}`;
}

function isToolOnlyMessage(message: RawMessage | undefined): boolean {
  if (!message) return false;
  if (isToolResultRole(message.role)) return true;

  const msg = message as unknown as Record<string, unknown>;
  const content = message.content;

  // Check OpenAI-format tool_calls field (real-time streaming from OpenAI-compatible models)
  const toolCalls = msg.tool_calls ?? msg.toolCalls;
  const hasOpenAITools = Array.isArray(toolCalls) && toolCalls.length > 0;

  if (!Array.isArray(content)) {
    // Content is not an array — check if there's OpenAI-format tool_calls
    if (hasOpenAITools) {
      // Has tool calls but content might be empty/string — treat as tool-only
      // if there's no meaningful text content
      const textContent = typeof content === 'string' ? content.trim() : '';
      return textContent.length === 0;
    }
    return false;
  }

  let hasTool = hasOpenAITools;
  let hasText = false;
  let hasNonToolContent = false;

  for (const block of content as ContentBlock[]) {
    if (block.type === 'tool_use' || block.type === 'tool_result' || block.type === 'toolCall' || block.type === 'toolResult') {
      hasTool = true;
      continue;
    }
    if (block.type === 'text' && block.text && block.text.trim()) {
      hasText = true;
      continue;
    }
    // Only actual image output disqualifies a tool-only message.
    // Thinking blocks are internal reasoning that can accompany tool_use — they
    // should NOT prevent the message from being treated as an intermediate tool step.
    if (block.type === 'image') {
      hasNonToolContent = true;
    }
  }

  return hasTool && !hasText && !hasNonToolContent;
}

function isToolResultRole(role: unknown): boolean {
  if (!role) return false;
  const normalized = String(role).toLowerCase();
  return normalized === 'toolresult' || normalized === 'tool_result';
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  const parts: string[] = [];
  for (const block of content as ContentBlock[]) {
    if (block.type === 'text' && block.text) {
      parts.push(block.text);
    }
  }
  return parts.join('\n');
}

function isHeartbeatOkText(rawText: string): boolean {
  const text = String(rawText || '').trim();
  if (!text) return false;
  const normalized = text
    .replace(/[`"'[\](){}<>]/g, '')
    .replace(/[：:;,，。.!！?？\s_-]+/g, '')
    .toLowerCase();
  if (normalized === 'heartbeatok' || normalized === 'heartbeat_ok') return true;
  return /^heartbeat[_\s-]*ok\b/i.test(text) && text.length <= 80;
}

function isHeartbeatBootstrapInstructionText(rawText: string): boolean {
  const text = String(rawText || '').trim();
  if (!text) return false;
  const normalized = text
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return (
    /^read\s+heartbeat\.md\s+if\s+it\s+exists\b/.test(normalized)
    || /^read\s+soul\.md\s+if\s+it\s+exists\b/.test(normalized)
    || /^read\s+soul\.md\s+and\s+heartbeat\.md\s+if\s+they\s+exist\b/.test(normalized)
    || /^read\s+soul\.md\s+and\s+heartbeat\.md\b/.test(normalized)
  );
}

function sanitizeSessionLabelText(rawText: string): string {
  const text = String(rawText || '').trim();
  if (!text) return '';
  if (isHeartbeatBootstrapInstructionText(text)) return '';
  if (isHeartbeatOkText(text)) return '';
  return text;
}

function getMessagePrimaryText(message: RawMessage | undefined): string {
  if (!message) return '';
  const contentText = extractTextFromContent(message.content);
  if (contentText.trim()) return contentText.trim();
  const msg = message as unknown as Record<string, unknown>;
  const topText = typeof msg.text === 'string' ? msg.text : '';
  return topText.trim();
}

function isBackgroundNoiseMessage(message: RawMessage | undefined): boolean {
  if (!message) return false;
  const text = getMessagePrimaryText(message);
  if (isHeartbeatBootstrapInstructionText(text)) return true;
  const role = String(message.role || '').toLowerCase();
  if (role !== 'assistant' && role !== 'system') return false;
  return isHeartbeatOkText(text);
}

function summarizeToolOutput(text: string): string | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  const lines = trimmed.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return undefined;
  const summaryLines = lines.slice(0, 2);
  let summary = summaryLines.join(' / ');
  if (summary.length > 160) {
    summary = `${summary.slice(0, 157)}...`;
  }
  return summary;
}

function normalizeToolStatus(rawStatus: unknown, fallback: 'running' | 'completed'): ToolStatus['status'] {
  const status = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : '';
  if (status === 'error' || status === 'failed') return 'error';
  if (status === 'completed' || status === 'success' || status === 'done') return 'completed';
  return fallback;
}

function parseDurationMs(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : undefined;
}

function extractToolUseUpdates(message: unknown): ToolStatus[] {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const updates: ToolStatus[] = [];

  // Path 1: Anthropic/normalized format — tool blocks inside content array
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type !== 'tool_use' && block.type !== 'toolCall') || !block.name) continue;
      updates.push({
        id: block.id || block.name,
        toolCallId: block.id,
        name: block.name,
        status: 'running',
        updatedAt: Date.now(),
      });
    }
  }

  // Path 2: OpenAI format — tool_calls array on the message itself
  if (updates.length === 0) {
    const toolCalls = msg.tool_calls ?? msg.toolCalls;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls as Array<Record<string, unknown>>) {
        const fn = (tc.function ?? tc) as Record<string, unknown>;
        const name = typeof fn.name === 'string' ? fn.name : '';
        if (!name) continue;
        const id = typeof tc.id === 'string' ? tc.id : name;
        updates.push({
          id,
          toolCallId: typeof tc.id === 'string' ? tc.id : undefined,
          name,
          status: 'running',
          updatedAt: Date.now(),
        });
      }
    }
  }

  return updates;
}

function extractToolResultBlocks(message: unknown, eventState: string): ToolStatus[] {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (!Array.isArray(content)) return [];

  const updates: ToolStatus[] = [];
  for (const block of content as ContentBlock[]) {
    if (block.type !== 'tool_result' && block.type !== 'toolResult') continue;
    const outputText = extractTextFromContent(block.content ?? block.text ?? '');
    const summary = summarizeToolOutput(outputText);
    updates.push({
      id: block.id || block.name || 'tool',
      toolCallId: block.id,
      name: block.name || block.id || 'tool',
      status: normalizeToolStatus(undefined, eventState === 'delta' ? 'running' : 'completed'),
      summary,
      updatedAt: Date.now(),
    });
  }

  return updates;
}

function extractToolResultUpdate(message: unknown, eventState: string): ToolStatus | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const role = typeof msg.role === 'string' ? msg.role.toLowerCase() : '';
  if (!isToolResultRole(role)) return null;

  const toolName = typeof msg.toolName === 'string' ? msg.toolName : (typeof msg.name === 'string' ? msg.name : '');
  const toolCallId = typeof msg.toolCallId === 'string' ? msg.toolCallId : undefined;
  const details = (msg.details && typeof msg.details === 'object') ? msg.details as Record<string, unknown> : undefined;
  const rawStatus = (msg.status ?? details?.status);
  const fallback = eventState === 'delta' ? 'running' : 'completed';
  const status = normalizeToolStatus(rawStatus, fallback);
  const durationMs = parseDurationMs(details?.durationMs ?? details?.duration ?? (msg as Record<string, unknown>).durationMs);

  const outputText = (details && typeof details.aggregated === 'string')
    ? details.aggregated
    : extractTextFromContent(msg.content);
  const summary = summarizeToolOutput(outputText) ?? summarizeToolOutput(String(details?.error ?? msg.error ?? ''));

  const name = toolName || toolCallId || 'tool';
  const id = toolCallId || name;

  return {
    id,
    toolCallId,
    name,
    status,
    durationMs,
    summary,
    updatedAt: Date.now(),
  };
}

function mergeToolStatus(existing: ToolStatus['status'], incoming: ToolStatus['status']): ToolStatus['status'] {
  const order: Record<ToolStatus['status'], number> = { running: 0, completed: 1, error: 2 };
  return order[incoming] >= order[existing] ? incoming : existing;
}

function upsertToolStatuses(current: ToolStatus[], updates: ToolStatus[]): ToolStatus[] {
  if (updates.length === 0) return current;
  const next = [...current];
  for (const update of updates) {
    const key = update.toolCallId || update.id || update.name;
    if (!key) continue;
    const index = next.findIndex((tool) => (tool.toolCallId || tool.id || tool.name) === key);
    if (index === -1) {
      next.push(update);
      continue;
    }
    const existing = next[index];
    next[index] = {
      ...existing,
      ...update,
      name: update.name || existing.name,
      status: mergeToolStatus(existing.status, update.status),
      durationMs: update.durationMs ?? existing.durationMs,
      summary: update.summary ?? existing.summary,
      updatedAt: update.updatedAt || existing.updatedAt,
    };
  }
  return next;
}

function collectToolUpdates(message: unknown, eventState: string): ToolStatus[] {
  const updates: ToolStatus[] = [];
  const toolResultUpdate = extractToolResultUpdate(message, eventState);
  if (toolResultUpdate) updates.push(toolResultUpdate);
  updates.push(...extractToolResultBlocks(message, eventState));
  updates.push(...extractToolUseUpdates(message));
  return updates;
}

function hasNonToolAssistantContent(message: RawMessage | undefined): boolean {
  if (!message) return false;
  if (typeof message.content === 'string' && message.content.trim()) return true;

  const content = message.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if (block.type === 'text' && block.text && block.text.trim()) return true;
      if (block.type === 'thinking' && block.thinking && block.thinking.trim()) return true;
      if (block.type === 'image') return true;
    }
  }

  const msg = message as unknown as Record<string, unknown>;
  if (typeof msg.text === 'string' && msg.text.trim()) return true;

  return false;
}

// ── Store ────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  loading: false,
  error: null,

  sending: false,
  activeRunId: null,
  streamingText: '',
  streamingMessage: null,
  streamingTools: [],
  pendingFinal: false,
  lastUserMessageAt: null,
  pendingToolImages: [],

  sessions: [],
  currentSessionKey: DEFAULT_SESSION_KEY,
  currentAgentId: 'main',
  sessionLabels: {},
  sessionLastActivity: {},

  showThinking: true,
  thinkingLevel: null,
  lastAddedMessageId: null,

  // ── Load sessions via sessions.list ──

  loadSessions: async () => {
    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>('sessions.list', {
        limit: SESSION_LIST_FETCH_LIMIT,
        activeMinutes: 5256000, // 10 years
        includeDerivedTitles: true,
        includeLastMessage: true,
      });
      if (data) {
        const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
        const sessions: ChatSession[] = rawSessions.map((s: Record<string, unknown>) => ({
          key: String(s.key || ''),
          label: s.label ? sanitizeSessionLabelText(String(s.label)) || undefined : undefined,
          displayName: s.displayName ? sanitizeSessionLabelText(String(s.displayName)) || undefined : undefined,
          thinkingLevel: s.thinkingLevel ? String(s.thinkingLevel) : undefined,
          model: s.model ? String(s.model) : undefined,
          updatedAt: parseSessionUpdatedAtMs(s.updatedAt),
        })).filter((s: ChatSession) => s.key);

        const canonicalBySuffix = new Map<string, string>();
        const canonicalSuffixCount = new Map<string, number>();
        for (const session of sessions) {
          if (!session.key.startsWith('agent:')) continue;
          const parts = session.key.split(':');
          if (parts.length < 3) continue;
          const suffix = parts.slice(2).join(':');
          if (!suffix) continue;
          canonicalSuffixCount.set(suffix, (canonicalSuffixCount.get(suffix) ?? 0) + 1);
          if (!canonicalBySuffix.has(suffix)) {
            canonicalBySuffix.set(suffix, session.key);
          }
        }
        const hasUniqueCanonical = (suffix: string): boolean =>
          !!suffix && (canonicalSuffixCount.get(suffix) ?? 0) === 1 && canonicalBySuffix.has(suffix);

        // Deduplicate exact duplicate keys only; keep both legacy short keys
        // and canonical keys so old histories stay reachable.
        const seen = new Set<string>();
        const dedupedSessions = sessions.filter((s) => {
          if (seen.has(s.key)) return false;
          seen.add(s.key);
          return true;
        });

        const { currentSessionKey, sessions: localSessions, sending } = get();
        let nextSessionKey = currentSessionKey || DEFAULT_SESSION_KEY;
        if (!nextSessionKey.startsWith('agent:') && !dedupedSessions.find((s) => s.key === nextSessionKey)) {
          const canonicalMatch = hasUniqueCanonical(nextSessionKey)
            ? canonicalBySuffix.get(nextSessionKey)
            : undefined;
          if (canonicalMatch) {
            nextSessionKey = canonicalMatch;
          }
        }
        if (!dedupedSessions.find((s) => s.key === nextSessionKey) && dedupedSessions.length > 0) {
          // Keep current session pinned by default to prevent unexpected jumps.
          // Only auto-switch on very first boot when still at the default session.
          const hasLocalPendingSession = localSessions.some(
            (session) => session.key === nextSessionKey && isLocalPendingSessionKey(session.key),
          );
          const isInitialDefaultSelection = (
            (!currentSessionKey || currentSessionKey === DEFAULT_SESSION_KEY)
            && localSessions.length === 0
            && !sending
          );
          if (!hasLocalPendingSession && isInitialDefaultSelection) {
            nextSessionKey = dedupedSessions[0].key;
          }
        }

        const sessionsWithCurrent = !dedupedSessions.find((s) => s.key === nextSessionKey) && nextSessionKey
          ? [
            ...dedupedSessions,
            { key: nextSessionKey, displayName: nextSessionKey },
          ]
          : dedupedSessions;

        const discoveredActivity = Object.fromEntries(
          sessionsWithCurrent
            .filter((session) => typeof session.updatedAt === 'number' && Number.isFinite(session.updatedAt))
            .map((session) => [session.key, session.updatedAt!]),
        );

        set((state) => ({
          sessions: sessionsWithCurrent,
          currentSessionKey: nextSessionKey,
          currentAgentId: getAgentIdFromSessionKey(nextSessionKey),
          sessionLabels: { ...state.sessionLabels },
          sessionLastActivity: {
            ...state.sessionLastActivity,
            ...discoveredActivity,
          },
        }));

        if (currentSessionKey !== nextSessionKey && !sending) {
          get().loadHistory();
        }

        // Background: fetch first user message when neither local/remote labels are informative.
        // Uses a small limit so it's cheap; runs in parallel and doesn't block anything.
        const labelsSnapshot = get().sessionLabels || {};
        const sessionsToLabel = sessionsWithCurrent.filter((session) => {
          const localLabel = String(labelsSnapshot[session.key] || '').trim();
          if (!isGenericSessionLabel(localLabel, session.key)) return false;
          const remoteLabel = String(session.label || session.displayName || '').trim();
          return isGenericSessionLabel(remoteLabel, session.key);
        });
        if (sessionsToLabel.length > 0) {
          void Promise.all(
            sessionsToLabel.map(async (session) => {
              try {
                const r = await useGatewayStore.getState().rpc<Record<string, unknown>>(
                  'chat.history',
                  { sessionKey: session.key, limit: 1000 },
                );
                const msgs = Array.isArray(r.messages) ? r.messages as RawMessage[] : [];
                const firstUser = msgs.find((m) => m.role === 'user');
                const lastMsg = msgs[msgs.length - 1];
                set((s) => {
                  const next: Partial<typeof s> = {};
                  if (firstUser) {
                    const labelText = sanitizeSessionLabelText(getMessageText(firstUser.content).trim());
                    if (labelText) {
                      const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
                      const existing = (s.sessionLabels?.[session.key] || '').trim();
                      // 有明确别名时不覆盖；仅覆盖空标签或通用占位标签（如 main）
                      if (isGenericSessionLabel(existing, session.key)) {
                        next.sessionLabels = { ...s.sessionLabels, [session.key]: truncated };
                      }
                    }
                  }
                  if (lastMsg?.timestamp) {
                    next.sessionLastActivity = { ...s.sessionLastActivity, [session.key]: toMs(lastMsg.timestamp) };
                  }
                  return next;
                });
              } catch { /* ignore per-session errors */ }
            }),
          );
        }
      }
    } catch (err) {
      console.warn('Failed to load sessions:', err);
    }
  },

  // ── Switch session ──

  switchSession: (key: string) => {
    const state = get();
    const nextKey = resolveCanonicalSessionKey(key, state.sessions);
    if (nextKey === state.currentSessionKey) return;
    set((s) => buildSessionSwitchPatch(s, nextKey));
    get().loadHistory();
  },

  // ── Delete session ──

  deleteSession: async (key: string) => {
    let deletedByGateway = false;
    try {
      await useGatewayStore.getState().rpc('sessions.delete', { key, deleteTranscript: true });
      deletedByGateway = true;
    } catch (err) {
      console.warn(`[deleteSession] sessions.delete RPC failed for ${key}:`, err);
    }

    // Fallback: soft-delete transcript on disk via host api.
    try {
      if (!deletedByGateway) {
        const result = await hostApiFetch<{
          success: boolean;
          error?: string;
        }>('/api/sessions/delete', {
          method: 'POST',
          body: JSON.stringify({ sessionKey: key }),
        });
        if (!result.success) {
          console.warn(`[deleteSession] IPC reported failure for ${key}:`, result.error);
        }
      }
    } catch (err) {
      console.warn(`[deleteSession] IPC call failed for ${key}:`, err);
    }

    const { currentSessionKey, sessions } = get();
    const remaining = sessions.filter((s) => s.key !== key);

    if (currentSessionKey === key) {
      // Switched away from deleted session — pick the first remaining or create new
      const next = remaining[0];
      set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== key)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== key)),
        messages: [],
        streamingText: '',
        streamingMessage: null,
        streamingTools: [],
        activeRunId: null,
        error: null,
        pendingFinal: false,
        lastUserMessageAt: null,
        pendingToolImages: [],
        currentSessionKey: next?.key ?? DEFAULT_SESSION_KEY,
        currentAgentId: getAgentIdFromSessionKey(next?.key ?? DEFAULT_SESSION_KEY),
      }));
      if (next) {
        get().loadHistory();
      }
    } else {
      set((s) => ({
        sessions: remaining,
        sessionLabels: Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== key)),
        sessionLastActivity: Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== key)),
      }));
    }
  },

  // ── New session ──

  newSession: () => {
    // Generate a new unique session key and switch to it.
    // NOTE: We intentionally do NOT call sessions.reset on the old session.
    // sessions.reset archives (renames) the session JSONL file, making old
    // conversation history inaccessible when the user switches back to it.
    const { currentSessionKey, messages, sessions } = get();
    const leavingEmpty = !currentSessionKey.endsWith(':main') && messages.length === 0;
    const prefix = getCanonicalPrefixFromSessionKey(currentSessionKey)
      ?? getCanonicalPrefixFromSessions(sessions)
      ?? DEFAULT_CANONICAL_PREFIX;
    const newKey = `${prefix}:session-${Date.now()}`;
    const newSessionEntry: ChatSession = { key: newKey, displayName: newKey };
    set((s) => ({
      currentSessionKey: newKey,
      currentAgentId: getAgentIdFromSessionKey(newKey),
      sessions: [
        ...(leavingEmpty ? s.sessions.filter((sess) => sess.key !== currentSessionKey) : s.sessions),
        newSessionEntry,
      ],
      sessionLabels: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey))
        : s.sessionLabels,
      sessionLastActivity: leavingEmpty
        ? Object.fromEntries(Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey))
        : s.sessionLastActivity,
      messages: [],
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      activeRunId: null,
      error: null,
      pendingFinal: false,
      lastUserMessageAt: null,
      pendingToolImages: [],
    }));
  },

  // ── Cleanup empty session on navigate away ──

  cleanupEmptySession: () => {
    const { currentSessionKey, messages } = get();
    // Only remove non-main sessions that were never used (no messages sent).
    // This mirrors the "leavingEmpty" logic in switchSession so that creating
    // a new session and immediately navigating away doesn't leave a ghost entry
    // in the sidebar.
    const isEmptyNonMain = !currentSessionKey.endsWith(':main') && messages.length === 0;
    if (!isEmptyNonMain) return;
    set((s) => ({
      sessions: s.sessions.filter((sess) => sess.key !== currentSessionKey),
      sessionLabels: Object.fromEntries(
        Object.entries(s.sessionLabels).filter(([k]) => k !== currentSessionKey),
      ),
      sessionLastActivity: Object.fromEntries(
        Object.entries(s.sessionLastActivity).filter(([k]) => k !== currentSessionKey),
      ),
    }));
  },

  // ── Load chat history ──

  loadHistory: async (quiet = false) => {
    const stateAtStart = get();
    const resolvedSessionKey = resolveCanonicalSessionKey(stateAtStart.currentSessionKey, stateAtStart.sessions);
    if (resolvedSessionKey && resolvedSessionKey !== stateAtStart.currentSessionKey) {
      set({
        currentSessionKey: resolvedSessionKey,
        currentAgentId: getAgentIdFromSessionKey(resolvedSessionKey),
      });
    }
    const requestSessionKey = resolvedSessionKey || stateAtStart.currentSessionKey;
    if (!quiet) set({ loading: true, error: null });

    const applyLoadedMessages = (rawMessages: RawMessage[], thinkingLevel: string | null) => {
      if (get().currentSessionKey !== requestSessionKey) return;
      // Before filtering: attach images/files from tool_result messages to the next assistant message
      const messagesWithToolImages = enrichWithToolResultFiles(rawMessages);
      const filteredMessages = messagesWithToolImages.filter((msg) => !isToolResultRole(msg.role));
      const uiMessages = filteredMessages.filter((msg) => !isBackgroundNoiseMessage(msg));
      // Restore file attachments for user/assistant messages (from cache + text patterns)
      const enrichedMessages = enrichWithCachedImages(uiMessages);

      // Preserve the optimistic user message during an active send.
      // The Gateway may not include the user's message in chat.history
      // until the run completes, causing it to flash out of the UI.
      let finalMessages = enrichedMessages;
      const currentStateForMerge = get();
      const userMsgAt = currentStateForMerge.lastUserMessageAt;
      const userMsgAtMs = userMsgAt ? toMs(userMsgAt) : 0;
      const recentTurnWindowActive = userMsgAtMs > 0 && Date.now() - userMsgAtMs < 180_000;
      const protectRecentTurn = (
        currentStateForMerge.sending
        || currentStateForMerge.pendingFinal
        || recentTurnWindowActive
      ) && !!userMsgAt;
      if (protectRecentTurn && userMsgAt) {
        const userMsMs = userMsgAtMs;
        const hasRecentUser = enrichedMessages.some(
          (m) => m.role === 'user' && m.timestamp && toMs(m.timestamp) >= userMsMs - 1500,
        );
        if (!hasRecentUser) {
          const currentMsgs = currentStateForMerge.messages;
          const optimistic = [...currentMsgs].reverse().find(
            (m) => m.role === 'user' && (!m.timestamp || toMs(m.timestamp) >= userMsMs - 300000),
          );
          if (optimistic) {
            finalMessages = [...enrichedMessages, optimistic];
          }
        }

        // Never pull an arbitrary previous assistant turn into the current round.
        // This caused stale answers from earlier prompts to appear in-flight.
      }

      // Sending state safety: never collapse to an empty list while the run is active.
      if ((get().sending || get().pendingFinal) && finalMessages.length === 0) {
        const currentMsgs = get().messages;
        if (currentMsgs.length > 0) {
          finalMessages = currentMsgs;
        }
      }

      // Stability guard: a transient empty history response must not wipe
      // already-rendered conversation content for the same session.
      const stateBeforeApply = get();
      if (stateBeforeApply.currentSessionKey !== requestSessionKey) return;

      // Anti-rollback: while active/recent turn is in-flight, ignore stale
      // history snapshots that are shorter/older than what UI already has.
      const isActiveOrRecentTurn =
        stateBeforeApply.sending
        || stateBeforeApply.pendingFinal
        || !!stateBeforeApply.streamingMessage
        || recentTurnWindowActive;
      if (
        isActiveOrRecentTurn
        && stateBeforeApply.messages.length > 0
        && finalMessages.length > 0
      ) {
        const currentLast = stateBeforeApply.messages[stateBeforeApply.messages.length - 1];
        const currentLastId = typeof currentLast?.id === 'string' ? currentLast.id : '';
        const hasCurrentTailInIncoming = !!currentLastId && finalMessages.some((m) => m.id === currentLastId);
        const incomingShorter = finalMessages.length < stateBeforeApply.messages.length;
        const currentLastTs = currentLast?.timestamp ? toMs(currentLast.timestamp) : 0;
        const incomingLast = finalMessages[finalMessages.length - 1];
        const incomingLastTs = incomingLast?.timestamp ? toMs(incomingLast.timestamp) : 0;
        const incomingClearlyOlder = incomingLastTs > 0 && currentLastTs > 0 && incomingLastTs + 1500 < currentLastTs;

        if (incomingShorter && (incomingClearlyOlder || !hasCurrentTailInIncoming)) {
          set({ thinkingLevel, loading: false });
          return;
        }
      }

      if (
        rawMessages.length === 0
        && finalMessages.length === 0
        && stateBeforeApply.currentSessionKey === requestSessionKey
        && stateBeforeApply.messages.length > 0
      ) {
        set({ thinkingLevel, loading: false });
        return;
      }

      set({ messages: finalMessages, thinkingLevel, loading: false });
      if (rawMessages.length > 0) {
        noteSessionHasMessages(requestSessionKey);
      }

      // Extract first user message text as a session label for display in the toolbar.
      const firstUserMsg = finalMessages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const labelText = sanitizeSessionLabelText(getMessageText(firstUserMsg.content).trim());
        if (labelText) {
          const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
          set((s) => {
            const existing = (s.sessionLabels?.[requestSessionKey] || '').trim();
            if (!isGenericSessionLabel(existing, requestSessionKey)) return {};
            return {
              sessionLabels: { ...s.sessionLabels, [requestSessionKey]: truncated },
            };
          });
        }
      }

      // Record last activity time from the last message in history
      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.timestamp) {
        const lastAt = toMs(lastMsg.timestamp);
        set((s) => ({
          sessionLastActivity: { ...s.sessionLastActivity, [requestSessionKey]: lastAt },
        }));
      }

      // Async: load missing image previews from disk (updates in background)
      loadMissingPreviews(finalMessages).then((updated) => {
        if (get().currentSessionKey !== requestSessionKey) return;
        if (updated) {
          // Create new object references so React.memo detects changes.
          // loadMissingPreviews mutates AttachedFileMeta in place, so we
          // must produce fresh message + file references for each affected msg.
          set({
            messages: finalMessages.map(msg =>
              msg._attachedFiles
                ? { ...msg, _attachedFiles: msg._attachedFiles.map(f => ({ ...f })) }
                : msg
            ),
          });
        }
      });
      const { pendingFinal, lastUserMessageAt, sending: isSendingNow } = get();

      // If we're sending but haven't received streaming events, check
      // whether the loaded history reveals intermediate tool-call activity.
      // This surfaces progress via the pendingFinal → ActivityIndicator path.
      const userMsTs = lastUserMessageAt ? toMs(lastUserMessageAt) : 0;
      const lastRecentUserIndex = uiMessages.reduce((latest, msg, idx) => {
        if (msg.role !== 'user') return latest;
        if (!userMsTs) return idx;
        if (!msg.timestamp) return idx;
        return toMs(msg.timestamp) >= userMsTs ? idx : latest;
      }, -1);

      const isAfterUserMsg = (msg: RawMessage, index: number): boolean => {
        if (!userMsTs) return true;
        if (!msg.timestamp) return lastRecentUserIndex >= 0 ? index > lastRecentUserIndex : false;
        return toMs(msg.timestamp) >= userMsTs;
      };

      if (isSendingNow && !pendingFinal) {
        const hasRecentAssistantActivity = uiMessages.some((msg, idx) => {
          if (msg.role !== 'assistant') return false;
          return isAfterUserMsg(msg, idx);
        });
        if (hasRecentAssistantActivity) {
          set({ pendingFinal: true });
        }
      }

      // If pendingFinal, check whether the AI produced a final text response.
      if (pendingFinal || get().pendingFinal) {
        const recentAssistant = [...uiMessages]
          .map((msg, idx) => ({ msg, idx }))
          .reverse()
          .find(({ msg, idx }) => {
          if (msg.role !== 'assistant') return false;
          if (!hasNonToolAssistantContent(msg)) return false;
          return isAfterUserMsg(msg, idx);
        });
        if (recentAssistant) {
          clearHistoryPoll();
          set({ sending: false, activeRunId: null, pendingFinal: false });
        }
      }
    };

    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>(
        'chat.history',
        { sessionKey: requestSessionKey, limit: HISTORY_DEFAULT_LIMIT },
      );
      if (data) {
        let rawMessages = Array.isArray(data.messages) ? data.messages as RawMessage[] : [];
        const thinkingLevel = data.thinkingLevel ? String(data.thinkingLevel) : null;
        if (rawMessages.length === 0 && isCronSessionKey(requestSessionKey)) {
          rawMessages = await loadCronFallbackMessages(requestSessionKey, HISTORY_DEFAULT_LIMIT);
        }
        // Keep session identity stable: do not auto-switch by label matching.
        // If history is empty, show empty state for the selected session.

        applyLoadedMessages(rawMessages, thinkingLevel);
      } else {
        const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, 200);
        if (fallbackMessages.length > 0) {
          applyLoadedMessages(fallbackMessages, null);
        } else {
          if (get().currentSessionKey !== requestSessionKey) return;
          const state = get();
          const shouldKeepCurrent =
            state.sending
            || state.pendingFinal
            || !!state.activeRunId
            || !!state.streamingMessage
            || !!state.streamingText
            || state.messages.length > 0;
          if (shouldKeepCurrent) {
            set({ loading: false });
            return;
          }
          if (shouldHideAfterEmpty(requestSessionKey)) {
            const hidePatch = buildHideEmptySessionPatch(state, requestSessionKey);
            if (hidePatch) {
              const nextKey = String(hidePatch.currentSessionKey || '');
              set(hidePatch);
              if (nextKey && nextKey !== requestSessionKey) {
                void get().loadHistory(true);
              }
              return;
            }
          }
          set({ messages: [], loading: false });
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history:', err);
      const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, 200);
      if (fallbackMessages.length > 0) {
        applyLoadedMessages(fallbackMessages, null);
      } else {
        if (get().currentSessionKey !== requestSessionKey) return;
        const state = get();
        const shouldKeepCurrent =
          state.sending
          || state.pendingFinal
          || !!state.activeRunId
          || !!state.streamingMessage
          || !!state.streamingText
          || state.messages.length > 0;
        if (shouldKeepCurrent) {
          set({ loading: false });
          return;
        }
        if (shouldHideAfterEmpty(requestSessionKey)) {
          const hidePatch = buildHideEmptySessionPatch(state, requestSessionKey);
          if (hidePatch) {
            const nextKey = String(hidePatch.currentSessionKey || '');
            set(hidePatch);
            if (nextKey && nextKey !== requestSessionKey) {
              void get().loadHistory(true);
            }
            return;
          }
        }
        set({ messages: [], loading: false });
      }
    }
  },

  loadHistoryWithOptions: async (options?: { beforeTs?: number; limit?: number }) => {
    const stateAtStart = get();
    const resolvedSessionKey = resolveCanonicalSessionKey(stateAtStart.currentSessionKey, stateAtStart.sessions);
    if (resolvedSessionKey && resolvedSessionKey !== stateAtStart.currentSessionKey) {
      set({
        currentSessionKey: resolvedSessionKey,
        currentAgentId: getAgentIdFromSessionKey(resolvedSessionKey),
      });
    }
    const requestSessionKey = resolvedSessionKey || stateAtStart.currentSessionKey;
    set({ loading: true, error: null });

    const limit = options?.limit ?? HISTORY_DEFAULT_LIMIT;
    const beforeTs = options?.beforeTs;

    const params: Record<string, unknown> = { sessionKey: requestSessionKey, limit };
    if (beforeTs != null) params.beforeTs = beforeTs;

    const applyLoadedMessages = (rawMessages: RawMessage[], thinkingLevel: string | null) => {
      if (get().currentSessionKey !== requestSessionKey) return;
      let toApply = rawMessages;
      if (beforeTs != null) {
        toApply = rawMessages.filter((m) => !m.timestamp || toMs(m.timestamp) <= beforeTs);
      }
      const messagesWithToolImages = enrichWithToolResultFiles(toApply);
      const filteredMessages = messagesWithToolImages.filter((msg) => !isToolResultRole(msg.role));
      const uiMessages = filteredMessages.filter((msg) => !isBackgroundNoiseMessage(msg));
      const enrichedMessages = enrichWithCachedImages(uiMessages);

      let finalMessages = enrichedMessages;
      const currentStateForMerge = get();
      const userMsgAt = currentStateForMerge.lastUserMessageAt;
      const userMsgAtMs = userMsgAt ? toMs(userMsgAt) : 0;
      const recentTurnWindowActive = userMsgAtMs > 0 && Date.now() - userMsgAtMs < 180_000;
      const protectRecentTurn = (
        currentStateForMerge.sending
        || currentStateForMerge.pendingFinal
        || recentTurnWindowActive
      ) && !!userMsgAt;
      if (protectRecentTurn && userMsgAt) {
        const userMsMs = userMsgAtMs;
        const hasRecentUser = enrichedMessages.some(
          (m) => m.role === 'user' && m.timestamp && toMs(m.timestamp) >= userMsMs - 1500,
        );
        if (!hasRecentUser) {
          const currentMsgs = currentStateForMerge.messages;
          const optimistic = [...currentMsgs].reverse().find(
            (m) => m.role === 'user' && (!m.timestamp || toMs(m.timestamp) >= userMsMs - 300000),
          );
          if (optimistic) finalMessages = [...enrichedMessages, optimistic];
        }

        // Never pull an arbitrary previous assistant turn into the current round.
        // This caused stale answers from earlier prompts to appear in-flight.
      }

      if ((get().sending || get().pendingFinal) && finalMessages.length === 0) {
        const currentMsgs = get().messages;
        if (currentMsgs.length > 0) {
          finalMessages = currentMsgs;
        }
      }

      // Same-session protection against transient empty history wipes.
      // For explicit "load to date" actions (beforeTs != null), allow empty.
      const stateBeforeApply = get();
      if (stateBeforeApply.currentSessionKey !== requestSessionKey) return;

      const isActiveOrRecentTurn =
        stateBeforeApply.sending
        || stateBeforeApply.pendingFinal
        || !!stateBeforeApply.streamingMessage
        || recentTurnWindowActive;
      if (
        beforeTs == null
        && isActiveOrRecentTurn
        && stateBeforeApply.messages.length > 0
        && finalMessages.length > 0
      ) {
        const currentLast = stateBeforeApply.messages[stateBeforeApply.messages.length - 1];
        const currentLastId = typeof currentLast?.id === 'string' ? currentLast.id : '';
        const hasCurrentTailInIncoming = !!currentLastId && finalMessages.some((m) => m.id === currentLastId);
        const incomingShorter = finalMessages.length < stateBeforeApply.messages.length;
        const currentLastTs = currentLast?.timestamp ? toMs(currentLast.timestamp) : 0;
        const incomingLast = finalMessages[finalMessages.length - 1];
        const incomingLastTs = incomingLast?.timestamp ? toMs(incomingLast.timestamp) : 0;
        const incomingClearlyOlder = incomingLastTs > 0 && currentLastTs > 0 && incomingLastTs + 1500 < currentLastTs;
        if (incomingShorter && (incomingClearlyOlder || !hasCurrentTailInIncoming)) {
          set({ thinkingLevel, loading: false });
          return;
        }
      }

      if (
        beforeTs == null
        && toApply.length === 0
        && finalMessages.length === 0
        && stateBeforeApply.currentSessionKey === requestSessionKey
        && stateBeforeApply.messages.length > 0
      ) {
        set({ thinkingLevel, loading: false });
        return;
      }

      set({ messages: finalMessages, thinkingLevel, loading: false });
      if (toApply.length > 0) {
        noteSessionHasMessages(requestSessionKey);
      }

      const firstUserMsg = finalMessages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const labelText = sanitizeSessionLabelText(getMessageText(firstUserMsg.content).trim());
        if (labelText) {
          const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
          set((s) => {
            const existing = (s.sessionLabels?.[requestSessionKey] || '').trim();
            if (!isGenericSessionLabel(existing, requestSessionKey)) return {};
            return {
              sessionLabels: { ...s.sessionLabels, [requestSessionKey]: truncated },
            };
          });
        }
      }

      const lastMsg = finalMessages[finalMessages.length - 1];
      if (lastMsg?.timestamp) {
        const lastAt = toMs(lastMsg.timestamp);
        set((s) => ({
          sessionLastActivity: { ...s.sessionLastActivity, [requestSessionKey]: lastAt },
        }));
      }

      loadMissingPreviews(finalMessages).then((updated) => {
        if (get().currentSessionKey !== requestSessionKey) return;
        if (updated) {
          set({
            messages: finalMessages.map((msg) =>
              msg._attachedFiles ? { ...msg, _attachedFiles: msg._attachedFiles.map((f) => ({ ...f })) } : msg,
            ),
          });
        }
      });
    };

    try {
      const data = await useGatewayStore.getState().rpc<Record<string, unknown>>('chat.history', params);
      if (data) {
        let rawMessages = Array.isArray(data.messages) ? data.messages as RawMessage[] : [];
        const thinkingLevel = data.thinkingLevel ? String(data.thinkingLevel) : null;
        if (rawMessages.length === 0 && isCronSessionKey(requestSessionKey)) {
          rawMessages = await loadCronFallbackMessages(requestSessionKey, limit);
        }
        // Keep explicit session selection stable; no label-based auto switch.
        applyLoadedMessages(rawMessages, thinkingLevel);
      } else {
        const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, limit);
        if (fallbackMessages.length > 0) {
          applyLoadedMessages(fallbackMessages, null);
        } else {
          if (get().currentSessionKey !== requestSessionKey) return;
          const state = get();
          const shouldKeepCurrent =
            state.sending
            || state.pendingFinal
            || !!state.activeRunId
            || !!state.streamingMessage
            || !!state.streamingText
            || state.messages.length > 0;
          if (shouldKeepCurrent) {
            set({ loading: false });
            return;
          }
          set({ messages: [], loading: false });
        }
      }
    } catch (err) {
      console.warn('Failed to load chat history with options:', err);
      const fallbackMessages = await loadCronFallbackMessages(requestSessionKey, limit);
      if (fallbackMessages.length > 0) {
        applyLoadedMessages(fallbackMessages, null);
      } else {
        if (get().currentSessionKey !== requestSessionKey) return;
        const state = get();
        const shouldKeepCurrent =
          state.sending
          || state.pendingFinal
          || !!state.activeRunId
          || !!state.streamingMessage
          || !!state.streamingText
          || state.messages.length > 0;
        if (shouldKeepCurrent) {
          set({ loading: false });
          return;
        }
        set({ messages: [], loading: false });
      }
    }
  },

  // ── Send message ──

  sendMessage: async (
    text: string,
    attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>,
    targetAgentId?: string | null,
  ) => {
    const trimmed = text.trim();
    if (!trimmed && (!attachments || attachments.length === 0)) return;

    const stateBeforeSend = get();
    const targetSessionKey = resolveCanonicalSessionKey(
      resolveMainSessionKeyForAgent(targetAgentId) ?? stateBeforeSend.currentSessionKey,
      stateBeforeSend.sessions,
    );

    if (targetSessionKey !== get().currentSessionKey) {
      set((s) => buildSessionSwitchPatch(s, targetSessionKey));
      await get().loadHistory(true);
    }

    const currentSessionKey = targetSessionKey;
    const activeSession = get().sessions.find((s) => s.key === currentSessionKey);
    const activeProvider = providerFromModelValue(String(activeSession?.model || ''));
    const isInternalHeartbeatBootstrap = isHeartbeatBootstrapInstructionText(trimmed);

    // Add user message optimistically (with local file metadata for UI display)
    const nowMs = Date.now();
    const userMsg: RawMessage = {
      role: 'user',
      content: trimmed || (attachments?.length ? '(file attached)' : ''),
      timestamp: nowMs / 1000,
      id: crypto.randomUUID(),
      _attachedFiles: attachments?.map(a => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        fileSize: a.fileSize,
        preview: a.preview,
        filePath: a.stagedPath,
      })),
    };
    set((s) => ({
      messages: isInternalHeartbeatBootstrap ? s.messages : [...s.messages, userMsg],
      sending: true,
      error: null,
      streamingText: '',
      streamingMessage: null,
      streamingTools: [],
      pendingFinal: false,
      lastUserMessageAt: isInternalHeartbeatBootstrap ? null : nowMs,
    }));

    // Update session label with first user message text as soon as it's sent
    const { sessionLabels, messages } = get();
    const isFirstMessage = !messages.slice(0, -1).some((m) => m.role === 'user');
    if (!isInternalHeartbeatBootstrap && isFirstMessage && trimmed) {
      const labelText = sanitizeSessionLabelText(trimmed);
      const truncated = labelText.length > 50 ? `${labelText.slice(0, 50)}…` : labelText;
      if (truncated && isGenericSessionLabel(sessionLabels[currentSessionKey], currentSessionKey)) {
        set((s) => ({ sessionLabels: { ...s.sessionLabels, [currentSessionKey]: truncated } }));
      }
    }

    // Mark this session as most recently active
    set((s) => ({ sessionLastActivity: { ...s.sessionLastActivity, [currentSessionKey]: nowMs } }));

    // Special command: /compact
    // Keep this visible in chat by writing an explicit system message for success/failure.
    if (/^\/compact(?:\s+.*)?$/i.test(trimmed)) {
      const nowSeconds = Date.now() / 1000;
      const getCompactText = (payload: unknown): string => {
        if (!payload || typeof payload !== 'object') return '';
        const obj = payload as Record<string, unknown>;
        const candidates = [obj.message, obj.text, obj.summary, obj.result];
        for (const candidate of candidates) {
          if (typeof candidate === 'string' && candidate.trim()) return candidate.trim();
        }
        return '';
      };
      try {
        const compactResult = await useGatewayStore.getState().rpc<Record<string, unknown>>(
          'sessions.compact',
          { key: currentSessionKey },
          60_000,
        );
        const detail = getCompactText(compactResult);
        const systemMessage: RawMessage = {
          role: 'system',
          content: detail
            ? `会话压缩完成：${detail}`
            : '会话压缩完成 (Session compacted).',
          timestamp: nowSeconds,
          id: crypto.randomUUID(),
        };
        set((s) => ({
          messages: [...s.messages, systemMessage],
          sending: false,
          activeRunId: null,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          lastUserMessageAt: null,
          pendingToolImages: [],
          error: null,
        }));
        noteSessionHasMessages(currentSessionKey);
        void get().loadHistory(true);
      } catch (err) {
        const systemMessage: RawMessage = {
          role: 'system',
          content: `会话压缩失败：${String(err)}`,
          timestamp: nowSeconds,
          id: crypto.randomUUID(),
        };
        set((s) => ({
          messages: [...s.messages, systemMessage],
          sending: false,
          activeRunId: null,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          lastUserMessageAt: null,
          pendingToolImages: [],
          error: null,
        }));
      }
      return;
    }

    // OpenAI auth sanity checks can be slow (filesystem/network).
    // Run them AFTER optimistic UI update so user message appears instantly.
    if (activeProvider === 'openai') {
      await repairOpenAiAuthArtifacts();
      const keyStatus = await inspectOpenAiProviderAuthStatus();
      const invalidStoredKey = keyStatus.hasInvalidStoredKey && keyStatus.checked && !keyStatus.hasUsableAuth;
      if (invalidStoredKey) {
        set({
          error: 'OpenAI stored credential is invalid. Please re-login OpenAI in 模型认证.',
          sending: false,
          activeRunId: null,
          pendingFinal: false,
          lastUserMessageAt: null,
        });
        return;
      }
    }

    // Start the history poll and safety timeout IMMEDIATELY (before the
    // RPC await) because the gateway's chat.send RPC may block until the
    // entire agentic conversation finishes — the poll must run in parallel.
    _lastChatEventAt = Date.now();
    clearHistoryPoll();
    clearErrorRecoveryTimer();

    const POLL_START_DELAY = 3_000;
    const POLL_INTERVAL = 4_000;
    const STREAM_STALE_MS = 30_000;
    const pollHistory = () => {
      const state = get();
      if (!state.sending) { clearHistoryPoll(); return; }

      // 正常流式过程中不打断；但若长时间没有新事件，认为流式中断，改为主动拉历史
      if (state.streamingMessage) {
        const idleMs = Date.now() - _lastChatEventAt;
        if (idleMs < STREAM_STALE_MS) {
          _historyPollTimer = setTimeout(pollHistory, POLL_INTERVAL);
          return;
        }
        console.warn(`[chat.poll] streaming stale for ${idleMs}ms, fallback to history refresh`);
      }

      state.loadHistory(true);
      _historyPollTimer = setTimeout(pollHistory, POLL_INTERVAL);
    };
    _historyPollTimer = setTimeout(pollHistory, POLL_START_DELAY);

    const CHAT_SEND_TIMEOUT_MS = 240_000;
    const CHAT_SEND_RETRY_TIMEOUT_MS = 360_000;
    const SAFETY_TIMEOUT_MS = CHAT_SEND_TIMEOUT_MS + 60_000;
    const checkStuck = () => {
      const state = get();
      if (!state.sending) return;
      if (state.streamingMessage || state.streamingText) return;
      if (state.pendingFinal) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      if (Date.now() - _lastChatEventAt < SAFETY_TIMEOUT_MS) {
        setTimeout(checkStuck, 10_000);
        return;
      }
      clearHistoryPoll();
      set({
        error: 'LLM request timed out. No events were received in time. Please retry or switch model/provider.',
        sending: false,
        activeRunId: null,
        lastUserMessageAt: null,
      });
    };
    setTimeout(checkStuck, 30_000);

    try {
      const idempotencyKey = crypto.randomUUID();
      const hasMedia = attachments && attachments.length > 0;
      if (hasMedia) {
        console.log('[sendMessage] Media paths:', attachments!.map(a => a.stagedPath));
      }

      // Cache image attachments BEFORE the IPC call to avoid race condition:
      // history may reload (via Gateway event) before the RPC returns.
      // Keyed by staged file path which appears in [media attached: <path> ...].
      if (hasMedia && attachments) {
        for (const a of attachments) {
          _imageCache.set(a.stagedPath, {
            fileName: a.fileName,
            mimeType: a.mimeType,
            fileSize: a.fileSize,
            preview: a.preview,
          });
        }
        saveImageCache(_imageCache);
      }

      let result: { success: boolean; result?: { runId?: string }; error?: string };

      const sendOnce = async (timeoutMs: number): Promise<{ success: boolean; result?: { runId?: string }; error?: string }> => {
        try {
          if (hasMedia) {
            // 将媒体附件信息以 [media attached: ...] 标记嵌入消息文本，通过 chat.send RPC 发送
            const mediaTagLines = attachments!.map((a) =>
              `[media attached: ${a.stagedPath} (${a.mimeType}) | ${a.fileName}]`,
            );
            const messageWithMedia = (trimmed || 'Process the attached file(s).') + '\n' + mediaTagLines.join('\n');
            console.log('[sendMessage] Sending with media tags via RPC:', messageWithMedia);
            const rpcResult = await useGatewayStore.getState().rpc<{ runId?: string }>(
              'chat.send',
              {
                sessionKey: currentSessionKey,
                message: messageWithMedia,
                deliver: false,
                idempotencyKey,
              },
              timeoutMs,
            );
            return { success: true, result: rpcResult };
          }

          const rpcResult = await useGatewayStore.getState().rpc<{ runId?: string }>(
            'chat.send',
            {
              sessionKey: currentSessionKey,
              message: trimmed,
              deliver: false,
              idempotencyKey,
            },
            timeoutMs,
          );
          return { success: true, result: rpcResult };
        } catch (sendErr) {
          return { success: false, error: String(sendErr) };
        }
      };

      result = await sendOnce(CHAT_SEND_TIMEOUT_MS);
      if (!result.success && isTimeoutLikeErrorMessage(result.error || '')) {
        console.warn('[sendMessage] initial send timed out, retrying once with extended timeout');
        result = await sendOnce(CHAT_SEND_RETRY_TIMEOUT_MS);
      }

      console.log(`[sendMessage] RPC result: success=${result.success}, runId=${result.result?.runId || 'none'}`);

      if (!result.success) {
        clearHistoryPoll();
        set({ error: toFriendlyChatSendError(result.error || ''), sending: false });
      } else if (result.result?.runId) {
        set({ activeRunId: result.result.runId });
      }
    } catch (err) {
      clearHistoryPoll();
      set({ error: toFriendlyChatSendError(String(err)), sending: false });
    }
  },

  // ── Abort active run ──

  abortRun: async () => {
    clearHistoryPoll();
    clearErrorRecoveryTimer();
    const { currentSessionKey } = get();
    set({ sending: false, streamingText: '', streamingMessage: null, pendingFinal: false, lastUserMessageAt: null, pendingToolImages: [] });
    set({ streamingTools: [] });

    try {
      await useGatewayStore.getState().rpc(
        'chat.abort',
        { sessionKey: currentSessionKey },
      );
    } catch (err) {
      set({ error: String(err) });
    }
  },

  // ── Handle incoming chat events from Gateway ──

  handleChatEvent: (event: Record<string, unknown>) => {
    const runId = String(event.runId || '');
    const eventState = String(event.state || '');
    const eventSessionKey = event.sessionKey != null ? String(event.sessionKey) : null;
    const { activeRunId, currentSessionKey, sending } = get();

    // Only process events for the current session (when sessionKey is present)
    if (eventSessionKey != null && eventSessionKey !== currentSessionKey) return;

    // Only process events for the active run (or if no active run set)
    if (activeRunId && runId && runId !== activeRunId) return;

    // Guard against unscoped cross-session events:
    // Some gateway notifications can arrive without sessionKey. In that case,
    // only accept them when they clearly belong to the active/sending run.
    if (eventSessionKey == null) {
      const hasMessagePayload = event.message && typeof event.message === 'object';
      const looksLikeChatLifecycle =
        !!eventState
        || hasMessagePayload
        || event.errorMessage != null
        || event.error != null;
      if (looksLikeChatLifecycle) {
        const runMatchesActive = !!(runId && activeRunId && runId === activeRunId);
        const canBindStartedRun = !!(!activeRunId && sending && runId && eventState === 'started');
        if (!runMatchesActive && !canBindStartedRun) return;
        if (canBindStartedRun) {
          set({ activeRunId: runId });
        }
      }
    }

    _lastChatEventAt = Date.now();

    // Defensive: if state is missing but we have a message, try to infer state.
    let resolvedState = eventState;
    if (!resolvedState && event.message && typeof event.message === 'object') {
      const msg = event.message as Record<string, unknown>;
      const stopReason = msg.stopReason ?? msg.stop_reason;
      if (stopReason) {
        resolvedState = 'final';
      } else if (msg.role || msg.content) {
        resolvedState = 'delta';
      }
    }

    // Only pause the history poll when we receive actual streaming data.
    // The gateway sends "agent" events with { phase, startedAt } that carry
    // no message — these must NOT kill the poll, since the poll is our only
    // way to track progress when the gateway doesn't stream intermediate turns.
    const hasUsefulData = resolvedState === 'delta' || resolvedState === 'final'
      || resolvedState === 'error' || resolvedState === 'aborted';
    if (hasUsefulData) {
      // NOTE:
      // Do not stop history polling on intermediate `final` packets.
      // Tool-heavy runs may emit multiple finals (tool_result final first,
      // assistant final later). Clearing poll here can stall UI updates when
      // follow-up events are delayed/dropped.
      const shouldPausePoll = resolvedState === 'error' || resolvedState === 'aborted';
      if (shouldPausePoll) {
        clearHistoryPoll();
      }
      // Adopt run started from another client (e.g. console at 127.0.0.1:18789):
      // show loading/streaming in the app when this session has an active run.
      const { sending } = get();
      if (!sending && runId) {
        set({ sending: true, activeRunId: runId, error: null });
      }
    }

    switch (resolvedState) {
      case 'started': {
        // Run just started (e.g. from console); show loading immediately.
        const { sending: currentSending } = get();
        if (!currentSending && runId) {
          set({ sending: true, activeRunId: runId, error: null });
        }
        break;
      }
      case 'delta': {
        // If we're receiving new deltas, the Gateway has recovered from any
        // prior error — cancel the error finalization timer and clear the
        // stale error banner so the user sees the live stream again.
        if (_errorRecoveryTimer) {
          clearErrorRecoveryTimer();
          set({ error: null });
        }
        const updates = collectToolUpdates(event.message, resolvedState);
        set((s) => ({
          streamingMessage: (() => {
            if (event.message && typeof event.message === 'object') {
              const msgRole = (event.message as RawMessage).role;
              if (isToolResultRole(msgRole)) return s.streamingMessage;
              // During provider/model fallback, gateway may emit role-only or
              // empty delta packets. If we already have accumulated content,
              // keep the existing streamingMessage instead of replacing it.
              const msgObj = event.message as RawMessage;
              if (s.streamingMessage && msgObj.content === undefined) {
                return s.streamingMessage;
              }
            }
            return event.message ?? s.streamingMessage;
          })(),
          streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
        }));
        break;
      }
      case 'final': {
        clearErrorRecoveryTimer();
        if (get().error) set({ error: null });
        // Message complete - add to history and clear streaming
        const finalMsg = event.message as RawMessage | undefined;
        if (finalMsg) {
          const updates = collectToolUpdates(finalMsg, resolvedState);
          if (isToolResultRole(finalMsg.role)) {
            // Resolve file path from the streaming assistant message's matching tool call
            const currentStreamForPath = get().streamingMessage as RawMessage | null;
            const matchedPath = (currentStreamForPath && finalMsg.toolCallId)
              ? getToolCallFilePath(currentStreamForPath, finalMsg.toolCallId)
              : undefined;

            // Mirror enrichWithToolResultFiles: collect images + file refs for next assistant msg
            const toolFiles: AttachedFileMeta[] = [
              ...extractImagesAsAttachedFiles(finalMsg.content),
            ];
            if (matchedPath) {
              for (const f of toolFiles) {
                if (!f.filePath) {
                  f.filePath = matchedPath;
                  f.fileName = matchedPath.split(/[\\/]/).pop() || 'image';
                }
              }
            }
            const text = getMessageText(finalMsg.content);
            if (text) {
              const mediaRefs = extractMediaRefs(text);
              const mediaRefPaths = new Set(mediaRefs.map(r => r.filePath));
              for (const ref of mediaRefs) toolFiles.push(makeAttachedFile(ref));
              for (const ref of extractRawFilePaths(text)) {
                if (!mediaRefPaths.has(ref.filePath)) toolFiles.push(makeAttachedFile(ref));
              }
            }
            set((s) => {
              // Snapshot the current streaming assistant message (thinking + tool_use) into
              // messages[] before clearing it. The Gateway does NOT send separate 'final'
              // events for intermediate tool-use turns — it only sends deltas and then the
              // tool result. Without snapshotting here, the intermediate thinking+tool steps
              // would be overwritten by the next turn's deltas and never appear in the UI.
              const currentStream = s.streamingMessage as RawMessage | null;
              const snapshotMsgs: RawMessage[] = [];
              if (currentStream) {
                const streamRole = currentStream.role;
                if (streamRole === 'assistant' || streamRole === undefined) {
                  // Use message's own id if available, otherwise derive a stable one from runId
                  const snapId = currentStream.id
                    || `${runId || 'run'}-turn-${s.messages.length}`;
                  if (!s.messages.some(m => m.id === snapId)) {
                    snapshotMsgs.push({
                      ...(currentStream as RawMessage),
                      role: 'assistant',
                      id: snapId,
                    });
                  }
                }
              }
              return {
                messages: snapshotMsgs.length > 0 ? [...s.messages, ...snapshotMsgs] : s.messages,
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                pendingToolImages: toolFiles.length > 0
                  ? [...s.pendingToolImages, ...toolFiles]
                  : s.pendingToolImages,
                streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
              };
            });
            // Tool-result final often arrives before the final assistant text.
            // Quietly refresh history so the next assistant turn appears even
            // if a follow-up event is delayed or dropped.
            void get().loadHistory(true);
            break;
          }
          if (isBackgroundNoiseMessage(finalMsg)) {
            set((s) => ({
              streamingText: '',
              streamingMessage: null,
              streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
              sending: false,
              activeRunId: null,
              pendingFinal: false,
              lastUserMessageAt: null,
              pendingToolImages: [],
            }));
            // Keep backend execution in logs/history but don't pollute visible chat bubble area.
            void get().loadHistory(true);
            break;
          }
          const toolOnly = isToolOnlyMessage(finalMsg);
          const hasOutput = hasNonToolAssistantContent(finalMsg);
          const msgId = finalMsg.id || (toolOnly ? `run-${runId}-tool-${Date.now()}` : `run-${runId}`);
          set((s) => {
            const nextTools = updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools;
            const streamingTools = hasOutput ? [] : nextTools;

            // Attach any images collected from preceding tool results
            const pendingImgs = s.pendingToolImages;
            const msgWithImages: RawMessage = pendingImgs.length > 0
              ? {
                ...finalMsg,
                role: (finalMsg.role || 'assistant') as RawMessage['role'],
                id: msgId,
                _attachedFiles: [...(finalMsg._attachedFiles || []), ...pendingImgs],
              }
              : { ...finalMsg, role: (finalMsg.role || 'assistant') as RawMessage['role'], id: msgId };
            const clearPendingImages = { pendingToolImages: [] as AttachedFileMeta[] };

            // Check if message already exists (prevent duplicates)
            const alreadyExists = s.messages.some(m => m.id === msgId);
            if (alreadyExists) {
              return toolOnly ? {
                streamingText: '',
                streamingMessage: null,
                pendingFinal: true,
                streamingTools,
                ...clearPendingImages,
              } : {
                streamingText: '',
                streamingMessage: null,
                sending: s.sending,
                activeRunId: s.activeRunId,
                pendingFinal: true,
                streamingTools,
                ...clearPendingImages,
              };
            }
            return toolOnly ? {
              messages: [...s.messages, msgWithImages],
              streamingText: '',
              streamingMessage: null,
              pendingFinal: true,
              streamingTools,
              ...clearPendingImages,
            } : {
              messages: [...s.messages, msgWithImages],
              streamingText: '',
              streamingMessage: null,
              sending: s.sending,
              activeRunId: s.activeRunId,
              pendingFinal: true,
              streamingTools,
              ...clearPendingImages,
              lastAddedMessageId: hasOutput ? msgId : s.lastAddedMessageId,
            };
          });
          if (hasOutput && !toolOnly) {
            // Final assistant text is present locally: stop showing "thinking"
            // immediately and keep UI stable even if later sync events are late.
            set({
              sending: false,
              activeRunId: null,
              pendingFinal: false,
            });
            // Keep local final message for responsiveness, then quietly resync
            // from gateway authoritative history to avoid "needs manual refresh".
            setTimeout(() => {
              void get().loadHistory(true);
            }, 1_200);
            setTimeout(() => {
              useChatStore.setState({ lastAddedMessageId: null });
            }, 30_000);
          }
        } else {
          // No message in final event - reload history to get complete data
          set({ streamingText: '', streamingMessage: null, pendingFinal: true });
          get().loadHistory();
        }
        break;
      }
      case 'error': {
        const rawErrorMsg = extractChatEventErrorMessage(event);
        const errorMsg = toFriendlyChatSendError(rawErrorMsg);
        if (String(rawErrorMsg || '').toLowerCase().includes('failed to extract accountid from token')) {
          void repairOpenAiAuthArtifacts();
        }
        const wasSending = get().sending;

        // Snapshot the current streaming message into messages[] so partial
        // content ("Let me get that written down...") is preserved in the UI
        // rather than being silently discarded.
        const currentStream = get().streamingMessage as RawMessage | null;
        if (currentStream && (currentStream.role === 'assistant' || currentStream.role === undefined)) {
          const snapId = (currentStream as RawMessage).id
            || `error-snap-${Date.now()}`;
          const alreadyExists = get().messages.some(m => m.id === snapId);
          if (!alreadyExists) {
            set((s) => ({
              messages: [...s.messages, { ...currentStream, role: 'assistant' as const, id: snapId }],
            }));
          }
        }

        set({
          error: errorMsg,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          pendingToolImages: [],
        });

        // Don't immediately give up: the Gateway often retries internally
        // after transient API failures (e.g. "terminated"). Keep `sending`
        // true for a grace period so that recovery events are processed and
        // the agent-phase-completion handler can still trigger loadHistory.
        if (wasSending) {
          clearErrorRecoveryTimer();
          const ERROR_RECOVERY_GRACE_MS = 15_000;
          _errorRecoveryTimer = setTimeout(() => {
            _errorRecoveryTimer = null;
            const state = get();
            if (state.sending && !state.streamingMessage) {
              clearHistoryPoll();
              // Grace period expired with no recovery — finalize the error
              set({
                sending: false,
                activeRunId: null,
                lastUserMessageAt: null,
              });
              // One final history reload in case the Gateway completed in the
              // background and we just missed the event.
              state.loadHistory(true);
            }
          }, ERROR_RECOVERY_GRACE_MS);
        } else {
          clearHistoryPoll();
          set({ sending: false, activeRunId: null, lastUserMessageAt: null });
        }
        break;
      }
      case 'aborted': {
        clearHistoryPoll();
        clearErrorRecoveryTimer();
        set({
          sending: false,
          activeRunId: null,
          streamingText: '',
          streamingMessage: null,
          streamingTools: [],
          pendingFinal: false,
          lastUserMessageAt: null,
          pendingToolImages: [],
        });
        break;
      }
      default: {
        // Unknown or empty state — if we're currently sending and receive an event
        // with a message, attempt to process it as streaming data. This handles
        // edge cases where the Gateway sends events without a state field.
        const { sending } = get();
        if (sending && event.message && typeof event.message === 'object') {
          console.warn(`[handleChatEvent] Unknown event state "${resolvedState}", treating message as streaming delta. Event keys:`, Object.keys(event));
          const updates = collectToolUpdates(event.message, 'delta');
          set((s) => ({
            streamingMessage: event.message ?? s.streamingMessage,
            streamingTools: updates.length > 0 ? upsertToolStatuses(s.streamingTools, updates) : s.streamingTools,
          }));
        }
        break;
      }
    }
  },

  // ── Toggle thinking visibility ──

  toggleThinking: () => set((s) => ({ showThinking: !s.showThinking })),

  setSessionLabel: (sessionKey: string, label: string) => {
    const trimmed = label.trim();
    set((s) => ({
      sessionLabels: (() => {
        const next = { ...s.sessionLabels };
        if (trimmed) {
          next[sessionKey] = trimmed;
        } else {
          delete next[sessionKey];
        }
        return next;
      })(),
      sessions: s.sessions.map((session) => (
        session.key === sessionKey
          ? { ...session, label: trimmed || undefined }
          : session
      )),
    }));
  },

  // ── Refresh: reload history + sessions ──

  refresh: async () => {
    const { loadHistory, loadSessions } = get();
    // 先加载会话列表，确保 currentSessionKey 正确，再加载历史
    await loadSessions();
    await loadHistory();
  },

  clearError: () => set({ error: null }),
}));
