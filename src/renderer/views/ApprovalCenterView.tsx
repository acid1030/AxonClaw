/**
 * AxonClaw - 审批中心
 * ClawDeckX 风格：审批列表、详情、通过/拒绝
 * 需 OpenClaw Gateway 支持 approvals 相关 RPC
 */

import React, { useEffect, useState } from 'react';
import { FileCheck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGatewayStore } from '@/stores/gateway';

interface ApprovalItem {
  id: string;
  type?: string;
  title?: string;
  status?: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

export const ApprovalCenterView: React.FC = () => {
  const gatewayStatus = useGatewayStore((s) => s.status);
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const isOnline = gatewayStatus.state === 'running';

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (isOnline) {
          const rpc = useGatewayStore.getState().rpc;
          const data = (await rpc('approvals.list').catch(() => ({ items: [] }))) as {
            items?: ApprovalItem[];
          };
          setItems(data?.items ?? []);
        } else {
          setItems([]);
        }
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [isOnline]);

  if (!isOnline) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 bg-[#0f172a]">
        <FileCheck className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">审批中心</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
          Gateway 未连接。审批功能需 OpenClaw 支持 approvals 相关 RPC（approvals.list、approvals.approve 等）。
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#0f172a]">
      <div className="flex-shrink-0 py-4 border-b border-indigo-500/20">
        <h1 className="text-xl font-semibold text-foreground">审批中心</h1>
        <p className="text-sm text-muted-foreground mt-1">
          ClawDeckX 风格：审批列表、详情、通过/拒绝。需 OpenClaw 支持 approvals API。
        </p>
      </div>
      <div className="flex-1 overflow-auto py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">暂无待审批项</p>
            <p className="text-xs text-muted-foreground mt-1">
              若 OpenClaw 支持审批流程，待审批项将在此显示
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title ?? item.id}</p>
                  <p className="text-xs text-muted-foreground">{item.type}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-400">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        通过
                      </Button>
                      <Button size="sm" variant="outline" className="border-red-500/40 text-red-400">
                        <XCircle className="h-4 w-4 mr-1" />
                        拒绝
                      </Button>
                    </>
                  )}
                  {item.status === 'approved' && (
                    <span className="text-xs text-emerald-400">已通过</span>
                  )}
                  {item.status === 'rejected' && (
                    <span className="text-xs text-red-400">已拒绝</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalCenterView;
