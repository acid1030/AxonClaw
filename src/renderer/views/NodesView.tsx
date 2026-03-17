/**
 * AxonClaw - Nodes View
 * 远程节点管理、设备配对、远程执行
 * ClawDeckX 风格
 */

import React, { useEffect, useState } from 'react';
import { Network, RefreshCw, Plus, Cpu } from 'lucide-react';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';

interface NodeItem {
  id: string;
  name?: string;
  platform?: string;
  version?: string;
  status?: 'online' | 'offline';
  lastSeen?: number;
}

const NodesView: React.FC = () => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNodes = async () => {
    if (!isOnline) return;
    setLoading(true);
    try {
      const data = await hostApiFetch<{ nodes?: NodeItem[] }>('/api/nodes').catch(() => ({}));
      setNodes(Array.isArray(data?.nodes) ? data.nodes : []);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchNodes();
  }, [isOnline]);

  return (
    <div className="flex flex-col -m-6 bg-[#0f172a] h-[calc(100vh-2.5rem)] overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col h-full px-6 py-6 min-h-0">
        <PageHeader
          title="节点"
          subtitle="远程节点管理、设备配对、远程执行"
          stats={[
            { label: '已配对', value: nodes.length },
            { label: 'Gateway', value: isOnline ? '在线' : '离线' },
          ]}
          onRefresh={fetchNodes}
          refreshing={loading}
          statsBorderColor="border-teal-500/40"
          actions={
            <button
              disabled={!isOnline}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1e293b] border-2 border-teal-500/40 text-foreground/80 text-sm font-medium hover:bg-[#334155] transition-colors disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              配对节点
            </button>
          }
        />

        {!isOnline && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            请先启动 Gateway 以管理节点
          </div>
        )}

        <div className="flex-1 rounded-xl border-2 border-teal-500/40 bg-[#1e293b] overflow-hidden flex flex-col min-h-[280px]">
          <div className="flex-1 overflow-y-auto p-4">
            {nodes.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                {loading ? '加载中...' : '暂无已配对节点'}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-xl border-2 border-teal-500/20 bg-[#0f172a] p-4 hover:border-teal-500/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                          node.status === 'online' ? 'bg-teal-500/20' : 'bg-slate-500/20'
                        )}
                      >
                        <Cpu className={cn('w-5 h-5', node.status === 'online' ? 'text-teal-400' : 'text-slate-500')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {node.name || node.id}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full',
                              node.status === 'online' ? 'bg-teal-400' : 'bg-slate-500'
                            )}
                          />
                          <span className="text-xs text-muted-foreground">
                            {node.status === 'online' ? '在线' : '离线'}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-2">
                          {node.platform && <span>{node.platform}</span>}
                          {node.version && <span className="ml-2">v{node.version}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { NodesView };
export default NodesView;
