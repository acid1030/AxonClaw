/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */

const GATEWAY_WS_URL = 'ws://127.0.0.1:18789/ws';
const GATEWAY_TOKEN = 'clawx-8c07bcf5f6eb617faee8f9b4c01be4a7';

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
  const ws = new WebSocket(GATEWAY_WS_URL);

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
                  displayName: 'AxonClaw',
                  version: '0.1.0',
                  platform: process.platform,
                  mode: 'ui',
                },
                auth: { token: GATEWAY_TOKEN },
                role: 'operator',
                scopes: ['operator.admin'],
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
              error: String(msg.error?.message ?? msg.error ?? 'Connect failed'),
            });
            return;
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
