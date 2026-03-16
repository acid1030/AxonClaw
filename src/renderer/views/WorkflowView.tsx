/**
 * AxonClaw - Workflow View
 * 工作流界面 - 从设计稿实现
 */

import React from 'react';

const workflows = [
  { id: '1', name: '日报生成', status: 'active', trigger: '每天 08:00', steps: 3 },
  { id: '2', name: '内容发布', status: 'inactive', trigger: '手动', steps: 5 },
];

const WorkflowView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">工作流</h1>
          <p className="text-sm text-white/60">创建和管理自动化工作流</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          + 新建工作流
        </button>
      </div>

      <div className="space-y-3">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">{workflow.name}</div>
                <div className="text-xs text-white/40">触发: {workflow.trigger} · {workflow.steps} 步骤</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] ${
                workflow.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/50'
              }`}>
                {workflow.status === 'active' ? '运行中' : '已停止'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { WorkflowView };
export default WorkflowView;
