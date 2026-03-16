// AxonClaw - Main Process Entry Point
// Electron Main Process

import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as path from 'path';
import * as os from 'os';
import {
  startGateway,
  stopGateway,
  getGatewayStatus,
  isGatewayRunning,
  getGatewayManager,
} from '../gateway/lifecycle';

// Global window reference
let mainWindow: BrowserWindow | null = null;

/**
 * Create the main application window
 */
function createWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0f172a', // Dark theme background
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/index.js'),
    },
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 15, y: 15 } : undefined,
    frame: isMac,
  });

  // Development: Load from Vite dev server
  if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
    const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools();
  } else {
    // Production: Load from built files
    win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

/**
 * Initialize the application
 */
async function initialize(): Promise<void> {
  console.log('[Main] Initializing AxonClaw...');
  
  // Create the main window
  mainWindow = createWindow();
  
  // Subscribe to Gateway events
  const gatewayManager = getGatewayManager();
  
  gatewayManager.on('started', () => {
    console.log('[Main] Gateway started');
    mainWindow?.webContents.send('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('stopped', (code) => {
    console.log('[Main] Gateway stopped:', code);
    mainWindow?.webContents.send('gateway:status', getGatewayStatus());
  });
  
  gatewayManager.on('error', (error) => {
    console.error('[Main] Gateway error:', error);
    mainWindow?.webContents.send('gateway:error', error.message);
  });
  
  // Start Gateway on app ready
  // Note: AxonClaw connects to existing OpenClaw Gateway (port 18789)
  // Don't start a new gateway to avoid port conflict
  console.log('[Main] AxonClaw will connect to existing OpenClaw Gateway at port 18789');
  mainWindow?.webContents.send('gateway:status', { 
    state: 'running', 
    port: 18789,
    note: 'Using existing OpenClaw Gateway'
  });

  // Handle window activation (macOS)
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    } else if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// App lifecycle - Ready
app.whenReady().then(() => {
  initialize().catch((error) => {
    console.error('[Main] Initialization failed:', error);
  });
});

// App lifecycle - All windows closed
app.on('window-all-closed', () => {
  // On macOS, apps usually stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App lifecycle - Will quit
app.on('will-quit', async () => {
  console.log('[Main] App will quit, stopping Gateway...');
  try {
    await stopGateway();
    console.log('[Main] Gateway stopped');
  } catch (error) {
    console.error('[Main] Error stopping Gateway:', error);
  }
});

// App lifecycle - Before quit (for cleanup)
app.on('before-quit', () => {
  console.log('[Main] App before quit');
});

// IPC Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('gateway:start', async () => {
  try {
    await startGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:stop', async () => {
  try {
    await stopGateway();
    return getGatewayStatus();
  } catch (error) {
    const status = getGatewayStatus();
    status.error = String(error);
    return status;
  }
});

ipcMain.handle('gateway:status', () => {
  return getGatewayStatus();
});

ipcMain.handle('gateway:isRunning', () => {
  return isGatewayRunning();
});

// Gateway RPC - 通过 WebSocket 调用 OpenClaw Gateway
// 参数格式: invokeIpc('gateway:rpc', method, params, timeoutMs) => (method, params, timeoutMs)
ipcMain.handle('gateway:rpc', async (_event, methodOrPayload: unknown, paramsOrUndef?: unknown, timeoutMsOrUndef?: number) => {
  let method: string;
  let params: Record<string, unknown>;
  let timeout: number;

  if (typeof methodOrPayload === 'string') {
    method = methodOrPayload;
    params = (paramsOrUndef && typeof paramsOrUndef === 'object' ? paramsOrUndef : {}) as Record<string, unknown>;
    timeout = typeof timeoutMsOrUndef === 'number' ? timeoutMsOrUndef : 30000;
  } else if (methodOrPayload && typeof methodOrPayload === 'object' && 'method' in (methodOrPayload as object)) {
    const payload = methodOrPayload as { method: string; params?: unknown; timeoutMs?: number };
    method = payload.method;
    params = (payload.params && typeof payload.params === 'object' ? payload.params : {}) as Record<string, unknown>;
    timeout = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 30000;
  } else {
    throw new Error('gateway:rpc invalid args');
  }

  console.log(`[GatewayRPC] ${method}`, params);
  
  return new Promise((resolve) => {
    let resolved = false;
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://127.0.0.1:18789/ws');
    
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error(`[GatewayRPC] ${method} timeout`);
        ws.close();
        resolve({ success: false, ok: false, error: 'Timeout' });
      }
    }, timeout);
    
    ws.on('open', () => {
      console.log(`[GatewayRPC] ${method} WebSocket opened`);
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { id: 'gateway-client', displayName: 'ClawX', version: '0.1.0', platform: process.platform, mode: 'ui' },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            resolve({ success: false, ok: false, error: String(msg.error?.message ?? msg.error ?? 'Connect failed') });
            return;
          }
          // 发送实际请求
          ws.send(JSON.stringify({
            type: 'req',
            id: `rpc-${Date.now()}`,
            method,
            params,
          }));
          return;
        }
        
        // 处理 RPC 响应
        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeoutId);
            ws.close();
            console.log(`[GatewayRPC] ${method} result:`, msg.ok ? 'success' : 'error');
            const ok = msg.ok !== false && !msg.error;
            const result = msg.result ?? msg.payload;
            const error = msg.error != null ? String(typeof msg.error === 'object' && msg.error && 'message' in msg.error ? (msg.error as { message?: string }).message : msg.error) : undefined;
            resolve({
              success: ok,
              ok,
              result,
              error,
            });
          }
        }
      } catch (err) {
        console.error(`[GatewayRPC] ${method} parse error:`, err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error(`[GatewayRPC] ${method} WebSocket error:`, err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ success: false, ok: false, error: err.message });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        console.log(`[GatewayRPC] ${method} WebSocket closed:`, code, reason.toString());
        resolve({ success: false, ok: false, error: 'Connection closed' });
      }
    });
  });
});

// Skills management
ipcMain.handle('skills:openFolder', async () => {
  const skillsDir = path.join(os.homedir(), '.openclaw', 'skills');
  await shell.openPath(skillsDir);
});

// Sessions list - 代理到 OpenClaw Gateway
ipcMain.handle('sessions.list', async (_event, { limit, agentId }) => {
  console.log('[SessionsList] Fetching sessions...');
  
  return new Promise((resolve, reject) => {
    let resolved = false;
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://127.0.0.1:18789/ws');
    
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[SessionsList] Timeout');
        ws.close();
        resolve({ sessions: [] }); // 超时返回空数组而不是 reject
      }
    }, 10000);
    
    ws.on('open', () => {
      console.log('[SessionsList] WebSocket opened');
    });
    
    ws.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        console.log('[SessionsList] Message:', msg.type, msg.event || msg.id || '');
        
        // 处理 challenge
        if (msg.type === 'event' && msg.event === 'connect.challenge') {
          console.log('[SessionsList] Got challenge, sending connect...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'connect-' + Date.now(),
            method: 'connect',
            params: {
              minProtocol: 3,
              maxProtocol: 3,
              client: { 
                id: 'gateway-client', 
                displayName: 'ClawX', 
                version: '0.1.0',
                platform: process.platform,
                mode: 'ui',
              },
              auth: { token: GATEWAY_TOKEN },
              role: 'operator',
              scopes: ['operator.admin'],
            },
          }));
          return;
        }
        
        // 处理 connect 响应
        if (msg.type === 'res' && String(msg.id).startsWith('connect-')) {
          console.log('[SessionsList] Connect response:', msg.ok ? 'SUCCESS' : 'FAILED');
          if (!msg.ok) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            resolve({ sessions: [] });
            return;
          }
          // 发送 sessions.list 请求
          console.log('[SessionsList] Sending sessions.list request...');
          ws.send(JSON.stringify({
            type: 'req',
            id: 'sessions-' + Date.now(),
            method: 'sessions.list',
            params: { limit: limit || 50, agentId: agentId || 'main' },
          }));
          return;
        }
        
        // 处理 sessions.list 响应
        if (msg.type === 'res' && String(msg.id).startsWith('sessions-')) {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            ws.close();
            const sessions = msg.payload?.sessions || msg.result?.sessions || [];
            console.log('[SessionsList] Found', sessions.length, 'sessions');
            resolve({ sessions });
          }
        }
      } catch (err) {
        console.error('[SessionsList] Parse error:', err);
      }
    });
    
    ws.on('error', (err: Error) => {
      console.error('[SessionsList] WebSocket error:', err.message);
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
    
    ws.on('close', (code: number, reason: Buffer) => {
      console.log('[SessionsList] WebSocket closed:', code, reason.toString());
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve({ sessions: [] });
      }
    });
  });
});

// Host API proxy - Gateway REST API
const GATEWAY_API_BASE = 'http://127.0.0.1:18789';
const GATEWAY_WS_URL = 'ws://127.0.0.1:18789/ws';
const GATEWAY_TOKEN = 'clawx-8c07bcf5f6eb617faee8f9b4c01be4a7'; // OpenClaw Gateway token

ipcMain.handle('hostapi:fetch', async (_event, { path, method, headers, body }) => {
  try {
    // 特殊处理：AxonClaw 的 gateway-info API
    if (path === '/api/app/gateway-info') {
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: {
            wsUrl: GATEWAY_WS_URL,
            token: GATEWAY_TOKEN,
            port: 18789,
          },
        },
        success: true,
        status: 200,
        json: {
          wsUrl: GATEWAY_WS_URL,
          token: GATEWAY_TOKEN,
          port: 18789,
        },
      };
    }

    // 特殊处理：/health 直接返回成功
    if (path === '/health') {
      console.log('[HostAPI] GET /health (direct response)');
      return {
        ok: true,
        data: {
          status: 200,
          ok: true,
          json: { ok: true, status: 'live' },
          text: undefined,
        },
        success: true,
        status: 200,
        json: { ok: true, status: 'live' },
        text: undefined,
      };
    }

    const url = `${GATEWAY_API_BASE}${path}`;
    console.log(`[HostAPI] ${method} ${path}`);
    
    const response = await fetch(url, {
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
    });

    let json: unknown = undefined;
    let text: string | undefined = undefined;

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await response.json();
      } catch {
        text = await response.text();
      }
    } else {
      text = await response.text();
    }

    return {
      ok: true,
      data: {
        status: response.status,
        ok: response.ok,
        json,
        text,
      },
      success: response.ok,
      status: response.status,
      json,
      text,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[HostAPI] Error: ${message}`);
    return {
      ok: false,
      error: { message },
      success: false,
    };
  }
});

// Export for testing
export { mainWindow };
