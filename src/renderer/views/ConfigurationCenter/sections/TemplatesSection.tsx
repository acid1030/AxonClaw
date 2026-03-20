/**
 * 模板配置 - 卡片列表 UI
 */
import React, { useState } from 'react';
import { Sparkles, Plus, Settings, Trash2 } from 'lucide-react';
import { ConfigSection, TextField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import { cn } from '@/lib/utils';

interface TemplateEntry {
  id?: string;
  name?: string;
  prompt?: string;
  [k: string]: unknown;
}

export const TemplatesSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['templates', ...p]);
  const s = (p: string[], v: unknown) => setField(['templates', ...p], v);

  const templatesRaw = getField(['templates']);
  const templatesList: TemplateEntry[] = Array.isArray(templatesRaw)
    ? templatesRaw
    : templatesRaw && typeof templatesRaw === 'object'
      ? Object.entries(templatesRaw as Record<string, TemplateEntry>).map(([id, t]) => ({ ...t, id }))
      : [];

  const [editingId, setEditingId] = useState<string | null>(null);

  const addTemplate = () => {
    const newId = `template_${Date.now()}`;
    const next = [...templatesList, { id: newId, name: '新模板' }];
    setField(['templates'], next);
    setEditingId(newId);
  };

  const removeTemplate = (idx: number) => {
    const next = templatesList.filter((_, i) => i !== idx);
    setField(['templates'], next);
    if (editingId === (templatesList[idx]?.id ?? `${idx}`)) setEditingId(null);
  };

  const updateTemplate = (idx: number, field: string, value: unknown) => {
    const next = [...templatesList];
    next[idx] = { ...next[idx], [field]: value };
    setField(['templates'], next);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="模板列表" icon={Sparkles} iconColor="text-amber-500" desc="提示词模板、工作流模板">
        <div className="space-y-2">
          {templatesList.map((tmpl, idx) => {
            const isEditing = editingId === (tmpl.id ?? `${idx}`);
            return (
              <div
                key={tmpl.id ?? idx}
                className={cn(
                  'rounded-xl border overflow-hidden',
                  'border-slate-200 dark:border-white/[0.06]',
                  'bg-slate-50/80 dark:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {(tmpl.name as string) || tmpl.id || '未命名'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() =>
                        setEditingId(isEditing ? null : (tmpl.id as string) ?? `${idx}`)
                      }
                      className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeTemplate(idx)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {isEditing && (
                  <div className="p-3 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <TextField
                      label="名称"
                      value={String(tmpl.name ?? '')}
                      onChange={(v) => updateTemplate(idx, 'name', v)}
                    />
                    <TextField
                      label="ID"
                      value={String(tmpl.id ?? '')}
                      onChange={(v) => updateTemplate(idx, 'id', v)}
                      placeholder="my_template"
                    />
                    <TextField
                      label="提示词 (prompt)"
                      value={String(tmpl.prompt ?? '')}
                      onChange={(v) => updateTemplate(idx, 'prompt', v)}
                      multiline
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addTemplate}
            className={cn(
              'w-full rounded-xl border-2 border-dashed py-6',
              'border-slate-300 dark:border-white/20',
              'flex items-center justify-center gap-2',
              'text-slate-500 hover:text-indigo-500 hover:border-indigo-500/40 hover:bg-indigo-500/5',
              'transition-colors'
            )}
          >
            <Plus className="h-5 w-5" />
            <span className="text-sm">添加模板</span>
          </button>
        </div>
      </ConfigSection>
    </div>
  );
};
