/**
 * 告警 Repository
 * 参考 AxonClawX internal/database/repo_alert.go
 */
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { getDb } from '../db';
export function createAlert(alert) {
    var _a, _b;
    var database = getDb();
    var stmt = database.prepare("INSERT INTO alerts (alert_id, risk, message, detail) VALUES (?, ?, ?, ?)");
    var result = stmt.run((_a = alert.alert_id) !== null && _a !== void 0 ? _a : '', alert.risk, alert.message, (_b = alert.detail) !== null && _b !== void 0 ? _b : '');
    return result.lastInsertRowid;
}
export function listAlerts(filter) {
    var _a, _b, _c;
    if (filter === void 0) { filter = {}; }
    var database = getDb();
    var page = (_a = filter.page) !== null && _a !== void 0 ? _a : 1;
    var pageSize = (_b = filter.page_size) !== null && _b !== void 0 ? _b : 20;
    var offset = (page - 1) * pageSize;
    var whereClause = '';
    var params = [];
    if (filter.risk) {
        whereClause += ' AND risk = ?';
        params.push(filter.risk);
    }
    if (filter.start_time) {
        whereClause += ' AND created_at >= ?';
        params.push(filter.start_time);
    }
    if (filter.end_time) {
        whereClause += ' AND created_at <= ?';
        params.push(filter.end_time);
    }
    var where = whereClause ? "WHERE ".concat(whereClause.slice(5)) : '';
    var countStmt = database.prepare("SELECT COUNT(*) as c FROM alerts ".concat(where));
    var countRow = countStmt.get.apply(countStmt, params);
    var total = (_c = countRow === null || countRow === void 0 ? void 0 : countRow.c) !== null && _c !== void 0 ? _c : 0;
    var listStmt = database.prepare("SELECT id, alert_id, risk, message, detail, notified, created_at FROM alerts ".concat(where, " ORDER BY created_at DESC LIMIT ? OFFSET ?"));
    var rows = listStmt.all.apply(listStmt, __spreadArray(__spreadArray([], params, false), [pageSize, offset], false));
    return { list: rows, total: total };
}
export function recentAlerts(limit) {
    var database = getDb();
    var stmt = database.prepare("SELECT id, alert_id, risk, message, detail, notified, created_at FROM alerts ORDER BY created_at DESC LIMIT ?");
    return stmt.all(limit);
}
export function markAlertNotified(id) {
    var database = getDb();
    database.prepare('UPDATE alerts SET notified = 1 WHERE id = ?').run(id);
}
export function markAllAlertsNotified() {
    var database = getDb();
    database.prepare('UPDATE alerts SET notified = 1').run();
}
export function countUnreadAlerts() {
    var _a;
    var database = getDb();
    var row = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE notified = 0').get();
    return (_a = row === null || row === void 0 ? void 0 : row.c) !== null && _a !== void 0 ? _a : 0;
}
/** 告警汇总统计（AxonClawX 风格：高/中、1h/24h） */
export function alertSummaryStats() {
    var _a, _b, _c, _d;
    var database = getDb();
    var now = new Date();
    var ts24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    var ts1h = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    var highRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE risk = ?').get('critical');
    var mediumRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE risk = ?').get('warning');
    var count1hRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE created_at >= ?').get(ts1h);
    var count24hRow = database.prepare('SELECT COUNT(*) as c FROM alerts WHERE created_at >= ?').get(ts24h);
    return {
        high: (_a = highRow === null || highRow === void 0 ? void 0 : highRow.c) !== null && _a !== void 0 ? _a : 0,
        medium: (_b = mediumRow === null || mediumRow === void 0 ? void 0 : mediumRow.c) !== null && _b !== void 0 ? _b : 0,
        count1h: (_c = count1hRow === null || count1hRow === void 0 ? void 0 : count1hRow.c) !== null && _c !== void 0 ? _c : 0,
        count24h: (_d = count24hRow === null || count24hRow === void 0 ? void 0 : count24hRow.c) !== null && _d !== void 0 ? _d : 0,
    };
}
