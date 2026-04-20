/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */
export interface GatewayRpcResult {
    success: boolean;
    ok: boolean;
    result?: unknown;
    error?: string;
}
/**
 * 调用 Gateway JSON-RPC（主进程内使用）
 */
export declare function callGatewayRpc(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<GatewayRpcResult>;
/**
 * 带端口重试的 RPC：失败时重新探测端口并重试一次（用于智能代理等首次请求可能端口未缓存场景）
 */
export declare function callGatewayRpcWithRetry(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<GatewayRpcResult>;
