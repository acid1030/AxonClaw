/**
 * 设置 Repository
 * 用于存储数据库路径等可配置项（后续启动配置）
 */
import { getDb } from '../db';
export function getSetting(key) {
    var _a;
    var database = getDb();
    var row = database.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return (_a = row === null || row === void 0 ? void 0 : row.value) !== null && _a !== void 0 ? _a : null;
}
export function setSetting(key, value) {
    var database = getDb();
    database
        .prepare("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))\n       ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')")
        .run(key, value, value);
}
export function getAllSettings() {
    var database = getDb();
    var rows = database.prepare('SELECT key, value FROM settings').all();
    var result = {};
    for (var _i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
        var r = rows_1[_i];
        result[r.key] = r.value;
    }
    return result;
}
