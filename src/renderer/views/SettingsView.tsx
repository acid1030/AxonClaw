/**
 * AxonClaw - Settings View
 * 系统设置界面 - 从设计稿实现
 */

import React, { useState } from 'react';

const settingsSections = [
  { id: 'api', name: 'API 密钥', icon: '🔑' },
  { id: 'general', name: '通用', icon: '🖥' },
  { id: 'appearance', name: '外观', icon: '🎨' },
  { id: 'shortcuts', name: '快捷键', icon: '⌨' },
  { id: 'about', name: '关于', icon: 'ℹ' },
];

const SettingsView: React.FC = () => {
  const [activeSection, setActiveSection] = useState('api');

  return (
    <div className="h-full flex">
      {/* 左侧导航 */}
      <div className="w-48 bg-white/5 border-r border-white/10 p-3">
        <div className="text-xs text-white/40 uppercase tracking-wider px-2 mb-2">账户</div>
        {settingsSections.slice(0, 2).map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              activeSection === section.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.name}</span>
          </button>
        ))}

        <div className="text-xs text-white/40 uppercase tracking-wider px-2 mt-4 mb-2">应用</div>
        {settingsSections.slice(2).map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors ${
              activeSection === section.id
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white/70'
            }`}
          >
            <span>{section.icon}</span>
            <span>{section.name}</span>
          </button>
        ))}
      </div>

      {/* 右侧内容 */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeSection === 'api' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">API 密钥</h2>
            <p className="text-sm text-white/50 mb-6">管理各 AI 服务商的 API 访问凭据</p>

            <div className="space-y-4">
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="text-white font-medium mb-1">Anthropic</div>
                <p className="text-xs text-white/40 mb-3">用于访问 Claude 系列模型</p>
                <div className="flex items-center gap-2">
                  <input 
                    type="password" 
                    placeholder="sk-ant-…" 
                    className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-white/30 outline-none focus:border-blue-500"
                  />
                  <button className="px-3 py-2 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">显示</button>
                  <button className="px-3 py-2 bg-blue-500 rounded text-xs text-white hover:bg-blue-600 transition-colors">验证</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'general' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">通用设置</h2>
            <p className="text-sm text-white/50 mb-6">应用行为与启动偏好</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                <div>
                  <div className="text-white text-sm">启动时打开上次对话</div>
                  <div className="text-xs text-white/40">启动时自动恢复上次的对话</div>
                </div>
                <div className="w-9 h-5 bg-blue-500 rounded-full relative cursor-pointer">
                  <div className="absolute top-0.5 left-4 w-4 h-4 bg-white rounded-full shadow" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'appearance' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">外观</h2>
            <p className="text-sm text-white/50 mb-6">主题、字体与界面风格</p>

            <div className="flex gap-3">
              <div className="flex-1 p-4 bg-white/5 border border-blue-500 rounded-xl text-center cursor-pointer">
                <div className="text-white text-sm mb-1">深色</div>
                <div className="text-xs text-white/40">默认主题</div>
              </div>
              <div className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl text-center cursor-pointer hover:border-white/30">
                <div className="text-white text-sm mb-1">浅色</div>
                <div className="text-xs text-white/40">明亮模式</div>
              </div>
              <div className="flex-1 p-4 bg-white/5 border border-white/10 rounded-xl text-center cursor-pointer hover:border-white/30">
                <div className="text-white text-sm mb-1">自动</div>
                <div className="text-xs text-white/40">跟随系统</div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'shortcuts' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">快捷键</h2>
            <p className="text-sm text-white/50 mb-6">自定义键盘快捷操作</p>

            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-sm text-white/70">新建对话</span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white/50">⌘ N</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-sm text-white/70">打开设置</span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white/50">⌘ ,</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-xl">
                <span className="text-sm text-white/70">聚焦输入框</span>
                <span className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white/50">⌘ L</span>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'about' && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">关于 OpenClaw</h2>
            <p className="text-sm text-white/50 mb-6">版本信息与更新</p>

            <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl">🦾</div>
                <div>
                  <div className="text-white font-medium">OpenClaw</div>
                  <div className="text-xs text-white/40">本地 AI Agent 平台</div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-white/50">
                <div className="flex justify-between"><span>版本</span><span className="font-mono">v0.9.4</span></div>
                <div className="flex justify-between"><span>构建日期</span><span className="font-mono">2026-03-15</span></div>
                <div className="flex justify-between"><span>Claude API</span><span className="font-mono">2024-11-01</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export { SettingsView };
export default SettingsView;
