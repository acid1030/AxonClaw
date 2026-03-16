/**
 * AxonClaw - Logs View
 * 日志查看界面 - 从设计稿实现
 */

import React from 'react';

const logs = [
  { time: '14:22:01', level: 'INFO', agent: 'main', message: 'Agent initialized' },
  { time: '14:22:01', level: 'ERROR', agent: 'main', message: 'No API key found for provider "anthropic"' },
  { time: '14:22:05', level: 'INFO', agent: 'researcher', message: 'Starting web_search tool' },
  { time: '14:22:06', level: 'DEBUG', agent: 'researcher', message: 'fetch_url: https://example.com — status 200' },
  { time: '14:22:08', level: 'INFO', agent: 'researcher', message: 'Response complete. tokens_in=3420 tokens_out=812' },
];

const LogsView: React.FC = () => {
  return (
    <div className="h-full flex flex-col p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">系统日志</h1>
          <p className="text-sm text-white/60">Gateway / Agent / Channel 实时日志流</p>
        </div>
        <div className="flex items-center gap-2">
          <select className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/70 outline-none">
            <option>全部来源</option>
            <option>Gateway</option>
            <option>Agent</option>
          </select>
          <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-colors">
            导出
          </button>
          <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
            清空
          </button>
        </div>
      </div>

      {/* 级别过滤 */}
      <div className="flex gap-2 mb-4">
        <span className="px-3 py-1 bg-white/5 rounded text-xs text-white/50 cursor-pointer hover:bg-white/10">全部</span>
        <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded text-xs cursor-pointer">ERROR (1)</span>
        <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded text-xs cursor-pointer">WARN (0)</span>
        <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded text-xs cursor-pointer">INFO</span>
        <span className="px-3 py-1 bg-white/5 rounded text-xs text-white/50 cursor-pointer hover:bg-white/10">DEBUG</span>
      </div>

      {/* 日志列表 */}
      <div className="flex-1 bg-[#1a1a1a] rounded-lg p-4 font-mono text-xs overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="flex items-baseline gap-2 py-1 hover:bg-white/5">
            <span className="text-white/40 min-w-[70px]">{log.time}</span>
            <span className={`min-w-[50px] font-medium ${
              log.level === 'ERROR' ? 'text-red-400' :
              log.level === 'WARN' ? 'text-amber-400' :
              log.level === 'INFO' ? 'text-blue-400' :
              'text-white/40'
            }`}>[{log.level}]</span>
            <span className="text-green-400 min-w-[80px]">[{log.agent}]</span>
            <span className="text-white/80 flex-1">{log.message}</span>
          </div>
        ))}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>实时</span>
        </div>
        <span>5 条日志</span>
        <span className="text-red-400">1 错误</span>
        <span className="text-amber-400">0 警告</span>
      </div>
    </div>
  );
};

export { LogsView };
export default LogsView;
