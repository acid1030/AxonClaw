/**
 * AxonClaw - 健康中心 (Health Center)
 * ClawDeckX Doctor 风格完整复刻：诊断、健康评分、一键修复、测试中心
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Wrench,
  ChevronRight,
  Activity,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useChannelsStore } from '@/stores/channels';
import { useSkillsStore } from '@/stores/skills';
import { useCronStore } from '@/stores/cron';
import { useAgentsStore } from '@/stores/agents';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { HealthDot } from '@/components/common/HealthDot';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

interface CheckItem {
  id: string;
  code?: string;
  name: string;
  status: 'ok' | 'warn' | 'error';
  category?: string;
  detail: string;
  suggestion?: string;
  fixable?: boolean;
}

interface DoctorSummary {
  score: number;
  status: 'ok' | 'warn' | 'error';
  summary: string;
  updatedAt: string;
  gateway: { running: boolean; detail: string };
  healthCheck: { enabled: boolean; failCount: number; maxFails: number; lastOk: string };
  exceptionStats: {
    medium5m: number;
    high5m: number;
    critical5m: number;
    total1h: number;
    total24h: number;
  };
  sessionErrors: { totalErrors: number; sessionCount: number; errorSessions: number };
  recentIssues: Array<{
    id: string;
    source: string;
    category: string;
    risk: string;
    title: string;
    detail?: string;
    timestamp: string;
  }>;
  securityAudit?: {
    critical: number;
    warn: number;
    total: number;
    items: Array<{ id: string; name: string; status: 'ok' | 'warn' | 'error'; detail: string; suggestion?: string }>;
  };
}

interface DiagResult {
  items: CheckItem[];
  summary: string;
  score: number;
}

type TabId = 'diagnose' | 'testing';

interface DiagnosticsViewProps {
  embedded?: boolean;
  onNavigateTo?: (viewId: string) => void;
}

const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ embedded, onNavigateTo }) => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const channels = useChannelsStore((s) => s.channels);
  const skills = useSkillsStore((s) => s.skills);
  const cronJobs = useCronStore((s) => s.jobs);
  const agents = useAgentsStore((s) => s.agents);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const fetchCronJobs = useCronStore((s) => s.fetchJobs);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const [activeTab, setActiveTab] = useState<TabId>('diagnose');
  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [showFixConfirm, setShowFixConfirm] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const r = await invokeIpc<{ success: boolean }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, []);

  const loadSummary = useCallback(async (force = false) => {
    setSummaryLoading(true);
    try {
      const data = await hostApiFetch<DoctorSummary>('/api/doctor/summary');
      setSummary(data);
    } catch (err) {
      console.error('[HealthCenter] loadSummary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const runDoctor = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hostApiFetch<DiagResult>('/api/doctor');
      setResult(data);
      await loadSummary(true);
    } catch (err) {
      console.error('[HealthCenter] runDoctor error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSummary]);

  const fetchAll = useCallback(async () => {
    await checkConnection();
    await Promise.all([
      fetchChannels().catch(() => {}),
      fetchSkills().catch(() => {}),
      fetchCronJobs().catch(() => {}),
      fetchAgents().catch(() => {}),
    ]);
    await loadSummary(true);
  }, [checkConnection, fetchChannels, fetchSkills, fetchCronJobs, fetchAgents, loadSummary]);

  const handleFix = useCallback(async () => {
    setShowFixConfirm(false);
    setFixing(true);
    try {
      await hostApiFetch<{ fixed: string[]; results: unknown[] }>('/api/doctor/fix', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      await fetchAll();
      await runDoctor();
    } catch (err) {
      console.error('[HealthCenter] fix error:', err);
    } finally {
      setFixing(false);
    }
  }, [fetchAll, runDoctor]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (connectionVerified) {
      void fetchAll();
    }
  }, [connectionVerified, fetchAll]);

  const isOnline = connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeSkills = Array.isArray(skills) ? skills : [];
  const activeChannels = safeChannels.filter((c) => c.status === 'connected').length;
  const totalChannels = safeChannels.length || 1;
  const eligibleSkills = safeSkills.filter((s) => s.enabled || s.isCore).length;
  const totalSkills = safeSkills.length || 1;

  // 合并 API 返回的检查项 + 本地渠道/技能/定时任务
  const allCheckItems: CheckItem[] = useMemo(() => {
    const base = result?.items ?? [];
    const extras: CheckItem[] = [
      {
        id: 'channels',
        name: '渠道状态',
        status: activeChannels > 0 ? 'ok' : totalChannels > 0 ? 'warn' : 'ok',
        category: 'channel',
        detail: `${activeChannels}/${totalChannels} 已连接`,
        fixable: false,
      },
      {
        id: 'skills',
        name: '技能加载',
        status: totalSkills > 0 ? 'ok' : 'warn',
        category: 'skill',
        detail: `${eligibleSkills}/${totalSkills} 已启用`,
        fixable: false,
      },
      {
        id: 'cron',
        name: '定时任务',
        status: (cronJobs?.length ?? 0) > 0 ? 'ok' : 'warn',
        category: 'cron',
        detail: `${cronJobs?.length ?? 0} 个定时任务`,
        fixable: false,
      },
      {
        id: 'agents',
        name: 'Agent',
        status: (agents?.length ?? 0) > 0 ? 'ok' : 'warn',
        category: 'agent',
        detail: `${agents?.length ?? 0} 个 Agent`,
        fixable: false,
      },
    ];
    return [...base, ...extras];
  }, [result?.items, activeChannels, totalChannels, eligibleSkills, totalSkills, cronJobs, agents]);

  const fixableCount = allCheckItems.filter((i) => i.fixable).length;
  const currentStatus = summary?.status ?? (isOnline ? 'ok' : 'error');
  const currentScore = summary?.score ?? result?.score ?? (isOnline ? 85 : 50);
  const numericScore = Math.min(100, Math.max(0, currentScore));

  const statusBarColor = currentStatus === 'ok' ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : currentStatus === 'warn' ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400' : 'bg-gradient-to-r from-red-400 via-red-500 to-red-400';
  const statusLabel = currentStatus === 'ok' ? '健康' : currentStatus === 'warn' ? '警告' : '异常';
  const gaugeColor = numericScore >= 80 ? '#10b981' : numericScore >= 60 ? '#f59e0b' : numericScore >= 30 ? '#f97316' : '#ef4444';

  const gaugeRadius = 52;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (numericScore / 100) * gaugeCircumference;

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      {/* 顶部状态条 */}
      <div className={cn('h-[3px] w-full shrink-0 transition-all duration-700', statusBarColor)} />

      {/* 头部 */}
      <div className="p-4 border-b border-white/10 bg-[#1e293b]/80 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground">健康中心</h2>
            <p className="text-xs text-muted-foreground mt-0.5">一键诊断 Gateway、渠道、技能等健康状态</p>
          </div>
          {activeTab === 'diagnose' && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold',
                  currentStatus === 'ok' && 'bg-emerald-500/10 text-emerald-500',
                  currentStatus === 'warn' && 'bg-amber-500/10 text-amber-500',
                  currentStatus === 'error' && 'bg-red-500/10 text-red-500'
                )}
              >
                {statusLabel}
              </span>
              {summaryLoading && <span className="text-xs text-muted-foreground animate-pulse">...</span>}
              <button
                onClick={() => void runDoctor()}
                disabled={loading}
                className="h-8 px-3 rounded-lg text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:border-amber-500/50 disabled:opacity-50 flex items-center gap-1.5"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
                {loading ? '诊断中...' : '立即诊断'}
              </button>
              <button
                onClick={() => setShowFixConfirm(true)}
                disabled={fixing || fixableCount === 0}
                className="h-8 px-3 rounded-lg text-xs font-bold bg-primary text-white disabled:opacity-40"
              >
                {fixing ? '修复中...' : '一键修复'}
              </button>
            </div>
          )}
        </div>
        {/* Tab 切换 */}
        <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
          {[
            { id: 'diagnose' as TabId, icon: Activity, label: '诊断' },
            { id: 'testing' as TabId, icon: FlaskConical, label: '测试中心' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all',
                activeTab === tab.id ? 'bg-primary/15 text-primary' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'testing' && (
          <div className="rounded-xl border-2 border-slate-500/40 bg-[#1e293b] p-8 text-center">
            <FlaskConical className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-foreground mb-2">测试中心</h3>
            <p className="text-xs text-muted-foreground">测试中心功能开发中，敬请期待...</p>
          </div>
        )}

        {activeTab === 'diagnose' && (
          <div className="space-y-4 w-full">
            {/* 健康评分 + 摘要卡片 */}
            {summary && (
              <div
                className={cn(
                  'rounded-xl border-2 p-4',
                  currentStatus === 'ok' && 'border-emerald-500/40 bg-emerald-500/5',
                  currentStatus === 'warn' && 'border-amber-500/40 bg-amber-500/5',
                  currentStatus === 'error' && 'border-red-500/40 bg-red-500/5'
                )}
              >
                <div className="flex flex-col sm:flex-row items-start gap-4">
                  {/* 健康评分仪表盘 */}
                  <div className="shrink-0 flex flex-col items-center">
                    <svg viewBox="0 0 120 70" className="w-28 sm:w-32">
                      <path d="M 10 65 A 52 52 0 0 1 110 65" fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-600" strokeLinecap="round" />
                      <path
                        d="M 10 65 A 52 52 0 0 1 110 65"
                        fill="none"
                        stroke={gaugeColor}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={gaugeCircumference}
                        strokeDashoffset={gaugeOffset}
                        className="transition-all duration-700"
                      />
                      <text x="60" y="52" textAnchor="middle" className="fill-foreground" style={{ fontSize: '22px', fontWeight: 900 }}>
                        {numericScore}
                      </text>
                      <text x="60" y="66" textAnchor="middle" style={{ fontSize: '8px', fill: gaugeColor, fontWeight: 700 }}>
                        {statusLabel}
                      </text>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{summary.updatedAt ? new Date(summary.updatedAt).toLocaleString('zh-CN') : '--'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-bold', currentStatus === 'ok' && 'bg-emerald-500/10 text-emerald-500', currentStatus === 'warn' && 'bg-amber-500/10 text-amber-500', currentStatus === 'error' && 'bg-red-500/10 text-red-500')}>
                        {statusLabel}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground mt-2">{summary.summary}</p>
                  </div>
                </div>

                {/* 快照卡片 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mt-4">
                  <button
                    type="button"
                    onClick={() => onNavigateTo?.('dashboard')}
                    className="rounded-xl bg-white/5 border border-white/10 p-3 text-start hover:border-primary/30 transition-colors"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Gateway</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className={cn('text-xs font-bold', summary.gateway?.running ? 'text-emerald-500' : 'text-red-500')}>
                        {summary.gateway?.running ? '运行中' : '离线'}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{summary.gateway?.detail || '--'}</p>
                  </button>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-start">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">5分钟异常</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-xs font-bold text-foreground">
                        {summary.exceptionStats?.critical5m ?? 0}/{summary.exceptionStats?.high5m ?? 0}/{summary.exceptionStats?.medium5m ?? 0}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">严重/高/中</p>
                  </div>
                  <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-start">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">近期量</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className="text-xs font-bold text-foreground">
                        {summary.exceptionStats?.total1h ?? 0} / {summary.exceptionStats?.total24h ?? 0}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">1小时 / 24小时</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigateTo?.('alerts')}
                    className="rounded-xl bg-white/5 border border-white/10 p-3 text-start hover:border-primary/30 transition-colors"
                  >
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">会话错误</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className={cn('text-xs font-bold', (summary.sessionErrors?.totalErrors ?? 0) > 0 ? 'text-pink-500' : 'text-foreground')}>
                        {summary.sessionErrors?.totalErrors ?? 0}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {summary.sessionErrors?.totalErrors ?? 0} 错误 / {summary.sessionErrors?.errorSessions ?? 0} 会话
                    </p>
                  </button>
                  {summary.securityAudit && summary.securityAudit.total > 0 && (
                    <button
                      type="button"
                      onClick={() => onNavigateTo?.('alerts')}
                      className="rounded-xl bg-white/5 border border-white/10 p-3 text-start hover:border-primary/30 transition-colors"
                    >
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        安全审计
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <p className={cn('text-xs font-bold', summary.securityAudit.critical > 0 ? 'text-red-500' : 'text-amber-500')}>
                          {summary.securityAudit.critical} 严重 / {summary.securityAudit.warn} 警告
                        </p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 诊断检查项 */}
            <div className="rounded-xl border-2 border-slate-500/40 bg-[#1e293b] p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                <Wrench className="w-3.5 h-3.5" />
                诊断检查项
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {allCheckItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'rounded-xl border-2 p-3',
                      item.status === 'ok' && 'border-emerald-500/40 bg-emerald-500/5',
                      item.status === 'warn' && 'border-amber-500/40 bg-amber-500/5',
                      item.status === 'error' && 'border-red-500/40 bg-red-500/5'
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <HealthDot ok={item.status === 'ok'} />
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      {item.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                      {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                      {item.status === 'warn' && <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.detail}</p>
                    {item.suggestion && (
                      <p className="text-xs text-amber-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        {item.suggestion}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 最近问题 */}
            {summary?.recentIssues && summary.recentIssues.length > 0 && (
              <div className="rounded-xl border-2 border-orange-500/40 bg-[#1e293b] p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
                    最近问题
                  </h3>
                  <button type="button" onClick={() => onNavigateTo?.('alerts')} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                    查看全部
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {summary.recentIssues.slice(0, 6).map((issue) => (
                    <div
                      key={issue.id}
                      className={cn(
                        'flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs',
                        issue.risk === 'critical' && 'bg-red-500/10 text-red-400',
                        issue.risk === 'high' && 'bg-orange-500/10 text-orange-400',
                        issue.risk === 'medium' && 'bg-amber-500/10 text-amber-400',
                        issue.risk === 'low' && 'bg-blue-500/10 text-blue-400'
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{issue.title}</p>
                        <p className="text-muted-foreground truncate">{issue.detail || issue.timestamp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 一键修复确认 */}
      <ConfirmDialog
        open={showFixConfirm}
        title="一键修复"
        message="将尝试自动修复可修复项，是否继续？AxonClaw 当前版本修复能力有限，部分问题需手动处理。"
        confirmLabel="确认"
        cancelLabel="取消"
        variant="default"
        onConfirm={handleFix}
        onCancel={() => setShowFixConfirm(false)}
      />
    </div>
  );
};

export { DiagnosticsView };
export default DiagnosticsView;
