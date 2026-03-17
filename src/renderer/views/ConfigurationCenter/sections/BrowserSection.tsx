/**
 * 浏览器配置 - 表单式 UI
 */
import React from 'react';
import { Globe, Shield } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SwitchField,
  NumberField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

export const BrowserSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['browser', ...p]);
  const s = (p: string[], v: unknown) => setField(['browser', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title="浏览器配置" icon={Globe} iconColor="text-emerald-500">
        <SwitchField
          label="启用"
          value={g(['enabled']) === true}
          onChange={(v) => s(['enabled'], v)}
        />
        <SwitchField
          label="Evaluate 启用"
          value={g(['evaluateEnabled']) === true}
          onChange={(v) => s(['evaluateEnabled'], v)}
        />
        <TextField
          label="CDP URL"
          value={String(g(['cdpUrl']) ?? '')}
          onChange={(v) => s(['cdpUrl'], v)}
          placeholder="http://localhost:9222"
        />
        <NumberField
          label="远程 CDP 超时(ms)"
          value={g(['remoteCdpTimeoutMs']) as number | undefined}
          onChange={(v) => s(['remoteCdpTimeoutMs'], v)}
          min={0}
          step={1000}
        />
        <TextField
          label="可执行路径"
          value={String(g(['executablePath']) ?? '')}
          onChange={(v) => s(['executablePath'], v)}
        />
        <TextField
          label="颜色"
          value={String(g(['color']) ?? '')}
          onChange={(v) => s(['color'], v)}
          placeholder="#4285f4"
        />
        <SwitchField
          label="无头模式"
          value={g(['headless']) !== false}
          onChange={(v) => s(['headless'], v)}
        />
        <SwitchField
          label="无沙箱"
          value={g(['noSandbox']) === true}
          onChange={(v) => s(['noSandbox'], v)}
        />
        <SwitchField
          label="仅附加"
          value={g(['attachOnly']) === true}
          onChange={(v) => s(['attachOnly'], v)}
        />
        <TextField
          label="默认 Profile"
          value={String(g(['defaultProfile']) ?? '')}
          onChange={(v) => s(['defaultProfile'], v)}
        />
      </ConfigSection>

      <ConfigSection title="SSRF 策略" icon={Shield} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label="允许私有网络"
          value={g(['ssrfPolicy', 'allowPrivateNetwork']) === true}
          onChange={(v) => s(['ssrfPolicy', 'allowPrivateNetwork'], v)}
        />
        <ArrayField
          label="主机白名单"
          value={(g(['ssrfPolicy', 'hostnameAllowlist']) as string[]) ?? []}
          onChange={(v) => s(['ssrfPolicy', 'hostnameAllowlist'], v)}
          placeholder="*.example.com"
        />
      </ConfigSection>
    </div>
  );
};
