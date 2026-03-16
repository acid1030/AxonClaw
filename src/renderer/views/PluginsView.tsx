/**
 * AxonClaw - Plugins View
 * 插件管理界面 - 从设计稿实现
 */

import React from 'react';

const plugins = [
  { id: '1', name: 'MCP Server', status: 'active', version: '1.0.0' },
  { id: '2', name: 'Memory Plugin', status: 'active', version: '2.1.0' },
  { id: '3', name: 'Web Search', status: 'inactive', version: '1.2.0' },
];

const PluginsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">插件管理</h1>
          <p className="text-sm text-white/60">安装和管理插件</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          浏览插件市场
        </button>
      </div>

      <div className="space-y-3">
        {plugins.map((plugin) => (
          <div key={plugin.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
            <div>
              <div className="text-white font-medium">{plugin.name}</div>
              <div className="text-xs text-white/40">v{plugin.version}</div>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] ${
              plugin.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
            }`}>
              {plugin.status === 'active' ? '已启用' : '已禁用'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export { PluginsView };
export default PluginsView;
