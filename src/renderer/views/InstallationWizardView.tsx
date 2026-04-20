/**
 * AxonClaw - 安装向导
 * AxonClawX 风格：完整 5 步安装引导 (欢迎 → 运行环境 → AI 模型 → 安装组件 → 完成)
 * 复用 Setup 页的 SetupWizardContent
 */

import React from 'react';
import { SetupWizardContent } from '@/pages/Setup';
import { useSettingsStore } from '@/stores/settings';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

interface InstallationWizardViewProps {
  onNavigateTo?: (view: string) => void;
}
const FORCE_SETUP_WIZARD_KEY = 'clawx.force-setup-wizard';

export const InstallationWizardView: React.FC<InstallationWizardViewProps> = ({
  onNavigateTo,
}) => {
  const markSetupComplete = useSettingsStore((s) => s.markSetupComplete);

  return (
    <div className="h-full flex flex-col min-h-0 bg-[#0f172a] overflow-hidden">
      <ErrorBoundary>
        <SetupWizardContent
          showTitleBar={false}
          onComplete={async () => {
            try {
              window.localStorage.setItem(FORCE_SETUP_WIZARD_KEY, '0');
            } catch {
              // ignore storage failure
            }
            try {
              await markSetupComplete();
            } catch (error) {
              console.error('[SetupWizard] Failed to mark setup complete:', error);
            }
            onNavigateTo?.('usage-wizard');
          }}
        />
      </ErrorBoundary>
    </div>
  );
};

export default InstallationWizardView;
