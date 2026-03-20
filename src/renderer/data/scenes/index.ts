/**
 * 场景库数据 - ClawDeckX 场景模板
 */

export type SceneCategory = 'all' | 'productivity' | 'social' | 'content' | 'devops' | 'research' | 'finance' | 'family';

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  iconBg: string;
  iconColor: string;
  iconName: string;
  category: SceneCategory;
  difficulty: 'simple' | 'medium' | 'hard';
  recommended?: boolean;
  tags: string[];
  skillsCount: number;
  cronCount: number;
}

const SCENES: SceneTemplate[] = [
  { id: '1', name: '个人助理', description: '日程提醒、任务管理与日常助手，支持多轮对话与上下文记忆', iconBg: 'rgba(59, 130, 246, 0.2)', iconColor: '#3b82f6', iconName: 'MessageCircle', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['助理', '生产力', '任务', '提醒'], skillsCount: 1, cronCount: 1 },
  { id: '2', name: '邮件管家', description: '邮件分类、智能回复与摘要，自动处理收件箱', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', iconName: 'Mail', category: 'productivity', difficulty: 'medium', tags: ['邮件', '生产力', '自动化'], skillsCount: 2, cronCount: 1 },
  { id: '3', name: '日程管理', description: '日历同步、会议安排与提醒，支持多平台日历', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', iconName: 'Calendar', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['日程', '日历', '提醒'], skillsCount: 1, cronCount: 1 },
  { id: '4', name: '任务追踪', description: '待办事项与进度跟踪，支持看板与列表视图', iconBg: 'rgba(148, 163, 184, 0.2)', iconColor: '#94a3b8', iconName: 'CheckSquare', category: 'productivity', difficulty: 'simple', recommended: true, tags: ['任务', '生产力', '待办'], skillsCount: 1, cronCount: 0 },
  { id: '5', name: '个人 CRM', description: '联系人管理与跟进提醒，适合销售与商务场景', iconBg: 'rgba(239, 68, 68, 0.2)', iconColor: '#ef4444', iconName: 'Contact', category: 'productivity', difficulty: 'simple', tags: ['联系人', 'CRM', '销售'], skillsCount: 1, cronCount: 1 },
  { id: '6', name: '第二大脑', description: '知识管理、笔记与记忆增强，语义检索历史对话', iconBg: 'rgba(139, 92, 246, 0.2)', iconColor: '#8b5cf6', iconName: 'Brain', category: 'research', difficulty: 'simple', tags: ['知识', '笔记', '记忆'], skillsCount: 2, cronCount: 0 },
  { id: '7', name: '社交媒体运营', description: '多平台内容发布、舆情监控与互动回复', iconBg: 'rgba(236, 72, 153, 0.2)', iconColor: '#ec4899', iconName: 'Share2', category: 'social', difficulty: 'medium', recommended: true, tags: ['社交', '运营', '内容'], skillsCount: 3, cronCount: 2 },
  { id: '8', name: '内容创作助手', description: '文章撰写、选题建议与多格式输出', iconBg: 'rgba(245, 158, 11, 0.2)', iconColor: '#f59e0b', iconName: 'PenLine', category: 'content', difficulty: 'simple', tags: ['写作', '创作', '文案'], skillsCount: 2, cronCount: 0 },
  { id: '9', name: '代码评审助手', description: '自动 Code Review、漏洞扫描与最佳实践建议', iconBg: 'rgba(34, 197, 94, 0.2)', iconColor: '#22c55e', iconName: 'Terminal', category: 'devops', difficulty: 'medium', tags: ['代码', 'DevOps', 'Review'], skillsCount: 2, cronCount: 1 },
  { id: '10', name: '研究文献助手', description: '论文检索、摘要生成与知识图谱构建', iconBg: 'rgba(99, 102, 241, 0.2)', iconColor: '#6366f1', iconName: 'GraduationCap', category: 'research', difficulty: 'medium', tags: ['研究', '文献', '学术'], skillsCount: 2, cronCount: 0 },
  { id: '11', name: '交易信号助手', description: '市场分析、持仓提醒与风险提示', iconBg: 'rgba(16, 185, 129, 0.2)', iconColor: '#10b981', iconName: 'Banknote', category: 'finance', difficulty: 'hard', tags: ['交易', '金融', '量化'], skillsCount: 3, cronCount: 2 },
  { id: '12', name: '家庭日程协调', description: '家庭日历、备忘提醒与成员协同一体化', iconBg: 'rgba(251, 146, 60, 0.2)', iconColor: '#fb923c', iconName: 'Home', category: 'family', difficulty: 'simple', tags: ['家庭', '日程', '协调'], skillsCount: 1, cronCount: 1 },
];

export const SCENE_CATEGORIES: { id: SceneCategory; label: string; iconName: string }[] = [
  { id: 'all', label: '全部', iconName: 'LayoutGrid' },
  { id: 'productivity', label: '生产力', iconName: 'Briefcase' },
  { id: 'social', label: '社交媒体', iconName: 'Share2' },
  { id: 'content', label: '内容创作', iconName: 'PenLine' },
  { id: 'devops', label: 'DevOps', iconName: 'Terminal' },
  { id: 'research', label: '研究学习', iconName: 'GraduationCap' },
  { id: 'finance', label: '金融交易', iconName: 'Banknote' },
  { id: 'family', label: '家庭生活', iconName: 'Home' },
];

export function getScenes(category?: SceneCategory, search?: string): SceneTemplate[] {
  let result = SCENES;
  if (category && category !== 'all') {
    result = result.filter((s) => s.category === category);
  }
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  return result;
}
