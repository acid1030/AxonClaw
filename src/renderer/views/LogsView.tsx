/**
 * AxonClaw - Gateway 监控视图
 * 替换原日志页，复刻 ClawDeckX Gateway 全部功能
 * 标签：Logs | Events | Channels | Service | Debug
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  RefreshCw,
  FolderOpen,
  Trash2,
  Filter,
  Search,
  Play,
  Square,
  RotateCw,
  ChevronDown,
  ChevronRight,
  Bug,
  Activity,
  Radio,
  Settings,
  FileText,
} from 'lucide-react';
import { useGatewayLogsStore } from '@/stores/gateway-logs';
import { useGatewayStore } from '@/stores/gateway';
import { useChannelsStore } from '@/stores/channels';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

type LevelFilter = 'ALL' | 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type GatewayTab = 'logs' | 'events' | 'channels' | 'service' | 'debug';

interface LogsViewProps {
  embedded?: boolean;
}

const RPC_PRESETS = [
  'system-presence',
  'sessions.list',
  'sessions.preview',
  'config.get',
  'config.channels',
  'health',
  'status',
  'channels.status',
];

// ---------- Logs Tab ----------
function LogsPanel({
  embedded,
  onOpenDir,
}: {
  embedded?: boolean;
  onOpenDir: () => void;
}) {
  const {
    logs,
    addStreamLog,
    fetchSystemLogs,
    clearLogs,
    systemLogsLoading,
    systemLogsError,
  } = useGatewayLogsStore();
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [search, setSearch] = useState('');
  const [autoFollow, setAutoFollow] = useState(true);
  const [parseJson, setParseJson] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetchSystemLogs(200);
  }, [fetchSystemLogs]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc?.on) return;
    const unsub = ipc.on(
      'app:gateway-log',
      (payload: { time?: string; level?: string; agent?: string; message?: string }) => {
        addStreamLog({
          time: payload.time ?? new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: payload.level ?? 'DEBUG',
          agent: payload.agent ?? 'Gateway',
          message: payload.message ?? '',
        });
      },
    );
    return unsub;
  }, [addStreamLog]);

  useEffect(() => {
    if (autoFollow && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoFollow]);

  const filteredLogs = logs
    .filter((l) => levelFilter === 'ALL' || l.level === levelFilter)
    .filter((l) => !search || l.message.toLowerCase().includes(search.toLowerCase()));

  const levelFilters: { value: LevelFilter; label: string }[] = [
    { value: 'ALL', label: '全部' },
    { value: 'ERROR', label: '错误' },
    { value: 'WARN', label: '警告' },
    { value: 'INFO', label: '信息' },
    { value: 'DEBUG', label: '调试' },
  ];

  const tryParseJson = (msg: string): string | null => {
    if (!parseJson) return null;
    const m = msg.trim();
    if ((m.startsWith('{') && m.endsWith('}')) || (m.startsWith('[') && m.endsWith(']'))) {
      try {
        return JSON.stringify(JSON.parse(m), null, 2);
      } catch {
        return null;
      }
    }
    return null;
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex flex-wrap items-center gap-2 mb-3 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="搜索日志..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/50 outline-none"
          />
        </div>
        {levelFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setLevelFilter(f.value)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
              levelFilter === f.value ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5'
            )}
          >
            {f.label}
          </button>
        ))}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={autoFollow}
            onChange={(e) => setAutoFollow(e.target.checked)}
            className="rounded"
          />
          自动跟随
        </label>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <input
            type="checkbox"
            checked={parseJson}
            onChange={(e) => setParseJson(e.target.checked)}
            className="rounded"
          />
          JSON 解析
        </label>
        <button
          onClick={onOpenDir}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-white/5"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          打开目录
        </button>
        <button
          onClick={clearLogs}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
          清空
        </button>
      </div>
      {systemLogsError && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
          {systemLogsError}
        </div>
      )}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-xl border border-amber-500/30 bg-[#1e293b] p-4 font-mono text-xs min-h-[200px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center">
            {systemLogsLoading
              ? '正在加载...'
              : levelFilter !== 'ALL' || search
                ? '无匹配日志'
                : '暂无日志。点击刷新或发送消息后查看。'}
          </div>
        ) : (
          filteredLogs.map((log, index) => {
            const parsed = tryParseJson(log.message);
            return (
              <div
                key={`${log.source}-${index}`}
                className="flex items-baseline gap-2 py-1 hover:bg-white/5 rounded px-1 -mx-1"
              >
                <span className="text-muted-foreground/70 min-w-[70px] shrink-0">{log.time}</span>
                <span
                  className={cn(
                    'min-w-[52px] font-medium shrink-0',
                    log.level === 'ERROR' && 'text-red-400',
                    log.level === 'WARN' && 'text-amber-400',
                    log.level === 'INFO' && 'text-blue-400',
                    log.level === 'DEBUG' && 'text-muted-foreground/70'
                  )}
                >
                  [{log.level}]
                </span>
                <span
                  className={cn(
                    'min-w-[80px] shrink-0',
                    log.source === 'streaming' ? 'text-cyan-400' : 'text-emerald-400'
                  )}
                >
                  [{log.agent}]
                </span>
                <span className="text-slate-200 flex-1 break-all">
                  {parsed ? (
                    <pre className="whitespace-pre-wrap text-[11px] text-emerald-400/90">{parsed}</pre>
                  ) : (
                    log.message
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------- Events Tab ----------
interface EventItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp?: string;
  source?: 'alert' | 'log';
}

function EventsPanel() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const [alertsRes, abnormalRes] = await Promise.all([
        hostApiFetch<{ alerts?: EventItem[] }>('/api/alerts').catch(() => ({})),
        hostApiFetch<{ events?: EventItem[] }>('/api/logs/abnormal?limit=50').catch(() => ({})),
      ]);
      const alerts = (alertsRes?.alerts ?? []).map((a) => ({ ...a, source: 'alert' as const }));
      const abnormal = (abnormalRes?.events ?? []).map((e) => ({
        ...e,
        id: e.id ?? `log-${Date.now()}-${Math.random()}`,
        source: 'log' as const,
      }));
      const merged = [...alerts, ...abnormal].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return tb - ta;
      });
      setEvents(merged);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filtered =
    riskFilter === 'all' ? events : events.filter((e) => e.level === riskFilter);

  const toggleExpand = (i: number) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={() => void fetchEvents()}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          刷新
        </button>
        {(['all', 'critical', 'warning', 'info'] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRiskFilter(r)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-xs font-medium',
              riskFilter === r ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5'
            )}
          >
            {r === 'all' ? '全部' : r === 'critical' ? '严重' : r === 'warning' ? '警告' : '信息'}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {loading ? '加载中...' : '暂无事件'}
          </div>
        ) : (
          filtered.map((ev, i) => {
            const isExpanded = expanded.has(i);
            const levelColor =
              ev.level === 'critical'
                ? 'border-red-500/30 bg-red-500/5'
                : ev.level === 'warning'
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-blue-500/20 bg-blue-500/5';
            return (
              <div
                key={ev.id}
                className={cn('rounded-xl border p-3', levelColor)}
              >
                <button
                  onClick={() => toggleExpand(i)}
                  className="w-full flex items-start gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-foreground">{ev.title}</span>
                    {!isExpanded && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{ev.message}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {ev.source === 'alert' ? '告警' : '日志'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="mt-2 pl-6 text-xs text-muted-foreground font-mono break-all">
                    {ev.message}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ---------- Channels Tab ----------
function ChannelsPanel() {
  const { channels, loading, fetchChannels } = useChannelsStore();

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  const statusColor = (s: string) =>
    s === 'connected'
      ? 'text-emerald-400'
      : s === 'error'
        ? 'text-red-400'
        : s === 'connecting'
          ? 'text-amber-400'
          : 'text-slate-400';

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <button
          onClick={() => void fetchChannels()}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-white/5 disabled:opacity-50"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
          刷新
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2">
        {channels.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            {loading ? '加载中...' : '暂无渠道'}
          </div>
        ) : (
          channels.map((ch) => (
            <div
              key={ch.id}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-foreground">{ch.name || ch.type}</span>
                  <span className="ml-2 text-xs text-muted-foreground">({ch.type})</span>
                </div>
                <span className={cn('text-xs font-medium', statusColor(ch.status))}>
                  {ch.status === 'connected'
                    ? '已连接'
                    : ch.status === 'error'
                      ? '错误'
                      : ch.status === 'connecting'
                        ? '连接中'
                        : '未连接'}
                </span>
              </div>
              {ch.error && (
                <p className="mt-2 text-xs text-red-400">{ch.error}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ---------- Service Tab ----------
function ServicePanel() {
  const { status, health, start, stop, restart, checkHealth } = useGatewayStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const state = status?.state ?? 'unknown';
  const isRunning = state === 'running' || state === 'connected';

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(action);
    try {
      if (action === 'start') await start();
      else if (action === 'stop') await stop();
      else await restart();
      await checkHealth();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-3">网关状态</h3>
        <div className="flex items-center gap-3 mb-4">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
            )}
          />
          <span className="text-sm font-medium">
            {isRunning ? '运行中' : state === 'starting' ? '启动中...' : state === 'stopped' ? '已停止' : state}
          </span>
        </div>
        {health?.uptime != null && (
          <p className="text-xs text-muted-foreground">运行时长: {Math.floor(health.uptime / 60)} 分钟</p>
        )}
        {health?.error && (
          <p className="text-xs text-red-400 mt-1">{health.error}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => void handleAction('start')}
          disabled={isRunning || actionLoading !== null}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Play className="w-4 h-4" />
          {actionLoading === 'start' ? '启动中...' : '启动'}
        </button>
        <button
          onClick={() => void handleAction('stop')}
          disabled={!isRunning || actionLoading !== null}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Square className="w-4 h-4" />
          {actionLoading === 'stop' ? '停止中...' : '停止'}
        </button>
        <button
          onClick={() => void handleAction('restart')}
          disabled={!isRunning || actionLoading !== null}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCw className={cn('w-4 h-4', actionLoading === 'restart' && 'animate-spin')} />
          {actionLoading === 'restart' ? '重启中...' : '重启'}
        </button>
      </div>
    </div>
  );
}

// ---------- Debug Tab ----------
function DebugPanel() {
  const { rpc, checkHealth } = useGatewayStore();
  const [rpcMethod, setRpcMethod] = useState('');
  const [rpcParams, setRpcParams] = useState('{}');
  const [rpcResult, setRpcResult] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [rpcLoading, setRpcLoading] = useState(false);
  const [rpcHistory, setRpcHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('gw_rpcHistory') ?? '[]');
    } catch {
      return [];
    }
  });
  const [debugStatus, setDebugStatus] = useState<unknown>(null);
  const [debugHealth, setDebugHealth] = useState<unknown>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  const handleRpcCall = async () => {
    if (!rpcMethod.trim()) return;
    setRpcLoading(true);
    setRpcResult(null);
    setRpcError(null);
    try {
      let params: unknown = {};
      try {
        params = rpcParams.trim() ? JSON.parse(rpcParams) : {};
      } catch {
        setRpcError('RPC 参数格式错误，需为合法 JSON');
        return;
      }
      const result = await rpc(rpcMethod, params);
      setRpcResult(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
      setRpcHistory((h) => [rpcMethod, ...h.filter((m) => m !== rpcMethod)].slice(0, 10));
      try {
        localStorage.setItem('gw_rpcHistory', JSON.stringify([rpcMethod, ...rpcHistory.filter((m) => m !== rpcMethod)].slice(0, 10)));
      } catch {
        /* ignore */
      }
    } catch (err) {
      setRpcError(String(err));
    } finally {
      setRpcLoading(false);
    }
  };

  const fetchDebugData = async () => {
    setDebugLoading(true);
    try {
      const [status, health] = await Promise.all([
        rpc('status').catch(() => null),
        checkHealth().catch(() => null),
      ]);
      setDebugStatus(status);
      setDebugHealth(health);
    } finally {
      setDebugLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4">
      {/* RPC */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
          <Bug className="w-4 h-4 text-primary" />
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">RPC 调用</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1 block">方法</label>
            <div className="flex gap-2">
              <input
                value={rpcMethod}
                onChange={(e) => setRpcMethod(e.target.value)}
                placeholder="system-presence"
                className="flex-1 h-8 px-3 bg-white/5 border border-white/5 rounded-lg text-xs font-mono text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && void handleRpcCall()}
              />
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v) setRpcMethod(v);
                }}
                className="h-8 px-2 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/50"
              >
                <option value="">预设 ▼</option>
                {RPC_PRESETS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                {rpcHistory.filter((h) => !RPC_PRESETS.includes(h)).map((m) => (
                  <option key={m} value={m}>
                    ↺ {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1 block">参数 (JSON)</label>
            <textarea
              value={rpcParams}
              onChange={(e) => setRpcParams(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-xs font-mono text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none resize-none"
            />
          </div>
          <button
            onClick={() => void handleRpcCall()}
            disabled={rpcLoading || !rpcMethod.trim()}
            className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40"
          >
            {rpcLoading ? '调用中...' : '调用'}
          </button>
          {rpcError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <pre className="text-[10px] text-red-400 font-mono whitespace-pre-wrap">{rpcError}</pre>
            </div>
          )}
          {rpcResult && (
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <pre className="text-[10px] text-emerald-400/80 font-mono whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto">
                {rpcResult}
              </pre>
            </div>
          )}
        </div>
      </div>
      {/* Snapshots */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-xs font-bold text-white/80 uppercase tracking-wider">状态快照</h3>
          <button
            onClick={() => void fetchDebugData()}
            disabled={debugLoading}
            className="text-white/30 hover:text-white text-[10px] font-bold flex items-center gap-1"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', debugLoading && 'animate-spin')} />
            刷新
          </button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1.5">status</p>
            <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap break-all bg-white/[0.02] rounded-lg p-3 max-h-[180px] overflow-y-auto border border-white/5">
              {debugStatus ? JSON.stringify(debugStatus, null, 2) : '{}'}
            </pre>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1.5">health</p>
            <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap break-all bg-white/[0.02] rounded-lg p-3 max-h-[180px] overflow-y-auto border border-white/5">
              {debugHealth ? JSON.stringify(debugHealth, null, 2) : '{}'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main View ----------
const TABS: { id: GatewayTab; label: string; icon: React.ReactNode }[] = [
  { id: 'logs', label: '日志', icon: <FileText className="w-4 h-4" /> },
  { id: 'events', label: '事件', icon: <Activity className="w-4 h-4" /> },
  { id: 'channels', label: '渠道', icon: <Radio className="w-4 h-4" /> },
  { id: 'service', label: '服务', icon: <Settings className="w-4 h-4" /> },
  { id: 'debug', label: '调试', icon: <Bug className="w-4 h-4" /> },
];

const LogsView: React.FC<LogsViewProps> = ({ embedded }) => {
  const [activeTab, setActiveTab] = useState<GatewayTab>('logs');
  const [refreshLoading, setRefreshLoading] = useState(false);
  const { fetchSystemLogs, systemLogsLoading } = useGatewayLogsStore();

  const handleRefresh = useCallback(async () => {
    setRefreshLoading(true);
    try {
      await fetchSystemLogs(200);
    } finally {
      setRefreshLoading(false);
    }
  }, [fetchSystemLogs]);

  const handleOpenDir = useCallback(async () => {
    try {
      const { dir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (dir) await invokeIpc('shell:showItemInFolder', dir);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        embedded ? 'h-full min-h-0 -m-4' : '-m-6 h-[calc(100vh-2.5rem)]'
      )}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 min-h-0">
        <PageHeader
          title="Gateway 监控"
          subtitle="日志、事件、渠道、服务控制、RPC 调试"
          stats={[]}
          onRefresh={embedded ? undefined : handleRefresh}
          refreshing={refreshLoading}
          statsBorderColor="border-amber-500/40"
        />

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-4 shrink-0 border-b border-white/10">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors -mb-px',
                activeTab === tab.id
                  ? 'bg-[#1e293b] text-foreground border-t-2 border-x-2 border-amber-500/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 日志 Tab 额外刷新 */}
        {activeTab === 'logs' && (
          <div className="flex items-center gap-2 mb-2 shrink-0">
            <button
              onClick={() => void fetchSystemLogs(200)}
              disabled={systemLogsLoading}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:bg-white/5"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', systemLogsLoading && 'animate-spin')} />
              刷新日志
            </button>
          </div>
        )}

        {/* Panel content */}
        <div className="flex-1 flex flex-col min-h-0">
          {activeTab === 'logs' && <LogsPanel embedded={embedded} onOpenDir={handleOpenDir} />}
          {activeTab === 'events' && <EventsPanel />}
          {activeTab === 'channels' && <ChannelsPanel />}
          {activeTab === 'service' && <ServicePanel />}
          {activeTab === 'debug' && <DebugPanel />}
        </div>
      </div>
    </div>
  );
};

export { LogsView };
export default LogsView;
