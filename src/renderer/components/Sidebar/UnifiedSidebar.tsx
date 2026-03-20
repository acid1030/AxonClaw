import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Icons } from '../Icons/IconComponents';
import { SidebarItem } from './SidebarItem';
import { CollapseButton } from './CollapseButton';

// 按 ClawDeckX 主菜单顺序：概览、知识、安装向导、配置中心、用量、使用向导、网关监控、审批中心、系统、AI会话、智能代理、节点、活动、调度、技能、健康
const menuItems = [
  { id: 'dashboard', icon: Icons.dashboard, label: '概览仪表盘' },
  { id: 'knowledge', icon: Icons.knowledge, label: '知识中心' },
  { id: 'install', icon: Icons.install, label: '安装向导' },
  { id: 'config', icon: Icons.config, label: '配置中心' },
  { id: 'usage', icon: Icons.usage, label: '用量统计' },
  { id: 'gateway-monitor', icon: Icons.gatewayMonitor, label: '网关监控' },
  { id: 'system', icon: Icons.system, label: '系统设置' },
  { id: 'chat', icon: Icons.chat, label: 'AI 会话' },
  { id: 'agent', icon: Icons.agent, label: '智能代理' },
  { id: 'nodes', icon: Icons.nodes, label: '节点管理' },
  { id: 'activity', icon: Icons.diagnostic, label: '活动监控' },
  { id: 'cron', icon: Icons.cron, label: '调度任务' },
  { id: 'skill', icon: Icons.skill, label: '技能中心' },
  { id: 'health', icon: Icons.health, label: '健康中心' },
];

interface UnifiedSidebarProps {
  activeView?: string;
  onViewChange?: (viewId: string) => void;
}

export function UnifiedSidebar({ activeView = 'dashboard', onViewChange }: UnifiedSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <motion.aside
      animate={{ width: isCollapsed ? 56 : 240 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className={`
        relative flex flex-col
        bg-gradient-to-b from-[rgba(30,25,50,0.75)] to-[rgba(20,18,40,0.7)]
        backdrop-blur-xl
        border-r border-purple-500/10
        overflow-hidden
      `}
    >
      {/* Logo - Mac needs extra top padding for traffic lights (38px) */}
      <div 
        className="flex-shrink-0 px-3 pb-3 flex items-center" 
        style={{ 
          paddingTop: '48px', // Extra padding for Mac traffic lights
          minHeight: '80px' 
        }}
      >
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-2 w-full"
            >
              <img 
                src="./logo.png" 
                alt="AxonClaw Logo" 
                className="h-10 w-auto object-contain flex-shrink-0"
              />
              <span className="text-white font-semibold text-base whitespace-nowrap">AxonClaw</span>
            </motion.div>
          )}
        </AnimatePresence>
        
        {isCollapsed && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center bg-white/5 mx-auto"
          >
            <img 
              src="./logo.png" 
              alt="AxonClaw Logo"
              className="w-full h-full object-contain"
            />
          </motion.div>
        )}
      </div>

      {/* New Chat Button */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          <button
            onClick={() => onViewChange?.('chat')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
          >
            <Icons.chat className="w-4 h-4 text-white/60 flex-shrink-0" />
            <span className="text-sm text-white/80">新对话</span>
          </button>
        </div>
      )}

      {/* Divider */}
      <div className="px-3 pb-2">
        <div className="h-px bg-white/10" />
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-2 py-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activeView === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onViewChange?.(item.id)}
          />
        ))}
      </nav>

      {/* Collapse Button */}
      <div className="flex-shrink-0 p-3 flex justify-center border-t border-white/5">
        <CollapseButton
          isCollapsed={isCollapsed}
          onToggle={() => setIsCollapsed(!isCollapsed)}
        />
      </div>
    </motion.aside>
  );
}
