/**
 * 杂项配置 - 表单式 UI
 */
import React from 'react';
import { Terminal, Download, Palette, LayoutDashboard, Cpu } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
  ArrayField,
  KeyValueField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const UPDATE_CHANNEL_OPTIONS = [
  { value: 'stable', label: '稳定版' },
  { value: 'beta', label: 'Beta' },
  { value: 'dev', label: '开发版' },
];
const TAGLINE_OPTIONS = [
  { value: 'random', label: '随机' },
  { value: 'default', label: '默认' },
  { value: 'off', label: '关闭' },
];

export const MiscSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const gg = (p: string[]) => getField(['gateway', ...p]);
  const gs = (p: string[], v: unknown) => setField(['gateway', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="CLI" icon={Terminal} iconColor="text-emerald-500" defaultOpen={false}>
        <SelectField
          label="标语模式"
          value={String(getField(['cli', 'banner', 'taglineMode']) ?? 'random')}
          onChange={(v) => setField(['cli', 'banner', 'taglineMode'], v)}
          options={TAGLINE_OPTIONS}
        />
      </ConfigSection>

      <ConfigSection title="更新配置" icon={Download} iconColor="text-blue-500">
        <SelectField
          label="更新渠道"
          value={String(getField(['update', 'channel']) ?? 'stable')}
          onChange={(v) => setField(['update', 'channel'], v)}
          options={UPDATE_CHANNEL_OPTIONS}
        />
        <SwitchField
          label="启动时检查"
          value={getField(['update', 'checkOnStart']) !== false}
          onChange={(v) => setField(['update', 'checkOnStart'], v)}
        />
        <SwitchField
          label="自动更新"
          value={getField(['update', 'auto', 'enabled']) === true}
          onChange={(v) => setField(['update', 'auto', 'enabled'], v)}
        />
        <NumberField
          label="稳定版延迟(小时)"
          value={getField(['update', 'auto', 'stableDelayHours']) as number | undefined}
          onChange={(v) => setField(['update', 'auto', 'stableDelayHours'], v)}
          min={0}
          max={168}
        />
      </ConfigSection>

      <ConfigSection title="UI 配置" icon={Palette} iconColor="text-pink-500" defaultOpen={false}>
        <TextField
          label="接缝颜色"
          value={String(getField(['ui', 'seamColor']) ?? '')}
          onChange={(v) => setField(['ui', 'seamColor'], v)}
          placeholder="#hex"
        />
        <TextField
          label="助手名称"
          value={String(getField(['ui', 'assistant', 'name']) ?? '')}
          onChange={(v) => setField(['ui', 'assistant', 'name'], v)}
          placeholder="助手"
          mono={false}
        />
        <TextField
          label="助手头像"
          value={String(getField(['ui', 'assistant', 'avatar']) ?? '')}
          onChange={(v) => setField(['ui', 'assistant', 'avatar'], v)}
          placeholder="https://..."
        />
      </ConfigSection>

      <ConfigSection title="控制 UI" icon={LayoutDashboard} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label="启用"
          value={gg(['controlUi', 'enabled']) !== false}
          onChange={(v) => gs(['controlUi', 'enabled'], v)}
        />
        <TextField
          label="Base Path"
          value={String(gg(['controlUi', 'basePath']) ?? '')}
          onChange={(v) => gs(['controlUi', 'basePath'], v)}
          placeholder="/"
        />
        <ArrayField
          label="允许来源"
          value={(gg(['controlUi', 'allowedOrigins']) as string[]) ?? []}
          onChange={(v) => gs(['controlUi', 'allowedOrigins'], v)}
          placeholder="https://..."
        />
      </ConfigSection>

      <ConfigSection title="环境变量" icon={Cpu} iconColor="text-slate-500" defaultOpen={false}>
        <SwitchField
          label="Shell 环境"
          value={getField(['env', 'shellEnv', 'enabled']) === true}
          onChange={(v) => setField(['env', 'shellEnv', 'enabled'], v)}
        />
        <NumberField
          label="Shell 超时(ms)"
          value={getField(['env', 'shellEnv', 'timeoutMs']) as number | undefined}
          onChange={(v) => setField(['env', 'shellEnv', 'timeoutMs'], v)}
          min={0}
          step={1000}
        />
        <KeyValueField
          label="变量"
          value={(getField(['env', 'vars']) as Record<string, string>) || {}}
          onChange={(v) => setField(['env', 'vars'], v)}
        />
      </ConfigSection>
    </div>
  );
};
