import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useTaskMonitorStore } from '@/stores/task-monitor';

/** Pulsing dot for running status */
function PulseDot({ color = 'bg-blue-400' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

/** Progress bar */
function MiniProgress({ value, max, color = 'bg-blue-400' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function PanelContent() {
  const { t } = useTranslation('panel');
  const gatewayStatus = useGatewayStore((s) => s.status);
  const {
    currentAgentId,
    currentSessionKey,
    sending,
    activeRunId,
    streamingTools,
  } = useChatStore((s) => ({
    currentAgentId: s.currentAgentId,
    currentSessionKey: s.currentSessionKey,
    sending: s.sending,
    activeRunId: s.activeRunId,
    streamingTools: s.streamingTools,
  }));
  const agents = useAgentsStore((s) => s.agents);
  const taskRuns = useTaskMonitorStore((s) => s.runs);
  const currentAgentName = agents.find((agent) => agent.id === currentAgentId)?.name ?? currentAgentId;
  const isOnline = gatewayStatus.state === 'running';
  const sortedTools = [...streamingTools].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 12);
  const activeRuns = taskRuns.filter((run) => run.status === 'pending' || run.status === 'running');
  const latestRun = (activeRuns.length > 0 ? activeRuns[activeRuns.length - 1] : null)
    || (taskRuns.length > 0 ? taskRuns[taskRuns.length - 1] : null);
  const queueCount = sortedTools.length + (sending ? 1 : 0) + activeRuns.length;

  const completedTools = sortedTools.filter((tool) => tool.status === 'completed');
  const runningTools = sortedTools.filter((tool) => tool.status === 'running');
  const errorTools = sortedTools.filter((tool) => tool.status === 'error');

  const resolveEventTitle = (eventType: string, fallback: string): string => {
    if (eventType === 'queued') return t('timelineEventQueued');
    if (eventType === 'started') return t('timelineEventStarted');
    if (eventType === 'completed') return t('timelineEventCompleted');
    if (eventType === 'failed') return t('timelineEventFailed');
    if (eventType === 'message') return t('timelineEventMessage');
    if (eventType === 'tool') return fallback || t('timelineEventTool');
    return fallback || eventType;
  };

  const resolveEventIcon = (eventType: string): string => {
    if (eventType === 'queued') return '⏳';
    if (eventType === 'started') return '▶️';
    if (eventType === 'completed') return '✅';
    if (eventType === 'failed') return '❌';
    if (eventType === 'message') return '💬';
    if (eventType === 'tool') return '🔧';
    return '•';
  };

  const formatDuration = (ms: number | undefined): string => {
    if (ms == null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-4">
      {/* ── Overview Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-xl border ${isOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-amber-500/10 border-amber-500/20'}`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold text-sm">{t('overviewTitle')}</h3>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-300'}`}>
            {isOnline ? t('online') : t('offline')}
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-white/60 text-xs mb-1">{t('currentAgent')}</div>
            <div className="text-white font-semibold truncate">{currentAgentName}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">{t('currentSession')}</div>
            <div className="text-white font-semibold truncate">{currentSessionKey}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">{t('taskQueue')}</div>
            <div className="text-white font-semibold">{queueCount}</div>
          </div>
          <div>
            <div className="text-white/60 text-xs mb-1">{t('activeRun')}</div>
            <div className="text-white font-semibold truncate flex items-center gap-2">
              {activeRunId || t('none')}
              {sending && <PulseDot />}
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Subtask / Tool Progress Card ── */}
      {sortedTools.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold text-sm">{t('subtaskTitle')}</h3>
            <span className="text-[11px] text-white/50">
              {completedTools.length}/{sortedTools.length}
            </span>
          </div>

          {/* Overall progress bar */}
          <MiniProgress value={completedTools.length} max={sortedTools.length} color="bg-cyan-400" />

          <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
            {sortedTools.map((tool) => (
              <div key={tool.toolCallId || tool.id || tool.name} className="p-2 rounded-lg bg-white/5 border border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {tool.status === 'running' ? (
                      <PulseDot color="bg-cyan-400" />
                    ) : tool.status === 'completed' ? (
                      <span className="text-emerald-400 text-xs">✓</span>
                    ) : (
                      <span className="text-rose-400 text-xs">✗</span>
                    )}
                    <span className="text-white/90 text-xs font-medium truncate">{tool.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {tool.durationMs != null && (
                      <span className="text-[10px] text-white/40">{formatDuration(tool.durationMs)}</span>
                    )}
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      tool.status === 'error'
                        ? 'bg-rose-500/20 text-rose-300'
                        : tool.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                    }`}>
                      {tool.status === 'error'
                        ? t('statusError')
                        : tool.status === 'completed'
                          ? t('statusCompleted')
                          : t('statusRunning')}
                    </span>
                  </div>
                </div>
                {tool.summary && (
                  <div className="text-[11px] text-white/50 mt-1 line-clamp-2 pl-4">{tool.summary}</div>
                )}
              </div>
            ))}
          </div>

          {/* Summary stats */}
          {(runningTools.length > 0 || errorTools.length > 0) && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-white/40">
              {runningTools.length > 0 && (
                <span className="flex items-center gap-1">
                  <PulseDot color="bg-cyan-400" /> {runningTools.length} {t('statusRunning')}
                </span>
              )}
              {errorTools.length > 0 && (
                <span className="text-rose-300">{errorTools.length} {t('statusError')}</span>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Execution Timeline Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20"
      >
        <h3 className="text-white font-semibold text-sm mb-3">{t('timelineTitle')}</h3>

        <div className="space-y-2">
          {latestRun ? (
            <>
              {/* Task header */}
              <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-white/90 text-sm font-medium truncate flex items-center gap-2">
                    {latestRun.status === 'running' && <PulseDot />}
                    {latestRun.task || latestRun.sessionKey || t('none')}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${
                    latestRun.status === 'failed'
                      ? 'bg-rose-500/20 text-rose-300'
                      : latestRun.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-blue-500/20 text-blue-300'
                  }`}>
                    {latestRun.status === 'failed'
                      ? t('statusError')
                      : latestRun.status === 'completed'
                        ? t('statusCompleted')
                        : t('statusRunning')}
                  </span>
                </div>
                {latestRun.sessionKey && (
                  <div className="mt-1 text-[11px] text-white/50 truncate">{latestRun.sessionKey}</div>
                )}
                {latestRun.runId && (
                  <div className="text-[11px] text-white/50 truncate">{t('runLabel')}: {latestRun.runId}</div>
                )}
              </div>

              {/* Timeline events */}
              <div className="space-y-0.5 max-h-64 overflow-y-auto pr-1">
                {latestRun.events.slice(-12).map((evt, idx, arr) => {
                  const isLast = idx === arr.length - 1;
                  return (
                    <div key={evt.id} className="flex gap-2">
                      {/* Timeline connector */}
                      <div className="flex flex-col items-center w-4 flex-shrink-0">
                        <span className="text-[10px] leading-none mt-1.5">{resolveEventIcon(evt.type)}</span>
                        {!isLast && <div className="flex-1 w-px bg-white/10 my-0.5" />}
                      </div>
                      {/* Event content */}
                      <div className="flex-1 p-1.5 rounded-lg bg-white/5 min-w-0 mb-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-white/90 text-xs font-medium truncate">
                            {resolveEventTitle(evt.type, evt.title)}
                          </div>
                          <div className="text-[10px] text-white/40 flex-shrink-0">
                            {new Date(evt.at).toLocaleTimeString()}
                          </div>
                        </div>
                        {evt.detail && (
                          <div className="text-[11px] text-white/55 mt-0.5 line-clamp-2">{evt.detail}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="p-3 rounded-lg bg-white/5 text-white/60 text-sm text-center">
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <PulseDot /> {t('statusRunning')}
                </span>
              ) : t('timelineEmpty')}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
