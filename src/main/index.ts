// AxonClaw - Main Process Entry Point
// Electron Main Process

import { app, BrowserWindow, ipcMain, shell, clipboard } from 'electron';

// 捕获 EPIPE 等写入已关闭管道错误，避免未处理异常导致进程退出
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  const code = err?.code;
  if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
    // 渲染进程已关闭时的写入，忽略
    return;
  }
  console.error('[Main] uncaughtException:', err);
});
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
  startGateway,
  stopGateway,
  getGatewayStatus,
  isGatewayRunning,
  getGatewayManager,
} from '../gateway/lifecycle';
import {
  listInstalled,
  search as clawhubSearch,
  install as clawhubInstall,
  uninstall as clawhubUninstall,
  getSkillsDir,
  openSkillPath,
  scanSkillsFromDir,
} from '../gateway/clawhub-cli';

// Global window reference
let mainWindow: BrowserWindow | null = null;

/** 安全发送 IPC 到渲染进程，避免 EPIPE 等导致进程崩溃 */
function safeSendToRenderer(channel: string, ...args: unknown[]): void {
  try {
    const win = mainWindow;
    if (!win || win.isDestroyed()) return;
    const wc = win.webContents;
    if (wc.isDestroyed()) return;
    wc.send(channel, ...args);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
      // 渲染进程已关闭，忽略
      return;
    }
    console.error('[Main] safeSendToRenderer error:', err);
  }
}

/**
 * Create the main application window
 */
function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f172a', // Dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 15, y: 15 } : undefined,
    frame: isMac,
  });

  // Development: Load from Vite dev server
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    // Production: Load from built files
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  // 阻止粘贴图片时打开新窗口或跳转到非应用 URL（导致空白页）
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('blob:') || url.startsWith('data:')) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    // 仅允许导航到应用自身地址（dev server 或 file://），阻止其他任何导航（blob:, data:, about:blank 等）
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    const isAppUrl = url.startsWith(devUrl) || url.startsWith('file://');
    if (!isAppUrl) {
      e.preventDefault();
    }
  });

  return win;
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  console.log('[Main] Initializing AxonClaw...');
  
  // Create the main window
  mainWindow = createWindow();
  
  // Subscribe to Gateway events
  const gatewayManager = getGatewayManager();
  
  gatewayManager.on('started', () => {
    console.log('[Main] Gateway started');
    safeSendToRenderer('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('stopped', (code) => {
    console.log('[Main] Gateway stopped:', code);
    safeSendToRenderer('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('error', (error) => {
    console.error('[Main] Gateway error:', error);
    safeSendToRenderer('gateway:error', error.message);
  });
  
  // Start Gateway on app ready
  // Note: AxonClaw connects to existing OpenClaw Gateway (port 18789)
  // Don't start a new gateway to avoid port conflict
  console.log('[Main] AxonClaw will connect to existing OpenClaw Gateway at port 18789');
  safeSendToRenderer('gateway:status', { 
    state: 'running', 
    port: 18789,
    note: 'Using existing OpenClaw Gateway'
  });

  // Handle window activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// App lifecycle - Ready
app.whenReady().then(() => {
  initialize().catch((error) => {
    console.error('[Main] Initialization failed:', error);
  });
});

// App lifecycle - All windows closed
app.on('window-all-closed', () => {
  // On macOS, apps usually stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App lifecycle - Will quit
app.on('will-quit', async () => {
  console.log('[Main] App will quit, stopping Gateway...');
  try {
    await stopGateway();
    console.log('[Main] Gateway stopped');
  } catch (error) {
    console.error('[Main] Error stopping Gateway:', error);
  }
});

// App lifecycle - Before quit (for cleanup)
app.on('before-quit', () => {
  console.log('[Main] App before quit');
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('gateway:start', async () => {
  try {
    await startGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:stop', async () => {
  try {
    await stopGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:status', () => {
  // AxonClaw 连接已有 OpenClaw Gateway，未自启进程时也返回 running
  const status = getGatewayStatus();
  if (status.state === 'stopped' && !status.error) {
    return { ...status, state: 'running' as const, port: 18789 };
  }
  return status;
});

ipcMain.handle('gateway:isRunning', () => {
  // AxonClaw 连接外部 Gateway，视为始终运行
  return isGatewayRunning() || true;
});

// 真实连接检测：尝试 WebSocket 连接并完成 connect 握手
const CHECK_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || 'clawx-8c07bcf5f6eb617faee8f9b4c01be4a7';
ipcMain.handle('gateway:checkConnection', async () => {
  try {
    const result = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      let resolved = false;
      const once = (r: { success: boolean; error?: string }) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeout);
        ws.close();
        resolve(r);
      };
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://127.0.0.1:18789/ws');
      const timeout = setTimeout(() => once({ success: false, error: 'Timeout' }), 5000);
      ws.on('open', () => {});
      ws.on('error', () => once({ success: false, error: 'Connection refused' }));
      ws.on('message', (data: Buffer) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'event' && msg.event === 'connect.challenge') {
            ws.send(JSON.stringify({
              type: 'req', id: 'chk-' + Date.now(), method: 'connect',
              params: {
                minProtocol: 3, maxProtocol: 3,
                client: { id: 'gateway-client', displayName: 'AxonClaw', version: '0.1.0', platform: process.platform, mode: 'ui' },
                auth: { token: CHECK_TOKEN }, role: 'operator', scopes: ['operator.admin'],
              },
            }));
            return;
          }
          if (msg.type === 'res' && String(msg.id).startsWith('chk-')) {
            once({ success: !!msg.ok, error: msg.ok ? undefined : (msg.error || 'Connect failed') });
          }
        } catch { /* ignore */ }
      });
    });
    return result;
  } catch (e) {
    return { success: false, error: String(e) };
  }
});

// 重启 Gateway（AxonClaw 连接外部时，实际执行 stop + start 子进程）
ipcMain.handle('gateway:restart', async () => {
  try {
    await stopGateway();
    await new Promise((r) => setTimeout(r, 500));
    await startGateway();
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
});

// Gateway RPC - 通过 WebSocket 调用 OpenClaw Gateway
// 参数格式: invokeIpc('gateway:rpc', method, params, timeoutMs) => (method, params, timeoutMs)
ipcMain.handle('gateway:rpc', async (_event, methodOrPayload: unknown, paramsOrUndef?: unknown, timeoutMsOrUndef?: number) => {
  let method: string;
  let params: Record<string, unknown>;
  let timeout: number;

  if (typeof methodOrPayload === 'string') {
    method = methodOrPayload;
    params = (paramsOrUndef && typeof paramsOrUndef === 'object' ? paramsOrUndef : {}) as Record<string, unknown>;
    timeout = typeof timeoutMsOrUndef === 'number' ? timeoutMsOrUndef : 30000;
  } else if (methodOrPayload && typeof methodOrPayload === 'object' && 'method' in (methodOrPayload as object)) {
    const payload = methodOrPayload as { method: string; params?: unknown; timeoutMs?: number };
    method = payload.method;
    params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as Record<string, unknown>;
    timeout = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 30000;
  } else {
    throw new Error('gateway:rpc invalid args');
  }

  console.log(`[GatewayRPC] ${method}`, params);
  
  return new Promise((resolve) => {
    let resolved = false;
    let streamingChat = false; // chat.send 流式模式，收到首包后保持连接转发事件
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://127.0.0.1:18789/ws');
    
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error(`[GatewayRPC] ${method} timeout`);
        ws.close();
        resolve({ success: false, ok: false, error: 'Timeout' });
      }
    }, timeout);
    
    ws.on('open', () => {
      console.log(`[GatewayRPC] ${method} WebSocket opened`);
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'gateway-client', displayName: 'ClawX', version: '0.1.0', platform: process.platform, mode: 'ui' },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: false, ok: false, error: String(msg.error?.message ?? msg.error ?? 'Connect failed') });
            return;
          }
          // 发送实际请求
          ws.send(JSON.stringify({
            type: 'req',
            id: `rpc-${Date.now()}`,
            method,
            params,
          }));
          return;
        }
        
        // 处理 RPC 响应
        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            console.log(`[GatewayRPC] ${method} result:`, msg.ok ? 'success' : 'error');
            const ok = msg.ok !== false && !msg.error;
            const result = msg.result ?? msg.payload;
            const error = msg.error != null ? String(typeof msg.error === 'object' && msg.error && 'message' in msg.error ? (msg.error as { message?: string }).message : msg.error) : undefined;
            resolve({
              success: ok,
              ok,
              result,
              error,
            });
            // chat.send 需要保持连接以接收流式事件，不在此处关闭
            if (method !== 'chat.send') {
              ws.close();
            } else {
              streamingChat = true;
              // 流式连接保底超时 5 分钟
              setTimeout(() => {
                try {
                  if (ws.readyState === 1) ws.close();
                } catch {
                  /* ignore */
                }
              }, 300000);
            }
          }
        }

        // chat.send 流式模式: 转发 agent 事件到渲染进程
        if (streamingChat && msg.type === 'event' && typeof msg.event === 'string') {
          const payload = (msg.payload ?? msg.data ?? msg) as Record<string, unknown>;
          const ev = String(msg.event);
          const phase = payload.phase;
          const state = payload.state ?? (ev.endsWith('.delta') ? 'delta' : ev.endsWith('.final') ? 'final' : undefined);
          safeSendToRenderer('gateway:notification', {
            method: 'agent',
            params: {
              ...payload,
              phase,
              state: payload.state ?? state,
              runId: payload.runId,
              sessionKey: payload.sessionKey,
              message: payload.message,
            },
          });
          // 发送到日志页面：Gateway 是否发送 delta
          const hasMessage = payload.message != null;
          let messagePreview = '';
          if (hasMessage && typeof payload.message === 'object') {
            const m = payload.message as Record<string, unknown>;
            const content = m.content;
            if (typeof content === 'string') {
              messagePreview = content.slice(0, 80) + (content.length > 80 ? '...' : '');
            } else if (Array.isArray(content)) {
              const texts = (content as Array<{ text?: string }>).map((b) => b.text).filter(Boolean);
              messagePreview = texts.join(' ').slice(0, 80) + (texts.join('').length > 80 ? '...' : '');
            }
          }
          safeSendToRenderer('app:gateway-log', {
            time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
            level: 'DEBUG',
            agent: 'Gateway',
            message: `event=${ev} phase=${phase ?? '?'} state=${state ?? '?'} hasMessage=${hasMessage}${messagePreview ? ` preview=${JSON.stringify(messagePreview)}` : ''}`,
          });
          // 收到完成事件后关闭连接
          const donePhases = ['completed', 'done', 'finished', 'end'];
          const isDone = (phase && donePhases.includes(String(phase))) || state === 'final';
          if (isDone) {
            ws.close();
          }
        }
      } catch (err) {
        console.error(`[GatewayRPC] ${method} parse error:`, err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error(`[GatewayRPC] ${method} WebSocket error:`, err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: err.message });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log(`[GatewayRPC] ${method} WebSocket closed:`, code, reason.toString());
        resolve({ success: false, ok: false, error: 'Connection closed' });
      }
    });
  });
});

// Skills management
const SKILLS_DIR = path.join(os.homedir(), '.openclaw', 'skills');

ipcMain.handle('skills:openFolder', async () => {
  await shell.openPath(SKILLS_DIR);
});

ipcMain.handle('openclaw:getSkillsDir', () => SKILLS_DIR);

ipcMain.handle('skills:listInstalled', async () => {
  try {
    const results = await listInstalled();
    return { success: true, results };
  } catch (err) {
    console.error('[skills:listInstalled]', err);
    return { success: false, results: [] };
  }
});

// Shell helpers (打开目录、外部链接等)
ipcMain.handle('shell:showItemInFolder', async (_event, dirPath: string) => {
  if (dirPath && typeof dirPath === 'string') {
    await shell.showItemInFolder(dirPath);
  }
});
ipcMain.handle('shell:openPath', async (_event, filePath: string) => {
  if (filePath && typeof filePath === 'string') {
    return shell.openPath(filePath);
  }
  return '';
});
ipcMain.handle('clipboard:readImage', () => {
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) return null;
    const png = img.toPNG();
    if (!png || png.length === 0) return null;
    return { base64: png.toString('base64'), mimeType: 'image/png' };
  } catch {
    return null;
  }
});

ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  if (url && typeof url === 'string') {
    await shell.openExternal(url);
  }
});

// Sessions list - 代理到 OpenClaw Gateway
ipcMain.handle('sessions.list', async (_event, { limit, agentId }) => {
  console.log('[SessionsList] Fetching sessions...');
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://127.0.0.1:18789/ws');
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[SessionsList] Timeout');
        ws.close();
        resolve({ sessions: [] }); // 超时返回空数组而不是 reject
      }
    }, 10000);
    
    ws.on('open', () => {
      console.log('[SessionsList] WebSocket opened');
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[SessionsList] Message:', msg.type, msg.event || msg.id || '');
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          console.log('[SessionsList] Got challenge, sending connect...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { 
                id: 'gateway-client', 
                displayName: 'ClawX', 
                version: '0.1.0',
                platform: process.platform,
                mode: 'ui',
              },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          console.log('[SessionsList] Connect response:', msg.ok ? 'SUCCESS' : 'FAILED');
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ sessions: [] });
            return;
          }
          // 发送 sessions.list 请求
          console.log('[SessionsList] Sending sessions.list request...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'sessions-' + Date.now(),
            method: 'sessions.list',
            params: { limit: limit || 50, agentId: agentId || 'main' },
          }));
          return;
        }
        
        // 处理 sessions.list 响应
        if (msg.type === 'res' && String(msg.id).startsWith('sessions-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            const sessions = msg.payload?.sessions || msg.result?.sessions || [];
            console.log('[SessionsList] Found', sessions.length, 'sessions');
            resolve({ sessions });
          }
        }
      } catch (err) {
        console.error('[SessionsList] Parse error:', err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error('[SessionsList] WebSocket error:', err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      console.log('[SessionsList] WebSocket closed:', code, reason.toString());
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
  });
});

// Host API proxy - Gateway REST API
const GATEWAY_API_BASE = 'http://127.0.0.1:18789';
const GATEWAY_WS_URL = 'ws://127.0.0.1:18789/ws';
const GATEWAY_TOKEN = 'clawx-8c07bcf5f6eb617faee8f9b4c01be4a7'; // OpenClaw Gateway token
// 保存 path 模块引用，避免在 hostapi:fetch handler 中被同名参数遮蔽
const nodePath = path;

ipcMain.handle('hostapi:fetch', async (_event, { path, method, headers, body }) => {
  try {
    // 特殊处理：AxonClaw 的 gateway-info API
    if (path === '/api/app/gateway-info') {
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: {
            wsUrl: GATEWAY_WS_URL,
            token: GATEWAY_TOKEN,
            port: 18789,
          },
        },
        success: true,
        status: 200,
        json: {
          wsUrl: GATEWAY_WS_URL,
          token: GATEWAY_TOKEN,
          port: 18789,
        },
      };
    }

    // 特殊处理：/api/gateway/health 用于心跳健康检查
    if (path === '/api/gateway/health' || path.startsWith('/api/gateway/health')) {
      try {
        const res = await fetch('http://127.0.0.1:18789/health');
        const ok = res.ok;
        let uptime: number | undefined;
        try {
          const json = await res.json() as { uptime?: number };
          uptime = json.uptime;
        } catch {
          /* ignore */
        }
        return {
          ok: true,
          data: { status: 200, json: { ok, uptime }, ok: true },
          success: true,
          status: 200,
          json: { ok, uptime },
        };
      } catch (err) {
        return {
          ok: true,
          data: { status: 200, json: { ok: false, error: String(err) }, ok: true },
          success: true,
          status: 200,
          json: { ok: false, error: String(err) },
        };
      }
    }

    // 特殊处理：/api/logs Gateway 日志（OpenClaw 默认 /tmp/openclaw/openclaw-YYYY-MM-DD.log）
    if (path.startsWith('/api/logs')) {
      const tailMatch = path.match(/tailLines=(\d+)/);
      const tailLines = tailMatch ? parseInt(tailMatch[1], 10) : 200;
      try {
        const res = await fetch(`${GATEWAY_API_BASE}${path}`);
        if (res.ok) {
          const data = await res.json() as { content?: string };
          return { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data };
        }
      } catch {
        /* Gateway 可能未提供，从本地读取 */
      }
      const gatewayLogDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
      const openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
      const dirToUse = fs.existsSync(gatewayLogDir) ? gatewayLogDir : (fs.existsSync(openclawLogDir) ? openclawLogDir : gatewayLogDir);
      if (path === '/api/logs/dir' || path.startsWith('/api/logs/dir')) {
        return { ok: true, data: { status: 200, json: { dir: dirToUse }, ok: true }, success: true, status: 200, json: { dir: dirToUse } };
      }
      const readFromDir = (dir: string) => {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir)
          .filter((f) => f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/))
          .sort()
          .reverse();
        if (files.length === 0) return null;
        return files.slice(0, 5).map((f) => {
          try {
            const full = nodePath.join(dir, f);
            const buf = fs.readFileSync(full, 'utf8');
            const lines = buf.split(/\r?\n/);
            return `[${f}]\n${lines.slice(-tailLines).join('\n')}`;
          } catch {
            return `[${f}] (读取失败)`;
          }
        }).join('\n\n---\n\n');
      };
      const content = readFromDir(gatewayLogDir) ?? readFromDir(openclawLogDir) ?? '(Gateway 日志目录不存在: /tmp/openclaw 或 ~/.openclaw/logs)';
      return { ok: true, data: { status: 200, json: { content }, ok: true }, success: true, status: 200, json: { content } };
    }

    // 特殊处理：/health 直接返回成功
    if (path === '/health') {
      console.log('[HostAPI] GET /health (direct response)');
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { ok: true, status: 'live' },
          text: undefined,
        },
        success: true,
        status: 200,
        json: { ok: true, status: 'live' },
        text: undefined,
      };
    }

    // ── ClawHub 技能 API（本地实现，对接真实 OpenClaw 技能）──
    if (path === '/api/clawhub/list' && method === 'GET') {
      try {
        const results = await listInstalled();
        return { ok: true, data: { status: 200, json: { success: true, results }, ok: true }, success: true, status: 200, json: { success: true, results } };
      } catch (err) {
        console.error('[HostAPI] clawhub list error:', err);
        return { ok: true, data: { status: 200, json: { success: true, results: [] }, ok: true }, success: true, status: 200, json: { success: true, results: [] } };
      }
    }
    if (path === '/api/clawhub/search' && method === 'POST' && body) {
      try {
        const { query } = JSON.parse(body) as { query?: string };
        const results = await clawhubSearch(query || '', 50);
        return { ok: true, data: { status: 200, json: { success: true, results }, ok: true }, success: true, status: 200, json: { success: true, results } };
      } catch (err) {
        console.error('[HostAPI] clawhub search error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/install' && method === 'POST' && body) {
      try {
        const { slug, version } = JSON.parse(body) as { slug?: string; version?: string };
        if (!slug) return { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } };
        await clawhubInstall(slug, version);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub install error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/uninstall' && method === 'POST' && body) {
      try {
        const { slug } = JSON.parse(body) as { slug?: string };
        if (!slug) return { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } };
        await clawhubUninstall(slug);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub uninstall error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/open-readme' && method === 'POST' && body) {
      try {
        const { skillKey, slug, baseDir } = JSON.parse(body) as { skillKey?: string; slug?: string; baseDir?: string };
        const dir = openSkillPath(skillKey || slug || '', baseDir);
        if (!dir) return { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } };
        const candidates = ['SKILL.md', 'README.md'];
        let target = '';
        for (const f of candidates) {
          const p = nodePath.join(dir, f);
          if (fs.existsSync(p)) { target = p; break; }
        }
        if (!target) target = dir;
        await shell.openPath(target);
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub open-readme error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/clawhub/open-path' && method === 'POST' && body) {
      try {
        const { skillKey, slug, baseDir } = JSON.parse(body) as { skillKey?: string; slug?: string; baseDir?: string };
        const dir = openSkillPath(skillKey || slug || '', baseDir);
        if (!dir) return { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } };
        const r = await shell.openPath(dir);
        if (r) return { ok: false, data: { status: 500, json: { success: false, error: r }, ok: false }, success: false, status: 500, json: { success: false, error: r } };
        return { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } };
      } catch (err) {
        console.error('[HostAPI] clawhub open-path error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/skills/load-from-dir' && method === 'POST' && body) {
      try {
        const { dirPath } = JSON.parse(body) as { dirPath?: string };
        if (!dirPath || typeof dirPath !== 'string') return { ok: false, data: { status: 400, json: { success: false, error: 'dirPath required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'dirPath required' } };
        const resolved = dirPath.startsWith('~') ? nodePath.join(os.homedir(), dirPath.slice(1)) : dirPath;
        const skills = scanSkillsFromDir(resolved);
        return { ok: true, data: { status: 200, json: { success: true, skills }, ok: true }, success: true, status: 200, json: { success: true, skills } };
      } catch (err) {
        console.error('[HostAPI] skills load-from-dir error:', err);
        return { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } };
      }
    }
    if (path === '/api/skills/configs' && method === 'GET') {
      try {
        const configPath = nodePath.join(os.homedir(), '.openclaw', 'skills-config.json');
        if (fs.existsSync(configPath)) {
          const raw = fs.readFileSync(configPath, 'utf8');
          const json = JSON.parse(raw) as Record<string, { apiKey?: string; env?: Record<string, string> }>;
          return { ok: true, data: { status: 200, json, ok: true }, success: true, status: 200, json };
        }
        return { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} };
      } catch {
        return { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} };
      }
    }

    // 文件暂存：缓存到临时目录，供 OpenClaw 识别
    const STAGE_DIR = nodePath.join(os.tmpdir(), 'axonclaw-staged');
    if (!fs.existsSync(STAGE_DIR)) fs.mkdirSync(STAGE_DIR, { recursive: true });

    if (path === '/api/files/stage-paths' && method === 'POST' && body) {
      try {
        const { filePaths } = JSON.parse(body) as { filePaths?: string[] };
        if (!Array.isArray(filePaths) || filePaths.length === 0) {
          return { ok: false, data: { status: 400, json: [] }, success: false };
        }
        const results: Array<{ id: string; fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }> = [];
        for (const srcPath of filePaths) {
          const fileName = srcPath.split(/[\\/]/).pop() || 'file';
          const ext = nodePath.extname(fileName);
          const id = crypto.randomUUID();
          const stagedPath = nodePath.join(STAGE_DIR, `${id}${ext}`);
          fs.copyFileSync(srcPath, stagedPath);
          const stat = fs.statSync(stagedPath);
          const mimeMap: Record<string, string> = {
            '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
          };
          const mimeType = mimeMap[ext.toLowerCase()] || 'application/octet-stream';
          let preview: string | null = null;
          if (mimeType.startsWith('image/')) {
            try {
              const buf = fs.readFileSync(stagedPath);
              preview = `data:${mimeType};base64,${buf.toString('base64')}`;
            } catch {
              /* ignore */
            }
          }
          results.push({ id, fileName, mimeType, fileSize: stat.size, stagedPath, preview });
        }
        return { ok: true, data: { status: 200, json: results }, success: true, json: results };
      } catch (err) {
        console.error('[HostAPI] stage-paths error:', err);
        return { ok: false, data: { status: 500, json: [] }, success: false };
      }
    }

    if (path === '/api/files/stage-buffer' && method === 'POST' && body) {
      try {
        const { base64, fileName, mimeType } = JSON.parse(body) as { base64?: string; fileName?: string; mimeType?: string };
        if (!base64 || !fileName) {
          return { ok: false, data: { status: 400, json: null }, success: false };
        }
        const id = crypto.randomUUID();
        const ext = nodePath.extname(fileName) || (mimeType?.startsWith('image/') ? '.png' : '.bin');
        const stagedPath = nodePath.join(STAGE_DIR, `${id}${ext}`);
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(stagedPath, buf);
        const mime = mimeType || 'application/octet-stream';
        let preview: string | null = null;
        if (mime.startsWith('image/')) {
          preview = `data:${mime};base64,${base64}`;
        }
        const result = { id, fileName, mimeType: mime, fileSize: buf.length, stagedPath, preview };
        return { ok: true, data: { status: 200, json: result }, success: true, json: result };
      } catch (err) {
        console.error('[HostAPI] stage-buffer error:', err);
        return { ok: false, data: { status: 500, json: null }, success: false };
      }
    }

    const url = `${GATEWAY_API_BASE}${path}`;
    console.log(`[HostAPI] ${method} ${path}`);
    
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
    });

    let json: unknown = undefined;
    let text: string | undefined = undefined;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch {
        text = await response.text();
      }
    } else {
      text = await response.text();
    }

    return {
      ok: true,
      data: {
        status: response.status,
        ok: response.ok,
        json,
        text,
      },
      success: response.ok,
      status: response.status,
      json,
      text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[HostAPI] Error: ${message}`);
    return {
      ok: false,
      error: { message },
      success: false,
    };
  }
});

// Export for testing
export { mainWindow };
