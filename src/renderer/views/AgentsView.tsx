/**
 * AxonClaw - Agents View
 * Agent 管理界面 - 从设计稿实现
 */

import React from 'react';

const mockAgents = [
  { id: 'main', name: 'main', icon: '🛠', status: 'offline', desc: '默认主 Agent，负责处理所有通用对话和任务分发。需要先配置 Anthropic API key 才能运行。', tools: ['通用', 'web_search', 'code_exec'], stats: { calls: '—', success: '—', time: '—' } },
  { id: 'researcher', name: 'researcher', icon: '🔍', status: 'online', desc: '专注于网络搜索和资料整理，自动从多个来源聚合信息并生成结构化报告。', tools: ['搜索', '报告', 'web_search', 'fetch_url'], stats: { calls: '1,284', success: '98.2%', time: '2.4s' } },
  { id: 'coder', name: 'coder', icon: '💻', status: 'idle', desc: '专业代码生成与审查 Agent，支持 20+ 编程语言，内置代码执行沙箱和单元测试。', tools: ['代码', '测试', 'code_exec', 'file_write'], stats: { calls: '3,560', success: '96.7%', time: '3.8s' } },
  { id: 'analyst', name: 'analyst', icon: '📊', status: 'idle', desc: '数据分析 Agent，可处理 CSV、JSON 数据，生成可视化图表并输出分析洞察报告。', tools: ['数据', '图表', 'code_exec', 'file_read'], stats: { calls: '892', success: '99.1%', time: '5.2s' } },
];

const AgentsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent 管理</h1>
          <p className="text-sm text-white/60">创建、配置、分配任务</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="搜索 Agent…"
            className="w-48 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 outline-none"
          />
          <button className="px-4 py-1.5 bg-blue-500 rounded-lg text-sm text-white">+ 新建 Agent</button>
        </div>
      </div>

      {/* 状态过滤 */}
      <div className="flex gap-2 mb-5">
        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white cursor-pointer">全部 (4)</span>
        <span className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm cursor-pointer">运行中 (1)</span>
        <span className="px-3 py-1.5 bg-amber-500/15 text-amber-400 rounded-lg text-sm cursor-pointer">空闲 (2)</span>
        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm text-white/60 cursor-pointer">离线 (1)</span>
      </div>

      {/* API Key 警告 */}
      <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-5">
        <span className="text-xl">⚠</span>
        <div className="flex-1 text-sm">
          <strong className="text-amber-400">main</strong>
          <span className="text-white/70"> agent 未配置 API key — 运行 </span>
          <code className="px-1.5 py-0.5 bg-white/10 rounded text-xs text-white/80">openclaw agents add main</code>
          <span className="text-white/70"> 完成配置</span>
        </div>
        <button className="px-3 py-1.5 bg-white/10 border border-white/10 rounded-lg text-sm text-white/80">配置 Key</button>
      </div>

      {/* Agent 卡片网格 */}
      <div className="grid grid-cols-3 gap-4">
        {mockAgents.map((agent) => (
          <div
            key={agent.id}
            className={`relative overflow-hidden p-4 rounded-xl border ${
              agent.status === 'online' ? 'bg-green-500/5 border-green-500/20' :
              agent.status === 'idle' ? 'bg-blue-500/5 border-blue-500/20' :
              'bg-white/5 border-white/10'
            }`}
          >
            {/* 顶部色条 */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              agent.status === 'online' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              agent.status === 'idle' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
              'bg-gradient-to-r from-red-500 to-orange-500'
            }`} />
            
            {/* 头部 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${
                  agent.status === 'online' ? 'bg-green-500/15' :
                  agent.status === 'idle' ? 'bg-blue-500/15' :
                  'bg-red-500/15'
                }`}>{agent.icon}</div>
                <div>
                  <div className="text-sm font-medium text-white">{agent.name}</div>
                  <div className="text-[10px] text-white/40 font-mono">id: {agent.id}</div>
                </div>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                agent.status === 'online' ? 'bg-green-500 shadow-green-500/40 shadow-sm' :
                agent.status === 'idle' ? 'bg-amber-500' :
                'bg-white/30'
              }`} />
            </div>

            {/* 描述 */}
            <p className="text-xs text-white/60 leading-relaxed mb-3">{agent.desc}</p>

            {/* 标签 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {agent.tools.map((tool) => (
                <span
                  key={tool}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    tool.includes('_') ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-white/50'
                  }`}
                >{tool}</span>
              ))}
            </div>

            {/* 统计 */}
            <div className="grid grid-cols-3 gap-1.5 mb-3">
              <div className="p-1.5 bg-white/5 rounded text-center">
                <div className="text-xs font-medium text-white">{agent.stats.calls}</div>
                <div className="text-[9px] text-white/40">调用次数</div>
              </div>
              <div className="p-1.5 bg-white/5 rounded text-center">
                <div className="text-xs font-medium text-white">{agent.stats.success}</div>
                <div className="text-[9px] text-white/40">成功率</div>
              </div>
              <div className="p-1.5 bg-white/5 rounded text-center">
                <div className="text-xs font-medium text-white">{agent.stats.time}</div>
                <div className="text-[9px] text-white/40">平均耗时</div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-1.5">
              <button className="flex-1 py-1.5 bg-blue-500 rounded text-[11px] text-white">
                {agent.status === 'offline' ? '配置 Key' : '启动'}
              </button>
              <button className="flex-1 py-1.5 bg-white/5 border border-white/10 rounded text-[11px] text-white/70">编辑</button>
              <button className="flex-1 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] text-red-400">删除</button>
            </div>
          </div>
        ))}

        {/* 新建 Agent 卡片 */}
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/20 rounded-xl text-white/40 cursor-pointer hover:border-blue-500/40 hover:bg-blue-500/5 transition-colors">
          <div className="text-2xl mb-1">＋</div>
          <div className="text-xs">新建 Agent</div>
        </div>
      </div>
    </div>
  );
};

export { AgentsView };
export default AgentsView;
