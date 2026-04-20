/**
 * AxonClaw 数据库配置
 * 默认 SQLite，路径可配置（环境变量 > 配置文件 > 默认）
 */
export type DatabaseDriver = 'sqlite' | 'postgres';
export interface DatabaseConfig {
    driver: DatabaseDriver;
    /** SQLite 文件路径 */
    sqlitePath?: string;
    /** PostgreSQL DSN（driver=postgres 时使用） */
    postgresDsn?: string;
}
/**
 * 获取默认数据库配置
 * 优先级：环境变量 AXONCLAW_DB_PATH > ~/.axonclaw/config.json > 默认路径
 */
export declare function getDefaultConfig(): DatabaseConfig;
/**
 * 获取数据目录（用于创建目录等）
 */
export declare function getDataDir(): string;
