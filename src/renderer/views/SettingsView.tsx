/**
 * AxonClaw - Settings View
 * 系统设置界面 - ClawDeckX 风格配置编辑区块结构
 */

import React, { useState } from 'react';
import {
  Key,
  Monitor,
  Palette,
  Keyboard,
  Info,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const settingsSections = [
  { id: 'api', name: 'API 密钥', icon: Key },
  { id: 'general', name: '通用', icon: Monitor },
  { id: 'appearance', name: '外观', icon: Palette },
  { id: 'shortcuts', name: '快捷键', icon: Keyboard },
  { id: 'about', name: '关于', icon: Info },
];

interface SettingsViewProps {
  embedded?: boolean;
}

const SettingsView: React.FC<SettingsViewProps> = ({ embedded }) => {
  const [activeSection, setActiveSection] = useState('api');

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="系统设置"
          subtitle="API 密钥、外观、快捷键等"
          stats={[{ label: '配置项', value: settingsSections.length }]}
          statsBorderColor="border-sky-500/40"
        />
        <div className="flex gap-6">
        {/* 左侧导航 */}
        <aside className="w-52 shrink-0">
          <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5 mb-1">
              账户
            </div>
            {settingsSections.slice(0, 2).map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <span>{section.name}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />
                )}
              </button>
            ))}

            <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5 mt-4 mb-1">
              应用
            </div>
            {settingsSections.slice(2).map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
                  activeSection === section.id
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <section.icon className="w-4 h-4 shrink-0" />
                <span>{section.name}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto text-primary/60" />
                )}
              </button>
            ))}
          </div>
        </aside>

        {/* 右侧内容 - 配置编辑区块 */}
        <div className="flex-1 min-w-0">
          {activeSection === 'api' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  API 密钥
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  管理各 AI 服务商的 API 访问凭据
                </p>

                <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-4">
                  <div className="text-sm font-medium text-foreground mb-1">
                    Anthropic
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    用于访问 Claude 系列模型
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="sk-ant-…"
                      className="flex-1 px-3 py-2 rounded-xl bg-[#0f172a] border-2 border-sky-500/40 text-sm text-foreground placeholder-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <button className="px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-sm text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
                      显示
                    </button>
                    <button className="px-3 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
                      验证
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'general' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  通用设置
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  应用行为与启动偏好
                </p>

                <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        启动时打开上次对话
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        启动时自动恢复上次的对话
                      </div>
                    </div>
                    <div className="w-10 h-6 rounded-full bg-primary/20 relative cursor-pointer">
                      <div className="absolute top-1 left-1 w-4 h-4 bg-primary rounded-full shadow transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  外观
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  主题、字体与界面风格
                </p>

                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 text-center cursor-pointer">
                    <div className="text-sm font-medium text-foreground mb-1">
                      深色
                    </div>
                    <div className="text-xs text-muted-foreground">默认主题</div>
                  </div>
                  <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-4 text-center cursor-pointer hover:bg-[#334155]/50 transition-colors">
                    <div className="text-sm font-medium text-foreground mb-1">
                      浅色
                    </div>
                    <div className="text-xs text-muted-foreground">明亮模式</div>
                  </div>
                  <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-4 text-center cursor-pointer hover:bg-[#334155]/50 transition-colors">
                    <div className="text-sm font-medium text-foreground mb-1">
                      自动
                    </div>
                    <div className="text-xs text-muted-foreground">跟随系统</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'shortcuts' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  快捷键
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  自定义键盘快捷操作
                </p>

                <div className="space-y-2">
                  {[
                    { action: '新建对话', keys: '⌘ N' },
                    { action: '打开设置', keys: '⌘ ,' },
                    { action: '聚焦输入框', keys: '⌘ L' },
                  ].map((item) => (
                    <div
                      key={item.action}
                      className="flex items-center justify-between p-3 rounded-xl border-2 border-sky-500/40 bg-[#1e293b]"
                    >
                      <span className="text-sm text-foreground/90">
                        {item.action}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-black/5 dark:bg-white/5 text-xs font-mono text-muted-foreground">
                        {item.keys}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-bold text-foreground mb-1">
                  关于 AxonClaw
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  版本信息与更新
                </p>

                <div className="rounded-xl border-2 border-sky-500/40 bg-[#1e293b] p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-purple-500/30 flex items-center justify-center text-2xl">
                      🦾
                    </div>
                    <div>
                      <div className="text-sm font-bold text-foreground">
                        AxonClaw
                      </div>
                      <div className="text-xs text-muted-foreground">
                        本地 AI Agent 平台
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>版本</span>
                      <span className="font-mono">v1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span>构建日期</span>
                      <span className="font-mono">2026-03</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export { SettingsView };
export default SettingsView;
