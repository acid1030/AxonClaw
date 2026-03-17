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
import { Skills } from '@/pages/Skills';
import { ModelsView } from '@/views/ModelsView';
import { CronView } from '@/views/CronView';
import { RunView } from '@/views/RunView';
import { UsageView } from '@/views/UsageView';
import { AlertsView } from '@/views/AlertsView';
import { LogsView } from '@/views/LogsView';
import { NodesView } from '@/views/NodesView';
import { ExtensionsView } from '@/views/ExtensionsView';
import { SystemView } from '@/views/SystemView';
import { KnowledgeView } from '@/views/KnowledgeView';
import { ActivityMonitorView } from '@/views/ActivityMonitorView';
import { InstallationWizardView } from '@/views/InstallationWizardView';
import { ConfigurationCenterView } from '@/views/ConfigurationCenterView';
import { UsageWizardView } from '@/views/UsageWizardView';
import { GatewayMonitoringView } from '@/views/GatewayMonitoringView';
import { ApprovalCenterView } from '@/views/ApprovalCenterView';
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
        return <DashboardView onNavigateTo={(view) => setActiveNav(view)} />;
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
        return <Skills />;
      case 'model':
        return <ModelsView />;
      case 'cron':
        return <CronView />;
      case 'run':
        return <RunView onNavigateTo={(view) => setActiveNav(view)} />;
      case 'usage':
        return <UsageView />;
      case 'alerts':
        return <AlertsView />;
      case 'logs':
        return <LogsView />;
      case 'nodes':
        return <NodesView />;
      case 'extensions':
        return <ExtensionsView />;
      case 'system':
        return <SystemView onNavigateTo={(view) => setActiveNav(view)} />;
      case 'health':
        return <SystemView onNavigateTo={(view) => setActiveNav(view)} defaultTab="diagnostic" />;
      case 'knowledge':
        return <KnowledgeView />;
      case 'activity':
        return <ActivityMonitorView onNavigateTo={(view) => setActiveNav(view)} />;
      case 'install':
        return <InstallationWizardView onNavigateTo={(view) => setActiveNav(view)} />;
      case 'config':
        return <ConfigurationCenterView />;
      case 'guide':
        return <UsageWizardView onNavigateTo={(view) => setActiveNav(view)} />;
      case 'gateway-monitor':
        return <GatewayMonitoringView />;
      case 'approval':
        return <ApprovalCenterView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-white overflow-hidden">
      {/* Unified Sidebar */}
      <UnifiedSidebar
        activeView={activeNav}
        onViewChange={setActiveNav}
      />

      {/* Main Content - 左右边距 10px，内容占满宽度 */}
      <main className="flex-1 overflow-hidden px-[10px] w-full min-w-0">
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
