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

// Skills management
ipcMain.handle('skills:openFolder', async () => {
  const skillsDir = path.join(os.homedir(), '.openclaw', 'skills');
  await shell.openPath(skillsDir);
});

// Host API proxy - Gateway REST API
const GATEWAY_API_BASE = 'http://127.0.0.1:18789';
const GATEWAY_WS_URL = 'ws://127.0.0.1:18789/ws';
const GATEWAY_TOKEN = 'axonclaw-local-dev'; // 本地开发 token

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
