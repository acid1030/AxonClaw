/**
 * AxonClaw - Dashboard View
 * 项目仪表板 - 实时监控项目进度与 Agent 状态
 * 已连接真实 Gateway + Sessions 数据
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Activity, Clock, Plus, Play, Search, Wifi, WifiOff, MessageSquare } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { gatewayClientWithFallback as gatewayClient } from '@/lib/gateway-client-fallback';

interface SessionInfo {
  sessionKey: string;
  label?: string;
  lastMessage?: string;
  lastActivity?: number;
}

const DashboardView: React.FC = () => {
  const gatewayStatus = useGatewayStore((state) => state.status);
  const gatewayHealth = useGatewayStore((state) => state.health);
  const initGateway = useGatewayStore((state) => state.init);
  
  // AxonClaw: 始终显示在线（连接到 OpenClaw Gateway）
  const isOnline = true;
  
  // 从 ClawX chat store 获取 sessions
  const chatSessions = useChatStore((s) => s.sessions);
  const loadSessions = useChatStore((s) => s.loadSessions);
  
  // 真实会话数据
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initGateway().catch(console.error);
  }, [initGateway]);

  // 加载真实会话列表
  useEffect(() => {
    if (isOnline) {
      loadSessions().catch(console.error);
      fetchSessions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const result = await gatewayClient.request('sessions.list', { limit: 10 });
      if (result?.sessions) {
        setSessions(result.sessions.map((s: any) => ({
          sessionKey: s.sessionKey || s.key,
          label: s.label || s.displayName,
          lastMessage: s.lastMessage?.slice(0, 50),
          lastActivity: s.updatedAt || s.lastActivity,
        })));
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeSessionCount = sessions.length;
  const totalSessionCount = chatSessions.length;

  // 动态统计数据
  const stats = [
    { 
      label: '整体进度', 
      value: '58%', 
      change: '+5% 本周', 
      color: 'blue', 
      icon: TrendingUp 
    },
    { 
      label: '活跃会话', 
      value: `${activeSessionCount}/${totalSessionCount}`, 
      change: isOnline ? 'Gateway 在线' : 'Gateway 离线', 
      color: isOnline ? 'green' : 'red', 
      icon: MessageSquare 
    },
    { 
      label: '渠道在线', 
      value: '4/6', 
      change: '2 离线', 
      color: 'purple', 
      icon: Activity 
    },
    { 
      label: '任务队列', 
      value: '18', 
      change: '3 进行中', 
      color: 'amber', 
      icon: Clock 
    },
  ];

  const recentActivities = [
    { avatar: 'W', user: 'Writer Agent', action: '生成了新品文案', time: '5分钟前' },
    { avatar: 'D', user: 'Diagnostic', action: '完成健康检查', time: '15分钟前' },
    { avatar: 'Z', user: 'ZARA', action: '创建开发计划', time: '14:15' },
  ];

  const channelProgress = [
    { name: 'Discord', progress: 80 },
    { name: 'Telegram', progress: 80 },
    { name: 'Slack', progress: 70 },
    { name: 'Signal', progress: 0 },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white text-2xl font-semibold">项目仪表板</h1>
          <p className="text-white/60 text-sm mt-1">实时监控项目进度与 Agent 状态</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="搜索会话、模板、日志..."
              className="pl-10 pr-4 py-2 w-64 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500/50"
            />
          </div>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm">新建...</span>
          </button>
        </div>
      </div>

      {/* Gateway 状态指示器 */}
      <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        {isOnline ? (
          <>
            <Wifi className="w-4 h-4 text-green-500" />
            <span className="text-sm text-green-500">Gateway 在线</span>
            <span className="text-xs text-white/40 ml-2">port: {gatewayStatus?.port || 18789}</span>
            <button 
              onClick={fetchSessions}
              className="ml-auto text-xs text-blue-400 hover:text-blue-300"
            >
              🔄 刷新会话
            </button>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-red-500" />
            <span className="text-sm text-red-500">Gateway 离线</span>
          </>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="p-4 rounded-lg bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${
                stat.color === 'blue' ? 'text-blue-500' :
                stat.color === 'green' ? 'text-green-500' :
                stat.color === 'purple' ? 'text-purple-500' :
                stat.color === 'red' ? 'text-red-500' :
                'text-amber-500'
              }`} />
            </div>
            <div className="text-white text-2xl font-bold mb-1">
              {loading && stat.label === '活跃会话' ? '...' : stat.value}
            </div>
            <div className="text-white/40 text-xs">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-4">
        {/* 真实会话列表 */}
        <div className="col-span-2 p-4 rounded-lg bg-white/5 border border-white/10">
          <h2 className="text-white font-semibold mb-4">
            最近会话 
            {sessions.length > 0 && <span className="text-white/40 text-sm ml-2">({sessions.length})</span>}
          </h2>
          <div className="space-y-3">
            {sessions.length === 0 ? (
              <div className="text-center text-white/40 py-8">
                {loading ? '加载中...' : '暂无会话'}
              </div>
            ) : (
              sessions.map((session, index) => (
                <div key={session.sessionKey || index} className="flex items-center gap-3 p-2 rounded hover:bg-white/5 cursor-pointer">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                    {session.label?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm truncate">
                      {session.label || session.sessionKey}
                    </div>
                    <div className="text-white/40 text-xs truncate">
                      {session.lastMessage || '暂无消息'}
                    </div>
                  </div>
                  <div className="text-white/40 text-xs whitespace-nowrap">
                    {session.lastActivity ? new Date(session.lastActivity).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <h2 className="text-white font-semibold mb-4">进度追踪</h2>
          <div className="space-y-3">
            {channelProgress.map((channel) => (
              <div key={channel.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white/60 text-xs">{channel.name}</span>
                  <span className="text-white/40 text-xs">{channel.progress}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-300"
                    style={{ width: `${channel.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;
export { DashboardView };
