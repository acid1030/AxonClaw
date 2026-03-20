/**
 * 工具配置 - 权限 profile、网络搜索、网页抓取等
 * 参考 knowledge tips
 */
import React from 'react';
import { Wrench, Shield, Globe, FileSearch } from 'lucide-react';
import { ConfigSection, SelectField, ArrayField, SwitchField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const PROFILE_OPTIONS = [
  { value: 'full', label: '完整 - 所有工具可用' },
  { value: 'minimal', label: '最小 - 仅基础工具' },
  { value: 'custom', label: '自定义 - 按 deny/allow 控制' },
];

export const ToolsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['tools', ...p]);
  const s = (p: string[], v: unknown) => setField(['tools', ...p], v);

  const profile = String(g(['profile']) ?? 'full');
  const deny = (g(['deny']) as string[]) ?? [];
  const allow = (g(['allow']) as string[]) ?? [];

  return (
    <div className="space-y-4">
      <ConfigSection title="工具权限" icon={Shield} iconColor="text-amber-500" desc="Profile 与 deny/allow 列表">
        <SelectField
          label="Profile"
          value={profile}
          onChange={(v) => s(['profile'], v)}
          options={PROFILE_OPTIONS}
        />
        {profile === 'custom' && (
          <>
            <ArrayField
              label="允许 (allow)"
              value={allow}
              onChange={(v) => s(['allow'], v)}
              placeholder="tool_id"
            />
            <ArrayField
              label="拒绝 (deny)"
              value={deny}
              onChange={(v) => s(['deny'], v)}
              placeholder="tool_id"
            />
          </>
        )}
        {profile !== 'custom' && (
          <ArrayField
            label="额外拒绝 (deny)"
            value={deny}
            onChange={(v) => s(['deny'], v)}
            placeholder="web_search, code_exec…"
          />
        )}
      </ConfigSection>

      <ConfigSection title="网络与搜索" icon={Globe} iconColor="text-blue-500" defaultOpen={true}>
        <SwitchField
          label="启用网络搜索 (web_search)"
          value={g(['webSearch', 'enabled']) !== false}
          onChange={(v) => s(['webSearch', 'enabled'], v)}
        />
        <SwitchField
          label="启用网页抓取 (fetch_url)"
          value={g(['fetchUrl', 'enabled']) !== false}
          onChange={(v) => s(['fetchUrl', 'enabled'], v)}
        />
      </ConfigSection>

      <ConfigSection title="代码执行" icon={Wrench} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label="启用代码执行 (code_exec)"
          value={g(['codeExec', 'enabled']) !== false}
          onChange={(v) => s(['codeExec', 'enabled'], v)}
        />
      </ConfigSection>
    </div>
  );
};
