/**
 * 知识库服务 - 语义记忆搜索与知识管理
 * AxonClawX 知识库完整复刻：技术决策、项目文档、用户偏好、学习笔记
 */

export type KnowledgeBaseCategory = 'decision' | 'project' | 'preference' | 'learning';

export interface KnowledgeBaseEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeBaseCategory;
  categoryLabel: string;
  updatedAt: string;
  updatedTime?: string;
  score?: number;
}

const CATEGORY_LABELS: Record<KnowledgeBaseCategory, string> = {
  decision: '技术决策',
  project: '项目文档',
  preference: '用户偏好',
  learning: '学习笔记',
};

/** 分类图标与颜色 */
export const CATEGORY_STYLES: Record<KnowledgeBaseCategory, { bg: string; color: string; icon: string }> = {
  decision: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', icon: '💡' },
  project: { bg: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', icon: '🚀' },
  preference: { bg: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', icon: '🎯' },
  learning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', icon: '📝' },
};

/** Mock 最近更新数据（待接入 gateway/OpenClaw 记忆搜索 API） */
export async function getRecentKnowledgeEntries(
  category?: KnowledgeBaseCategory,
  limit = 10
): Promise<KnowledgeBaseEntry[]> {
  const mockData: KnowledgeBaseEntry[] = [
    {
      id: '1',
      title: 'OpenClaw 完整配置手册',
      content: 'OpenClaw 网关配置与最佳实践',
      category: 'project',
      categoryLabel: '项目文档',
      updatedAt: '2026-03-14T15:30:00Z',
      updatedTime: '15:30',
    },
    {
      id: '2',
      title: 'LanceDB 向量存储方案',
      content: '采用 LanceDB 作为向量记忆存储',
      category: 'decision',
      categoryLabel: '技术决策',
      updatedAt: '2026-03-14T14:20:00Z',
      updatedTime: '14:20',
    },
    {
      id: '3',
      title: '用户偏好深色模式',
      content: '界面默认为深色主题',
      category: 'preference',
      categoryLabel: '用户偏好',
      updatedAt: '2026-03-13T16:45:00Z',
      updatedTime: '16:45',
    },
    {
      id: '4',
      title: 'React Hooks 最佳实践',
      content: 'useCallback、useMemo 使用规范',
      category: 'learning',
      categoryLabel: '学习笔记',
      updatedAt: '2026-03-13T12:10:00Z',
      updatedTime: '12:10',
    },
    {
      id: '5',
      title: 'MaritimeOS 项目架构',
      content: '微服务架构与模块划分',
      category: 'project',
      categoryLabel: '项目文档',
      updatedAt: '2026-03-12T18:20:00Z',
      updatedTime: '18:20',
    },
  ];

  let result = mockData;
  if (category) {
    result = result.filter((e) => e.category === category);
  }
  return result.slice(0, limit);
}

/** 语义搜索（待接入 memory search API） */
export async function searchKnowledgeBase(
  query: string,
  options?: { category?: KnowledgeBaseCategory; limit?: number }
): Promise<KnowledgeBaseEntry[]> {
  if (!query.trim()) {
    return getRecentKnowledgeEntries(options?.category, options?.limit ?? 10);
  }
  const all = await getRecentKnowledgeEntries(options?.category, 50);
  const q = query.toLowerCase();
  const filtered = all.filter((e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q));
  return filtered.slice(0, options?.limit ?? 10);
}

/** 知识统计（待接入真实数据） */
export interface KnowledgeStats {
  total: number;
  weeklyAdded: number;
  searchCount: number;
  hitRate: number;
}

export async function getKnowledgeStats(): Promise<KnowledgeStats> {
  return {
    total: 128,
    weeklyAdded: 23,
    searchCount: 456,
    hitRate: 89,
  };
}
