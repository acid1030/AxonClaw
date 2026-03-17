/**
 * AxonClaw - 网关监控
 * ClawDeckX 风格：网关状态、连接数、流量、日志流
 */

import React, { useEffect, useState } from 'react';
import { Wifi, RefreshCw, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGatewayStore } from '@/stores/gateway';
import { hostApiFetch } from '@/lib/host-api';
import { HealthDot } from '@/components/common/HealthDot';
import { cn } from '@/lib/utils';

export const GatewayMonitoringView: React.FC = () => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const [logs, setLogs] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await hostApiFetch<{ content?: string }>('/api/logs?tailLines=200');
      setLogs(data?.content ?? '');
    } catch {
      setLogs('// 加载日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const isOnline = gatewayStatus.state === 'running';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f172a]">
      <div className="flex-shrink-0 py-4 border-b border-indigo-500/20 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">网关监控</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <HealthDot ok={isOnline} />
            <span className="text-sm text-muted-foreground">
              {isOnline ? '运行中' : '离线'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-indigo-500/40"
            onClick={() => void loadLogs()}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            刷新日志
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto py-6 space-y-6">
        {/* 状态卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-medium text-foreground">连接状态</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {isOnline ? '已连接' : '未连接'}
            </p>
          </div>
          <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-5 w-5 text-indigo-400" />
              <span className="text-sm font-medium text-foreground">WebSocket</span>
            </div>
            <p className="text-lg font-semibold text-foreground">
              {gatewayStatus.state === 'running' ? '活跃' : '—'}
            </p>
          </div>
          <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4">
            <span className="text-sm font-medium text-foreground">连接数</span>
            <p className="text-lg font-semibold text-foreground mt-1">
              {(gatewayStatus as { connectionsCount?: number }).connectionsCount ?? '—'}
            </p>
          </div>
        </div>

        {/* 日志 */}
        <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] overflow-hidden">
          <div className="px-4 py-2 border-b border-indigo-500/20">
            <span className="text-sm font-medium text-foreground">最近日志</span>
          </div>
          <pre className="p-4 font-mono text-xs text-foreground/90 overflow-x-auto max-h-[400px] overflow-y-auto whitespace-pre-wrap">
            {logs || '暂无日志'}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default GatewayMonitoringView;
