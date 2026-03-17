/**
 * AxonClaw - Diagnostics View
 * 系统诊断界面 - ClawDeckX 风格，真实诊断数据
 */

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useChannelsStore } from '@/stores/channels';
import { useSkillsStore } from '@/stores/skills';
import { invokeIpc } from '@/lib/api-client';
import { HealthDot } from '@/components/common/HealthDot';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface DiagnosticItem {
  id: string;
  name: string;
  status: 'ok' | 'warn' | 'error';
  message: string;
}

interface DiagnosticsViewProps {
  embedded?: boolean;
}

const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ embedded }) => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const channels = useChannelsStore((s) => s.channels);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const skills = useSkillsStore((s) => s.skills);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);

  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const [running, setRunning] = useState(false);

  const checkConnection = useCallback(async () => {
    setConnectionVerified(null);
    try {
      const r = await invokeIpc<{ success: boolean }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, []);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  useEffect(() => {
    if (connectionVerified) {
      fetchChannels().catch(console.error);
      fetchSkills().catch(console.error);
    }
  }, [connectionVerified, fetchChannels, fetchSkills]);

  const isOnline = connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');

  const runDiagnostics = useCallback(async () => {
    setRunning(true);
    try {
      const ok = await checkConnection();
      if (ok) {
        await fetchChannels();
        await fetchSkills();
      }
    } finally {
      setRunning(false);
    }
  }, [checkConnection, fetchChannels, fetchSkills]);

  const activeChannels = channels.filter((c) => c.status === 'connected').length;
  const totalChannels = channels.length || 1;
  const enabledSkills = skills.filter((s) => s.enabled).length;
  const totalSkills = skills.length || 1;

  const items: DiagnosticItem[] = [
    {
      id: 'gateway',
      name: 'Gateway 连接',
      status: isOnline ? 'ok' : 'error',
      message: isOnline
        ? `ws://127.0.0.1:${gatewayStatus?.port ?? 18789}`
        : '未连接',
    },
    {
      id: 'channels',
      name: '渠道状态',
      status: activeChannels > 0 ? 'ok' : totalChannels > 0 ? 'warn' : 'ok',
      message: `${activeChannels}/${totalChannels} 已连接`,
    },
    {
      id: 'skills',
      name: '技能加载',
      status: totalSkills > 0 ? 'ok' : 'warn',
      message: `${enabledSkills}/${totalSkills} 已启用`,
    },
  ];

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        embedded ? 'h-full min-h-0 -m-4' : '-m-6 h-[calc(100vh-2.5rem)]'
      )}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 overflow-y-auto">
        <PageHeader
          title="系统诊断"
          subtitle="一键检测 Gateway、渠道、技能等健康状态"
          stats={[
            { label: 'Gateway', value: isOnline ? '在线' : '离线' },
            { label: '渠道', value: `${activeChannels}/${totalChannels}` },
            { label: '技能', value: `${enabledSkills}/${totalSkills}` },
          ]}
          onRefresh={runDiagnostics}
          refreshing={running}
          refreshLabel="立即诊断"
          statsBorderColor="border-emerald-500/40"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <HealthDot ok={item.status === 'ok'} />
                <span className="text-sm font-medium text-foreground">
                  {item.name}
                </span>
                {item.status === 'ok' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />
                )}
                {item.status === 'error' && (
                  <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                )}
                {item.status === 'warn' && (
                  <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{item.message}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { DiagnosticsView };
export default DiagnosticsView;
