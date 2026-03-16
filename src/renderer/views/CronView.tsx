/**
 * AxonClaw - Cron View
 * 定时任务界面 - 从设计稿实现
 */

import React from 'react';

const cronJobs = [
  { id: '1', name: '每日晨报', schedule: '0 8 * * *', status: 'active', lastRun: '今天 08:00' },
  { id: '2', name: '数据备份', schedule: '0 2 * * *', status: 'active', lastRun: '今天 02:00' },
  { id: '3', name: '项目进度检查', schedule: '0 9 * * 1', status: 'paused', lastRun: '上周一 09:00' },
];

const CronView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">定时任务</h1>
          <p className="text-sm text-white/60">自动化工作流 · Cron 调度</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          + 新建任务
        </button>
      </div>

      {/* 任务列表 */}
      <div className="space-y-3">
        {cronJobs.map((job) => (
          <div
            key={job.id}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-xl">
                ⏰
              </div>
              <div>
                <div className="text-white font-medium">{job.name}</div>
                <div className="text-xs font-mono text-white/40">{job.schedule}</div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-white/40">上次运行</div>
                <div className="text-xs text-white/70">{job.lastRun}</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/10 text-white/50'
              }`}>
                {job.status === 'active' ? '运行中' : '已暂停'}
              </span>
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">
                编辑
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { CronView };
export default CronView;
