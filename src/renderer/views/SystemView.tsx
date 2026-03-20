/**
 * AxonClaw - System View (Composite)
 * Tab: 健康中心 | 设置
 */

import React, { useState, useEffect } from 'react';
import { DiagnosticsView } from './DiagnosticsView';
import { SettingsView } from './SettingsView';
import { useGatewayStore } from '@/stores/gateway';
import { cn } from '@/lib/utils';

type SystemTab = 'diagnostic' | 'setting';

const tabs: { id: SystemTab; label: string }[] = [
  { id: 'diagnostic', label: '健康中心' },
  { id: 'setting', label: '设置' },
];

interface SystemViewProps {
  onNavigateTo?: (viewId: string) => void;
  defaultTab?: SystemTab;
}

const SystemView: React.FC<SystemViewProps> = ({ onNavigateTo, defaultTab = 'setting' }) => {
  const [activeTab, setActiveTab] = useState<SystemTab>(defaultTab);
  const isOnline = useGatewayStore((s) => s.status.state === 'running');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="sticky top-0 z-10 shrink-0 bg-[#0f172a] pt-4 pb-4">
        <h1 className="text-base font-bold text-foreground mb-2">系统</h1>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0 mb-3',
          isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      <div className="flex items-center gap-1 pb-2 border-b border-white/10 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 rounded-t-lg text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-[#1e293b] text-foreground border-t-2 border-x-2 border-sky-500/40 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeTab === 'diagnostic' && <DiagnosticsView embedded onNavigateTo={onNavigateTo} />}
        {activeTab === 'setting' && <SettingsView embedded onNavigateTo={onNavigateTo} />}
      </div>
    </div>
  );
};

export { SystemView };
export default SystemView;
