/**
 * AxonClaw 数据库连接管理
 * 默认 SQLite，使用 better-sqlite3
 */
import Database from 'better-sqlite3';
export declare function getDb(): Database.Database;
export declare function isInitialized(): boolean;
/**
 * 初始化数据库
 * @param config 可选配置，不传则使用默认
 */
export declare function initDatabase(config?: {
    sqlitePath?: string;
}): void;
/**
 * 关闭数据库连接
 */
export declare function closeDatabase(): void;
