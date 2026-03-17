/**
 * 记忆配置 - 表单式 UI
 */
import React from 'react';
import { Brain, Database } from 'lucide-react';
import { ConfigSection, SelectField, TextField, NumberField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const BACKEND_OPTIONS = [
  { value: 'builtin', label: '内置' },
  { value: 'qmd', label: 'QMD' },
];
const CITATIONS_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'on', label: '开启' },
  { value: 'off', label: '关闭' },
];

export const MemorySection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['memory', ...p]);
  const s = (p: string[], v: unknown) => setField(['memory', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="记忆配置" icon={Brain} iconColor="text-sky-500">
        <SelectField
          label="记忆后端"
          value={String(g(['backend']) ?? 'builtin')}
          onChange={(v) => s(['backend'], v)}
          options={BACKEND_OPTIONS}
        />
        <SelectField
          label="引用"
          value={String(g(['citations']) ?? 'auto')}
          onChange={(v) => s(['citations'], v)}
          options={CITATIONS_OPTIONS}
        />
        <TextField
          label="搜索 Provider"
          value={String(g(['search', 'provider']) ?? '')}
          onChange={(v) => s(['search', 'provider'], v)}
          placeholder="openai/text-embedding-3-small"
        />
        <TextField
          label="搜索 Fallback"
          value={String(g(['search', 'fallback']) ?? '')}
          onChange={(v) => s(['search', 'fallback'], v)}
          placeholder="builtin"
        />
      </ConfigSection>

      {g(['backend']) === 'qmd' && (
        <ConfigSection title="QMD 配置" icon={Database} iconColor="text-sky-500" defaultOpen={false}>
          <TextField
            label="QMD 命令"
            value={String(g(['qmd', 'command']) ?? '')}
            onChange={(v) => s(['qmd', 'command'], v)}
          />
          <TextField
            label="数据路径"
            value={String(g(['qmd', 'paths', 'data']) ?? '')}
            onChange={(v) => s(['qmd', 'paths', 'data'], v)}
          />
          <NumberField
            label="最大记忆数"
            value={g(['qmd', 'limits', 'maxEntries']) as number | undefined}
            onChange={(v) => s(['qmd', 'limits', 'maxEntries'], v)}
            min={1}
          />
          <TextField
            label="作用域"
            value={String(g(['qmd', 'scope']) ?? '')}
            onChange={(v) => s(['qmd', 'scope'], v)}
          />
        </ConfigSection>
      )}
    </div>
  );
};
