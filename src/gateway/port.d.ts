/**
 * Gateway 端口解析与连接检测
 * 1. 扫描进程中 OpenClaw 实际监听端口
 * 2. 从 openclaw.json 读取配置端口
 * 3. 多端口探测（18789、18791、18792）
 */
/** 从 ~/.openclaw/openclaw.json 读取 gateway.port */
export declare function readGatewayPortFromConfig(): number;
export declare function getResolvedGatewayPort(): number;
export declare function setResolvedGatewayPort(port: number): void;
export declare function clearResolvedGatewayPort(): void;
/**
 * 探测 Gateway 可用端口：
 * 1. 从进程中检测 OpenClaw 实际监听端口
 * 2. 配置端口 + 常见端口 18789/18791/18792
 */
export declare function resolveGatewayPort(): Promise<{
    success: boolean;
    port?: number;
    error?: string;
}>;
