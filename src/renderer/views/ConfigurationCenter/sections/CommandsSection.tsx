/**
 * 命令配置 - 表单式 UI
 */
import React from 'react';
import { ToggleLeft, Terminal, Shield } from 'lucide-react';
import {
  ConfigSection,
  SelectField,
  NumberField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const TRISTATE_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'true', label: '开启' },
  { value: 'false', label: '关闭' },
];

export const CommandsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['commands', ...p]);
  const s = (p: string[], v: unknown) => setField(['commands', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="命令开关" icon={ToggleLeft} iconColor="text-amber-500">
        <SelectField
          label="原生命令"
          desc="内置命令启用"
          value={String(g(['native']) ?? 'auto')}
          onChange={(v) => s(['native'], v)}
          options={TRISTATE_OPTIONS}
        />
        <SelectField
          label="原生技能"
          value={String(g(['nativeSkills']) ?? 'auto')}
          onChange={(v) => s(['nativeSkills'], v)}
          options={TRISTATE_OPTIONS}
        />
        <SwitchField
          label="文本命令"
          value={g(['text']) !== false}
          onChange={(v) => s(['text'], v)}
        />
        <SwitchField
          label="Bash 命令"
          value={g(['bash']) !== false}
          onChange={(v) => s(['bash'], v)}
        />
        <SwitchField
          label="配置命令"
          value={g(['config']) !== false}
          onChange={(v) => s(['config'], v)}
        />
        <SwitchField
          label="调试命令"
          value={g(['debug']) === true}
          onChange={(v) => s(['debug'], v)}
        />
        <SwitchField
          label="重启命令"
          value={g(['restart']) !== false}
          onChange={(v) => s(['restart'], v)}
        />
      </ConfigSection>

      <ConfigSection title="Bash 配置" icon={Terminal} iconColor="text-green-500" defaultOpen={false}>
        <NumberField
          label="前台超时(ms)"
          desc="0-30000ms"
          value={g(['bashForegroundMs']) as number | undefined}
          onChange={(v) => s(['bashForegroundMs'], v)}
          min={0}
          max={30000}
          step={500}
        />
      </ConfigSection>

      <ConfigSection title="访问控制" icon={Shield} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label="使用访问组"
          value={g(['useAccessGroups']) === true}
          onChange={(v) => s(['useAccessGroups'], v)}
        />
        <ArrayField
          label="所有者允许来源"
          desc="用户 ID 列表"
          value={((g(['ownerAllowFrom']) as unknown[]) ?? []).map(String)}
          onChange={(v) => s(['ownerAllowFrom'], v)}
          placeholder="user-id"
        />
      </ConfigSection>
    </div>
  );
};
