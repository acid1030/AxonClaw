/**
 * Gateway Lifecycle Management
 * Provides functions to start and stop the OpenClaw Gateway process
 */
import { EventEmitter } from 'events';
export interface GatewayStatus {
    state: 'running' | 'stopped' | 'starting' | 'error';
    port: number;
    pid?: number;
    error?: string;
}
export interface GatewayEvents {
    started: () => void;
    stopped: (code: number | null) => void;
    error: (error: Error) => void;
    log: (level: 'info' | 'error' | 'warn', message: string) => void;
}
/**
 * Gateway Lifecycle Manager
 * Manages the OpenClaw Gateway process lifecycle
 */
declare class GatewayLifecycleManager extends EventEmitter {
    private process;
    private port;
    private status;
    private startPromise;
    private stopPromise;
    /**
     * Start the OpenClaw Gateway
     */
    start(): Promise<void>;
    private doStart;
    /**
     * Stop the OpenClaw Gateway
     */
    stop(): Promise<void>;
    private doStop;
    /**
     * Get current Gateway status
     */
    getStatus(): GatewayStatus;
    /**
     * Check if Gateway is running
     */
    isRunning(): boolean;
    /**
     * Wait for Gateway to be ready by polling health endpoint
     */
    private waitForReady;
}
/**
 * Start the OpenClaw Gateway
 * Safe to call multiple times - will only start once
 */
export declare function startGateway(): Promise<void>;
/**
 * Stop the OpenClaw Gateway
 * Safe to call multiple times - will only stop once
 */
export declare function stopGateway(): Promise<void>;
/**
 * Get current Gateway status
 */
export declare function getGatewayStatus(): GatewayStatus;
/**
 * Check if Gateway is running
 */
export declare function isGatewayRunning(): boolean;
/**
 * Get the Gateway lifecycle manager instance
 * Use this to subscribe to events
 */
export declare function getGatewayManager(): GatewayLifecycleManager;
export type { GatewayLifecycleManager };
