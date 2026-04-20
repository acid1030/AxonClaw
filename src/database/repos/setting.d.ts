/**
 * 设置 Repository
 * 用于存储数据库路径等可配置项（后续启动配置）
 */
export declare function getSetting(key: string): string | null;
export declare function setSetting(key: string, value: string): void;
export declare function getAllSettings(): Record<string, string>;
