/**
 * AxonClaw - Activity Monitor View
 * AxonClawX 风格：会话活动监控、KPI 仪表盘、批量操作
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ListChecks, Search } from 'lucide-react';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { KPIDashboard, type KPIDashboardProps } from '@/components/activity/KPIDashboard';
import { SessionCard, type SessionCardProps } from '@/components/activity/SessionCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

type SortField = 'updated' | 'tokens' | 'name';

const AUTO_REFRESH_MS = 30_000;

/** 相对时间（中文） */
function fmtRelativeTime(ts: number | undefined, _labels?: Record<string, string>): string {
  if (!ts) return '—';
  const diff = Date.now() - ts;
  if (diff < 60_000) return '刚刚';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} 小时前`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

const labels: Record<string, string> = {
  title: '活动监控',
  activityHelp: '会话列表与使用统计',
  sessions: '会话',
  search: '搜索…',
  all: '全部',
  sortUpdated: '更新时间',
  sortTokens: 'Token 数',
  sortName: '名称',
  refresh: '刷新',
  exportCsv: '导出 CSV',
  batchMode: '批量',
  lastRefresh: '上次刷新',
  reset: '重置',
  confirmReset: '确定重置此会话？',
  resetOk: '已重置',
  delete: '删除',
  confirmDelete: '确定删除此会话？',
  confirmDeleteMain: '确定删除主会话？',
  deleteOk: '已删除',
  compact: '压缩',
  confirmCompact: '确定压缩此会话记录？',
  compactOk: '已压缩',
  batchDelete: '批量删除',
  confirmBatchDelete: '确定删除',
  batchReset: '批量重置',
  confirmBatchReset: '确定重置',
  selected: '已选',
  noSessions: '暂无会话',
  noSessionsHint: '配置 Gateway 并开始对话后，会话将自动显示',
  step1: '配置 Gateway',
  step1Desc: '连接 OpenClaw Gateway',
  step2: '开始对话',
  step2Desc: '在 AI 对话中发送消息',
  step3: '在此监控',
  step3Desc: '会话将自动出现',
  groupToday: '今天',
  groupYesterday: '昨天',
  groupThisWeek: '本周',
  groupEarlier: '更早',
  direct: '直连',
  group: '群组',
  global: '全局',
  unknown: '未知',
  totalTokens: '总 Token',
  input: '输入',
  output: '输出',
  active24h: '24h 活跃',
  activity7d: '7 日活跃',
  messages: '消息',
  userMsg: '用户',
  assistantMsg: '助手',
  toolCallsLabel: '工具',
  errors: '错误',
  channels: '渠道',
  costTrend: '成本 7 日',
  modelDist: '模型',
  aborted: '已中止',
  tokens: 'Token',
  metadata: '详情',
  openChat: '打开对话',
  latencyStats: '延迟',
};

interface ActivityMonitorViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const ActivityMonitorView: React.FC<ActivityMonitorViewProps> = ({ onNavigateTo }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ sessions?: Record<string, unknown>[]; path?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [costTrend, setCostTrend] = useState<Array<{ date: string; totalCost: number }>>([]);
  const [cardDensity, setCardDensity] = useState<'compact' | 'normal' | 'large'>('normal');
  const [usageAggregates, setUsageAggregates] = useState<Record<string, unknown> | null>(null);
  const [usageByKey, setUsageByKey] = useState<Record<string, unknown>>({});

  const rpc = useGatewayStore((s) => s.rpc);

  const loadSessions = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = (await invokeIpc<{ sessions?: Record<string, unknown>[] }>('sessions.list', {
        limit: 500,
      })) as { sessions?: Record<string, unknown>[]; path?: string };
      setResult(data ?? { sessions: [] });
      setLastRefresh(Date.now());
      hasLoadedRef.current = true;
    } catch (e: unknown) {
      setError(String(e));
      setResult({ sessions: [] });
    }
    if (isInitial) setLoading(false);
    else setRefreshing(false);
  }, []);

  const loadCostTrend = useCallback(async () => {
    try {
      const data = (await hostApiFetch<{
        trend?: Array<{ date?: string; cost?: number; totalCost?: number }>;
      }>('/api/usage-cost?days=7').catch(() => null)) as {
        trend?: Array<{ date?: string; cost?: number; totalCost?: number }>;
      } | null;
      if (data?.trend && Array.isArray(data.trend)) {
        setCostTrend(
          data.trend.map((d) => ({
            date: d.date ?? '',
            totalCost: d.totalCost ?? d.cost ?? 0,
          }))
        );
      }
    } catch {
      /* non-critical */
    }
  }, []);

  const loadUsageAggregates = useCallback(async () => {
    try {
      const data = (await hostApiFetch<{
        aggregates?: Record<string, unknown>;
        sessions?: Array<{ key?: string; usage?: unknown }>;
      }>('/api/sessions/usage?limit=50').catch(() => null)) as {
        aggregates?: Record<string, unknown>;
        sessions?: Array<{ key?: string; usage?: unknown }>;
      } | null;
      if (data?.aggregates) setUsageAggregates(data.aggregates);
      if (data?.sessions && Array.isArray(data.sessions)) {
        const map: Record<string, unknown> = {};
        for (const s of data.sessions) {
          if (s.key && s.usage) map[s.key] = s.usage;
        }
        setUsageByKey(map);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim().toLowerCase()), 140);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadSessions();
    loadCostTrend();
    loadUsageAggregates();
  }, [loadSessions, loadCostTrend, loadUsageAggregates]);

  useEffect(() => {
    const visible = document.visibilityState === 'visible';
    if (!visible) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSessions();
        loadCostTrend();
        loadUsageAggregates();
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [loadSessions, loadCostTrend, loadUsageAggregates]);

  const sessions: Record<string, unknown>[] = result?.sessions ?? [];
  const storePath = result?.path ?? '';

  const kpiStats = useMemo(() => {
    let totalTok = 0,
      totalIn = 0,
      totalOut = 0,
      active24h = 0,
      abortedCount = 0;
    const channelSet = new Set<string>();
    const now = Date.now();
    sessions.forEach((s) => {
      const tok = (s.totalTokens as number) ?? ((s.inputTokens as number) || 0) + ((s.outputTokens as number) || 0);
      totalTok += tok;
      totalIn += (s.inputTokens as number) || 0;
      totalOut += (s.outputTokens as number) || 0;
      if (s.updatedAt && now - (s.updatedAt as number) < 86_400_000) active24h++;
      if (s.abortedLastRun) abortedCount++;
      if (s.lastChannel) channelSet.add(s.lastChannel as string);
    });
    const avgTok = sessions.length ? Math.round(totalTok / sessions.length) : 0;
    return {
      totalTok,
      totalIn,
      totalOut,
      active24h,
      abortedCount,
      avgTok,
      channels: channelSet.size,
    };
  }, [sessions]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const k = (s.kind as string) || 'unknown';
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (kindFilter && kindFilter !== 'all') list = list.filter((s) => s.kind === kindFilter);
    if (searchKeyword) {
      const q = searchKeyword;
      list = list.filter(
        (s) =>
          (s.key as string)?.toLowerCase().includes(q) ||
          (s.label as string)?.toLowerCase().includes(q) ||
          (s.displayName as string)?.toLowerCase().includes(q) ||
          (s.model as string)?.toLowerCase().includes(q) ||
          (s.lastChannel as string)?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortField === 'tokens')
        return ((b.totalTokens as number) || 0) - ((a.totalTokens as number) || 0);
      if (sortField === 'name') return (a.key as string)?.localeCompare((b.key as string) || '');
      return ((b.updatedAt as number) || 0) - ((a.updatedAt as number) || 0);
    });
    return list;
  }, [sessions, kindFilter, searchKeyword, sortField]);

  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: Record<string, unknown>[] }[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86_400_000;
    const weekStart = todayStart - now.getDay() * 86_400_000;
    const buckets: Record<string, Record<string, unknown>[]> = {
      today: [],
      yesterday: [],
      week: [],
      earlier: [],
    };
    filtered.forEach((s) => {
      const ts = (s.updatedAt as number) || 0;
      if (ts >= todayStart) buckets.today.push(s);
      else if (ts >= yesterdayStart) buckets.yesterday.push(s);
      else if (ts >= weekStart) buckets.week.push(s);
      else buckets.earlier.push(s);
    });
    if (buckets.today.length) groups.push({ label: labels.groupToday, items: buckets.today });
    if (buckets.yesterday.length)
      groups.push({ label: labels.groupYesterday, items: buckets.yesterday });
    if (buckets.week.length) groups.push({ label: labels.groupThisWeek, items: buckets.week });
    if (buckets.earlier.length) groups.push({ label: labels.groupEarlier, items: buckets.earlier });
    return groups;
  }, [filtered]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompactConfirm, setShowCompactConfirm] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const resetSession = useCallback(
    async (key: string) => {
      if (busy) return;
      setPendingKey(key);
      setConfirmMessage(labels.confirmReset);
      setShowResetConfirm(true);
    },
    [busy]
  );

  const handleResetConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.reset', { key: pendingKey });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowResetConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const deleteSession = useCallback(
    async (key: string) => {
      if (busy) return;
      const isMain = key.endsWith(':main');
      setPendingKey(key);
      setConfirmMessage(isMain ? labels.confirmDeleteMain : labels.confirmDelete);
      setShowDeleteConfirm(true);
    },
    [busy]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.delete', { key: pendingKey, deleteTranscript: true });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowDeleteConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const compactSession = useCallback(
    async (key: string) => {
      if (busy) return;
      setPendingKey(key);
      setConfirmMessage(labels.confirmCompact);
      setShowCompactConfirm(true);
    },
    [busy]
  );

  const handleCompactConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.compact', { key: pendingKey });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowCompactConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const toggleBatchItem = useCallback((key: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const batchDelete = useCallback(async () => {
    if (batchSelected.size === 0) return;
    setBusy(true);
    for (const key of batchSelected) {
      try {
        await rpc('sessions.delete', { key, deleteTranscript: true });
      } catch {
        /* ignore */
      }
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    setBusy(false);
  }, [batchSelected, rpc, loadSessions]);

  const batchReset = useCallback(async () => {
    if (batchSelected.size === 0) return;
    setBusy(true);
    for (const key of batchSelected) {
      try {
        await rpc('sessions.reset', { key });
      } catch {
        /* ignore */
      }
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    setBusy(false);
  }, [batchSelected, rpc, loadSessions]);

  const exportCSV = useCallback(() => {
    const header =
      'key,kind,label,model,provider,totalTokens,inputTokens,outputTokens,updatedAt,lastChannel\n';
    const rows = sessions.map(
      (s) =>
        [
          s.key,
          s.kind,
          `"${((s.label as string) || '').replace(/"/g, '""')}"`,
          s.model || '',
          s.modelProvider || '',
          (s.totalTokens as number) || 0,
          (s.inputTokens as number) || 0,
          (s.outputTokens as number) || 0,
          s.updatedAt ? new Date(s.updatedAt as number).toISOString() : '',
          s.lastChannel || '',
        ].join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  const handleNavigateToChat = useCallback(
    (key: string) => {
      useChatStore.getState().switchSession(key);
      onNavigateTo?.('chat');
    },
    [onNavigateTo]
  );

  const isOnline = useGatewayStore((s) => s.status.state === 'running');

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-[#0f172a] text-white">
      <div className="w-full flex flex-col h-full py-6 overflow-hidden px-4">
        <PageHeader
          title={labels.title}
          subtitle={`${sessions.length} ${labels.sessions}${storePath ? ` · ${storePath}` : ''}`}
          stats={[
            { label: '会话', value: sessions.length },
            { label: '总 Token', value: kpiStats.totalTok >= 1000 ? `${(kpiStats.totalTok / 1000).toFixed(1)}K` : kpiStats.totalTok },
            { label: '24h 活跃', value: kpiStats.active24h },
            { label: 'Gateway', value: isOnline ? '在线' : '离线', valueClassName: isOnline ? 'text-emerald-400' : 'text-amber-400' },
          ]}
          onRefresh={() => void loadSessions()}
          refreshing={loading || refreshing}
          statsBorderColor={
            !isOnline
              ? 'border-amber-500/40'
              : sessions.length > 0
                ? 'border-emerald-500/40'
                : 'border-indigo-500/40'
          }
          actions={
            <div className="flex items-center gap-1">
              {sessions.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                  title={labels.exportCsv}
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setBatchMode(!batchMode);
                  setBatchSelected(new Set());
                }}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  batchMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10'
                )}
                title={labels.batchMode}
              >
                <ListChecks className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCardDensity((d) => (d === 'compact' ? 'normal' : d === 'normal' ? 'large' : 'compact'))
                }
                className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                title={`密度: ${cardDensity}`}
              >
                <span className="text-sm font-bold">{cardDensity === 'compact' ? 'S' : cardDensity === 'large' ? 'L' : 'M'}</span>
              </button>
            </div>
          }
        />
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-0">
        <div
          className={cn(
            'shrink-0 py-3 border-b',
            sessions.length > 0 ? 'border-emerald-500/15' : 'border-indigo-500/20'
          )}
        >
        {sessions.length > 0 && (
          <KPIDashboard
            stats={kpiStats}
            sessions={sessions}
            labels={labels}
            costTrend={costTrend}
            usageAggregates={usageAggregates as KPIDashboardProps['usageAggregates']}
          />
        )}

        <div className="flex gap-1.5 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={labels.search}
              className="w-full h-8 pl-8 pr-2 rounded-lg bg-[#1e293b] border border-indigo-500/20 text-xs text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger
              className={cn(
                'h-8 w-[140px] rounded-lg bg-[#1e293b] text-xs text-white/80',
                kindFilter === 'all' ? 'border-indigo-500/25' : kindFilter === 'direct' ? 'border-blue-500/25' : kindFilter === 'group' ? 'border-purple-500/25' : kindFilter === 'global' ? 'border-amber-500/25' : 'border-white/15'
              )}
            >
              <SelectValue placeholder={`${labels.all} (${sessions.length})`} />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-indigo-500/20 text-white/90">
              <SelectItem value="all">{`${labels.all} (${sessions.length})`}</SelectItem>
              {['direct', 'group', 'global', 'unknown']
                .filter((k) => kindCounts[k])
                .map((k) => (
                  <SelectItem key={k} value={k}>
                    {labels[k] || k} ({kindCounts[k]})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger
              className={cn(
                'h-8 w-[120px] rounded-lg bg-[#1e293b] text-xs text-white/80',
                sortField === 'updated' ? 'border-indigo-500/25' : sortField === 'tokens' ? 'border-amber-500/25' : 'border-blue-500/25'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-indigo-500/20 text-white/90">
              <SelectItem value="updated">{labels.sortUpdated}</SelectItem>
              <SelectItem value="tokens">{labels.sortTokens}</SelectItem>
              <SelectItem value="name">{labels.sortName}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {batchMode && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-xs text-white/40">{batchSelected.size} {labels.selected}</span>
            <div className="flex-1" />
            <button
              onClick={batchReset}
              disabled={busy || batchSelected.size === 0}
              className="text-xs px-2 py-1 rounded bg-white/10 text-white/70 hover:text-indigo-400 disabled:opacity-30"
            >
              {labels.reset}
            </button>
            <button
              onClick={batchDelete}
              disabled={busy || batchSelected.size === 0}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 disabled:opacity-30"
            >
              {labels.delete}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <div ref={listRef} className="flex-1 overflow-y-auto">
        {loading && !result ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse bg-[#1e293b] border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-12 h-4 rounded-full bg-indigo-500/20" />
                  <div className="flex-1 h-3 rounded bg-indigo-500/10" />
                </div>
                <div className="h-12 rounded-lg bg-indigo-500/10" />
                <div className="h-3 w-2/3 rounded bg-indigo-500/10 mt-3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-white/70 mb-1">{labels.noSessions}</p>
            <p className="text-xs text-white/40 mb-6">{labels.noSessionsHint}</p>
            <div className="w-full space-y-2.5 text-start">
              {[
                { label: labels.step1, desc: labels.step1Desc },
                { label: labels.step2, desc: labels.step2Desc },
                { label: labels.step3, desc: labels.step3Desc },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xs">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/60">{step.label}</div>
                    <div className="text-[10px] text-white/40">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {groupedSessions.map((group) => (
              <div key={group.label} className="mb-1">
                <div
          className={cn(
            'sticky top-0 z-10 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider bg-[#0f172a]/95 backdrop-blur-sm border-b',
            group.label === '今天' ? 'border-emerald-500/20' : group.label === '昨天' ? 'border-blue-500/15' : 'border-white/10'
          )}
        >
                  {group.label} ({group.items.length})
                </div>
                <div
                  className={cn(
                    'grid gap-3 p-4',
                    cardDensity === 'compact' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5',
                    cardDensity === 'large' && 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2',
                    cardDensity === 'normal' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  )}
                >
                  {group.items.slice(0, 60).map((row) => (
                    <div key={row.key as string} className="animate-in fade-in slide-in-from-bottom-2">
                      {batchMode && (
                        <div className="flex items-center gap-1.5 mb-1 ps-1">
                          <input
                            type="checkbox"
                            checked={batchSelected.has(row.key as string)}
                            onChange={() => toggleBatchItem(row.key as string)}
                            className="w-3.5 h-3.5 rounded border-white/20 text-indigo-500"
                          />
                        </div>
                      )}
                      <SessionCard
                        session={row}
                        sessionUsage={usageByKey[row.key as string] as SessionCardProps['sessionUsage']}
                        onChat={handleNavigateToChat}
                        onCompact={compactSession}
                        onReset={resetSession}
                        onDelete={deleteSession}
                        relativeTime={fmtRelativeTime(row.updatedAt as number, labels)}
                        labels={labels}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {lastRefresh > 0 && (
        <div className="shrink-0 py-1 border-t border-indigo-500/10 text-[9px] text-white/30 text-center">
          {labels.lastRefresh}: {new Date(lastRefresh).toLocaleTimeString('zh-CN')}
        </div>
      )}

      <ConfirmDialog
        open={showResetConfirm}
        title={labels.reset}
        message={confirmMessage}
        confirmLabel={labels.reset}
        cancelLabel="取消"
        variant="default"
        onConfirm={handleResetConfirm}
        onCancel={() => {
          setShowResetConfirm(false);
          setPendingKey(null);
        }}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        title={labels.delete}
        message={confirmMessage}
        confirmLabel={labels.delete}
        cancelLabel="取消"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingKey(null);
        }}
      />
      <ConfirmDialog
        open={showCompactConfirm}
        title={labels.compact}
        message={confirmMessage}
        confirmLabel={labels.compact}
        cancelLabel="取消"
        variant="default"
        onConfirm={handleCompactConfirm}
        onCancel={() => {
          setShowCompactConfirm(false);
          setPendingKey(null);
        }}
      />
      </div>
      </div>
    </div>
  );
};

export { ActivityMonitorView };
export default ActivityMonitorView;
