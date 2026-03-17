/**
 * AxonClaw - 安装向导
 * ClawDeckX 风格：分步安装引导 (Gateway → 模型 → Agent → 完成)
 */

import React, { useState } from 'react';
import { Rocket, CheckCircle, ChevronRight, Wifi, Target, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 'gateway', label: '连接网关', icon: Wifi },
  { id: 'model', label: '配置模型', icon: Target },
  { id: 'agent', label: '创建 Agent', icon: Bot },
  { id: 'complete', label: '完成', icon: CheckCircle },
];

export const InstallationWizardView: React.FC<{ onNavigateTo?: (view: string) => void }> = ({
  onNavigateTo,
}) => {
  const [step, setStep] = useState(0);

  return (
    <div className="h-full flex flex-col overflow-y-auto bg-[#0f172a]">
      <div className="flex-1 py-8 w-full">
        <h1 className="text-2xl font-semibold text-foreground mb-2">安装向导</h1>
        <p className="text-sm text-muted-foreground mb-8">
          ClawDeckX 风格：分步引导完成 OpenClaw 初始配置
        </p>

        {/* 步骤指示器 */}
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((s, i) => (
            <React.Fragment key={s.id}>
              <button
                onClick={() => setStep(i)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-colors',
                  step === i
                    ? 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400'
                    : 'border-indigo-500/20 hover:border-indigo-500/40 text-muted-foreground'
                )}
              >
                <s.icon className="h-4 w-4" />
                <span className="text-sm font-medium">{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* 步骤内容 */}
        <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-8">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">连接 Gateway</h2>
              <p className="text-sm text-muted-foreground mb-4">
                确保 OpenClaw Gateway 已启动并可通过 WebSocket 连接。在系统设置中配置网关地址和端口。
              </p>
              <Button
                variant="outline"
                className="border-indigo-500/40"
                onClick={() => onNavigateTo?.('system')}
              >
                前往系统设置
              </Button>
            </div>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">配置 AI 模型</h2>
              <p className="text-sm text-muted-foreground mb-4">
                在模型页面添加 AI 提供商（OpenAI、Anthropic、Ollama 等）并设置 API Key。
              </p>
              <Button
                variant="outline"
                className="border-indigo-500/40"
                onClick={() => onNavigateTo?.('model')}
              >
                前往模型配置
              </Button>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-2">创建 Agent</h2>
              <p className="text-sm text-muted-foreground mb-4">
                在智能代理页面创建你的第一个 Agent，配置工作区和身份。
              </p>
              <Button
                variant="outline"
                className="border-indigo-500/40"
                onClick={() => onNavigateTo?.('agent')}
              >
                前往智能代理
              </Button>
            </div>
          )}
          {step === 3 && (
            <div className="text-center py-4">
              <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-foreground mb-2">配置完成</h2>
              <p className="text-sm text-muted-foreground">
                你可以开始使用 AI 会话与智能代理进行交互。
              </p>
              <Button
                className="mt-4 bg-indigo-500 hover:bg-indigo-600"
                onClick={() => onNavigateTo?.('chat')}
              >
                开始对话
              </Button>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className="border-indigo-500/40"
          >
            上一步
          </Button>
          {step < 3 && (
            <Button
              className="bg-indigo-500 hover:bg-indigo-600"
              onClick={() => setStep((s) => Math.min(3, s + 1))}
            >
              下一步
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallationWizardView;
