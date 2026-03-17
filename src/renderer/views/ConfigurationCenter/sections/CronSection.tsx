/**
 * 定时任务配置 - 表单式 UI
 */
import React from 'react';
import { Clock } from 'lucide-react';
import { ConfigSection, TextField, NumberField, SwitchField, SelectField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const WAKE_OPTIONS = [
  { value: 'now', label: '立即' },
  { value: 'next-heartbeat', label: '下次心跳' },
];

export const CronSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['cron', ...p]);
  const s = (p: string[], v: unknown) => setField(['cron', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="定时任务" icon={Clock} iconColor="text-lime-500">
        <SwitchField
          label="启用"
          value={g(['enabled']) !== false}
          onChange={(v) => s(['enabled'], v)}
        />
        <TextField
          label="存储路径"
          value={String(g(['store']) ?? '')}
          onChange={(v) => s(['store'], v)}
          placeholder="~/.openclaw/cron-store"
        />
        <NumberField
          label="最大并发"
          value={g(['maxConcurrentRuns']) as number | undefined}
          onChange={(v) => s(['maxConcurrentRuns'], v)}
          min={1}
        />
        <SelectField
          label="唤醒模式"
          value={String(g(['wakeMode']) ?? 'now')}
          onChange={(v) => s(['wakeMode'], v)}
          options={WAKE_OPTIONS}
        />
        <SwitchField
          label="轻量上下文"
          value={g(['lightContext']) === true}
          onChange={(v) => s(['lightContext'], v)}
        />
      </ConfigSection>
    </div>
  );
};
