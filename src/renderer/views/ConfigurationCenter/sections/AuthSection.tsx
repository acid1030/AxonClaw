/**
 * 认证配置 - 表单式 UI
 */
import React from 'react';
import { SortAsc, Key, Timer } from 'lucide-react';
import {
  ConfigSection,
  ConfigCard,
  TextField,
  SelectField,
  ArrayField,
  AddButton,
  EmptyState,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const AUTH_MODE_OPTIONS = [
  { value: 'api-key', label: 'API Key' },
  { value: 'oauth', label: 'OAuth' },
  { value: 'token', label: 'Token' },
];

export const AuthSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const rawProfiles = getField(['auth', 'profiles']);
  const profiles: Record<string, unknown>[] = Array.isArray(rawProfiles) ? rawProfiles : [];
  const rawOrder = getField(['auth', 'order']);
  const order: string[] = Array.isArray(rawOrder) ? rawOrder : [];

  return (
    <div className="space-y-4">
      <ConfigSection title="认证顺序" icon={SortAsc} iconColor="text-red-500">
        <ArrayField
          label="Provider 顺序"
          desc="认证提供方顺序"
          value={order}
          onChange={(v) => setField(['auth', 'order'], v)}
          placeholder="provider-name"
        />
      </ConfigSection>

      <ConfigSection
        title="认证配置"
        icon={Key}
        iconColor="text-red-500"
        desc={`${profiles.length} 个配置`}
      >
        {profiles.length === 0 ? (
          <EmptyState message="暂无认证配置" icon={Key} />
        ) : (
          profiles.map((p: Record<string, unknown>, i: number) => (
            <ConfigCard
              key={i}
              title={String(p.provider || `配置 ${i + 1}`)}
              icon={Key}
              onDelete={() => {
                const next = profiles.filter((_, j) => j !== i);
                setField(['auth', 'profiles'], next);
              }}
            >
              <TextField
                label="Provider"
                value={String(p.provider ?? '')}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], provider: v };
                  setField(['auth', 'profiles'], next);
                }}
              />
              <SelectField
                label="模式"
                value={AUTH_MODE_OPTIONS.some((o) => o.value === String(p.mode ?? 'api-key')) ? String(p.mode ?? 'api-key') : 'api-key'}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], mode: v };
                  setField(['auth', 'profiles'], next);
                }}
                options={AUTH_MODE_OPTIONS}
              />
              <TextField
                label="邮箱"
                value={String(p.email ?? '')}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], email: v };
                  setField(['auth', 'profiles'], next);
                }}
                placeholder="user@example.com"
              />
            </ConfigCard>
          ))
        )}
        <AddButton
          label="添加认证配置"
          onClick={() => setField(['auth', 'profiles'], [...profiles, { provider: '', mode: 'api-key' }])}
        />
      </ConfigSection>

      <ConfigSection title="冷却配置" icon={Timer} iconColor="text-red-500" defaultOpen={false}>
        <TextField
          label="冷却配置 JSON"
          desc="冷却时间等配置"
          value={JSON.stringify(getField(['auth', 'cooldowns']) || {}, null, 2)}
          onChange={(v) => {
            try {
              setField(['auth', 'cooldowns'], JSON.parse(v));
            } catch {
              /* ignore */
            }
          }}
          multiline
        />
      </ConfigSection>
    </div>
  );
};
