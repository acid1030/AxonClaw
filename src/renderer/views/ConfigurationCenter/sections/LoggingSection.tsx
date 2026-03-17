/**
 * 日志配置 - 表单式 UI
 */
import React from 'react';
import { FileText, Bug, BarChart3, TrendingUp } from 'lucide-react';
import {
  ConfigSection,
  SelectField,
  TextField,
  NumberField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const LOG_LEVEL_OPTIONS = [
  { value: 'silent', label: '静默' },
  { value: 'fatal', label: '致命' },
  { value: 'error', label: '错误' },
  { value: 'warn', label: '警告' },
  { value: 'info', label: '信息' },
  { value: 'debug', label: '调试' },
  { value: 'trace', label: '追踪' },
];
const CONSOLE_STYLE_OPTIONS = [
  { value: 'pretty', label: '美化' },
  { value: 'compact', label: '紧凑' },
  { value: 'json', label: 'JSON' },
];
const REDACT_OPTIONS = [
  { value: '', label: '关闭' },
  { value: 'off', label: '关闭' },
  { value: 'tools', label: '工具' },
];
const OTEL_PROTOCOL_OPTIONS = [
  { value: 'http/protobuf', label: 'HTTP/Protobuf' },
  { value: 'grpc', label: 'gRPC' },
];

export const LoggingSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (path: string[]) => getField(path);

  return (
    <div className="space-y-4">
      <ConfigSection title="日志配置" icon={FileText} iconColor="text-yellow-500">
        <SelectField
          label="日志级别"
          value={String(g(['logging', 'level']) ?? 'info')}
          onChange={(v) => setField(['logging', 'level'], v)}
          options={LOG_LEVEL_OPTIONS}
        />
        <TextField
          label="日志文件"
          value={String(g(['logging', 'file']) ?? '')}
          onChange={(v) => setField(['logging', 'file'], v)}
          placeholder="gateway.log"
        />
        <NumberField
          label="最大文件字节"
          value={g(['logging', 'maxFileBytes']) as number | undefined}
          onChange={(v) => setField(['logging', 'maxFileBytes'], v)}
          min={0}
        />
        <SelectField
          label="控制台级别"
          value={String(g(['logging', 'consoleLevel']) ?? 'info')}
          onChange={(v) => setField(['logging', 'consoleLevel'], v)}
          options={LOG_LEVEL_OPTIONS}
        />
        <SelectField
          label="控制台样式"
          value={String(g(['logging', 'consoleStyle']) ?? 'pretty')}
          onChange={(v) => setField(['logging', 'consoleStyle'], v)}
          options={CONSOLE_STYLE_OPTIONS}
        />
        <SelectField
          label="敏感信息脱敏"
          value={String(g(['logging', 'redactSensitive']) ?? '')}
          onChange={(v) => setField(['logging', 'redactSensitive'], v)}
          options={REDACT_OPTIONS}
        />
        <ArrayField
          label="脱敏正则"
          value={(g(['logging', 'redactPatterns']) as string[]) ?? []}
          onChange={(v) => setField(['logging', 'redactPatterns'], v)}
          placeholder="regex-pattern"
        />
      </ConfigSection>

      <ConfigSection title="诊断" icon={Bug} iconColor="text-yellow-500" defaultOpen={false}>
        <SwitchField
          label="启用诊断"
          value={g(['diagnostics', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'enabled'], v)}
        />
        <ArrayField
          label="诊断标志"
          value={(g(['diagnostics', 'flags']) as string[]) ?? []}
          onChange={(v) => setField(['diagnostics', 'flags'], v)}
          placeholder="flag-name"
        />
        <NumberField
          label="卡顿会话警告毫秒"
          value={g(['diagnostics', 'stuckSessionWarnMs']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'stuckSessionWarnMs'], v)}
          min={0}
          step={1000}
        />
      </ConfigSection>

      <ConfigSection title="OpenTelemetry" icon={BarChart3} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label="启用"
          value={g(['diagnostics', 'otel', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'otel', 'enabled'], v)}
        />
        <TextField
          label="端点"
          value={String(g(['diagnostics', 'otel', 'endpoint']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'otel', 'endpoint'], v)}
          placeholder="http://localhost:4318"
        />
        <SelectField
          label="协议"
          value={String(g(['diagnostics', 'otel', 'protocol']) ?? 'http/protobuf')}
          onChange={(v) => setField(['diagnostics', 'otel', 'protocol'], v)}
          options={OTEL_PROTOCOL_OPTIONS}
        />
        <TextField
          label="服务名"
          value={String(g(['diagnostics', 'otel', 'serviceName']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'otel', 'serviceName'], v)}
          placeholder="openclaw-gateway"
        />
        <SwitchField
          label="追踪"
          value={g(['diagnostics', 'otel', 'traces']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'traces'], v)}
        />
        <SwitchField
          label="指标"
          value={g(['diagnostics', 'otel', 'metrics']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'metrics'], v)}
        />
        <SwitchField
          label="日志"
          value={g(['diagnostics', 'otel', 'logs']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'logs'], v)}
        />
        <NumberField
          label="采样率"
          value={g(['diagnostics', 'otel', 'sampleRate']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'otel', 'sampleRate'], v)}
          min={0}
          max={1}
          step={0.1}
        />
        <NumberField
          label="刷新间隔(ms)"
          value={g(['diagnostics', 'otel', 'flushIntervalMs']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'otel', 'flushIntervalMs'], v)}
          min={0}
          step={1000}
        />
      </ConfigSection>

      <ConfigSection title="缓存追踪" icon={TrendingUp} iconColor="text-amber-500" defaultOpen={false}>
        <SwitchField
          label="启用"
          value={g(['diagnostics', 'cacheTrace', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'enabled'], v)}
        />
        <TextField
          label="文件路径"
          value={String(g(['diagnostics', 'cacheTrace', 'filePath']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'filePath'], v)}
        />
        <SwitchField
          label="包含消息"
          value={g(['diagnostics', 'cacheTrace', 'includeMessages']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includeMessages'], v)}
        />
        <SwitchField
          label="包含提示"
          value={g(['diagnostics', 'cacheTrace', 'includePrompt']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includePrompt'], v)}
        />
        <SwitchField
          label="包含系统"
          value={g(['diagnostics', 'cacheTrace', 'includeSystem']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includeSystem'], v)}
        />
      </ConfigSection>
    </div>
  );
};
