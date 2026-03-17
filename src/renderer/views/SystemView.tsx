/**
 * AxonClaw - System View (Composite)
 * Tab: 健康中心 | 设置
 */

import React, { useState, useEffect } from 'react';
import { DiagnosticsView } from './DiagnosticsView';
import { SettingsView } from './SettingsView';
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

const SystemView: React.FC<SystemViewProps> = ({ onNavigateTo, defaultTab = 'diagnostic' }) => {
  const [activeTab, setActiveTab] = useState<SystemTab>(defaultTab);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="flex items-center gap-1 pt-4 pb-2 border-b border-white/10 shrink-0">
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
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'diagnostic' && <DiagnosticsView embedded onNavigateTo={onNavigateTo} />}
        {activeTab === 'setting' && <SettingsView embedded />}
      </div>
    </div>
  );
};

export { SystemView };
export default SystemView;
