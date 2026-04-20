/**
 * Gateway Lifecycle Management
 * Provides functions to start and stop the OpenClaw Gateway process
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
import { spawn } from 'child_process';
import { EventEmitter } from 'events';
/**
 * Gateway Lifecycle Manager
 * Manages the OpenClaw Gateway process lifecycle
 */
var GatewayLifecycleManager = /** @class */ (function (_super) {
    __extends(GatewayLifecycleManager, _super);
    function GatewayLifecycleManager() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.process = null;
        _this.port = 18789;
        _this.status = { state: 'stopped', port: _this.port };
        _this.startPromise = null;
        _this.stopPromise = null;
        return _this;
    }
    /**
     * Start the OpenClaw Gateway
     */
    GatewayLifecycleManager.prototype.start = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Prevent concurrent start
                        if (this.startPromise)
                            return [2 /*return*/, this.startPromise];
                        // Already running
                        if (this.status.state === 'running')
                            return [2 /*return*/];
                        this.startPromise = this.doStart();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, this.startPromise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        this.startPromise = null;
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GatewayLifecycleManager.prototype.doStart = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1, err;
            var _this = this;
            var _a, _b, _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        this.status = { state: 'starting', port: this.port };
                        console.log('[Gateway] Starting OpenClaw Gateway...');
                        this.emit('log', 'info', 'Starting OpenClaw Gateway...');
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        // Start OpenClaw Gateway as subprocess
                        this.process = spawn('openclaw', ['gateway', 'run', '--compact'], {
                            stdio: ['ignore', 'pipe', 'pipe'],
                            env: __assign(__assign({}, process.env), { 
                                // Ensure Gateway uses the correct port
                                OPENCLAW_GATEWAY_PORT: String(this.port) }),
                        });
                        // Handle stdout
                        (_a = this.process.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (data) {
                            var msg = data.toString().trim();
                            if (msg) {
                                console.log('[Gateway]', msg);
                                _this.emit('log', 'info', msg);
                            }
                        });
                        // Handle stderr
                        (_b = this.process.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (data) {
                            var msg = data.toString().trim();
                            if (msg) {
                                console.error('[Gateway Error]', msg);
                                _this.emit('log', 'error', msg);
                            }
                        });
                        // Handle process exit
                        this.process.on('exit', function (code, signal) {
                            var wasRunning = _this.status.state === 'running';
                            _this.status = {
                                state: 'stopped',
                                port: _this.port,
                                error: code !== 0 ? "Process exited with code ".concat(code) : undefined
                            };
                            _this.process = null;
                            if (wasRunning) {
                                console.log('[Gateway] Stopped with code:', code, 'signal:', signal);
                                _this.emit('stopped', code);
                                _this.emit('log', 'warn', "Gateway stopped (code: ".concat(code, ")"));
                            }
                        });
                        // Handle process error
                        this.process.on('error', function (error) {
                            console.error('[Gateway] Process error:', error);
                            _this.status = { state: 'error', port: _this.port, error: error.message };
                            _this.emit('error', error);
                            _this.emit('log', 'error', "Process error: ".concat(error.message));
                        });
                        // Wait for Gateway ready
                        return [4 /*yield*/, this.waitForReady()];
                    case 2:
                        // Wait for Gateway ready
                        _d.sent();
                        this.status = {
                            state: 'running',
                            port: this.port,
                            pid: (_c = this.process) === null || _c === void 0 ? void 0 : _c.pid
                        };
                        this.emit('started');
                        this.emit('log', 'info', "Gateway ready on port ".concat(this.port));
                        console.log('[Gateway] Ready on port', this.port);
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _d.sent();
                        err = error_1 instanceof Error ? error_1 : new Error(String(error_1));
                        this.status = { state: 'error', port: this.port, error: err.message };
                        this.emit('error', err);
                        this.emit('log', 'error', "Failed to start: ".concat(err.message));
                        // Clean up process if started
                        if (this.process) {
                            this.process.kill();
                            this.process = null;
                        }
                        throw err;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Stop the OpenClaw Gateway
     */
    GatewayLifecycleManager.prototype.stop = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Prevent concurrent stop
                        if (this.stopPromise)
                            return [2 /*return*/, this.stopPromise];
                        // Not running
                        if (!this.process && this.status.state !== 'running')
                            return [2 /*return*/];
                        this.stopPromise = this.doStop();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, , 3, 4]);
                        return [4 /*yield*/, this.stopPromise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        this.stopPromise = null;
                        return [7 /*endfinally*/];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    GatewayLifecycleManager.prototype.doStop = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.process)
                    return [2 /*return*/];
                console.log('[Gateway] Stopping...');
                this.emit('log', 'info', 'Stopping Gateway...');
                return [2 /*return*/, new Promise(function (resolve) {
                        var timeout = setTimeout(function () {
                            var _a;
                            console.log('[Gateway] Force killing after timeout');
                            (_a = _this.process) === null || _a === void 0 ? void 0 : _a.kill('SIGKILL');
                        }, 5000);
                        _this.process.once('exit', function () {
                            clearTimeout(timeout);
                            _this.process = null;
                            _this.status = { state: 'stopped', port: _this.port };
                            console.log('[Gateway] Stopped');
                            _this.emit('log', 'info', 'Gateway stopped');
                            resolve();
                        });
                        // Send SIGTERM for graceful shutdown
                        _this.process.kill('SIGTERM');
                    })];
            });
        });
    };
    /**
     * Get current Gateway status
     */
    GatewayLifecycleManager.prototype.getStatus = function () {
        return __assign({}, this.status);
    };
    /**
     * Check if Gateway is running
     */
    GatewayLifecycleManager.prototype.isRunning = function () {
        return this.status.state === 'running';
    };
    /**
     * Wait for Gateway to be ready by polling health endpoint
     */
    GatewayLifecycleManager.prototype.waitForReady = function () {
        return __awaiter(this, void 0, void 0, function () {
            var maxAttempts, intervalMs, i, response, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        maxAttempts = 60;
                        intervalMs = 500;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < maxAttempts)) return [3 /*break*/, 8];
                        // Check if process is still alive
                        if (!this.process || this.process.killed) {
                            throw new Error('Gateway process died during startup');
                        }
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, fetch("http://127.0.0.1:".concat(this.port, "/health"), {
                                method: 'GET',
                                signal: AbortSignal.timeout(2000),
                            })];
                    case 3:
                        response = _a.sent();
                        if (response.ok) {
                            return [2 /*return*/];
                        }
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _a.sent();
                        return [3 /*break*/, 5];
                    case 5: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, intervalMs); })];
                    case 6:
                        _a.sent();
                        _a.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 1];
                    case 8: throw new Error("Gateway startup timeout after ".concat((maxAttempts * intervalMs) / 1000, "s"));
                }
            });
        });
    };
    return GatewayLifecycleManager;
}(EventEmitter));
// Global singleton instance
var gatewayLifecycle = new GatewayLifecycleManager();
/**
 * Start the OpenClaw Gateway
 * Safe to call multiple times - will only start once
 */
export function startGateway() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, gatewayLifecycle.start()];
        });
    });
}
/**
 * Stop the OpenClaw Gateway
 * Safe to call multiple times - will only stop once
 */
export function stopGateway() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, gatewayLifecycle.stop()];
        });
    });
}
/**
 * Get current Gateway status
 */
export function getGatewayStatus() {
    return gatewayLifecycle.getStatus();
}
/**
 * Check if Gateway is running
 */
export function isGatewayRunning() {
    return gatewayLifecycle.isRunning();
}
/**
 * Get the Gateway lifecycle manager instance
 * Use this to subscribe to events
 */
export function getGatewayManager() {
    return gatewayLifecycle;
}
