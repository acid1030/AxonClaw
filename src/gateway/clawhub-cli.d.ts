export interface InstalledSkill {
    slug: string;
    version: string;
    source?: string;
    baseDir?: string;
    name?: string;
    description?: string;
}
export interface SearchSkill {
    slug: string;
    name: string;
    description: string;
    version: string;
    author?: string;
}
/**
 * 从 openclaw.json 读取 workspace 路径，扫描 <workspace>/skills/ 下的技能
 * OpenClaw 技能加载优先级：workspace > ~/.openclaw/skills > bundled
 */
export declare function listWorkspaceSkills(): InstalledSkill[];
export declare function listInstalled(): Promise<InstalledSkill[]>;
export declare function search(query: string, limit?: number): Promise<SearchSkill[]>;
export declare function install(slug: string, version?: string): Promise<void>;
export declare function uninstall(slug: string): Promise<void>;
export declare function getSkillsDir(): string;
export declare function openSkillPath(skillKey: string, baseDir?: string): string | null;
/**
 * 扫描指定目录下的技能（含 SKILL.md 的子目录）
 */
export declare function scanSkillsFromDir(dirPath: string): Array<{
    slug: string;
    name: string;
    baseDir: string;
    description?: string;
}>;
