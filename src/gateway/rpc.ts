/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */

import { getResolvedGatewayPort, resolveGatewayPort, setResolvedGatewayPort } from './port';
import { GATEWAY_TOKEN } from './constants';
import { getSetting, isInitialized } from '../database';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { buildSignedGatewayDevice } from './device-auth';

const GW_MODE_KEY = 'gateway.connection.mode';
const GW_REMOTE_PROTOCOL_KEY = 'gateway.remote.protocol';
const GW_REMOTE_HOST_KEY = 'gateway.remote.host';
const GW_REMOTE_PORT_KEY = 'gateway.remote.port';
const GW_REMOTE_TOKEN_KEY = 'gateway.remote.token';

function isWriteRpcMethod(method: string): boolean {
  const m = String(method || '').trim();
  if (!m) return false;
  if (m === 'chat.send' || m === 'chat.abort') return true;
  if (m.startsWith('agents.')) return true;
  if (m.startsWith('sessions.') && m !== 'sessions.list' && m !== 'sessions.history') return true;
  if (m.startsWith('cron.') && m !== 'cron.list' && m !== 'cron.history') return true;
  if (m.startsWith('channels.') || m.startsWith('providers.') || m.startsWith('skills.')) return true;
  return false;
}

type GatewayRuntimeConfig = {
  mode: 'local' | 'remote';
  protocol: 'ws' | 'wss';
  host: string;
  port: number;
  token: string;
};

function getGatewayRuntimeConfig(): GatewayRuntimeConfig {
  const defaults: GatewayRuntimeConfig = {
    mode: 'local',
    protocol: 'ws',
    host: '127.0.0.1',
    port: getResolvedGatewayPort(),
    token: GATEWAY_TOKEN,
  };

  try {
    if (!isInitialized()) return defaults;
    const modeRaw = (getSetting(GW_MODE_KEY) || 'local').toLowerCase();
    if (modeRaw !== 'remote') return defaults;

    const protocolRaw = (getSetting(GW_REMOTE_PROTOCOL_KEY) || 'ws').toLowerCase();
    const protocol: 'ws' | 'wss' = protocolRaw === 'wss' ? 'wss' : 'ws';
    const host = (getSetting(GW_REMOTE_HOST_KEY) || '').trim();
    const portRaw = parseInt(getSetting(GW_REMOTE_PORT_KEY) || '', 10);
    const token = (getSetting(GW_REMOTE_TOKEN_KEY) || '').trim() || GATEWAY_TOKEN;
    const port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 18789;

    if (!host) return defaults;
    return { mode: 'remote', protocol, host, port, token };
  } catch {
    return defaults;
  }
}

function getGatewayWsUrl(): string {
  const cfg = getGatewayRuntimeConfig();
  return `${cfg.protocol}://${cfg.host}:${cfg.port}/ws`;
}

function readTokenFromOpenclawConfig(homeDir: string): string {
  try {
    const cfgPath = path.join(homeDir, '.openclaw', 'openclaw.json');
    if (!fs.existsSync(cfgPath)) return '';
    const json = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as Record<string, unknown>;
    const gateway = (json.gateway && typeof json.gateway === 'object' && !Array.isArray(json.gateway))
      ? (json.gateway as Record<string, unknown>)
      : {};
    const auth = (gateway.auth && typeof gateway.auth === 'object' && !Array.isArray(gateway.auth))
      ? (gateway.auth as Record<string, unknown>)
      : {};
    return String(auth.token || '').trim();
  } catch {
    return '';
  }
}

function readDeviceTokenFromIdentity(homeDir: string): string {
  try {
    const authPath = path.join(homeDir, '.openclaw', 'identity', 'device-auth.json');
    if (!fs.existsSync(authPath)) return '';
    const json = JSON.parse(fs.readFileSync(authPath, 'utf8')) as Record<string, unknown>;
    const tokens = (json.tokens && typeof json.tokens === 'object' && !Array.isArray(json.tokens))
      ? (json.tokens as Record<string, unknown>)
      : {};
    const operator = (tokens.operator && typeof tokens.operator === 'object' && !Array.isArray(tokens.operator))
      ? (tokens.operator as Record<string, unknown>)
      : {};
    return String(operator.token || '').trim();
  } catch {
    return '';
  }
}

function buildGatewayConnectAuth(): { token?: string; deviceToken?: string } {
  const cfg = getGatewayRuntimeConfig();
  const localHome = os.homedir();
  const settingsToken = String(cfg.token || '').trim();
  const localToken = cfg.mode === 'local' ? readTokenFromOpenclawConfig(localHome) : '';
  const token = settingsToken || localToken || GATEWAY_TOKEN;
  const deviceToken = cfg.mode === 'local' ? readDeviceTokenFromIdentity(localHome) : '';
  const auth: { token?: string; deviceToken?: string } = {};
  if (token) auth.token = token;
  if (deviceToken) auth.deviceToken = deviceToken;
  return auth;
}

/** 是否为连接类错误（可尝试重新探测端口后重试） */
function isConnectionError(err: unknown): boolean {
  const msg = String(err ?? '').toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('websocket error') ||
    msg.includes('connection closed') ||
    msg.includes('connection refused') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset')
  );
}

export interface GatewayRpcResult {
  success: boolean;
  ok: boolean;
  result?: unknown;
  error?: string;
}

/**
 * 调用 Gateway JSON-RPC（主进程内使用）
 */
export async function callGatewayRpc(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30000
): Promise<GatewayRpcResult> {
  const WebSocket = require('ws');
  const ws = new WebSocket(getGatewayWsUrl());
  const writeMethod = isWriteRpcMethod(method);

  return new Promise((resolve) => {
    let resolved = false;
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          ws.close();
        } catch {
          /* ignore */
        }
        resolve({ success: false, ok: false, error: 'Timeout' });
      }
    }, timeoutMs);

    const doRpc = () => {
      ws.send(
        JSON.stringify({
          type: 'req',
          id: `rpc-${Date.now()}`,
          method,
          params,
        })
      );
    };

    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          const auth = buildGatewayConnectAuth();
          const scopes = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'];
          const nonce = String(msg?.payload?.nonce || '');
          const device = buildSignedGatewayDevice(
            nonce,
            auth.token ?? auth.deviceToken ?? null,
            'gateway-client',
            'ui',
            'operator',
            scopes,
          );
          ws.send(
            JSON.stringify({
              type: 'req',
              id: 'connect-' + Date.now(),
              method: 'connect',
              params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                  id: 'gateway-client',
                  displayName: 'AxonClawX',
                  version: '0.1.0',
                  platform: process.platform,
                  mode: 'ui',
                },
                auth,
                ...(device ? { device } : {}),
                role: 'operator',
                scopes,
              },
            })
          );
          return;
        }

        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({
              success: false,
              ok: false,
              error: String(
                msg.error?.message
                  ?? msg.error?.details?.code
                  ?? msg.error?.code
                  ?? msg.error
                  ?? 'Connect failed'
              ),
            });
            return;
          }
          const grantedScopes = msg.result?.scopes ?? msg.payload?.scopes;
          if (Array.isArray(grantedScopes) && !grantedScopes.includes('operator.write')) {
            console.warn(`[GatewayRPC] ${method} operator.write NOT in granted scopes:`, grantedScopes);
            if (writeMethod) {
              resolved = true;
              clearTimeout(timeoutId);
              ws.close();
              resolve({
                success: false,
                ok: false,
                error: `missing scope: operator.write (granted: ${grantedScopes.join(', ')})`,
              });
              return;
            }
          }
          doRpc();
          return;
        }

        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            const ok = msg.ok !== false && !msg.error;
            const result = msg.result ?? msg.payload;
            const error =
              msg.error != null
                ? String(
                    typeof msg.error === 'object' && msg.error && 'message' in msg.error
                      ? (msg.error as { message?: string }).message
                      : msg.error
                  )
                : undefined;
            resolve({ success: ok, ok, result, error });
          }
        }
      } catch {
        /* ignore parse errors */
      }
    });

    ws.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: 'WebSocket error' });
      }
    });

    ws.on('close', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: 'Connection closed' });
      }
    });
  });
}

/**
 * 带端口重试的 RPC：失败时重新探测端口并重试一次（用于智能代理等首次请求可能端口未缓存场景）
 */
export async function callGatewayRpcWithRetry(
  method: string,
  params: Record<string, unknown> = {},
  timeoutMs = 30000
): Promise<GatewayRpcResult> {
  let result = await callGatewayRpc(method, params, timeoutMs);
  if (result.ok) return result;
  if (!isConnectionError(result.error)) return result;

  if (getGatewayRuntimeConfig().mode === 'remote') {
    return result;
  }

  const r = await resolveGatewayPort();
  if (r.success && r.port) {
    setResolvedGatewayPort(r.port);
    result = await callGatewayRpc(method, params, timeoutMs);
  }
  return result;
}
