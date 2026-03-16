import { useState } from 'react';
import { useAgentsStore, Agent } from '@/stores/agentsStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { v4 as uuidv4 } from 'uuid';

const PRESET_ROLES = [
  { value: 'strategist', label: '战略执行官 (NEXUS)' },
  { value: 'product', label: '产品架构师 (ARIA)' },
  { value: 'engineering', label: '工程总管 (KAEL)' },
  { value: 'fullstack', label: '全栈开发 (ZARA)' },
  { value: 'backend', label: '后端架构师 (DANTE)' },
  { value: 'designer', label: '交互设计师 (LUNA)' },
  { value: 'devops', label: '运维指挥官 (ATLAS)' },
  { value: 'qa', label: '质量守门员 (REX)' },
  { value: 'security', label: '安全架构师 (CIPHER)' },
  { value: 'analyst', label: '数据分析师 (ECHO)' },
  { value: 'writer', label: '文档专家 (SCRIBE)' },
  { value: 'content', label: '内容策略师 (MUSE)' },
  { value: 'growth', label: '增长引擎 (NOVA)' },
  { value: 'custom', label: '自定义角色' },
];

interface AgentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent?: Agent | null;
}

export function AgentForm({ open, onOpenChange, agent }: AgentFormProps) {
  const { addAgent, updateAgent } = useAgentsStore();
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    role: agent?.role || 'fullstack',
    specialty: agent?.specialty || '',
    soul: agent?.soul || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = !!agent;

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    setIsSubmitting(true);

    try {
      if (isEditing && agent) {
        updateAgent(agent.id, formData);
      } else {
        const newAgent: Agent = {
          id: uuidv4(),
          ...formData,
          status: 'idle',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        addAgent(newAgent);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save agent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleChange = (role: string) => {
    const preset = PRESET_ROLES.find((r) => r.value === role);
    setFormData((prev) => ({
      ...prev,
      role,
      name: prev.name || preset?.label.split(' ')[0] || '',
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '编辑 Agent' : '创建 Agent'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? '修改 Agent 的配置和人格设定'
              : '为你的军团添加新的 Agent 成员'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              placeholder="给 Agent 起个名字"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <Select value={formData.role} onValueChange={handleRoleChange}>
              <SelectTrigger>
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {PRESET_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">专业领域</Label>
            <Input
              id="specialty"
              placeholder="例如：前端开发、API设计、用户研究"
              value={formData.specialty}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  specialty: e.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="soul">人格设定 (SOUL.md)</Label>
            <Textarea
              id="soul"
              placeholder="描述 Agent 的性格、工作风格、口头禅..."
              value={formData.soul}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, soul: e.target.value }))
              }
              className="min-h-[120px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '保存中...' : isEditing ? '保存' : '创建'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
