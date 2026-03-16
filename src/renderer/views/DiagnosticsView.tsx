/**
 * AxonClaw - Diagnostics View
 * 系统诊断界面 - 从设计稿实现
 */

import React from 'react';

const diagnostics = [
  { id: '1', name: 'Gateway 连接', status: 'ok', message: 'ws://127.0.0.1:18789' },
  { id: '2', name: 'API Key', status: 'error', message: '未配置' },
  { id: '3', name: '数据库', status: 'ok', message: 'SQLite 3.45' },
];

const DiagnosticsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">系统诊断</h1>
          <p className="text-sm text-white/60">PIPELINE-2.6 · HealthDot 一键检测与修复</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          立即诊断
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {diagnostics.map((item) => (
          <div key={item.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${
                item.status === 'ok' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-white font-medium">{item.name}</span>
            </div>
            <p className="text-xs text-white/50">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export { DiagnosticsView };
export default DiagnosticsView;
