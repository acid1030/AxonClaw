/**
 * AxonClaw - Templates View
 * 模板中心界面 - AxonClawX 风格内容复刻
 */

import React from 'react';
import { Plus, FileText } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface TemplatesViewProps {
  embedded?: boolean;
}

const templates = [
  { id: '1', name: '技术文档', category: '文档', uses: 128 },
  { id: '2', name: '周报模板', category: '报告', uses: 89 },
  { id: '3', name: 'API 设计', category: '开发', uses: 56 },
];

const TemplatesView: React.FC<TemplatesViewProps> = ({ embedded }) => {
  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="模板中心"
          subtitle="管理和使用预设模板"
          stats={[{ label: '模板数', value: templates.length }]}
          statsBorderColor="border-cyan-500/40"
          actions={
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
              <Plus className="w-4 h-4" />
              新建模板
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border-2 border-cyan-500/40 bg-[#1e293b] p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  {t.name}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mb-3">
                {t.category} · 使用 {t.uses} 次
              </div>
              <button className="w-full py-2 rounded-xl bg-black/5 dark:bg-white/5 text-xs font-medium text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                使用模板
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { TemplatesView };
export default TemplatesView;
