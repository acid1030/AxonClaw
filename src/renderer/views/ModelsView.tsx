/**
 * AxonClaw - Models View
 * 模型管理界面 - ClawDeckX 风格内容复刻
 */

import React, { useState } from 'react';
import { RefreshCw, Sparkles, Info } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

const staticModels = [
  { id: 'zhipuai/glm-5', name: 'GLM-5', provider: '智谱 AI', status: 'default' as const, hasKey: true, pricing: '按量计费' },
  { id: 'zhipu/glm-4-flash', name: 'GLM-4-Flash', provider: '智谱 AI', status: 'available' as const, hasKey: true, pricing: '免费额度' },
  { id: 'google/gemini-2.0-flash-001', name: 'Gemini 2.0 Flash', provider: 'Google', status: 'available' as const, hasKey: true, pricing: '按量计费' },
  { id: 'deepseek/deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', status: 'available' as const, hasKey: true, pricing: '按量计费' },
  { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', status: 'unavailable' as const, hasKey: false, pricing: '$2.5/$10 per 1M' },
  { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4', provider: 'Anthropic', status: 'unavailable' as const, hasKey: false, pricing: '$3/$15 per 1M' },
];

const ModelsView: React.FC = () => {
  const [defaultModel, setDefaultModel] = useState('zhipuai/glm-5');
  const [loading] = useState(false);

  const configuredCount = staticModels.filter((m) => m.hasKey).length;
  const unavailableCount = staticModels.filter((m) => !m.hasKey).length;

  return (
    <div className="flex flex-col -m-6 bg-[#0f172a] h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 overflow-y-auto">
        <PageHeader
          title="模型管理"
          subtitle={loading ? '加载中...' : `${staticModels.length} 个模型可用`}
          stats={[
            { label: '已配置', value: configuredCount },
            { label: '未配置', value: unavailableCount },
          ]}
          onRefresh={() => {}}
          refreshing={loading}
          refreshLabel="刷新列表"
          statsBorderColor="border-purple-500/40"
        />

        <div className="space-y-3 max-w-3xl">
          {staticModels.map((model) => {
            const isDefault = model.id === defaultModel;
            return (
              <div
                key={model.id}
                className={cn(
                  'rounded-xl border-2 p-4 flex items-center justify-between gap-4',
                  isDefault
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-2 border-purple-500/40 bg-[#1e293b]'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      model.hasKey ? 'bg-gradient-to-br from-primary/20 to-purple-500/20' : 'bg-black/5 dark:bg-white/5'
                    )}
                  >
                    <Sparkles className={cn('w-5 h-5', model.hasKey ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">
                        {model.name}
                      </span>
                      {isDefault && (
                        <span className="px-2 py-0.5 rounded-lg text-xs bg-primary/15 text-primary font-medium">
                          默认
                        </span>
                      )}
                      {model.hasKey ? (
                        <span className="px-2 py-0.5 rounded-lg text-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                          已配置
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 font-medium">
                          未配置 Key
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {model.provider} · {model.id}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">定价</div>
                    <div className="text-xs font-mono text-foreground/80">
                      {model.pricing}
                    </div>
                  </div>
                  <button
                    onClick={() => setDefaultModel(model.id)}
                    disabled={isDefault || !model.hasKey}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                      isDefault && 'bg-primary/15 text-primary cursor-default',
                      !isDefault && model.hasKey && 'bg-primary/15 text-primary hover:bg-primary/25',
                      !isDefault && !model.hasKey && 'bg-black/5 dark:bg-white/5 text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    {isDefault ? '当前默认' : '设为默认'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-2 border-purple-500/40 bg-[#1e293b] p-4 max-w-3xl">
          <div className="text-sm font-medium text-foreground mb-3">配置概览</div>
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0f172a] border border-purple-500/30 text-center">
              <div className="text-lg font-bold text-foreground">{staticModels.length}</div>
              <div className="text-xs text-muted-foreground">总模型数</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0f172a] border border-purple-500/30 text-center">
              <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{configuredCount}</div>
              <div className="text-xs text-muted-foreground">已配置</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0f172a] border border-purple-500/30 text-center">
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400">{unavailableCount}</div>
              <div className="text-xs text-muted-foreground">待配置</div>
            </div>
            <div className="p-3 rounded-xl bg-[#0f172a] border border-purple-500/30 text-center">
              <div className="text-lg font-bold text-primary">4</div>
              <div className="text-xs text-muted-foreground">供应商数</div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 p-4 rounded-xl border-2 border-primary/20 bg-primary/5 max-w-3xl">
          <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <p className="text-sm text-foreground/80">
            模型配置来自 OpenClaw Gateway。要修改 API Key，请在终端运行{' '}
            <code className="px-1.5 py-0.5 rounded bg-primary/10 font-mono text-xs">openclaw config</code>{' '}
            或编辑配置文件。
          </p>
        </div>
      </div>
    </div>
  );
};

export { ModelsView };
export default ModelsView;
