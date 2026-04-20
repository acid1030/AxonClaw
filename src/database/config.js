/**
 * AxonClaw 数据库配置
 * 默认 SQLite，路径可配置（环境变量 > 配置文件 > 默认）
 */
import * as path from 'path';
import * as os from 'os';
import { loadBootstrapConfig } from './bootstrap-config';
var DEFAULT_DATA_DIR = path.join(os.homedir(), '.axonclaw', 'data');
var DEFAULT_SQLITE_PATH = path.join(DEFAULT_DATA_DIR, 'AxonClaw.db');
/**
 * 获取默认数据库配置
 * 优先级：环境变量 AXONCLAW_DB_PATH > ~/.axonclaw/config.json > 默认路径
 */
export function getDefaultConfig() {
    var envPath = process.env.AXONCLAW_DB_PATH;
    if (envPath) {
        return { driver: 'sqlite', sqlitePath: envPath };
    }
    var bootstrap = loadBootstrapConfig();
    if (bootstrap.dbPath) {
        return { driver: 'sqlite', sqlitePath: bootstrap.dbPath };
    }
    return { driver: 'sqlite', sqlitePath: DEFAULT_SQLITE_PATH };
}
/**
 * 获取数据目录（用于创建目录等）
 */
export function getDataDir() {
    var _a;
    var cfg = getDefaultConfig();
    var dbPath = (_a = cfg.sqlitePath) !== null && _a !== void 0 ? _a : DEFAULT_SQLITE_PATH;
    return path.dirname(dbPath);
}
