/**
 * 会话配置 - 表单式 UI
 */
import React from 'react';
import { GitBranch, RotateCcw, Layers, Link2, Wrench, ArrowLeftRight } from 'lucide-react';
import { ConfigSection, SelectField, NumberField, TextField, ArrayField, SwitchField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const SCOPE_OPTIONS = [
  { value: 'per-sender', label: '按发送者' },
  { value: 'global', label: '全局' },
];
const DM_SCOPE_OPTIONS = [
  { value: 'main', label: '主会话' },
  { value: 'per-peer', label: '按对端' },
  { value: 'per-channel-peer', label: '按频道+对端' },
  { value: 'per-account-channel-peer', label: '按账户+频道+对端' },
];
const RESET_MODE_OPTIONS = [
  { value: 'daily', label: '每日' },
  { value: 'idle', label: '空闲' },
  { value: 'off', label: '关闭' },
];
const MAINT_MODE_OPTIONS = [
  { value: 'enforce', label: '强制' },
  { value: 'warn', label: '警告' },
];

export const SessionSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['session', ...p]);
  const s = (p: string[], v: unknown) => setField(['session', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="会话范围" icon={GitBranch} iconColor="text-indigo-500">
        <SelectField
          label="范围"
          desc="会话隔离策略"
          value={String(g(['scope']) ?? 'per-sender')}
          onChange={(v) => s(['scope'], v)}
          options={SCOPE_OPTIONS}
        />
        <SelectField
          label="私聊范围"
          value={String(g(['dmScope']) ?? 'main')}
          onChange={(v) => s(['dmScope'], v)}
          options={DM_SCOPE_OPTIONS}
        />
        <NumberField
          label="空闲分钟数"
          value={g(['idleMinutes']) as number | undefined}
          onChange={(v) => s(['idleMinutes'], v)}
          min={0}
        />
        <TextField
          label="会话存储路径"
          value={String(g(['store']) ?? '')}
          onChange={(v) => s(['store'], v)}
        />
        <TextField
          label="主键"
          value={String(g(['mainKey']) ?? '')}
          onChange={(v) => s(['mainKey'], v)}
          placeholder="main"
        />
        <NumberField
          label="父分支最大 Token"
          value={g(['parentForkMaxTokens']) as number | undefined}
          onChange={(v) => s(['parentForkMaxTokens'], v)}
          min={0}
        />
        <ArrayField
          label="重置触发词"
          value={(g(['resetTriggers']) as string[]) ?? []}
          onChange={(v) => s(['resetTriggers'], v)}
          placeholder="/reset"
        />
      </ConfigSection>

      <ConfigSection title="会话重置" icon={RotateCcw} iconColor="text-orange-500">
        <SelectField
          label="重置模式"
          value={String(g(['reset', 'mode']) ?? 'idle')}
          onChange={(v) => s(['reset', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
        />
        {g(['reset', 'mode']) === 'daily' && (
          <NumberField
            label="重置小时"
            value={g(['reset', 'atHour']) as number | undefined}
            onChange={(v) => s(['reset', 'atHour'], v)}
            min={0}
            max={23}
          />
        )}
        {g(['reset', 'mode']) === 'idle' && (
          <NumberField
            label="空闲分钟"
            value={g(['reset', 'idleMinutes']) as number | undefined}
            onChange={(v) => s(['reset', 'idleMinutes'], v)}
            min={1}
          />
        )}
      </ConfigSection>

      <ConfigSection title="按类型重置" icon={Layers} iconColor="text-teal-500" defaultOpen={false}>
        <SelectField
          label="私聊"
          value={String(g(['resetByType', 'dm', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'dm', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
        <SelectField
          label="群组"
          value={String(g(['resetByType', 'group', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'group', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
        <SelectField
          label="线程"
          value={String(g(['resetByType', 'thread', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'thread', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
      </ConfigSection>

      <ConfigSection title="线程绑定" icon={Link2} iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label="启用"
          value={g(['threadBindings', 'enabled']) === true}
          onChange={(v) => s(['threadBindings', 'enabled'], v)}
        />
        <NumberField
          label="空闲小时"
          value={g(['threadBindings', 'idleHours']) as number | undefined}
          onChange={(v) => s(['threadBindings', 'idleHours'], v)}
          min={0}
        />
        <NumberField
          label="最大存活小时"
          value={g(['threadBindings', 'maxAgeHours']) as number | undefined}
          onChange={(v) => s(['threadBindings', 'maxAgeHours'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title="会话维护" icon={Wrench} iconColor="text-amber-500" defaultOpen={false}>
        <SelectField
          label="维护模式"
          value={String(g(['maintenance', 'mode']) ?? 'enforce')}
          onChange={(v) => s(['maintenance', 'mode'], v)}
          options={MAINT_MODE_OPTIONS}
        />
        <TextField
          label="清理间隔"
          value={String(g(['maintenance', 'pruneAfter']) ?? '')}
          onChange={(v) => s(['maintenance', 'pruneAfter'], v)}
          placeholder="30d"
        />
        <NumberField
          label="最大条目数"
          value={g(['maintenance', 'maxEntries']) as number | undefined}
          onChange={(v) => s(['maintenance', 'maxEntries'], v)}
          min={1}
        />
        <TextField
          label="轮转字节"
          value={String(g(['maintenance', 'rotateBytes']) ?? '')}
          onChange={(v) => s(['maintenance', 'rotateBytes'], v)}
          placeholder="50mb"
        />
        <TextField
          label="最大磁盘字节"
          value={String(g(['maintenance', 'maxDiskBytes']) ?? '')}
          onChange={(v) => s(['maintenance', 'maxDiskBytes'], v)}
          placeholder="500mb"
        />
      </ConfigSection>

      <ConfigSection title="代理间会话" icon={ArrowLeftRight} iconColor="text-violet-500" defaultOpen={false}>
        <NumberField
          label="最大乒乓轮数"
          value={g(['agentToAgent', 'maxPingPongTurns']) as number | undefined}
          onChange={(v) => s(['agentToAgent', 'maxPingPongTurns'], v)}
          min={1}
        />
      </ConfigSection>
    </div>
  );
};
