/**
 * AxonClaw - Models View
 * 模型管理界面 - 暂时使用静态数据
 */

import React, { useState } from 'react';

// 静态模型数据（后续连接真实数据）
const staticModels = [
  { 
    id: 'zhipuai/glm-5', 
    name: 'GLM-5', 
    provider: '智谱 AI', 
    status: 'default',
    hasKey: true,
    pricing: '按量计费' 
  },
  { 
    id: 'zhipu/glm-4-flash', 
    name: 'GLM-4-Flash', 
    provider: '智谱 AI', 
    status: 'available',
    hasKey: true,
    pricing: '免费额度' 
  },
  { 
    id: 'google/gemini-2.0-flash-001', 
    name: 'Gemini 2.0 Flash', 
    provider: 'Google', 
    status: 'available',
    hasKey: true,
    pricing: '按量计费' 
  },
  { 
    id: 'deepseek/deepseek-chat', 
    name: 'DeepSeek Chat', 
    provider: 'DeepSeek', 
    status: 'available',
    hasKey: true,
    pricing: '按量计费' 
  },
  { 
    id: 'openai/gpt-4o', 
    name: 'GPT-4o', 
    provider: 'OpenAI', 
    status: 'unavailable',
    hasKey: false,
    pricing: '$2.5/$10 per 1M' 
  },
  { 
    id: 'anthropic/claude-sonnet-4', 
    name: 'Claude Sonnet 4', 
    provider: 'Anthropic', 
    status: 'unavailable',
    hasKey: false,
    pricing: '$3/$15 per 1M' 
  },
];

const ModelsView: React.FC = () => {
  const [defaultModel, setDefaultModel] = useState('zhipuai/glm-5');
  const [loading] = useState(false);

  const handleSetDefault = (modelId: string) => {
    setDefaultModel(modelId);
  };

  const configuredCount = staticModels.filter(m => m.hasKey).length;
  const unavailableCount = staticModels.filter(m => !m.hasKey).length;

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">模型管理</h1>
          <p className="text-sm text-white/60">
            {loading ? '加载中...' : `${staticModels.length} 个模型可用`}
          </p>
        </div>
        <button 
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-colors"
        >
          ↻ 刷新列表
        </button>
      </div>

      {/* 模型列表 */}
      <div className="space-y-3">
        {staticModels.map((model) => {
          const isDefault = model.id === defaultModel;
          
          return (
            <div
              key={model.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                isDefault 
                  ? 'bg-blue-500/10 border-blue-500/30' 
                  : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  model.hasKey 
                    ? 'bg-gradient-to-br from-purple-500/20 to-pink-500/20' 
                    : 'bg-white/5'
                }`}>
                  ✦
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{model.name}</span>
                    {isDefault && (
                      <span className="px-2 py-0.5 rounded text-[9px] bg-blue-500/20 text-blue-400">
                        默认
                      </span>
                    )}
                    {model.hasKey ? (
                      <span className="px-2 py-0.5 rounded text-[9px] bg-green-500/20 text-green-400">
                        已配置
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[9px] bg-yellow-500/20 text-yellow-400">
                        未配置 Key
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-white/40">
                    {model.provider} · {model.id}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-xs text-white/50">定价</div>
                  <div className="text-xs font-mono text-white/70">{model.pricing}</div>
                </div>
                <button 
                  onClick={() => handleSetDefault(model.id)}
                  disabled={isDefault || !model.hasKey}
                  className={`px-4 py-2 rounded-lg text-xs transition-colors ${
                    isDefault 
                      ? 'bg-blue-500/20 text-blue-400 cursor-default' 
                      : model.hasKey
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-white/5 text-white/30 cursor-not-allowed'
                  }`}
                >
                  {isDefault ? '当前默认' : '设为默认'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl">
        <div className="text-white font-medium mb-3">配置概览</div>
        <div className="grid grid-cols-4 gap-4">
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-white">{staticModels.length}</div>
            <div className="text-[10px] text-white/40">总模型数</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-green-400">{configuredCount}</div>
            <div className="text-[10px] text-white/40">已配置</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-yellow-400">{unavailableCount}</div>
            <div className="text-[10px] text-white/40">待配置</div>
          </div>
          <div className="p-3 bg-white/5 rounded-lg text-center">
            <div className="text-xl font-bold text-blue-400">4</div>
            <div className="text-[10px] text-white/40">供应商数</div>
          </div>
        </div>
      </div>
      
      {/* 提示 */}
      <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-sm text-blue-300">
        💡 模型配置来自 OpenClaw Gateway。要修改 API Key，请在终端运行 <code className="px-1 py-0.5 bg-blue-500/20 rounded">openclaw config</code> 或编辑配置文件。
      </div>
    </div>
  );
};

export { ModelsView };
export default ModelsView;
