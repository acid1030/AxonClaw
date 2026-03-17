/**
 * AxonClaw - Run View (Composite)
 * Tab: 会话 | 日志 | 活动
 */

import React, { useState } from 'react';
import { SessionsView } from './SessionsView';
import { LogsView } from './LogsView';
import { ActivityView } from './ActivityView';
import { cn } from '@/lib/utils';

type RunTab = 'session' | 'log' | 'activity';

const tabs: { id: RunTab; label: string }[] = [
  { id: 'session', label: '会话' },
  { id: 'log', label: '日志' },
  { id: 'activity', label: '活动' },
];

interface RunViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const RunView: React.FC<RunViewProps> = ({ onNavigateTo }) => {
  const [activeTab, setActiveTab] = useState<RunTab>('session');

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
                ? 'bg-[#1e293b] text-foreground border-t-2 border-x-2 border-indigo-500/40 -mb-px'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'session' && <SessionsView onNavigateTo={onNavigateTo} embedded />}
        {activeTab === 'log' && <LogsView embedded />}
        {activeTab === 'activity' && <ActivityView embedded />}
      </div>
    </div>
  );
};

export { RunView };
export default RunView;
