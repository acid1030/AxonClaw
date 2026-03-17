/**
 * AxonClaw - Agents View
 * ClawDeckX 风格：左侧 Agent 列表 + 右侧详情（含 Multi-Agent 等标签页）
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
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { AgentSummary } from '@/types/agent';
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

export const AgentsView: React.FC = () => {
  const { t } = useTranslation('agents');
  const {
    agents,
    loading,
    fetchAgents,
    createAgent,
    deleteAgent,
  } = useAgentsStore();
  const { channels, fetchChannels } = useChannelsStore();

  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('multi-agent');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [agentToDelete, setAgentToDelete] = useState<AgentSummary | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('content-factory');
  const [deploymentMode, setDeploymentMode] = useState<'enhance' | 'independent'>('enhance');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    void Promise.all([fetchAgents(), fetchChannels()]);
  }, [fetchAgents, fetchChannels]);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) ?? agents[0] ?? null;
  const safeAgents = Array.isArray(agents) ? agents : [];

  useEffect(() => {
    if (!selectedAgentId && safeAgents.length > 0) {
      setSelectedAgentId(safeAgents[0].id);
    }
  }, [selectedAgentId, safeAgents]);

  const handleRefresh = useCallback(() => {
    void Promise.all([fetchAgents(), fetchChannels()]);
  }, [fetchAgents, fetchChannels]);

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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d1117]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex h-full bg-[#0d1117] text-white overflow-hidden">
      {/* Left Sidebar */}
      <aside className="w-64 shrink-0 flex flex-col border-r border-white/10 bg-[#161b22]">
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-white">Agents</h2>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-white/50">{safeAgents.length} agents</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {safeAgents.map((agent) => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                selectedAgentId === agent.id
                  ? 'bg-blue-500/20 text-white'
                  : 'hover:bg-white/5 text-white/80'
              )}
            >
              <div className="h-9 w-9 shrink-0 rounded-full bg-blue-500/30 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {(agent.name || agent.id || 'A').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{agent.name}</p>
                <p className="text-xs text-white/50 truncate">{agent.id}</p>
              </div>
              {agent.isDefault && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 shrink-0">
                  default
                </span>
              )}
            </button>
          ))}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedAgent ? (
          <>
            {/* Agent Header */}
            <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/30 flex items-center justify-center">
                  <span className="text-base font-medium">
                    {(selectedAgent.name || selectedAgent.id).charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">{selectedAgent.name}</h1>
                  <p className="text-xs text-white/50">{selectedAgent.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  title="History"
                >
                  <Clock className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                  title="Edit"
                  onClick={() => setShowSettingsModal(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                {!selectedAgent.isDefault && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                    title="Delete"
                    onClick={() => setAgentToDelete(selectedAgent)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="shrink-0 flex items-center gap-1 px-6 py-2 border-b border-white/10 overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap',
                    activeTab === tab.id
                      ? 'text-blue-400 border-b-2 border-blue-400 -mb-[1px]'
                      : 'text-white/60 hover:text-white'
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'multi-agent' ? (
                <MultiAgentTab
                  selectedWorkflow={selectedWorkflow}
                  onSelectWorkflow={setSelectedWorkflow}
                  deploymentMode={deploymentMode}
                  onDeploymentModeChange={setDeploymentMode}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-white/50">
                  <Bot className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">
                    {TABS.find((t) => t.id === activeTab)?.label ?? activeTab} — Coming soon
                  </p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-white/50">
            <Bot className="h-16 w-16 mb-4 opacity-50" />
            <p className="text-sm mb-4">No agents yet</p>
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Agent
            </Button>
          </div>
        )}
      </main>

      {/* Add Agent Dialog */}
      {showAddDialog && (
        <AgentsAddDialogInline
          onClose={() => setShowAddDialog(false)}
          onCreate={handleAddAgent}
        />
      )}

      {/* Settings Modal - full agent settings from Agents page */}
      {showSettingsModal && selectedAgent && (
        <AgentSettingsModal
          agent={selectedAgent}
          channels={channels}
          onClose={() => setShowSettingsModal(false)}
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
    </div>
  );
};

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Multi-Agent</h2>
        <p className="text-sm text-white/60 mt-1">
          Deploy multi-agent collaboration workflows for complex automation
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Workflow Templates */}
        <div className="lg:col-span-2 space-y-3">
          <p className="text-xs font-medium text-white/60 uppercase tracking-wider">
            Workflow Templates
          </p>
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {WORKFLOW_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => onSelectWorkflow(tpl.id)}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors',
                  selectedWorkflow === tpl.id
                    ? 'border-blue-500/60 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                )}
              >
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', tpl.iconColor)}>
                  <tpl.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white">{tpl.title}</h3>
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">{tpl.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-white/50">{tpl.roles} Agent Roles</span>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full', tpl.tagColor)}>
                      {tpl.tag}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Deployment Mode + Team */}
        <div className="space-y-6">
          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">
              Choose Deployment Mode
            </p>
            <div className="space-y-2">
              <button
                onClick={() => onDeploymentModeChange('enhance')}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors',
                  deploymentMode === 'enhance'
                    ? 'border-blue-500/60 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                )}
              >
                <Sparkles className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Enhance Existing Agent</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      Recommended for beginners
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    Add workflow capabilities to the current agent, enabling it to call subagents.
                    Best for quick start and single-agent scenarios.
                  </p>
                </div>
              </button>
              <button
                onClick={() => onDeploymentModeChange('independent')}
                className={cn(
                  'w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-colors',
                  deploymentMode === 'independent'
                    ? 'border-blue-500/60 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-white/5'
                )}
              >
                <Rocket className="h-5 w-5 text-white/60 shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Deploy Independent Subagents</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Advanced usage
                    </span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    Create multiple independent subagents that can be called by the main agent.
                    Best for complex tasks requiring specialized roles.
                  </p>
                </div>
              </button>
            </div>
          </div>

          <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl">
            <Play className="h-5 w-5 mr-2" />
            Run
          </Button>

          <div>
            <p className="text-xs font-medium text-white/60 uppercase tracking-wider mb-3">
              Team Members
            </p>
            <div className="flex flex-wrap gap-4">
              {TEAM_ROLES.map((role) => (
                <div key={role.id} className="flex flex-col items-center gap-2">
                  <div className={cn('h-10 w-10 rounded-full bg-white/10 flex items-center justify-center', role.color)}>
                    <role.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-white/70">{role.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Inline Add Agent Dialog */
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
        className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-white mb-2">{t('createDialog.title')}</h3>
        <p className="text-sm text-white/60 mb-4">{t('createDialog.description')}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('createDialog.namePlaceholder')}
          className="w-full h-11 px-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 outline-none focus:border-blue-500"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white/80">
            {t('common:actions.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={saving || !name.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : t('common:actions.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AgentsView;
