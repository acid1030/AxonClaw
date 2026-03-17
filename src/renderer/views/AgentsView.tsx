/**
 * AxonClaw - Agents View
 * 参考 ClawDeckX：左侧 Agent 列表 + 右侧详情（Overview/Files/Tools/Skills/Channels/Cron/Chat/Scenarios/Multi-Agent）
 * Skills 风格：#0f172a、#1e293b、彩色边框
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Clock,
  Pencil,
  Trash2,
  Bot,
  FileText,
  Wrench,
  Puzzle,
  MessageSquare,
  Calendar,
  Sparkles,
  Rocket,
  Search,
  BarChart3,
  Play,
  Headphones,
  Cloud,
  Image,
  Send,
  Bell,
  Laptop,
  Languages,
  PenTool,
  BookOpen,
  LayoutTemplate,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAgentsStore } from '@/stores/agents';
import { useChannelsStore } from '@/stores/channels';
import { useCronStore } from '@/stores/cron';
import { useSkillsStore } from '@/stores/skills';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ChannelConfigModal } from '@/components/channels/ChannelConfigModal';
import { ChatView } from '@/components/chat/ChatView';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AgentSummary } from '@/types/agent';
import type { ChannelType } from '@/types/channel';
import { CHANNEL_NAMES, CHANNEL_ICONS } from '@/types/channel';
import { AgentSettingsModal } from '@/pages/Agents';
import { agentFilesList, agentFileGet, agentFileSet, configGet, agentSkills, agentsDelete, wake } from '@/services/agent-api';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'skills', label: 'Skills', icon: Puzzle },
  { id: 'channels', label: 'Channels', icon: MessageSquare },
  { id: 'cron', label: 'Cron Jobs', icon: Calendar },
  { id: 'chat', label: '运行', icon: MessageSquare },
  { id: 'scenarios', label: '场景', icon: LayoutTemplate },
  { id: 'multi-agent', label: '多代理', icon: Sparkles },
] as const;

type TabId = (typeof TABS)[number]['id'];

const WORKFLOW_TEMPLATES = [
  {
    id: 'content-factory',
    title: 'Content Factory',
    desc: 'End-to-end content production pipeline with research, writing, editing, and publishing',
    roles: 4,
    tag: 'Sequential',
    tagColor: 'bg-blue-500/20 text-blue-400',
    icon: FileText,
    iconColor: 'text-violet-400',
  },
  {
    id: 'research-team',
    title: 'Research Team',
    desc: 'Collaborative research team with lead researcher, analysts, and critics',
    roles: 4,
    tag: 'Collaborative',
    tagColor: 'bg-violet-500/20 text-violet-400',
    icon: Search,
    iconColor: 'text-blue-400',
  },
  {
    id: 'devops-team',
    title: 'DevOps Team',
    desc: 'Automated incident response and infrastructure management team',
    roles: 4,
    tag: 'Event-Driven',
    tagColor: 'bg-amber-500/20 text-amber-400',
    icon: Cloud,
    iconColor: 'text-orange-400',
  },
  {
    id: 'support-team',
    title: 'Customer Support Team',
    desc: 'Tiered customer support with routing and escalation',
    roles: 3,
    tag: 'Routing',
    tagColor: 'bg-blue-500/20 text-blue-400',
    icon: Headphones,
    iconColor: 'text-emerald-400',
  },
];

const TEAM_ROLES = [
  { id: 'researcher', label: 'Researcher', icon: Search, color: 'text-blue-400' },
  { id: 'writer', label: 'Writer', icon: Pencil, color: 'text-emerald-400' },
  { id: 'editor', label: 'Editor', icon: Image, color: 'text-amber-400' },
  { id: 'publisher', label: 'Publisher', icon: Send, color: 'text-violet-400' },
];

function formatSchedule(schedule: unknown): string {
  if (typeof schedule === 'string') return schedule;
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; everyMs?: number; at?: string };
    if (s.kind === 'cron' && s.expr) return s.expr;
    if (s.kind === 'every' && s.everyMs) {
      const ms = s.everyMs;
      if (ms < 60_000) return `每 ${Math.round(ms / 1000)} 秒`;
      if (ms < 3_600_000) return `每 ${Math.round(ms / 60_000)} 分钟`;
      if (ms < 86_400_000) return `每 ${Math.round(ms / 3_600_000)} 小时`;
      return `每 ${Math.round(ms / 86_400_000)} 天`;
    }
    if (s.kind === 'at' && s.at) return s.at;
  }
  return String(schedule ?? '—');
}

export const AgentsView: React.FC = () => {
  const { t } = useTranslation('agents');
  const {
    agents,
    loading,
    fetchAgents,
    createAgent,
    assignChannel,
    removeChannel,
  } = useAgentsStore();
  const { channels, fetchChannels } = useChannelsStore();
  const { jobs, fetchJobs } = useCronStore();
  const { fetchSkills } = useSkillsStore();
  const switchSession = useChatStore((s) => s.switchSession);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('content-factory');
  const [deploymentMode, setDeploymentMode] = useState<'enhance' | 'independent'>('enhance');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [channelToRemove, setChannelToRemove] = useState<ChannelType | null>(null);
  const [deleteFiles, setDeleteFiles] = useState(true);
  const [waking, setWaking] = useState(false);
  const [wakeResult, setWakeResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    void Promise.all([fetchAgents(), fetchChannels()]);
  }, [fetchAgents, fetchChannels]);

  useEffect(() => {
    if (isOnline) {
      void fetchJobs();
      void fetchSkills();
    }
  }, [isOnline, fetchJobs, fetchSkills]);

  const safeAgents = Array.isArray(agents) ? agents : [];
  const selectedAgent = safeAgents.find((a) => a.id === selectedAgentId) ?? safeAgents[0] ?? null;

  useEffect(() => {
    if (!selectedAgentId && safeAgents.length > 0) {
      setSelectedAgentId(safeAgents[0].id);
    }
  }, [selectedAgentId, safeAgents]);

  // 进入 Chat tab 时切换到该 Agent 的主会话
  useEffect(() => {
    if (activeTab === 'chat' && selectedAgent?.mainSessionKey) {
      switchSession(selectedAgent.mainSessionKey);
    }
  }, [activeTab, selectedAgent?.mainSessionKey, switchSession]);

  const handleRefresh = useCallback(() => {
    void Promise.all([fetchAgents(), fetchChannels(), fetchJobs(), fetchSkills()]);
  }, [fetchAgents, fetchChannels, fetchJobs, fetchSkills]);

  const handleAddAgent = useCallback(async (name: string) => {
    await createAgent(name);
    setShowAddDialog(false);
    toast.success(t('toast.agentCreated'));
  }, [createAgent, t]);

  const handleDeleteAgent = useCallback(async () => {
    if (!agentToDelete) return;
    try {
      await agentsDelete({ agentId: agentToDelete.id, deleteFiles });
      await fetchAgents();
      setAgentToDelete(null);
      if (selectedAgentId === agentToDelete.id) {
        setSelectedAgentId(safeAgents.filter((a) => a.id !== agentToDelete.id)[0]?.id ?? null);
      }
      toast.success(t('toast.agentDeleted'));
    } catch (e) {
      toast.error(String(e));
    }
  }, [agentToDelete, deleteFiles, fetchAgents, selectedAgentId, safeAgents, t]);

  const handleChannelSaved = useCallback(async (channelType: ChannelType) => {
    if (!selectedAgent) return;
    try {
      await assignChannel(selectedAgent.id, channelType);
      await fetchChannels();
      setShowChannelModal(false);
      toast.success(t('toast.channelAssigned', { channel: CHANNEL_NAMES[channelType] || channelType }));
    } catch (e) {
      toast.error(t('toast.channelAssignFailed', { error: String(e) }));
      throw e;
    }
  }, [selectedAgent, assignChannel, fetchChannels, t]);

  const handleRemoveChannel = useCallback(async () => {
    if (!channelToRemove || !selectedAgent) return;
    try {
      await removeChannel(selectedAgent.id, channelToRemove);
      await fetchChannels();
      setChannelToRemove(null);
      toast.success(t('toast.channelRemoved', { channel: CHANNEL_NAMES[channelToRemove] || channelToRemove }));
    } catch (e) {
      toast.error(t('toast.channelRemoveFailed', { error: String(e) }));
    }
  }, [channelToRemove, selectedAgent, removeChannel, fetchChannels, t]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0f172a]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 bg-[#0f172a] text-white overflow-hidden">
      {/* Left Sidebar - Skills 风格 */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-indigo-500/20 bg-[#1e293b]">
        <div className="p-4 border-b border-indigo-500/20">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-foreground">Agents</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{safeAgents.length} agents</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {safeAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors border-2',
                selectedAgentId === agent.id
                  ? 'bg-indigo-500/20 border-indigo-500/40 text-foreground'
                  : 'border-transparent hover:bg-white/5 text-muted-foreground hover:text-foreground'
              )}
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-indigo-500/30 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {(agent.name || agent.id || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.name}</p>
                <p className="text-xs opacity-70 truncate">{agent.id}</p>
              </div>
              {agent.isDefault && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 shrink-0">
                  default
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#0f172a]">
        {selectedAgent ? (
          <>
            {/* Agent Header */}
            <div className="shrink-0 flex items-center justify-between py-4 border-b border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-500/30 flex items-center justify-center border-2 border-indigo-500/40">
                  <span className="text-base font-medium">
                    {(selectedAgent.name || selectedAgent.id).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">{selectedAgent.name}</h1>
                  <p className="text-xs text-muted-foreground">{selectedAgent.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                  title="唤醒 Agent"
                  disabled={!isOnline || waking}
                  onClick={async () => {
                    setWaking(true);
                    setWakeResult(null);
                    try {
                      await wake({ mode: 'now', text: '检查' });
                      setWakeResult({ ok: true, text: '已唤醒' });
                      setTimeout(() => setWakeResult(null), 3000);
                    } catch (e) {
                      setWakeResult({ ok: false, text: `唤醒失败: ${e}` });
                    } finally {
                      setWaking(false);
                    }
                  }}
                >
                  <Bell className={cn('h-4 w-4', waking && 'animate-spin')} />
                </Button>
                {wakeResult && (
                  <span
                    className={cn(
                      'absolute top-12 right-0 px-3 py-1.5 rounded-xl text-xs font-bold z-30',
                      wakeResult.ok ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    )}
                  >
                    {wakeResult.text}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                  title="History"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-indigo-500/20"
                  title="Edit"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!selectedAgent.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
                    title="Delete"
                    onClick={() => setAgentToDelete(selectedAgent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex items-center gap-1 py-2 border-b border-indigo-500/20 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'text-indigo-400 border-b-2 border-indigo-400 -mb-[1px]'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
              {activeTab === 'overview' && (
                <OverviewTab agent={selectedAgent} channels={channels} />
              )}
              {activeTab === 'files' && <FilesTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'tools' && <ToolsTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'skills' && <SkillsTab agent={selectedAgent} isOnline={isOnline} />}
              {activeTab === 'channels' && (
                <ChannelsTab
                  agent={selectedAgent}
                  channels={channels}
                  onAddChannel={() => setShowChannelModal(true)}
                  onRemoveChannel={(t) => setChannelToRemove(t)}
                />
              )}
              {activeTab === 'cron' && <CronTab jobs={jobs} onRefresh={fetchJobs} isOnline={isOnline} />}
              {activeTab === 'chat' && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  <ChatView />
                </div>
              )}
              {activeTab === 'scenarios' && <ScenariosTab />}
              {activeTab === 'multi-agent' && (
                <MultiAgentTab
                  selectedWorkflow={selectedWorkflow}
                  onSelectWorkflow={setSelectedWorkflow}
                  deploymentMode={deploymentMode}
                  onDeploymentModeChange={setDeploymentMode}
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Bot className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-sm mb-4">No agents yet</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-500/40"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>
        )}
      </main>

      {showAddDialog && (
        <AgentsAddDialogInline
          onClose={() => setShowAddDialog(false)}
          onCreate={handleAddAgent}
        />
      )}

      {showSettingsModal && selectedAgent && (
        <AgentSettingsModal
          agent={selectedAgent}
          channels={channels}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {showChannelModal && selectedAgent && (
        <ChannelConfigModal
          configuredTypes={selectedAgent.channelTypes}
          showChannelName={false}
          allowExistingConfig
          agentId={selectedAgent.id}
          onClose={() => setShowChannelModal(false)}
          onChannelSaved={handleChannelSaved}
        />
      )}

      <ConfirmDialog
        open={!!agentToDelete}
        title={t('deleteDialog.title')}
        message={agentToDelete ? t('deleteDialog.message', { name: agentToDelete.name }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={handleDeleteAgent}
        onCancel={() => setAgentToDelete(null)}
      >
        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={deleteFiles}
            onChange={(e) => setDeleteFiles(e.target.checked)}
            className="rounded border-indigo-500/40"
          />
          <span className="text-sm text-muted-foreground">同时删除工作区文件</span>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!channelToRemove}
        title={t('removeChannelDialog.title')}
        message={channelToRemove ? t('removeChannelDialog.message', { name: CHANNEL_NAMES[channelToRemove] || channelToRemove }) : ''}
        confirmLabel={t('common:actions.delete')}
        cancelLabel={t('common:actions.cancel')}
        variant="destructive"
        onConfirm={handleRemoveChannel}
        onCancel={() => setChannelToRemove(null)}
      />
    </div>
  );
};

function OverviewTab({
  agent,
  channels,
}: {
  agent: AgentSummary;
  channels: Array<{ type: string; status: string }>;
}) {
  const runtimeByType = Object.fromEntries(channels.map((c) => [c.type, c]));
  const assigned = agent.channelTypes.map((t) => ({
    type: t,
    status: runtimeByType[t]?.status ?? 'disconnected',
  }));

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Agent 基本信息与配置</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Agent ID</p>
            <p className="font-mono text-sm text-foreground">{agent.id}</p>
          </div>
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Model</p>
            <p className="text-sm text-foreground">
              {agent.modelDisplay}
              {agent.inheritedModel ? ' (继承)' : ''}
            </p>
          </div>
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Workspace</p>
            <p className="font-mono text-sm text-foreground truncate" title={agent.workspace}>
              {agent.workspace || '—'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Channels</p>
          {assigned.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无渠道</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {assigned.map(({ type, status }) => (
                <span
                  key={type}
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    status === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-500/20 text-slate-400'
                  )}
                >
                  {CHANNEL_NAMES[type as ChannelType] || type} · {status}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtBytes(b?: number): string {
  if (b == null) return '-';
  if (b < 1024) return `${b} B`;
  const u = ['KB', 'MB', 'GB'];
  let s = b / 1024,
    i = 0;
  while (s >= 1024 && i < u.length - 1) {
    s /= 1024;
    i++;
  }
  return `${s.toFixed(s < 10 ? 1 : 0)} ${u[i]}`;
}

function FilesTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const [filesList, setFilesList] = useState<Array<{ name: string; size?: number; missing?: boolean }>>([]);
  const [fileActive, setFileActive] = useState<string | null>(null);
  const [fileContents, setFileContents] = useState<Record<string, string>>({});
  const [fileDrafts, setFileDrafts] = useState<Record<string, string>>({});
  const [fileSaving, setFileSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    if (!agent?.id || !isOnline) return;
    setLoading(true);
    setError(null);
    try {
      const res = await agentFilesList(agent.id);
      setFilesList(res?.files || []);
    } catch (e) {
      setError(String(e));
      setFilesList([]);
    } finally {
      setLoading(false);
    }
  }, [agent?.id, isOnline]);

  const loadFile = useCallback(
    async (name: string) => {
      if (!agent?.id || !isOnline) return;
      setFileActive(name);
      if (fileContents[name] != null) return;
      try {
        const res = await agentFileGet(agent.id, name);
        const content = (res?.file?.content as string) || '';
        setFileContents((prev) => ({ ...prev, [name]: content }));
        setFileDrafts((prev) => ({ ...prev, [name]: content }));
      } catch (e) {
        toast.error(String(e));
      }
    },
    [agent?.id, isOnline, fileContents]
  );

  const saveFile = useCallback(async () => {
    if (!agent?.id || !fileActive) return;
    setFileSaving(true);
    try {
      await agentFileSet(agent.id, fileActive, fileDrafts[fileActive] || '');
      setFileContents((prev) => ({ ...prev, [fileActive!]: fileDrafts[fileActive!] || '' }));
      toast.success('已保存');
    } catch (e) {
      toast.error(String(e));
    } finally {
      setFileSaving(false);
    }
  }, [agent?.id, fileActive, fileDrafts]);

  useEffect(() => {
    if (agent?.id && isOnline) {
      loadFiles();
    } else {
      setFilesList([]);
      setFileActive(null);
      setFileContents({});
      setFileDrafts({});
    }
  }, [agent?.id, isOnline, loadFiles]);

  const hasUnsaved = fileActive && fileDrafts[fileActive] !== fileContents[fileActive];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-48 shrink-0 space-y-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase">核心文件</span>
            <button
              onClick={loadFiles}
              disabled={!isOnline || loading}
              className="text-xs text-indigo-400 hover:underline disabled:opacity-40"
            >
              {loading ? '加载中…' : '刷新'}
            </button>
          </div>
          {!isOnline ? (
            <p className="text-xs text-muted-foreground py-4">Gateway 未连接</p>
          ) : filesList.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">暂无文件</p>
          ) : (
            filesList.map((f) => (
              <button
                key={f.name}
                onClick={() => loadFile(f.name)}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all border',
                  fileActive === f.name
                    ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    : 'hover:bg-white/5 border-transparent'
                )}
              >
                <p className="font-mono font-semibold truncate">{f.name}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {f.missing ? <span className="text-amber-500">缺失</span> : fmtBytes(f.size)}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="flex-1 min-w-0">
          {!fileActive ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground text-xs">
              选择文件
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground">{fileActive}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFileDrafts((prev) => ({ ...prev, [fileActive!]: fileContents[fileActive!] || '' }))}
                    disabled={!hasUnsaved}
                    className="h-7 text-xs border-indigo-500/40"
                  >
                    重置
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveFile}
                    disabled={fileSaving || !hasUnsaved}
                    className="h-7 text-xs bg-indigo-500 hover:bg-indigo-600"
                  >
                    {fileSaving ? '保存中…' : '保存'}
                  </Button>
                </div>
              </div>
              <textarea
                value={fileDrafts[fileActive] ?? fileContents[fileActive] ?? ''}
                onChange={(e) => setFileDrafts((prev) => ({ ...prev, [fileActive!]: e.target.value }))}
                className="w-full h-80 p-3 rounded-xl bg-[#1e293b] border-2 border-indigo-500/40 text-xs font-mono text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                spellCheck={false}
              />
            </div>
          )}
          {error && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TOOL_SECTIONS = [
  { label: 'Files', tools: ['read', 'write', 'edit', 'apply_patch'] },
  { label: 'Runtime', tools: ['exec', 'process'] },
  { label: 'Web', tools: ['web_search', 'web_fetch'] },
  { label: 'Memory', tools: ['memory_search', 'memory_get'] },
  { label: 'Sessions', tools: ['sessions_list', 'sessions_history', 'sessions_send', 'sessions_spawn', 'session_status'] },
  { label: 'UI', tools: ['browser', 'canvas'] },
  { label: 'Messaging', tools: ['message'] },
  { label: 'Automation', tools: ['cron', 'gateway'] },
  { label: 'Agents', tools: ['agents_list'] },
  { label: 'Media', tools: ['image'] },
];

interface AgentConfigEntry {
  id: string;
  tools?: Record<string, unknown>;
}
interface ConfigShape {
  agents?: { list?: AgentConfigEntry[]; defaults?: { tools?: Record<string, unknown> } };
  tools?: Record<string, unknown>;
}

function ToolsTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const [config, setConfig] = useState<ConfigShape | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOnline) return;
    setLoading(true);
    configGet()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [isOnline]);

  const tools = (() => {
    if (!config) return {};
    const list = config.agents?.list || [];
    const entry = list.find((e) => e?.id === agent?.id);
    const defaults = config.agents?.defaults;
    return entry?.tools || defaults?.tools || config.tools || {};
  })();

  const profile = (tools as { profile?: string }).profile || 'full';
  const denyList = Array.isArray((tools as { deny?: string[] }).deny) ? (tools as { deny: string[] }).deny : [];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Tools</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Profile: <span className="font-mono text-indigo-400">{profile}</span>
          </p>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            Gateway 未连接
          </div>
        ) : loading ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            加载中…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TOOL_SECTIONS.map((section) => (
              <div key={section.label} className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-3">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{section.label}</p>
                <div className="space-y-1">
                  {section.tools.map((tool) => {
                    const denied = denyList.includes(tool);
                    const allowed = !denied;
                    return (
                      <div key={tool} className="flex items-center justify-between py-1">
                        <span className="text-xs font-mono text-foreground/70">{tool}</span>
                        <div className={cn('w-2 h-2 rounded-full', allowed ? 'bg-emerald-500' : 'bg-slate-500/50')} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SkillsTab({ agent, isOnline }: { agent: AgentSummary; isOnline: boolean }) {
  const [skillsReport, setSkillsReport] = useState<{ skills?: Array<{ name: string; description?: string; eligible?: boolean; bundled?: boolean; source?: string }> } | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready' | 'notReady'>('ready');

  const loadSkills = useCallback(async () => {
    if (!agent?.id || !isOnline) return;
    setLoading(true);
    try {
      const r = await agentSkills(agent.id);
      setSkillsReport(r);
    } catch {
      setSkillsReport(null);
    } finally {
      setLoading(false);
    }
  }, [agent?.id, isOnline]);

  useEffect(() => {
    if (agent?.id && isOnline) {
      loadSkills();
    } else {
      setSkillsReport(null);
    }
  }, [agent?.id, isOnline, loadSkills]);

  const allSkills = skillsReport?.skills || [];
  const skills = allSkills.filter((sk) => {
    if (filter === 'ready') return sk.eligible;
    if (filter === 'notReady') return !sk.eligible;
    return true;
  });
  const readyCount = allSkills.filter((s) => s.eligible).length;
  const notReadyCount = allSkills.filter((s) => !s.eligible).length;

  const groups: Record<string, typeof allSkills> = {};
  skills.forEach((sk) => {
    const src = sk.bundled ? '内置' : sk.source || '其他';
    if (!groups[src]) groups[src] = [];
    groups[src].push(sk);
  });

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Skills</h2>
          <button onClick={loadSkills} disabled={!isOnline || loading} className="text-xs text-indigo-400 hover:underline disabled:opacity-40">
            {loading ? '加载中…' : '刷新'}
          </button>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            Gateway 未连接
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {[
                { key: 'ready' as const, label: `就绪 (${readyCount})` },
                { key: 'notReady' as const, label: `未就绪 (${notReadyCount})` },
                { key: 'all' as const, label: `全部 (${allSkills.length})` },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                    filter === key
                      ? key === 'ready'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : key === 'notReady'
                          ? 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                      : 'bg-white/5 text-muted-foreground hover:bg-white/10'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {skills.length === 0 ? (
              <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
                <Puzzle className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">{!loading ? '暂无技能' : '加载中…'}</p>
              </div>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <p className="text-xs font-bold text-muted-foreground uppercase mb-2">{group} ({items.length})</p>
                  <div className="space-y-1">
                    {items.map((sk) => (
                      <div
                        key={sk.name}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b]"
                      >
                        <div className={cn('w-2 h-2 rounded-full shrink-0', sk.eligible ? 'bg-emerald-500' : 'bg-slate-500/50')} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{sk.name}</p>
                          {sk.description && <p className="text-[11px] text-muted-foreground truncate">{sk.description}</p>}
                        </div>
                        <span
                          className={cn(
                            'text-xs px-1.5 py-0.5 rounded-full font-bold shrink-0',
                            sk.eligible ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                          )}
                        >
                          {sk.eligible ? '就绪' : '未就绪'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ChannelsTab({
  agent,
  channels,
  onAddChannel,
  onRemoveChannel,
}: {
  agent: AgentSummary;
  channels: Array<{ type: string; name: string; status: string }>;
  onAddChannel: () => void;
  onRemoveChannel: (type: ChannelType) => void;
}) {
  const runtimeByType = Object.fromEntries(channels.map((c) => [c.type, c]));
  const assigned = agent.channelTypes.map((t) => ({
    type: t as ChannelType,
    name: runtimeByType[t]?.name || CHANNEL_NAMES[t as ChannelType] || t,
    status: runtimeByType[t]?.status ?? 'disconnected',
  }));

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Channels</h2>
            <p className="text-sm text-muted-foreground mt-1">渠道连接状态</p>
          </div>
          <Button
            onClick={onAddChannel}
            className="bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-500/40"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </div>
        {assigned.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm mb-2">暂无渠道</p>
            <Button variant="outline" size="sm" onClick={onAddChannel} className="border-indigo-500/40">
              Add Channel
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {assigned.map((ch) => (
              <div
                key={ch.type}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                    <span className="text-lg">{CHANNEL_ICONS[ch.type] || '💬'}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{ch.name}</p>
                    <p className="text-xs text-muted-foreground">{CHANNEL_NAMES[ch.type] || ch.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium',
                      ch.status === 'connected'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-500/20 text-slate-400'
                    )}
                  >
                    {ch.status}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/20"
                    onClick={() => onRemoveChannel(ch.type)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CronTab({
  jobs,
  onRefresh,
  isOnline,
}: {
  jobs: Array<{ id: string; name: string; schedule: unknown; enabled: boolean; lastRun?: { time?: string } }>;
  onRefresh: () => void;
  isOnline: boolean;
}) {
  const safe = Array.isArray(jobs) ? jobs : [];

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Cron Jobs</h2>
            <p className="text-sm text-muted-foreground mt-1">定时任务</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh()}
            disabled={!isOnline}
            className="border-indigo-500/40"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            刷新
          </Button>
        </div>
        {!isOnline ? (
          <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-8 text-center text-muted-foreground">
            Gateway 未连接
          </div>
        ) : safe.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
            <Calendar className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">暂无定时任务</p>
          </div>
        ) : (
          <div className="space-y-3">
            {safe.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{job.name}</p>
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {formatSchedule(job.schedule)}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-lg text-xs font-medium',
                    job.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  )}
                >
                  {job.enabled ? '运行中' : '已暂停'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const SCENARIO_TEMPLATES = [
  {
    id: 'tech-assistant',
    title: '技术助手',
    desc: '编程、调试、代码审查、技术文档编写',
    icon: Laptop,
    iconColor: 'text-blue-400',
    tag: '开发',
    tagColor: 'bg-blue-500/20 text-blue-400',
  },
  {
    id: 'translator',
    title: '翻译助手',
    desc: '多语言翻译、本地化、术语一致性',
    icon: Languages,
    iconColor: 'text-emerald-400',
    tag: '语言',
    tagColor: 'bg-emerald-500/20 text-emerald-400',
  },
  {
    id: 'writer',
    title: '写作助手',
    desc: '文章撰写、润色、结构化写作',
    icon: PenTool,
    iconColor: 'text-amber-400',
    tag: '内容',
    tagColor: 'bg-amber-500/20 text-amber-400',
  },
  {
    id: 'content-factory',
    title: '内容工厂',
    desc: '研究 → 撰写 → 编辑 → 发布的完整内容生产流水线',
    icon: BookOpen,
    iconColor: 'text-violet-400',
    tag: '工作流',
    tagColor: 'bg-violet-500/20 text-violet-400',
  },
];

function ScenariosTab() {
  const handleApply = (id: string) => {
    toast.info('场景应用需配合 OpenClaw 模板系统。请确保 Gateway 已配置并支持 templates API。', {
      description: `场景 ID: ${id}`,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">场景库</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ClawDeckX 风格：从场景库选择模板，一键应用到 Agent 工作区（IDENTITY.md、USER.md 等）
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCENARIO_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-5 hover:border-indigo-500/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-[#0f172a]', tpl.iconColor)}>
                  <tpl.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{tpl.title}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', tpl.tagColor)}>
                      {tpl.tag}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.desc}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 h-8 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/10"
                    onClick={() => handleApply(tpl.id)}
                  >
                    应用到当前 Agent
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border-2 border-indigo-500/20 bg-[#0f172a]/50 p-4">
          <p className="text-xs text-muted-foreground">
            💡 场景模板需配合 OpenClaw 模板系统使用。配置 Gateway 后，可从场景库选择并应用到当前 Agent 的 IDENTITY.md、USER.md 等工作区文件。
          </p>
        </div>
      </div>
    </div>
  );
}

function MultiAgentTab({
  selectedWorkflow,
  onSelectWorkflow,
  deploymentMode,
  onDeploymentModeChange,
}: {
  selectedWorkflow: string;
  onSelectWorkflow: (id: string) => void;
  deploymentMode: 'enhance' | 'independent';
  onDeploymentModeChange: (m: 'enhance' | 'independent') => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto py-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">多代理协作</h2>
          <p className="text-sm text-muted-foreground mt-1">
            ClawDeckX 风格：部署多代理协作工作流，实现复杂自动化任务
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              工作流模板
            </p>
            <div className="space-y-2 max-h-[320px] overflow-y-auto">
              {WORKFLOW_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => onSelectWorkflow(tpl.id)}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-colors',
                    selectedWorkflow === tpl.id
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-indigo-500/20 hover:border-indigo-500/40 bg-[#1e293b]'
                  )}
                >
                  <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', tpl.iconColor)}>
                    <tpl.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{tpl.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.desc}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-muted-foreground">{tpl.roles} Agent Roles</span>
                      <span className={cn('text-[10px] px-2 py-0.5 rounded-full', tpl.tagColor)}>
                        {tpl.tag}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                部署模式
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => onDeploymentModeChange('enhance')}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-colors',
                    deploymentMode === 'enhance'
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-indigo-500/20 hover:border-indigo-500/40 bg-[#1e293b]'
                  )}
                >
                  <Sparkles className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">增强当前 Agent</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        推荐
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      为当前 Agent 添加工作流能力，使其可调用子代理。
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => onDeploymentModeChange('independent')}
                  className={cn(
                    'w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-colors',
                    deploymentMode === 'independent'
                      ? 'border-indigo-500/60 bg-indigo-500/10'
                      : 'border-indigo-500/20 hover:border-indigo-500/40 bg-[#1e293b]'
                  )}
                >
                  <Rocket className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">部署独立子代理</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        高级
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      创建多个独立子代理，供主代理调用。
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl border-2 border-emerald-500/40">
              <Play className="h-5 w-5 mr-2" />
              部署
            </Button>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                团队成员
              </p>
              <div className="flex flex-wrap gap-4">
                {TEAM_ROLES.map((role) => (
                  <div key={role.id} className="flex flex-col items-center gap-2">
                    <div className={cn('h-10 w-10 rounded-full bg-[#1e293b] border-2 border-indigo-500/20 flex items-center justify-center', role.color)}>
                      <role.icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs text-foreground/80">{role.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentsAddDialogInline({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const { t } = useTranslation('agents');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate(name.trim());
      onClose();
    } catch (e) {
      toast.error(t('toast.agentCreateFailed', { error: String(e) }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] border-2 border-indigo-500/40 rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-foreground mb-2">{t('createDialog.title')}</h3>
        <p className="text-sm text-muted-foreground mb-4">{t('createDialog.description')}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('createDialog.namePlaceholder')}
          className="w-full h-11 px-3 rounded-xl bg-[#0f172a] border-2 border-indigo-500/30 text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="border-indigo-500/40 text-foreground">
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim()}
            className="bg-indigo-500 hover:bg-indigo-600 text-white border-2 border-indigo-500/40"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('common:actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AgentsView;
