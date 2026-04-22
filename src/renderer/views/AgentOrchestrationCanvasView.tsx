import React, { useEffect, useMemo, useState } from 'react';
import { MultiAgentCollaborationPanel } from '@/components/multiagent/MultiAgentCollaborationPanel';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';
import { AgentLibraryView } from '@/views/AgentLibraryView';
import { useTranslation } from 'react-i18next';

interface AgentOrchestrationCanvasViewProps {
  onNavigateTo?: (view: string) => void;
}

export const AgentOrchestrationCanvasView: React.FC<AgentOrchestrationCanvasViewProps> = ({ onNavigateTo }) => {
  const { t } = useTranslation();
  const isOnline = useGatewayOnline();
  const agents = useAgentsStore((s) => s.agents);
  const defaultAgentId = useAgentsStore((s) => s.defaultAgentId);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const [tab, setTab] = useState<'library' | 'canvas'>('library');

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const resolvedDefaultAgentId = useMemo(() => {
    return defaultAgentId || agents.find((a) => a.isDefault)?.id || agents[0]?.id || 'main';
  }, [agents, defaultAgentId]);

  return (
    <div className="h-full min-h-0 bg-[#0f172a] text-white">
      <div className="h-full min-h-0 p-3 overflow-hidden flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab('library')}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === 'library' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            {t('agentLibrary.title')}
          </button>
          <button
            type="button"
            onClick={() => setTab('canvas')}
            className={`rounded-md px-3 py-1.5 text-sm ${tab === 'canvas' ? 'bg-white/15 text-white' : 'bg-white/5 text-white/70 hover:bg-white/10'}`}
          >
            {t('agentLibrary.canvas')}
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          {tab === 'library' ? (
            <AgentLibraryView onNavigateTo={onNavigateTo} />
          ) : (
            <MultiAgentCollaborationPanel
              defaultAgentId={resolvedDefaultAgentId}
              isOnline={isOnline}
              scrollMode="split"
              onDeploy={() => {
                void fetchAgents();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentOrchestrationCanvasView;
