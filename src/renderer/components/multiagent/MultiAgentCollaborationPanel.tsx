/**
 * 多代理协作 — 布局与内容与 AxonClawX MultiAgentCollaborationV2 对齐
 * 模板数据：official-multi-agent/*.json（与 AxonClawX 同源）
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Users,
  Factory,
  Search,
  SquarePen,
  ClipboardList,
  Send,
  Cloud,
  Dna,
  FlaskConical,
  BarChart3,
  Brain,
  Gavel,
  Hand,
  Headphones,
  UserCog,
  Download,
  Shuffle,
  Lightbulb,
  ClipboardCheck,
  Activity,
  AlertTriangle,
  Wrench,
  Megaphone,
  Sparkles,
  Rocket,
  Play,
  Bot,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { OFFICIAL_MULTI_AGENT_TEMPLATES } from '@/data/official-multi-agent/templates';
import { MULTI_AGENT_TEMPLATE_ZH } from '@/data/official-multi-agent/zh-labels';
import type { MultiAgentTemplate, TemplateAgent } from '@/types/multi-agent-template';
import { agentFileGet, agentFileSet } from '@/services/agent-api';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';

const MA = {
  title: '多代理协作',
  subtitle: '部署多代理协作工作流，实现复杂任务自动化',
  loading: '加载模板…',
  agents: '代理角色',
  selectTemplate: '选择模板以查看详情',
  deployModeTitle: '选择部署方式',
  deployModeEnhance: '增强现有代理',
  deployModeEnhanceDesc: '将工作流能力添加到当前代理，让它学会调用子代理。适合快速体验、单代理场景。',
  deployModeEnhanceRecommend: '推荐',
  deployModeDeploy: '部署独立子代理',
  deployModeDeployDesc: '创建多个独立的子代理，可被主代理调用。适合复杂任务、需要专业分工。',
  deployModeDeployAdvanced: '高级',
  runWorkflow: '运行工作流',
  teamMembers: '团队成员',
  workflow: '工作流程',
  parallel: '并行',
  useCases: '使用场景',
  requirements: '前置要求',
  collaborationTipTitle: '💡 多代理协作说明',
  collaborationTipDesc:
    '选择「增强现有代理」让主代理学会调用子代理，或选择「部署子代理」创建独立的专业代理。部署后，主代理会自动使用 sessions_spawn 工具调用合适的子代理完成任务。',
  workflowSequential: '顺序',
  workflowParallel: '并行',
  workflowCollaborative: '协作',
  workflowEventDriven: '事件驱动',
  workflowRouting: '路由',
  runTaskPlaceholder: '描述这个工作流要执行的初始任务…',
  runSend: '发送到主代理',
  noDefaultAgent: '未找到默认主代理，请先在列表中设置默认代理。',
  quickOk: '已写入 SOUL.md / HEARTBEAT.md',
  quickFail: '增强失败',
  deployOk: '部署成功',
  deployFail: '部署失败',
  runOk: '已发送',
  runFail: '发送失败',
};

const ICONS: Record<string, LucideIcon> = {
  factory: Factory,
  biotech: Dna,
  cloud: Cloud,
  support_agent: Headphones,
  analytics: BarChart3,
  search: Search,
  edit: SquarePen,
  rate_review: ClipboardList,
  publish: Send,
  science: FlaskConical,
  psychology: Brain,
  gavel: Gavel,
  waving_hand: Hand,
  headset_mic: Headphones,
  supervisor_account: UserCog,
  download: Download,
  transform: Shuffle,
  insights: Lightbulb,
  assessment: ClipboardCheck,
  monitor_heart: Activity,
  emergency: AlertTriangle,
  engineering: Wrench,
  campaign: Megaphone,
  groups: Users,
};

function MaterialIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || Bot;
  return <Icon className={className} />;
}

function resolveZh(template: MultiAgentTemplate): { name: string; description: string } {
  const zh = MULTI_AGENT_TEMPLATE_ZH[template.id];
  if (zh) return zh;
  return { name: template.metadata.name, description: template.metadata.description };
}

export interface MultiAgentCollaborationPanelProps {
  /** 用于「增强现有代理」写入文件的目标代理（通常为默认主代理） */
  defaultAgentId: string | null | undefined;
  /** 完整部署成功后回调 */
  onDeploy?: () => void;
  isOnline: boolean;
}

export const MultiAgentCollaborationPanel: React.FC<MultiAgentCollaborationPanelProps> = ({
  defaultAgentId,
  onDeploy,
  isOnline,
}) => {
  const templates = OFFICIAL_MULTI_AGENT_TEMPLATES;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [runTask, setRunTask] = useState('');
  const [runBusy, setRunBusy] = useState(false);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) || null,
    [templates, selectedId],
  );

  const getWorkflowTypeLabel = useCallback((type: string) => {
    const labels: Record<string, string> = {
      sequential: MA.workflowSequential,
      parallel: MA.workflowParallel,
      collaborative: MA.workflowCollaborative,
      'event-driven': MA.workflowEventDriven,
      routing: MA.workflowRouting,
    };
    return labels[type] || type;
  }, []);

  const getWorkflowTypeColor = useCallback((type: string) => {
    const colors: Record<string, string> = {
      sequential: 'bg-blue-500/10 text-blue-400',
      parallel: 'bg-green-500/10 text-green-400',
      collaborative: 'bg-purple-500/10 text-purple-400',
      'event-driven': 'bg-orange-500/10 text-orange-400',
      routing: 'bg-cyan-500/10 text-cyan-400',
    };
    return colors[type] || 'bg-slate-500/10 text-slate-400';
  }, []);

  const handleQuickDeploy = useCallback(
    async (template: MultiAgentTemplate) => {
      if (!defaultAgentId) {
        toast.error(MA.noDefaultAgent);
        return;
      }
      if (!isOnline) {
        toast.error('Gateway 离线，无法读写代理文件');
        return;
      }
      setEnhancing(true);
      try {
        const workflowId = template.id;
        const blockStart = `<!-- workflow:${workflowId} -->`;
        const blockEnd = `<!-- /workflow:${workflowId} -->`;
        const zh = resolveZh(template);
        const agentIds = template.content.agents.map((a) => a.id);
        const agentList = template.content.agents
          .map((agent) => `- **${agent.id}**: ${agent.name} - ${agent.role}`)
          .join('\n');
        const workflowSteps = template.content.workflow.steps
          .map((step, idx) => `${idx + 1}. ${step.agent || (step.agents || []).join(', ')}: ${step.action}`)
          .join('\n');

        const soulBlock = `
${blockStart}
## ${zh.name}

${zh.description}

### Available Subagents

${agentList}

### How to Use

When you receive a task related to this workflow, use the \`sessions_spawn\` tool to delegate to the appropriate subagent:

\`\`\`
sessions_spawn(task="your task description", agentId="agent-id")
\`\`\`

### Workflow Steps

${workflowSteps}

### Tips

- Analyze the task first, then decide which subagent is most suitable
- You can spawn multiple subagents for complex tasks
- Subagents will automatically report back when they complete their work
- Available agent IDs: ${agentIds.join(', ')}
${blockEnd}
`;

        const heartbeatBlock = `
${blockStart}
## ${zh.name} Workflow

${template.content.workflow.steps
  .map((step, idx) => `- [ ] Step ${idx + 1} (${step.agent || (step.agents || []).join(', ')}): ${step.action}`)
  .join('\n')}
${blockEnd}
`;

        for (const file of ['SOUL.md', 'HEARTBEAT.md'] as const) {
          const res = await agentFileGet(defaultAgentId, file);
          const cur = (res?.file?.content as string) || '';
          const block = file === 'SOUL.md' ? soulBlock : heartbeatBlock;
          if (cur.includes(blockStart)) {
            toast.message(`「${zh.name}」在 ${file} 中已存在，已跳过重复块`);
            continue;
          }
          await agentFileSet(defaultAgentId, file, cur + block);
        }
        toast.success(MA.quickOk);
        onDeploy?.();
      } catch (e) {
        toast.error(`${MA.quickFail}: ${e}`);
      } finally {
        setEnhancing(false);
      }
    },
    [defaultAgentId, isOnline, onDeploy],
  );

  const handleFullDeploy = useCallback(
    async (template: MultiAgentTemplate) => {
      setDeploying(template.id);
      try {
        const zh = resolveZh(template);
        const deployRequest = {
          template: {
            id: template.id,
            name: zh.name,
            description: zh.description,
            agents: template.content.agents.map((agent) => ({
              id: agent.id,
              name: agent.name,
              role: agent.role,
              description: agent.description || agent.soulSnippet || '',
              icon: agent.icon,
              color: agent.color,
              soul: `# ${agent.name}\n\n**Role:** ${agent.role}\n\n${agent.description || agent.soulSnippet || ''}`,
            })),
            workflow: template.content.workflow,
          },
          prefix: template.id,
          skipExisting: true,
        };

        const result = await hostApiFetch<{
          success?: boolean;
          deployedCount?: number;
          errors?: string[];
        }>('/api/v1/multi-agent/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deployRequest),
        });

        if (result?.success) {
          toast.success(`${MA.deployOk} (${result.deployedCount ?? 0} agents)`);
          onDeploy?.();
        } else {
          toast.error(result?.errors?.join(', ') || MA.deployFail);
        }
      } catch (e) {
        toast.error(`${MA.deployFail}: ${e}`);
      } finally {
        setDeploying(null);
      }
    },
    [onDeploy],
  );

  const handleRunWorkflow = useCallback(async () => {
    if (!defaultAgentId || !runTask.trim()) return;
    setRunBusy(true);
    try {
      const rpc = useGatewayStore.getState().rpc;
      await rpc('chat.send', {
        sessionKey: `${defaultAgentId}:main`,
        message: `[工作流] ${runTask.trim()}`,
        idempotencyKey: `ma-run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      });
      toast.success(MA.runOk);
      setRunTask('');
    } catch (e) {
      toast.error(`${MA.runFail}: ${e}`);
    } finally {
      setRunBusy(false);
    }
  }, [defaultAgentId, runTask]);

  return (
    <div className="space-y-4 max-w-6xl">
      <div>
        <h3 className="text-sm font-bold text-foreground">{MA.title}</h3>
        <p className="text-[11px] text-muted-foreground mt-0.5">{MA.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          {templates.map((template) => {
            const zh = resolveZh(template);
            const metaIcon = template.metadata.icon;
            const color = template.metadata.color || 'from-purple-500 to-pink-500';
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={cn(
                  'w-full text-start p-3 rounded-xl border transition-all',
                  selectedId === template.id
                    ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                    : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center shrink-0 text-white',
                      color,
                    )}
                  >
                    <MaterialIcon name={metaIcon} className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[12px] font-bold text-foreground truncate">{zh.name}</h4>
                    <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{zh.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[9px] text-muted-foreground/80">
                        {template.content.agents.length} {MA.agents}
                      </span>
                      <span
                        className={cn(
                          'px-1.5 py-0.5 rounded text-[9px] font-bold',
                          getWorkflowTypeColor(template.content.workflow.type),
                        )}
                      >
                        {getWorkflowTypeLabel(template.content.workflow.type)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white',
                      selectedTemplate.metadata.color || 'from-purple-500 to-pink-500',
                    )}
                  >
                    <MaterialIcon name={selectedTemplate.metadata.icon} className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground">{resolveZh(selectedTemplate).name}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {resolveZh(selectedTemplate).description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-b border-white/[0.06]">
                <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{MA.deployModeTitle}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => void handleQuickDeploy(selectedTemplate)}
                    disabled={
                      enhancing || deploying === selectedTemplate.id || !defaultAgentId || !isOnline
                    }
                    className="p-4 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10 disabled:opacity-50 text-start transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-indigo-400" />
                      <span className="text-[12px] font-bold text-indigo-400">{MA.deployModeEnhance}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400">
                        {MA.deployModeEnhanceRecommend}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{MA.deployModeEnhanceDesc}</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleFullDeploy(selectedTemplate)}
                    disabled={deploying === selectedTemplate.id || enhancing}
                    className="p-4 rounded-xl border border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02] disabled:opacity-50 text-start transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Rocket className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[12px] font-bold text-foreground/90">{MA.deployModeDeploy}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400">
                        {MA.deployModeDeployAdvanced}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{MA.deployModeDeployDesc}</p>
                  </button>
                </div>

                <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-2">
                  <p className="text-[10px] text-muted-foreground">{MA.runWorkflow}</p>
                  <textarea
                    value={runTask}
                    onChange={(e) => setRunTask(e.target.value)}
                    placeholder={MA.runTaskPlaceholder}
                    rows={2}
                    disabled={!isOnline || !defaultAgentId}
                    className="w-full px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-[11px] text-foreground resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500/30 placeholder:text-muted-foreground"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleRunWorkflow()}
                    disabled={runBusy || !runTask.trim() || !defaultAgentId || !isOnline}
                    className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  >
                    {runBusy ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 inline animate-spin" />
                        发送中…
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2 inline" />
                        {MA.runSend}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="p-4 border-b border-white/[0.06]">
                <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">{MA.teamMembers}</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {selectedTemplate.content.agents.map((agent: TemplateAgent) => (
                    <div key={agent.id} className="text-center">
                      <div
                        className={cn(
                          'w-12 h-12 mx-auto rounded-xl flex items-center justify-center mb-2 text-white',
                          agent.color || 'bg-slate-500',
                        )}
                      >
                        <MaterialIcon name={agent.icon} className="w-5 h-5" />
                      </div>
                      <p className="text-[11px] font-bold text-foreground/90">{agent.name}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5 line-clamp-2">{agent.role}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={cn(
                      'px-2 py-1 rounded text-[10px] font-bold',
                      getWorkflowTypeColor(selectedTemplate.content.workflow.type),
                    )}
                  >
                    {getWorkflowTypeLabel(selectedTemplate.content.workflow.type)}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{selectedTemplate.content.workflow.description}</span>
                </div>
                <div className="relative">
                  <div className="absolute start-4 top-0 bottom-0 w-0.5 bg-white/10" />
                  <div className="space-y-3">
                    {selectedTemplate.content.workflow.steps.map((step, idx) => {
                      const agentIds = step.agents || (step.agent ? [step.agent] : []);
                      const agentsResolved = agentIds
                        .map((id) => selectedTemplate.content.agents.find((a) => a.id === id))
                        .filter(Boolean) as TemplateAgent[];

                      return (
                        <div key={idx} className="relative flex items-start gap-3 ps-8">
                          <div className="absolute start-2.5 top-1 w-3 h-3 rounded-full bg-indigo-500 border-2 border-[#0f172a]" />
                          <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-2">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {agentsResolved.map((ag) => (
                                <span
                                  key={ag.id}
                                  className={cn(
                                    'px-1.5 py-0.5 rounded text-[9px] font-bold text-white',
                                    ag.color || 'bg-slate-500',
                                  )}
                                >
                                  {ag.name}
                                </span>
                              ))}
                              {step.parallel && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-500/10 text-green-400">
                                  {MA.parallel}
                                </span>
                              )}
                              {step.condition && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400">
                                  {step.condition}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground">{step.action}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {selectedTemplate.content.examples && selectedTemplate.content.examples.length > 0 && (
                <div className="p-4">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{MA.useCases}</h4>
                  <div className="space-y-1">
                    {selectedTemplate.content.examples.map((ex, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[10px]">
                        <span className="text-indigo-400 shrink-0">•</span>
                        <span className="text-muted-foreground">{ex}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTemplate.requirements &&
                (selectedTemplate.requirements.skills?.length || selectedTemplate.requirements.channels?.length) ? (
                <div className="p-4 border-t border-white/[0.06] bg-black/20">
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">{MA.requirements}</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplate.requirements.skills?.map((skill) => (
                      <span key={skill} className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] text-blue-400">
                        {skill}
                      </span>
                    ))}
                    {selectedTemplate.requirements.channels?.map((ch) => (
                      <span key={ch} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] text-emerald-400">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.02] flex items-center justify-center min-h-[16rem]">
              <div className="text-center px-4">
                <Users className="w-8 h-8 mx-auto text-muted-foreground/30" />
                <p className="mt-2 text-[11px] text-muted-foreground">{MA.selectTemplate}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 rounded-xl bg-purple-500/5 border border-purple-500/20">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-[12px] font-bold text-purple-200 mb-1">{MA.collaborationTipTitle}</h4>
            <p className="text-[11px] text-purple-300/80 leading-relaxed">{MA.collaborationTipDesc}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiAgentCollaborationPanel;
