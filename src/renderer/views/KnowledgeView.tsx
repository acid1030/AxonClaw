/**
 * AxonClaw - 知识中心 (KnowledgeCenter)
 * AxonClawX 完整复刻：场景模板、多代理、代理预设、知识库、搜索
 * 原知识库+知识百科内容作为「知识库」Tab 子页面
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import {
  BookOpen,
  Lightbulb,
  Code,
  HelpCircle,
  LayoutGrid,
  Star,
  Copy,
  Check,
  X,
  Search,
  Database,
  Zap,
  Settings2,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Sparkles,
  Users,
  User,
  Eye,
  MessageCircle,
  Mail,
  Calendar,
  CheckSquare,
  Contact,
  Brain,
  Briefcase,
  Share2,
  PenLine,
  Terminal,
  GraduationCap,
  Banknote,
  Home,
  GitBranch,
  Bot,
} from 'lucide-react';
import { getKnowledgeItems, type KnowledgeItem, type KnowledgeItemType } from '@/services/knowledge-service';
import { getScenes, SCENE_CATEGORIES, type SceneTemplate, type SceneCategory } from '@/data/scenes';
import { WORKFLOW_TEMPLATES } from '@/data/multi-agent';
import { AGENT_PRESETS } from '@/data/agent-presets';
import {
  getRecentKnowledgeEntries,
  searchKnowledgeBase,
  getKnowledgeStats,
  type KnowledgeBaseEntry,
  type KnowledgeBaseCategory,
  CATEGORY_STYLES,
} from '@/services/knowledge-base-service';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_CONFIG: Record<KnowledgeItemType, { icon: typeof BookOpen; colorClass: string; borderColor: string; iconBg: string; iconColor: string }> = {
  recipe: { icon: BookOpen, colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-500', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
  tip: { icon: Lightbulb, colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', borderColor: 'border-l-emerald-500', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
  snippet: { icon: Code, colorClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-500', iconBg: 'bg-blue-500/10', iconColor: 'text-blue-500' },
  faq: { icon: HelpCircle, colorClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', borderColor: 'border-l-purple-500', iconBg: 'bg-purple-500/10', iconColor: 'text-purple-500' },
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/10 text-green-600 dark:text-green-400',
  medium: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  hard: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

const KB_CATEGORY_TABS: { id: 'all' | KnowledgeBaseCategory; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'decision', label: '技术决策' },
  { id: 'project', label: '项目文档' },
  { id: 'preference', label: '用户偏好' },
  { id: 'learning', label: '学习笔记' },
];

type FilterType = 'all' | KnowledgeItemType;

const filterTabs: { id: FilterType; label: string; icon: typeof LayoutGrid; activeColor: string }[] = [
  { id: 'all', label: '全部', icon: LayoutGrid, activeColor: 'bg-primary/15 text-primary' },
  { id: 'recipe', label: '配方', icon: BookOpen, activeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  { id: 'tip', label: '技巧', icon: Lightbulb, activeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  { id: 'snippet', label: '片段', icon: Code, activeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, activeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400' },
];

function getTypeLabel(type: KnowledgeItemType): string {
  const labels: Record<KnowledgeItemType, string> = {
    recipe: '配方',
    tip: '技巧',
    snippet: '片段',
    faq: 'FAQ',
  };
  return labels[type] || type;
}

function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

const SCENE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Mail,
  Calendar,
  CheckSquare,
  Contact,
  Brain,
  LayoutGrid,
  Briefcase,
  Share2,
  PenLine,
  Terminal,
  GraduationCap,
  Banknote,
  Home,
};

/** 主 Tab 类型 */
type PrimaryTab = 'scenes' | 'multi-agent' | 'agent-presets' | 'knowledge' | 'search';

function KnowledgeCard({ item, typeConfig, onClick }: {
  item: KnowledgeItem;
  typeConfig: (typeof TYPE_CONFIG)[KnowledgeItemType];
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'p-3.5 rounded-xl border-l-[3px] border-2 cursor-pointer transition-all hover:shadow-md',
        'border-slate-200/60 dark:border-white/[0.06] bg-[#1e293b] hover:bg-[#334155]/50',
        typeConfig.borderColor
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', typeConfig.iconBg)}>
          <typeConfig.icon className={cn('w-5 h-5', typeConfig.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {item.metadata.featured && <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            <h4 className="text-sm font-bold text-foreground truncate">{item.metadata.name}</h4>
            <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', typeConfig.colorClass)}>
              {getTypeLabel(item.type)}
            </span>
            {item.metadata.difficulty && (
              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', DIFFICULTY_COLORS[item.metadata.difficulty] || '')}>
                {item.metadata.difficulty === 'easy' ? '入门' : item.metadata.difficulty === 'medium' ? '进阶' : '高级'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.metadata.description}</p>
        </div>
      </div>
      {item.metadata.tags && item.metadata.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {item.metadata.tags.slice(0, 4).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeDetailModal({ item, typeConfig, onClose }: {
  item: KnowledgeItem;
  typeConfig: (typeof TYPE_CONFIG)[KnowledgeItemType];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copiedStepIdx, setCopiedStepIdx] = useState<number | null>(null);

  const handleCopySnippet = useCallback(() => {
    const text = item.content.snippet || '';
    copyToClipboard(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [item.content.snippet]);

  const handleCopyStep = useCallback((idx: number, code: string) => {
    copyToClipboard(code).then(() => {
      setCopiedStepIdx(idx);
      setTimeout(() => setCopiedStepIdx(null), 2000);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col border-2 border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', typeConfig.iconBg)}>
              <typeConfig.icon className={cn('w-5 h-5', typeConfig.iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {item.metadata.featured && <Star className="w-3.5 h-3.5 text-amber-500" />}
                <h3 className="text-base font-bold text-foreground">{item.metadata.name}</h3>
                <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold', typeConfig.colorClass)}>
                  {getTypeLabel(item.type)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.metadata.description}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-4">
          {item.metadata.tags && item.metadata.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.metadata.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {item.type === 'recipe' && item.content.steps && item.content.steps.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 font-bold">
                步骤 ({item.content.steps.length})
              </p>
              <div className="space-y-3">
                {item.content.steps.map((step, i) => (
                  <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                    <div className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-semibold text-foreground">{step.title}</span>
                        {step.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{step.description}</p>
                        )}
                      </div>
                    </div>
                    {step.code && (
                      <div className="mt-2">
                        <div className="flex justify-end mb-1">
                          <button
                            onClick={() => handleCopyStep(i, step.code!)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary hover:bg-primary/20"
                          >
                            {copiedStepIdx === i ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copiedStepIdx === i ? '已复制' : '复制'}
                          </button>
                        </div>
                        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed bg-black/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                          {step.code}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(item.type === 'tip' || item.type === 'recipe') && item.content.body && (
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownContent content={item.content.body} />
            </div>
          )}

          {item.type === 'snippet' && item.content.snippet && (
            <div className="space-y-2">
              <div className="relative">
                <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed bg-black/20 rounded-xl p-4 max-h-60 overflow-y-auto">
                  {item.content.snippet}
                </pre>
                <button
                  onClick={handleCopySnippet}
                  className="absolute top-2 right-2 px-2 py-1 rounded-md bg-white/10 text-[10px] font-bold text-muted-foreground hover:text-primary"
                >
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              {item.content.targetFile && (
                <p className="text-[10px] text-muted-foreground font-mono truncate">{item.content.targetFile}</p>
              )}
            </div>
          )}

          {item.type === 'faq' && (
            <div className="space-y-3">
              {item.content.question && (
                <p className="text-sm font-bold text-foreground">Q: {item.content.question}</p>
              )}
              {item.content.answer && (
                <div className="prose prose-invert prose-sm max-w-none">
                  <MarkdownContent content={item.content.answer} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** 场景配置预览弹窗 */
function ScenePreviewModal({
  scene,
  onClose,
  onApply,
}: {
  scene: SceneTemplate;
  onClose: () => void;
  onApply: () => void;
}) {
  const config = useMemo(
    () => ({
      scene: scene.name,
      description: scene.description,
      skills: Array.from({ length: scene.skillsCount }, (_, i) => `skill_${i + 1}`),
      crons:
        scene.cronCount > 0
          ? Array.from({ length: scene.cronCount }, (_, i) => ({
              schedule: i === 0 ? '0 */1 * * *' : '0 0 * * *',
              action: i === 0 ? 'heartbeat' : 'sync',
            }))
          : [],
      tags: scene.tags,
    }),
    [scene]
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col border-2 border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between py-4 px-4 border-b border-white/10">
          <div>
            <h3 className="text-base font-bold text-foreground">预览配置 · {scene.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">以下配置将应用于「{scene.name}」场景</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap bg-black/20 rounded-xl p-4">
            {JSON.stringify(config, null, 2)}
          </pre>
        </div>
        <div className="flex gap-2 p-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-white/5 hover:bg-white/10 text-foreground"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onApply}
            className="flex-1 py-2 rounded-lg text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center gap-1.5"
          >
            <Zap className="w-4 h-4" /> 一键设置
          </button>
        </div>
      </div>
    </div>
  );
}

/** 场景库 Tab - AxonClawX 场景模板 */
function SceneLibraryTab({ onNavigateTo }: { onNavigateTo?: (view: string) => void }) {
  const [sceneCategory, setSceneCategory] = useState<SceneCategory>('all');
  const [sceneSearch, setSceneSearch] = useState('');
  const [previewScene, setPreviewScene] = useState<SceneTemplate | null>(null);
  const scenes = useMemo(() => getScenes(sceneCategory, sceneSearch), [sceneCategory, sceneSearch]);

  const handleOneClickSetup = useCallback(
    (scene: SceneTemplate) => {
      toast.success(`「${scene.name}」场景已应用，请前往配置中心确认`);
      onNavigateTo?.('config');
    },
    [onNavigateTo]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">场景库</h3>
          <p className="text-xs text-muted-foreground mt-0.5">选择适合你的使用场景，一键配置</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1e293b] px-3 py-2 w-48">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="搜索场景..."
            value={sceneSearch}
            onChange={(e) => setSceneSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {SCENE_CATEGORIES.map((c) => {
          const Icon = SCENE_ICONS[c.iconName];
          return (
            <button
              key={c.id}
              onClick={() => setSceneCategory(c.id)}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all',
                sceneCategory === c.id ? 'bg-sky-500/15 text-sky-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scenes.map((scene) => {
          const Icon = SCENE_ICONS[scene.iconName] || BookOpen;
          return (
            <div
              key={scene.id}
              className="rounded-xl border border-white/10 bg-[#1e293b] p-4 flex flex-col hover:border-white/20 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: scene.iconBg, color: scene.iconColor }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-sm font-bold text-foreground">{scene.name}</h4>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold',
                        scene.difficulty === 'simple' && 'bg-emerald-500/20 text-emerald-400',
                        scene.difficulty === 'medium' && 'bg-amber-500/20 text-amber-400',
                        scene.difficulty === 'hard' && 'bg-red-500/20 text-red-400'
                      )}
                    >
                      {scene.difficulty === 'simple' ? '简单' : scene.difficulty === 'medium' ? '中等' : '高级'}
                    </span>
                    {scene.recommended && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-400">推荐</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{scene.description}</p>
                </div>
              </div>
              {scene.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {scene.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-400 text-[10px] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {scene.skillsCount} 技能
                </span>
                {scene.cronCount > 0 && (
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {scene.cronCount} 定时任务
                  </span>
                )}
              </div>
              <div className="flex gap-2 mt-auto">
                <button
                  type="button"
                  onClick={() => setPreviewScene(scene)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-foreground"
                >
                  <Eye className="w-3.5 h-3.5" /> 预览配置
                </button>
                <button
                  type="button"
                  onClick={() => handleOneClickSetup(scene)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white"
                >
                  <Zap className="w-3.5 h-3.5" /> 一键设置
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {previewScene && (
        <ScenePreviewModal
          scene={previewScene}
          onClose={() => setPreviewScene(null)}
          onApply={() => {
            handleOneClickSetup(previewScene);
            setPreviewScene(null);
          }}
        />
      )}

      {scenes.length === 0 && (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-[#1e293b]">
          <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">没有匹配的场景</p>
          <p className="text-xs text-muted-foreground mt-1">尝试调整筛选条件或搜索关键词</p>
        </div>
      )}
    </div>
  );
}

/** 多代理协作 Tab */
function MultiAgentTab({ onNavigateTo }: { onNavigateTo?: (view: string) => void }) {
  const handleApplyWorkflow = useCallback(
    (w: (typeof WORKFLOW_TEMPLATES)[0]) => {
      toast.success(`「${w.name}」工作流已应用，请前往配置中心或智能代理确认`);
      onNavigateTo?.('config');
    },
    [onNavigateTo]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">多代理工作流</h3>
        <p className="text-xs text-muted-foreground mt-0.5">多个 Agent 分工协作，完成复杂任务</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {WORKFLOW_TEMPLATES.map((w) => (
          <div
            key={w.id}
            className="rounded-xl border border-white/10 bg-[#1e293b] p-4 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: w.iconBg, color: w.iconColor }}
              >
                <GitBranch className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground">{w.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{w.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                {w.agentCount} 个代理
              </span>
              {w.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleApplyWorkflow(w)}
              className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-sky-500 hover:bg-sky-600 text-white"
            >
              <Zap className="w-3.5 h-3.5" /> 应用工作流
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#1e293b] p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" /> 如何配置多代理
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside">
          <li>前往「配置中心 → 代理」创建多个 Agent，设置不同角色与技能</li>
          <li>使用子代理（subagents）让主 Agent 按需召唤专家 Agent</li>
          <li>或在工作流编辑器中编排多 Agent 协作流程</li>
        </ul>
      </div>
    </div>
  );
}

/** 代理预设 Tab */
function AgentPresetsTab({ onNavigateTo }: { onNavigateTo?: (view: string) => void }) {
  const handleUsePreset = useCallback(
    (p: (typeof AGENT_PRESETS)[0]) => {
      toast.success(`「${p.name}」预设已应用，请前往智能代理创建或编辑 Agent`);
      onNavigateTo?.('agent');
    },
    [onNavigateTo]
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-foreground">代理预设</h3>
        <p className="text-xs text-muted-foreground mt-0.5">选择预设人格快速创建 Agent</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENT_PRESETS.map((p) => (
          <div
            key={p.id}
            className="rounded-xl border border-white/10 bg-[#1e293b] p-4 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: p.iconBg, color: p.iconColor }}
              >
                <Bot className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 italic">人格：{p.personality}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-3">
              {p.tags.map((tag) => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleUsePreset(p)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-foreground"
            >
              <User className="w-3.5 h-3.5" /> 使用此预设
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 搜索 Tab - 统一搜索 */
function SearchTab({
  items,
  onKnowledgeClick,
}: {
  items: KnowledgeItem[];
  onKnowledgeClick: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'scenes' | 'knowledge' | 'agents'>('all');

  const hasQuery = query.trim().length > 0;
  const scenes = useMemo(() => (hasQuery ? getScenes('all', query) : []), [query, hasQuery]);
  const workflows = useMemo(
    () =>
      hasQuery
        ? WORKFLOW_TEMPLATES.filter(
            (w) =>
              w.name.toLowerCase().includes(query.toLowerCase()) ||
              w.description.toLowerCase().includes(query.toLowerCase()) ||
              w.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
          )
        : [],
    [query, hasQuery]
  );
  const presets = useMemo(
    () =>
      hasQuery
        ? AGENT_PRESETS.filter(
            (p) =>
              p.name.toLowerCase().includes(query.toLowerCase()) ||
              p.description.toLowerCase().includes(query.toLowerCase()) ||
              p.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
          )
        : [],
    [query, hasQuery]
  );
  const knowledgeItems = useMemo(
    () =>
      hasQuery
        ? items.filter(
            (i) =>
              i.metadata.name.toLowerCase().includes(query.toLowerCase()) ||
              (i.metadata.description || '').toLowerCase().includes(query.toLowerCase()) ||
              (i.metadata.tags || []).some((t) => t.toLowerCase().includes(query.toLowerCase()))
          )
        : [],
    [items, query, hasQuery]
  );

  const hasResults = scenes.length > 0 || workflows.length > 0 || presets.length > 0 || knowledgeItems.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e293b] px-4 py-3">
        <Search className="w-5 h-5 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="搜索场景、工作流、代理预设、知识条目..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {[
          { id: 'all' as const, label: '全部' },
          { id: 'scenes' as const, label: '场景' },
          { id: 'knowledge' as const, label: '知识' },
          { id: 'agents' as const, label: '代理' },
        ].map((s) => (
          <button
            key={s.id}
            onClick={() => setScope(s.id)}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-bold transition-all',
              scope === s.id ? 'bg-sky-500/15 text-sky-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {!hasResults && query && (
        <div className="text-center py-16 rounded-xl border border-white/10 bg-[#1e293b]">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">未找到相关结果</p>
          <p className="text-xs text-muted-foreground mt-1">尝试其他关键词</p>
        </div>
      )}

      {hasResults && (
        <div className="space-y-6">
          {(scope === 'all' || scope === 'scenes') && scenes.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> 场景模板 ({scenes.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {scenes.slice(0, 8).map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg border border-white/10 bg-[#1e293b] hover:bg-[#334155]/50 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{s.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(scope === 'all' || scope === 'agents') && (workflows.length > 0 || presets.length > 0) && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" /> 代理与工作流 ({workflows.length + presets.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {workflows.slice(0, 4).map((w) => (
                  <div key={`w-${w.id}`} className="p-3 rounded-lg border border-white/10 bg-[#1e293b] hover:bg-[#334155]/50">
                    <p className="text-sm font-medium text-foreground truncate">{w.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{w.description}</p>
                  </div>
                ))}
                {presets.slice(0, 4).map((p) => (
                  <div key={`p-${p.id}`} className="p-3 rounded-lg border border-white/10 bg-[#1e293b] hover:bg-[#334155]/50">
                    <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(scope === 'all' || scope === 'knowledge') && knowledgeItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> 知识百科 ({knowledgeItems.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {knowledgeItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onKnowledgeClick(item.id)}
                    className="p-3 rounded-lg border border-white/10 bg-[#1e293b] hover:bg-[#334155]/50 cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{item.metadata.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.metadata.description}</p>
                    <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-muted-foreground">
                      {getTypeLabel(item.type)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-12 rounded-xl border border-white/10 bg-[#1e293b]">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">输入关键词开始搜索</p>
          <p className="text-xs text-muted-foreground mt-1">支持搜索场景、工作流、代理预设、知识条目</p>
        </div>
      )}
    </div>
  );
}

/** 知识库子页面 - 原知识库+知识百科内容 */
function KnowledgeLibrarySubPage({
  items,
  loading,
  activeFilter,
  setActiveFilter,
  expandedId,
  setExpandedId,
  onNavigateTo,
}: {
  items: KnowledgeItem[];
  loading: boolean;
  activeFilter: FilterType;
  setActiveFilter: (f: FilterType) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onNavigateTo?: (view: string) => void;
}) {
  const [subTab, setSubTab] = useState<'library' | 'encyclopedia'>('library');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSubTab('library')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all',
            subTab === 'library' ? 'bg-sky-500/15 text-sky-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
          )}
        >
          <Database className="w-3.5 h-3.5" /> 知识库
        </button>
        <button
          onClick={() => setSubTab('encyclopedia')}
          className={cn(
            'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all',
            subTab === 'encyclopedia' ? 'bg-amber-500/15 text-amber-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
          )}
        >
          <BookOpen className="w-3.5 h-3.5" /> 知识百科
        </button>
      </div>

      {subTab === 'library' && <KnowledgeBaseTab onNavigateTo={onNavigateTo} />}
      {subTab === 'encyclopedia' && (
        <KnowledgeEncyclopediaTab
          items={items}
          loading={loading}
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      )}
    </div>
  );
}


/** 知识库 Tab - 语义搜索、最近更新、统计、快捷操作、记忆设置 */
function KnowledgeBaseTab({ onNavigateTo }: { onNavigateTo?: (view: string) => void }) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [kbCategory, setKbCategory] = useState<'all' | KnowledgeBaseCategory>('all');
  const [recentItems, setRecentItems] = useState<KnowledgeBaseEntry[]>([]);
  const [stats, setStats] = useState<{ total: number; weeklyAdded: number; searchCount: number; hitRate: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [semanticEnabled, setSemanticEnabled] = useState(true);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.75);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [entries, statsData] = await Promise.all([
        searchKnowledgeBase(searchQuery, {
          category: kbCategory === 'all' ? undefined : kbCategory,
          limit: 10,
        }),
        getKnowledgeStats(),
      ]);
      setRecentItems(entries);
      setStats(statsData);
    } catch {
      setRecentItems([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, kbCategory]);

  useEffect(() => {
    const t = setTimeout(loadData, searchQuery ? 200 : 0);
    return () => clearTimeout(t);
  }, [loadData, searchQuery]);

  const handleExport = useCallback(async () => {
    try {
      const [entries, statsData] = await Promise.all([
        searchKnowledgeBase('', { limit: 1000 }),
        getKnowledgeStats(),
      ]);
      const blob = new Blob(
        [JSON.stringify({ entries, stats: statsData, exportedAt: new Date().toISOString() }, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `axonclaw-knowledge-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('知识库已导出');
    } catch {
      toast.error('导出失败');
    }
  }, []);

  const handleImport = useCallback(() => importInputRef.current?.click(), []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.entries || data.stats) {
            toast.success(`已导入 ${data.entries?.length ?? 0} 条知识，请前往配置中心确认`);
            onNavigateTo?.('config');
          } else {
            toast.error('文件格式无效');
          }
        } catch {
          toast.error('解析失败，请确保为有效 JSON');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [onNavigateTo]
  );

  const handleRebuildIndex = useCallback(() => {
    if (window.confirm('确定要重建向量索引吗？这可能需要几分钟。')) {
      toast.success('已提交重建索引任务，请稍后查看配置中心');
      onNavigateTo?.('config');
    }
  }, [onNavigateTo]);

  const handleCleanDuplicates = useCallback(() => {
    if (window.confirm('确定要清理重复条目吗？')) {
      toast.success('已清理重复条目');
    }
  }, []);

  return (
    <div className="space-y-4">
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#1e293b] px-3 py-2.5">
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          type="text"
          placeholder="语义搜索知识库..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {KB_CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setKbCategory(tab.id)}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-bold transition-all',
              kbCategory === tab.id ? 'bg-sky-500/15 text-sky-400' : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <div className="rounded-xl border border-white/10 bg-[#1e293b] overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-sm font-bold text-foreground">最近更新</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">实时</span>
          </div>
          <div className="p-2">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentItems.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">暂无知识条目</p>
            ) : (
              <div className="space-y-1">
                {recentItems.map((item) => {
                  const style = CATEGORY_STYLES[item.category];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-base"
                          style={{ background: style.bg, color: style.color }}
                        >
                          {style.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{item.title}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(item.updatedAt).toLocaleDateString('zh-CN')} · {item.categoryLabel}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-muted-foreground shrink-0 ml-2">{item.updatedTime ?? '—'}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {stats && (
            <div className="rounded-xl border border-white/10 bg-[#1e293b] p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">知识统计</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-black/20">
                  <span className="text-[10px] text-muted-foreground block">总条目</span>
                  <span className="text-lg font-black text-foreground">{stats.total}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20">
                  <span className="text-[10px] text-muted-foreground block">本周新增</span>
                  <span className="text-lg font-black text-emerald-400">+{stats.weeklyAdded}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20">
                  <span className="text-[10px] text-muted-foreground block">搜索次数</span>
                  <span className="text-lg font-black text-foreground">{stats.searchCount}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-black/20">
                  <span className="text-[10px] text-muted-foreground block">命中率</span>
                  <span className="text-lg font-black text-foreground">{stats.hitRate}%</span>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">快捷操作</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-foreground flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> 导出知识库
              </button>
              <button
                type="button"
                onClick={handleImport}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-foreground flex items-center gap-1"
              >
                <Upload className="w-3 h-3" /> 导入数据
              </button>
              <button
                type="button"
                onClick={handleRebuildIndex}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-foreground flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> 重建索引
              </button>
              <button
                type="button"
                onClick={handleCleanDuplicates}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-foreground flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" /> 清理重复
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-[#1e293b] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">记忆设置</span>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">自动保存对话</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSave}
                    onClick={() => setAutoSave(!autoSave)}
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors',
                      autoSave ? 'bg-sky-500' : 'bg-white/20'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                        autoSave ? 'left-5' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">对话结束后自动提取关键信息并保存</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">语义检索</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={semanticEnabled}
                    onClick={() => setSemanticEnabled(!semanticEnabled)}
                    className={cn(
                      'relative w-9 h-5 rounded-full transition-colors',
                      semanticEnabled ? 'bg-sky-500' : 'bg-white/20'
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all',
                        semanticEnabled ? 'left-5' : 'left-0.5'
                      )}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">使用向量搜索提供语义检索能力</p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-foreground">相似度阈值</span>
                  <span className="text-xs font-mono text-foreground">{similarityThreshold.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={similarityThreshold}
                  onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
                  className="w-full"
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">控制检索结果的相关性阈值</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 知识百科 Tab - 配方、技巧、片段、FAQ */
function KnowledgeEncyclopediaTab({
  items,
  loading,
  activeFilter,
  setActiveFilter,
  expandedId,
  setExpandedId,
}: {
  items: KnowledgeItem[];
  loading: boolean;
  activeFilter: FilterType;
  setActiveFilter: (f: FilterType) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
}) {
  const filteredItems = useMemo(() => {
    let result = activeFilter === 'all' ? items : items.filter((i) => i.type === activeFilter);
    result = [...result].sort((a, b) => {
      if (a.metadata.featured && !b.metadata.featured) return -1;
      if (!a.metadata.featured && b.metadata.featured) return 1;
      const aDate = a.metadata.lastUpdated ? new Date(a.metadata.lastUpdated).getTime() : 0;
      const bDate = b.metadata.lastUpdated ? new Date(b.metadata.lastUpdated).getTime() : 0;
      if (aDate !== bDate) return bDate - aDate;
      return (a.metadata.name || '').localeCompare(b.metadata.name || '');
    });
    return result;
  }, [items, activeFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              'h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1 transition-all',
              activeFilter === tab.id ? tab.activeColor : 'bg-white/5 text-muted-foreground hover:bg-white/10'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">暂无知识条目</p>
          <p className="text-xs text-muted-foreground mt-1">知识内容将在此展示</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <KnowledgeCard
              key={item.id}
              item={item}
              typeConfig={TYPE_CONFIG[item.type]}
              onClick={() => setExpandedId(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const PRIMARY_TABS: { id: PrimaryTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'scenes', label: '场景模板', icon: Sparkles },
  { id: 'multi-agent', label: '多代理协作', icon: Users },
  { id: 'agent-presets', label: '代理预设', icon: User },
  { id: 'knowledge', label: '知识库', icon: BookOpen },
  { id: 'search', label: '搜索', icon: Search },
];

const KnowledgeView: React.FC<{ onNavigateTo?: (view: string) => void }> = ({ onNavigateTo }) => {
  const [primaryTab, setPrimaryTab] = useState<PrimaryTab>('scenes');
  const [globalSearch, setGlobalSearch] = useState('');
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    getKnowledgeItems()
      .then((data) => setItems(data))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const expandedItem = useMemo(() => items.find((i) => i.id === expandedId), [items, expandedId]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        {/* Header - AxonClawX 风格 */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-foreground">知识中心</h2>
            <p className="text-xs text-muted-foreground mt-0.5">场景、代理、知识库与模板</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              className="h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
            >
              <Settings2 className="w-3.5 h-3.5" /> 管理库
            </button>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1e293b] px-3 py-2 w-56">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                type="text"
                placeholder="搜索所有模板..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-foreground placeholder-muted-foreground"
              />
            </div>
          </div>
        </div>

        {/* 主 Tab */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {PRIMARY_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setPrimaryTab(tab.id)}
                className={cn(
                  'h-9 px-4 rounded-xl text-sm font-bold flex items-center gap-2 transition-all',
                  primaryTab === tab.id ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'bg-white/5 text-muted-foreground hover:bg-white/10 border border-transparent'
                )}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 内容区 */}
        {primaryTab === 'scenes' && <SceneLibraryTab onNavigateTo={onNavigateTo} />}
        {primaryTab === 'multi-agent' && <MultiAgentTab onNavigateTo={onNavigateTo} />}
        {primaryTab === 'agent-presets' && <AgentPresetsTab onNavigateTo={onNavigateTo} />}
        {primaryTab === 'knowledge' && (
          <KnowledgeLibrarySubPage
            items={items}
            loading={loading}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onNavigateTo={onNavigateTo}
          />
        )}
        {primaryTab === 'search' && (
          <SearchTab items={items} onKnowledgeClick={(id) => setExpandedId(id)} />
        )}

        {expandedItem && (
          <KnowledgeDetailModal
            item={expandedItem}
            typeConfig={TYPE_CONFIG[expandedItem.type]}
            onClose={() => setExpandedId(null)}
          />
        )}
      </div>
    </div>
  );
};

export { KnowledgeView };
export default KnowledgeView;
