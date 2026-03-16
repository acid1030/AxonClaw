/**
 * AxonClaw - Memory View
 * 记忆系统界面 - 从设计稿实现
 */

import React from 'react';

const memories = [
  { id: '1', content: '项目采用 LanceDB 向量记忆', date: '2026-03-14', category: '技术决策' },
  { id: '2', content: 'Gateway 默认端口 18789', date: '2026-03-12', category: '配置' },
  { id: '3', content: '用户偏好深色模式', date: '2026-03-10', category: '偏好' },
  { id: '4', content: 'Claude Sonnet 4 为默认模型', date: '2026-03-08', category: '技术决策' },
];

const MemoryView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">记忆系统</h1>
          <p className="text-sm text-white/60">LanceDB 语义检索 · PIPELINE-2.1 记忆与 Chat 打通</p>
        </div>
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
          <span className="text-white/40">🔍</span>
          <input 
            type="text" 
            placeholder="语义搜索记忆..." 
            className="bg-none border-none outline-none text-sm text-white placeholder-white/30 w-48"
          />
        </div>
      </div>

      {/* 2列布局 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 记忆列表 */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-medium">记忆列表</div>
              <div className="text-xs text-white/40">128 条 · 支持语义搜索</div>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/50 cursor-pointer hover:bg-white/10">全部</span>
              <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/50 cursor-pointer hover:bg-white/10">技术</span>
              <span className="px-2 py-1 bg-white/5 rounded text-[10px] text-white/50 cursor-pointer hover:bg-white/10">偏好</span>
            </div>
          </div>

          <div className="space-y-2">
            {memories.map((memory) => (
              <div key={memory.id} className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer">
                <div className="text-sm text-white mb-1">{memory.content}</div>
                <div className="text-[10px] text-white/40">{memory.date} · {memory.category}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 记忆写入策略 */}
        <div className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-white font-medium">记忆写入策略</div>
              <div className="text-xs text-white/40">自动/手动/关闭</div>
            </div>
          </div>

          <p className="text-sm text-white/50 mb-4">回复后可选择写入 · useMemory Hook 与 ChatView 集成</p>

          <div className="flex gap-2">
            <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded text-xs cursor-pointer">自动</span>
            <span className="px-3 py-1.5 bg-white/5 text-white/50 rounded text-xs cursor-pointer hover:bg-white/10">手动</span>
            <span className="px-3 py-1.5 bg-white/5 text-white/50 rounded text-xs cursor-pointer hover:bg-white/10">关闭</span>
          </div>

          {/* 统计 */}
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xl font-bold text-white">128</div>
              <div className="text-xs text-white/40">总记忆数</div>
            </div>
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-xl font-bold text-white">3.2MB</div>
              <div className="text-xs text-white/40">向量库大小</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MemoryView };
export default MemoryView;
