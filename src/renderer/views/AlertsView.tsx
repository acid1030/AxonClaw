/**
 * AxonClaw - Alerts View
 * 系统警报、错误通知、告警规则
 * ClawDeckX 风格
 */

import React, { useEffect, useState } from 'react';
import { Bell, RefreshCw, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

type AlertLevel = 'critical' | 'warning' | 'info';

interface AlertItem {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  timestamp: string;
  resolved?: boolean;
}

const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [levelFilter, setLevelFilter] = useState<AlertLevel | 'ALL'>('ALL');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await hostApiFetch<{ alerts?: AlertItem[] }>('/api/alerts').catch(() => ({}));
      setAlerts(Array.isArray(data?.alerts) ? data.alerts : []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAlerts();
  }, []);

  const filteredAlerts =
    levelFilter === 'ALL' ? alerts : alerts.filter((a) => a.level === levelFilter);

  const levelConfig = {
    critical: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
    warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  };

  return (
    <div className="flex flex-col -m-6 bg-[#0f172a] h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 min-h-0">
        <PageHeader
          title="警报"
          subtitle="系统警报、错误通知、告警规则配置"
          stats={[
            { label: '总数', value: alerts.length },
            { label: '严重', value: alerts.filter((a) => a.level === 'critical').length },
            { label: '警告', value: alerts.filter((a) => a.level === 'warning').length },
          ]}
          onRefresh={fetchAlerts}
          refreshing={loading}
          statsBorderColor="border-orange-500/40"
        />

        <div className="flex items-center gap-2 mb-4">
          {(['ALL', 'critical', 'warning', 'info'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                levelFilter === level
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              {level === 'ALL' ? '全部' : level === 'critical' ? '严重' : level === 'warning' ? '警告' : '信息'}
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-xl border-2 border-orange-500/40 bg-[#1e293b] overflow-hidden flex flex-col min-h-[280px]">
          <div className="flex-1 overflow-y-auto p-4">
            {filteredAlerts.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                {loading ? '加载中...' : '暂无警报'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const cfg = levelConfig[alert.level] ?? levelConfig.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'rounded-xl border-2 p-4',
                        cfg.bg,
                        cfg.border
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', cfg.color)} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-foreground">{alert.title}</div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <span className="text-xs text-muted-foreground/70 mt-2 block">
                            {alert.timestamp}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { AlertsView };
export default AlertsView;
