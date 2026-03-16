/**
 * AxonClaw - Skills View
 * 技能管理界面 - 从设计稿实现
 */

import React from 'react';

const skills = [
  { id: 'web-search', name: 'Web Search', desc: 'Brave Search / Google', status: 'active', color: 'green' },
  { id: 'memory', name: 'Memory System', desc: 'LanceDB 向量记忆', status: 'active', color: 'blue' },
  { id: 'image-gen', name: 'Image Gen', desc: 'FLUX / SDXL', status: 'inactive', color: 'purple' },
  { id: 'video', name: 'Video Tools', desc: 'FFmpeg / MoviePy', status: 'inactive', color: 'amber' },
];

const SkillsView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">技能管理</h1>
          <p className="text-sm text-white/60">安装、配置、启用技能 · ClawHub 市场</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <span className="text-white/40">🔍</span>
            <input type="text" placeholder="搜索技能..." className="bg-none border-none outline-none text-sm text-white placeholder-white/30 w-32" />
          </div>
          <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
            浏览市场
          </button>
        </div>
      </div>

      {/* 分类标签 */}
      <div className="flex gap-2 mb-6">
        <span className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs cursor-pointer">全部</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">AI</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">工具</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">集成</span>
      </div>

      {/* 技能列表 */}
      <div className="space-y-3">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                skill.color === 'green' ? 'bg-green-500/10 text-green-400' :
                skill.color === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                skill.color === 'purple' ? 'bg-purple-500/10 text-purple-400' :
                'bg-amber-500/10 text-amber-400'
              }`}>
                ⚡
              </div>
              <div>
                <div className="text-white font-medium">{skill.name}</div>
                <div className="text-xs text-white/40">{skill.desc}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded text-[10px] ${
                skill.status === 'active' 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-white/10 text-white/50'
              }`}>
                {skill.status === 'active' ? '已启用' : '未启用'}
              </span>
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">
                配置
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { SkillsView };
export default SkillsView;
