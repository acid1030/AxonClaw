/**
 * 多代理协作 - 工作流与协作模板
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  agentCount: number;
  tags: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  { id: '1', name: '研究 + 写作流水线', description: '研究代理收集资料，写作代理生成初稿，编辑代理润色定稿', iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: '#6366f1', agentCount: 3, tags: ['研究', '写作', '协作'] },
  { id: '2', name: '客服 + 工单协同', description: '接待代理初步答复，复杂问题转交专家代理，工单自动归档', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', agentCount: 2, tags: ['客服', '工单', '分流'] },
  { id: '3', name: '代码评审链', description: '分析代理解析代码，安全代理扫描漏洞，风格代理检查规范', iconBg: 'rgba(245, 158, 11, 0.2)', iconColor: '#f59e0b', agentCount: 3, tags: ['代码', '评审', '安全'] },
  { id: '4', name: '多语言内容生产', description: '创意代理生成原文，翻译代理多语输出，校对代理质量把关', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', agentCount: 3, tags: ['内容', '翻译', '多语言'] },
  { id: '5', name: '数据分析管道', description: '采集代理拉取数据，分析代理生成洞察，报告代理输出可视化', iconBg: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6', agentCount: 3, tags: ['数据', '分析', '报告'] },
];
