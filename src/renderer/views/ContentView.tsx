/**
 * AxonClaw - Content View
 * 内容工厂界面 - AxonClawX 风格内容复刻
 */

import React, { useState } from 'react';
import { Search, Plus, FileText } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const templates = [
  { id: 'xiaohongshu', name: '小红书笔记', type: '种草/评测', status: '热门' as const, color: 'blue' },
  { id: 'wechat', name: '公众号文章', type: '品牌宣传', status: '推荐' as const, color: 'purple' },
  { id: 'video', name: '短视频脚本', type: '抖音/快手', status: 'new' as const, color: 'green' },
  { id: 'image', name: 'AI 绘画', type: 'FLUX/SDXL', status: 'beta' as const, color: 'amber' },
];

const filters = ['全部', '种草', '长文', '短视频', 'AI 绘画'];

const ContentView: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const gradients: Record<string, string> = {
    blue: 'from-blue-500 to-indigo-500',
    purple: 'from-purple-500 to-pink-500',
    green: 'from-green-500 to-emerald-500',
    amber: 'from-amber-500 to-orange-500',
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="内容工厂"
          subtitle="选模板 → 填参数 → 生成"
          stats={[{ label: '模板数', value: templates.length }]}
          statsBorderColor="border-pink-500/40"
          actions={
            <>
              <div className="flex items-center gap-2 rounded-xl border-2 border-pink-500/40 bg-[#1e293b] px-3 py-2">
                <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                <input
                  type="text"
                  placeholder="搜索模板..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-28"
                />
              </div>
              <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/15 text-primary text-sm font-medium hover:bg-primary/25 transition-colors">
                <Plus className="w-4 h-4" />
                新建内容
              </button>
            </>
          }
        />

        <div className="flex gap-2 mb-4">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-medium transition-colors',
                activeFilter === f
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
              )}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-xl border-2 border-pink-500/40 bg-[#1e293b] overflow-hidden"
            >
              <div className={cn('h-1 bg-gradient-to-r', gradients[t.color] ?? gradients.blue)} />
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {t.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{t.type}</div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium',
                      t.status === '热门' && 'bg-emerald-500/15 text-emerald-600',
                      t.status === '推荐' && 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
                      t.status === 'new' && 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
                      t.status === 'beta' && 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    {t.status === 'new' ? 'NEW' : t.status}
                  </span>
                </div>
                <button
                  className={cn(
                    'w-full py-2 rounded-xl text-xs font-medium transition-colors',
                    (t.status === '热门' || t.status === '推荐')
                      ? 'bg-primary/15 text-primary hover:bg-primary/25'
                      : 'bg-black/5 dark:bg-white/5 text-foreground/80 hover:bg-black/10 dark:hover:bg-white/10'
                  )}
                >
                  启用模板
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { ContentView };
export default ContentView;
