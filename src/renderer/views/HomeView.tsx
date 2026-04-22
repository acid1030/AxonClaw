/**
 * HomeView — 完全对齐 aireport-home 设计稿
 * 布局：问候行 + 快速操作卡(4) + KPI+sparkline(4) + 会话卡片(tabs+grid) + 双列底部 + 右侧助手栏
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useSkillsStore } from '@/stores/skills';
import { useChannelsStore } from '@/stores/channels';
import { useCronStore } from '@/stores/cron';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

/* ─── types ─────────────────────────────────────────────────── */
interface HomeViewProps {
  onNavigateTo?: (viewId: string) => void;
}
interface SessionInfo {
  sessionKey: string;
  label?: string;
  lastMessage?: string;
  lastActivity?: number;
  coverVariant?: number;
}
interface UsageCost {
  totalCost?: number;
  todayCost?: number;
  inputTokens?: number;
  outputTokens?: number;
  trend?: Array<{ date: string; cost: number; tokens?: number }>;
}

interface HostInfo {
  hostname?: string;
  openclawVersion?: string;
  gatewayUptime?: number;
  connectionsCount?: number;
}

interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

interface OpenClawDoctorResult {
  mode: 'diagnose' | 'fix';
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  durationMs: number;
  timedOut?: boolean;
  error?: string;
}

/* ─── helpers ────────────────────────────────────────────────── */
function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function syntheticSpark(seed: number, len = 12): number[] {
  const out: number[] = [];
  let v = 0.35 + (seed % 17) / 30;
  for (let i = 0; i < len; i++) {
    v += Math.sin(i * 0.8 + seed * 0.3) * 0.12 + 0.04;
    out.push(Math.max(0.05, Math.min(1, v)));
  }
  return out;
}

function timeAgo(ts?: number): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

/* ─── Inline sparkline SVG ───────────────────────────────────── */
const SparkLine: React.FC<{
  data: number[];
  color: string;
  width?: number;
  height?: number;
  fill?: boolean;
}> = ({ data, color, width = 120, height = 28, fill = true }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const polyPts = pts.join(' ');
  const fillPts = `0,${height} ${polyPts} ${width},${height}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      {fill && <polyline fill={`${color}22`} stroke="none" points={fillPts} />}
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={polyPts} />
    </svg>
  );
};

/* ─── Session cover mini-chart ───────────────────────────────── */
const SessionCover: React.FC<{ variant: number; seed: number }> = ({ variant, seed }) => {
  const colors = [
    ['#5ac8fa', '#0a84ff'],
    ['#b47cff', '#ff375f'],
    ['#30d158', '#64d2ff'],
    ['#ff9f0a', '#ff375f'],
    ['#64d2ff', '#0a84ff'],
    ['#ffd60a', '#ff9f0a'],
  ];
  const [c1] = colors[variant % colors.length];
  const pts = syntheticSpark(seed, 14);
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const range = max - min || 1;
  const W = 300;
  const H = 90;
  const toY = (v: number) => H - ((v - min) / range) * (H - 12) - 4;
  const pathPts = pts.map((v, i) => `${((i / (pts.length - 1)) * W).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const fillPath = `M 0,${H} L ${pathPts.replace(/(\d+\.\d+),(\d+\.\d+)/g, '$1,$2')} L ${W},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.85 }}>
      <defs>
        <linearGradient id={`cg${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={c1} stopOpacity="0.5" />
          <stop offset="1" stopColor={c1} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#cg${seed})`} />
      <polyline fill="none" stroke={c1} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={pathPts} />
      <circle cx={((pts.length - 1) / (pts.length - 1)) * W} cy={toY(pts[pts.length - 1])} r="3" fill={c1} opacity="0.9" />
    </svg>
  );
};

/* ─── Cover gradient bg colors ──────────────────────────────── */
const coverBgs = [
  'linear-gradient(135deg,rgba(10,132,255,.25),rgba(124,140,255,.12))',
  'linear-gradient(135deg,rgba(180,124,255,.3),rgba(255,55,95,.12))',
  'linear-gradient(135deg,rgba(48,209,88,.25),rgba(100,210,255,.12))',
  'linear-gradient(135deg,rgba(255,159,10,.25),rgba(255,55,95,.15))',
  'linear-gradient(135deg,rgba(100,210,255,.22),rgba(10,132,255,.15))',
  'linear-gradient(135deg,rgba(255,214,10,.18),rgba(255,159,10,.22))',
];

/* ─── SVG icons (inline, no external deps) ───────────────────── */
const Ico: React.FC<{ size?: number; stroke?: string; children: React.ReactNode }> = ({
  size = 16,
  stroke = 'currentColor',
  children,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block', flexShrink: 0 }}>
    {children}
  </svg>
);

/* ─── Component ─────────────────────────────────────────────── */
export const HomeView: React.FC<HomeViewProps> = ({ onNavigateTo }) => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const gatewayLastError = useGatewayStore((s) => s.lastError);
  const initGateway = useGatewayStore((s) => s.init);
  const startGateway = useGatewayStore((s) => s.start);
  const stopGateway = useGatewayStore((s) => s.stop);
  const restartGateway = useGatewayStore((s) => s.restart);
  const clearGatewayError = useGatewayStore((s) => s.clearError);
  const setStatus = useGatewayStore((s) => s.setStatus);

  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [usage, setUsage] = useState<UsageCost | null>(null);
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [logAbnormal, setLogAbnormal] = useState<AlertItem[]>([]);
  const [startingGateway, setStartingGateway] = useState(false);
  const [stoppingGateway, setStoppingGateway] = useState(false);
  const [restartingGateway, setRestartingGateway] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [loadingMoreLogs, setLoadingMoreLogs] = useState(false);
  const [runningDoctorFix, setRunningDoctorFix] = useState(false);
  const [logsHasMore, setLogsHasMore] = useState(false);
  const [logsOffsetDays, setLogsOffsetDays] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const skills = useSkillsStore((s) => s.skills);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const channels = useChannelsStore((s) => s.channels);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const cronJobs = useCronStore((s) => s.jobs);
  const fetchCronJobs = useCronStore((s) => s.fetchJobs);
  const loadSessions = useChatStore((s) => s.loadSessions);

  const checkConnection = useCallback(async () => {
    try {
      const r = await invokeIpc<{ success: boolean; port?: number }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      if (r?.success && r?.port) setStatus({ state: 'running', port: r.port });
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, [setStatus]);

  const isOnline =
    connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');

  const fetchSessions = useCallback(async () => {
    setLoadingSessions(true);
    try {
      const result = (await window.electron.ipcRenderer.invoke('sessions.list', { limit: 9 })) as {
        sessions?: Array<{
          sessionKey?: string;
          key?: string;
          label?: string;
          displayName?: string;
          lastMessage?: string;
          updatedAt?: number;
          lastActivity?: number;
        }>;
      };
      if (result?.sessions && Array.isArray(result.sessions)) {
        setSessions(
          result.sessions.map((s, i) => ({
            sessionKey: s.sessionKey ?? s.key ?? '',
            label: s.label ?? s.displayName,
            lastMessage: s.lastMessage?.slice(0, 80),
            lastActivity: s.updatedAt ?? s.lastActivity,
            coverVariant: i % 6,
          }))
        );
      }
    } catch {
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetchUsage = useCallback(async (online: boolean) => {
    if (!online) return;
    try {
      const data = await hostApiFetch<UsageCost>('/api/usage-cost?days=7').catch(() => null);
      setUsage(data ?? null);
    } catch {
      setUsage(null);
    }
  }, []);

  const fetchHostInfo = useCallback(async () => {
    try {
      const data = await hostApiFetch<HostInfo>('/api/host-info', { method: 'GET' });
      if (data && typeof data === 'object') setHostInfo(data);
    } catch {
      setHostInfo(null);
    }
  }, []);

  const fetchAlerts = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ alerts?: AlertItem[] }>('/api/alerts').catch(() => ({}));
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
    } catch {
      setAlerts([]);
    }
  }, []);

  const fetchLogAbnormal = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ events?: AlertItem[] }>('/api/logs/abnormal?limit=8').catch(() => ({}));
      setLogAbnormal(Array.isArray(data.events) ? data.events : []);
    } catch {
      setLogAbnormal([]);
    }
  }, []);

  const extractLineTs = useCallback((line: string): number => {
    if (!line) return 0;
    const m = line.match(/"time"\s*:\s*"([^"]+)"/);
    if (m?.[1]) {
      const ts = Date.parse(m[1]);
      if (!Number.isNaN(ts)) return ts;
    }
    const m2 = line.match(/\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)\b/);
    if (m2?.[1]) {
      const ts = Date.parse(m2[1]);
      if (!Number.isNaN(ts)) return ts;
    }
    return 0;
  }, []);

  const classifyLogLevel = useCallback((line: string): 'error' | 'warn' | 'info' | 'debug' | 'meta' => {
    const lower = String(line || '').toLowerCase();
    if (!lower) return 'meta';
    if (lower.startsWith('[') && lower.endsWith('.log]')) return 'meta';
    if (/\b(fatal|panic|critical|error|err)\b/.test(lower)) return 'error';
    if (/\b(warn|warning|failed|exception|timeout)\b/.test(lower)) return 'warn';
    if (/\b(debug|trace)\b/.test(lower)) return 'debug';
    return 'info';
  }, []);

  const loadLogsPage = useCallback(async (offsetDays: number, append: boolean) => {
    if (!append) setLoadingLogs(true);
    else setLoadingMoreLogs(true);
    try {
      const data = await hostApiFetch<{
        content?: string;
        hasMore?: boolean;
        nextOffsetDays?: number | null;
      }>(`/api/logs?days=2&offsetDays=${offsetDays}&tailLines=350`);
      const nextLines = String(data?.content || '')
        .split(/\r?\n/)
        .filter((line) => line.length > 0);
      const sortedNextLines = [...nextLines].sort((a, b) => extractLineTs(b) - extractLineTs(a));
      setLogLines((prev) => (
        append ? [...prev, '--- older logs ---', ...sortedNextLines] : sortedNextLines
      ));
      setLogsHasMore(Boolean(data?.hasMore));
      setLogsOffsetDays(Number.isFinite(data?.nextOffsetDays as number) ? Number(data?.nextOffsetDays) : offsetDays + 2);
    } catch {
      if (!append) setLogLines(['加载日志失败']);
    } finally {
      if (!append) setLoadingLogs(false);
      else setLoadingMoreLogs(false);
    }
  }, [extractLineTs]);

  const handleShowLogs = useCallback(async () => {
    setShowLogsModal(true);
    setLogLines([]);
    setLogsOffsetDays(0);
    setLogsHasMore(false);
    await loadLogsPage(0, false);
  }, [loadLogsPage]);

  const handleOpenLogDir = useCallback(async () => {
    try {
      const { dir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (dir) await invokeIpc('shell:showItemInFolder', dir);
    } catch {
      // ignore
    }
  }, []);

  const handleDoctorFix = useCallback(async () => {
    setRunningDoctorFix(true);
    try {
      const result = await hostApiFetch<OpenClawDoctorResult>('/api/app/openclaw-doctor', {
        method: 'POST',
        body: JSON.stringify({ mode: 'fix' }),
      });
      const header = `[Doctor] fix ${result.success ? 'SUCCESS' : 'FAILED'} exit=${result.exitCode ?? 'null'} duration=${result.durationMs}ms`;
      const out = String(result.stdout || '').trim();
      const err = String(result.stderr || '').trim();
      const lines: string[] = [header];
      if (result.error) lines.push(`[Doctor] error: ${result.error}`);
      if (out) lines.push(...out.split(/\r?\n/));
      if (err) lines.push(...err.split(/\r?\n/));
      if (!out && !err && !result.error) lines.push('[Doctor] no output');
      setLogLines((prev) => [header, ...lines.slice(1), '---', ...prev]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setLogLines((prev) => [`[Doctor] fix FAILED: ${msg}`, '---', ...prev]);
    } finally {
      setRunningDoctorFix(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    const online = await checkConnection();
    void fetchHostInfo();
    void fetchAlerts();
    void fetchLogAbnormal();
    void fetchUsage(online);
    if (online) {
      loadSessions().catch(console.error);
      void fetchSessions();
      void fetchAgents();
      void fetchSkills();
      void fetchChannels();
      void fetchCronJobs();
    }
  }, [checkConnection, fetchAgents, fetchAlerts, fetchChannels, fetchCronJobs, fetchHostInfo, fetchLogAbnormal, fetchSessions, fetchSkills, fetchUsage, loadSessions]);

  const handleStartGateway = useCallback(async () => {
    setStartingGateway(true);
    clearGatewayError();
    try {
      await startGateway();
      await checkConnection();
      void refreshAll();
    } finally {
      setStartingGateway(false);
    }
  }, [checkConnection, clearGatewayError, refreshAll, startGateway]);

  const handleStopGateway = useCallback(async () => {
    setStoppingGateway(true);
    clearGatewayError();
    try {
      await stopGateway();
      await checkConnection();
      void refreshAll();
    } finally {
      setStoppingGateway(false);
    }
  }, [checkConnection, clearGatewayError, refreshAll, stopGateway]);

  const handleRestartGateway = useCallback(async () => {
    setRestartingGateway(true);
    clearGatewayError();
    try {
      await restartGateway();
      await checkConnection();
      void refreshAll();
    } finally {
      setRestartingGateway(false);
    }
  }, [checkConnection, clearGatewayError, refreshAll, restartGateway]);

  useEffect(() => { initGateway().catch(console.error); }, [initGateway]);
  useEffect(() => {
    void checkConnection();
    const id = setInterval(() => void checkConnection(), 20000);
    return () => clearInterval(id);
  }, [checkConnection]);
  useEffect(() => { void refreshAll(); }, [refreshAll]);

  /* KPI data */
  const trend = usage?.trend ?? [];
  const costSpark = useMemo(() => {
    const costs = trend.map((x) => x.cost);
    return costs.length > 0 ? costs : syntheticSpark(7);
  }, [trend]);
  const todayTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  const safeChannels = Array.isArray(channels) ? channels : [];
  const activeChannels = safeChannels.filter((c) => c.status === 'connected').length;
  const safeAgents = Array.isArray(agents) ? agents : [];
  const safeSkills = Array.isArray(skills) ? skills : [];
  const eligibleSkills = safeSkills.filter((s) => s.enabled || s.isCore).length;

  const kpis = useMemo(() => [
    {
      key: 'tokens', label: '今日 Token',
      value: todayTokens > 0 ? fmtTokens(todayTokens) : '—',
      trend: usage?.todayCost != null ? `≈ $${Number(usage.todayCost).toFixed(2)}` : undefined,
      trendUp: true, spark: costSpark, color: '#0a84ff',
      onClick: () => onNavigateTo?.('usage'),
    },
    {
      key: 'channels', label: '活跃通道',
      value: `${activeChannels}/${Math.max(safeChannels.length, 1)}`,
      trend: `${activeChannels} 在线`, trendUp: activeChannels > 0,
      spark: syntheticSpark(activeChannels * 3 + 5), color: '#30d158',
      onClick: () => onNavigateTo?.('channel'),
    },
    {
      key: 'agents', label: 'Agent',
      value: String(safeAgents.length),
      trend: `共 ${cronJobs.length} 任务`, trendUp: true,
      spark: syntheticSpark(safeAgents.length + 11), color: '#b47cff',
      onClick: () => onNavigateTo?.('agent'),
    },
    {
      key: 'skills', label: '技能',
      value: safeSkills.length ? `${eligibleSkills}/${safeSkills.length}` : '0',
      trend: eligibleSkills > 0 ? `${eligibleSkills} 已启用` : '未配置',
      trendUp: eligibleSkills > 0,
      spark: syntheticSpark(safeSkills.length + cronJobs.length + 3), color: '#ff9f0a',
      onClick: () => onNavigateTo?.('skill'),
    },
  ], [activeChannels, costSpark, cronJobs.length, eligibleSkills, onNavigateTo, safeAgents.length, safeChannels.length, safeSkills.length, todayTokens, usage?.todayCost]);

  /* Quick actions */
  const quickActions = [
    {
      title: '新建对话', desc: '继续上次上下文或开启全新会话',
      bg: 'linear-gradient(135deg,rgba(124,140,255,.18),rgba(180,124,255,.08))',
      border: 'rgba(124,140,255,.45)', iconBg: 'linear-gradient(135deg,#bf5af2,#7c5cff)',
      kbd: '⌘ N', featured: true,
      icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
      onClick: () => onNavigateTo?.('chat'),
    },
    {
      title: 'Gateway', desc: '连接状态、启停与网络日志',
      bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
      iconBg: 'linear-gradient(135deg,#5ac8fa,#0a84ff)',
      kbd: '⌘ G',
      icon: <><rect x="1" y="6" width="22" height="12" rx="2" /><path d="M6 12h.01M10 12h.01M14 12h.01" /></>,
      onClick: () => onNavigateTo?.('system-monitor'),
    },
    {
      title: '技能与编排', desc: '技能库、Agent 画布与流程配置',
      bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
      iconBg: 'linear-gradient(135deg,#ff6a9a,#b47cff)',
      kbd: '⌘ S',
      icon: <><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.1z" /></>,
      onClick: () => onNavigateTo?.('skill-config'),
    },
    {
      title: '任务与节点', desc: '调度任务、节点计算与用量报告',
      bg: 'rgba(255,255,255,.04)', border: 'rgba(255,255,255,.08)',
      iconBg: 'linear-gradient(135deg,#30d158,#00b3a4)',
      kbd: '⌘ T',
      icon: <><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></>,
      onClick: () => onNavigateTo?.('tasks'),
    },
  ];

  /* Gateway health rows */
  const gwRows = useMemo(() => {
    const base = [
      { label: 'Gateway · ' + (gatewayStatus.port ? `127.0.0.1:${gatewayStatus.port}` : '未启动'), status: isOnline ? 'ok' : 'err', sub: isOnline ? '连接正常' : '未运行' },
      { label: `通道 · ${activeChannels}/${Math.max(safeChannels.length, 1)} 在线`, status: activeChannels > 0 ? 'ok' : 'warn', sub: `${activeChannels} 活跃` },
      { label: `Agent · ${safeAgents.length} 已配置`, status: safeAgents.length > 0 ? 'ok' : 'warn', sub: safeAgents.length > 0 ? '就绪' : '未配置' },
      { label: `技能 · ${eligibleSkills}/${safeSkills.length}`, status: eligibleSkills > 0 ? 'ok' : 'warn', sub: '已启用' },
      { label: `定时任务 · ${cronJobs.length}`, status: 'ok', sub: '已调度' },
    ];
    return base;
  }, [activeChannels, cronJobs.length, eligibleSkills, gatewayStatus.port, isOnline, safeAgents.length, safeChannels.length, safeSkills.length]);

  const activityFeed = useMemo(() => {
    const abnormalCount = alerts.length + logAbnormal.length;
    return [
      ...(abnormalCount > 0
        ? [{
          color: '#ff9f0a',
          bg: 'linear-gradient(135deg,#ffb340,#ff5e3a)',
          label: '检测到异常事件',
          sub: `共 ${abnormalCount} 条，请在日志弹窗查看详情`,
          time: '刚刚',
        }]
        : []),
      { color: '#b47cff', bg: 'linear-gradient(135deg,#bf5af2,#7c5cff)', label: 'Gateway 状态检查', sub: isOnline ? '连接正常' : '离线', time: '刚刚' },
      { color: '#30d158', bg: 'linear-gradient(135deg,#30d158,#00b3a4)', label: `加载 ${safeAgents.length} 个 Agent`, sub: '来自配置文件', time: '1 分钟前' },
      { color: '#0a84ff', bg: 'linear-gradient(135deg,#5ac8fa,#0a84ff)', label: `${safeChannels.length} 个通道已扫描`, sub: `${activeChannels} 个在线`, time: '2 分钟前' },
      { color: '#ff9f0a', bg: 'linear-gradient(135deg,#ffb340,#ff5e3a)', label: `${safeSkills.length} 个技能已加载`, sub: `${eligibleSkills} 个已启用`, time: '3 分钟前' },
      { color: '#64d2ff', bg: 'linear-gradient(135deg,#64d2ff,#30d158)', label: `${cronJobs.length} 个定时任务`, sub: '调度器初始化', time: '5 分钟前' },
    ].slice(0, 5);
  }, [activeChannels, alerts, cronJobs.length, eligibleSkills, isOnline, logAbnormal, safeAgents.length, safeChannels.length, safeSkills.length]);

  /* Right panel tasks */
  const [doneMap, setDoneMap] = useState<Record<number, boolean>>({});
  const toggleDone = (i: number) => setDoneMap((m) => ({ ...m, [i]: !m[i] }));
  const tasks = [
    { label: '验证 Gateway 连接', tag: isOnline ? '已完成' : '待处理', done: isOnline },
    { label: '检查通道连接状态', tag: activeChannels > 0 ? '正常' : '14:00', done: activeChannels > 0 },
    { label: '配置第一个 Agent', tag: safeAgents.length > 0 ? '完成' : '优先', priority: safeAgents.length === 0 },
    { label: '安装常用技能包', tag: eligibleSkills > 3 ? '完成' : '16:30', done: eligibleSkills > 3 },
    { label: '设置定时任务', tag: cronJobs.length > 0 ? '完成' : '可选', done: cronJobs.length > 0 },
  ];

  /* ─── style variables ─────────────────────────────────────── */
  const S = {
    bg0: '#07070c',
    bg1: '#0d0e14',
    surface: 'rgba(255,255,255,.045)',
    surfaceHi: 'rgba(255,255,255,.08)',
    border: 'rgba(255,255,255,.08)',
    borderStrong: 'rgba(255,255,255,.14)',
    t1: 'rgba(255,255,255,.96)',
    t2: 'rgba(255,255,255,.72)',
    t3: 'rgba(255,255,255,.48)',
    t4: 'rgba(255,255,255,.32)',
    accent: '#7c8cff',
    green: '#30d158',
    blue: '#0a84ff',
    orange: '#ff9f0a',
    pink: '#ff375f',
  } as const;

  const card: React.CSSProperties = {
    borderRadius: 16,
    background: S.surface,
    border: `1px solid ${S.border}`,
    overflow: 'hidden',
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, background: S.bg0, color: S.t1, fontFamily: '-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif', WebkitFontSmoothing: 'antialiased', overflow: 'hidden' }}>

      {/* ── Main scroll area ─────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '22px 24px 36px', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Greeting row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 10 }}>
              工作台
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke={S.orange} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2m-2.5-7.5-1.4 1.4M6.9 17.1l-1.4 1.4m0-13 1.4 1.4m10.6 10.6 1.4 1.4" />
              </svg>
            </h1>
            <div style={{ fontSize: 13, color: S.t2, marginTop: 4 }}>
              {isOnline
                ? <span>Gateway <b style={{ color: S.green }}>已连接</b> · {safeAgents.length} 个 Agent · {safeChannels.length} 个通道</span>
                : <span>Gateway <b style={{ color: '#ff6a8b' }}>未启动</b>，请先启动服务</span>}
            </div>
            <div style={{ fontSize: 12, color: S.t3, marginTop: 6 }}>
              OpenClaw: <b style={{ color: S.t2 }}>{hostInfo?.openclawVersion || '未知'}</b>
              {' · '}
              连接实例: <b style={{ color: S.t2 }}>{hostInfo?.connectionsCount ?? 0}</b>
              {gatewayLastError ? <span style={{ color: '#ff6a8b' }}> · 网关异常（详情请查看日志）</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: S.surface, border: `1px solid ${S.border}`, color: S.t2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isOnline ? S.green : '#ff6a8b', boxShadow: `0 0 8px ${isOnline ? S.green : '#ff6a8b'}`, display: 'inline-block' }} />
              {isOnline ? '服务正常' : '离线状态'}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: S.surface, border: `1px solid ${S.border}`, color: S.t2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0a84ff', boxShadow: '0 0 8px #0a84ff', display: 'inline-block' }} />
              {safeAgents.length} Agent
            </span>
            {cronJobs.length > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: S.surface, border: `1px solid ${S.border}`, color: S.t2 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.orange, boxShadow: `0 0 8px ${S.orange}`, display: 'inline-block' }} />
                {cronJobs.length} 项任务
              </span>
            )}
            {!isOnline ? (
              <button type="button" onClick={() => void handleStartGateway()} disabled={startingGateway} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(48,209,88,.15)', border: `1px solid rgba(48,209,88,.35)`, color: '#9ef0b7', cursor: 'pointer' }}>
                {startingGateway ? '启动中...' : '启动 Gateway'}
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void handleRestartGateway()} disabled={restartingGateway} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,159,10,.14)', border: `1px solid rgba(255,159,10,.35)`, color: '#ffd2a1', cursor: 'pointer' }}>
                  {restartingGateway ? '重启中...' : '重启 Gateway'}
                </button>
                <button type="button" onClick={() => void handleStopGateway()} disabled={stoppingGateway} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: 'rgba(255,55,95,.14)', border: `1px solid rgba(255,55,95,.35)`, color: '#ff9ab5', cursor: 'pointer' }}>
                  {stoppingGateway ? '停止中...' : '停止 Gateway'}
                </button>
              </>
            )}
            <button type="button" onClick={() => void handleShowLogs()} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, padding: '4px 10px', borderRadius: 999, background: S.surface, border: `1px solid ${S.border}`, color: S.t2, cursor: 'pointer' }}>
              查看日志
            </button>
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {quickActions.map((a, i) => (
            <button
              key={i}
              type="button"
              onClick={a.onClick}
              style={{
                position: 'relative', padding: 16, borderRadius: 18, cursor: 'pointer',
                background: a.featured
                  ? `radial-gradient(260px 140px at 100% 0%,rgba(180,124,255,.35),transparent 65%), ${a.bg}`
                  : a.bg,
                border: `1px solid ${a.featured ? 'rgba(124,140,255,.45)' : a.border}`,
                minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: '.18s', textAlign: 'left', color: S.t1, overflow: 'hidden',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.background = a.featured ? `radial-gradient(260px 140px at 100% 0%,rgba(180,124,255,.4),transparent 65%), ${a.bg}` : S.surfaceHi; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.background = a.featured ? `radial-gradient(260px 140px at 100% 0%,rgba(180,124,255,.35),transparent 65%), ${a.bg}` : a.bg; }}
            >
              {a.featured && (
                <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 10, padding: '2px 8px', borderRadius: 999, background: 'linear-gradient(90deg,#7c8cff,#b47cff)', color: '#fff', fontWeight: 600, letterSpacing: '.02em' }}>
                  AI 推荐
                </span>
              )}
              <div style={{ width: 36, height: 36, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: a.iconBg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.22),0 8px 18px -8px rgba(0,0,0,.5)', color: '#fff' }}>
                <Ico size={16}>{a.icon}</Ico>
              </div>
              <div>
                <b style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', display: 'block' }}>{a.title}</b>
                <p style={{ fontSize: 11.5, color: S.t3, margin: '2px 0 0', lineHeight: 1.45 }}>{a.desc}</p>
              </div>
              <span style={{ position: 'absolute', bottom: 12, right: 12, fontSize: 11, color: S.t3, border: `1px solid ${S.border}`, padding: '1px 6px', borderRadius: 4, background: 'rgba(255,255,255,.04)' }}>{a.kbd}</span>
            </button>
          ))}
        </div>

        {/* KPI row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          {kpis.map((k) => (
            <button
              key={k.key}
              type="button"
              onClick={k.onClick}
              style={{ padding: 14, borderRadius: 16, background: S.surface, border: `1px solid ${S.border}`, display: 'flex', flexDirection: 'column', gap: 4, position: 'relative', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', color: S.t1, transition: '.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = S.borderStrong)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = S.border)}
            >
              <span style={{ position: 'absolute', inset: 0, background: 'radial-gradient(240px 100px at 0% 0%,rgba(124,140,255,.1),transparent 60%)', pointerEvents: 'none' }} />
              <span style={{ fontSize: 11, color: S.t3, letterSpacing: '.05em', textTransform: 'uppercase' }}>{k.label}</span>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: k.color }}>{k.value}</span>
              {k.trend && (
                <span style={{ fontSize: 11, color: k.trendUp ? S.green : '#ff6a8b' }}>
                  {k.trendUp ? '↑' : '↓'} {k.trend}
                </span>
              )}
              <div style={{ marginTop: 2 }}>
                <SparkLine data={k.spark} color={k.color} width={120} height={26} />
              </div>
            </button>
          ))}
        </div>

        {/* Sessions section */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '4px 0 10px' }}>
          <div style={{ display: 'flex', gap: 2, padding: 4, borderRadius: 10, background: S.surface, border: `1px solid ${S.border}`, width: 'fit-content' }}>
            {['最近会话', '收藏', '全部'].map((tab, i) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(i)}
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 12.5, cursor: 'pointer', fontWeight: 500, transition: '.15s', border: 'none',
                  background: activeTab === i ? S.surfaceHi : 'transparent',
                  color: activeTab === i ? '#fff' : S.t2,
                  boxShadow: activeTab === i ? 'inset 0 1px 0 rgba(255,255,255,.08),0 2px 6px rgba(0,0,0,.35)' : 'none',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => void refreshAll()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${S.border}`, background: S.surface, color: S.t1 }}
            >
              <Ico size={14}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></Ico>
              刷新
            </button>
            <button
              type="button"
              onClick={() => onNavigateTo?.('chat')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 10, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', background: 'linear-gradient(180deg,#7c8cff,#5e6dff)', border: '1px solid rgba(124,140,255,.6)', color: '#fff', boxShadow: '0 10px 24px -10px rgba(124,140,255,.7),inset 0 1px 0 rgba(255,255,255,.25)' }}
            >
              <Ico size={14} stroke="#fff"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Ico>
              新对话
            </button>
          </div>
        </div>

        {/* Session cards grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
          {loadingSessions && !sessions.length ? (
            <div style={{ gridColumn: '1/-1', borderRadius: 16, border: `1px solid ${S.border}`, background: S.surface, padding: '32px', textAlign: 'center', color: S.t3, fontSize: 13 }}>
              加载中…
            </div>
          ) : sessions.length === 0 ? (
            <div style={{ gridColumn: '1/-1', borderRadius: 16, border: `1px dashed ${S.border}`, background: S.surface, padding: '32px', textAlign: 'center', color: S.t3, fontSize: 13 }}>
              暂无会话 · 点击「新对话」开始
            </div>
          ) : (
            sessions.map((s, i) => (
              <button
                key={s.sessionKey}
                type="button"
                onClick={() => onNavigateTo?.('chat')}
                style={{ borderRadius: 16, background: S.surface, border: `1px solid ${S.border}`, overflow: 'hidden', cursor: 'pointer', transition: '.18s', display: 'flex', flexDirection: 'column', textAlign: 'left', color: S.t1 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLButtonElement).style.borderColor = S.borderStrong; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'none'; (e.currentTarget as HTMLButtonElement).style.borderColor = S.border; }}
              >
                {/* Cover */}
                <div style={{ height: 100, position: 'relative', overflow: 'hidden', background: coverBgs[i % 6], borderBottom: `1px solid ${S.border}` }}>
                  <SessionCover variant={i % 6} seed={i * 7 + 3} />
                  <span style={{ position: 'absolute', top: 10, left: 10, fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: 'rgba(0,0,0,.45)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,.15)' }}>
                    对话
                  </span>
                  <span style={{ position: 'absolute', top: 10, right: 10, fontSize: 11, color: S.t3 }}>
                    {timeAgo(s.lastActivity)}
                  </span>
                </div>
                {/* Body */}
                <div style={{ padding: '12px 14px 14px', display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {s.label || '未命名会话'}
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: S.green, boxShadow: `0 0 8px ${S.green}`, display: 'inline-block', flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: S.t3, lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {s.lastMessage || '—'}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Two-col bottom */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12, marginTop: 4 }}>
          {/* Gateway health */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>服务健康</h3>
                <div style={{ fontSize: 11.5, color: S.t3, marginTop: 1 }}>{isOnline ? '所有服务正常' : '需要关注'}</div>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTo?.('system-monitor')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 8, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${S.border}`, background: 'transparent', color: S.t2 }}
              >
                详情
                <Ico size={14}><path d="m9 6 6 6-6 6" /></Ico>
              </button>
            </div>
            {gwRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 6px', borderRadius: 10, borderTop: i > 0 ? `1px dashed ${S.border}` : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, fontSize: 10, fontWeight: 700,
                  background: row.status === 'ok' ? 'linear-gradient(135deg,#30d158,#00b3a4)' : row.status === 'warn' ? 'linear-gradient(135deg,#ff9f0a,#ff5e3a)' : 'linear-gradient(135deg,#ff6a6a,#ff375f)' }}>
                  {row.status === 'ok' ? (
                    <Ico size={14} stroke="#fff"><path d="M20 6 9 17l-5-5" /></Ico>
                  ) : (
                    <Ico size={14} stroke="#fff"><circle cx="12" cy="12" r="10" /><path d="M12 8v5M12 16h.01" /></Ico>
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.label}</b>
                  <div style={{ fontSize: 11, color: S.t3, marginTop: 1 }}>{row.sub}</div>
                </div>
                <span style={{ fontSize: 11.5, color: row.status === 'ok' ? '#7ee391' : row.status === 'warn' ? '#ffc47a' : '#ff6a8b', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {row.status === 'ok' ? '● 正常' : row.status === 'warn' ? '⚠ 注意' : '● 异常'}
                </span>
              </div>
            ))}
          </div>

          {/* Activity feed */}
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.01em' }}>系统动态</h3>
                <div style={{ fontSize: 11.5, color: S.t3, marginTop: 1 }}>最新 {activityFeed.length} 条</div>
              </div>
            </div>
            <div>
              {activityFeed.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', fontSize: 12.5, color: S.t2, borderTop: i > 0 ? `1px dashed ${S.border}` : 'none' }}>
                  <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: f.bg, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.2)' }}>
                    <Ico size={12} stroke="#fff"><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.1z" /></Ico>
                  </div>
                  <div>
                    <span style={{ color: S.t1, fontWeight: 500 }}>{f.label}</span>
                    <span style={{ color: S.t2 }}> · {f.sub}</span>
                    <div style={{ color: S.t4, fontSize: 11, marginTop: 2 }}>{f.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Right inspector panel ────────────────────────────── */}
      <aside style={{ width: 300, flexShrink: 0, background: 'rgba(10,10,14,.55)', backdropFilter: 'blur(28px) saturate(160%)', borderLeft: `1px solid ${S.border}`, overflowY: 'auto', padding: '18px 16px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Section: AI 助手 */}
        <div style={{ fontSize: 11, color: S.t3, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, margin: '6px 2px 2px' }}>AI 助手 · Opus</div>
        <div style={{ padding: 14, borderRadius: 14, background: 'rgba(255,255,255,.035)', border: `1px solid ${S.border}` }}>
          <div style={{ display: 'flex', gap: 10, padding: 12, borderRadius: 12, background: 'linear-gradient(135deg,rgba(124,140,255,.12),rgba(180,124,255,.08))', border: '1px solid rgba(124,140,255,.3)' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#7c8cff,#b47cff)', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <Ico size={12} stroke="#fff"><path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.1z" /></Ico>
            </div>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55, color: S.t1 }}>
              {isOnline
                ? <>Gateway 已就绪，检测到 <b>{safeAgents.length}</b> 个 Agent、<b>{activeChannels}</b> 个活跃通道。要我帮你分析用量或生成报告吗？</>
                : <>Gateway 尚未启动。先前往 <b>Gateway</b> 面板启动服务，再使用自动化与通道功能。</>}
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
            {[
              { label: '查看 Gateway 日志', icon: <><path d="M3 3v18h18"/><path d="M7 15l4-4 4 3 5-7"/></> },
              { label: isOnline ? '生成本周用量摘要' : '启动 Gateway 服务', icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
              { label: '检查技能启用状态', icon: <path d="M12 2l2.4 4.9L20 8l-4 3.9.9 5.6L12 14.8 7.1 17.5 8 11.9 4 8l5.6-1.1z"/> },
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onNavigateTo?.(i === 0 ? 'system-monitor' : i === 1 ? (isOnline ? 'usage' : 'system-monitor') : 'skill-config')}
                style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 9, background: S.surface, border: `1px solid ${S.border}`, color: S.t2, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = S.surfaceHi; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = S.surface; (e.currentTarget as HTMLButtonElement).style.color = S.t2; }}
              >
                <Ico size={14} stroke={S.accent}>{sug.icon}</Ico>
                {sug.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section: 任务清单 */}
        <div style={{ fontSize: 11, color: S.t3, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, margin: '6px 2px 2px' }}>配置进度</div>
        <div style={{ padding: '4px 0', borderRadius: 14, background: 'rgba(255,255,255,.035)', border: `1px solid ${S.border}` }}>
          {tasks.map((tk, i) => {
            const done = tk.done || doneMap[i];
            return (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', fontSize: 12.5, color: S.t2, borderTop: i > 0 ? `1px dashed ${S.border}` : 'none' }}
              >
                <button
                  type="button"
                  onClick={() => toggleDone(i)}
                  style={{ width: 16, height: 16, borderRadius: 5, border: `1.5px solid ${done ? 'transparent' : S.borderStrong}`, flexShrink: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    background: done ? 'linear-gradient(135deg,#7c8cff,#b47cff)' : 'transparent', color: '#fff', padding: 0 }}
                >
                  {done && (
                    <svg viewBox="0 0 24 24" width={10} height={10} fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ color: done ? S.t3 : S.t1, fontWeight: 500, textDecoration: done ? 'line-through' : 'none' }}>{tk.label}</b>
                </div>
                <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 999, color: tk.priority ? '#ff6a8b' : S.t3, border: `1px solid ${tk.priority ? 'rgba(255,106,139,.35)' : S.border}`, background: 'rgba(255,255,255,.03)', flexShrink: 0 }}>
                  {tk.tag}
                </span>
              </div>
            );
          })}
        </div>

        {/* Section: 快速提示 */}
        <div style={{ fontSize: 11, color: S.t3, letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 600, margin: '6px 2px 2px' }}>快速提示</div>
        <div>
          {[
            {
              iconBg: 'linear-gradient(135deg,#bf5af2,#7c5cff)',
              icon: <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12.7V18H8v-3.3A7 7 0 0 1 12 2z" />,
              title: '按 ⌘K 唤起命令台', desc: '快速跳转页面、搜索功能',
            },
            {
              iconBg: 'linear-gradient(135deg,#5ac8fa,#0a84ff)',
              icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
              title: '在会话中 @ 触发 Agent', desc: '通过 @AgentName 直接调用',
            },
            {
              iconBg: 'linear-gradient(135deg,#30d158,#00b3a4)',
              icon: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5" /><path d="M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></>,
              title: '绑定通道后可自动触发', desc: '支持 Webhook、定时、事件',
            },
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: 10, borderRadius: 10, background: S.surface, border: `1px solid ${S.border}`, marginTop: i > 0 ? 8 : 0 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', flexShrink: 0, background: tip.iconBg }}>
                <Ico size={12} stroke="#fff">{tip.icon}</Ico>
              </div>
              <div>
                <b style={{ fontSize: 12, fontWeight: 600, color: S.t1 }}>{tip.title}</b>
                <p style={{ margin: '2px 0 0', fontSize: 11.5, lineHeight: 1.45, color: S.t3 }}>{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </aside>

      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">系统日志</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { void loadLogsPage(0, false); }} disabled={loadingLogs} className="rounded-lg">
                <RefreshCw className={loadingLogs ? 'w-4 h-4 mr-1.5 animate-spin' : 'w-4 h-4 mr-1.5'} />
                刷新
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { void handleDoctorFix(); }}
                disabled={runningDoctorFix}
                className="rounded-lg"
              >
                <RefreshCw className={runningDoctorFix ? 'w-4 h-4 mr-1.5 animate-spin' : 'w-4 h-4 mr-1.5'} />
                {runningDoctorFix ? '诊断中...' : '诊断修复'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => { void handleOpenLogDir(); }} className="rounded-lg">
                打开日志目录
              </Button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl border border-slate-600/30 bg-[#0b1220] p-0 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words max-h-[50vh]">
              <pre className="m-0 p-4">
                <code>
                  {loadingLogs && <div className="text-slate-400">加载中...</div>}
                  {!loadingLogs && logLines.length === 0 && <div className="text-slate-400">暂无日志</div>}
                  {!loadingLogs && logLines.map((line, idx) => {
                    const level = classifyLogLevel(line);
                    const cls = level === 'error'
                      ? 'text-red-400'
                      : level === 'warn'
                        ? 'text-amber-300'
                        : level === 'debug'
                          ? 'text-cyan-300'
                          : level === 'meta'
                            ? 'text-violet-300'
                            : 'text-slate-200';
                    return <div key={`${idx}-${line.slice(0, 20)}`} className={cls}>{line}</div>;
                  })}
                </code>
              </pre>
            </div>
            <div className="pt-1 flex justify-center">
              <Button
                variant="outline"
                size="sm"
                disabled={loadingLogs || loadingMoreLogs || !logsHasMore}
                onClick={() => { void loadLogsPage(logsOffsetDays, true); }}
                className="rounded-lg"
              >
                <RefreshCw className={loadingMoreLogs ? 'w-4 h-4 mr-1.5 animate-spin' : 'w-4 h-4 mr-1.5'} />
                {logsHasMore ? '加载更多历史日志' : '没有更早日志了'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeView;
