/**
 * AxonClaw - System View (Composite)
 * Tab: 诊断 | 设置
 */

import React, { useState } from 'react';
import { DiagnosticsView } from './DiagnosticsView';
import { SettingsView } from './SettingsView';
import { cn } from '@/lib/utils';

type SystemTab = 'diagnostic' | 'setting';

const tabs: { id: SystemTab; label: string }[] = [
  { id: 'diagnostic', label: '诊断' },
  { id: 'setting', label: '设置' },
];

const SystemView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SystemTab>('diagnostic');

  return (
    <div className="flex flex-col -m-6 bg-[#0f172a] h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="flex items-center gap-1 px-6 pt-4 pb-2 border-b border-white/10 shrink-0">
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
        {activeTab === 'diagnostic' && <DiagnosticsView embedded />}
        {activeTab === 'setting' && <SettingsView embedded />}
      </div>
    </div>
  );
};

export { SystemView };
export default SystemView;
