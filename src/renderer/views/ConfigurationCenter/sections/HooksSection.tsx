/**
 * Hooks 配置 - 表单式 UI
 */
import React from 'react';
import { Settings, Route, Mail, Network } from 'lucide-react';
import {
  ConfigSection,
  ConfigCard,
  TextField,
  NumberField,
  SwitchField,
  ArrayField,
  AddButton,
  EmptyState,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

export const HooksSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['hooks', ...p]);
  const s = (p: string[], v: unknown) => setField(['hooks', ...p], v);
  const mappings: Record<string, unknown>[] = (g(['mappings']) as Record<string, unknown>[]) || [];

  return (
    <div className="space-y-4">
      <ConfigSection title="基本设置" icon={Settings} iconColor="text-pink-500">
        <SwitchField
          label="启用 Hooks"
          value={g(['enabled']) === true}
          onChange={(v) => s(['enabled'], v)}
        />
        <TextField
          label="Webhook 路径"
          value={String(g(['path']) ?? '')}
          onChange={(v) => s(['path'], v)}
          placeholder="/webhook"
        />
        <TextField
          label="Webhook Token"
          value={String(g(['token']) ?? '')}
          onChange={(v) => s(['token'], v)}
        />
        <NumberField
          label="最大 Body 字节"
          value={g(['maxBodyBytes']) as number | undefined}
          onChange={(v) => s(['maxBodyBytes'], v)}
          min={0}
        />
        <ArrayField
          label="预设"
          value={(g(['presets']) as string[]) ?? []}
          onChange={(v) => s(['presets'], v)}
          placeholder="preset-name"
        />
      </ConfigSection>

      <ConfigSection
        title="Hook 映射"
        icon={Route}
        iconColor="text-pink-500"
        desc={`${mappings.length} 条规则`}
        defaultOpen={false}
      >
        {mappings.length === 0 ? (
          <EmptyState message="暂无映射" icon={Route} />
        ) : (
          mappings.map((m: Record<string, unknown>, i: number) => (
            <ConfigCard
              key={i}
              title={String(m.match || m.action || `映射 ${i + 1}`)}
              icon={Route}
              onDelete={() => {
                const next = mappings.filter((_, j) => j !== i);
                s(['mappings'], next);
              }}
            >
              <TextField
                label="匹配"
                value={String(m.match ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], match: v };
                  s(['mappings'], next);
                }}
                placeholder="pattern"
              />
              <TextField
                label="动作"
                value={String(m.action ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], action: v };
                  s(['mappings'], next);
                }}
                placeholder="send"
              />
              <TextField
                label="频道"
                value={String(m.channel ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], channel: v };
                  s(['mappings'], next);
                }}
                placeholder="telegram"
              />
              <TextField
                label="模型"
                value={String(m.model ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], model: v };
                  s(['mappings'], next);
                }}
                placeholder="gpt-4"
              />
            </ConfigCard>
          ))
        )}
        <AddButton
          label="添加映射"
          onClick={() => s(['mappings'], [...mappings, { match: '', action: 'send' }])}
        />
      </ConfigSection>

      <ConfigSection title="Gmail 配置" icon={Mail} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label="启用 Gmail"
          value={g(['gmail', 'enabled']) === true}
          onChange={(v) => s(['gmail', 'enabled'], v)}
        />
        <TextField
          label="凭证路径"
          value={String(g(['gmail', 'credentialsPath']) ?? '')}
          onChange={(v) => s(['gmail', 'credentialsPath'], v)}
        />
        <TextField
          label="Token 路径"
          value={String(g(['gmail', 'tokenPath']) ?? '')}
          onChange={(v) => s(['gmail', 'tokenPath'], v)}
        />
      </ConfigSection>

      <ConfigSection title="内部 Hooks" icon={Network} iconColor="text-slate-500" defaultOpen={false}>
        <SwitchField
          label="启用内部"
          value={g(['internal', 'enabled']) === true}
          onChange={(v) => s(['internal', 'enabled'], v)}
        />
      </ConfigSection>
    </div>
  );
};
