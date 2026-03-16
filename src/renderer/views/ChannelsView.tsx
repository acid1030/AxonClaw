/**
 * AxonClaw - Channels View
 * Channel 配置界面 - 从设计稿实现
 */

import React from 'react';

const channels = [
  { id: 'telegram', name: 'Telegram', type: 'Bot API', status: 'connected', desc: 'Bot Token 已配置 · DM 配对完成', color: 'blue' },
  { id: 'discord', name: 'Discord', type: 'Bot + Guild', status: 'unconfigured', desc: 'Bot Token、Guild ID', color: 'purple' },
  { id: 'feishu', name: '飞书', type: 'Lark / 企业微信', status: 'unconfigured', desc: 'PIPELINE-4.2 社交/办公集成', color: 'green' },
  { id: 'slack', name: 'Slack', type: 'Bot + Workspace', status: 'connected', desc: 'OAuth 已配置', color: 'blue' },
  { id: 'wechat', name: '微信', type: '企业微信', status: 'unconfigured', desc: '即将支持', color: 'amber' },
];

const ChannelsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Channel 管理</h1>
          <p className="text-sm text-white/60">连接消息平台 · StepWizard 配置向导</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          + 添加 Channel
        </button>
      </div>

      {/* Channel 卡片网格 */}
      <div className="grid grid-cols-3 gap-4">
        {channels.map((channel) => (
          <div
            key={channel.id}
            className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-5"
          >
            {/* 顶部色条 */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              channel.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
              channel.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
              channel.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              'bg-gradient-to-r from-amber-500 to-orange-500'
            }`} />

            {/* 头部 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-medium">{channel.name}</div>
                <div className="text-xs text-white/40">{channel.type}</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] ${
                channel.status === 'connected' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/10 text-white/50'
              }`}>
                {channel.status === 'connected' ? '已连接' : '未配置'}
              </span>
            </div>

            {/* 描述 */}
            <p className="text-xs text-white/50 mb-4">{channel.desc}</p>

            {/* 按钮 */}
            {channel.status === 'connected' ? (
              <div className="flex gap-2">
                <button className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">配置</button>
                <button className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">测试</button>
              </div>
            ) : channel.id === 'wechat' ? (
              <button className="w-full py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/50" disabled>
                即将支持
              </button>
            ) : (
              <button className="w-full py-1.5 bg-blue-500 rounded text-xs text-white hover:bg-blue-600 transition-colors">
                配置向导
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export { ChannelsView };
export default ChannelsView;
