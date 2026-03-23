/**
 * AxonClaw - Memory View
 * 记忆系统界面 - ClawDeckX 风格内容复刻
 * LanceDB 语义检索 · 记忆与 Chat 打通
 */

import React, { useState } from 'react';
import { Search, Brain, Database, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const MemoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'tech' | 'preference' | 'config'>('all');
  const [writeMode, setWriteMode] = useState<'auto' | 'manual' | 'off'>('auto');

  const categories = [
    { id: 'all' as const, label: '全部' },
    { id: 'tech' as const, label: '技术' },
    { id: 'preference' as const, label: '偏好' },
    { id: 'config' as const, label: '配置' },
  ];

  const writeModes = [
    { id: 'auto' as const, label: '自动', desc: '回复后自动写入' },
    { id: 'manual' as const, label: '手动', desc: '回复后选择写入' },
    { id: 'off' as const, label: '关闭', desc: '不写入记忆' },
  ];

  const memories = [
    { id: '1', content: '项目采用 LanceDB 向量记忆', date: '2026-03-14', category: '技术决策' },
    { id: '2', content: 'Gateway 默认端口 18789', date: '2026-03-12', category: '配置' },
    { id: '3', content: '用户偏好深色模式', date: '2026-03-10', category: '偏好' },
    { id: '4', content: 'Claude Sonnet 4 为默认模型', date: '2026-03-08', category: '技术决策' },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title="记忆系统"
          subtitle="LanceDB 语义检索 · 记忆与 Chat 打通"
          stats={[
            { label: '记忆数', value: memories.length },
            { label: '分类', value: categories.length + 1 },
          ]}
          statsBorderColor="border-violet-500/40"
          actions={
            <div className="flex items-center gap-2 rounded-xl border-2 border-violet-500/40 bg-[#1e293b] px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="语义搜索记忆..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-40"
            />
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
          {/* 记忆列表 */}
          <div className="rounded-xl border-2 border-violet-500/40 bg-[#1e293b] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    记忆列表
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {memories.length} 条 · 支持语义搜索
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                        category === c.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-3 rounded-xl bg-[#1e293b] border border-violet-500/30 hover:bg-[#334155]/50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm text-foreground mb-1">
                      {memory.content}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memory.date} · {memory.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 记忆写入策略 */}
          <div className="rounded-xl border-2 border-violet-500/40 bg-[#1e293b] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">
                  记忆写入策略
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                回复后可选择写入 · useMemory Hook 与 ChatView 集成
              </p>

              <div className="flex gap-2 mb-6">
                {writeModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setWriteMode(m.id)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                      writeMode === m.id
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0f172a] border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-bold text-foreground">
                      {memories.length}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">总记忆数</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0f172a] border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-bold text-foreground">
                      3.2MB
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">向量库大小</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MemoryView };
export default MemoryView;
