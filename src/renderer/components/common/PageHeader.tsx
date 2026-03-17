/**
 * PageHeader - 统一页面标题区
 * 含：标题、副标题、统计面板、操作按钮、Gateway 状态
 */

import React from 'react';
import { RefreshCw, Power } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';

export interface PageStat {
  label: string;
  value: string | number;
  /** 边框/强调色，如 border-emerald-500/40 */
  accent?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** 统计项，展示在标题下方 */
  stats?: PageStat[];
  /** 右侧操作区 */
  actions?: React.ReactNode;
  /** 是否显示刷新按钮（传入 onClick） */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** 刷新按钮文案，默认「刷新」 */
  refreshLabel?: string;
  /** 统计面板边框色，默认 indigo */
  statsBorderColor?: string;
}

export function PageHeader({
  title,
  subtitle,
  stats = [],
  actions,
  onRefresh,
  refreshing = false,
  refreshLabel = '刷新',
  statsBorderColor = 'border-indigo-500/40',
}: PageHeaderProps) {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const initGateway = useGatewayStore((s) => s.init);
  const startGateway = useGatewayStore((s) => s.start);
  const isOnline = gatewayStatus.state === 'running';
  const [starting, setStarting] = React.useState(false);

  const handleStartGateway = async () => {
    setStarting(true);
    try {
      await initGateway();
      const { status } = useGatewayStore.getState();
      if (status.state !== 'running') {
        await startGateway();
      }
    } catch (e) {
      console.error('[PageHeader] Gateway start failed:', e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="shrink-0 mb-4">
      {/* 标题行 */}
      <div className="flex items-start sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                'bg-[#1e293b] border-2 text-foreground/80 hover:bg-[#334155] disabled:opacity-50',
                statsBorderColor
              )}
            >
              <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              {refreshLabel}
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Gateway 状态条：未连接时显示 */}
      {!isOnline && (
        <div
          className={cn(
            'mt-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border-2',
            'bg-amber-500/10 border-amber-500/30'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Gateway 未连接，部分功能不可用
            </span>
          </div>
          <button
            onClick={handleStartGateway}
            disabled={starting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-amber-500/20 text-amber-600 dark:text-amber-400',
              'hover:bg-amber-500/30 transition-colors disabled:opacity-50'
            )}
          >
            <Power className="w-3.5 h-3.5" />
            {starting ? '启动中…' : '启动 Gateway'}
          </button>
        </div>
      )}

      {/* 统计面板 */}
      {stats.length > 0 && (
        <div
          className={cn(
            'mt-3 flex flex-wrap gap-3 rounded-xl border-2 bg-[#1e293b] p-3',
            statsBorderColor
          )}
        >
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {s.value}
              </span>
              {i < stats.length - 1 && (
                <span className="text-muted-foreground/50">·</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
