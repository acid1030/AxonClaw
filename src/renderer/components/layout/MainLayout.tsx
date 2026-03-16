/**
 * AxonClaw - Main Layout (Redesigned)
 * macOS 风格可收缩侧边栏 + 浮动右侧面板
 */

import React, { useState, useEffect } from 'react';
import { DashboardView } from '@/views/DashboardView';
import { ChatView } from '@/components/chat/ChatView';
import { AgentsView } from '@/views/AgentsView';
import { ChannelsView } from '@/views/ChannelsView';
import { MemoryView } from '@/views/MemoryView';
import { ContentView } from '@/views/ContentView';
import { WorkflowView } from '@/views/WorkflowView';
import { SkillsView } from '@/views/SkillsView';
import { ModelsView } from '@/views/ModelsView';
import { CronView } from '@/views/CronView';
import { DiagnosticsView } from '@/views/DiagnosticsView';
import { SessionsView } from '@/views/SessionsView';
import { LogsView } from '@/views/LogsView';
import { SettingsView } from '@/views/SettingsView';
import { TemplatesView } from '@/views/TemplatesView';
import { PluginsView } from '@/views/PluginsView';
import { UnifiedSidebar } from '@/components/Sidebar/UnifiedSidebar';
import { FloatingPanel } from '@/components/Panel/FloatingPanel';
import { PanelContent } from '@/components/Panel/PanelContent';
import { PanelTrigger } from '@/components/Panel/PanelTrigger';
import { useGatewayStore } from '@/stores/gateway';

const MainLayout: React.FC = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Get connection status from gateway store
  const gatewayStatus = useGatewayStore((state) => state.status);
  const isConnected = gatewayStatus.state === 'running';

  // Initialize gateway on mount
  useEffect(() => {
    const { init } = useGatewayStore.getState();
    init().catch(console.error);
  }, []);

  // Handle Cmd/Ctrl + K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPanelOpen(!isPanelOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return <DashboardView />;
      case 'chat':
        return <ChatView />;
      case 'agent':
        return <AgentsView />;
      case 'channel':
        return <ChannelsView />;
      case 'memory':
        return <MemoryView />;
      case 'content':
        return <ContentView />;
      case 'workflow':
        return <WorkflowView />;
      case 'skill':
        return <SkillsView />;
      case 'model':
        return <ModelsView />;
      case 'cron':
        return <CronView />;
      case 'diagnostic':
        return <DiagnosticsView />;
      case 'session':
        return <SessionsView />;
      case 'log':
        return <LogsView />;
      case 'setting':
        return <SettingsView />;
      case 'template':
        return <TemplatesView />;
      case 'plugin':
        return <PluginsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0d1117] text-white overflow-hidden">
      {/* Unified Sidebar */}
      <UnifiedSidebar
        activeView={activeNav}
        onViewChange={setActiveNav}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>

      {/* Floating Panel */}
      <FloatingPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
      >
        <PanelContent />
      </FloatingPanel>

      {/* Panel Trigger Button */}
      <PanelTrigger
        isOpen={isPanelOpen}
        onClick={() => setIsPanelOpen(true)}
      />

      {/* Connection Status Indicator */}
      <div
        className={`
          fixed top-4 right-4 z-20
          w-3 h-3 rounded-full
          ${isConnected ? 'bg-green-400' : 'bg-red-400'}
          animate-pulse
        `}
        title={isConnected ? 'Gateway 在线' : 'Gateway 离线'}
      />
    </div>
  );
};

export default MainLayout;
