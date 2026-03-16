/**
 * AxonClaw - Sessions View
 * 会话管理界面 - 从设计稿实现
 */

import React from 'react';

const sessions = [
  { id: '1', title: 'OpenClaw 配置问题', messages: 12, lastActive: '5分钟前' },
  { id: '2', title: 'Python 异步爬虫', messages: 24, lastActive: '1小时前' },
  { id: '3', title: 'React Hooks 优化', messages: 8, lastActive: '2小时前' },
];

const SessionsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">会话管理</h1>
          <p className="text-sm text-white/60">查看和管理所有会话</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          + 新建会话
        </button>
      </div>

      <div className="space-y-2">
        {sessions.map((session) => (
          <div key={session.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer">
            <div>
              <div className="text-white font-medium">{session.title}</div>
              <div className="text-xs text-white/40">{session.messages} 条消息 · {session.lastActive}</div>
            </div>
            <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70">
              打开
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { SessionsView };
export default SessionsView;
