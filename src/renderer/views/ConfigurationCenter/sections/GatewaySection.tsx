/**
 * 网关配置 - 表单式 UI
 */
import React from 'react';
import { Settings, Lock, Gauge } from 'lucide-react';
import {
  ConfigSection,
  NumberField,
  SelectField,
  TextField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const BIND_OPTIONS = [
  { value: 'auto', label: '自动' },
  { value: 'lan', label: '局域网' },
  { value: 'loopback', label: '回环' },
  { value: 'custom', label: '自定义' },
];
const MODE_OPTIONS = [
  { value: 'local', label: '本地' },
  { value: 'remote', label: '远程' },
];
const AUTH_MODE_OPTIONS = [
  { value: '', label: '— 选择 —' },
  { value: 'token', label: 'Token' },
  { value: 'password', label: '密码' },
  { value: 'trusted-proxy', label: '可信代理' },
  { value: 'none', label: '无' },
];

function ensureInOptions(value: string, options: { value: string }[]): string {
  if (!value) return '';
  return options.some((o) => o.value === value) ? value : '';
}
const RELOAD_MODE_OPTIONS = [
  { value: 'off', label: '关闭' },
  { value: 'restart', label: '重启' },
  { value: 'hot', label: '热重载' },
  { value: 'hybrid', label: '混合' },
];

export const GatewaySection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['gateway', ...p]);
  const s = (p: string[], v: unknown) => setField(['gateway', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="基本设置" icon={Settings} iconColor="text-teal-500">
        <NumberField
          label="端口"
          value={g(['port']) as number | undefined}
          onChange={(v) => s(['port'], v)}
          min={1}
          max={65535}
        />
        <SelectField
          label="运行模式"
          value={ensureInOptions(String(g(['mode']) ?? 'local'), MODE_OPTIONS) || 'local'}
          onChange={(v) => s(['mode'], v)}
          options={MODE_OPTIONS}
        />
        <SelectField
          label="绑定地址"
          value={ensureInOptions(String(g(['bind']) ?? 'auto'), BIND_OPTIONS) || 'auto'}
          onChange={(v) => s(['bind'], v)}
          options={BIND_OPTIONS}
        />
        {g(['bind']) === 'custom' && (
          <TextField
            label="自定义绑定主机"
            value={String(g(['customBindHost']) ?? '')}
            onChange={(v) => s(['customBindHost'], v)}
            placeholder="0.0.0.0"
          />
        )}
        <NumberField
          label="频道健康检查(分钟)"
          value={g(['channelHealthCheckMinutes']) as number | undefined}
          onChange={(v) => s(['channelHealthCheckMinutes'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title="认证" icon={Lock} iconColor="text-red-500">
        <SelectField
          label="认证模式"
          value={ensureInOptions(String(g(['auth', 'mode']) ?? ''), AUTH_MODE_OPTIONS)}
          onChange={(v) => s(['auth', 'mode'], v)}
          options={AUTH_MODE_OPTIONS}
        />
        {(g(['auth', 'mode']) === 'token' || !g(['auth', 'mode'])) && (
          <TextField
            label="Token"
            value={String(g(['auth', 'token']) ?? '')}
            onChange={(v) => s(['auth', 'token'], v)}
          />
        )}
        {(g(['auth', 'mode']) === 'password' || !g(['auth', 'mode'])) && (
          <TextField
            label="密码"
            value={String(g(['auth', 'password']) ?? '')}
            onChange={(v) => s(['auth', 'password'], v)}
          />
        )}
        {g(['auth', 'mode']) === 'trusted-proxy' && (
          <>
            <TextField
              label="用户头"
              value={String(g(['auth', 'trustedProxy', 'userHeader']) ?? '')}
              onChange={(v) => s(['auth', 'trustedProxy', 'userHeader'], v)}
              placeholder="X-Forwarded-User"
            />
            <ArrayField
              label="必需头"
              value={(g(['auth', 'trustedProxy', 'requiredHeaders']) as string[]) ?? []}
              onChange={(v) => s(['auth', 'trustedProxy', 'requiredHeaders'], v)}
              placeholder="X-Custom-Header"
            />
            <ArrayField
              label="允许用户"
              value={(g(['auth', 'trustedProxy', 'allowUsers']) as string[]) ?? []}
              onChange={(v) => s(['auth', 'trustedProxy', 'allowUsers'], v)}
              placeholder="admin"
            />
          </>
        )}
      </ConfigSection>

      <ConfigSection title="认证限流" icon={Gauge} iconColor="text-orange-500" defaultOpen={false}>
        <NumberField
          label="最大尝试次数"
          value={g(['auth', 'rateLimit', 'maxAttempts']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'maxAttempts'], v)}
          min={1}
        />
        <NumberField
          label="窗口(ms)"
          value={g(['auth', 'rateLimit', 'windowMs']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'windowMs'], v)}
          min={0}
          step={1000}
        />
        <NumberField
          label="锁定(ms)"
          value={g(['auth', 'rateLimit', 'lockoutMs']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'lockoutMs'], v)}
          min={0}
          step={1000}
        />
        <SwitchField
          label="回环豁免"
          value={g(['auth', 'rateLimit', 'exemptLoopback']) === true}
          onChange={(v) => s(['auth', 'rateLimit', 'exemptLoopback'], v)}
        />
      </ConfigSection>
    </div>
  );
};
