/**
 * 代理预设 - 人格与角色模板
 */

export interface AgentPreset {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  personality: string;
  tags: string[];
}

export const AGENT_PRESETS: AgentPreset[] = [
  { id: '1', name: '通用助手', description: '平衡型助手，擅长对话、任务与信息检索', iconBg: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6', personality: '友好、专业、高效', tags: ['通用', '入门', '推荐'] },
  { id: '2', name: '编程专家', description: '代码编写、调试、重构与架构建议', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', personality: '严谨、细致、技术驱动', tags: ['编程', '开发', '技术'] },
  { id: '3', name: '商务秘书', description: '邮件起草、会议纪要、日程安排与跟进提醒', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', personality: '干练、周到、注重细节', tags: ['商务', '秘书', '效率'] },
  { id: '4', name: '创意写作', description: '故事创作、文案撰写、头脑风暴与风格化输出', iconBg: 'rgba(236, 72, 153, 0.2)', iconColor: '#ec4899', personality: '创意、灵活、富有感染力', tags: ['写作', '创意', '文案'] },
  { id: '5', name: '翻译专家', description: '多语言翻译、本地化与术语一致性维护', iconBg: 'rgba(245, 158, 11, 0.2)', iconColor: '#f59e0b', personality: '准确、地道、文化敏感', tags: ['翻译', '多语言', '本地化'] },
  { id: '6', name: '客服代表', description: '用户咨询应答、问题排查与工单处理', iconBg: 'rgba(16, 185, 129, 0.2)', iconColor: '#10b981', personality: '耐心、礼貌、解决问题导向', tags: ['客服', '支持', '用户'] },
  { id: '7', name: '研究分析师', description: '文献检索、信息提炼、报告撰写与趋势分析', iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: '#6366f1', personality: '客观、严谨、数据驱动', tags: ['研究', '分析', '报告'] },
];
