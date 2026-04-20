/**
 * AxonClaw 启动前配置（Bootstrap Config）
 * 在数据库初始化之前读取，用于数据库路径等需在启动时确定的配置
 * 存储于 ~/.axonclaw/config.json
 */
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
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
var CONFIG_DIR = path.join(os.homedir(), '.axonclaw');
var CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
function ensureConfigDir() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
}
/**
 * 加载启动配置
 */
export function loadBootstrapConfig() {
    var envPath = process.env.AXONCLAW_DB_PATH;
    if (envPath) {
        return { dbPath: envPath };
    }
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            var raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            var parsed = JSON.parse(raw);
            return {
                dbPath: typeof parsed.dbPath === 'string' ? parsed.dbPath : undefined,
            };
        }
    }
    catch (err) {
        console.warn('[BootstrapConfig] Load failed:', err);
    }
    return {};
}
/**
 * 保存启动配置（仅写入文件，环境变量优先于文件）
 */
export function saveBootstrapConfig(config) {
    ensureConfigDir();
    var existing = {};
    try {
        if (fs.existsSync(CONFIG_FILE)) {
            var raw = fs.readFileSync(CONFIG_FILE, 'utf8');
            var parsed = JSON.parse(raw);
            existing = {
                dbPath: typeof parsed.dbPath === 'string' ? parsed.dbPath : undefined,
            };
        }
    }
    catch (_a) {
        /* ignore */
    }
    var merged = __assign(__assign({}, existing), config);
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf8');
}
/**
 * 获取配置文件路径（用于 UI 展示）
 */
export function getConfigFilePath() {
    return CONFIG_FILE;
}
