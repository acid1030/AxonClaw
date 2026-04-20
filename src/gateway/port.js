/**
 * Gateway 端口解析与连接检测
 * 1. 扫描进程中 OpenClaw 实际监听端口
 * 2. 从 openclaw.json 读取配置端口
 * 3. 多端口探测（18789、18791、18792）
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GATEWAY_TOKEN } from './constants';
var execAsync = promisify(exec);
var DEFAULT_PORT = 18789;
var FALLBACK_PORTS = [18789, 18791, 18792, 18080]; // OpenClaw 18789/18791/18792，AxonClawX Web UI 18080
var CHECK_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || GATEWAY_TOKEN;
/** 从 ~/.openclaw/openclaw.json 读取 gateway.port */
export function readGatewayPortFromConfig() {
    try {
        var configPath = path.join(os.homedir(), '.openclaw', 'openclaw.json');
        if (!fs.existsSync(configPath))
            return DEFAULT_PORT;
        var raw = fs.readFileSync(configPath, 'utf8');
        var cleaned = raw
            .replace(/\/\/[^\n]*/g, '')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/,(\s*[}\]])/g, '$1');
        var json = JSON.parse(cleaned);
        var gw = json === null || json === void 0 ? void 0 : json.gateway;
        var port = gw === null || gw === void 0 ? void 0 : gw.port;
        if (typeof port === 'number' && port > 0 && port <= 65535)
            return port;
        if (typeof port === 'string') {
            var n = parseInt(port, 10);
            if (!isNaN(n) && n > 0 && n <= 65535)
                return n;
        }
    }
    catch (_a) {
        /* ignore */
    }
    return DEFAULT_PORT;
}
/** 缓存已解析端口：checkConnection 成功后写入 */
var resolvedPortCache = null;
export function getResolvedGatewayPort() {
    return resolvedPortCache !== null && resolvedPortCache !== void 0 ? resolvedPortCache : readGatewayPortFromConfig();
}
export function setResolvedGatewayPort(port) {
    resolvedPortCache = port;
}
export function clearResolvedGatewayPort() {
    resolvedPortCache = null;
}
/** 尝试连接指定端口的 WebSocket，完成 connect 握手 */
function tryConnect(port_1) {
    return __awaiter(this, arguments, void 0, function (port, timeoutMs) {
        if (timeoutMs === void 0) { timeoutMs = 5000; }
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (resolve) {
                    var WebSocket = require('ws');
                    var ws = new WebSocket("ws://127.0.0.1:".concat(port, "/ws"));
                    var resolved = false;
                    var once = function (r) {
                        if (resolved)
                            return;
                        resolved = true;
                        try {
                            ws.close();
                        }
                        catch (_a) {
                            /* ignore */
                        }
                        resolve(r);
                    };
                    var timeout = setTimeout(function () { return once({ success: false, error: 'Timeout' }); }, timeoutMs);
                    ws.on('error', function () { return once({ success: false, error: 'Connection refused' }); });
                    ws.on('close', function () {
                        if (!resolved)
                            once({ success: false, error: 'Connection closed' });
                    });
                    ws.on('message', function (data) {
                        var _a, _b, _c;
                        try {
                            var msg = JSON.parse(data.toString());
                            if (msg.type === 'event' && msg.event === 'connect.challenge') {
                                ws.send(JSON.stringify({
                                    type: 'req',
                                    id: 'chk-' + Date.now(),
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
                                        auth: { token: CHECK_TOKEN },
                                        role: 'operator',
                                        scopes: ['operator.admin', 'operator.read', 'operator.write'],
                                    },
                                }));
                                return;
                            }
                            if (msg.type === 'res' && String(msg.id).startsWith('chk-')) {
                                clearTimeout(timeout);
                                once({ success: !!msg.ok, error: msg.ok ? undefined : ((_c = (_b = (_a = msg.error) === null || _a === void 0 ? void 0 : _a.message) !== null && _b !== void 0 ? _b : msg.error) !== null && _c !== void 0 ? _c : 'Connect failed') });
                            }
                        }
                        catch (_d) {
                            /* ignore parse errors */
                        }
                    });
                })];
        });
    });
}
/**
 * 从系统进程中检测 OpenClaw 监听的端口
 * macOS/Linux: lsof 查找 openclaw 进程的 TCP LISTEN 端口
 */
function detectOpenClawPortFromProcess() {
    return __awaiter(this, void 0, void 0, function () {
        var ports, platform, stdout, re, m, p, netOut, lines, _i, lines_1, line, m, p, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    ports = [];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    platform = os.platform();
                    if (!(platform === 'darwin' || platform === 'linux')) return [3 /*break*/, 3];
                    return [4 /*yield*/, execAsync("lsof -iTCP -sTCP:LISTEN -P -n 2>/dev/null | grep -iE 'openclaw|axonclaw' || true", { timeout: 3000, maxBuffer: 64 * 1024 })];
                case 2:
                    stdout = (_b.sent()).stdout;
                    re = /:(\d+)\s*\(LISTEN\)/g;
                    m = void 0;
                    while ((m = re.exec(stdout)) !== null) {
                        p = parseInt(m[1], 10);
                        if (p > 0 && p <= 65535 && !ports.includes(p))
                            ports.push(p);
                    }
                    return [3 /*break*/, 5];
                case 3:
                    if (!(platform === 'win32')) return [3 /*break*/, 5];
                    return [4 /*yield*/, execAsync('netstat -ano 2>nul', { timeout: 3000 })];
                case 4:
                    netOut = (_b.sent()).stdout;
                    lines = netOut.split(/\r?\n/).filter(function (l) { return l.includes('LISTENING') && l.includes('127.0.0.1'); });
                    for (_i = 0, lines_1 = lines; _i < lines_1.length; _i++) {
                        line = lines_1[_i];
                        m = line.match(/:(\d+)\s+127\.0\.0\.1/);
                        if (m) {
                            p = parseInt(m[1], 10);
                            if (p > 0 && p <= 65535 && !ports.includes(p))
                                ports.push(p);
                        }
                    }
                    // 简单取常见端口，Windows 上难以精确匹配 openclaw 进程
                    if (ports.length === 0)
                        ports.push.apply(ports, FALLBACK_PORTS);
                    _b.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    _a = _b.sent();
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/, ports];
            }
        });
    });
}
/**
 * 探测 Gateway 可用端口：
 * 1. 从进程中检测 OpenClaw 实际监听端口
 * 2. 配置端口 + 常见端口 18789/18791/18792
 */
export function resolveGatewayPort() {
    return __awaiter(this, void 0, void 0, function () {
        var processPorts, configPort, portsToTry, _i, portsToTry_1, p, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, detectOpenClawPortFromProcess()];
                case 1:
                    processPorts = _a.sent();
                    configPort = readGatewayPortFromConfig();
                    portsToTry = Array.from(new Set(__spreadArray(__spreadArray(__spreadArray([], processPorts, true), [configPort], false), FALLBACK_PORTS, true)));
                    _i = 0, portsToTry_1 = portsToTry;
                    _a.label = 2;
                case 2:
                    if (!(_i < portsToTry_1.length)) return [3 /*break*/, 5];
                    p = portsToTry_1[_i];
                    return [4 /*yield*/, tryConnect(p, 4000)];
                case 3:
                    result = _a.sent();
                    if (result.success) {
                        setResolvedGatewayPort(p);
                        return [2 /*return*/, { success: true, port: p }];
                    }
                    _a.label = 4;
                case 4:
                    _i++;
                    return [3 /*break*/, 2];
                case 5:
                    clearResolvedGatewayPort();
                    return [2 /*return*/, { success: false, error: "\u65E0\u6CD5\u8FDE\u63A5 Gateway\uFF0C\u5DF2\u5C1D\u8BD5\u7AEF\u53E3: ".concat(portsToTry.join(', ')) }];
            }
        });
    });
}
