---
name: proactive-agent-thunlp
description: THUNLP 主动代理研究与实践资料。用于在 AxonClawX 中快速引用主动代理方法、运行框架与实现要点。
version: 1.0.0
metadata:
  openclaw:
    emoji: "🧭"
---

# Proactive Agent (THUNLP)

该技能将 `proactive-agent-thunlp` 目录作为可调用技能入口，便于在 AxonClawX 中统一加载与检索。

## 适用场景

- 需要参考主动代理（Proactive Agent）方法与流程
- 需要基于该仓库内容设计代理行为策略
- 需要结合现有业务流程做主动触发/跟踪/反馈

## 目录说明

- `README_zh.md`：中文说明
- `agent/`：代理核心实现
- `envs/`、`eval/`、`gym/`：环境与评估相关资源

## 快速使用

1. 先阅读 `README_zh.md` 了解整体框架。
2. 根据任务场景，从 `agent/` 中挑选对应能力模块。
3. 在 AxonClawX 的多代理编排中引入对应策略。
