/**
 * AxonClaw - i18next 配置
 * 供 react-i18next useTranslation 使用
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

export const SUPPORTED_LANGUAGES = [
  { code: 'zh', name: '中文' },
  { code: 'en', name: 'English' },
];

const resources = {
  zh: {
    chat: {
      composer: {
        clearTarget: '清除',
        targetChip: '发送给 {{agent}}',
        attachFiles: '附件',
        pickAgent: '选择 Agent',
        agentPickerTitle: '发送给 @{{currentAgent}} 以外的 Agent',
        gatewayDisconnectedPlaceholder: 'Gateway 未连接',
        send: '发送',
        stop: '停止',
        gatewayStatus: '{{state}} {{port}} {{pid}}',
        gatewayConnected: '已连接',
        retryFailedAttachments: '重试失败附件',
      },
    },
    agents: {
      title: 'Agent 管理',
      create: '创建 Agent',
      edit: '编辑 Agent',
      delete: '删除 Agent',
      name: '名称',
      role: '角色',
      status: '状态',
    },
    settings: {},
    channels: {},
    cron: {},
    dashboard: {},
  },
  en: {
    chat: {
      composer: {
        clearTarget: 'Clear',
        targetChip: 'To {{agent}}',
        attachFiles: 'Attach',
        pickAgent: 'Pick Agent',
        agentPickerTitle: 'Send to Agent other than @{{currentAgent}}',
        gatewayDisconnectedPlaceholder: 'Gateway disconnected',
        send: 'Send',
        stop: 'Stop',
        gatewayStatus: '{{state}} {{port}} {{pid}}',
        gatewayConnected: 'Connected',
        retryFailedAttachments: 'Retry failed attachments',
      },
    },
    agents: {
      title: 'Agent Management',
      create: 'Create Agent',
      edit: 'Edit Agent',
      delete: 'Delete Agent',
      name: 'Name',
      role: 'Role',
      status: 'Status',
    },
    settings: {},
    channels: {},
    cron: {},
    dashboard: {},
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'zh',
  fallbackLng: 'zh',
  defaultNS: 'chat',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
