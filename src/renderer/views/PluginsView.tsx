/**
 * AxonClaw - Plugins View
 * 插件管理界面 - ClawDeckX 风格，useSkillsStore 真实数据
 */

import React, { useEffect } from 'react';
import { Puzzle, Package } from 'lucide-react';
import { useSkillsStore } from '@/stores/skills';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface PluginsViewProps {
  embedded?: boolean;
}

const PluginsView: React.FC<PluginsViewProps> = ({ embedded }) => {
  const skills = useSkillsStore((s) => s.skills);
  const loading = useSkillsStore((s) => s.loading);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  useEffect(() => {
    if (isOnline) {
      fetchSkills().catch(console.error);
    }
  }, [isOnline, fetchSkills]);

  const enabledCount = skills.filter((s) => s.enabled).length;

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        embedded ? 'h-full min-h-0 -m-4' : '-m-6 h-[calc(100vh-2.5rem)]'
      )}
    >
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 overflow-y-auto">
        <PageHeader
          title="插件管理"
          subtitle="安装和管理插件（技能）"
          stats={[
            { label: '已启用', value: `${enabledCount}/${skills.length}` },
            { label: 'Gateway', value: isOnline ? '在线' : '离线' },
          ]}
          onRefresh={() => fetchSkills()}
          refreshing={loading}
          statsBorderColor="border-purple-500/40"
        />

        {!isOnline ? (
          <div className="rounded-xl border-2 border-purple-500/40 bg-[#1e293b] p-8 text-center">
            <p className="text-muted-foreground text-sm">请先启动 Gateway 以加载插件</p>
            <p className="text-muted-foreground/70 text-xs mt-1">点击上方「启动 Gateway」按钮</p>
          </div>
        ) : skills.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">暂无插件</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-2xl">
            {skills.map((skill) => (
              <div
                key={skill.id}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      skill.enabled ? 'bg-primary/15' : 'bg-black/5 dark:bg-white/5'
                    )}
                  >
                    <Puzzle
                      className={cn(
                        'w-5 h-5',
                        skill.enabled ? 'text-primary' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">
                      {skill.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      v{skill.version ?? '1.0'} · {skill.source ?? 'built-in'}
                    </div>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium shrink-0',
                    skill.enabled
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                      : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                  )}
                >
                  {skill.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            ))}
          </div>
        )}

        {skills.length > 0 && (
          <div className="mt-4 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 max-w-2xl">
            <div className="text-sm text-muted-foreground">
              {enabledCount}/{skills.length} 已启用 · 完整技能管理请前往「技能」页面
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { PluginsView };
export default PluginsView;
