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

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'files', label: 'Files', icon: FileText },
  { id: 'tools', label: 'Tools', icon: Wrench },
  { id: 'skills', label: 'Skills', icon: Puzzle },
  { id: 'channels', label: 'Channels', icon: MessageSquare },
  { id: 'cron', label: 'Cron Jobs', icon: Calendar },
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'scenarios', label: 'Scenarios', icon: FileText },
  { id: 'multi-agent', label: 'Multi-Agent', icon: Sparkles },
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
    deleteAgent,
    assignChannel,
    removeChannel,
  } = useAgentsStore();
  const { channels, fetchChannels } = useChannelsStore();
  const { jobs, fetchJobs } = useCronStore();
  const { skills, fetchSkills } = useSkillsStore();
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
    await deleteAgent(agentToDelete.id);
    setAgentToDelete(null);
    if (selectedAgentId === agentToDelete.id) {
      setSelectedAgentId(safeAgents[0]?.id ?? null);
    }
    toast.success(t('toast.agentDeleted'));
  }, [agentToDelete, deleteAgent, selectedAgentId, safeAgents, t]);

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
    <div className="flex h-full bg-[#0f172a] text-white overflow-hidden -m-6">
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
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-indigo-500/20">
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
              <div className="flex items-center gap-2">
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
            <div className="shrink-0 flex items-center gap-1 px-6 py-2 border-b border-indigo-500/20 overflow-x-auto">
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
              {activeTab === 'files' && <FilesTab />}
              {activeTab === 'tools' && <ToolsTab />}
              {activeTab === 'skills' && <SkillsTab skills={skills} />}
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
      />

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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground mt-1">Agent 基本信息与配置</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Agent ID</p>
            <p className="font-mono text-sm text-foreground">{agent.id}</p>
          </div>
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Model</p>
            <p className="text-sm text-foreground">
              {agent.modelDisplay}
              {agent.inheritedModel ? ' (inherited)' : ''}
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

function FilesTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground">Files</h2>
        <p className="text-sm text-muted-foreground mt-1">工作区文件（IDENTITY.md、USER.md 等）</p>
        <div className="mt-6 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">文件管理功能开发中</p>
        </div>
      </div>
    </div>
  );
}

function ToolsTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground">Tools</h2>
        <p className="text-sm text-muted-foreground mt-1">可用工具配置</p>
        <div className="mt-6 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
          <Wrench className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">工具配置功能开发中</p>
        </div>
      </div>
    </div>
  );
}

function SkillsTab({ skills }: { skills: Array<{ id: string; slug?: string; name: string; enabled?: boolean }> }) {
  const safe = Array.isArray(skills) ? skills : [];
  const enabled = safe.filter((s) => s.enabled).length;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground">Skills</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {enabled}/{safe.length} 已启用
        </p>
        {safe.length === 0 ? (
          <div className="mt-6 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
            <Puzzle className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">暂无技能</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {safe.slice(0, 20).map((s) => (
              <div
                key={s.id}
                className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-3 flex items-center justify-between"
              >
                <span className="text-sm font-medium text-foreground">{s.name || s.slug || s.id}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-lg text-xs',
                    s.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-400'
                  )}
                >
                  {s.enabled ? '已启用' : '已禁用'}
                </span>
              </div>
            ))}
            {safe.length > 20 && (
              <p className="text-xs text-muted-foreground text-center py-2">共 {safe.length} 个技能</p>
            )}
          </div>
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
    <div className="flex-1 overflow-y-auto p-6">
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
    <div className="flex-1 overflow-y-auto p-6">
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

function ScenariosTab() {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl">
        <h2 className="text-lg font-semibold text-foreground">Scenarios</h2>
        <p className="text-sm text-muted-foreground mt-1">场景模板</p>
        <div className="mt-6 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-8 flex flex-col items-center justify-center text-muted-foreground">
          <FileText className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">场景库功能开发中</p>
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
    <div className="flex-1 overflow-y-auto p-6">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Multi-Agent</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Deploy multi-agent collaboration workflows for complex automation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Workflow Templates
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
                Choose Deployment Mode
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
                      <h3 className="text-sm font-semibold text-foreground">Enhance Existing Agent</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        Recommended for beginners
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add workflow capabilities to the current agent, enabling it to call subagents.
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
                      <h3 className="text-sm font-semibold text-foreground">Deploy Independent Subagents</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                        Advanced usage
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Create multiple independent subagents that can be called by the main agent.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl border-2 border-emerald-500/40">
              <Play className="h-5 w-5 mr-2" />
              Run
            </Button>

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                Team Members
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
