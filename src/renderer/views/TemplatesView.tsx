/**
 * AxonClaw - Templates View
 * 模板中心界面 - 从设计稿实现
 */

import React from 'react';

const templates = [
  { id: '1', name: '技术文档', category: '文档', uses: 128 },
  { id: '2', name: '周报模板', category: '报告', uses: 89 },
  { id: '3', name: 'API 设计', category: '开发', uses: 56 },
];

const TemplatesView: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">模板中心</h1>
          <p className="text-sm text-white/60">管理和使用预设模板</p>
        </div>
        <button className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors">
          + 新建模板
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {templates.map((template) => (
          <div key={template.id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
            <div className="text-white font-medium mb-1">{template.name}</div>
            <div className="text-xs text-white/40 mb-3">{template.category} · 使用 {template.uses} 次</div>
            <button className="w-full py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white/70 hover:bg-white/10 transition-colors">
              使用模板
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export { TemplatesView };
export default TemplatesView;
