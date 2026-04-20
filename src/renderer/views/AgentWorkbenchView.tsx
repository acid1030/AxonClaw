import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, PlayCircle, Loader2, Sparkles, ArrowRight, Workflow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { extractText } from '@/pages/Chat/message-utils';
import { cn } from '@/lib/utils';

interface AgentWorkbenchViewProps {
  onNavigateTo?: (view: string) => void;
}

function resolveAgentMainSessionKey(agentId: string, sessionKeys: string[]): string {
  const normalized = String(agentId || '').trim().toLowerCase() || 'main';
  const candidates = [`agent:${normalized}:main`, `${normalized}:main`];
  const existing = sessionKeys.find((key) => candidates.includes(key));
  return existing ?? `agent:${normalized}:main`;
}

export const AgentWorkbenchView: React.FC<AgentWorkbenchViewProps> = ({ onNavigateTo }) => {
  const { t } = useTranslation();
  const agents = useAgentsStore((s) => s.agents);
  const loadingAgents = useAgentsStore((s) => s.loading);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const resolveLabel = useAgentsStore((s) => s.resolveLabel);
  const resolveEmoji = useAgentsStore((s) => s.resolveEmoji);
  const gatewayState = useGatewayStore((s) => s.status.state);

  const sessions = useChatStore((s) => s.sessions);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const messages = useChatStore((s) => s.messages);
  const sending = useChatStore((s) => s.sending);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const error = useChatStore((s) => s.error);
  const switchSession = useChatStore((s) => s.switchSession);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [task, setTask] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const safeAgents = useMemo(() => (Array.isArray(agents) ? agents : []), [agents]);
  const selectedAgent = useMemo(
    () => safeAgents.find((a) => a.id === selectedAgentId) ?? safeAgents[0] ?? null,
    [safeAgents, selectedAgentId],
  );
  const selectedSessionKey = useMemo(
    () => (selectedAgent ? resolveAgentMainSessionKey(selectedAgent.id, sessions.map((s) => s.key)) : ''),
    [selectedAgent, sessions],
  );

  const recentMessages = useMemo(() => {
    return messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-8)
      .map((m) => ({
        role: m.role,
        text: extractText(m).trim(),
      }))
      .filter((m) => m.text.length > 0);
  }, [messages]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    if (!selectedAgentId && safeAgents.length > 0) {
      setSelectedAgentId(safeAgents[0].id);
    }
  }, [selectedAgentId, safeAgents]);

  const switchToAgentSession = useCallback(async (agentId: string) => {
    const nextSession = resolveAgentMainSessionKey(agentId, sessions.map((s) => s.key));
    if (nextSession !== currentSessionKey) {
      switchSession(nextSession);
    }
    await loadHistory(true);
  }, [currentSessionKey, loadHistory, sessions, switchSession]);

  const handleSelectAgent = useCallback((agentId: string) => {
    setSelectedAgentId(agentId);
    void switchToAgentSession(agentId);
  }, [switchToAgentSession]);

  const handleRunTask = useCallback(async () => {
    const prompt = task.trim();
    if (!prompt || !selectedAgent) return;
    setSubmitting(true);
    try {
      await sendMessage(prompt, undefined, selectedAgent.id);
      setTask('');
      await switchToAgentSession(selectedAgent.id);
    } finally {
      setSubmitting(false);
    }
  }, [selectedAgent, sendMessage, switchToAgentSession, task]);

  const isGatewayRunning = gatewayState === 'running';

  return (
    <div className="h-full min-h-0 w-full bg-[#0f172a] text-white overflow-hidden">
      <div className="h-full min-h-0 grid grid-cols-[280px_minmax(0,1fr)] gap-3 p-3">
        <aside className="min-h-0 rounded-2xl border border-white/10 bg-[#111827] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="text-sm font-semibold">{t('agentWorkbench.title')}</h2>
            <p className="text-xs text-white/60 mt-1">{t('agentWorkbench.subtitle')}</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {loadingAgents ? (
              <div className="h-full flex items-center justify-center text-white/60 text-sm">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {t('agentWorkbench.loadingAgents')}
              </div>
            ) : safeAgents.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/60 text-sm">
                {t('agentWorkbench.empty')}
              </div>
            ) : safeAgents.map((agent) => {
              const active = selectedAgent?.id === agent.id;
              const name = resolveLabel(agent);
              const emoji = resolveEmoji(agent) || '🤖';
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => handleSelectAgent(agent.id)}
                  className={cn(
                    'w-full text-left rounded-xl border px-3 py-3 mb-2 transition-colors',
                    active ? 'border-indigo-400/60 bg-indigo-500/10' : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-500 flex items-center justify-center text-xl">
                      {emoji}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{name}</div>
                      <div className="text-xs text-white/60 truncate">{agent.id}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="min-h-0 rounded-2xl border border-white/10 bg-[#111827] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Bot className="h-4 w-4 text-indigo-300" />
                {selectedAgent ? resolveLabel(selectedAgent) : t('agentWorkbench.noAgent')}
              </h3>
              <p className="text-xs text-white/60 mt-1">
                {selectedSessionKey ? `${t('agentWorkbench.session')}: ${selectedSessionKey}` : t('agentWorkbench.selectAgentHint')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTo?.('chat')}
                className="px-3 py-1.5 rounded-lg text-xs border border-white/15 hover:bg-white/10"
              >
                {t('agentWorkbench.openSessions')}
              </button>
              <button
                type="button"
                onClick={() => onNavigateTo?.('agent-orchestration')}
                className="px-3 py-1.5 rounded-lg text-xs border border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center gap-1.5"
              >
                <Workflow className="h-3.5 w-3.5" />
                {t('agentWorkbench.openOrchestration')}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-white/10">
            <div className="text-xs text-white/70 mb-2">{t('agentWorkbench.taskLabel')}</div>
            <div className="flex items-end gap-2">
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder={t('agentWorkbench.taskPlaceholder')}
                className="flex-1 min-h-[88px] max-h-[220px] resize-y rounded-xl border border-white/15 bg-[#0f172a] px-3 py-2.5 text-sm outline-none focus:border-indigo-400/60"
                disabled={!selectedAgent || !isGatewayRunning || sending || submitting}
              />
              <button
                type="button"
                onClick={() => void handleRunTask()}
                disabled={!selectedAgent || !task.trim() || !isGatewayRunning || sending || submitting}
                className={cn(
                  'h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-1.5',
                  (!selectedAgent || !task.trim() || !isGatewayRunning || sending || submitting)
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white',
                )}
              >
                {(sending || submitting) ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
                {t('agentWorkbench.runTask')}
              </button>
            </div>
            {!isGatewayRunning && (
              <div className="text-xs text-amber-300/90 mt-2">{t('agentWorkbench.gatewayOffline')}</div>
            )}
            {error && <div className="text-xs text-red-300 mt-2">{error}</div>}
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-2 gap-0">
            <section className="min-h-0 border-r border-white/10 p-4 overflow-y-auto">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                {t('agentWorkbench.monitorTitle')}
              </h4>
              <div className="mt-3 space-y-2">
                <div className="text-xs text-white/65">
                  {t('agentWorkbench.monitorStatus')}:
                  <span className={cn('ml-1', (sending || submitting) ? 'text-amber-300' : 'text-emerald-300')}>
                    {(sending || submitting) ? t('agentWorkbench.running') : t('agentWorkbench.idle')}
                  </span>
                </div>
                <div className="text-xs text-white/65">
                  {t('agentWorkbench.monitorSession')}: <span className="text-white/85">{currentSessionKey}</span>
                </div>
              </div>

              <div className="mt-4">
                <div className="text-xs text-white/70 mb-2">{t('agentWorkbench.toolsTitle')}</div>
                {streamingTools.length === 0 ? (
                  <div className="text-xs text-white/45">{t('agentWorkbench.toolsEmpty')}</div>
                ) : (
                  <div className="space-y-2">
                    {streamingTools.map((tool, idx) => (
                      <div key={`${tool.toolCallId || tool.id || tool.name}-${idx}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                        <div className="text-xs text-white/90">{tool.name}</div>
                        <div className="text-[11px] text-white/55 mt-0.5">{tool.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="min-h-0 p-4 overflow-y-auto">
              <h4 className="text-sm font-semibold">{t('agentWorkbench.recentTitle')}</h4>
              <div className="mt-3 space-y-2">
                {recentMessages.length === 0 ? (
                  <div className="text-xs text-white/45">{t('agentWorkbench.recentEmpty')}</div>
                ) : recentMessages.map((msg, idx) => (
                  <div key={`${msg.role}-${idx}`} className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-2">
                    <div className="text-[11px] text-white/55 uppercase">{msg.role}</div>
                    <div className="text-xs text-white/90 mt-1 whitespace-pre-wrap line-clamp-4">{msg.text}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentWorkbenchView;
