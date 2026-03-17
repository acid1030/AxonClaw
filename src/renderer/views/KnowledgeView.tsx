/**
 * AxonClaw - 知识中心 (KnowledgeCenter)
 * ClawDeckX KnowledgeHub 完整复刻：配方、技巧、片段、FAQ
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react';
import { getKnowledgeItems, type KnowledgeItem, type KnowledgeItemType } from '@/services/knowledge-service';
import { MarkdownContent } from '@/components/chat/MarkdownContent';
import { cn } from '@/lib/utils';

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
        {/* Header */}
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

        {/* Body */}
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

          {/* Recipe steps */}
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

          {/* Tip / Recipe body */}
          {(item.type === 'tip' || item.type === 'recipe') && item.content.body && (
            <div className="prose prose-invert prose-sm max-w-none">
              <MarkdownContent content={item.content.body} />
            </div>
          )}

          {/* Snippet */}
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

          {/* FAQ */}
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

const KnowledgeView: React.FC = () => {
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

  const expandedItem = useMemo(() => items.find((i) => i.id === expandedId), [items, expandedId]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        {/* Header */}
        <div className="mb-4">
          <h2 className="text-base font-bold text-foreground">知识中心</h2>
          <p className="text-xs text-muted-foreground mt-0.5">配方、技巧、配置片段与常见问题</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
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

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
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

        {/* Detail Modal */}
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
