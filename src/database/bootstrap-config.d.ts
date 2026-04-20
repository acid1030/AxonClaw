/**
 * AxonClaw 启动前配置（Bootstrap Config）
 * 在数据库初始化之前读取，用于数据库路径等需在启动时确定的配置
 * 存储于 ~/.axonclaw/config.json
 */
export interface BootstrapConfig {
    /** SQLite 数据库文件路径 */
    dbPath?: string;
}
/**
 * 加载启动配置
 */
export declare function loadBootstrapConfig(): BootstrapConfig;
/**
 * 保存启动配置（仅写入文件，环境变量优先于文件）
 */
export declare function saveBootstrapConfig(config: BootstrapConfig): void;
/**
 * 获取配置文件路径（用于 UI 展示）
 */
export declare function getConfigFilePath(): string;
