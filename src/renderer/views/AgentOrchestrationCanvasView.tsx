import React, { useEffect, useMemo } from 'react';
import { MultiAgentCollaborationPanel } from '@/components/multiagent/MultiAgentCollaborationPanel';
import { useAgentsStore } from '@/stores/agents';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';

export const AgentOrchestrationCanvasView: React.FC = () => {
  const isOnline = useGatewayOnline();
  const agents = useAgentsStore((s) => s.agents);
  const defaultAgentId = useAgentsStore((s) => s.defaultAgentId);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  const resolvedDefaultAgentId = useMemo(() => {
    return defaultAgentId || agents.find((a) => a.isDefault)?.id || agents[0]?.id || 'main';
  }, [agents, defaultAgentId]);

  return (
    <div className="h-full min-h-0 bg-[#0f172a] text-white">
      <div className="h-full min-h-0 p-3 overflow-hidden">
        <MultiAgentCollaborationPanel
          defaultAgentId={resolvedDefaultAgentId}
          isOnline={isOnline}
          scrollMode="split"
          onDeploy={() => {
            void fetchAgents();
          }}
        />
      </div>
    </div>
  );
};

export default AgentOrchestrationCanvasView;
