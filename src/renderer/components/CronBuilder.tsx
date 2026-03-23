// AxonClaw - Cron Builder Component
// 参考 AxonClawX CronBuilder.tsx

import { useState } from 'react';

export interface CronValue {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface CronBuilderProps {
  value?: string;
  onChange?: (cron: string) => void;
}

const PRESET_TEMPLATES = [
  { label: '每分钟', cron: '* * * * *', desc: '每分钟执行一次' },
  { label: '每小时', cron: '0 * * * *', desc: '每小时整点执行' },
  { label: '每天', cron: '0 0 * * *', desc: '每天午夜执行' },
  { label: '每周', cron: '0 0 * * 0', desc: '每周日午夜执行' },
  { label: '每月', cron: '0 0 1 * *', desc: '每月 1 号午夜执行' },
  { label: '工作日', cron: '0 9 * * 1-5', desc: '工作日上午 9 点执行' },
];

export function CronBuilder({ value = '* * * * *', onChange }: CronBuilderProps) {
  const [parts, setParts] = useState(value.split(' '));

  const updatePart = (index: number, newValue: string) => {
    const newParts = [...parts];
    newParts[index] = newValue;
    setParts(newParts);
    onChange?.(newParts.join(' '));
  };

  const getCronDescription = (cron: string): string => {
    // 简单实现，可以扩展更详细的中文描述
    const templates = PRESET_TEMPLATES.find(t => t.cron === cron);
    if (templates) return templates.desc;
    return '自定义 Cron 表达式';
  };

  return (
    <div className="space-y-4">
      {/* 预设模板 */}
      <div>
        <label className="block text-sm text-muted mb-2">快速选择</label>
        <div className="grid grid-cols-3 gap-2">
          {PRESET_TEMPLATES.map((template) => (
            <button
              key={template.cron}
              onClick={() => {
                setParts(template.cron.split(' '));
                onChange?.(template.cron);
              }}
              className={`p-3 rounded-lg border text-left transition ${
                value === template.cron
                  ? 'border-[#0a84ff] bg-[#0a84ff]/10'
                  : 'border-[#3a3a3c] bg-[#2c2c2e] hover:border-[#48484a]'
              }`}
            >
              <div className="font-medium text-sm">{template.label}</div>
              <div className="text-xs text-muted mt-1">{template.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 自定义 Cron */}
      <div>
        <label className="block text-sm text-muted mb-2">自定义表达式</label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">分钟</label>
            <input
              type="text"
              value={parts[0]}
              onChange={(e) => updatePart(0, e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg text-center focus:outline-none focus:border-[#0a84ff]"
              placeholder="*"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">小时</label>
            <input
              type="text"
              value={parts[1]}
              onChange={(e) => updatePart(1, e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg text-center focus:outline-none focus:border-[#0a84ff]"
              placeholder="*"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">日期</label>
            <input
              type="text"
              value={parts[2]}
              onChange={(e) => updatePart(2, e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg text-center focus:outline-none focus:border-[#0a84ff]"
              placeholder="*"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">月份</label>
            <input
              type="text"
              value={parts[3]}
              onChange={(e) => updatePart(3, e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg text-center focus:outline-none focus:border-[#0a84ff]"
              placeholder="*"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-muted mb-1">星期</label>
            <input
              type="text"
              value={parts[4]}
              onChange={(e) => updatePart(4, e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1c1e] border border-[#3a3a3c] rounded-lg text-center focus:outline-none focus:border-[#0a84ff]"
              placeholder="*"
            />
          </div>
        </div>
      </div>

      {/* 预览 */}
      <div className="p-4 bg-[#2c2c2e] rounded-lg border border-[#3a3a3c]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted mb-1">Cron 表达式</div>
            <code className="text-lg font-mono text-[#0a84ff]">{parts.join(' ')}</code>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted mb-1">说明</div>
            <div className="text-sm">{getCronDescription(parts.join(' '))}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
