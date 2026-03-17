/**
 * AxonClaw - 配置中心
 * ClawDeckX 风格：表单式 UI + JSON 编辑器
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Save,
  Search,
  FileCode,
  LayoutList,
  ChevronRight,
  Bot,
  Radio,
  Target,
  Wrench,
  MessageSquare,
  Router,
  Database,
  FolderOpen,
  Terminal,
  Webhook,
  Clock,
  Puzzle,
  Volume2,
  Globe,
  ScrollText,
  Lock,
  Settings,
  Sparkles,
  Cloud,
  History,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useGatewayStore } from '@/stores/gateway';
import { configGet, configSet, configGetPath, type OpenClawConfig } from '@/services/config-api';
import { toast } from 'sonner';
import {
  SessionSection,
  LoggingSection,
  GatewaySection,
  MemorySection,
  CommandsSection,
  HooksSection,
  CronSection,
  AuthSection,
  MiscSection,
  MessagesSection,
  AudioSection,
  BrowserSection,
} from '@/views/ConfigurationCenter/sections';

/** 配置区块定义：id、标签、图标、对应 config 顶层 key */
interface SectionDef {
  id: string;
  label: string;
  icon: LucideIcon;
  /** 单个 key 或 key 数组，用于提取/合并 */
  keys: string[];
}

const CONFIG_SECTIONS: SectionDef[] = [
  { id: 'models', label: '模型 (models)', icon: Target, keys: ['models'] },
  { id: 'channels', label: '频道 (channels)', icon: Radio, keys: ['channels'] },
  { id: 'gateway', label: '网关 (gateway)', icon: Router, keys: ['gateway', 'discovery', 'web'] },
  { id: 'templates', label: '模板 (templates)', icon: Sparkles, keys: ['templates'] },
  { id: 'agents', label: '代理 (agents)', icon: Bot, keys: ['agents', 'bindings'] },
  { id: 'tools', label: '工具 (tools)', icon: Wrench, keys: ['tools', 'canvasHost', 'media'] },
  { id: 'messages', label: '消息 (messages)', icon: MessageSquare, keys: ['messages', 'broadcast'] },
  { id: 'commands', label: '命令 (commands)', icon: Terminal, keys: ['commands'] },
  { id: 'session', label: '会话 (session)', icon: History, keys: ['session'] },
  { id: 'hooks', label: 'Hooks', icon: Webhook, keys: ['hooks'] },
  { id: 'cron', label: '定时任务 (cron)', icon: Clock, keys: ['cron'] },
  { id: 'extensions', label: '扩展 (extensions)', icon: Puzzle, keys: ['extensions', 'skills', 'plugins'] },
  { id: 'memory', label: '记忆 (memory)', icon: Database, keys: ['memory'] },
  { id: 'audio', label: '音频 (audio)', icon: Volume2, keys: ['talk', 'audio'] },
  { id: 'browser', label: '浏览器 (browser)', icon: Globe, keys: ['browser'] },
  { id: 'logging', label: '日志 (logging)', icon: ScrollText, keys: ['logging', 'diagnostics'] },
  { id: 'auth', label: '认证 (auth)', icon: Lock, keys: ['auth'] },
  { id: 'misc', label: '杂项 (misc)', icon: Settings, keys: ['update', 'ui', 'env', 'cli', 'meta', 'secrets', 'acp', 'approvals', 'nodeHost'] },
  { id: 'live', label: '实时配置 (live)', icon: Cloud, keys: [] },
  { id: '_raw', label: '完整 JSON', icon: FileCode, keys: [] },
];

type SectionId = (typeof CONFIG_SECTIONS)[number]['id'];

export const ConfigurationCenterView: React.FC = () => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [activeSection, setActiveSection] = useState<SectionId>('agents');
  const [viewMode, setViewMode] = useState<'section' | 'json'>('section');
  const [searchQuery, setSearchQuery] = useState('');
  const [config, setConfig] = useState<OpenClawConfig>({});
  const [draft, setDraft] = useState<OpenClawConfig>({});
  const [originalJson, setOriginalJson] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configPath, setConfigPath] = useState<string>('');
  const [showDiff, setShowDiff] = useState(false);
  const [jsonRaw, setJsonRaw] = useState<string>('');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await configGet(isOnline);
      setConfig(data);
      setDraft(data);
      const str = JSON.stringify(data, null, 2);
      setOriginalJson(str);
      setJsonRaw(str);
      const pathRes = await configGetPath();
      setConfigPath(pathRes);
    } catch (e) {
      toast.error(`加载失败: ${String(e)}`);
      setConfig({});
      setDraft({});
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (viewMode === 'json') {
      setJsonRaw(JSON.stringify(draft, null, 2));
    }
  }, [viewMode, draft]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let toSave: OpenClawConfig;
      if (viewMode === 'json') {
        try {
          toSave = JSON.parse(jsonRaw) as OpenClawConfig;
        } catch {
          toast.error('JSON 格式无效，请检查语法');
          setSaving(false);
          return;
        }
      } else {
        toSave = draft;
      }
      await configSet(toSave, isOnline);
      setConfig(toSave);
      const str = JSON.stringify(toSave, null, 2);
      setOriginalJson(str);
      setJsonRaw(str);
      setDraft(toSave);
      toast.success('配置已保存');
      if (isOnline) {
        toast.info('Gateway 将自动热重载配置');
      } else {
        toast.info('请启动 Gateway 后配置生效');
      }
    } catch (e) {
      toast.error(`保存失败: ${String(e)}`);
    } finally {
      setSaving(false);
    }
  };

  const getSectionValue = (section: SectionId): string => {
    if (section === '_raw' || section === 'live') return JSON.stringify(draft, null, 2);
    const def = CONFIG_SECTIONS.find((s) => s.id === section);
    if (!def?.keys.length) return JSON.stringify(draft, null, 2);
    const obj: Record<string, unknown> = {};
    for (const k of def.keys) {
      const v = draft[k];
      if (v !== undefined) obj[k] = v;
    }
    return JSON.stringify(obj, null, 2);
  };

  const setSectionValue = (section: SectionId, value: string) => {
    if (section === '_raw' || section === 'live') {
      try {
        const parsed = JSON.parse(value) as OpenClawConfig;
        setDraft(parsed);
      } catch {
        /* invalid json, keep draft */
      }
      return;
    }
    const def = CONFIG_SECTIONS.find((s) => s.id === section);
    if (!def?.keys.length) return;
    try {
      const parsed = JSON.parse(value || '{}') as Record<string, unknown>;
      setDraft((prev) => {
        const next = { ...prev };
        for (const k of def.keys) {
          if (k in parsed) next[k] = parsed[k];
          else delete next[k];
        }
        return next;
      });
    } catch {
      /* invalid */
    }
  };

  const getNested = (obj: Record<string, unknown>, path: string[]): unknown => {
    let cur: unknown = obj;
    for (const k of path) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
  };

  const setNested = (obj: Record<string, unknown>, path: string[], value: unknown): Record<string, unknown> => {
    if (path.length === 0) return value as Record<string, unknown>;
    const [head, ...rest] = path;
    const next = { ...obj };
    if (rest.length === 0) {
      next[head] = value;
    } else {
      const child = (next[head] ?? {}) as Record<string, unknown>;
      next[head] = setNested(child, rest, value);
    }
    return next;
  };

  const getField = useCallback(
    (path: string[]) => getNested(draft, path),
    [draft]
  );

  const setField = useCallback(
    (path: string[], value: unknown) => {
      setDraft((prev) => setNested(prev as Record<string, unknown>, path, value) as OpenClawConfig);
    },
    []
  );

  const sectionProps = useMemo(
    () => ({
      config: draft,
      setField,
      getField,
    }),
    [draft, setField, getField]
  );

  const FORM_SECTIONS: Record<string, React.ComponentType<{ config: Record<string, unknown>; setField: (path: string[], value: unknown) => void; getField: (path: string[]) => unknown }>> = {
    session: SessionSection,
    logging: LoggingSection,
    gateway: GatewaySection,
    memory: MemorySection,
    commands: CommandsSection,
    hooks: HooksSection,
    cron: CronSection,
    auth: AuthSection,
    misc: MiscSection,
    messages: MessagesSection,
    audio: AudioSection,
    browser: BrowserSection,
  };

  const filteredSections = searchQuery
    ? CONFIG_SECTIONS.filter(
        (s) =>
          s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : CONFIG_SECTIONS;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f172a]">
      {/* 顶部栏 */}
      <div className="flex-shrink-0 py-4 border-b border-indigo-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-foreground">配置中心</h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setViewMode('section')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'section'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                  : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              <LayoutList className="h-4 w-4" />
              分类
            </button>
            <button
              onClick={() => setViewMode('json')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                viewMode === 'json'
                  ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                  : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              <FileCode className="h-4 w-4" />
              JSON 编辑器
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索配置项…"
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[#1e293b] border border-indigo-500/30 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-500/40"
            onClick={() => void loadConfig()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button
            size="sm"
            className="bg-indigo-500 hover:bg-indigo-600"
            onClick={() => void handleSave()}
            disabled={saving || loading}
          >
            <Save className="h-4 w-4 mr-2" />
            保存
          </Button>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* 左侧导航 */}
        <aside className="w-56 shrink-0 border-r border-indigo-500/20 flex flex-col bg-[#0f172a]/50">
          <div className="p-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            配置区域
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {filteredSections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                className={cn(
                  'w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors',
                  activeSection === s.id
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40'
                    : 'text-foreground/80 hover:bg-white/5'
                )}
              >
                <s.icon className="h-4 w-4 shrink-0" />
                <span className="truncate flex-1">{s.label}</span>
                <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
              </button>
            ))}
          </nav>
          {configPath && (
            <div className="p-2 border-t border-indigo-500/10">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FolderOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={configPath}>
                  {configPath}
                </span>
              </div>
            </div>
          )}
        </aside>

        {/* 主内容区 */}
        <main className="flex-1 overflow-hidden flex flex-col min-w-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
            </div>
          ) : viewMode === 'json' ? (
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">完整配置 JSON</span>
                <button
                  onClick={() => setShowDiff(!showDiff)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showDiff ? '隐藏对比' : '显示变更对比'}
                </button>
              </div>
              <div className="flex-1 rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] overflow-hidden flex flex-col min-h-0">
                <textarea
                  value={jsonRaw}
                  onChange={(e) => setJsonRaw(e.target.value)}
                  className="flex-1 w-full p-4 font-mono text-sm bg-[#0f172a] text-foreground border-0 outline-none resize-none min-h-[300px]"
                  placeholder="{}"
                  spellCheck={false}
                />
              </div>
              {showDiff && (
                <div className="mt-4 rounded-xl border-2 border-amber-500/30 bg-[#1e293b] p-4 max-h-48 overflow-y-auto">
                  <div className="text-xs font-medium text-amber-400 mb-2">变更对比</div>
                  <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                    {(() => {
                      try {
                        const a = JSON.parse(originalJson) as Record<string, unknown>;
                        const b = draft as Record<string, unknown>;
                        const diff: string[] = [];
                        const allKeys = new Set([...Object.keys(a), ...Object.keys(b)]);
                        for (const k of allKeys) {
                          const va = JSON.stringify(a[k]);
                          const vb = JSON.stringify(b[k]);
                          if (va !== vb) {
                            diff.push(`[${k}]: ${va === undefined ? '新增' : vb === undefined ? '删除' : '已修改'}`);
                          }
                        }
                        return diff.length ? diff.join('\n') : '无变更';
                      } catch {
                        return '无变更';
                      }
                    })()}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden p-4 overflow-y-auto">
              {FORM_SECTIONS[activeSection] ? (
                <div className="space-y-4 pb-8">
                  {React.createElement(FORM_SECTIONS[activeSection], sectionProps)}
                </div>
              ) : (
                <SectionEditor
                  section={activeSection}
                  value={getSectionValue(activeSection)}
                  onChange={(v) => setSectionValue(activeSection, v)}
                  isOnline={isOnline}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* 底部提示 */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-indigo-500/10 bg-[#0f172a]/50">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">ClawDeckX 风格：</span>
          修改后点击「保存」，{isOnline ? 'Gateway 将自动热重载' : '配置写入 ~/.openclaw/openclaw.json，启动 Gateway 后生效'}。
          使用顶部搜索可快速定位配置项。
        </p>
      </div>
    </div>
  );
};

function SectionEditor({
  section,
  value,
  onChange,
  isOnline,
}: {
  section: SectionId;
  value: string;
  onChange: (v: string) => void;
  isOnline: boolean;
}) {
  const s = CONFIG_SECTIONS.find((x) => x.id === section);
  const label = s?.label ?? section;

  const hints: Record<string, string> = {
    live: isOnline
      ? '当前为 Gateway 实时配置，保存后将热重载生效。'
      : '离线模式下与完整 JSON 相同，请先启动 Gateway 使用实时配置。',
    templates: '模板配置（若存在）。模板也可通过工作区或 ClawDeckX 模板系统管理。',
    _raw: '编辑完整 openclaw 配置 JSON，保存后生效。',
  };
  const hint = hints[section];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        {s && <s.icon className="h-5 w-5 text-indigo-400" />}
        <h2 className="text-base font-semibold text-foreground">{label}</h2>
      </div>
      {hint && (
        <p className="text-xs text-muted-foreground mb-2 px-1">{hint}</p>
      )}
      <div className="flex-1 rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] overflow-hidden min-h-0">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full h-full min-h-[300px] p-4 font-mono text-sm bg-[#0f172a] text-foreground border-0 outline-none resize-none"
          placeholder="{}"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

export default ConfigurationCenterView;
