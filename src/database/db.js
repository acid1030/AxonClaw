/**
 * AxonClaw 数据库连接管理
 * 默认 SQLite，使用 better-sqlite3
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { getDefaultConfig, getDataDir } from './config';
import { SCHEMA_SQL } from './schema';
var db = null;
export function getDb() {
    if (!db) {
        throw new Error('[Database] Not initialized. Call initDatabase() first.');
    }
    return db;
}
export function isInitialized() {
    return db !== null;
}
/**
 * 初始化数据库
 * @param config 可选配置，不传则使用默认
 */
export function initDatabase(config) {
    var _a, _b;
    if (db) {
        console.log('[Database] Already initialized');
        return;
    }
    var cfg = getDefaultConfig();
    var dbPath = (_b = (_a = config === null || config === void 0 ? void 0 : config.sqlitePath) !== null && _a !== void 0 ? _a : cfg.sqlitePath) !== null && _b !== void 0 ? _b : path.join(getDataDir(), 'AxonClaw.db');
    var dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    try {
        db = new Database(dbPath);
        db.pragma('journal_mode = WAL');
        db.exec(SCHEMA_SQL);
        console.log('[Database] Initialized SQLite at', dbPath);
    }
    catch (err) {
        console.error('[Database] Init failed:', err);
        throw err;
    }
}
/**
 * 关闭数据库连接
 */
export function closeDatabase() {
    if (db) {
        try {
            db.close();
        }
        catch (err) {
            console.error('[Database] Close error:', err);
        }
        db = null;
        console.log('[Database] Closed');
    }
}
