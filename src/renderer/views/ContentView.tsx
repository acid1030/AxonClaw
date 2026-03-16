/**
 * AxonClaw - Content View
 * 内容工厂界面 - 从设计稿实现
 */

import React from 'react';

const templates = [
  { id: 'xiaohongshu', name: '小红书笔记', type: '种草/评测', status: '热门', color: 'blue' },
  { id: 'wechat', name: '公众号文章', type: '品牌宣传', status: '推荐', color: 'purple' },
  { id: 'video', name: '短视频脚本', type: '抖音/快手', status: 'new', color: 'green' },
  { id: 'image', name: 'AI 绘画', type: 'FLUX/SDXL', status: 'beta', color: 'amber' },
];

const ContentView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">内容工厂</h1>
          <p className="text-sm text-white/60">选模板 → 填参数 → 生成 · PIPELINE-3.1 10+ 模板</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-4 py-2">
            <span className="text-white/40">🔍</span>
            <input type="text" placeholder="搜索模板..." className="bg-none border-none outline-none text-sm text-white placeholder-white/30 w-32" />
          </div>
          <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
            + 新建内容
          </button>
        </div>
      </div>

      {/* 过滤标签 */}
      <div className="flex gap-2 mb-6">
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">全部</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">种草</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">长文</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">短视频</span>
        <span className="px-3 py-1.5 bg-white/5 rounded-lg text-xs text-white/50 cursor-pointer hover:bg-white/10">AI 绘画</span>
      </div>

      {/* 模板网格 */}
      <div className="grid grid-cols-4 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-5"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 ${
              template.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
              template.color === 'purple' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
              template.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
              'bg-gradient-to-r from-amber-500 to-orange-500'
            }`} />

            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-white font-medium">{template.name}</div>
                <div className="text-xs text-white/40">{template.type}</div>
              </div>
              <span className={`px-2 py-1 rounded text-[10px] ${
                template.status === '热门' ? 'bg-green-500/20 text-green-400' :
                template.status === '推荐' ? 'bg-blue-500/20 text-blue-400' :
                template.status === 'new' ? 'bg-purple-500/20 text-purple-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
                {template.status === 'new' ? 'NEW' : template.status}
              </span>
            </div>

            <button className={`w-full py-1.5 rounded text-xs transition-colors ${
              template.status === '热门' || template.status === '推荐'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-white/5 border border-white/10 text-white/70 hover:bg-white/10'
            }`}>
              启用模板
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { ContentView };
export default ContentView;
