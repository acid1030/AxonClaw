/**
 * AxonClaw - Channels View
 * Channel 配置界面 - AxonClawX 风格，useChannelsStore 真实数据
 */

import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useChannelsStore } from '@/stores/channels';
import { useGatewayStore } from '@/stores/gateway';
import { CHANNEL_ICONS, CHANNEL_NAMES, getPrimaryChannels, type ChannelType } from '@/types/channel';
import { PageHeader } from '@/components/common/PageHeader';
import { ChannelConfigModal } from '@/components/channels/ChannelConfigModal';
import { hostApiFetch } from '@/lib/host-api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHANNEL_GRADIENTS: Record<string, string> = {
  telegram: 'from-sky-500 to-blue-500',
  discord: 'from-indigo-500 to-purple-500',
  whatsapp: 'from-emerald-500 to-green-500',
  dingtalk: 'from-blue-500 to-cyan-500',
  feishu: 'from-green-500 to-emerald-500',
  wecom: 'from-blue-500 to-indigo-500',
  qqbot: 'from-amber-500 to-orange-500',
  default: 'from-slate-500 to-slate-600',
};

const ChannelsView: React.FC = () => {
  const channels = useChannelsStore((s) => s.channels);
  const loading = useChannelsStore((s) => s.loading);
  const error = useChannelsStore((s) => s.error);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [configOpen, setConfigOpen] = useState(false);
  const [configType, setConfigType] = useState<ChannelType | null>(null);
  const [testingType, setTestingType] = useState<ChannelType | null>(null);

  const openConfig = (type: string) => {
    setConfigType(type as ChannelType);
    setConfigOpen(true);
  };

  const configuredTypes = useMemo(() => channels.map((c) => c.type), [channels]);

  const channelTitleColor: Record<string, string> = {
    telegram: 'text-sky-500',
    discord: 'text-indigo-500',
    whatsapp: 'text-emerald-500',
    dingtalk: 'text-blue-500',
    feishu: 'text-blue-600',
    wecom: 'text-green-600',
    qq: 'text-cyan-600',
  };

  const runTest = async (type: string) => {
    try {
      setTestingType(type as ChannelType);
      const result = await hostApiFetch<{ success?: boolean; message?: string; error?: string }>('/api/v1/notify/test', {
        method: 'POST',
        body: JSON.stringify({ channel: type, message: `AxonClawX 测试消息 · ${new Date().toLocaleTimeString()}` }),
        headers: { 'Content-Type': 'application/json' },
      });
      if (result?.success === false) {
        throw new Error(result?.error || '测试失败');
      }
      toast.success(result?.message || `${CHANNEL_NAMES[type] || type} 测试发送成功`);
    } catch (err: any) {
      toast.error(`${CHANNEL_NAMES[type] || type} 测试失败：${err?.message || err}`);
    } finally {
      setTestingType(null);
    }
  };

  const refresh = useCallback(async () => {
    await fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    if (isOnline) {
      fetchChannels().catch(console.error);
    }
  }, [isOnline, fetchChannels]);

  const allTypes = getPrimaryChannels();
  const connectedCount = channels.filter((c) => c.status === 'connected').length;
  const totalCount = allTypes.length;

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="Channel 管理"
          subtitle="连接消息平台 · 配置向导"
          stats={[
            { label: '已连接', value: `${connectedCount}/${totalCount}` },
            { label: 'Gateway', value: isOnline ? '在线' : '离线' },
          ]}
          onRefresh={refresh}
          refreshing={loading}
          statsBorderColor="border-emerald-500/40"
        />

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isOnline ? (
          <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-8 text-center">
            <p className="text-muted-foreground text-sm">请先启动 Gateway 以加载渠道</p>
            <p className="text-muted-foreground/70 text-xs mt-1">点击上方「启动 Gateway」按钮</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl">
            {allTypes.map((type) => {
              const ch = channels.find((c) => c.type === type);
              const isConnected = ch?.status === 'connected';
              const gradient = CHANNEL_GRADIENTS[type] ?? CHANNEL_GRADIENTS.default;
              const name = CHANNEL_NAMES[type] ?? type;
              const icon = CHANNEL_ICONS[type] ?? '💬';

              return (
                <div
                  key={type}
                  className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] overflow-hidden"
                >
                  <div className={cn('h-1 bg-gradient-to-r', gradient)} />
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{icon}</span>
                        <div>
                          <div className={cn('text-sm font-medium', channelTitleColor[type] || 'text-foreground')}>
                            {name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {ch?.accountId ? `ID: ${ch.accountId.slice(0, 12)}…` : 'Bot / OAuth'}
                          </div>
                        </div>
                      </div>
                      <span
                        className={cn(
                          'px-2 py-1 rounded-lg text-xs font-medium',
                          isConnected
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                        )}
                      >
                        {isConnected ? '已连接' : '未配置'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      {ch?.error ? `错误: ${ch.error}` : isConnected ? '运行中' : '点击配置向导完成连接'}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openConfig(type)}
                        className="flex-1 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-medium text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      >
                        配置
                      </button>
                      <button
                        onClick={() => runTest(type)}
                        disabled={testingType === type}
                        className="flex-1 py-2 rounded-xl bg-primary/15 text-primary text-xs font-medium hover:bg-primary/25 transition-colors disabled:opacity-60"
                      >
                        {testingType === type ? '测试中…' : '测试'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {configOpen && (
        <ChannelConfigModal
          initialSelectedType={configType}
          configuredTypes={configuredTypes}
          onClose={() => {
            setConfigOpen(false);
            setConfigType(null);
          }}
          onChannelSaved={async () => {
            await fetchChannels();
          }}
        />
      )}
    </div>
  );
};

export { ChannelsView };
export default ChannelsView;
