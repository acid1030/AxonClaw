/**
 * AxonClaw - Logs View
 * 统一日志：系统日志 (/api/logs) + Gateway 流式事件 (chat.send delta/final)
 */

import React, { useEffect } from 'react';
import { useGatewayLogsStore } from '@/stores/gateway-logs';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';

const LogsView: React.FC = () => {
  const {
    logs,
    addStreamLog,
    fetchSystemLogs,
    clearLogs,
    systemLogsLoading,
    systemLogsError,
  } = useGatewayLogsStore();

  useEffect(() => {
    void fetchSystemLogs(200);
  }, [fetchSystemLogs]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc?.on) return;
    const unsub = ipc.on(
      'app:gateway-log',
      (payload: { time?: string; level?: string; agent?: string; message?: string }) => {
        addStreamLog({
          time: payload.time ?? new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          level: payload.level ?? 'DEBUG',
          agent: payload.agent ?? 'Gateway',
          message: payload.message ?? '',
        });
      },
    );
    return unsub;
  }, [addStreamLog]);

  const handleOpenLogDir = async () => {
    try {
      const { dir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (dir) await invokeIpc('shell:showItemInFolder', dir);
    } catch {
      /* ignore */
    }
  };

  const errorCount = logs.filter((l) => l.level === 'ERROR').length;
  const warnCount = logs.filter((l) => l.level === 'WARN').length;
  const streamCount = logs.filter((l) => l.source === 'streaming').length;
  const systemCount = logs.filter((l) => l.source === 'system').length;

  return (
    <div className="h-full flex flex-col p-6">
      {/* Topbar */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-white">系统日志</h1>
          <p className="text-sm text-white/60">
            系统日志 + Gateway 流式事件（发送消息后实时显示 delta/final）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void fetchSystemLogs(200)}
            disabled={systemLogsLoading}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {systemLogsLoading ? '加载中...' : '刷新系统日志'}
          </button>
          <button
            onClick={handleOpenLogDir}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 text-sm hover:bg-white/10 transition-colors"
          >
            打开日志目录
          </button>
          <button
            onClick={clearLogs}
            className="px-4 py-2 bg-blue-500 rounded-lg text-white text-sm hover:bg-blue-600 transition-colors"
          >
            清空
          </button>
        </div>
      </div>

      {systemLogsError && (
        <div className="mb-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm">
          {systemLogsError}
        </div>
      )}

      {/* 日志列表 */}
      <div className="flex-1 bg-[#1a1a1a] rounded-lg p-4 font-mono text-xs overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-white/40 py-8 text-center">
            {systemLogsLoading ? '正在加载系统日志...' : '暂无日志。点击「刷新系统日志」或发送消息后查看。'}
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={`${log.source}-${index}`} className="flex items-baseline gap-2 py-1 hover:bg-white/5">
              <span className="text-white/40 min-w-[70px]">{log.time}</span>
              <span
                className={`min-w-[50px] font-medium ${
                  log.level === 'ERROR'
                    ? 'text-red-400'
                    : log.level === 'WARN'
                      ? 'text-amber-400'
                      : log.level === 'INFO'
                        ? 'text-blue-400'
                        : 'text-white/40'
                }`}
              >
                [{log.level}]
              </span>
              <span
                className={`min-w-[80px] ${log.source === 'streaming' ? 'text-cyan-400' : 'text-green-400'}`}
              >
                [{log.agent}]
              </span>
              <span className="text-white/80 flex-1 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center gap-4 mt-4 text-xs text-white/40">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>实时</span>
        </div>
        <span>{logs.length} 条</span>
        <span>系统 {systemCount}</span>
        <span>流式 {streamCount}</span>
        {errorCount > 0 && <span className="text-red-400">{errorCount} 错误</span>}
        {warnCount > 0 && <span className="text-amber-400">{warnCount} 警告</span>}
      </div>
    </div>
  );
};

export { LogsView };
export default LogsView;
