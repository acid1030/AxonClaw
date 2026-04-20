// AxonClaw - Main Process Entry Point
// Electron Main Process
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { app, BrowserWindow, ipcMain, shell, clipboard, nativeImage, session } from 'electron';
import { createHash } from 'crypto';
// 捕获 EPIPE 等写入已关闭管道错误，避免未处理异常导致进程退出
process.on('uncaughtException', function (err) {
    var code = err === null || err === void 0 ? void 0 : err.code;
    if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
        // 渲染进程已关闭时的写入，忽略
        return;
    }
    console.error('[Main] uncaughtException:', err);
});
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
var execAsync = promisify(exec);
import { startGateway, stopGateway, getGatewayStatus, isGatewayRunning, getGatewayManager, } from '../gateway/lifecycle';
import { listInstalled, search as clawhubSearch, install as clawhubInstall, uninstall as clawhubUninstall, openSkillPath, scanSkillsFromDir, } from '../gateway/clawhub-cli';
import { callGatewayRpc, callGatewayRpcWithRetry } from '../gateway/rpc';
import { resolveGatewayPort, getResolvedGatewayPort, setResolvedGatewayPort, } from '../gateway/port';
import { GATEWAY_TOKEN } from '../gateway/constants';
import { initDatabase, closeDatabase, isInitialized, listAlerts, alertSummaryStats, getSetting, setSetting, loadBootstrapConfig, saveBootstrapConfig, getConfigFilePath, getDefaultConfig, } from '../database';
// Global window reference
var mainWindow = null;
var codexAuthWindow = null;
var CODEX_AUTH_PARTITION = 'persist:codex-auth';
var appLocked = false;
var LOCK_AUTH_USERNAME_KEY = 'auth.lock.username';
var LOCK_AUTH_PASSWORD_HASH_KEY = 'auth.lock.password_sha256';
var LOCK_DEFAULT_USERNAME = 'admin';
var LOCK_DEFAULT_PASSWORD = '123456';
var GW_MODE_KEY = 'gateway.connection.mode';
var GW_REMOTE_PROTOCOL_KEY = 'gateway.remote.protocol';
var GW_REMOTE_HOST_KEY = 'gateway.remote.host';
var GW_REMOTE_PORT_KEY = 'gateway.remote.port';
var GW_REMOTE_TOKEN_KEY = 'gateway.remote.token';
function openCodexAuthWindow() {
    if (codexAuthWindow && !codexAuthWindow.isDestroyed()) {
        codexAuthWindow.focus();
        return;
    }
    codexAuthWindow = new BrowserWindow({
        width: 1180,
        height: 840,
        title: 'Codex 登录',
        autoHideMenuBar: true,
        webPreferences: {
            partition: CODEX_AUTH_PARTITION,
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    codexAuthWindow.on('closed', function () {
        codexAuthWindow = null;
    });
    void codexAuthWindow.loadURL('https://chatgpt.com');
}
function hashLockPassword(password) {
    return createHash('sha256').update("AxonClawX:".concat(password)).digest('hex');
}
function ensureLockAuthSeed() {
    if (!isInitialized())
        return;
    var username = getSetting(LOCK_AUTH_USERNAME_KEY);
    var passwordHash = getSetting(LOCK_AUTH_PASSWORD_HASH_KEY);
    if (!username)
        setSetting(LOCK_AUTH_USERNAME_KEY, LOCK_DEFAULT_USERNAME);
    if (!passwordHash)
        setSetting(LOCK_AUTH_PASSWORD_HASH_KEY, hashLockPassword(LOCK_DEFAULT_PASSWORD));
}
function verifyLockCredentials(username, password) {
    if (!isInitialized())
        return false;
    ensureLockAuthSeed();
    var storedUsername = getSetting(LOCK_AUTH_USERNAME_KEY) || LOCK_DEFAULT_USERNAME;
    var storedHash = getSetting(LOCK_AUTH_PASSWORD_HASH_KEY) || hashLockPassword(LOCK_DEFAULT_PASSWORD);
    var inputHash = hashLockPassword(password);
    return username === storedUsername && inputHash === storedHash;
}
function getGatewayConnectionSettings() {
    var localDefaults = {
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port: getResolvedGatewayPort(),
        token: GATEWAY_TOKEN,
    };
    try {
        if (!isInitialized())
            return localDefaults;
        var mode = (getSetting(GW_MODE_KEY) || 'local').toLowerCase() === 'remote' ? 'remote' : 'local';
        if (mode === 'local')
            return localDefaults;
        var protocolRaw = (getSetting(GW_REMOTE_PROTOCOL_KEY) || 'ws').toLowerCase();
        var protocol = protocolRaw === 'wss' ? 'wss' : 'ws';
        var host = (getSetting(GW_REMOTE_HOST_KEY) || '').trim();
        var portRaw = parseInt(getSetting(GW_REMOTE_PORT_KEY) || '', 10);
        var token = (getSetting(GW_REMOTE_TOKEN_KEY) || '').trim() || GATEWAY_TOKEN;
        var port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 18789;
        if (!host)
            return localDefaults;
        return { mode: mode, protocol: protocol, host: host, port: port, token: token };
    }
    catch (_a) {
        return localDefaults;
    }
}
function getGatewayAuthToken() {
    return getGatewayConnectionSettings().token;
}
function applyCustomAppIcon() {
    if (process.platform !== 'darwin')
        return;
    var appDir = path.dirname(app.getAppPath());
    var candidates = [
        path.join(process.resourcesPath, 'clawLogo1.png'),
        path.join(process.resourcesPath, 'designUI', 'image', 'clawLogo1.png'),
        path.join(process.resourcesPath, 'icon.icns'),
        path.join(process.resourcesPath, 'build', 'icon.icns'),
        path.join(appDir, 'icon.icns'),
        path.join(appDir, 'build', 'icon.icns'),
        path.join(app.getAppPath(), 'build', 'icon.icns'),
        path.join(app.getAppPath(), 'designUI', 'image', 'icon.icns'),
        path.join(app.getAppPath(), 'designUI', 'image', 'clawLogo1.png'),
        path.join(process.cwd(), 'build', 'icon.icns'),
        path.join(process.cwd(), 'designUI', 'image', 'icon.icns'),
        path.join(process.cwd(), 'designUI', 'image', 'clawLogo1.png'),
    ];
    var iconPath = candidates.find(function (p) { return fs.existsSync(p); });
    if (!iconPath)
        return;
    try {
        // dev 模式下 PNG 兼容性更好，优先直接按路径设置
        app.dock.setIcon(iconPath);
        var icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
            console.log('[Main] App icon:', iconPath);
            app.dock.setIcon(icon);
        }
    }
    catch (err) {
        console.warn('[Main] Failed to set dock icon:', err);
    }
}
function resolveWindowIconPath() {
    var appDir = path.dirname(app.getAppPath());
    var candidates = [
        path.join(process.resourcesPath, 'icon.icns'),
        path.join(process.resourcesPath, 'build', 'icon.icns'),
        path.join(process.resourcesPath, 'icon.ico'),
        path.join(process.resourcesPath, 'build', 'icon.ico'),
        path.join(appDir, 'icon.icns'),
        path.join(appDir, 'build', 'icon.icns'),
        path.join(appDir, 'icon.ico'),
        path.join(appDir, 'build', 'icon.ico'),
        path.join(app.getAppPath(), 'build', 'icon.icns'),
        path.join(app.getAppPath(), 'designUI', 'image', 'icon.icns'),
        path.join(app.getAppPath(), 'build', 'icon.ico'),
        path.join(process.cwd(), 'build', 'icon.icns'),
        path.join(process.cwd(), 'designUI', 'image', 'icon.icns'),
        path.join(process.cwd(), 'build', 'icon.ico'),
    ];
    return candidates.find(function (p) { return fs.existsSync(p); });
}
/** 安全发送 IPC 到渲染进程，避免 EPIPE 等导致进程崩溃 */
function safeSendToRenderer(channel) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    try {
        var win = mainWindow;
        if (!win || win.isDestroyed())
            return;
        var wc = win.webContents;
        if (wc.isDestroyed())
            return;
        wc.send.apply(wc, __spreadArray([channel], args, false));
    }
    catch (err) {
        var code = err === null || err === void 0 ? void 0 : err.code;
        if (code === 'EPIPE' || code === 'ERR_IPC_CHANNEL_CLOSED') {
            // 渲染进程已关闭，忽略
            return;
        }
        console.error('[Main] safeSendToRenderer error:', err);
    }
}
/**
 * Create the main application window
 */
function createWindow() {
    var isMac = process.platform === 'darwin';
    var windowIcon = resolveWindowIconPath();
    var win = new BrowserWindow({
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
        icon: windowIcon,
    });
    if (isMac) {
        // 再次设置一次 dock 图标，避免 dev 模式偶发不生效
        applyCustomAppIcon();
    }
    // Development: Load from Vite dev server
    if (process.env.NODE_ENV === 'development' || process.env.VITE_DEV_SERVER_URL) {
        var devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        win.loadURL(devUrl);
        win.webContents.openDevTools();
    }
    else {
        // Production: Load from built files
        win.loadFile(path.join(__dirname, '../../dist/renderer/index.html'));
    }
    // 开发者工具快捷键：Cmd+Option+I (Mac) / Ctrl+Shift+I (Win/Linux)
    win.webContents.on('before-input-event', function (_e, input) {
        if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
            win.webContents.toggleDevTools();
        }
    });
    win.on('closed', function () {
        mainWindow = null;
    });
    // 阻止粘贴图片时打开新窗口或跳转到非应用 URL（导致空白页）
    win.webContents.setWindowOpenHandler(function (_a) {
        var url = _a.url;
        if (url.startsWith('blob:') || url.startsWith('data:')) {
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });
    win.webContents.on('will-navigate', function (e, url) {
        // 仅允许导航到应用自身地址（dev server 或 file://），阻止其他任何导航（blob:, data:, about:blank 等）
        var devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
        var isAppUrl = url.startsWith(devUrl) || url.startsWith('file://');
        if (!isAppUrl) {
            e.preventDefault();
        }
    });
    return win;
}
/**
 * Initialize the application
 */
function initialize() {
    return __awaiter(this, void 0, void 0, function () {
        var r, _a, gatewayManager, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('[Main] Initializing AxonClaw...');
                    // 初始化数据库（默认 SQLite，路径可通过 AXONCLAW_DB_PATH 或后续启动配置选择）
                    try {
                        initDatabase();
                        ensureLockAuthSeed();
                    }
                    catch (err) {
                        console.error('[Main] Database init failed:', err);
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, resolveGatewayPort()];
                case 2:
                    r = _b.sent();
                    if (r.success && r.port) {
                        console.log('[Main] Gateway resolved at port', r.port);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 4];
                case 4:
                    // Create the main window
                    applyCustomAppIcon();
                    mainWindow = createWindow();
                    gatewayManager = getGatewayManager();
                    gatewayManager.on('started', function () {
                        console.log('[Main] Gateway started');
                        safeSendToRenderer('gateway:status', getGatewayStatus());
                    });
                    gatewayManager.on('stopped', function (code) {
                        console.log('[Main] Gateway stopped:', code);
                        safeSendToRenderer('gateway:status', getGatewayStatus());
                    });
                    gatewayManager.on('error', function (error) {
                        console.error('[Main] Gateway error:', error);
                        safeSendToRenderer('gateway:error', error.message);
                    });
                    if (!!isGatewayRunning()) return [3 /*break*/, 9];
                    console.log('[Main] Auto-starting Gateway...');
                    _b.label = 5;
                case 5:
                    _b.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, startGateway()];
                case 6:
                    _b.sent();
                    console.log('[Main] Gateway started');
                    safeSendToRenderer('gateway:status', getGatewayStatus());
                    return [3 /*break*/, 8];
                case 7:
                    err_1 = _b.sent();
                    console.error('[Main] Gateway auto-start failed:', err_1);
                    safeSendToRenderer('gateway:status', __assign(__assign({}, getGatewayStatus()), { state: 'error', error: String(err_1) }));
                    safeSendToRenderer('gateway:error', String(err_1));
                    return [3 /*break*/, 8];
                case 8: return [3 /*break*/, 10];
                case 9:
                    console.log('[Main] Gateway already running');
                    safeSendToRenderer('gateway:status', getGatewayStatus());
                    _b.label = 10;
                case 10:
                    // Handle window activation (macOS)
                    app.on('activate', function () {
                        if (BrowserWindow.getAllWindows().length === 0) {
                            mainWindow = createWindow();
                        }
                        else if (mainWindow && !mainWindow.isDestroyed()) {
                            mainWindow.show();
                            mainWindow.focus();
                        }
                    });
                    return [2 /*return*/];
            }
        });
    });
}
// App lifecycle - Ready
app.whenReady().then(function () {
    initialize().catch(function (error) {
        console.error('[Main] Initialization failed:', error);
    });
});
// App lifecycle - All windows closed
app.on('window-all-closed', function () {
    // On macOS, apps usually stay active until Cmd+Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
// App lifecycle - Will quit
app.on('will-quit', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                console.log('[Main] App will quit, stopping Gateway...');
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, stopGateway()];
            case 2:
                _a.sent();
                console.log('[Main] Gateway stopped');
                return [3 /*break*/, 4];
            case 3:
                error_1 = _a.sent();
                console.error('[Main] Error stopping Gateway:', error_1);
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// App lifecycle - Before quit (for cleanup)
app.on('before-quit', function () {
    console.log('[Main] App before quit');
    closeDatabase();
});
// IPC Handlers
ipcMain.handle('get-app-version', function () {
    return app.getVersion();
});
ipcMain.handle('gateway:start', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_2, status_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, startGateway()];
            case 1:
                _a.sent();
                return [2 /*return*/, getGatewayStatus()];
            case 2:
                error_2 = _a.sent();
                status_1 = getGatewayStatus();
                status_1.error = String(error_2);
                return [2 /*return*/, status_1];
            case 3: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('gateway:stop', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_3, status_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, stopGateway()];
            case 1:
                _a.sent();
                return [2 /*return*/, getGatewayStatus()];
            case 2:
                error_3 = _a.sent();
                status_2 = getGatewayStatus();
                status_2.error = String(error_3);
                return [2 /*return*/, status_2];
            case 3: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('gateway:status', function () {
    // AxonClaw 连接已有 OpenClaw Gateway，未自启进程时也返回 running
    var status = getGatewayStatus();
    var port = getResolvedGatewayPort();
    if (status.state === 'stopped' && !status.error) {
        return __assign(__assign({}, status), { state: 'running', port: port });
    }
    return __assign(__assign({}, status), { port: port });
});
ipcMain.handle('gateway:isRunning', function () {
    // AxonClaw 连接外部 Gateway，视为始终运行
    return isGatewayRunning() || true;
});
// 真实连接检测：多端口探测（配置端口 + 18789/18791/18792），成功后缓存端口
ipcMain.handle('gateway:checkConnection', function () { return __awaiter(void 0, void 0, void 0, function () {
    var cfg, result_1, result, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                cfg = getGatewayConnectionSettings();
                if (!(cfg.mode === 'remote')) return [3 /*break*/, 2];
                return [4 /*yield*/, testGatewayWsConnection(cfg.protocol, cfg.host, cfg.port, cfg.token, 5000)];
            case 1:
                result_1 = _a.sent();
                return [2 /*return*/, { success: result_1.success, port: cfg.port, error: result_1.error }];
            case 2: return [4 /*yield*/, resolveGatewayPort()];
            case 3:
                result = _a.sent();
                return [2 /*return*/, { success: result.success, port: result.port, error: result.error }];
            case 4:
                e_1 = _a.sent();
                return [2 /*return*/, { success: false, error: String(e_1) }];
            case 5: return [2 /*return*/];
        }
    });
}); });
// 重启 Gateway（AxonClaw 连接外部时，实际执行 stop + start 子进程）
ipcMain.handle('gateway:restart', function () { return __awaiter(void 0, void 0, void 0, function () {
    var error_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, stopGateway()];
            case 1:
                _a.sent();
                return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
            case 2:
                _a.sent();
                return [4 /*yield*/, startGateway()];
            case 3:
                _a.sent();
                return [2 /*return*/, { success: true }];
            case 4:
                error_4 = _a.sent();
                return [2 /*return*/, { success: false, error: String(error_4) }];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Gateway RPC - 通过 WebSocket 调用 OpenClaw Gateway
// 参数格式: invokeIpc('gateway:rpc', method, params, timeoutMs) => (method, params, timeoutMs)
ipcMain.handle('gateway:rpc', function (_event, methodOrPayload, paramsOrUndef, timeoutMsOrUndef) { return __awaiter(void 0, void 0, void 0, function () {
    var method, params, timeout, payload;
    return __generator(this, function (_a) {
        if (typeof methodOrPayload === 'string') {
            method = methodOrPayload;
            params = (paramsOrUndef && typeof paramsOrUndef === 'object' ? paramsOrUndef : {});
            timeout = typeof timeoutMsOrUndef === 'number' ? timeoutMsOrUndef : 30000;
        }
        else if (methodOrPayload && typeof methodOrPayload === 'object' && 'method' in methodOrPayload) {
            payload = methodOrPayload;
            method = payload.method;
            params = (payload.params && typeof payload.params === 'object' ? payload.params : {});
            timeout = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : 30000;
        }
        else {
            throw new Error('gateway:rpc invalid args');
        }
        console.log("[GatewayRPC] ".concat(method), params);
        return [2 /*return*/, new Promise(function (resolve) {
                var resolved = false;
                var streamingChat = false; // chat.send 流式模式，收到首包后保持连接转发事件
                var WebSocket = require('ws');
                var ws = new WebSocket(getGatewayWsUrl());
                var timeoutId = setTimeout(function () {
                    if (!resolved) {
                        resolved = true;
                        console.error("[GatewayRPC] ".concat(method, " timeout"));
                        ws.close();
                        resolve({ success: false, ok: false, error: 'Timeout' });
                    }
                }, timeout);
                ws.on('open', function () {
                    console.log("[GatewayRPC] ".concat(method, " WebSocket opened"));
                });
                ws.on('message', function (data) {
                    var _a, _b, _c, _d, _f, _g, _h, _j;
                    try {
                        var msg = JSON.parse(data.toString());
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
                                    auth: { token: getGatewayAuthToken() },
                                    role: 'operator',
                                    scopes: ['operator.admin', 'operator.read', 'operator.write'],
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
                                resolve({ success: false, ok: false, error: String((_c = (_b = (_a = msg.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg.error) !== null && _c !== void 0 ? _c : 'Connect failed') });
                                return;
                            }
                            // Log granted scopes for debugging scope errors
                            var grantedScopes = (msg.result && msg.result.scopes) || (msg.payload && msg.payload.scopes);
                            console.log("[GatewayRPC] " + method + " connect ok, grantedScopes=" + JSON.stringify(grantedScopes || 'not-provided'));
                            if (Array.isArray(grantedScopes) && !grantedScopes.includes('operator.write')) {
                                console.warn("[GatewayRPC] " + method + " operator.write NOT in granted scopes:", grantedScopes);
                            }
                            // 发送实际请求
                            ws.send(JSON.stringify({
                                type: 'req',
                                id: "rpc-".concat(Date.now()),
                                method: method,
                                params: params,
                            }));
                            return;
                        }
                        // 处理 RPC 响应
                        if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
                            if (!resolved) {
                                resolved = true;
                                clearTimeout(timeoutId);
                                console.log("[GatewayRPC] ".concat(method, " result:"), msg.ok ? 'success' : 'error');
                                var ok = msg.ok !== false && !msg.error;
                                var result = (_d = msg.result) !== null && _d !== void 0 ? _d : msg.payload;
                                var error = msg.error != null ? String(typeof msg.error === 'object' && msg.error && 'message' in msg.error ? msg.error.message : msg.error) : undefined;
                                resolve({
                                    success: ok,
                                    ok: ok,
                                    result: result,
                                    error: error,
                                });
                                // chat.send 需要保持连接以接收流式事件，不在此处关闭
                                if (method !== 'chat.send') {
                                    ws.close();
                                }
                                else {
                                    streamingChat = true;
                                    // 流式连接保底超时 5 分钟
                                    setTimeout(function () {
                                        try {
                                            if (ws.readyState === 1)
                                                ws.close();
                                        }
                                        catch (_a) {
                                            /* ignore */
                                        }
                                    }, 300000);
                                }
                            }
                        }
                        // chat.send 流式模式: 转发 agent 事件到渲染进程
                        if (streamingChat && msg.type === 'event' && typeof msg.event === 'string') {
                            var payload = ((_g = (_f = msg.payload) !== null && _f !== void 0 ? _f : msg.data) !== null && _g !== void 0 ? _g : msg);
                            var ev = String(msg.event);
                            var phase = payload.phase;
                            var state = (_h = payload.state) !== null && _h !== void 0 ? _h : (ev.endsWith('.delta') ? 'delta' : ev.endsWith('.final') ? 'final' : undefined);
                            safeSendToRenderer('gateway:notification', {
                                method: 'agent',
                                params: __assign(__assign({}, payload), { phase: phase, state: (_j = payload.state) !== null && _j !== void 0 ? _j : state, runId: payload.runId, sessionKey: payload.sessionKey, message: payload.message }),
                            });
                            // 发送到日志页面：Gateway 是否发送 delta
                            var hasMessage = payload.message != null;
                            var messagePreview = '';
                            if (hasMessage && typeof payload.message === 'object') {
                                var m = payload.message;
                                var content = m.content;
                                if (typeof content === 'string') {
                                    messagePreview = content.slice(0, 80) + (content.length > 80 ? '...' : '');
                                }
                                else if (Array.isArray(content)) {
                                    var texts = content.map(function (b) { return b.text; }).filter(Boolean);
                                    messagePreview = texts.join(' ').slice(0, 80) + (texts.join('').length > 80 ? '...' : '');
                                }
                            }
                            safeSendToRenderer('app:gateway-log', {
                                time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
                                level: 'DEBUG',
                                agent: 'Gateway',
                                message: "event=".concat(ev, " phase=").concat(phase !== null && phase !== void 0 ? phase : '?', " state=").concat(state !== null && state !== void 0 ? state : '?', " hasMessage=").concat(hasMessage).concat(messagePreview ? " preview=".concat(JSON.stringify(messagePreview)) : ''),
                            });
                            // 收到完成事件后关闭连接
                            var donePhases = ['completed', 'done', 'finished', 'end'];
                            var isDone = (phase && donePhases.includes(String(phase))) || state === 'final';
                            if (isDone) {
                                ws.close();
                            }
                        }
                    }
                    catch (err) {
                        console.error("[GatewayRPC] ".concat(method, " parse error:"), err);
                    }
                });
                ws.on('error', function (err) {
                    console.error("[GatewayRPC] ".concat(method, " WebSocket error:"), err.message);
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve({ success: false, ok: false, error: err.message });
                    }
                });
                ws.on('close', function (code, reason) {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        console.log("[GatewayRPC] ".concat(method, " WebSocket closed:"), code, reason.toString());
                        resolve({ success: false, ok: false, error: 'Connection closed' });
                    }
                });
            })];
    });
}); });
// chat:sendWithMedia — read local files and pass them inline to gateway chat.send
ipcMain.handle('chat:sendWithMedia', function (_event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var fs, mediaContent, i, m, buf, rpcParams, callGatewayRpc, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                try {
                    fs = require('fs');
                    mediaContent = [];
                    if (payload.media && payload.media.length > 0) {
                        for (i = 0; i < payload.media.length; i++) {
                            m = payload.media[i];
                            try {
                                buf = fs.readFileSync(m.filePath);
                                mediaContent.push({
                                    fileName: m.fileName,
                                    mimeType: m.mimeType,
                                    data: buf.toString('base64'),
                                });
                            } catch (err) {
                                console.error('[chat:sendWithMedia] Failed to read file ' + m.filePath + ':', err);
                            }
                        }
                    }
                    rpcParams = {
                        sessionKey: payload.sessionKey,
                        message: payload.message,
                        deliver: payload.deliver !== undefined ? payload.deliver : false,
                        idempotencyKey: payload.idempotencyKey,
                    };
                    if (mediaContent.length > 0) {
                        rpcParams.media = mediaContent;
                    }
                    callGatewayRpc = require('../gateway/rpc').callGatewayRpc;
                    return [4 /*yield*/, callGatewayRpc('chat.send', rpcParams, 120000)];
                } catch (err) {
                    console.error('[chat:sendWithMedia] Error:', err);
                    return [2 /*return*/, { success: false, ok: false, error: String(err) }];
                }
            case 1:
                result = _a.sent();
                return [2 /*return*/, result];
        }
    });
}); });
// Skills management
var SKILLS_DIR = path.join(os.homedir(), '.openclaw', 'skills');
ipcMain.handle('skills:openFolder', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, shell.openPath(SKILLS_DIR)];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('openclaw:getSkillsDir', function () { return SKILLS_DIR; });
ipcMain.handle('setup:scan-environment', function () { return __awaiter(void 0, void 0, void 0, function () {
    var checkCommand, checkCommandPath, nodeInfo, npmInfo, _a, gitInfo, _b, openclawVersion, _c, clawhubVersion, _d, localProbe, gatewayRunning, gatewayPort, remoteCfg, cloudOptions;
    var _f;
    return __generator(this, function (_g) {
        switch (_g.label) {
            case 0:
                checkCommand = function (cmd) { return __awaiter(void 0, void 0, void 0, function () {
                    var stdout, _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, execAsync(cmd, { timeout: 5000 })];
                            case 1:
                                stdout = (_b.sent()).stdout;
                                return [2 /*return*/, { installed: true, version: stdout.trim() || undefined }];
                            case 2:
                                _a = _b.sent();
                                return [2 /*return*/, { installed: false }];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); };
                checkCommandPath = function (name) { return __awaiter(void 0, void 0, void 0, function () {
                    var stdout, pathValue, _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                _b.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, execAsync("command -v ".concat(name), { timeout: 3000 })];
                            case 1:
                                stdout = (_b.sent()).stdout;
                                pathValue = stdout.trim();
                                return [2 /*return*/, pathValue || undefined];
                            case 2:
                                _a = _b.sent();
                                return [2 /*return*/, undefined];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); };
                nodeInfo = { installed: true, version: process.version, path: process.execPath };
                return [4 /*yield*/, checkCommand('npm --version')];
            case 1:
                npmInfo = _g.sent();
                _a = npmInfo;
                return [4 /*yield*/, checkCommandPath('npm')];
            case 2:
                _a.path = _g.sent();
                return [4 /*yield*/, checkCommand('git --version')];
            case 3:
                gitInfo = _g.sent();
                _b = gitInfo;
                return [4 /*yield*/, checkCommandPath('git')];
            case 4:
                _b.path = _g.sent();
                return [4 /*yield*/, checkCommand('openclaw --version')];
            case 5:
                openclawVersion = _g.sent();
                _c = openclawVersion;
                return [4 /*yield*/, checkCommandPath('openclaw')];
            case 6:
                _c.path = _g.sent();
                return [4 /*yield*/, checkCommand('clawhub --version')];
            case 7:
                clawhubVersion = _g.sent();
                _d = clawhubVersion;
                return [4 /*yield*/, checkCommandPath('clawhub')];
            case 8:
                _d.path = _g.sent();
                return [4 /*yield*/, resolveGatewayPort()];
            case 9:
                localProbe = _g.sent();
                gatewayRunning = !!localProbe.success;
                gatewayPort = (_f = localProbe.port) !== null && _f !== void 0 ? _f : getResolvedGatewayPort();
                remoteCfg = getGatewayConnectionSettings();
                cloudOptions = [
                    {
                        id: 'docker',
                        name: 'Docker / Docker Compose',
                        description: 'Use a container to run OpenClaw service.',
                        docsUrl: 'https://docs.docker.com/get-started/',
                        command: 'docker run -d --name openclaw -p 18789:18789 ghcr.io/openclaw/openclaw:latest',
                    },
                    {
                        id: 'railway',
                        name: 'Railway',
                        description: 'One-click deploy OpenClaw on Railway.',
                        docsUrl: 'https://docs.railway.com/',
                        command: 'railway up',
                    },
                    {
                        id: 'render',
                        name: 'Render',
                        description: 'Deploy as a Render Web Service.',
                        docsUrl: 'https://render.com/docs',
                        command: 'Create a Web Service and expose port 18789',
                    },
                    {
                        id: 'flyio',
                        name: 'Fly.io',
                        description: 'Deploy globally with Fly Machines.',
                        docsUrl: 'https://fly.io/docs/',
                        command: 'fly launch && fly deploy',
                    },
                ];
                return [2 /*return*/, {
                        success: true,
                        data: {
                            os: process.platform,
                            arch: process.arch,
                            local: {
                                node: nodeInfo,
                                npm: npmInfo,
                                git: gitInfo,
                                openclaw: openclawVersion,
                                clawhub: clawhubVersion,
                                openClawInstalled: openclawVersion.installed,
                                openClawVersion: openclawVersion.version,
                                gatewayRunning: gatewayRunning,
                                gatewayPort: gatewayPort,
                            },
                            remote: {
                                mode: remoteCfg.mode,
                                protocol: remoteCfg.protocol,
                                host: remoteCfg.host,
                                port: remoteCfg.port,
                                hasToken: !!remoteCfg.token,
                            },
                            cloudOptions: cloudOptions,
                        },
                    }];
        }
    });
}); });
ipcMain.handle('setup:test-remote-gateway', function (_event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var protocol, host, port, token, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                protocol = (payload === null || payload === void 0 ? void 0 : payload.protocol) === 'wss' ? 'wss' : 'ws';
                host = String((payload === null || payload === void 0 ? void 0 : payload.host) || '').trim();
                port = Number((payload === null || payload === void 0 ? void 0 : payload.port) || 0);
                token = String((payload === null || payload === void 0 ? void 0 : payload.token) || '').trim() || GATEWAY_TOKEN;
                if (!host || !port || !Number.isFinite(port)) {
                    return [2 /*return*/, { success: false, error: 'Invalid remote endpoint' }];
                }
                return [4 /*yield*/, testGatewayWsConnection(protocol, host, port, token)];
            case 1:
                result = _a.sent();
                return [2 /*return*/, { success: result.success, error: result.error }];
        }
    });
}); });
ipcMain.handle('setup:save-remote-gateway', function (_event, payload) { return __awaiter(void 0, void 0, void 0, function () {
    var protocol, host, port, token;
    return __generator(this, function (_a) {
        protocol = (payload === null || payload === void 0 ? void 0 : payload.protocol) === 'wss' ? 'wss' : 'ws';
        host = String((payload === null || payload === void 0 ? void 0 : payload.host) || '').trim();
        port = Number((payload === null || payload === void 0 ? void 0 : payload.port) || 0);
        token = String((payload === null || payload === void 0 ? void 0 : payload.token) || '').trim() || GATEWAY_TOKEN;
        if (!host || !port || !Number.isFinite(port)) {
            return [2 /*return*/, { success: false, error: 'Invalid remote endpoint' }];
        }
        setSetting(GW_MODE_KEY, 'remote');
        setSetting(GW_REMOTE_PROTOCOL_KEY, protocol);
        setSetting(GW_REMOTE_HOST_KEY, host);
        setSetting(GW_REMOTE_PORT_KEY, String(port));
        setSetting(GW_REMOTE_TOKEN_KEY, token);
        return [2 /*return*/, { success: true }];
    });
}); });
ipcMain.handle('setup:connect-local-gateway', function () { return __awaiter(void 0, void 0, void 0, function () {
    var status_3, _a, probe;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                setSetting(GW_MODE_KEY, 'local');
                _b.label = 1;
            case 1:
                _b.trys.push([1, 4, , 5]);
                status_3 = getGatewayStatus();
                if (!(status_3.state !== 'running')) return [3 /*break*/, 3];
                return [4 /*yield*/, startGateway()];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3: return [3 /*break*/, 5];
            case 4:
                _a = _b.sent();
                return [3 /*break*/, 5];
            case 5: return [4 /*yield*/, resolveGatewayPort()];
            case 6:
                probe = _b.sent();
                return [2 /*return*/, {
                        success: !!probe.success,
                        port: probe.port,
                        error: probe.error,
                    }];
        }
    });
}); });
ipcMain.handle('setup:install-local-openclaw', function () { return __awaiter(void 0, void 0, void 0, function () {
    var logs, run, hasOpenClaw, install, probe;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                logs = [];
                run = function (cmd_1) {
                    var args_1 = [];
                    for (var _i = 1; _i < arguments.length; _i++) {
                        args_1[_i - 1] = arguments[_i];
                    }
                    return __awaiter(void 0, __spreadArray([cmd_1], args_1, true), void 0, function (cmd, timeout) {
                        var _a, stdout, stderr, output, err_2, output;
                        if (timeout === void 0) { timeout = 120000; }
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    _b.trys.push([0, 2, , 3]);
                                    return [4 /*yield*/, execAsync(cmd, { timeout: timeout, maxBuffer: 1024 * 1024 * 8 })];
                                case 1:
                                    _a = _b.sent(), stdout = _a.stdout, stderr = _a.stderr;
                                    output = [stdout, stderr].filter(Boolean).join('\n').trim();
                                    if (output)
                                        logs.push("$ ".concat(cmd, "\n").concat(output));
                                    return [2 /*return*/, { ok: true, output: output }];
                                case 2:
                                    err_2 = _b.sent();
                                    output = String((err_2 === null || err_2 === void 0 ? void 0 : err_2.message) || err_2);
                                    logs.push("$ ".concat(cmd, "\n").concat(output));
                                    return [2 /*return*/, { ok: false, output: output }];
                                case 3: return [2 /*return*/];
                            }
                        });
                    });
                };
                return [4 /*yield*/, run('openclaw --version', 10000)];
            case 1:
                hasOpenClaw = _a.sent();
                if (!!hasOpenClaw.ok) return [3 /*break*/, 3];
                return [4 /*yield*/, run('npm install -g @openclaw/core', 20 * 60 * 1000)];
            case 2:
                install = _a.sent();
                if (!install.ok) {
                    return [2 /*return*/, { success: false, error: 'Failed to install OpenClaw via npm.', logs: logs }];
                }
                _a.label = 3;
            case 3: return [4 /*yield*/, run('openclaw gateway start', 120000)];
            case 4:
                _a.sent();
                return [4 /*yield*/, resolveGatewayPort()];
            case 5:
                probe = _a.sent();
                if (!probe.success) {
                    return [2 /*return*/, { success: false, error: probe.error || 'Gateway failed to start', logs: logs }];
                }
                setSetting(GW_MODE_KEY, 'local');
                return [2 /*return*/, { success: true, port: probe.port, logs: logs }];
        }
    });
}); });
// Legacy setup channels compatibility
ipcMain.handle('openclaw:status', function () { return __awaiter(void 0, void 0, void 0, function () {
    var pathStdout, cliPath, version, stdout, _a, _b;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 6, , 7]);
                return [4 /*yield*/, execAsync('command -v openclaw', { timeout: 3000 })];
            case 1:
                pathStdout = (_c.sent()).stdout;
                cliPath = pathStdout.trim();
                version = '';
                _c.label = 2;
            case 2:
                _c.trys.push([2, 4, , 5]);
                return [4 /*yield*/, execAsync('openclaw --version', { timeout: 5000 })];
            case 3:
                stdout = (_c.sent()).stdout;
                version = stdout.trim();
                return [3 /*break*/, 5];
            case 4:
                _a = _c.sent();
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/, {
                    packageExists: !!cliPath,
                    isBuilt: !!cliPath,
                    dir: cliPath,
                    version: version,
                }];
            case 6:
                _b = _c.sent();
                return [2 /*return*/, {
                        packageExists: false,
                        isBuilt: false,
                        dir: '',
                        version: '',
                    }];
            case 7: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('uv:install-all', function () { return __awaiter(void 0, void 0, void 0, function () {
    var _a, err_3;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 7]);
                return [4 /*yield*/, execAsync('uv --version', { timeout: 5000 })];
            case 1:
                _b.sent();
                return [2 /*return*/, { success: true }];
            case 2:
                _a = _b.sent();
                _b.label = 3;
            case 3:
                _b.trys.push([3, 5, , 6]);
                return [4 /*yield*/, execAsync('npm install -g @openclaw/core', { timeout: 20 * 60 * 1000, maxBuffer: 1024 * 1024 * 8 })];
            case 4:
                _b.sent();
                return [2 /*return*/, { success: true }];
            case 5:
                err_3 = _b.sent();
                return [2 /*return*/, { success: false, error: String(err_3) }];
            case 6: return [3 /*break*/, 7];
            case 7: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('skills:listInstalled', function () { return __awaiter(void 0, void 0, void 0, function () {
    var results, err_4;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, listInstalled()];
            case 1:
                results = _a.sent();
                return [2 /*return*/, { success: true, results: results }];
            case 2:
                err_4 = _a.sent();
                console.error('[skills:listInstalled]', err_4);
                return [2 /*return*/, { success: false, results: [] }];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Shell helpers (打开目录、外部链接等)
ipcMain.handle('shell:showItemInFolder', function (_event, dirPath) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(dirPath && typeof dirPath === 'string')) return [3 /*break*/, 2];
                return [4 /*yield*/, shell.showItemInFolder(dirPath)];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('shell:openPath', function (_event, filePath) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        if (filePath && typeof filePath === 'string') {
            return [2 /*return*/, shell.openPath(filePath)];
        }
        return [2 /*return*/, ''];
    });
}); });
ipcMain.handle('clipboard:readImage', function () {
    try {
        var img = clipboard.readImage();
        if (img.isEmpty())
            return null;
        var png = img.toPNG();
        if (!png || png.length === 0)
            return null;
        return { base64: png.toString('base64'), mimeType: 'image/png' };
    }
    catch (_a) {
        return null;
    }
});
ipcMain.handle('shell:openExternal', function (_event, url) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(url && typeof url === 'string')) return [3 /*break*/, 2];
                return [4 /*yield*/, shell.openExternal(url)];
            case 1:
                _a.sent();
                _a.label = 2;
            case 2: return [2 /*return*/];
        }
    });
}); });
ipcMain.handle('codex:open-login', function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        try {
            openCodexAuthWindow();
            return [2 /*return*/, { success: true }];
        }
        catch (err) {
            return [2 /*return*/, { success: false, error: String(err) }];
        }
        return [2 /*return*/];
    });
}); });
// Sessions list - 代理到 OpenClaw Gateway
ipcMain.handle('sessions.list', function (_event_1, _a) { return __awaiter(void 0, [_event_1, _a], void 0, function (_event, _b) {
    var limit = _b.limit, agentId = _b.agentId;
    return __generator(this, function (_c) {
        console.log('[SessionsList] Fetching sessions...');
        return [2 /*return*/, new Promise(function (resolve, reject) {
                var resolved = false;
                var WebSocket = require('ws');
                var ws = new WebSocket(getGatewayWsUrl());
                var timeout = setTimeout(function () {
                    if (!resolved) {
                        resolved = true;
                        console.error('[SessionsList] Timeout');
                        ws.close();
                        resolve({ sessions: [] }); // 超时返回空数组而不是 reject
                    }
                }, 10000);
                ws.on('open', function () {
                    console.log('[SessionsList] WebSocket opened');
                });
                ws.on('message', function (data) {
                    var _a, _b;
                    try {
                        var msg = JSON.parse(data.toString());
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
                                    auth: { token: getGatewayAuthToken() },
                                    role: 'operator',
                                    scopes: ['operator.admin', 'operator.read', 'operator.write'],
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
                                var sessions = ((_a = msg.payload) === null || _a === void 0 ? void 0 : _a.sessions) || ((_b = msg.result) === null || _b === void 0 ? void 0 : _b.sessions) || [];
                                console.log('[SessionsList] Found', sessions.length, 'sessions');
                                resolve({ sessions: sessions });
                            }
                        }
                    }
                    catch (err) {
                        console.error('[SessionsList] Parse error:', err);
                    }
                });
                ws.on('error', function (err) {
                    console.error('[SessionsList] WebSocket error:', err.message);
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve({ sessions: [] });
                    }
                });
                ws.on('close', function (code, reason) {
                    console.log('[SessionsList] WebSocket closed:', code, reason.toString());
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        resolve({ sessions: [] });
                    }
                });
            })];
    });
}); });
// Host API proxy - Gateway REST API（端口从 openclaw.json 或连接探测结果动态解析）
function getGatewayApiBase() {
    var cfg = getGatewayConnectionSettings();
    var httpProtocol = cfg.protocol === 'wss' ? 'https' : 'http';
    return "".concat(httpProtocol, "://").concat(cfg.host, ":").concat(cfg.port);
}
/** AxonClawX 默认 HTTP 端口，WebSocket 失败时可尝试从此处获取 agents */
var AXONCLAWX_HTTP_PORT = 18080;
/** 从 AxonClawX HTTP API (18080) 获取 agents，WebSocket RPC 失败时的回退 */
function fetchAgentsFromAxonClawX() {
    return __awaiter(this, void 0, void 0, function () {
        var bases, _loop_1, _i, bases_1, base, state_1;
        var _a, _b, _c, _d, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
        return __generator(this, function (_v) {
            switch (_v.label) {
                case 0:
                    bases = ["http://127.0.0.1:".concat(AXONCLAWX_HTTP_PORT), "http://127.0.0.1:".concat(getResolvedGatewayPort())];
                    _loop_1 = function (base) {
                        var res, data, raw, list, defaultId_1, configRes, bindings_1, configChannels_1, cfg, configuredChannelTypes, channelOwners_1, _w, _loop_2, _x, _y, apiPath, state_2;
                        return __generator(this, function (_z) {
                            switch (_z.label) {
                                case 0:
                                    _z.trys.push([0, 6, , 7]);
                                    return [4 /*yield*/, fetch("".concat(base, "/api/v1/gw/proxy"), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ method: 'agents.list', params: {} }),
                                            signal: AbortSignal.timeout(5000),
                                        })];
                                case 1:
                                    res = _z.sent();
                                    if (!res.ok)
                                        return [2 /*return*/, "continue"];
                                    return [4 /*yield*/, res.json()];
                                case 2:
                                    data = (_z.sent());
                                    raw = Array.isArray(data) ? data : (data && typeof data === 'object' && 'agents' in data ? data.agents : null);
                                    list = Array.isArray(raw) ? raw : [];
                                    if (list.length === 0)
                                        return [2 /*return*/, "continue"];
                                    defaultId_1 = (_f = (_c = (_a = (data && typeof data === 'object' && 'defaultId' in data ? data.defaultId : null)) !== null && _a !== void 0 ? _a : (_b = list.find(function (a) { return a.default; })) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : (_d = list[0]) === null || _d === void 0 ? void 0 : _d.id) !== null && _f !== void 0 ? _f : 'main';
                                    return [4 /*yield*/, fetch("".concat(base, "/api/v1/gw/proxy"), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ method: 'config.get', params: {} }),
                                            signal: AbortSignal.timeout(5000),
                                        }).catch(function () { return null; })];
                                case 3:
                                    configRes = _z.sent();
                                    bindings_1 = [];
                                    configChannels_1 = {};
                                    if (!(configRes === null || configRes === void 0 ? void 0 : configRes.ok)) return [3 /*break*/, 5];
                                    return [4 /*yield*/, configRes.json()];
                                case 4:
                                    cfg = (_z.sent());
                                    bindings_1 = (_g = cfg.bindings) !== null && _g !== void 0 ? _g : [];
                                    configChannels_1 = (_h = cfg.channels) !== null && _h !== void 0 ? _h : {};
                                    _z.label = 5;
                                case 5:
                                    configuredChannelTypes = Object.keys(configChannels_1).filter(function (k) { return k !== 'defaults' && k !== 'modelByChannel' && typeof configChannels_1[k] === 'object'; });
                                    channelOwners_1 = {};
                                    bindings_1.forEach(function (b) {
                                        var _a;
                                        var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel;
                                        if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                                            channelOwners_1[ch] = b.agentId;
                                    });
                                    return [2 /*return*/, { value: {
                                                agents: list.map(function (a) {
                                                    var _a, _b, _c, _d, _f;
                                                    var agentChannels = bindings_1.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                                                    var model = a.model;
                                                    var modelDisplay = typeof model === 'string'
                                                        ? model
                                                        : typeof model === 'object' && model && 'primary' in model
                                                            ? model.primary
                                                            : '—';
                                                    return {
                                                        id: String((_a = a.id) !== null && _a !== void 0 ? _a : ''),
                                                        name: String((_c = (_b = a.name) !== null && _b !== void 0 ? _b : a.id) !== null && _c !== void 0 ? _c : ''),
                                                        isDefault: a.id === defaultId_1,
                                                        modelDisplay: String(modelDisplay !== null && modelDisplay !== void 0 ? modelDisplay : '—'),
                                                        inheritedModel: !a.model,
                                                        workspace: String((_d = a.workspace) !== null && _d !== void 0 ? _d : '—'),
                                                        agentDir: String((_f = a.agentDir) !== null && _f !== void 0 ? _f : "~/.openclaw/agents/".concat(a.id, "/agent")),
                                                        mainSessionKey: "".concat(a.id, ":main"),
                                                        channelTypes: agentChannels,
                                                    };
                                                }),
                                                defaultAgentId: String(defaultId_1),
                                                configuredChannelTypes: configuredChannelTypes,
                                                channelOwners: channelOwners_1,
                                            } }];
                                case 6:
                                    _w = _z.sent();
                                    return [3 /*break*/, 7];
                                case 7:
                                    _loop_2 = function (apiPath) {
                                        var res, data, agents, defaultId_2, channelOwners, configuredChannelTypes, cfg_1, list, bindings_2, defaultId_3, channelOwners_2, configuredChannelTypes, _0;
                                        return __generator(this, function (_1) {
                                            switch (_1.label) {
                                                case 0:
                                                    _1.trys.push([0, 3, , 4]);
                                                    return [4 /*yield*/, fetch("".concat(base).concat(apiPath), { signal: AbortSignal.timeout(5000) })];
                                                case 1:
                                                    res = _1.sent();
                                                    if (!res.ok)
                                                        return [2 /*return*/, "continue"];
                                                    return [4 /*yield*/, res.json()];
                                                case 2:
                                                    data = (_1.sent());
                                                    if (apiPath === '/api/agents' && Array.isArray(data === null || data === void 0 ? void 0 : data.agents)) {
                                                        agents = data.agents;
                                                        defaultId_2 = (_j = data.defaultAgentId) !== null && _j !== void 0 ? _j : 'main';
                                                        channelOwners = (_k = data.channelOwners) !== null && _k !== void 0 ? _k : {};
                                                        configuredChannelTypes = (_l = data.configuredChannelTypes) !== null && _l !== void 0 ? _l : [];
                                                        return [2 /*return*/, { value: {
                                                                    agents: agents.map(function (a) {
                                                                        var _a, _b, _c, _d, _f, _g, _h;
                                                                        return ({
                                                                            id: String((_a = a.id) !== null && _a !== void 0 ? _a : ''),
                                                                            name: String((_c = (_b = a.name) !== null && _b !== void 0 ? _b : a.id) !== null && _c !== void 0 ? _c : ''),
                                                                            isDefault: a.id === defaultId_2,
                                                                            modelDisplay: String((_d = a.modelDisplay) !== null && _d !== void 0 ? _d : '—'),
                                                                            inheritedModel: a.inheritedModel !== false,
                                                                            workspace: String((_f = a.workspace) !== null && _f !== void 0 ? _f : '—'),
                                                                            agentDir: String((_g = a.agentDir) !== null && _g !== void 0 ? _g : "~/.openclaw/agents/".concat(a.id, "/agent")),
                                                                            mainSessionKey: "".concat(a.id, ":main"),
                                                                            channelTypes: (_h = a.channelTypes) !== null && _h !== void 0 ? _h : [],
                                                                        });
                                                                    }),
                                                                    defaultAgentId: defaultId_2,
                                                                    configuredChannelTypes: configuredChannelTypes,
                                                                    channelOwners: channelOwners,
                                                                } }];
                                                    }
                                                    if (apiPath === '/api/config' && (data === null || data === void 0 ? void 0 : data.agents)) {
                                                        cfg_1 = data;
                                                        list = (_o = (_m = cfg_1.agents) === null || _m === void 0 ? void 0 : _m.list) !== null && _o !== void 0 ? _o : [];
                                                        bindings_2 = (_p = cfg_1.bindings) !== null && _p !== void 0 ? _p : [];
                                                        defaultId_3 = (_t = (_r = (_q = list.find(function (a) { return a.default; })) === null || _q === void 0 ? void 0 : _q.id) !== null && _r !== void 0 ? _r : (_s = list[0]) === null || _s === void 0 ? void 0 : _s.id) !== null && _t !== void 0 ? _t : 'main';
                                                        channelOwners_2 = {};
                                                        configuredChannelTypes = Object.keys((_u = cfg_1 === null || cfg_1 === void 0 ? void 0 : cfg_1.channels) !== null && _u !== void 0 ? _u : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = cfg_1 === null || cfg_1 === void 0 ? void 0 : cfg_1.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                                                        bindings_2.forEach(function (b) {
                                                            var _a;
                                                            var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel;
                                                            if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                                                                channelOwners_2[ch] = b.agentId;
                                                        });
                                                        return [2 /*return*/, { value: {
                                                                    agents: list.map(function (a) {
                                                                        var _a, _b, _c, _d, _f;
                                                                        var agentChannels = bindings_2.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                                                                        return {
                                                                            id: String((_a = a.id) !== null && _a !== void 0 ? _a : ''),
                                                                            name: String((_c = (_b = a.name) !== null && _b !== void 0 ? _b : a.id) !== null && _c !== void 0 ? _c : ''),
                                                                            isDefault: a.id === defaultId_3,
                                                                            modelDisplay: '—',
                                                                            inheritedModel: true,
                                                                            workspace: String((_d = a.workspace) !== null && _d !== void 0 ? _d : '—'),
                                                                            agentDir: String((_f = a.agentDir) !== null && _f !== void 0 ? _f : "~/.openclaw/agents/".concat(a.id, "/agent")),
                                                                            mainSessionKey: "".concat(a.id, ":main"),
                                                                            channelTypes: agentChannels,
                                                                        };
                                                                    }),
                                                                    defaultAgentId: String(defaultId_3),
                                                                    configuredChannelTypes: configuredChannelTypes,
                                                                    channelOwners: channelOwners_2,
                                                                } }];
                                                    }
                                                    return [3 /*break*/, 4];
                                                case 3:
                                                    _0 = _1.sent();
                                                    return [3 /*break*/, 4];
                                                case 4: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _x = 0, _y = ['/api/agents', '/api/config', '/config'];
                                    _z.label = 8;
                                case 8:
                                    if (!(_x < _y.length)) return [3 /*break*/, 11];
                                    apiPath = _y[_x];
                                    return [5 /*yield**/, _loop_2(apiPath)];
                                case 9:
                                    state_2 = _z.sent();
                                    if (typeof state_2 === "object")
                                        return [2 /*return*/, state_2];
                                    _z.label = 10;
                                case 10:
                                    _x++;
                                    return [3 /*break*/, 8];
                                case 11: return [2 /*return*/];
                            }
                        });
                    };
                    _i = 0, bases_1 = bases;
                    _v.label = 1;
                case 1:
                    if (!(_i < bases_1.length)) return [3 /*break*/, 4];
                    base = bases_1[_i];
                    return [5 /*yield**/, _loop_1(base)];
                case 2:
                    state_1 = _v.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _v.label = 3;
                case 3:
                    _i++;
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/, null];
            }
        });
    });
}
function getGatewayWsUrl() {
    var cfg = getGatewayConnectionSettings();
    return "".concat(cfg.protocol, "://").concat(cfg.host, ":").concat(cfg.port, "/ws");
}
function testGatewayWsConnection(protocol_1, host_1, port_1, token_1) {
    return __awaiter(this, arguments, void 0, function (protocol, host, port, token, timeoutMs) {
        if (timeoutMs === void 0) { timeoutMs = 8000; }
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var WebSocket = require('ws');
                    var ws = new WebSocket("".concat(protocol, "://").concat(host, ":").concat(port, "/ws"));
                    var finished = false;
                    var done = function (result) {
                        if (finished)
                            return;
                        finished = true;
                        try {
                            ws.close();
                        }
                        catch (_a) {
                            // ignore
                        }
                        resolve(result);
                    };
                    var timeout = setTimeout(function () { return done({ success: false, error: 'Connection timeout' }); }, timeoutMs);
                    ws.on('message', function (data) {
                        var _a, _b, _c;
                        try {
                            var msg = JSON.parse(data.toString());
                            if (msg.type === 'event' && msg.event === 'connect.challenge') {
                                ws.send(JSON.stringify({
                                    type: 'req',
                                    id: 'setup-connect-' + Date.now(),
                                    method: 'connect',
                                    params: {
                                        minProtocol: 3,
                                        maxProtocol: 3,
                                        client: {
                                            id: 'gateway-client',
                                            displayName: 'AxonClawX Setup',
                                            version: '1.0.0',
                                            platform: process.platform,
                                            mode: 'ui',
                                        },
                                        auth: { token: token },
                                        role: 'operator',
                                        scopes: ['operator.admin', 'operator.read', 'operator.write'],
                                    },
                                }));
                                return;
                            }
                            if (msg.type === 'res' && String(msg.id).startsWith('setup-connect-')) {
                                clearTimeout(timeout);
                                if (msg.ok) {
                                    done({ success: true });
                                }
                                else {
                                    done({ success: false, error: String((_c = (_b = (_a = msg.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg.error) !== null && _c !== void 0 ? _c : 'Authentication failed') });
                                }
                            }
                        }
                        catch (_d) {
                            // ignore parse errors
                        }
                    });
                    ws.on('error', function (err) {
                        clearTimeout(timeout);
                        done({ success: false, error: err.message || 'WebSocket error' });
                    });
                    ws.on('close', function () {
                        clearTimeout(timeout);
                        if (!finished)
                            done({ success: false, error: 'Connection closed' });
                    });
                })];
        });
    });
}
// 保存 path 模块引用，避免在 hostapi:fetch handler 中被同名参数遮蔽
var nodePath = path;
var OPENCLAW_CFG_PATH = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
function parseOpenclawConfigText(raw) {
    try {
        return JSON.parse(raw);
    }
    catch (_a) {
        // 兼容含注释/尾逗号；仅去掉“整行注释”，避免误伤 file:// / https://
        var cleaned = raw
            .replace(/^\s*\/\/.*$/gm, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/,(\s*[}\]])/g, '$1');
        return JSON.parse(cleaned);
    }
}
function readOpenclawConfig() {
    try {
        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
            var raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
            return parseOpenclawConfigText(raw);
        }
    }
    catch (err) {
        console.warn('[HostAPI] read config failed:', err);
    }
    return {};
}
function writeOpenclawConfig(config) {
    var dir = nodePath.dirname(OPENCLAW_CFG_PATH);
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
    try {
        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
            var stamp = new Date().toISOString().replace(/[:]/g, '-');
            var bakPath = "".concat(OPENCLAW_CFG_PATH, ".bak.").concat(stamp);
            fs.copyFileSync(OPENCLAW_CFG_PATH, bakPath);
        }
    }
    catch (err) {
        console.warn('[HostAPI] backup config before write failed:', err);
    }
    fs.writeFileSync(OPENCLAW_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
}
function ensureRecord(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}
function asModelArray(value) {
    if (!Array.isArray(value))
        return [];
    return value
        .map(function (item) {
        if (!item || typeof item !== 'object')
            return null;
        var rec = item;
        var id = typeof rec.id === 'string' ? rec.id.trim() : '';
        if (!id)
            return null;
        var name = typeof rec.name === 'string' && rec.name.trim() ? rec.name.trim() : id;
        return { id: id, name: name };
    })
        .filter(Boolean);
}
function findCodexLikeProviderId(providers) {
    for (var _i = 0, _a = Object.entries(providers); _i < _a.length; _i++) {
        var _b = _a[_i], providerId = _b[0], providerValue = _b[1];
        var provider = ensureRecord(providerValue);
        var idLower = providerId.toLowerCase();
        if (idLower.includes('codex'))
            return providerId;
        var models = asModelArray(provider.models);
        if (models.some(function (m) { return m.id.toLowerCase().includes('codex'); })) {
            return providerId;
        }
    }
    return null;
}
function detectCodexCli() {
    return __awaiter(this, void 0, void 0, function () {
        var pathRaw, codexPath, version, verRaw, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, execAsync('command -v codex || true', { timeout: 3000 })];
                case 1:
                    pathRaw = (_c.sent()).stdout;
                    codexPath = pathRaw.trim();
                    if (!codexPath)
                        return [2 /*return*/, { installed: false }];
                    version = '';
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, execAsync('codex --version', { timeout: 5000 })];
                case 3:
                    verRaw = (_c.sent()).stdout;
                    version = verRaw.trim();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _c.sent();
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/, { installed: true, path: codexPath, version: version }];
                case 6:
                    _b = _c.sent();
                    return [2 /*return*/, { installed: false }];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function extractChatgptAccessToken(raw) {
    var _a;
    var text = (raw || '').trim();
    if (!text)
        return '';
    if (!text.startsWith('{') && !text.startsWith('['))
        return text;
    try {
        var parsed = JSON.parse(text);
        var token = typeof parsed.accessToken === 'string' ? parsed.accessToken.trim() : '';
        if (token)
            return token;
    }
    catch (_b) {
        // ignore
    }
    var m = text.match(/"accessToken"\s*:\s*"([^"]+)"/);
    return ((_a = m === null || m === void 0 ? void 0 : m[1]) === null || _a === void 0 ? void 0 : _a.trim()) || '';
}
function applyCodexQuickConnect(options) {
    var _a, _b, _c, _d, _f, _g;
    var preferredModel = ((options === null || options === void 0 ? void 0 : options.preferredModel) || 'gpt-5.4').trim();
    var fallbackModel = ((options === null || options === void 0 ? void 0 : options.fallbackModel) || 'gpt-5.3-codex').trim();
    var cfg = readOpenclawConfig();
    var models = ensureRecord(cfg.models);
    var providers = ensureRecord(models.providers);
    var providerId = ((_a = options === null || options === void 0 ? void 0 : options.providerId) === null || _a === void 0 ? void 0 : _a.trim()) || findCodexLikeProviderId(providers) || 'custom-codex-plus';
    var createdProvider = false;
    var provider = ensureRecord(providers[providerId]);
    if (!Object.keys(provider).length) {
        createdProvider = true;
        provider = {
            baseUrl: ((_b = options === null || options === void 0 ? void 0 : options.providerBaseUrl) === null || _b === void 0 ? void 0 : _b.trim()) || 'https://api.openai.com/v1',
            api: ((_c = options === null || options === void 0 ? void 0 : options.providerApi) === null || _c === void 0 ? void 0 : _c.trim()) || 'openai-completions',
            models: [],
        };
    }
    if ((_d = options === null || options === void 0 ? void 0 : options.providerBaseUrl) === null || _d === void 0 ? void 0 : _d.trim()) {
        provider.baseUrl = options.providerBaseUrl.trim();
    }
    if ((_f = options === null || options === void 0 ? void 0 : options.providerApi) === null || _f === void 0 ? void 0 : _f.trim()) {
        provider.api = options.providerApi.trim();
    }
    var derivedAccessToken = extractChatgptAccessToken(options === null || options === void 0 ? void 0 : options.accessToken)
        || extractChatgptAccessToken(options === null || options === void 0 ? void 0 : options.sessionPayload);
    var finalApiKey = (((_g = options === null || options === void 0 ? void 0 : options.apiKey) === null || _g === void 0 ? void 0 : _g.trim()) || derivedAccessToken || '').trim();
    if (finalApiKey) {
        provider.apiKey = finalApiKey;
    }
    var existingModels = asModelArray(provider.models);
    var modelSet = new Set(existingModels.map(function (m) { return m.id; }));
    var addedModels = [];
    for (var _i = 0, _h = [preferredModel, fallbackModel]; _i < _h.length; _i++) {
        var mid = _h[_i];
        if (!mid)
            continue;
        if (!modelSet.has(mid)) {
            existingModels.push({ id: mid, name: mid });
            modelSet.add(mid);
            addedModels.push(mid);
        }
    }
    provider.models = existingModels;
    providers[providerId] = provider;
    models.providers = providers;
    if (!models.mode)
        models.mode = 'merge';
    cfg.models = models;
    var agents = ensureRecord(cfg.agents);
    var defaults = ensureRecord(agents.defaults);
    var modelCfg = ensureRecord(defaults.model);
    var prevPrimary = typeof modelCfg.primary === 'string' ? modelCfg.primary : '';
    var nextPrimary = "".concat(providerId, "/").concat(preferredModel);
    var nextFallbackFromProvider = "".concat(providerId, "/").concat(fallbackModel);
    var fallbackList = Array.isArray(modelCfg.fallbacks)
        ? modelCfg.fallbacks.filter(function (x) { return typeof x === 'string' && x.trim().length > 0; })
        : [];
    var nextFallbacks = Array.from(new Set(__spreadArray(__spreadArray([], fallbackList, true), [
        nextFallbackFromProvider,
        prevPrimary,
    ], false).filter(function (x) { return !!x && x !== nextPrimary; })));
    modelCfg.primary = nextPrimary;
    modelCfg.fallbacks = nextFallbacks;
    defaults.model = modelCfg;
    agents.defaults = defaults;
    cfg.agents = agents;
    cfg.meta = __assign(__assign({}, ensureRecord(cfg.meta)), { lastTouchedAt: new Date().toISOString() });
    writeOpenclawConfig(cfg);
    return {
        providerId: providerId,
        primaryModel: nextPrimary,
        fallbackModels: nextFallbacks,
        createdProvider: createdProvider,
        addedModels: addedModels,
    };
}
function pickLatestOpenclawBackupPath(configPath) {
    try {
        var dir_1 = nodePath.dirname(configPath);
        var base_1 = nodePath.basename(configPath);
        if (!fs.existsSync(dir_1))
            return null;
        var candidates = fs
            .readdirSync(dir_1)
            .filter(function (name) { return name.startsWith("".concat(base_1, ".bak.")); })
            .map(function (name) { return nodePath.join(dir_1, name); })
            .filter(function (abs) {
            try {
                return fs.statSync(abs).isFile();
            }
            catch (_a) {
                return false;
            }
        })
            .sort(function (a, b) {
            try {
                return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
            }
            catch (_a) {
                return 0;
            }
        });
        return candidates[0] || null;
    }
    catch (_a) {
        return null;
    }
}
function isNonEmptyObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0;
}
function enrichConfigFromLatestBackup(config, configPath) {
    try {
        var models = config.models || {};
        var providers = models.providers || {};
        var hasProviders = isNonEmptyObject(providers);
        if (hasProviders)
            return config;
        var bakPath = pickLatestOpenclawBackupPath(configPath);
        if (!bakPath)
            return config;
        var bakRaw = fs.readFileSync(bakPath, 'utf8');
        var bakCfg = parseOpenclawConfigText(bakRaw);
        var bakModels = bakCfg.models || {};
        var bakProviders = bakModels.providers || {};
        if (!isNonEmptyObject(bakProviders))
            return config;
        var next = __assign({}, config);
        next.models = __assign(__assign({}, (models || {})), { providers: bakProviders });
        var agents = next.agents || {};
        var defaults = agents.defaults || {};
        var bakAgents = bakCfg.agents || {};
        var bakDefaults = bakAgents.defaults || {};
        if (!isNonEmptyObject(defaults.model) && isNonEmptyObject(bakDefaults.model)) {
            defaults.model = bakDefaults.model;
        }
        if (!isNonEmptyObject(defaults.models) && isNonEmptyObject(bakDefaults.models)) {
            defaults.models = bakDefaults.models;
        }
        if (isNonEmptyObject(defaults)) {
            next.agents = __assign(__assign({}, (agents || {})), { defaults: defaults });
        }
        return next;
    }
    catch (_a) {
        return config;
    }
}
function getUiSettingsFromConfig(config) {
    var _a;
    var ui = ((_a = config.ui) !== null && _a !== void 0 ? _a : {});
    var language = typeof ui.language === 'string' && ui.language.trim() ? ui.language.trim() : 'zh';
    var themeRaw = typeof ui.theme === 'string' ? ui.theme.trim().toLowerCase() : 'system';
    var theme = themeRaw === 'light' || themeRaw === 'dark' || themeRaw === 'system' ? themeRaw : 'system';
    return { language: language, theme: theme };
}
ipcMain.handle('hostapi:fetch', function (_event_1, _a) { return __awaiter(void 0, [_event_1, _a], void 0, function (_event, _b) {
    var cfg, port, wsUrl, cfg, bootstrap, payload, authSession, cookies, cookieHeader, res, text_1, token, err_5, codex, cfg_2, models, providers, codexProviderId, provider, providerModels, defaultPrimary, err_6, payload, result, codex, err_7, status_4, err_8, msg, err_9, err_10, res, ok, uptime, json_1, _c, err_11, tryFetchStatus, result, r, params, limit, res, data, err_12, logDir, files, lines, res, data, _d, res, data, list, _i, _f, _g, channelId, accounts, _h, accounts_1, acc, _j, params, channel, res, data, err_13, cfg, localPort, profiles, params, res, data, err_14, res, data, _k, params, rpcMethod, rpcParams, result, err_15, params, event_1, res, data, err_16, payload, username, password, msg, config, ui, msg, payload, language, config, ui, msg, payload, requested, theme, config, ui, msg, dataDir, logDir, openclawLogDir, logDirResolved, config, raw, gw, bind, customHost, mode, msg, payload, mode, customHost, config, raw, gw, dir, msg, payload, errMsg1, errMsg2, errMsg3, tailMatch, tailLines_1, limitMatch, abnormalLimit_1, res, data, _l, gatewayLogDir, openclawLogDir, dirToUse, readAbnormalFromDir, fromGateway, abnormal, readFromDir, content, url_1, limit, r, raw, sessions, list, totalMsgs, totalUserMsgs, totalAssistantMsgs, totalToolCalls, totalErrors, sessionUsages, _m, list_1, s, rec, key, inp, out, userMsgs, assistantMsgs, toolCalls, errors, knownMsgSum, msgCountRaw, msgCount, aggregates, json_2, err_17, r, entries, err_18, url_2, days, r, raw, totals, daily, totalCost, totalTokens, inputTokens, outputTokens, todayEntry, todayCost, trend, json_3, err_19, url_3, page, pageSize, list, stats, r, gatewayLogDir, openclawLogDir, countLogAbnormal, logFromGw, logFromOc, logCritical, logWarning, high, medium, healthScore, alerts, json_4, fallback, gwRunning_1, stats, critical5m, high5m, medium5m, total1h, total24h, healthCheck_1, ac_1, tid, hr, h, _o, score, status_5, summary, recentList, recentIssues, trend24h, nowMs_1, windowStart_1, issuesInWindow, scoreFromCounts, i, pointTs, low, medium, high, critical, _p, issuesInWindow_1, item, risk, healthScore, json_5, err_20, fallback, gwRunning, stats, critical5m, high5m, medium5m, score, items, json_6, json_7, totalMem, freeMem, usedMem, memPct, loadAvg, numCpu, cpuPct, diskUsage_1, pathsToTry_1, tryDf, tryCheckDiskSpace, mem, other, processMemory, gatewayUptime, connectionsCount, res, json_8, _q, coroutineCount, handles, hostInfo, err_21, results, err_22, query, results, err_23, _r, slug, version, err_24, slug, err_25, _s, skillKey, slug, baseDir, dir, candidates, target, _t, candidates_1, f, p, err_26, _u, skillKey, slug, baseDir, dir, r, err_27, dirPath, resolved, skills, OPENCLAW_CONFIG_PATH, raw, json_9, payload, data, raw, parsed, r, cfg, _v, err_28, payload, cfg, dir, defaultConfig, scan, data, err_29, params, rpcMethod, rpcParams, r, err_30, r, _w, buildSnapshot, agentsListRes, raw, list_2, rawObj, defaultId_4, bindings_3, configChannels, configRes_1, cfg, defaultModel_1, defaultWorkspace, json_10, configRes, configTyped, list, defaultModel, modelStr, defaultId, bindings, json_11, err_31, fallback, payload, res, lastId, full_1, list, bindings_4, defaultId_5, channelOwners_3, configuredChannelTypes, agents, json_12, json_13, err_32, agentsIdMatch, agentId_1, channelType_1, config, bindings, res_1, list, bList_1, defaultId_6, channelOwners_4, configuredChannelTypes, agents, err_33, config, bindings, res_2, list, bList_2, defaultId_7, channelOwners_5, configuredChannelTypes, agents, err_34, payload, config_1, list, bList_3, defaultId_8, channelOwners_6, configuredChannelTypes, agents, err_35, payload, config_2, list, bList_4, defaultId_9, channelOwners_7, configuredChannelTypes, agents, err_36, NODES_FILE, nodes, raw, data, port, localNode, json_14, dir, data, node, id, nodeId, data, applySceneMatch, agentId, payload, sceneId, SCENE_TEMPLATES, template, err_37, configPath, raw, json_15, STAGE_DIR, filePaths, results, _x, filePaths_1, srcPath, fileName, ext, id, stagedPath, stat, mimeMap, mimeType, preview, buf, _y, base64, fileName, mimeType, id, ext, stagedPath, buf, mime, preview, result, jobList, cronEnabled, cfgPath, raw, config, cron, r, _z, cfgPath, raw, config, cron, tasks, enabledJobs, nextWakeup, nextTs, _0, enabledJobs_1, j, t, min, summary, err_38, r, list, jobs, err_39, cfgPath, raw, config, cron, tasks, jobs, payload, r, t, job, err_40, cronJobIdMatch, taskId, payload, updates, r, err_41, taskId, r, err_42, payload, taskId, r, err_43, payload, taskId, r, err_44, url_4, limit, jobId, entries, r, _1, r, jobs, _2, jobs_1, j, t, _3, err_45, bases, lastErr, _4, bases_2, base, response_1, json_16, text_2, contentType_1, _5, e_2, url, response, json, text, contentType, _6, error_5, message;
    var _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101, _102, _103, _104, _105, _106, _107, _108, _109, _110, _111, _112, _113, _114, _115, _116, _117, _118, _119, _120, _121, _122, _123, _124, _125, _126, _127, _128, _129, _130, _131, _132, _133, _134, _135, _136, _137, _138, _139, _140, _141, _142, _143, _144, _145;
    var path = _b.path, method = _b.method, headers = _b.headers, body = _b.body;
    return __generator(this, function (_146) {
        switch (_146.label) {
            case 0:
                _146.trys.push([0, 286, , 287]);
                // 特殊处理：AxonClaw 的 gateway-info API
                if (path === '/api/app/gateway-info') {
                    cfg = getGatewayConnectionSettings();
                    port = cfg.port;
                    wsUrl = "".concat(cfg.protocol, "://").concat(cfg.host, ":").concat(port, "/ws");
                    return [2 /*return*/, {
                            ok: true,
                            data: {
                                status: 200,
                                ok: true,
                                json: { wsUrl: wsUrl, token: cfg.token, port: port, mode: cfg.mode, host: cfg.host },
                            },
                            success: true,
                            status: 200,
                            json: { wsUrl: wsUrl, token: cfg.token, port: port, mode: cfg.mode, host: cfg.host },
                        }];
                }
                // 特殊处理：数据库配置（GET 读取 / POST 保存，修改后需重启生效）
                if (path === '/api/app/db-config' && method === 'GET') {
                    cfg = getDefaultConfig();
                    bootstrap = loadBootstrapConfig();
                    return [2 /*return*/, {
                            ok: true,
                            data: {
                                status: 200,
                                ok: true,
                                json: {
                                    dbPath: (_8 = (_7 = cfg.sqlitePath) !== null && _7 !== void 0 ? _7 : bootstrap.dbPath) !== null && _8 !== void 0 ? _8 : '',
                                    configFile: getConfigFilePath(),
                                },
                            },
                            success: true,
                            status: 200,
                            json: {
                                dbPath: (_10 = (_9 = cfg.sqlitePath) !== null && _9 !== void 0 ? _9 : bootstrap.dbPath) !== null && _10 !== void 0 ? _10 : '',
                                configFile: getConfigFilePath(),
                            },
                        }];
                }
                if (path === '/api/app/db-config' && method === 'POST' && body) {
                    payload = void 0;
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                    }
                    catch (_147) {
                        return [2 /*return*/, {
                                ok: false,
                                data: { status: 400, json: { error: 'Invalid JSON' }, ok: false },
                                success: false,
                                status: 400,
                                json: { error: 'Invalid JSON' },
                            }];
                    }
                    saveBootstrapConfig({ dbPath: payload.dbPath });
                    return [2 /*return*/, {
                            ok: true,
                            data: { status: 200, ok: true, json: { success: true } },
                            success: true,
                            status: 200,
                            json: { success: true },
                        }];
                }
                if (path === '/api/app/codex/open-login' && method === 'POST') {
                    try {
                        openCodexAuthWindow();
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, ok: true, json: { success: true } },
                                success: true,
                                status: 200,
                                json: { success: true },
                            }];
                    }
                    catch (err) {
                        return [2 /*return*/, {
                                ok: false,
                                data: { status: 500, ok: false, json: { success: false, error: String(err) } },
                                success: false,
                                status: 500,
                                json: { success: false, error: String(err) },
                            }];
                    }
                }
                if (!(path === '/api/app/codex/session-token' && method === 'GET')) return [3 /*break*/, 6];
                _146.label = 1;
            case 1:
                _146.trys.push([1, 5, , 6]);
                authSession = session.fromPartition(CODEX_AUTH_PARTITION);
                return [4 /*yield*/, authSession.cookies.get({ domain: 'chatgpt.com' })];
            case 2:
                cookies = _146.sent();
                cookieHeader = cookies
                    .map(function (c) { return "".concat(c.name, "=").concat(c.value); })
                    .join('; ')
                    .trim();
                if (!cookieHeader) {
                    return [2 /*return*/, {
                            ok: true,
                            data: {
                                status: 200,
                                ok: true,
                                json: {
                                    success: false,
                                    accessToken: null,
                                    sessionPayload: null,
                                    status: 401,
                                    error: 'No chatgpt.com cookies in Electron session. Please login in app-embedded ChatGPT session first.',
                                },
                            },
                            success: true,
                            status: 200,
                            json: {
                                success: false,
                                accessToken: null,
                                sessionPayload: null,
                                status: 401,
                                error: 'No chatgpt.com cookies in Electron session. Please login in app-embedded ChatGPT session first.',
                            },
                        }];
                }
                return [4 /*yield*/, fetch('https://chatgpt.com/api/auth/session', {
                        method: 'GET',
                        headers: {
                            accept: 'application/json',
                            cookie: cookieHeader,
                        },
                    })];
            case 3:
                res = _146.sent();
                return [4 /*yield*/, res.text()];
            case 4:
                text_1 = _146.sent();
                token = extractChatgptAccessToken(text_1);
                return [2 /*return*/, {
                        ok: true,
                        data: {
                            status: 200,
                            ok: true,
                            json: {
                                success: !!token,
                                accessToken: token || null,
                                sessionPayload: text_1 || null,
                                status: res.status,
                            },
                        },
                        success: true,
                        status: 200,
                        json: {
                            success: !!token,
                            accessToken: token || null,
                            sessionPayload: text_1 || null,
                            status: res.status,
                        },
                    }];
            case 5:
                err_5 = _146.sent();
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, ok: false, json: { success: false, error: String(err_5) } },
                        success: false,
                        status: 500,
                        json: { success: false, error: String(err_5) },
                    }];
            case 6:
                if (!(path === '/api/app/codex/status' && method === 'GET')) return [3 /*break*/, 10];
                _146.label = 7;
            case 7:
                _146.trys.push([7, 9, , 10]);
                return [4 /*yield*/, detectCodexCli()];
            case 8:
                codex = _146.sent();
                cfg_2 = readOpenclawConfig();
                models = ensureRecord(cfg_2.models);
                providers = ensureRecord(models.providers);
                codexProviderId = findCodexLikeProviderId(providers);
                provider = codexProviderId ? ensureRecord(providers[codexProviderId]) : {};
                providerModels = asModelArray(provider.models).map(function (m) { return m.id; });
                defaultPrimary = (function () {
                    var agents = ensureRecord(cfg_2.agents);
                    var defaults = ensureRecord(agents.defaults);
                    var modelCfg = ensureRecord(defaults.model);
                    return typeof modelCfg.primary === 'string' ? modelCfg.primary : '';
                })();
                return [2 /*return*/, {
                        ok: true,
                        data: {
                            status: 200,
                            ok: true,
                            json: {
                                installed: codex.installed,
                                path: codex.path,
                                version: codex.version,
                                configured: !!codexProviderId,
                                providerId: codexProviderId || null,
                                providerModels: providerModels,
                                defaultPrimary: defaultPrimary,
                            },
                        },
                        success: true,
                        status: 200,
                        json: {
                            installed: codex.installed,
                            path: codex.path,
                            version: codex.version,
                            configured: !!codexProviderId,
                            providerId: codexProviderId || null,
                            providerModels: providerModels,
                            defaultPrimary: defaultPrimary,
                        },
                    }];
            case 9:
                err_6 = _146.sent();
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, ok: false, json: { error: String(err_6) } },
                        success: false,
                        status: 500,
                        json: { error: String(err_6) },
                    }];
            case 10:
                if (!(path === '/api/app/codex/quick-connect' && method === 'POST')) return [3 /*break*/, 14];
                _146.label = 11;
            case 11:
                _146.trys.push([11, 13, , 14]);
                payload = body
                    ? (typeof body === 'string' ? JSON.parse(body) : body)
                    : {};
                result = applyCodexQuickConnect(payload);
                return [4 /*yield*/, detectCodexCli()];
            case 12:
                codex = _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: {
                            status: 200,
                            ok: true,
                            json: __assign({ success: true, codexInstalled: codex.installed, codexPath: codex.path, codexVersion: codex.version }, result),
                        },
                        success: true,
                        status: 200,
                        json: __assign({ success: true, codexInstalled: codex.installed, codexPath: codex.path, codexVersion: codex.version }, result),
                    }];
            case 13:
                err_7 = _146.sent();
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, ok: false, json: { success: false, error: String(err_7) } },
                        success: false,
                        status: 500,
                        json: { success: false, error: String(err_7) },
                    }];
            case 14:
                if (!(path === '/api/gateway/start' && method === 'POST')) return [3 /*break*/, 18];
                _146.label = 15;
            case 15:
                _146.trys.push([15, 17, , 18]);
                return [4 /*yield*/, startGateway()];
            case 16:
                _146.sent();
                status_4 = getGatewayStatus();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 17:
                err_8 = _146.sent();
                msg = String(err_8);
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: false, error: msg }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: false, error: msg },
                    }];
            case 18:
                if (!(path === '/api/gateway/stop' && method === 'POST')) return [3 /*break*/, 22];
                _146.label = 19;
            case 19:
                _146.trys.push([19, 21, , 22]);
                return [4 /*yield*/, stopGateway()];
            case 20:
                _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 21:
                err_9 = _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: false, error: String(err_9) }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: false, error: String(err_9) },
                    }];
            case 22:
                if (!(path === '/api/gateway/restart' && method === 'POST')) return [3 /*break*/, 28];
                _146.label = 23;
            case 23:
                _146.trys.push([23, 27, , 28]);
                return [4 /*yield*/, stopGateway()];
            case 24:
                _146.sent();
                return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 500); })];
            case 25:
                _146.sent();
                return [4 /*yield*/, startGateway()];
            case 26:
                _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 27:
                err_10 = _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: false, error: String(err_10) }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: false, error: String(err_10) },
                    }];
            case 28:
                if (!(path === '/api/gateway/health' || path.startsWith('/api/gateway/health'))) return [3 /*break*/, 36];
                _146.label = 29;
            case 29:
                _146.trys.push([29, 35, , 36]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/health"))];
            case 30:
                res = _146.sent();
                ok = res.ok;
                uptime = void 0;
                _146.label = 31;
            case 31:
                _146.trys.push([31, 33, , 34]);
                return [4 /*yield*/, res.json()];
            case 32:
                json_1 = _146.sent();
                uptime = json_1.uptime;
                return [3 /*break*/, 34];
            case 33:
                _c = _146.sent();
                return [3 /*break*/, 34];
            case 34: return [2 /*return*/, {
                    ok: true,
                    data: { status: 200, json: { ok: ok, uptime: uptime }, ok: true },
                    success: true,
                    status: 200,
                    json: { ok: ok, uptime: uptime },
                }];
            case 35:
                err_11 = _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { ok: false, error: String(err_11) }, ok: true },
                        success: true,
                        status: 200,
                        json: { ok: false, error: String(err_11) },
                    }];
            case 36:
                if (!(path === '/api/gateway/status')) return [3 /*break*/, 41];
                tryFetchStatus = function () { return __awaiter(void 0, void 0, void 0, function () {
                    var base, _i, _a, endpoint, res, data, running, _b;
                    var _c, _d;
                    return __generator(this, function (_f) {
                        switch (_f.label) {
                            case 0:
                                base = getGatewayApiBase();
                                _i = 0, _a = ['/status', '/health'];
                                _f.label = 1;
                            case 1:
                                if (!(_i < _a.length)) return [3 /*break*/, 8];
                                endpoint = _a[_i];
                                _f.label = 2;
                            case 2:
                                _f.trys.push([2, 6, , 7]);
                                return [4 /*yield*/, fetch("".concat(base).concat(endpoint), { signal: AbortSignal.timeout(5000) })];
                            case 3:
                                res = _f.sent();
                                if (!res.ok) return [3 /*break*/, 5];
                                return [4 /*yield*/, res.json()];
                            case 4:
                                data = _f.sent();
                                running = (_d = (_c = data === null || data === void 0 ? void 0 : data.running) !== null && _c !== void 0 ? _c : data === null || data === void 0 ? void 0 : data.ok) !== null && _d !== void 0 ? _d : true;
                                return [2 /*return*/, { ok: true, json: __assign(__assign({}, data), { running: running }) }];
                            case 5: return [3 /*break*/, 7];
                            case 6:
                                _b = _f.sent();
                                return [3 /*break*/, 7];
                            case 7:
                                _i++;
                                return [3 /*break*/, 1];
                            case 8: return [2 /*return*/, { ok: false, json: { running: false } }];
                        }
                    });
                }); };
                return [4 /*yield*/, tryFetchStatus()];
            case 37:
                result = _146.sent();
                if (!!result.ok) return [3 /*break*/, 40];
                return [4 /*yield*/, resolveGatewayPort()];
            case 38:
                r = _146.sent();
                if (!(r.success && r.port)) return [3 /*break*/, 40];
                setResolvedGatewayPort(r.port);
                return [4 /*yield*/, tryFetchStatus()];
            case 39:
                result = _146.sent();
                if (!result.ok) {
                    // resolveGatewayPort 成功说明 WebSocket 已连通，Gateway 在运行
                    result = { ok: true, json: { running: true, runtime: 'Electron', detail: "\u7AEF\u53E3 ".concat(r.port) } };
                }
                _146.label = 40;
            case 40: return [2 /*return*/, { ok: true, data: { status: 200, json: result.json, ok: true }, success: true, status: 200, json: result.json }];
            case 41:
                if (!(path === '/api/gateway/logs' && method === 'POST')) return [3 /*break*/, 48];
                params = body ? (typeof body === 'string' ? JSON.parse(body) : body) : {};
                limit = params.limit || 200;
                _146.label = 42;
            case 42:
                _146.trys.push([42, 46, , 47]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/logs?tailLines=").concat(limit))];
            case 43:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 45];
                return [4 /*yield*/, res.json()];
            case 44:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 45: return [3 /*break*/, 47];
            case 46:
                err_12 = _146.sent();
                logDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
                if (fs.existsSync(logDir)) {
                    files = fs.readdirSync(logDir)
                        .filter(function (f) { return f.endsWith('.log'); })
                        .sort()
                        .reverse();
                    if (files.length > 0) {
                        lines = fs.readFileSync(nodePath.join(logDir, files[0]), 'utf8').split('\n').slice(-limit);
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { lines: lines }, ok: true }, success: true, status: 200, json: { lines: lines } }];
                    }
                }
                return [3 /*break*/, 47];
            case 47: return [2 /*return*/, { ok: true, data: { status: 200, json: { lines: [] }, ok: true }, success: true, status: 200, json: { lines: [] } }];
            case 48:
                if (!(path === '/api/gateway/events' && method === 'POST')) return [3 /*break*/, 55];
                _146.label = 49;
            case 49:
                _146.trys.push([49, 53, , 54]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/events"), { method: 'POST', headers: headers, body: body })];
            case 50:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 52];
                return [4 /*yield*/, res.json()];
            case 51:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 52: return [3 /*break*/, 54];
            case 53:
                _d = _146.sent();
                return [3 /*break*/, 54];
            case 54: return [2 /*return*/, { ok: true, data: { status: 200, json: { list: [], total: 0 }, ok: true }, success: true, status: 200, json: { list: [], total: 0 } }];
            case 55:
                if (!(path === '/api/gateway/channels')) return [3 /*break*/, 62];
                _146.label = 56;
            case 56:
                _146.trys.push([56, 60, , 61]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/channels/status"))];
            case 57:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 59];
                return [4 /*yield*/, res.json()];
            case 58:
                data = _146.sent();
                list = [];
                if (Array.isArray(data)) {
                    list = data;
                }
                else if ((data === null || data === void 0 ? void 0 : data.channelAccounts) && typeof data.channelAccounts === 'object') {
                    for (_i = 0, _f = Object.entries(data.channelAccounts); _i < _f.length; _i++) {
                        _g = _f[_i], channelId = _g[0], accounts = _g[1];
                        if (Array.isArray(accounts)) {
                            for (_h = 0, accounts_1 = accounts; _h < accounts_1.length; _h++) {
                                acc = accounts_1[_h];
                                list.push(__assign(__assign({}, acc), { name: acc.name || acc.label || channelId, channel: channelId }));
                            }
                        }
                    }
                }
                return [2 /*return*/, { ok: true, data: { status: 200, json: list, ok: true }, success: true, status: 200, json: list }];
            case 59: return [3 /*break*/, 61];
            case 60:
                _j = _146.sent();
                return [3 /*break*/, 61];
            case 61: return [2 /*return*/, { ok: true, data: { status: 200, json: [], ok: true }, success: true, status: 200, json: [] }];
            case 62:
                if (!(path === '/api/gateway/channels/logout' && method === 'POST')) return [3 /*break*/, 69];
                _146.label = 63;
            case 63:
                _146.trys.push([63, 67, , 68]);
                params = body ? JSON.parse(body) : {};
                channel = params.channel;
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/channels/logout"), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ channel: channel }),
                    })];
            case 64:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 66];
                return [4 /*yield*/, res.json()];
            case 65:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 66: return [3 /*break*/, 68];
            case 67:
                err_13 = _146.sent();
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_13) }, ok: false }, success: false, status: 500, json: { error: String(err_13) } }];
            case 68: return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 69:
                // 特殊处理：/api/gateway/profiles 获取网关配置列表
                if (path === '/api/gateway/profiles') {
                    cfg = getGatewayConnectionSettings();
                    localPort = getResolvedGatewayPort();
                    profiles = [
                        {
                            id: 1,
                            name: 'Local Gateway',
                            host: '127.0.0.1',
                            port: localPort,
                            token: '',
                            is_active: cfg.mode === 'local',
                        },
                    ];
                    if (cfg.mode === 'remote' && cfg.host) {
                        profiles.push({
                            id: 2,
                            name: "Remote Gateway (".concat(cfg.host, ":").concat(cfg.port, ")"),
                            host: cfg.host,
                            port: cfg.port,
                            token: cfg.token || '',
                            is_active: true,
                        });
                    }
                    return [2 /*return*/, { ok: true, data: { status: 200, json: profiles, ok: true }, success: true, status: 200, json: profiles }];
                }
                if (!(path === '/api/gateway/health-check')) return [3 /*break*/, 81];
                if (!(method === 'POST')) return [3 /*break*/, 75];
                _146.label = 70;
            case 70:
                _146.trys.push([70, 74, , 75]);
                params = body ? JSON.parse(body) : {};
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/health-check"), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(params),
                    })];
            case 71:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 73];
                return [4 /*yield*/, res.json()];
            case 72:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 73: return [3 /*break*/, 75];
            case 74:
                err_14 = _146.sent();
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_14) }, ok: false }, success: false, status: 500, json: { error: String(err_14) } }];
            case 75:
                _146.trys.push([75, 79, , 80]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/health-check"))];
            case 76:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 78];
                return [4 /*yield*/, res.json()];
            case 77:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 78: return [3 /*break*/, 80];
            case 79:
                _k = _146.sent();
                return [3 /*break*/, 80];
            case 80: return [2 /*return*/, { ok: true, data: { status: 200, json: { enabled: false, fail_count: 0, last_ok: '' }, ok: true }, success: true, status: 200, json: { enabled: false, fail_count: 0, last_ok: '' } }];
            case 81:
                if (!(path === '/api/gateway/rpc' && method === 'POST')) return [3 /*break*/, 85];
                _146.label = 82;
            case 82:
                _146.trys.push([82, 84, , 85]);
                params = body ? JSON.parse(body) : {};
                rpcMethod = params.method;
                rpcParams = params.params || {};
                return [4 /*yield*/, callGatewayRpc(rpcMethod, rpcParams)];
            case 83:
                result = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: result, ok: true }, success: true, status: 200, json: result }];
            case 84:
                err_15 = _146.sent();
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_15) }, ok: false }, success: false, status: 500, json: { error: String(err_15) } }];
            case 85:
                if (!(path === '/api/gateway/system-event' && method === 'POST')) return [3 /*break*/, 92];
                _146.label = 86;
            case 86:
                _146.trys.push([86, 90, , 91]);
                params = body ? JSON.parse(body) : {};
                event_1 = params.event;
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/system-event"), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ event: event_1 }),
                    })];
            case 87:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 89];
                return [4 /*yield*/, res.json()];
            case 88:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 89: return [3 /*break*/, 91];
            case 90:
                err_16 = _146.sent();
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_16) }, ok: false }, success: false, status: 500, json: { error: String(err_16) } }];
            case 91: return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 92:
                // 特殊处理：锁屏认证
                if (path === '/api/auth/lock/status' && method === 'GET') {
                    return [2 /*return*/, {
                            ok: true,
                            data: { status: 200, json: { locked: appLocked }, ok: true },
                            success: true,
                            status: 200,
                            json: { locked: appLocked },
                        }];
                }
                if (path === '/api/auth/lock' && method === 'POST') {
                    appLocked = true;
                    return [2 /*return*/, {
                            ok: true,
                            data: { status: 200, json: { success: true, locked: true }, ok: true },
                            success: true,
                            status: 200,
                            json: { success: true, locked: true },
                        }];
                }
                if (path === '/api/auth/unlock' && method === 'POST' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        username = String((_11 = payload === null || payload === void 0 ? void 0 : payload.username) !== null && _11 !== void 0 ? _11 : '').trim();
                        password = String((_12 = payload === null || payload === void 0 ? void 0 : payload.password) !== null && _12 !== void 0 ? _12 : '');
                        if (!username || !password) {
                            return [2 /*return*/, {
                                    ok: false,
                                    error: 'Missing username or password',
                                    data: { status: 400, json: { error: 'Missing username or password' }, ok: false },
                                    success: false,
                                    status: 400,
                                    json: { error: 'Missing username or password' },
                                }];
                        }
                        if (!verifyLockCredentials(username, password)) {
                            return [2 /*return*/, {
                                    ok: false,
                                    error: 'Invalid username or password',
                                    data: { status: 401, json: { error: 'Invalid username or password' }, ok: false },
                                    success: false,
                                    status: 401,
                                    json: { error: 'Invalid username or password' },
                                }];
                        }
                        appLocked = false;
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: { success: true, locked: false }, ok: true },
                                success: true,
                                status: 200,
                                json: { success: true, locked: false },
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                // 特殊处理：/api/settings（通用设置：语言 + 风格）
                if (path === '/api/settings' && method === 'GET') {
                    try {
                        config = readOpenclawConfig();
                        ui = getUiSettingsFromConfig(config);
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: ui, ok: true },
                                success: true,
                                status: 200,
                                json: ui,
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                if (path === '/api/settings/language' && method === 'PUT' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        language = String((_13 = payload === null || payload === void 0 ? void 0 : payload.value) !== null && _13 !== void 0 ? _13 : '').trim() || 'zh';
                        config = readOpenclawConfig();
                        ui = ((_14 = config.ui) !== null && _14 !== void 0 ? _14 : {});
                        ui.language = language;
                        config.ui = ui;
                        writeOpenclawConfig(config);
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: { success: true, value: language }, ok: true },
                                success: true,
                                status: 200,
                                json: { success: true, value: language },
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                if (path === '/api/settings/theme' && method === 'PUT' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        requested = String((_15 = payload === null || payload === void 0 ? void 0 : payload.value) !== null && _15 !== void 0 ? _15 : '').trim().toLowerCase();
                        theme = requested === 'light' || requested === 'dark' || requested === 'system'
                            ? requested
                            : 'system';
                        config = readOpenclawConfig();
                        ui = ((_16 = config.ui) !== null && _16 !== void 0 ? _16 : {});
                        ui.theme = theme;
                        config.ui = ui;
                        writeOpenclawConfig(config);
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: { success: true, value: theme }, ok: true },
                                success: true,
                                status: 200,
                                json: { success: true, value: theme },
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                // 特殊处理：/api/settings/storage 存储与日志路径（AxonClawX 系统设置）
                if (path === '/api/settings/storage' && method === 'GET') {
                    dataDir = nodePath.join(os.homedir(), '.openclaw');
                    logDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
                    openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
                    logDirResolved = fs.existsSync(openclawLogDir) ? openclawLogDir : logDir;
                    return [2 /*return*/, {
                            ok: true,
                            data: { status: 200, json: { dataDir: dataDir, logDir: logDirResolved }, ok: true },
                            success: true,
                            status: 200,
                            json: { dataDir: dataDir, logDir: logDirResolved },
                        }];
                }
                // 特殊处理：/api/settings/bind-address 绑定地址（AxonClawX 访问安全）
                if (path === '/api/settings/bind-address' && method === 'GET') {
                    try {
                        config = {};
                        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
                            raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
                            config = parseOpenclawConfigText(raw);
                        }
                        gw = ((_17 = config === null || config === void 0 ? void 0 : config.gateway) !== null && _17 !== void 0 ? _17 : {});
                        bind = String((_18 = gw.bind) !== null && _18 !== void 0 ? _18 : 'loopback');
                        customHost = String((_19 = gw.customBindHost) !== null && _19 !== void 0 ? _19 : '').trim();
                        mode = '127.0.0.1';
                        if (bind === 'lan' || bind === 'auto') {
                            mode = '0.0.0.0';
                        }
                        else if (bind === 'loopback') {
                            mode = '127.0.0.1';
                        }
                        else if (bind === 'custom') {
                            mode = 'custom';
                        }
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: { mode: mode, customHost: mode === 'custom' ? customHost : undefined }, ok: true },
                                success: true,
                                status: 200,
                                json: { mode: mode, customHost: mode === 'custom' ? customHost : undefined },
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        console.error('[HostAPI] bind-address get error:', err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                if (path === '/api/settings/bind-address' && method === 'PUT' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        mode = (_20 = payload === null || payload === void 0 ? void 0 : payload.mode) !== null && _20 !== void 0 ? _20 : '127.0.0.1';
                        customHost = String((_21 = payload === null || payload === void 0 ? void 0 : payload.customHost) !== null && _21 !== void 0 ? _21 : '').trim();
                        config = {};
                        if (fs.existsSync(OPENCLAW_CFG_PATH)) {
                            raw = fs.readFileSync(OPENCLAW_CFG_PATH, 'utf8');
                            config = parseOpenclawConfigText(raw);
                        }
                        gw = ((_22 = config.gateway) !== null && _22 !== void 0 ? _22 : {});
                        if (mode === '0.0.0.0') {
                            gw.bind = 'lan';
                            delete gw.customBindHost;
                        }
                        else if (mode === '127.0.0.1') {
                            gw.bind = 'loopback';
                            delete gw.customBindHost;
                        }
                        else {
                            gw.bind = 'custom';
                            gw.customBindHost = customHost || '0.0.0.0';
                        }
                        config.gateway = __assign({}, gw);
                        dir = nodePath.dirname(OPENCLAW_CFG_PATH);
                        if (!fs.existsSync(dir))
                            fs.mkdirSync(dir, { recursive: true });
                        fs.writeFileSync(OPENCLAW_CFG_PATH, JSON.stringify(config, null, 2), 'utf8');
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: { success: true }, ok: true },
                                success: true,
                                status: 200,
                                json: { success: true },
                            }];
                    }
                    catch (err) {
                        msg = String(err);
                        console.error('[HostAPI] bind-address put error:', err);
                        return [2 /*return*/, {
                                ok: false,
                                error: msg,
                                data: { status: 500, json: { error: msg }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: msg },
                            }];
                    }
                }
                // 特殊处理：/api/settings/password 修改密码（AxonClawX 风格，AxonClaw 桌面端为 stub）
                if (path === '/api/settings/password' && method === 'POST' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        errMsg1 = '请填写当前密码、新密码和确认密码';
                        if (!(payload === null || payload === void 0 ? void 0 : payload.current) || !(payload === null || payload === void 0 ? void 0 : payload.new) || !(payload === null || payload === void 0 ? void 0 : payload.confirm)) {
                            return [2 /*return*/, {
                                    ok: false,
                                    error: errMsg1,
                                    data: { status: 400, json: { error: errMsg1 }, ok: false },
                                    success: false,
                                    status: 400,
                                    json: { error: errMsg1 },
                                }];
                        }
                        errMsg2 = '两次输入的新密码不一致';
                        if (payload.new !== payload.confirm) {
                            return [2 /*return*/, {
                                    ok: false,
                                    error: errMsg2,
                                    data: { status: 400, json: { error: errMsg2 }, ok: false },
                                    success: false,
                                    status: 400,
                                    json: { error: errMsg2 },
                                }];
                        }
                        errMsg3 = 'AxonClaw 为桌面客户端，修改 AxonClawX Web 控制台账户密码请前往对应 Web 界面';
                        return [2 /*return*/, {
                                ok: false,
                                error: errMsg3,
                                data: { status: 501, json: { error: errMsg3 }, ok: false },
                                success: false,
                                status: 501,
                                json: { error: errMsg3 },
                            }];
                    }
                    catch (err) {
                        console.error('[HostAPI] password post error:', err);
                        return [2 /*return*/, {
                                ok: false,
                                data: { status: 500, json: { error: String(err) }, ok: false },
                                success: false,
                                status: 500,
                                json: { error: String(err) },
                            }];
                    }
                }
                if (!path.startsWith('/api/logs')) return [3 /*break*/, 99];
                tailMatch = path.match(/tailLines=(\d+)/);
                tailLines_1 = tailMatch ? parseInt(tailMatch[1], 10) : 200;
                limitMatch = path.match(/limit=(\d+)/);
                abnormalLimit_1 = limitMatch ? parseInt(limitMatch[1], 10) : 10;
                _146.label = 93;
            case 93:
                _146.trys.push([93, 97, , 98]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase()).concat(path))];
            case 94:
                res = _146.sent();
                if (!res.ok) return [3 /*break*/, 96];
                return [4 /*yield*/, res.json()];
            case 95:
                data = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 96: return [3 /*break*/, 98];
            case 97:
                _l = _146.sent();
                return [3 /*break*/, 98];
            case 98:
                gatewayLogDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
                openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
                dirToUse = fs.existsSync(gatewayLogDir) ? gatewayLogDir : (fs.existsSync(openclawLogDir) ? openclawLogDir : gatewayLogDir);
                if (path === '/api/logs/dir' || path.startsWith('/api/logs/dir')) {
                    return [2 /*return*/, { ok: true, data: { status: 200, json: { dir: dirToUse }, ok: true }, success: true, status: 200, json: { dir: dirToUse } }];
                }
                // /api/logs/abnormal：从日志解析异常事件（AxonClawX 风格：ERROR/WARN/exception/failed）
                if (path.startsWith('/api/logs/abnormal')) {
                    readAbnormalFromDir = function (dir) {
                        if (!fs.existsSync(dir))
                            return [];
                        var results = [];
                        var files = fs.readdirSync(dir)
                            .filter(function (f) { return f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/); })
                            .sort()
                            .reverse();
                        for (var _i = 0, _a = files.slice(0, 5); _i < _a.length; _i++) {
                            var f = _a[_i];
                            try {
                                var full = nodePath.join(dir, f);
                                var buf = fs.readFileSync(full, 'utf8');
                                var lines = buf.split(/\r?\n/);
                                for (var i = lines.length - 1; i >= 0 && results.length < abnormalLimit_1; i--) {
                                    var line = lines[i].trim();
                                    if (!line || line.length < 10)
                                        continue;
                                    var lower = line.toLowerCase();
                                    var level = 'info';
                                    if (/\b(panic|fatal|critical)\b/i.test(lower) || (/\berror\b/i.test(lower) && !/\bwarn/i.test(lower)))
                                        level = 'critical';
                                    else if (/\b(warn|exception|failed)\b/i.test(lower))
                                        level = 'warning';
                                    else
                                        continue;
                                    var msg = line.length > 120 ? line.slice(0, 117) + '...' : line;
                                    var title = level === 'critical' ? '错误' : '警告';
                                    results.push({ id: "log-".concat(f, "-").concat(i), level: level, title: title, message: msg });
                                }
                            }
                            catch (_b) {
                                /* 忽略单文件读取失败 */
                            }
                        }
                        return results.slice(0, abnormalLimit_1);
                    };
                    fromGateway = readAbnormalFromDir(gatewayLogDir);
                    abnormal = fromGateway.length ? fromGateway : readAbnormalFromDir(openclawLogDir);
                    return [2 /*return*/, { ok: true, data: { status: 200, json: { events: abnormal }, ok: true }, success: true, status: 200, json: { events: abnormal } }];
                }
                readFromDir = function (dir) {
                    if (!fs.existsSync(dir))
                        return null;
                    var files = fs.readdirSync(dir)
                        .filter(function (f) { return f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/); })
                        .sort()
                        .reverse();
                    if (files.length === 0)
                        return null;
                    return files.slice(0, 5).map(function (f) {
                        try {
                            var full = nodePath.join(dir, f);
                            var buf = fs.readFileSync(full, 'utf8');
                            var lines = buf.split(/\r?\n/);
                            return "[".concat(f, "]\n").concat(lines.slice(-tailLines_1).join('\n'));
                        }
                        catch (_a) {
                            return "[".concat(f, "] (\u8BFB\u53D6\u5931\u8D25)");
                        }
                    }).join('\n\n---\n\n');
                };
                content = (_24 = (_23 = readFromDir(gatewayLogDir)) !== null && _23 !== void 0 ? _23 : readFromDir(openclawLogDir)) !== null && _24 !== void 0 ? _24 : '(Gateway 日志目录不存在: /tmp/openclaw 或 ~/.openclaw/logs)';
                return [2 /*return*/, { ok: true, data: { status: 200, json: { content: content }, ok: true }, success: true, status: 200, json: { content: content } }];
            case 99:
                if (!((path === '/api/sessions/usage' || path.startsWith('/api/sessions/usage?')) && method === 'GET')) return [3 /*break*/, 103];
                _146.label = 100;
            case 100:
                _146.trys.push([100, 102, , 103]);
                url_1 = new URL(path, 'http://localhost');
                limit = parseInt(url_1.searchParams.get('limit') || '50', 10) || 50;
                return [4 /*yield*/, callGatewayRpc('sessions.list', { limit: Math.min(limit, 200) }, 15000)];
            case 101:
                r = _146.sent();
                raw = r.result;
                sessions = Array.isArray(raw) ? raw : (_25 = (raw && typeof raw === 'object' && 'sessions' in raw ? raw.sessions : null)) !== null && _25 !== void 0 ? _25 : [];
                list = Array.isArray(sessions) ? sessions : [];
                totalMsgs = 0;
                totalUserMsgs = 0;
                totalAssistantMsgs = 0;
                totalToolCalls = 0;
                totalErrors = 0;
                sessionUsages = [];
                for (_m = 0, list_1 = list; _m < list_1.length; _m++) {
                    s = list_1[_m];
                    rec = s;
                    key = String((_26 = rec === null || rec === void 0 ? void 0 : rec.key) !== null && _26 !== void 0 ? _26 : '');
                    if (!key)
                        continue;
                    inp = Number((_27 = rec.inputTokens) !== null && _27 !== void 0 ? _27 : 0);
                    out = Number((_28 = rec.outputTokens) !== null && _28 !== void 0 ? _28 : 0);
                    userMsgs = Number((_30 = (_29 = rec.userMessages) !== null && _29 !== void 0 ? _29 : rec.userMessageCount) !== null && _30 !== void 0 ? _30 : 0);
                    assistantMsgs = Number((_32 = (_31 = rec.assistantMessages) !== null && _31 !== void 0 ? _31 : rec.assistantMessageCount) !== null && _32 !== void 0 ? _32 : 0);
                    toolCalls = Number((_34 = (_33 = rec.toolCalls) !== null && _33 !== void 0 ? _33 : rec.toolCallCount) !== null && _34 !== void 0 ? _34 : 0);
                    errors = Number((_36 = (_35 = rec.errorCount) !== null && _35 !== void 0 ? _35 : rec.errors) !== null && _36 !== void 0 ? _36 : 0);
                    knownMsgSum = userMsgs + assistantMsgs + toolCalls + errors;
                    msgCountRaw = Number((_38 = (_37 = rec.messageCount) !== null && _37 !== void 0 ? _37 : rec.messages) !== null && _38 !== void 0 ? _38 : knownMsgSum);
                    msgCount = Number.isFinite(msgCountRaw) && msgCountRaw > 0 ? msgCountRaw : Math.max(0, knownMsgSum);
                    totalMsgs += msgCount;
                    totalUserMsgs += Math.max(0, userMsgs);
                    totalAssistantMsgs += Math.max(0, assistantMsgs);
                    totalToolCalls += Math.max(0, toolCalls);
                    totalErrors += Math.max(0, errors);
                    sessionUsages.push({
                        key: key,
                        usage: {
                            messageCounts: {
                                total: msgCount,
                                user: Math.max(0, userMsgs),
                                assistant: Math.max(0, assistantMsgs),
                                toolCalls: Math.max(0, toolCalls),
                                errors: Math.max(0, errors),
                            },
                            toolUsage: { totalCalls: 0, tools: [] },
                            inputTokens: inp,
                            outputTokens: out,
                            latency: rec.avgLatency
                                ? {
                                    avgMs: Number(rec.avgLatency),
                                    p95Ms: Number((_39 = rec.p95Latency) !== null && _39 !== void 0 ? _39 : rec.avgLatency),
                                }
                                : undefined,
                        },
                    });
                }
                aggregates = {
                    messages: {
                        total: totalMsgs,
                        user: totalUserMsgs,
                        assistant: totalAssistantMsgs,
                        toolCalls: totalToolCalls,
                        errors: totalErrors,
                    },
                    totalInput: list.reduce(function (sum, s) { var _a; return sum + Number((_a = s.inputTokens) !== null && _a !== void 0 ? _a : 0); }, 0),
                    totalOutput: list.reduce(function (sum, s) { var _a; return sum + Number((_a = s.outputTokens) !== null && _a !== void 0 ? _a : 0); }, 0),
                };
                json_2 = { aggregates: aggregates, sessions: sessionUsages };
                return [2 /*return*/, { ok: true, data: { status: 200, json: json_2, ok: true }, success: true, status: 200, json: json_2 }];
            case 102:
                err_17 = _146.sent();
                console.error('[HostAPI] /api/sessions/usage error:', err_17);
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { aggregates: {}, sessions: [] }, ok: true },
                        success: true,
                        status: 200,
                        json: { aggregates: {}, sessions: [] },
                    }];
            case 103:
                if (!(path === '/api/usage/recent-token-history' && method === 'GET')) return [3 /*break*/, 107];
                _146.label = 104;
            case 104:
                _146.trys.push([104, 106, , 107]);
                return [4 /*yield*/, callGatewayRpc('usage.recentTokenHistory', { limit: 500 }, 15000)];
            case 105:
                r = _146.sent();
                entries = Array.isArray(r.result) ? r.result : [];
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: entries, ok: true },
                        success: true,
                        status: 200,
                        json: entries,
                    }];
            case 106:
                err_18 = _146.sent();
                console.error('[HostAPI] usage recent-token-history error:', err_18);
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: [], ok: true },
                        success: true,
                        status: 200,
                        json: [],
                    }];
            case 107:
                if (!path.startsWith('/api/usage-cost')) return [3 /*break*/, 111];
                _146.label = 108;
            case 108:
                _146.trys.push([108, 110, , 111]);
                url_2 = new URL(path, 'http://localhost');
                days = parseInt(url_2.searchParams.get('days') || '7', 10) || 7;
                return [4 /*yield*/, callGatewayRpc('usage.cost', { days: days }, 30000)];
            case 109:
                r = _146.sent();
                if (!r.ok || r.error) {
                    return [2 /*return*/, {
                            ok: true,
                            data: {
                                status: 200,
                                json: {
                                    totalCost: 0,
                                    todayCost: 0,
                                    inputTokens: 0,
                                    outputTokens: 0,
                                    trend: [],
                                },
                                ok: true,
                            },
                            success: true,
                            status: 200,
                            json: {
                                totalCost: 0,
                                todayCost: 0,
                                inputTokens: 0,
                                outputTokens: 0,
                                trend: [],
                            },
                        }];
                }
                raw = ((_40 = r.result) !== null && _40 !== void 0 ? _40 : {});
                totals = ((_41 = raw.totals) !== null && _41 !== void 0 ? _41 : {});
                daily = ((_42 = raw.daily) !== null && _42 !== void 0 ? _42 : []);
                totalCost = Number((_43 = totals.totalCost) !== null && _43 !== void 0 ? _43 : 0);
                totalTokens = Number((_44 = totals.totalTokens) !== null && _44 !== void 0 ? _44 : 0);
                inputTokens = Number((_46 = (_45 = totals.input) !== null && _45 !== void 0 ? _45 : totals.inputTokens) !== null && _46 !== void 0 ? _46 : 0);
                outputTokens = Number((_48 = (_47 = totals.output) !== null && _47 !== void 0 ? _47 : totals.outputTokens) !== null && _48 !== void 0 ? _48 : 0);
                todayEntry = daily.length > 0 ? daily[daily.length - 1] : null;
                todayCost = todayEntry ? Number((_49 = todayEntry.totalCost) !== null && _49 !== void 0 ? _49 : 0) : 0;
                trend = daily.map(function (d) {
                    var _a, _b, _c, _d, _f;
                    var tokens = Number((_a = d.totalTokens) !== null && _a !== void 0 ? _a : 0) || (Number((_b = d.input) !== null && _b !== void 0 ? _b : 0) + Number((_c = d.output) !== null && _c !== void 0 ? _c : 0));
                    return {
                        date: String((_d = d.date) !== null && _d !== void 0 ? _d : ''),
                        cost: Number((_f = d.totalCost) !== null && _f !== void 0 ? _f : 0),
                        tokens: tokens,
                    };
                });
                json_3 = {
                    totalCost: totalCost,
                    todayCost: todayCost,
                    inputTokens: inputTokens,
                    outputTokens: outputTokens,
                    trend: trend,
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: json_3, ok: true },
                        success: true,
                        status: 200,
                        json: json_3,
                    }];
            case 110:
                err_19 = _146.sent();
                console.error('[HostAPI] usage-cost error:', err_19);
                return [2 /*return*/, {
                        ok: true,
                        data: {
                            status: 200,
                            json: {
                                totalCost: 0,
                                todayCost: 0,
                                inputTokens: 0,
                                outputTokens: 0,
                                trend: [],
                            },
                            ok: true,
                        },
                        success: true,
                        status: 200,
                        json: {
                            totalCost: 0,
                            todayCost: 0,
                            inputTokens: 0,
                            outputTokens: 0,
                            trend: [],
                        },
                    }];
            case 111:
                // 特殊处理：/api/alerts 告警列表（AxonClawX alertApi.list，从 SQLite 读取 + 日志异常补充）
                if (path === '/api/alerts' || path.startsWith('/api/alerts?')) {
                    try {
                        url_3 = new URL(path, 'http://localhost');
                        page = parseInt(url_3.searchParams.get('page') || '1', 10) || 1;
                        pageSize = parseInt(url_3.searchParams.get('page_size') || '50', 10) || 50;
                        list = [];
                        stats = { high: 0, medium: 0, count1h: 0, count24h: 0 };
                        if (isInitialized()) {
                            r = listAlerts({ page: page, page_size: pageSize });
                            list = r.list;
                            stats = alertSummaryStats();
                        }
                        gatewayLogDir = process.platform === 'win32' ? nodePath.join(os.tmpdir(), 'openclaw') : '/tmp/openclaw';
                        openclawLogDir = nodePath.join(os.homedir(), '.openclaw', 'logs');
                        countLogAbnormal = function (dir) {
                            if (!fs.existsSync(dir))
                                return { critical: 0, warning: 0 };
                            var critical = 0;
                            var warning = 0;
                            try {
                                var files = fs.readdirSync(dir)
                                    .filter(function (f) { return f.endsWith('.log') || f.match(/^openclaw-\d{4}-\d{2}-\d{2}\.log$/); })
                                    .sort()
                                    .reverse();
                                for (var _i = 0, _a = files.slice(0, 3); _i < _a.length; _i++) {
                                    var f = _a[_i];
                                    var full = nodePath.join(dir, f);
                                    var buf = fs.readFileSync(full, 'utf8');
                                    var lines = buf.split(/\r?\n/);
                                    for (var i = Math.max(0, lines.length - 500); i < lines.length; i++) {
                                        var line = lines[i].trim();
                                        if (!line || line.length < 10)
                                            continue;
                                        var lower = line.toLowerCase();
                                        if (/\b(panic|fatal|critical)\b/i.test(lower) || (/\berror\b/i.test(lower) && !/\bwarn/i.test(lower)))
                                            critical++;
                                        else if (/\b(warn|exception|failed)\b/i.test(lower))
                                            warning++;
                                    }
                                }
                            }
                            catch (_b) {
                                /* ignore */
                            }
                            return { critical: critical, warning: warning };
                        };
                        logFromGw = countLogAbnormal(gatewayLogDir);
                        logFromOc = countLogAbnormal(openclawLogDir);
                        logCritical = logFromGw.critical || logFromOc.critical;
                        logWarning = logFromGw.warning || logFromOc.warning;
                        high = stats.high + logCritical;
                        medium = stats.medium + logWarning;
                        healthScore = Math.max(0, Math.min(100, 100 - high * 5 - medium * 2));
                        alerts = list.map(function (a) {
                            var _a;
                            return ({
                                id: String(a.id),
                                level: (['critical', 'warning', 'info'].includes(a.risk) ? a.risk : 'info'),
                                title: ((_a = a.message) === null || _a === void 0 ? void 0 : _a.split('\n')[0]) || a.message || '告警',
                                message: a.detail || a.message || '',
                                timestamp: a.created_at,
                            });
                        });
                        json_4 = {
                            alerts: alerts,
                            summary: {
                                high: high,
                                medium: medium,
                                count1h: stats.count1h,
                                count24h: stats.count24h,
                                healthScore: healthScore,
                            },
                        };
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: json_4, ok: true },
                                success: true,
                                status: 200,
                                json: json_4,
                            }];
                    }
                    catch (err) {
                        console.error('[HostAPI] alerts error:', err);
                        fallback = { alerts: [], summary: { high: 0, medium: 0, count1h: 0, count24h: 0, healthScore: 100 } };
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: fallback, ok: true },
                                success: true,
                                status: 200,
                                json: fallback,
                            }];
                    }
                }
                if (!(path === '/api/doctor/summary' || path.startsWith('/api/doctor/summary'))) return [3 /*break*/, 120];
                _146.label = 112;
            case 112:
                _146.trys.push([112, 119, , 120]);
                gwRunning_1 = isGatewayRunning();
                stats = isInitialized() ? alertSummaryStats() : { high: 0, medium: 0, count1h: 0, count24h: 0 };
                critical5m = stats.high;
                high5m = stats.high;
                medium5m = stats.medium;
                total1h = stats.count1h;
                total24h = stats.count24h;
                healthCheck_1 = { enabled: false, failCount: 0, maxFails: 3, lastOk: '' };
                if (!gwRunning_1) return [3 /*break*/, 118];
                _146.label = 113;
            case 113:
                _146.trys.push([113, 117, , 118]);
                ac_1 = new AbortController();
                tid = setTimeout(function () { return ac_1.abort(); }, 2500);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/health-check"), { signal: ac_1.signal })];
            case 114:
                hr = _146.sent();
                clearTimeout(tid);
                if (!hr.ok) return [3 /*break*/, 116];
                return [4 /*yield*/, hr.json()];
            case 115:
                h = (_146.sent());
                healthCheck_1 = {
                    enabled: !!h.enabled,
                    failCount: Number((_50 = h.fail_count) !== null && _50 !== void 0 ? _50 : 0),
                    maxFails: Number((_51 = h.max_fails) !== null && _51 !== void 0 ? _51 : 3),
                    lastOk: h.last_ok || '',
                };
                _146.label = 116;
            case 116: return [3 /*break*/, 118];
            case 117:
                _o = _146.sent();
                return [3 /*break*/, 118];
            case 118:
                score = 100;
                if (!gwRunning_1)
                    score -= 35;
                score -= Math.min(10, medium5m * 2);
                score -= Math.min(30, high5m * 10);
                score -= Math.min(50, critical5m * 25);
                if (healthCheck_1.enabled && healthCheck_1.failCount > 0) {
                    score -= Math.min(25, healthCheck_1.failCount * 10);
                }
                score = Math.max(0, score);
                status_5 = 'ok';
                if (!gwRunning_1 || critical5m > 0)
                    status_5 = 'error';
                else if (high5m > 0 || medium5m > 0 || (healthCheck_1.enabled && healthCheck_1.failCount > 0))
                    status_5 = 'warn';
                summary = '稳定，无近期异常';
                if (status_5 === 'error') {
                    summary = !gwRunning_1 ? 'Gateway 离线，建议立即处理' : "\u8FD1\u671F\u4E25\u91CD\u5F02\u5E38: ".concat(critical5m);
                }
                else if (status_5 === 'warn') {
                    summary =
                        healthCheck_1.enabled && healthCheck_1.failCount > 0
                            ? "\u770B\u95E8\u72D7\u5F02\u5E38 (".concat(healthCheck_1.failCount, " \u6B21) \u00B7 1h \u5185 ").concat(total1h, " \u9879")
                            : "\u8FD1\u671F\u5F02\u5E38 (1\u5C0F\u65F6\u5185 ".concat(total1h, " \u9879)");
                }
                recentList = isInitialized() ? listAlerts({ page: 1, page_size: 500 }).list : [];
                recentIssues = recentList.map(function (a) {
                    var _a;
                    return ({
                        id: String(a.id),
                        source: 'alert',
                        category: 'alert',
                        risk: a.risk === 'critical' ? 'critical' : a.risk === 'warning' ? 'medium' : 'low',
                        title: ((_a = a.message) === null || _a === void 0 ? void 0 : _a.split('\n')[0]) || a.message || '告警',
                        detail: a.detail || '',
                        timestamp: a.created_at,
                    });
                });
                trend24h = [];
                nowMs_1 = Date.now();
                windowStart_1 = nowMs_1 - 24 * 3600000;
                issuesInWindow = recentIssues
                    .map(function (issue) {
                    var ts = Date.parse(String(issue.timestamp || ''));
                    return { issue: issue, ts: ts };
                })
                    .filter(function (x) { return Number.isFinite(x.ts) && x.ts >= windowStart_1 && x.ts <= nowMs_1; });
                scoreFromCounts = function (mediumCount, highCount, criticalCount) {
                    var s = 100;
                    if (!gwRunning_1)
                        s -= 35;
                    s -= Math.min(10, mediumCount * 2);
                    s -= Math.min(30, highCount * 10);
                    s -= Math.min(50, criticalCount * 25);
                    if (healthCheck_1.enabled && healthCheck_1.failCount > 0) {
                        s -= Math.min(25, healthCheck_1.failCount * 10);
                    }
                    return Math.max(0, Math.min(100, Math.round(s)));
                };
                for (i = 0; i <= 24; i++) {
                    pointTs = nowMs_1 - (24 - i) * 3600000;
                    low = 0;
                    medium = 0;
                    high = 0;
                    critical = 0;
                    for (_p = 0, issuesInWindow_1 = issuesInWindow; _p < issuesInWindow_1.length; _p++) {
                        item = issuesInWindow_1[_p];
                        if (item.ts > pointTs)
                            continue;
                        risk = String(item.issue.risk || '').toLowerCase();
                        if (risk === 'critical')
                            critical++;
                        else if (risk === 'high')
                            high++;
                        else if (risk === 'medium' || risk === 'warning')
                            medium++;
                        else
                            low++;
                    }
                    healthScore = scoreFromCounts(medium, high, critical);
                    trend24h.push({
                        timestamp: new Date(pointTs).toISOString(),
                        label: new Date(pointTs).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
                        healthScore: healthScore,
                        low: low,
                        medium: medium,
                        high: high,
                        critical: critical,
                        errors: 0,
                    });
                }
                json_5 = {
                    score: score,
                    status: status_5,
                    summary: summary,
                    updatedAt: new Date().toISOString(),
                    gateway: { running: gwRunning_1, detail: gwRunning_1 ? '已连接' : '未运行' },
                    healthCheck: healthCheck_1,
                    trend24h: trend24h,
                    exceptionStats: { medium5m: medium5m, high5m: high5m, critical5m: critical5m, total1h: total1h, total24h: total24h },
                    sessionErrors: { totalErrors: 0, sessionCount: 0, errorSessions: 0 },
                    recentIssues: recentIssues,
                    securityAudit: {
                        critical: stats.high,
                        warn: stats.medium,
                        info: 0,
                        total: stats.high + stats.medium,
                        items: [],
                    },
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: json_5, ok: true },
                        success: true,
                        status: 200,
                        json: json_5,
                    }];
            case 119:
                err_20 = _146.sent();
                console.error('[HostAPI] doctor/summary error:', err_20);
                fallback = {
                    score: 50,
                    status: 'warn',
                    summary: '诊断加载失败',
                    updatedAt: new Date().toISOString(),
                    gateway: { running: false, detail: '未知' },
                    healthCheck: { enabled: false, failCount: 0, maxFails: 3, lastOk: '' },
                    trend24h: [],
                    exceptionStats: { medium5m: 0, high5m: 0, critical5m: 0, total1h: 0, total24h: 0 },
                    sessionErrors: { totalErrors: 0, sessionCount: 0, errorSessions: 0 },
                    recentIssues: [],
                    securityAudit: { critical: 0, warn: 0, info: 0, total: 0, items: [] },
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: fallback, ok: true },
                        success: true,
                        status: 200,
                        json: fallback,
                    }];
            case 120:
                if (path === '/api/doctor' || path.startsWith('/api/doctor?')) {
                    try {
                        gwRunning = isGatewayRunning();
                        stats = isInitialized() ? alertSummaryStats() : { high: 0, medium: 0, count1h: 0, count24h: 0 };
                        critical5m = stats.high;
                        high5m = stats.high;
                        medium5m = stats.medium;
                        score = 100;
                        if (!gwRunning)
                            score -= 35;
                        score -= Math.min(10, medium5m * 2);
                        score -= Math.min(30, high5m * 10);
                        score -= Math.min(50, critical5m * 25);
                        score = Math.max(0, score);
                        items = [
                            {
                                id: 'gateway_status',
                                name: 'Gateway 状态',
                                status: gwRunning ? 'ok' : 'error',
                                category: 'gateway',
                                detail: gwRunning ? 'Gateway 已运行' : 'Gateway 未运行',
                                suggestion: gwRunning ? undefined : '请从 Dashboard 启动 Gateway',
                                fixable: false,
                            },
                            {
                                id: 'alerts_summary',
                                name: '告警汇总',
                                status: critical5m > 0 ? 'error' : high5m > 0 || medium5m > 0 ? 'warn' : 'ok',
                                category: 'alert',
                                detail: "\u4E25\u91CD:".concat(critical5m, " \u9AD8:").concat(high5m, " \u4E2D:").concat(medium5m),
                                suggestion: critical5m > 0 ? '请查看告警页面处理' : undefined,
                                fixable: false,
                            },
                        ];
                        json_6 = { items: items, summary: score >= 70 ? '诊断通过' : '存在异常需关注', score: score };
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: json_6, ok: true },
                                success: true,
                                status: 200,
                                json: json_6,
                            }];
                    }
                    catch (err) {
                        console.error('[HostAPI] doctor run error:', err);
                        return [2 /*return*/, {
                                ok: true,
                                data: {
                                    status: 200,
                                    json: { items: [], summary: '诊断失败', score: 0 },
                                    ok: true,
                                },
                                success: true,
                                status: 200,
                                json: { items: [], summary: '诊断失败', score: 0 },
                            }];
                    }
                }
                if (path === '/api/doctor/fix' && method === 'POST') {
                    try {
                        json_7 = {
                            fixed: [],
                            results: [],
                            selected: 0,
                        };
                        return [2 /*return*/, {
                                ok: true,
                                data: { status: 200, json: json_7, ok: true },
                                success: true,
                                status: 200,
                                json: json_7,
                            }];
                    }
                    catch (err) {
                        console.error('[HostAPI] doctor fix error:', err);
                        return [2 /*return*/, {
                                ok: true,
                                data: {
                                    status: 200,
                                    json: { fixed: [], results: [], selected: 0 },
                                    ok: true,
                                },
                                success: true,
                                status: 200,
                                json: { fixed: [], results: [], selected: 0 },
                            }];
                    }
                }
                if (!(path === '/api/host-info')) return [3 /*break*/, 132];
                _146.label = 121;
            case 121:
                _146.trys.push([121, 131, , 132]);
                totalMem = os.totalmem();
                freeMem = os.freemem();
                usedMem = totalMem - freeMem;
                memPct = totalMem > 0 ? (usedMem / totalMem) * 100 : 0;
                loadAvg = os.loadavg();
                numCpu = os.cpus().length;
                cpuPct = numCpu > 0 ? Math.min((loadAvg[0] / numCpu) * 100, 100) : 0;
                diskUsage_1 = [];
                pathsToTry_1 = [
                    os.homedir(),
                    process.cwd(),
                    process.env.HOME || process.env.USERPROFILE || (process.platform === 'win32' ? 'C:\\' : '/'),
                    process.platform === 'win32' ? 'C:\\' : '/',
                ].filter(Boolean);
                tryDf = function () { return __awaiter(void 0, void 0, void 0, function () {
                    var dfCandidates, _i, dfCandidates_1, dfCmd, _a, pathsToTry_2, dirPath, stdout, lines, parts, sizeK, freeK, mountPoint, size, free, used, err_46;
                    var _b;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                if (process.platform === 'win32')
                                    return [2 /*return*/, false];
                                dfCandidates = ['df', '/bin/df', '/usr/bin/df'];
                                _i = 0, dfCandidates_1 = dfCandidates;
                                _c.label = 1;
                            case 1:
                                if (!(_i < dfCandidates_1.length)) return [3 /*break*/, 8];
                                dfCmd = dfCandidates_1[_i];
                                _a = 0, pathsToTry_2 = pathsToTry_1;
                                _c.label = 2;
                            case 2:
                                if (!(_a < pathsToTry_2.length)) return [3 /*break*/, 7];
                                dirPath = pathsToTry_2[_a];
                                if (!dirPath || typeof dirPath !== 'string')
                                    return [3 /*break*/, 6];
                                if (/^[a-zA-Z]:[\\/]/.test(dirPath))
                                    return [3 /*break*/, 6]; // 跳过 Windows 路径（df 仅 Unix）
                                _c.label = 3;
                            case 3:
                                _c.trys.push([3, 5, , 6]);
                                return [4 /*yield*/, execAsync("".concat(dfCmd, " -Pk ").concat(JSON.stringify(dirPath)), {
                                        timeout: 5000,
                                        maxBuffer: 64 * 1024,
                                    })];
                            case 4:
                                stdout = (_c.sent()).stdout;
                                lines = stdout.trim().split('\n').filter(function (l) { return l.trim(); });
                                if (lines.length >= 2) {
                                    parts = lines[1].trim().split(/\s+/);
                                    sizeK = parseInt(parts[1], 10);
                                    freeK = parseInt(parts[3], 10);
                                    mountPoint = parts.length > 5 ? parts.slice(5).join(' ') : ((_b = parts[5]) !== null && _b !== void 0 ? _b : dirPath);
                                    if (!isNaN(sizeK) && !isNaN(freeK) && sizeK > 0) {
                                        size = sizeK * 1024;
                                        free = freeK * 1024;
                                        used = size - free;
                                        diskUsage_1 = [{
                                                path: mountPoint,
                                                total: size,
                                                used: used,
                                                free: free,
                                                usedPct: Math.round((used / size) * 1000) / 10,
                                            }];
                                        return [2 /*return*/, true];
                                    }
                                }
                                return [3 /*break*/, 6];
                            case 5:
                                err_46 = _c.sent();
                                console.warn('[HostAPI] df failed for', dirPath, err_46);
                                return [3 /*break*/, 6];
                            case 6:
                                _a++;
                                return [3 /*break*/, 2];
                            case 7:
                                _i++;
                                return [3 /*break*/, 1];
                            case 8: return [2 /*return*/, false];
                        }
                    });
                }); };
                tryCheckDiskSpace = function () { return __awaiter(void 0, void 0, void 0, function () {
                    var fn, mod, _a, _i, pathsToTry_3, dirPath, disk, used, _b;
                    var _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0:
                                _d.trys.push([0, 2, , 3]);
                                return [4 /*yield*/, import('check-disk-space')];
                            case 1:
                                mod = _d.sent();
                                fn = ((_c = mod.default) !== null && _c !== void 0 ? _c : mod);
                                return [3 /*break*/, 3];
                            case 2:
                                _a = _d.sent();
                                try {
                                    fn = require('check-disk-space').default;
                                }
                                catch (_f) {
                                    return [2 /*return*/, false];
                                }
                                return [3 /*break*/, 3];
                            case 3:
                                _i = 0, pathsToTry_3 = pathsToTry_1;
                                _d.label = 4;
                            case 4:
                                if (!(_i < pathsToTry_3.length)) return [3 /*break*/, 9];
                                dirPath = pathsToTry_3[_i];
                                _d.label = 5;
                            case 5:
                                _d.trys.push([5, 7, , 8]);
                                return [4 /*yield*/, fn(dirPath)];
                            case 6:
                                disk = _d.sent();
                                if (disk && typeof disk.size === 'number' && typeof disk.free === 'number') {
                                    used = disk.size - disk.free;
                                    diskUsage_1 = [{
                                            path: disk.diskPath || dirPath,
                                            total: disk.size,
                                            used: used,
                                            free: disk.free,
                                            usedPct: disk.size > 0 ? Math.round((used / disk.size) * 1000) / 10 : 0,
                                        }];
                                    return [2 /*return*/, true];
                                }
                                return [3 /*break*/, 8];
                            case 7:
                                _b = _d.sent();
                                return [3 /*break*/, 8];
                            case 8:
                                _i++;
                                return [3 /*break*/, 4];
                            case 9: return [2 /*return*/, false];
                        }
                    });
                }); };
                if (!(process.platform !== 'win32')) return [3 /*break*/, 123];
                return [4 /*yield*/, tryDf()];
            case 122:
                _146.sent();
                _146.label = 123;
            case 123:
                if (!(diskUsage_1.length === 0)) return [3 /*break*/, 125];
                return [4 /*yield*/, tryCheckDiskSpace()];
            case 124:
                _146.sent();
                _146.label = 125;
            case 125:
                mem = process.memoryUsage();
                other = Math.max(0, mem.rss - mem.heapUsed - (mem.external || 0));
                processMemory = {
                    heapUsed: mem.heapUsed,
                    heapTotal: mem.heapTotal,
                    external: mem.external,
                    rss: mem.rss,
                    stackMemory: other,
                    gcCount: 0,
                };
                gatewayUptime = void 0;
                connectionsCount = 0;
                _146.label = 126;
            case 126:
                _146.trys.push([126, 129, , 130]);
                return [4 /*yield*/, fetch("".concat(getGatewayApiBase(), "/health"))];
            case 127:
                res = _146.sent();
                return [4 /*yield*/, res.json()];
            case 128:
                json_8 = (_146.sent());
                gatewayUptime = json_8.uptime;
                connectionsCount = typeof json_8.connections === 'number' ? json_8.connections : 0;
                return [3 /*break*/, 130];
            case 129:
                _q = _146.sent();
                return [3 /*break*/, 130];
            case 130:
                coroutineCount = 0;
                try {
                    handles = (_53 = (_52 = process)._getActiveHandles) === null || _53 === void 0 ? void 0 : _53.call(_52);
                    coroutineCount = Array.isArray(handles) ? handles.length : 0;
                }
                catch (_148) {
                    /* 不可用时保持 0 */
                }
                hostInfo = {
                    hostname: os.hostname(),
                    platform: os.platform(),
                    arch: os.arch(),
                    numCpu: numCpu,
                    cpuUsage: Math.round(cpuPct * 10) / 10,
                    coroutineCount: coroutineCount,
                    sysMem: {
                        total: totalMem,
                        used: usedMem,
                        free: freeMem,
                        usedPct: Math.round(memPct * 10) / 10,
                    },
                    diskUsage: diskUsage_1,
                    uptimeMs: os.uptime() * 1000,
                    openclawVersion: undefined,
                    processMemory: processMemory,
                    processUptime: process.uptime(),
                    gatewayUptime: gatewayUptime,
                    connectionsCount: connectionsCount,
                    env: {
                        user: process.env.USER || process.env.USERNAME || process.env.LOGNAME || '--',
                        shell: process.env.SHELL || process.env.COMSPEC || '--',
                        cwd: process.cwd(),
                    },
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: hostInfo, ok: true },
                        success: true,
                        status: 200,
                        json: hostInfo,
                    }];
            case 131:
                err_21 = _146.sent();
                console.error('[HostAPI] host-info error:', err_21);
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, json: { error: String(err_21) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_21) },
                    }];
            case 132:
                // 特殊处理：/health 直接返回成功
                if (path === '/health') {
                    console.log('[HostAPI] GET /health (direct response)');
                    return [2 /*return*/, {
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
                        }];
                }
                if (!(path === '/api/clawhub/list' && method === 'GET')) return [3 /*break*/, 136];
                _146.label = 133;
            case 133:
                _146.trys.push([133, 135, , 136]);
                return [4 /*yield*/, listInstalled()];
            case 134:
                results = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, results: results }, ok: true }, success: true, status: 200, json: { success: true, results: results } }];
            case 135:
                err_22 = _146.sent();
                console.error('[HostAPI] clawhub list error:', err_22);
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, results: [] }, ok: true }, success: true, status: 200, json: { success: true, results: [] } }];
            case 136:
                if (!(path === '/api/clawhub/search' && method === 'POST' && body)) return [3 /*break*/, 140];
                _146.label = 137;
            case 137:
                _146.trys.push([137, 139, , 140]);
                query = JSON.parse(body).query;
                return [4 /*yield*/, clawhubSearch(query || '', 50)];
            case 138:
                results = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, results: results }, ok: true }, success: true, status: 200, json: { success: true, results: results } }];
            case 139:
                err_23 = _146.sent();
                console.error('[HostAPI] clawhub search error:', err_23);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err_23) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err_23) } }];
            case 140:
                if (!(path === '/api/clawhub/install' && method === 'POST' && body)) return [3 /*break*/, 144];
                _146.label = 141;
            case 141:
                _146.trys.push([141, 143, , 144]);
                _r = JSON.parse(body), slug = _r.slug, version = _r.version;
                if (!slug)
                    return [2 /*return*/, { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } }];
                return [4 /*yield*/, clawhubInstall(slug, version)];
            case 142:
                _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 143:
                err_24 = _146.sent();
                console.error('[HostAPI] clawhub install error:', err_24);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err_24) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err_24) } }];
            case 144:
                if (!(path === '/api/clawhub/uninstall' && method === 'POST' && body)) return [3 /*break*/, 148];
                _146.label = 145;
            case 145:
                _146.trys.push([145, 147, , 148]);
                slug = JSON.parse(body).slug;
                if (!slug)
                    return [2 /*return*/, { ok: false, data: { status: 400, json: { success: false, error: 'slug required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'slug required' } }];
                return [4 /*yield*/, clawhubUninstall(slug)];
            case 146:
                _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 147:
                err_25 = _146.sent();
                console.error('[HostAPI] clawhub uninstall error:', err_25);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err_25) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err_25) } }];
            case 148:
                if (!(path === '/api/clawhub/open-readme' && method === 'POST' && body)) return [3 /*break*/, 152];
                _146.label = 149;
            case 149:
                _146.trys.push([149, 151, , 152]);
                _s = JSON.parse(body), skillKey = _s.skillKey, slug = _s.slug, baseDir = _s.baseDir;
                dir = openSkillPath(skillKey || slug || '', baseDir);
                if (!dir)
                    return [2 /*return*/, { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } }];
                candidates = ['SKILL.md', 'README.md'];
                target = '';
                for (_t = 0, candidates_1 = candidates; _t < candidates_1.length; _t++) {
                    f = candidates_1[_t];
                    p = nodePath.join(dir, f);
                    if (fs.existsSync(p)) {
                        target = p;
                        break;
                    }
                }
                if (!target)
                    target = dir;
                return [4 /*yield*/, shell.openPath(target)];
            case 150:
                _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 151:
                err_26 = _146.sent();
                console.error('[HostAPI] clawhub open-readme error:', err_26);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err_26) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err_26) } }];
            case 152:
                if (!(path === '/api/clawhub/open-path' && method === 'POST' && body)) return [3 /*break*/, 156];
                _146.label = 153;
            case 153:
                _146.trys.push([153, 155, , 156]);
                _u = JSON.parse(body), skillKey = _u.skillKey, slug = _u.slug, baseDir = _u.baseDir;
                dir = openSkillPath(skillKey || slug || '', baseDir);
                if (!dir)
                    return [2 /*return*/, { ok: false, data: { status: 404, json: { success: false, error: 'Skill not found' }, ok: false }, success: false, status: 404, json: { success: false, error: 'Skill not found' } }];
                return [4 /*yield*/, shell.openPath(dir)];
            case 154:
                r = _146.sent();
                if (r)
                    return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: r }, ok: false }, success: false, status: 500, json: { success: false, error: r } }];
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 155:
                err_27 = _146.sent();
                console.error('[HostAPI] clawhub open-path error:', err_27);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err_27) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err_27) } }];
            case 156:
                if (path === '/api/skills/load-from-dir' && method === 'POST' && body) {
                    try {
                        dirPath = JSON.parse(body).dirPath;
                        if (!dirPath || typeof dirPath !== 'string')
                            return [2 /*return*/, { ok: false, data: { status: 400, json: { success: false, error: 'dirPath required' }, ok: false }, success: false, status: 400, json: { success: false, error: 'dirPath required' } }];
                        resolved = dirPath.startsWith('~') ? nodePath.join(os.homedir(), dirPath.slice(1)) : dirPath;
                        skills = scanSkillsFromDir(resolved);
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, skills: skills }, ok: true }, success: true, status: 200, json: { success: true, skills: skills } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] skills load-from-dir error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: { success: false, error: String(err) }, ok: false }, success: false, status: 500, json: { success: false, error: String(err) } }];
                    }
                }
                OPENCLAW_CONFIG_PATH = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
                if (path === '/api/config' && method === 'GET') {
                    try {
                        if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
                            raw = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8');
                            json_9 = parseOpenclawConfigText(raw);
                            return [2 /*return*/, { ok: true, data: { status: 200, json: json_9, ok: true }, success: true, status: 200, json: json_9 }];
                        }
                        return [2 /*return*/, { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} }];
                    }
                    catch (err) {
                        console.error('[HostAPI] config get error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } }];
                    }
                }
                if (path === '/api/config' && method === 'POST' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        writeOpenclawConfig(payload);
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] config set error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } }];
                    }
                }
                if (path === '/api/config/path' && method === 'GET') {
                    return [2 /*return*/, { ok: true, data: { status: 200, json: { path: OPENCLAW_CONFIG_PATH }, ok: true }, success: true, status: 200, json: { path: OPENCLAW_CONFIG_PATH } }];
                }
                if (!(path === '/api/v1/config' && method === 'GET')) return [3 /*break*/, 163];
                _146.label = 157;
            case 157:
                _146.trys.push([157, 162, , 163]);
                data = {};
                // 1) 本地配置优先：避免被网关返回的裁剪结果覆盖真实配置
                if (fs.existsSync(OPENCLAW_CONFIG_PATH)) {
                    raw = fs.readFileSync(OPENCLAW_CONFIG_PATH, 'utf8');
                    parsed = parseOpenclawConfigText(raw);
                    if (parsed && typeof parsed === 'object') {
                        data = {
                            config: enrichConfigFromLatestBackup(parsed, OPENCLAW_CONFIG_PATH),
                            path: OPENCLAW_CONFIG_PATH,
                            parsed: true,
                        };
                    }
                }
                if (!(!data.config || typeof data.config !== 'object')) return [3 /*break*/, 161];
                _146.label = 158;
            case 158:
                _146.trys.push([158, 160, , 161]);
                return [4 /*yield*/, callGatewayRpc('config.get', {}, 8000)];
            case 159:
                r = _146.sent();
                if (r.ok && r.result != null) {
                    if (typeof r.result === 'object' && !Array.isArray(r.result)) {
                        cfg = (_55 = (_54 = r.result) === null || _54 === void 0 ? void 0 : _54.config) !== null && _55 !== void 0 ? _55 : r.result;
                        if (typeof cfg === 'object' && cfg !== null) {
                            data = { config: cfg, path: OPENCLAW_CONFIG_PATH, parsed: true };
                        }
                    }
                }
                return [3 /*break*/, 161];
            case 160:
                _v = _146.sent();
                return [3 /*break*/, 161];
            case 161:
                if (!data.config || typeof data.config !== 'object') {
                    return [2 /*return*/, {
                            ok: false,
                            data: { status: 404, json: { success: false, error_code: 'CONFIG_NOT_FOUND', message: 'Config file not found' }, ok: false },
                            success: false,
                            status: 404,
                            json: { success: false, error_code: 'CONFIG_NOT_FOUND', message: 'Config file not found' },
                        }];
                }
                return [2 /*return*/, { ok: true, data: { status: 200, json: data, ok: true }, success: true, status: 200, json: data }];
            case 162:
                err_28 = _146.sent();
                console.error('[HostAPI] /api/v1/config GET error:', err_28);
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, json: { success: false, error: String(err_28) }, ok: false },
                        success: false,
                        status: 500,
                        json: { success: false, error: String(err_28) },
                    }];
            case 163:
                if (path === '/api/v1/config' && method === 'PUT' && body) {
                    try {
                        payload = typeof body === 'string' ? JSON.parse(body) : body;
                        cfg = (_56 = payload === null || payload === void 0 ? void 0 : payload.config) !== null && _56 !== void 0 ? _56 : payload;
                        writeOpenclawConfig(cfg);
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] /api/v1/config PUT error:', err);
                        return [2 /*return*/, {
                                ok: false,
                                data: { status: 500, json: { success: false, error: String(err) }, ok: false },
                                success: false,
                                status: 500,
                                json: { success: false, error: String(err) },
                            }];
                    }
                }
                if (path === '/api/v1/config/generate-default' && method === 'POST') {
                    try {
                        dir = nodePath.dirname(OPENCLAW_CONFIG_PATH);
                        if (!fs.existsSync(dir))
                            fs.mkdirSync(dir, { recursive: true });
                        defaultConfig = {
                            gateway: { port: 18789, bind: 'loopback' },
                            agents: { list: [{ id: 'main', name: 'Main', default: true }], defaultId: 'main' },
                            bindings: [],
                            channels: {},
                            models: {},
                        };
                        fs.writeFileSync(OPENCLAW_CONFIG_PATH, JSON.stringify(defaultConfig, null, 2), 'utf8');
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, message: 'Default config generated', path: OPENCLAW_CONFIG_PATH }, ok: true }, success: true, status: 200, json: { success: true, message: 'Default config generated', path: OPENCLAW_CONFIG_PATH } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] /api/v1/config/generate-default error:', err);
                        return [2 /*return*/, {
                                ok: false,
                                data: { status: 500, json: { success: false, error: String(err) }, ok: false },
                                success: false,
                                status: 500,
                                json: { success: false, error: String(err) },
                            }];
                    }
                }
                if (!(path === '/api/v1/setup/scan' && method === 'GET')) return [3 /*break*/, 167];
                _146.label = 164;
            case 164:
                _146.trys.push([164, 166, , 167]);
                return [4 /*yield*/, (function () { return __awaiter(void 0, void 0, void 0, function () {
                        var openclawPathRaw, openclawPath, openclawVersion, stdout, _a, probe;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, execAsync('command -v openclaw || true', { timeout: 3000 })];
                                case 1:
                                    openclawPathRaw = (_c.sent()).stdout;
                                    openclawPath = openclawPathRaw.trim();
                                    openclawVersion = '';
                                    if (!openclawPath) return [3 /*break*/, 5];
                                    _c.label = 2;
                                case 2:
                                    _c.trys.push([2, 4, , 5]);
                                    return [4 /*yield*/, execAsync('openclaw --version', { timeout: 5000 })];
                                case 3:
                                    stdout = (_c.sent()).stdout;
                                    openclawVersion = stdout.trim();
                                    return [3 /*break*/, 5];
                                case 4:
                                    _a = _c.sent();
                                    return [3 /*break*/, 5];
                                case 5: return [4 /*yield*/, resolveGatewayPort()];
                                case 6:
                                    probe = _c.sent();
                                    return [2 /*return*/, {
                                            openclawPath: openclawPath,
                                            openclawVersion: openclawVersion,
                                            gatewayRunning: probe.success,
                                            gatewayPort: (_b = probe.port) !== null && _b !== void 0 ? _b : getResolvedGatewayPort(),
                                        }];
                            }
                        });
                    }); })()];
            case 165:
                scan = _146.sent();
                data = {
                    os: process.platform,
                    arch: process.arch,
                    packageManager: 'npm',
                    hasSudo: true,
                    tools: {
                        node: { installed: true, version: process.version, path: process.execPath },
                        npm: { installed: true },
                        git: { installed: true },
                        openclaw: { installed: !!scan.openclawPath, version: scan.openclawVersion, path: scan.openclawPath },
                        clawhub: { installed: false },
                    },
                    internetAccess: true,
                    openClawInstalled: !!scan.openclawPath,
                    openClawConfigured: fs.existsSync(OPENCLAW_CONFIG_PATH),
                    openClawVersion: scan.openclawVersion,
                    openClawCnInstalled: false,
                    gatewayRunning: !!scan.gatewayRunning,
                    gatewayPort: scan.gatewayPort,
                    recommendedMethod: 'auto',
                    recommendedSteps: [],
                    warnings: [],
                };
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, data: data }, ok: true }, success: true, status: 200, json: { success: true, data: data } }];
            case 166:
                err_29 = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, data: { openClawInstalled: false } }, ok: true }, success: true, status: 200, json: { success: true, data: { openClawInstalled: false } } }];
            case 167:
                if (!(path === '/api/v1/gw/proxy' && method === 'POST')) return [3 /*break*/, 171];
                _146.label = 168;
            case 168:
                _146.trys.push([168, 170, , 171]);
                params = typeof body === 'string' ? JSON.parse(body) : body;
                rpcMethod = (_57 = params === null || params === void 0 ? void 0 : params.method) !== null && _57 !== void 0 ? _57 : '';
                rpcParams = (_58 = params === null || params === void 0 ? void 0 : params.params) !== null && _58 !== void 0 ? _58 : {};
                return [4 /*yield*/, callGatewayRpc(rpcMethod, rpcParams)];
            case 169:
                r = _146.sent();
                if (!r.ok) {
                    // Gateway RPC 失败，返回错误让前端能检测到
                    return [2 /*return*/, {
                            ok: false,
                            data: { status: 502, json: { success: false, error: r.error || 'Gateway RPC failed' }, ok: false },
                            success: false,
                            status: 502,
                            json: { success: false, error: r.error || 'Gateway RPC failed' },
                        }];
                }
                return [2 /*return*/, { ok: true, data: { status: 200, json: r.result, ok: true }, success: true, status: 200, json: r.result }];
            case 170:
                err_30 = _146.sent();
                console.error('[HostAPI] /api/v1/gw/proxy error:', err_30);
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 502, json: { success: false, error: String(err_30) }, ok: false },
                        success: false,
                        status: 502,
                        json: { success: false, error: String(err_30) },
                    }];
            case 171:
                if (!(path === '/api/v1/gw/status' && method === 'GET')) return [3 /*break*/, 175];
                _146.label = 172;
            case 172:
                _146.trys.push([172, 174, , 175]);
                return [4 /*yield*/, callGatewayRpc('health', { probe: false }, 3000)];
            case 173:
                r = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { ok: r.ok }, ok: true }, success: true, status: 200, json: { ok: r.ok } }];
            case 174:
                _w = _146.sent();
                return [2 /*return*/, { ok: true, data: { status: 200, json: { ok: false }, ok: true }, success: true, status: 200, json: { ok: false } }];
            case 175:
                if (!(path === '/api/agents' && method === 'GET')) return [3 /*break*/, 183];
                _146.label = 176;
            case 176:
                _146.trys.push([176, 181, , 183]);
                buildSnapshot = function (list, defaultId, bindings, configChannels, defaultModelStr, defaultWorkspace) {
                    var channelOwners = {};
                    var configuredChannelTypes = Object.keys(configChannels !== null && configChannels !== void 0 ? configChannels : {}).filter(function (k) { return k !== 'defaults' && k !== 'modelByChannel' && typeof (configChannels === null || configChannels === void 0 ? void 0 : configChannels[k]) === 'object'; });
                    bindings.forEach(function (b) {
                        var _a;
                        var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel;
                        if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                            channelOwners[ch] = b.agentId;
                    });
                    var agents = list.map(function (a) {
                        var _a, _b, _c, _d, _f, _g;
                        var agentChannels = bindings.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                        var model = a.model;
                        var modelDisplay = typeof model === 'string'
                            ? model
                            : typeof model === 'object' && model && 'primary' in model
                                ? model.primary
                                : defaultModelStr;
                        var inheritedModel = !a.model;
                        return {
                            id: String((_a = a.id) !== null && _a !== void 0 ? _a : ''),
                            name: String((_c = (_b = a.name) !== null && _b !== void 0 ? _b : a.id) !== null && _c !== void 0 ? _c : ''),
                            isDefault: a.id === defaultId,
                            modelDisplay: String(modelDisplay !== null && modelDisplay !== void 0 ? modelDisplay : '—'),
                            inheritedModel: inheritedModel,
                            workspace: String((_f = (_d = a.workspace) !== null && _d !== void 0 ? _d : defaultWorkspace) !== null && _f !== void 0 ? _f : '—'),
                            agentDir: String((_g = a.agentDir) !== null && _g !== void 0 ? _g : "~/.openclaw/agents/".concat(a.id, "/agent")),
                            mainSessionKey: "".concat(a.id, ":main"),
                            channelTypes: agentChannels,
                        };
                    });
                    return { agents: agents, defaultAgentId: defaultId, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners };
                };
                return [4 /*yield*/, callGatewayRpcWithRetry('agents.list', {})];
            case 177:
                agentsListRes = _146.sent();
                if (!(agentsListRes.ok && agentsListRes.result != null)) return [3 /*break*/, 179];
                raw = agentsListRes.result;
                list_2 = Array.isArray(raw) ? raw : (_59 = (raw && typeof raw === 'object' && 'agents' in raw ? raw.agents : [])) !== null && _59 !== void 0 ? _59 : [];
                rawObj = raw && typeof raw === 'object' ? raw : {};
                defaultId_4 = (_65 = (_63 = (_61 = (_60 = rawObj.defaultId) !== null && _60 !== void 0 ? _60 : rawObj.defaultAgentId) !== null && _61 !== void 0 ? _61 : (_62 = list_2.find(function (a) { return a.default; })) === null || _62 === void 0 ? void 0 : _62.id) !== null && _63 !== void 0 ? _63 : (_64 = list_2[0]) === null || _64 === void 0 ? void 0 : _64.id) !== null && _65 !== void 0 ? _65 : 'main';
                bindings_3 = [];
                configChannels = {};
                return [4 /*yield*/, callGatewayRpc('config.get', {}).catch(function () { return ({ ok: false }); })];
            case 178:
                configRes_1 = _146.sent();
                if (configRes_1.ok && 'result' in configRes_1 && configRes_1.result != null) {
                    cfg = configRes_1.result;
                    bindings_3 = (_66 = cfg.bindings) !== null && _66 !== void 0 ? _66 : [];
                    configChannels = (_67 = cfg.channels) !== null && _67 !== void 0 ? _67 : {};
                }
                defaultModel_1 = (_68 = rawObj.defaultModel) !== null && _68 !== void 0 ? _68 : '—';
                defaultWorkspace = (_69 = rawObj.defaultWorkspace) !== null && _69 !== void 0 ? _69 : '—';
                json_10 = buildSnapshot(list_2, String(defaultId_4), bindings_3, configChannels, defaultModel_1, defaultWorkspace);
                return [2 /*return*/, { ok: true, data: { status: 200, json: json_10, ok: true }, success: true, status: 200, json: json_10 }];
            case 179: return [4 /*yield*/, callGatewayRpcWithRetry('config.get', {})];
            case 180:
                configRes = _146.sent();
                if (!configRes.ok || configRes.result == null)
                    throw new Error('config.get failed');
                configTyped = configRes.result;
                list = (_71 = (_70 = configTyped === null || configTyped === void 0 ? void 0 : configTyped.agents) === null || _70 === void 0 ? void 0 : _70.list) !== null && _71 !== void 0 ? _71 : [];
                defaultModel = (_73 = (_72 = configTyped === null || configTyped === void 0 ? void 0 : configTyped.agents) === null || _72 === void 0 ? void 0 : _72.defaults) === null || _73 === void 0 ? void 0 : _73.model;
                modelStr = typeof defaultModel === 'string' ? defaultModel : (typeof defaultModel === 'object' && (defaultModel === null || defaultModel === void 0 ? void 0 : defaultModel.primary) ? defaultModel.primary : '—');
                defaultId = (_77 = (_75 = (_74 = list.find(function (a) { return a.default; })) === null || _74 === void 0 ? void 0 : _74.id) !== null && _75 !== void 0 ? _75 : (_76 = list[0]) === null || _76 === void 0 ? void 0 : _76.id) !== null && _77 !== void 0 ? _77 : 'main';
                bindings = ((_78 = configTyped === null || configTyped === void 0 ? void 0 : configTyped.bindings) !== null && _78 !== void 0 ? _78 : []);
                json_11 = buildSnapshot(list, String(defaultId), bindings, (_79 = configTyped === null || configTyped === void 0 ? void 0 : configTyped.channels) !== null && _79 !== void 0 ? _79 : {}, modelStr, (_82 = (_81 = (_80 = configTyped === null || configTyped === void 0 ? void 0 : configTyped.agents) === null || _80 === void 0 ? void 0 : _80.defaults) === null || _81 === void 0 ? void 0 : _81.workspace) !== null && _82 !== void 0 ? _82 : '—');
                return [2 /*return*/, { ok: true, data: { status: 200, json: json_11, ok: true }, success: true, status: 200, json: json_11 }];
            case 181:
                err_31 = _146.sent();
                return [4 /*yield*/, fetchAgentsFromAxonClawX()];
            case 182:
                fallback = _146.sent();
                if (fallback) {
                    return [2 /*return*/, { ok: true, data: { status: 200, json: fallback, ok: true }, success: true, status: 200, json: fallback }];
                }
                console.error('[HostAPI] /api/agents GET error:', err_31);
                return [2 /*return*/, {
                        ok: false,
                        data: { status: 500, json: { error: String(err_31), agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_31), agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} },
                    }];
            case 183:
                if (!(path === '/api/agents' && method === 'POST' && body)) return [3 /*break*/, 190];
                _146.label = 184;
            case 184:
                _146.trys.push([184, 189, , 190]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                return [4 /*yield*/, callGatewayRpc('agents.create', { name: (_83 = payload === null || payload === void 0 ? void 0 : payload.name) !== null && _83 !== void 0 ? _83 : 'New Agent', workspace: payload === null || payload === void 0 ? void 0 : payload.workspace, emoji: payload === null || payload === void 0 ? void 0 : payload.emoji })];
            case 185:
                _146.sent();
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 186:
                res = _146.sent();
                lastId = (_86 = (_85 = (_84 = res === null || res === void 0 ? void 0 : res.agents) === null || _84 === void 0 ? void 0 : _84.list) === null || _85 === void 0 ? void 0 : _85.slice(-1)[0]) === null || _86 === void 0 ? void 0 : _86.id;
                if (!lastId) return [3 /*break*/, 188];
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 187:
                full_1 = (_146.sent());
                list = (_88 = (_87 = full_1 === null || full_1 === void 0 ? void 0 : full_1.agents) === null || _87 === void 0 ? void 0 : _87.list) !== null && _88 !== void 0 ? _88 : [];
                bindings_4 = ((_89 = full_1 === null || full_1 === void 0 ? void 0 : full_1.bindings) !== null && _89 !== void 0 ? _89 : []);
                defaultId_5 = (_93 = (_91 = (_90 = list.find(function (a) { return a.default; })) === null || _90 === void 0 ? void 0 : _90.id) !== null && _91 !== void 0 ? _91 : (_92 = list[0]) === null || _92 === void 0 ? void 0 : _92.id) !== null && _93 !== void 0 ? _93 : 'main';
                channelOwners_3 = {};
                configuredChannelTypes = Object.keys((_94 = full_1 === null || full_1 === void 0 ? void 0 : full_1.channels) !== null && _94 !== void 0 ? _94 : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = full_1 === null || full_1 === void 0 ? void 0 : full_1.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                bindings_4.forEach(function (b) {
                    var _a;
                    var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel;
                    if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                        channelOwners_3[ch] = b.agentId;
                });
                agents = list.map(function (a) {
                    var _a, _b, _c;
                    var agentChannels = bindings_4.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                    return {
                        id: a.id,
                        name: (_a = a.name) !== null && _a !== void 0 ? _a : a.id,
                        isDefault: a.id === defaultId_5,
                        modelDisplay: '—',
                        inheritedModel: true,
                        workspace: (_b = a.workspace) !== null && _b !== void 0 ? _b : '—',
                        agentDir: (_c = a.agentDir) !== null && _c !== void 0 ? _c : "~/.openclaw/agents/".concat(a.id, "/agent"),
                        mainSessionKey: "".concat(a.id, ":main"),
                        channelTypes: agentChannels,
                    };
                });
                json_12 = { agents: agents, defaultAgentId: defaultId_5, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_3 };
                return [2 /*return*/, { ok: true, data: { status: 200, json: json_12, ok: true }, success: true, status: 200, json: json_12 }];
            case 188:
                json_13 = { agents: [], defaultAgentId: 'main', configuredChannelTypes: [], channelOwners: {} };
                return [2 /*return*/, { ok: true, data: { status: 200, json: json_13, ok: true }, success: true, status: 200, json: json_13 }];
            case 189:
                err_32 = _146.sent();
                console.error('[HostAPI] /api/agents POST error:', err_32);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_32) }, ok: false }, success: false, status: 500, json: { error: String(err_32) } }];
            case 190:
                agentsIdMatch = path.match(/^\/api\/agents\/([^/]+)(?:\/channels\/([^/]+))?$/);
                if (!agentsIdMatch) return [3 /*break*/, 212];
                agentId_1 = agentsIdMatch[1];
                channelType_1 = agentsIdMatch[2];
                if (!channelType_1) return [3 /*break*/, 202];
                if (!(method === 'PUT')) return [3 /*break*/, 196];
                _146.label = 191;
            case 191:
                _146.trys.push([191, 195, , 196]);
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 192:
                config = (_146.sent());
                bindings = Array.isArray(config === null || config === void 0 ? void 0 : config.bindings) ? __spreadArray([], config.bindings, true) : [];
                if (!bindings.some(function (b) { var _a; return (b === null || b === void 0 ? void 0 : b.agentId) === agentId_1 && ((_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel) === channelType_1; })) {
                    bindings.push({ agentId: agentId_1, match: { channel: channelType_1 } });
                }
                return [4 /*yield*/, callGatewayRpc('config.set', __assign(__assign({}, config), { bindings: bindings }))];
            case 193:
                _146.sent();
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 194:
                res_1 = (_146.sent());
                list = ((_96 = (_95 = res_1 === null || res_1 === void 0 ? void 0 : res_1.agents) === null || _95 === void 0 ? void 0 : _95.list) !== null && _96 !== void 0 ? _96 : []);
                bList_1 = ((_97 = res_1 === null || res_1 === void 0 ? void 0 : res_1.bindings) !== null && _97 !== void 0 ? _97 : []);
                defaultId_6 = (_101 = (_99 = (_98 = list.find(function (a) { return a.default; })) === null || _98 === void 0 ? void 0 : _98.id) !== null && _99 !== void 0 ? _99 : (_100 = list[0]) === null || _100 === void 0 ? void 0 : _100.id) !== null && _101 !== void 0 ? _101 : 'main';
                channelOwners_4 = {};
                bList_1.forEach(function (b) {
                    var _a;
                    var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel;
                    if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                        channelOwners_4[ch] = b.agentId;
                });
                configuredChannelTypes = Object.keys((_102 = res_1 === null || res_1 === void 0 ? void 0 : res_1.channels) !== null && _102 !== void 0 ? _102 : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = res_1 === null || res_1 === void 0 ? void 0 : res_1.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                agents = list.map(function (a) {
                    var _a, _b, _c;
                    var agentChannels = bList_1.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                    return { id: a.id, name: (_a = a.name) !== null && _a !== void 0 ? _a : a.id, isDefault: a.id === defaultId_6, modelDisplay: '—', inheritedModel: true, workspace: (_b = a.workspace) !== null && _b !== void 0 ? _b : '—', agentDir: (_c = a.agentDir) !== null && _c !== void 0 ? _c : "~/.openclaw/agents/".concat(a.id, "/agent"), mainSessionKey: "".concat(a.id, ":main"), channelTypes: agentChannels };
                });
                return [2 /*return*/, { ok: true, data: { status: 200, json: { agents: agents, defaultAgentId: defaultId_6, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_4 }, ok: true }, success: true, status: 200, json: { agents: agents, defaultAgentId: defaultId_6, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_4 } }];
            case 195:
                err_33 = _146.sent();
                console.error('[HostAPI] assign channel error:', err_33);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_33) }, ok: false }, success: false, status: 500, json: { error: String(err_33) } }];
            case 196:
                if (!(method === 'DELETE')) return [3 /*break*/, 202];
                _146.label = 197;
            case 197:
                _146.trys.push([197, 201, , 202]);
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 198:
                config = (_146.sent());
                bindings = (Array.isArray(config === null || config === void 0 ? void 0 : config.bindings) ? config.bindings : []).filter(function (b) { var _a; return !((b === null || b === void 0 ? void 0 : b.agentId) === agentId_1 && ((_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel) === channelType_1); });
                return [4 /*yield*/, callGatewayRpc('config.set', __assign(__assign({}, config), { bindings: bindings }))];
            case 199:
                _146.sent();
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 200:
                res_2 = (_146.sent());
                list = ((_104 = (_103 = res_2 === null || res_2 === void 0 ? void 0 : res_2.agents) === null || _103 === void 0 ? void 0 : _103.list) !== null && _104 !== void 0 ? _104 : []);
                bList_2 = ((_105 = res_2 === null || res_2 === void 0 ? void 0 : res_2.bindings) !== null && _105 !== void 0 ? _105 : []);
                defaultId_7 = (_109 = (_107 = (_106 = list.find(function (a) { return a.default; })) === null || _106 === void 0 ? void 0 : _106.id) !== null && _107 !== void 0 ? _107 : (_108 = list[0]) === null || _108 === void 0 ? void 0 : _108.id) !== null && _109 !== void 0 ? _109 : 'main';
                channelOwners_5 = {};
                bList_2.forEach(function (b) { var _a; var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                    channelOwners_5[ch] = b.agentId; });
                configuredChannelTypes = Object.keys((_110 = res_2 === null || res_2 === void 0 ? void 0 : res_2.channels) !== null && _110 !== void 0 ? _110 : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = res_2 === null || res_2 === void 0 ? void 0 : res_2.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                agents = list.map(function (a) {
                    var _a, _b, _c;
                    var agentChannels = bList_2.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                    return { id: a.id, name: (_a = a.name) !== null && _a !== void 0 ? _a : a.id, isDefault: a.id === defaultId_7, modelDisplay: '—', inheritedModel: true, workspace: (_b = a.workspace) !== null && _b !== void 0 ? _b : '—', agentDir: (_c = a.agentDir) !== null && _c !== void 0 ? _c : "~/.openclaw/agents/".concat(a.id, "/agent"), mainSessionKey: "".concat(a.id, ":main"), channelTypes: agentChannels };
                });
                return [2 /*return*/, { ok: true, data: { status: 200, json: { agents: agents, defaultAgentId: defaultId_7, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_5 }, ok: true }, success: true, status: 200, json: { agents: agents, defaultAgentId: defaultId_7, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_5 } }];
            case 201:
                err_34 = _146.sent();
                console.error('[HostAPI] remove channel error:', err_34);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_34) }, ok: false }, success: false, status: 500, json: { error: String(err_34) } }];
            case 202:
                if (!(method === 'PUT' && body)) return [3 /*break*/, 207];
                _146.label = 203;
            case 203:
                _146.trys.push([203, 206, , 207]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                return [4 /*yield*/, callGatewayRpc('agents.update', { agentId: agentId_1, name: payload === null || payload === void 0 ? void 0 : payload.name })];
            case 204:
                _146.sent();
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 205:
                config_1 = (_146.sent());
                list = ((_112 = (_111 = config_1 === null || config_1 === void 0 ? void 0 : config_1.agents) === null || _111 === void 0 ? void 0 : _111.list) !== null && _112 !== void 0 ? _112 : []);
                bList_3 = ((_113 = config_1 === null || config_1 === void 0 ? void 0 : config_1.bindings) !== null && _113 !== void 0 ? _113 : []);
                defaultId_8 = (_117 = (_115 = (_114 = list.find(function (a) { return a.default; })) === null || _114 === void 0 ? void 0 : _114.id) !== null && _115 !== void 0 ? _115 : (_116 = list[0]) === null || _116 === void 0 ? void 0 : _116.id) !== null && _117 !== void 0 ? _117 : 'main';
                channelOwners_6 = {};
                bList_3.forEach(function (b) { var _a; var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                    channelOwners_6[ch] = b.agentId; });
                configuredChannelTypes = Object.keys((_118 = config_1 === null || config_1 === void 0 ? void 0 : config_1.channels) !== null && _118 !== void 0 ? _118 : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = config_1 === null || config_1 === void 0 ? void 0 : config_1.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                agents = list.map(function (a) {
                    var _a, _b, _c;
                    var agentChannels = bList_3.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                    return { id: a.id, name: (_a = a.name) !== null && _a !== void 0 ? _a : a.id, isDefault: a.id === defaultId_8, modelDisplay: '—', inheritedModel: true, workspace: (_b = a.workspace) !== null && _b !== void 0 ? _b : '—', agentDir: (_c = a.agentDir) !== null && _c !== void 0 ? _c : "~/.openclaw/agents/".concat(a.id, "/agent"), mainSessionKey: "".concat(a.id, ":main"), channelTypes: agentChannels };
                });
                return [2 /*return*/, { ok: true, data: { status: 200, json: { agents: agents, defaultAgentId: defaultId_8, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_6 }, ok: true }, success: true, status: 200, json: { agents: agents, defaultAgentId: defaultId_8, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_6 } }];
            case 206:
                err_35 = _146.sent();
                console.error('[HostAPI] /api/agents PUT error:', err_35);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_35) }, ok: false }, success: false, status: 500, json: { error: String(err_35) } }];
            case 207:
                if (!(method === 'DELETE')) return [3 /*break*/, 212];
                _146.label = 208;
            case 208:
                _146.trys.push([208, 211, , 212]);
                payload = typeof body === 'string' && body ? JSON.parse(body) : body;
                return [4 /*yield*/, callGatewayRpc('agents.delete', { agentId: agentId_1, deleteFiles: (_119 = payload === null || payload === void 0 ? void 0 : payload.deleteFiles) !== null && _119 !== void 0 ? _119 : false })];
            case 209:
                _146.sent();
                return [4 /*yield*/, callGatewayRpc('config.get', {})];
            case 210:
                config_2 = (_146.sent());
                list = ((_121 = (_120 = config_2 === null || config_2 === void 0 ? void 0 : config_2.agents) === null || _120 === void 0 ? void 0 : _120.list) !== null && _121 !== void 0 ? _121 : []);
                bList_4 = ((_122 = config_2 === null || config_2 === void 0 ? void 0 : config_2.bindings) !== null && _122 !== void 0 ? _122 : []);
                defaultId_9 = (_126 = (_124 = (_123 = list.find(function (a) { return a.default; })) === null || _123 === void 0 ? void 0 : _123.id) !== null && _124 !== void 0 ? _124 : (_125 = list[0]) === null || _125 === void 0 ? void 0 : _125.id) !== null && _126 !== void 0 ? _126 : 'main';
                channelOwners_7 = {};
                bList_4.forEach(function (b) { var _a; var ch = (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; if (ch && (b === null || b === void 0 ? void 0 : b.agentId))
                    channelOwners_7[ch] = b.agentId; });
                configuredChannelTypes = Object.keys((_127 = config_2 === null || config_2 === void 0 ? void 0 : config_2.channels) !== null && _127 !== void 0 ? _127 : {}).filter(function (k) { var _a; return k !== 'defaults' && k !== 'modelByChannel' && typeof ((_a = config_2 === null || config_2 === void 0 ? void 0 : config_2.channels) === null || _a === void 0 ? void 0 : _a[k]) === 'object'; });
                agents = list.map(function (a) {
                    var _a, _b, _c;
                    var agentChannels = bList_4.filter(function (b) { return (b === null || b === void 0 ? void 0 : b.agentId) === a.id; }).map(function (b) { var _a; return (_a = b === null || b === void 0 ? void 0 : b.match) === null || _a === void 0 ? void 0 : _a.channel; }).filter(Boolean);
                    return { id: a.id, name: (_a = a.name) !== null && _a !== void 0 ? _a : a.id, isDefault: a.id === defaultId_9, modelDisplay: '—', inheritedModel: true, workspace: (_b = a.workspace) !== null && _b !== void 0 ? _b : '—', agentDir: (_c = a.agentDir) !== null && _c !== void 0 ? _c : "~/.openclaw/agents/".concat(a.id, "/agent"), mainSessionKey: "".concat(a.id, ":main"), channelTypes: agentChannels };
                });
                return [2 /*return*/, { ok: true, data: { status: 200, json: { agents: agents, defaultAgentId: defaultId_9, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_7 }, ok: true }, success: true, status: 200, json: { agents: agents, defaultAgentId: defaultId_9, configuredChannelTypes: configuredChannelTypes, channelOwners: channelOwners_7 } }];
            case 211:
                err_36 = _146.sent();
                console.error('[HostAPI] /api/agents DELETE error:', err_36);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_36) }, ok: false }, success: false, status: 500, json: { error: String(err_36) } }];
            case 212:
                NODES_FILE = nodePath.join(os.homedir(), '.openclaw', 'data', 'nodes.json');
                if (path === '/api/nodes' && method === 'GET') {
                    try {
                        nodes = [];
                        if (fs.existsSync(NODES_FILE)) {
                            raw = fs.readFileSync(NODES_FILE, 'utf8');
                            data = JSON.parse(raw);
                            nodes = Object.values(data.nodes || {});
                        }
                        port = getResolvedGatewayPort();
                        localNode = {
                            id: 'local-gateway',
                            name: 'Gateway 本机',
                            type: 'gateway',
                            platform: process.platform,
                            status: 'online',
                            ip: '127.0.0.1',
                            port: port,
                            lastSeen: Date.now(),
                            metadata: { hostname: os.hostname(), os: process.platform, arch: process.arch },
                        };
                        json_14 = { nodes: __spreadArray([localNode], nodes, true) };
                        return [2 /*return*/, { ok: true, data: { status: 200, json: json_14, ok: true }, success: true, status: 200, json: json_14 }];
                    }
                    catch (err) {
                        console.error('[HostAPI] nodes list error:', err);
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { nodes: [] }, ok: true }, success: true, status: 200, json: { nodes: [] } }];
                    }
                }
                if (path === '/api/nodes' && method === 'POST' && body) {
                    try {
                        dir = nodePath.dirname(NODES_FILE);
                        if (!fs.existsSync(dir))
                            fs.mkdirSync(dir, { recursive: true });
                        data = { nodes: {}, version: 1, updatedAt: Date.now() };
                        if (fs.existsSync(NODES_FILE)) {
                            data = JSON.parse(fs.readFileSync(NODES_FILE, 'utf8'));
                        }
                        node = typeof body === 'string' ? JSON.parse(body) : body;
                        id = String(node.id || node.name || crypto.randomUUID());
                        if (!node.name || !node.type) {
                            return [2 /*return*/, { ok: false, data: { status: 400, json: { error: 'name and type required' }, ok: false }, success: false, status: 400, json: { error: 'name and type required' } }];
                        }
                        data.nodes = data.nodes || {};
                        data.nodes[id] = __assign(__assign({ id: id, name: node.name, type: node.type, ip: node.ip || '127.0.0.1', port: (_128 = node.port) !== null && _128 !== void 0 ? _128 : 18789 }, node), { lastSeen: Date.now(), status: node.status || 'offline' });
                        data.updatedAt = Date.now();
                        fs.writeFileSync(NODES_FILE, JSON.stringify(data, null, 2), 'utf8');
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true, node: data.nodes[id] }, ok: true }, success: true, status: 200, json: { success: true, node: data.nodes[id] } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] nodes add error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } }];
                    }
                }
                if (path.startsWith('/api/nodes/') && method === 'DELETE') {
                    try {
                        nodeId = path.replace('/api/nodes/', '').replace(/\/$/, '');
                        if (!nodeId || nodeId === 'local-gateway') {
                            return [2 /*return*/, { ok: false, data: { status: 400, json: { error: 'Cannot remove local gateway' }, ok: false }, success: false, status: 400, json: { error: 'Cannot remove local gateway' } }];
                        }
                        if (!fs.existsSync(NODES_FILE)) {
                            return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
                        }
                        data = JSON.parse(fs.readFileSync(NODES_FILE, 'utf8'));
                        data.nodes = data.nodes || {};
                        if (data.nodes[nodeId]) {
                            delete data.nodes[nodeId];
                            data.updatedAt = Date.now();
                            fs.writeFileSync(NODES_FILE, JSON.stringify(data, null, 2), 'utf8');
                        }
                        return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
                    }
                    catch (err) {
                        console.error('[HostAPI] nodes remove error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err) }, ok: false }, success: false, status: 500, json: { error: String(err) } }];
                    }
                }
                applySceneMatch = path.match(/^\/api\/agents\/([^/]+)\/apply-scene$/);
                if (!(applySceneMatch && method === 'POST' && body)) return [3 /*break*/, 219];
                _146.label = 213;
            case 213:
                _146.trys.push([213, 218, , 219]);
                agentId = decodeURIComponent(applySceneMatch[1]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                sceneId = String((payload === null || payload === void 0 ? void 0 : payload.sceneId) || '');
                if (!sceneId) {
                    return [2 /*return*/, { ok: false, data: { status: 400, json: { error: 'sceneId required' }, ok: false }, success: false, status: 400, json: { error: 'sceneId required' } }];
                }
                SCENE_TEMPLATES = {
                    'personal-assistant': {
                        soul: "# \u4E2A\u4EBA\u52A9\u7406\n\n\u4F60\u662F\u7528\u6237\u7684 AI \u9A71\u52A8\u4E2A\u4EBA\u52A9\u7406\uFF0C\u5E2E\u52A9\u7BA1\u7406\u65E5\u7A0B\u3001\u4EFB\u52A1\u548C\u63D0\u9192\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u4E2A\u4EBA\u52A9\u7406\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'email-butler': {
                        soul: "# \u90AE\u4EF6\u7BA1\u5BB6\n\n\u667A\u80FD\u90AE\u4EF6\u5206\u7C7B\u3001\u6458\u8981\u548C\u56DE\u590D\u52A9\u624B\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u90AE\u4EF6\u7BA1\u5BB6\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'schedule-management': {
                        soul: "# \u65E5\u7A0B\u7BA1\u7406\n\n\u667A\u80FD\u65E5\u7A0B\u7BA1\u7406\uFF0C\u652F\u6301\u51B2\u7A81\u68C0\u6D4B\u548C\u6392\u7A0B\u4F18\u5316\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u65E5\u7A0B\u7BA1\u7406\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'tech-assistant': {
                        soul: "# \u6280\u672F\u52A9\u624B\n\n\u7F16\u7A0B\u3001\u8C03\u8BD5\u3001\u4EE3\u7801\u5BA1\u67E5\u3001\u6280\u672F\u6587\u6863\u7F16\u5199\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u6280\u672F\u52A9\u624B\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'translator': {
                        soul: "# \u7FFB\u8BD1\u52A9\u624B\n\n\u591A\u8BED\u8A00\u7FFB\u8BD1\u3001\u672C\u5730\u5316\u3001\u672F\u8BED\u4E00\u81F4\u6027\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u7FFB\u8BD1\u52A9\u624B\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'writer': {
                        soul: "# \u5199\u4F5C\u52A9\u624B\n\n\u6587\u7AE0\u64B0\u5199\u3001\u6DA6\u8272\u3001\u7ED3\u6784\u5316\u5199\u4F5C\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u5199\u4F5C\u52A9\u624B\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                    'content-factory': {
                        soul: "# \u5185\u5BB9\u5DE5\u5382\n\n\u7814\u7A76 \u2192 \u64B0\u5199 \u2192 \u7F16\u8F91 \u2192 \u53D1\u5E03\u7684\u5B8C\u6574\u5185\u5BB9\u751F\u4EA7\u6D41\u6C34\u7EBF\u3002\n",
                        user: "# \u7528\u6237\u914D\u7F6E\n\n\u5185\u5BB9\u5DE5\u5382\u573A\u666F\u5DF2\u542F\u7528\u3002\n",
                    },
                };
                template = SCENE_TEMPLATES[sceneId] || SCENE_TEMPLATES['personal-assistant'];
                if (!(template === null || template === void 0 ? void 0 : template.soul)) return [3 /*break*/, 215];
                return [4 /*yield*/, callGatewayRpc('agents.files.set', { agentId: agentId, name: 'SOUL.md', content: template.soul })];
            case 214:
                _146.sent();
                _146.label = 215;
            case 215:
                if (!(template === null || template === void 0 ? void 0 : template.user)) return [3 /*break*/, 217];
                return [4 /*yield*/, callGatewayRpc('agents.files.set', { agentId: agentId, name: 'USER.md', content: template.user })];
            case 216:
                _146.sent();
                _146.label = 217;
            case 217: return [2 /*return*/, { ok: true, data: { status: 200, json: { success: true }, ok: true }, success: true, status: 200, json: { success: true } }];
            case 218:
                err_37 = _146.sent();
                console.error('[HostAPI] apply-scene error:', err_37);
                return [2 /*return*/, { ok: false, data: { status: 500, json: { error: String(err_37) }, ok: false }, success: false, status: 500, json: { error: String(err_37) } }];
            case 219:
                if (path === '/api/skills/configs' && method === 'GET') {
                    try {
                        configPath = nodePath.join(os.homedir(), '.openclaw', 'skills-config.json');
                        if (fs.existsSync(configPath)) {
                            raw = fs.readFileSync(configPath, 'utf8');
                            json_15 = JSON.parse(raw);
                            return [2 /*return*/, { ok: true, data: { status: 200, json: json_15, ok: true }, success: true, status: 200, json: json_15 }];
                        }
                        return [2 /*return*/, { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} }];
                    }
                    catch (_149) {
                        return [2 /*return*/, { ok: true, data: { status: 200, json: {}, ok: true }, success: true, status: 200, json: {} }];
                    }
                }
                STAGE_DIR = nodePath.join(os.tmpdir(), 'axonclaw-staged');
                if (!fs.existsSync(STAGE_DIR))
                    fs.mkdirSync(STAGE_DIR, { recursive: true });
                if (path === '/api/files/stage-paths' && method === 'POST' && body) {
                    try {
                        filePaths = JSON.parse(body).filePaths;
                        if (!Array.isArray(filePaths) || filePaths.length === 0) {
                            return [2 /*return*/, { ok: false, data: { status: 400, json: [] }, success: false }];
                        }
                        results = [];
                        for (_x = 0, filePaths_1 = filePaths; _x < filePaths_1.length; _x++) {
                            srcPath = filePaths_1[_x];
                            fileName = srcPath.split(/[\\/]/).pop() || 'file';
                            ext = nodePath.extname(fileName);
                            id = crypto.randomUUID();
                            stagedPath = nodePath.join(STAGE_DIR, "".concat(id).concat(ext));
                            fs.copyFileSync(srcPath, stagedPath);
                            stat = fs.statSync(stagedPath);
                            mimeMap = {
                                '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
                                '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf',
                            };
                            mimeType = mimeMap[ext.toLowerCase()] || 'application/octet-stream';
                            preview = null;
                            if (mimeType.startsWith('image/')) {
                                try {
                                    buf = fs.readFileSync(stagedPath);
                                    preview = "data:".concat(mimeType, ";base64,").concat(buf.toString('base64'));
                                }
                                catch (_150) {
                                    /* ignore */
                                }
                            }
                            results.push({ id: id, fileName: fileName, mimeType: mimeType, fileSize: stat.size, stagedPath: stagedPath, preview: preview });
                        }
                        return [2 /*return*/, { ok: true, data: { status: 200, json: results }, success: true, json: results }];
                    }
                    catch (err) {
                        console.error('[HostAPI] stage-paths error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: [] }, success: false }];
                    }
                }
                if (path === '/api/files/stage-buffer' && method === 'POST' && body) {
                    try {
                        _y = JSON.parse(body), base64 = _y.base64, fileName = _y.fileName, mimeType = _y.mimeType;
                        if (!base64 || !fileName) {
                            return [2 /*return*/, { ok: false, data: { status: 400, json: null }, success: false }];
                        }
                        id = crypto.randomUUID();
                        ext = nodePath.extname(fileName) || ((mimeType === null || mimeType === void 0 ? void 0 : mimeType.startsWith('image/')) ? '.png' : '.bin');
                        stagedPath = nodePath.join(STAGE_DIR, "".concat(id).concat(ext));
                        buf = Buffer.from(base64, 'base64');
                        fs.writeFileSync(stagedPath, buf);
                        mime = mimeType || 'application/octet-stream';
                        preview = null;
                        if (mime.startsWith('image/')) {
                            preview = "data:".concat(mime, ";base64,").concat(base64);
                        }
                        result = { id: id, fileName: fileName, mimeType: mime, fileSize: buf.length, stagedPath: stagedPath, preview: preview };
                        return [2 /*return*/, { ok: true, data: { status: 200, json: result }, success: true, json: result }];
                    }
                    catch (err) {
                        console.error('[HostAPI] stage-buffer error:', err);
                        return [2 /*return*/, { ok: false, data: { status: 500, json: null }, success: false }];
                    }
                }
                if (!(path === '/api/scheduler/summary' && method === 'GET')) return [3 /*break*/, 226];
                _146.label = 220;
            case 220:
                _146.trys.push([220, 225, , 226]);
                jobList = [];
                cronEnabled = true;
                try {
                    cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
                    if (fs.existsSync(cfgPath)) {
                        raw = fs.readFileSync(cfgPath, 'utf8');
                        config = parseOpenclawConfigText(raw);
                        cron = config === null || config === void 0 ? void 0 : config.cron;
                        cronEnabled = (cron === null || cron === void 0 ? void 0 : cron.enabled) !== false;
                    }
                }
                catch (_151) {
                    /* ignore */
                }
                _146.label = 221;
            case 221:
                _146.trys.push([221, 223, , 224]);
                return [4 /*yield*/, callGatewayRpc('cron.list', {}, 8000)];
            case 222:
                r = _146.sent();
                if (r.ok && Array.isArray(r.result)) {
                    jobList = r.result;
                }
                return [3 /*break*/, 224];
            case 223:
                _z = _146.sent();
                cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
                if (fs.existsSync(cfgPath)) {
                    raw = fs.readFileSync(cfgPath, 'utf8');
                    config = parseOpenclawConfigText(raw);
                    cron = config === null || config === void 0 ? void 0 : config.cron;
                    cronEnabled = (cron === null || cron === void 0 ? void 0 : cron.enabled) !== false;
                    tasks = ((_129 = cron === null || cron === void 0 ? void 0 : cron.tasks) !== null && _129 !== void 0 ? _129 : cron === null || cron === void 0 ? void 0 : cron.jobs);
                    if (Array.isArray(tasks))
                        jobList = tasks;
                }
                return [3 /*break*/, 224];
            case 224:
                enabledJobs = jobList.filter(function (j) { return j.enabled !== false; });
                nextWakeup = '—';
                nextTs = null;
                for (_0 = 0, enabledJobs_1 = enabledJobs; _0 < enabledJobs_1.length; _0++) {
                    j = enabledJobs_1[_0];
                    if (j.nextRun) {
                        t = new Date(j.nextRun).getTime();
                        if (!nextTs || t < nextTs)
                            nextTs = t;
                    }
                }
                if (nextTs && nextTs > Date.now()) {
                    min = Math.floor((nextTs - Date.now()) / 60000);
                    if (min < 1)
                        nextWakeup = '即将';
                    else if (min < 60)
                        nextWakeup = "".concat(min, " \u5206\u949F\u540E");
                    else
                        nextWakeup = "".concat(Math.floor(min / 60), " \u5C0F\u65F6\u540E");
                }
                summary = {
                    status: cronEnabled ? 'enabled' : 'disabled',
                    statusText: cronEnabled ? '已启用' : '已禁用',
                    taskCount: jobList.length,
                    nextWakeup: nextWakeup,
                    running: 0,
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: summary, ok: true },
                        success: true,
                        status: 200,
                        json: summary,
                    }];
            case 225:
                err_38 = _146.sent();
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { status: 'enabled', statusText: '已启用', taskCount: 0, nextWakeup: '—', running: 0 }, ok: true },
                        success: true,
                        status: 200,
                        json: { status: 'enabled', statusText: '已启用', taskCount: 0, nextWakeup: '—', running: 0 },
                    }];
            case 226:
                if (!(path === '/api/cron/jobs' && method === 'GET')) return [3 /*break*/, 230];
                _146.label = 227;
            case 227:
                _146.trys.push([227, 229, , 230]);
                return [4 /*yield*/, callGatewayRpc('cron.list', {}, 10000)];
            case 228:
                r = _146.sent();
                if (!r.ok || !r.result) {
                    return [2 /*return*/, {
                            ok: true,
                            data: { status: 200, json: [], ok: true },
                            success: true,
                            status: 200,
                            json: [],
                        }];
                }
                list = Array.isArray(r.result) ? r.result : [];
                jobs = list.map(function (t) {
                    var _a, _b, _c, _d;
                    return ({
                        id: String((_a = t.id) !== null && _a !== void 0 ? _a : ''),
                        name: String((_b = t.name) !== null && _b !== void 0 ? _b : ''),
                        message: String((_c = t.command) !== null && _c !== void 0 ? _c : ''),
                        schedule: (_d = t.schedule) !== null && _d !== void 0 ? _d : '',
                        enabled: t.enabled !== false,
                        createdAt: '',
                        updatedAt: '',
                        lastRun: t.lastRun ? { time: t.lastRun, success: t.status !== 'error', error: t.error } : undefined,
                        nextRun: t.nextRun,
                    });
                });
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: jobs, ok: true },
                        success: true,
                        status: 200,
                        json: jobs,
                    }];
            case 229:
                err_39 = _146.sent();
                // Gateway 可能未实现 cron.list，尝试从 config 读取
                try {
                    cfgPath = nodePath.join(os.homedir(), '.openclaw', 'openclaw.json');
                    if (fs.existsSync(cfgPath)) {
                        raw = fs.readFileSync(cfgPath, 'utf8');
                        config = parseOpenclawConfigText(raw);
                        cron = config === null || config === void 0 ? void 0 : config.cron;
                        tasks = ((_130 = cron === null || cron === void 0 ? void 0 : cron.tasks) !== null && _130 !== void 0 ? _130 : cron === null || cron === void 0 ? void 0 : cron.jobs);
                        if (Array.isArray(tasks)) {
                            jobs = tasks.map(function (t, i) {
                                var _a, _b, _c, _d, _f, _g, _h, _j, _k;
                                var s = (_b = (_a = t.schedule) !== null && _a !== void 0 ? _a : t.expr) !== null && _b !== void 0 ? _b : t.cron;
                                var expr = typeof s === 'string' ? s : (s && typeof s === 'object' && 'expr' in s ? String(s.expr) : '0 9 * * *');
                                return {
                                    id: String((_d = (_c = t.id) !== null && _c !== void 0 ? _c : t.taskId) !== null && _d !== void 0 ? _d : "cfg-".concat(i)),
                                    name: String((_g = (_f = t.name) !== null && _f !== void 0 ? _f : t.label) !== null && _g !== void 0 ? _g : "Task ".concat(i + 1)),
                                    message: String((_k = (_j = (_h = t.message) !== null && _h !== void 0 ? _h : t.command) !== null && _j !== void 0 ? _j : t.prompt) !== null && _k !== void 0 ? _k : ''),
                                    schedule: expr,
                                    enabled: t.enabled !== false,
                                    createdAt: '',
                                    updatedAt: '',
                                    lastRun: undefined,
                                    nextRun: undefined,
                                };
                            });
                            return [2 /*return*/, {
                                    ok: true,
                                    data: { status: 200, json: jobs, ok: true },
                                    success: true,
                                    status: 200,
                                    json: jobs,
                                }];
                        }
                    }
                }
                catch (_152) {
                    /* ignore config fallback */
                }
                console.error('[HostAPI] cron.list error:', err_39);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_39) },
                        data: { status: 500, json: { error: String(err_39) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_39) },
                    }];
            case 230:
                if (!(path === '/api/cron/jobs' && method === 'POST' && body)) return [3 /*break*/, 234];
                _146.label = 231;
            case 231:
                _146.trys.push([231, 233, , 234]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                return [4 /*yield*/, callGatewayRpc('cron.create', {
                        name: (_131 = payload === null || payload === void 0 ? void 0 : payload.name) !== null && _131 !== void 0 ? _131 : 'New Task',
                        schedule: (_132 = payload === null || payload === void 0 ? void 0 : payload.schedule) !== null && _132 !== void 0 ? _132 : '0 9 * * *',
                        command: (_133 = payload === null || payload === void 0 ? void 0 : payload.message) !== null && _133 !== void 0 ? _133 : '',
                        enabled: (payload === null || payload === void 0 ? void 0 : payload.enabled) !== false,
                    }, 10000)];
            case 232:
                r = _146.sent();
                if (!r.ok) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: (_134 = r.error) !== null && _134 !== void 0 ? _134 : 'Create failed' },
                            data: { status: 500, json: { error: r.error }, ok: false },
                            success: false,
                            status: 500,
                            json: { error: r.error },
                        }];
                }
                t = ((_135 = r.result) !== null && _135 !== void 0 ? _135 : {});
                job = {
                    id: String((_136 = t.id) !== null && _136 !== void 0 ? _136 : ''),
                    name: String((_137 = t.name) !== null && _137 !== void 0 ? _137 : ''),
                    message: String((_138 = t.command) !== null && _138 !== void 0 ? _138 : ''),
                    schedule: (_139 = t.schedule) !== null && _139 !== void 0 ? _139 : '',
                    enabled: t.enabled !== false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastRun: undefined,
                    nextRun: t.nextRun,
                };
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: job, ok: true },
                        success: true,
                        status: 200,
                        json: job,
                    }];
            case 233:
                err_40 = _146.sent();
                console.error('[HostAPI] cron.create error:', err_40);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_40) },
                        data: { status: 500, json: { error: String(err_40) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_40) },
                    }];
            case 234:
                cronJobIdMatch = path.match(/^\/api\/cron\/jobs\/([^/]+)$/);
                if (!(cronJobIdMatch && method === 'PUT' && body)) return [3 /*break*/, 238];
                taskId = decodeURIComponent(cronJobIdMatch[1]);
                _146.label = 235;
            case 235:
                _146.trys.push([235, 237, , 238]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                updates = {};
                if ((payload === null || payload === void 0 ? void 0 : payload.name) != null)
                    updates.name = payload.name;
                if ((payload === null || payload === void 0 ? void 0 : payload.message) != null)
                    updates.command = payload.message;
                if ((payload === null || payload === void 0 ? void 0 : payload.schedule) != null)
                    updates.schedule = payload.schedule;
                if ((payload === null || payload === void 0 ? void 0 : payload.enabled) != null)
                    updates.enabled = payload.enabled;
                return [4 /*yield*/, callGatewayRpc('cron.update', __assign({ taskId: taskId }, updates), 10000)];
            case 236:
                r = _146.sent();
                if (!r.ok) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: (_140 = r.error) !== null && _140 !== void 0 ? _140 : 'Update failed' },
                            data: { status: 500, json: { error: r.error }, ok: false },
                            success: false,
                            status: 500,
                            json: { error: r.error },
                        }];
                }
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 237:
                err_41 = _146.sent();
                console.error('[HostAPI] cron.update error:', err_41);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_41) },
                        data: { status: 500, json: { error: String(err_41) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_41) },
                    }];
            case 238:
                if (!(cronJobIdMatch && method === 'DELETE')) return [3 /*break*/, 242];
                taskId = decodeURIComponent(cronJobIdMatch[1]);
                _146.label = 239;
            case 239:
                _146.trys.push([239, 241, , 242]);
                return [4 /*yield*/, callGatewayRpc('cron.delete', { taskId: taskId }, 10000)];
            case 240:
                r = _146.sent();
                if (!r.ok) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: (_141 = r.error) !== null && _141 !== void 0 ? _141 : 'Delete failed' },
                            data: { status: 500, json: { error: r.error }, ok: false },
                            success: false,
                            status: 500,
                            json: { error: r.error },
                        }];
                }
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 241:
                err_42 = _146.sent();
                console.error('[HostAPI] cron.delete error:', err_42);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_42) },
                        data: { status: 500, json: { error: String(err_42) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_42) },
                    }];
            case 242:
                if (!(path === '/api/cron/toggle' && method === 'POST' && body)) return [3 /*break*/, 246];
                _146.label = 243;
            case 243:
                _146.trys.push([243, 245, , 246]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                taskId = payload === null || payload === void 0 ? void 0 : payload.id;
                if (!taskId) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: 'id required' },
                            data: { status: 400, json: { error: 'id required' }, ok: false },
                            success: false,
                            status: 400,
                            json: { error: 'id required' },
                        }];
                }
                return [4 /*yield*/, callGatewayRpc('cron.update', { taskId: taskId, enabled: payload === null || payload === void 0 ? void 0 : payload.enabled }, 10000)];
            case 244:
                r = _146.sent();
                if (!r.ok) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: (_142 = r.error) !== null && _142 !== void 0 ? _142 : 'Toggle failed' },
                            data: { status: 500, json: { error: r.error }, ok: false },
                            success: false,
                            status: 500,
                            json: { error: r.error },
                        }];
                }
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 245:
                err_43 = _146.sent();
                console.error('[HostAPI] cron.toggle error:', err_43);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_43) },
                        data: { status: 500, json: { error: String(err_43) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_43) },
                    }];
            case 246:
                if (!(path === '/api/cron/trigger' && method === 'POST' && body)) return [3 /*break*/, 250];
                _146.label = 247;
            case 247:
                _146.trys.push([247, 249, , 250]);
                payload = typeof body === 'string' ? JSON.parse(body) : body;
                taskId = payload === null || payload === void 0 ? void 0 : payload.id;
                if (!taskId) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: 'id required' },
                            data: { status: 400, json: { error: 'id required' }, ok: false },
                            success: false,
                            status: 400,
                            json: { error: 'id required' },
                        }];
                }
                return [4 /*yield*/, callGatewayRpc('cron.run', { taskId: taskId }, 15000)];
            case 248:
                r = _146.sent();
                if (!r.ok) {
                    return [2 /*return*/, {
                            ok: false,
                            error: { message: (_143 = r.error) !== null && _143 !== void 0 ? _143 : 'Trigger failed' },
                            data: { status: 500, json: { error: r.error }, ok: false },
                            success: false,
                            status: 500,
                            json: { error: r.error },
                        }];
                }
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { success: true }, ok: true },
                        success: true,
                        status: 200,
                        json: { success: true },
                    }];
            case 249:
                err_44 = _146.sent();
                console.error('[HostAPI] cron.trigger error:', err_44);
                return [2 /*return*/, {
                        ok: false,
                        error: { message: String(err_44) },
                        data: { status: 500, json: { error: String(err_44) }, ok: false },
                        success: false,
                        status: 500,
                        json: { error: String(err_44) },
                    }];
            case 250:
                if (!((path === '/api/cron/history' || path.startsWith('/api/cron/history?')) && method === 'GET')) return [3 /*break*/, 261];
                _146.label = 251;
            case 251:
                _146.trys.push([251, 260, , 261]);
                url_4 = new URL(path, 'http://localhost');
                limit = Math.min(parseInt(url_4.searchParams.get('limit') || '50', 10) || 50, 200);
                jobId = url_4.searchParams.get('jobId') || undefined;
                entries = [];
                _146.label = 252;
            case 252:
                _146.trys.push([252, 254, , 255]);
                return [4 /*yield*/, callGatewayRpc('cron.history', { limit: limit, taskId: jobId }, 5000)];
            case 253:
                r = _146.sent();
                if (r.ok && Array.isArray(r.result)) {
                    entries = r.result.map(function (e, i) {
                        var _a, _b, _c, _d;
                        return ({
                            id: String((_a = e.id) !== null && _a !== void 0 ? _a : "gh-".concat(i)),
                            jobId: String((_b = e.taskId) !== null && _b !== void 0 ? _b : ''),
                            jobName: String((_c = e.taskName) !== null && _c !== void 0 ? _c : ''),
                            time: String((_d = e.time) !== null && _d !== void 0 ? _d : ''),
                            success: e.success !== false,
                            error: e.error,
                        });
                    });
                }
                return [3 /*break*/, 255];
            case 254:
                _1 = _146.sent();
                return [3 /*break*/, 255];
            case 255:
                if (!(entries.length === 0)) return [3 /*break*/, 259];
                _146.label = 256;
            case 256:
                _146.trys.push([256, 258, , 259]);
                return [4 /*yield*/, callGatewayRpc('cron.list', {}, 8000)];
            case 257:
                r = _146.sent();
                jobs = Array.isArray(r.result) ? r.result : [];
                for (_2 = 0, jobs_1 = jobs; _2 < jobs_1.length; _2++) {
                    j = jobs_1[_2];
                    t = j;
                    if (!t.lastRun)
                        continue;
                    if (jobId && String(t.id) !== jobId)
                        continue;
                    entries.push({
                        id: "last-".concat(t.id, "-").concat(t.lastRun),
                        jobId: String((_144 = t.id) !== null && _144 !== void 0 ? _144 : ''),
                        jobName: String((_145 = t.name) !== null && _145 !== void 0 ? _145 : ''),
                        time: String(t.lastRun),
                        success: t.status !== 'error',
                        error: t.error,
                    });
                }
                entries.sort(function (a, b) { return new Date(b.time).getTime() - new Date(a.time).getTime(); });
                entries = entries.slice(0, limit);
                return [3 /*break*/, 259];
            case 258:
                _3 = _146.sent();
                return [3 /*break*/, 259];
            case 259: return [2 /*return*/, {
                    ok: true,
                    data: { status: 200, json: { entries: entries }, ok: true },
                    success: true,
                    status: 200,
                    json: { entries: entries },
                }];
            case 260:
                err_45 = _146.sent();
                console.error('[HostAPI] cron.history error:', err_45);
                return [2 /*return*/, {
                        ok: true,
                        data: { status: 200, json: { entries: [] }, ok: true },
                        success: true,
                        status: 200,
                        json: { entries: [] },
                    }];
            case 261:
                if (!path.startsWith('/api/v1/multi-agent')) return [3 /*break*/, 276];
                bases = ["http://127.0.0.1:".concat(AXONCLAWX_HTTP_PORT)];
                lastErr = null;
                _4 = 0, bases_2 = bases;
                _146.label = 262;
            case 262:
                if (!(_4 < bases_2.length)) return [3 /*break*/, 275];
                base = bases_2[_4];
                _146.label = 263;
            case 263:
                _146.trys.push([263, 273, , 274]);
                return [4 /*yield*/, fetch("".concat(base).concat(path), {
                        method: method || 'GET',
                        headers: __assign({ 'Content-Type': 'application/json' }, (headers && typeof headers === 'object' ? headers : {})),
                        body: body || undefined,
                        signal: AbortSignal.timeout(120000),
                    })];
            case 264:
                response_1 = _146.sent();
                json_16 = undefined;
                text_2 = undefined;
                contentType_1 = response_1.headers.get('content-type') || '';
                if (!contentType_1.includes('application/json')) return [3 /*break*/, 270];
                _146.label = 265;
            case 265:
                _146.trys.push([265, 267, , 269]);
                return [4 /*yield*/, response_1.json()];
            case 266:
                json_16 = _146.sent();
                return [3 /*break*/, 269];
            case 267:
                _5 = _146.sent();
                return [4 /*yield*/, response_1.text()];
            case 268:
                text_2 = _146.sent();
                return [3 /*break*/, 269];
            case 269: return [3 /*break*/, 272];
            case 270: return [4 /*yield*/, response_1.text()];
            case 271:
                text_2 = _146.sent();
                _146.label = 272;
            case 272: return [2 /*return*/, {
                    ok: true,
                    data: {
                        status: response_1.status,
                        ok: response_1.ok,
                        json: json_16,
                        text: text_2,
                    },
                    success: response_1.ok,
                    status: response_1.status,
                    json: json_16,
                    text: text_2,
                }];
            case 273:
                e_2 = _146.sent();
                lastErr = e_2 instanceof Error ? e_2.message : String(e_2);
                return [3 /*break*/, 274];
            case 274:
                _4++;
                return [3 /*break*/, 262];
            case 275: return [2 /*return*/, {
                    ok: false,
                    error: { message: lastErr || 'AxonClawX 多代理 API 不可用（请启动 AxonClawX 或检查 18080 端口）' },
                    success: false,
                }];
            case 276:
                url = "".concat(getGatewayApiBase()).concat(path);
                console.log("[HostAPI] ".concat(method, " ").concat(path));
                return [4 /*yield*/, fetch(url, {
                        method: method || 'GET',
                        headers: __assign({ 'Content-Type': 'application/json' }, headers),
                        body: body || undefined,
                    })];
            case 277:
                response = _146.sent();
                json = undefined;
                text = undefined;
                contentType = response.headers.get('content-type') || '';
                if (!contentType.includes('application/json')) return [3 /*break*/, 283];
                _146.label = 278;
            case 278:
                _146.trys.push([278, 280, , 282]);
                return [4 /*yield*/, response.json()];
            case 279:
                json = _146.sent();
                return [3 /*break*/, 282];
            case 280:
                _6 = _146.sent();
                return [4 /*yield*/, response.text()];
            case 281:
                text = _146.sent();
                return [3 /*break*/, 282];
            case 282: return [3 /*break*/, 285];
            case 283: return [4 /*yield*/, response.text()];
            case 284:
                text = _146.sent();
                _146.label = 285;
            case 285: return [2 /*return*/, {
                    ok: true,
                    data: {
                        status: response.status,
                        ok: response.ok,
                        json: json,
                        text: text,
                    },
                    success: response.ok,
                    status: response.status,
                    json: json,
                    text: text,
                }];
            case 286:
                error_5 = _146.sent();
                message = error_5 instanceof Error ? error_5.message : String(error_5);
                console.error("[HostAPI] Error: ".concat(message));
                return [2 /*return*/, {
                        ok: false,
                        error: { message: message },
                        success: false,
                    }];
            case 287: return [2 /*return*/];
        }
    });
}); });
// Export for testing
export { mainWindow };
