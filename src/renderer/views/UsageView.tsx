/**
 * AxonClaw - Usage View
 * Token 使用统计、成本分析、会话使用详情
 * ClawDeckX 风格
 */

import React, { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, DollarSign } from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface UsageCost {
  totalCost?: number;
  todayCost?: number;
  inputTokens?: number;
  outputTokens?: number;
  trend?: Array<{ date: string; cost: number }>;
}

const UsageView: React.FC = () => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [usage, setUsage] = useState<UsageCost | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsage = async () => {
    if (!isOnline) return;
    setLoading(true);
    try {
      const data = await hostApiFetch<UsageCost>('/api/usage-cost?days=7').catch(() => null);
      setUsage(data);
    } catch {
      setUsage(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsage();
  }, [isOnline]);

  const totalCost = usage?.totalCost ?? 0;
  const todayCost = usage?.todayCost ?? 0;
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 min-h-0">
        <PageHeader
          title="使用情况"
          subtitle="Token 使用量、成本统计、7天趋势"
          stats={[
            { label: '总成本', value: `$${totalCost.toFixed(2)}` },
            { label: '今日', value: `$${todayCost.toFixed(2)}` },
            { label: 'Gateway', value: isOnline ? '在线' : '离线' },
          ]}
          onRefresh={fetchUsage}
          refreshing={loading}
          statsBorderColor="border-emerald-500/40"
        />

        {!isOnline && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            请先启动 Gateway 以获取使用数据
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <DollarSign className="w-4 h-4" />
              总成本
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${totalCost.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              今日成本
            </div>
            <div className="text-2xl font-bold text-foreground">
              ${todayCost.toFixed(2)}
            </div>
          </div>
          <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4">
            <div className="text-muted-foreground text-sm mb-1">输入 Token</div>
            <div className="text-2xl font-bold text-foreground">
              {inputTokens >= 1e6 ? `${(inputTokens / 1e6).toFixed(1)}M` : inputTokens >= 1e3 ? `${(inputTokens / 1e3).toFixed(1)}K` : inputTokens}
            </div>
          </div>
          <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4">
            <div className="text-muted-foreground text-sm mb-1">输出 Token</div>
            <div className="text-2xl font-bold text-foreground">
              {outputTokens >= 1e6 ? `${(outputTokens / 1e6).toFixed(1)}M` : outputTokens >= 1e3 ? `${(outputTokens / 1e3).toFixed(1)}K` : outputTokens}
            </div>
          </div>
        </div>

        <div className="flex-1 rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] overflow-hidden flex flex-col min-h-[200px]">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-sm font-medium text-foreground">7 天趋势</h3>
          </div>
          <div className="flex-1 p-4 flex items-center justify-center text-muted-foreground">
            {usage?.trend && usage.trend.length > 0 ? (
              <div className="w-full space-y-2">
                {usage.trend.map((t) => (
                  <div key={t.date} className="flex items-center gap-2">
                    <span className="text-xs w-20">{t.date}</span>
                    <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded"
                        style={{ width: `${Math.min(100, (t.cost / (Math.max(...usage.trend!.map((x) => x.cost), 0.01) || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs w-16 text-right">${t.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <span className="text-sm">暂无趋势数据</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { UsageView };
export default UsageView;
