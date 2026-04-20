/**
 * Gateway RPC - 主进程调用 OpenClaw Gateway JSON-RPC
 * 供 hostapi 等模块使用，与 gateway:rpc IPC 共享逻辑
 */
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
import { getResolvedGatewayPort, resolveGatewayPort, setResolvedGatewayPort } from './port';
import { GATEWAY_TOKEN } from './constants';
import { getSetting, isInitialized } from '../database';
var GW_MODE_KEY = 'gateway.connection.mode';
var GW_REMOTE_PROTOCOL_KEY = 'gateway.remote.protocol';
var GW_REMOTE_HOST_KEY = 'gateway.remote.host';
var GW_REMOTE_PORT_KEY = 'gateway.remote.port';
var GW_REMOTE_TOKEN_KEY = 'gateway.remote.token';
function getGatewayRuntimeConfig() {
    var defaults = {
        mode: 'local',
        protocol: 'ws',
        host: '127.0.0.1',
        port: getResolvedGatewayPort(),
        token: GATEWAY_TOKEN,
    };
    try {
        if (!isInitialized())
            return defaults;
        var modeRaw = (getSetting(GW_MODE_KEY) || 'local').toLowerCase();
        if (modeRaw !== 'remote')
            return defaults;
        var protocolRaw = (getSetting(GW_REMOTE_PROTOCOL_KEY) || 'ws').toLowerCase();
        var protocol = protocolRaw === 'wss' ? 'wss' : 'ws';
        var host = (getSetting(GW_REMOTE_HOST_KEY) || '').trim();
        var portRaw = parseInt(getSetting(GW_REMOTE_PORT_KEY) || '', 10);
        var token = (getSetting(GW_REMOTE_TOKEN_KEY) || '').trim() || GATEWAY_TOKEN;
        var port = Number.isFinite(portRaw) && portRaw > 0 && portRaw <= 65535 ? portRaw : 18789;
        if (!host)
            return defaults;
        return { mode: 'remote', protocol: protocol, host: host, port: port, token: token };
    }
    catch (_a) {
        return defaults;
    }
}
function getGatewayWsUrl() {
    var cfg = getGatewayRuntimeConfig();
    return "".concat(cfg.protocol, "://").concat(cfg.host, ":").concat(cfg.port, "/ws");
}
function getGatewayToken() {
    return getGatewayRuntimeConfig().token;
}
/** 是否为连接类错误（可尝试重新探测端口后重试） */
function isConnectionError(err) {
    var msg = String(err !== null && err !== void 0 ? err : '').toLowerCase();
    return (msg.includes('timeout') ||
        msg.includes('websocket error') ||
        msg.includes('connection closed') ||
        msg.includes('connection refused') ||
        msg.includes('econnrefused') ||
        msg.includes('econnreset'));
}
/**
 * 调用 Gateway JSON-RPC（主进程内使用）
 */
export function callGatewayRpc(method_1) {
    return __awaiter(this, arguments, void 0, function (method, params, timeoutMs) {
        var WebSocket, ws;
        if (params === void 0) { params = {}; }
        if (timeoutMs === void 0) { timeoutMs = 30000; }
        return __generator(this, function (_a) {
            WebSocket = require('ws');
            ws = new WebSocket(getGatewayWsUrl());
            return [2 /*return*/, new Promise(function (resolve) {
                    var resolved = false;
                    var timeoutId = setTimeout(function () {
                        if (!resolved) {
                            resolved = true;
                            try {
                                ws.close();
                            }
                            catch (_a) {
                                /* ignore */
                            }
                            resolve({ success: false, ok: false, error: 'Timeout' });
                        }
                    }, timeoutMs);
                    var doRpc = function () {
                        ws.send(JSON.stringify({
                            type: 'req',
                            id: "rpc-".concat(Date.now()),
                            method: method,
                            params: params,
                        }));
                    };
                    ws.on('message', function (data) {
                        var _a, _b, _c, _d;
                        try {
                            var msg = JSON.parse(data.toString());
                            if (msg.type === 'event' && msg.event === 'connect.challenge') {
                                ws.send(JSON.stringify({
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
                                        auth: { token: getGatewayToken() },
                                        role: 'operator',
                                        scopes: ['operator.admin', 'operator.read', 'operator.write'],
                                    },
                                }));
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
                                        error: String((_c = (_b = (_a = msg.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg.error) !== null && _c !== void 0 ? _c : 'Connect failed'),
                                    });
                                    return;
                                }
                                var grantedScopes = (msg.result && msg.result.scopes) || (msg.payload && msg.payload.scopes);
                                if (Array.isArray(grantedScopes) && !grantedScopes.includes('operator.write')) {
                                    console.warn("[GatewayRPC] " + method + " operator.write NOT in granted scopes:", grantedScopes);
                                }
                                doRpc();
                                return;
                            }
                            if (msg.type === 'res' && String(msg.id).startsWith('rpc-')) {
                                if (!resolved) {
                                    resolved = true;
                                    clearTimeout(timeoutId);
                                    ws.close();
                                    var ok = msg.ok !== false && !msg.error;
                                    var result = (_d = msg.result) !== null && _d !== void 0 ? _d : msg.payload;
                                    var error = msg.error != null
                                        ? String(typeof msg.error === 'object' && msg.error && 'message' in msg.error
                                            ? msg.error.message
                                            : msg.error)
                                        : undefined;
                                    resolve({ success: ok, ok: ok, result: result, error: error });
                                }
                            }
                        }
                        catch (_e) {
                            /* ignore parse errors */
                        }
                    });
                    ws.on('error', function () {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve({ success: false, ok: false, error: 'WebSocket error' });
                        }
                    });
                    ws.on('close', function () {
                        if (!resolved) {
                            resolved = true;
                            clearTimeout(timeoutId);
                            resolve({ success: false, ok: false, error: 'Connection closed' });
                        }
                    });
                })];
        });
    });
}
/**
 * 带端口重试的 RPC：失败时重新探测端口并重试一次（用于智能代理等首次请求可能端口未缓存场景）
 */
export function callGatewayRpcWithRetry(method_1) {
    return __awaiter(this, arguments, void 0, function (method, params, timeoutMs) {
        var result, r;
        if (params === void 0) { params = {}; }
        if (timeoutMs === void 0) { timeoutMs = 30000; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, callGatewayRpc(method, params, timeoutMs)];
                case 1:
                    result = _a.sent();
                    if (result.ok)
                        return [2 /*return*/, result];
                    if (!isConnectionError(result.error))
                        return [2 /*return*/, result];
                    if (getGatewayRuntimeConfig().mode === 'remote') {
                        return [2 /*return*/, result];
                    }
                    return [4 /*yield*/, resolveGatewayPort()];
                case 2:
                    r = _a.sent();
                    if (!(r.success && r.port)) return [3 /*break*/, 4];
                    setResolvedGatewayPort(r.port);
                    return [4 /*yield*/, callGatewayRpc(method, params, timeoutMs)];
                case 3:
                    result = _a.sent();
                    _a.label = 4;
                case 4: return [2 /*return*/, result];
            }
        });
    });
}
