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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * ClawHub CLI - 通过 npx clawhub 管理技能
 * 对接 OpenClaw 真实技能体系
 */
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
var OPENCLAW_DIR = path.join(os.homedir(), '.openclaw');
var SKILLS_DIR = path.join(OPENCLAW_DIR, 'skills');
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}
function stripAnsi(str) {
    var esc = String.fromCharCode(27);
    var csi = String.fromCharCode(155);
    var pattern = "(?:".concat(esc, "|").concat(csi, ")[[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]");
    return str.replace(new RegExp(pattern, 'g'), '').trim();
}
function runClawhub(args, workDir) {
    if (workDir === void 0) { workDir = OPENCLAW_DIR; }
    return new Promise(function (resolve, reject) {
        var _a, _b;
        ensureDir(workDir);
        var cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
        var child = spawn(cmd, __spreadArray(['clawhub@latest'], args, true), {
            cwd: workDir,
            env: __assign(__assign({}, process.env), { CI: 'true', FORCE_COLOR: '0', CLAWHUB_WORKDIR: workDir }),
            shell: process.platform === 'win32',
        });
        var stdout = '';
        var stderr = '';
        (_a = child.stdout) === null || _a === void 0 ? void 0 : _a.on('data', function (d) { stdout += d.toString(); });
        (_b = child.stderr) === null || _b === void 0 ? void 0 : _b.on('data', function (d) { stderr += d.toString(); });
        child.on('error', reject);
        child.on('close', function (code) {
            if (code === 0 || code === null)
                resolve(stdout.trim());
            else
                reject(new Error(stderr || stdout || "Exit ".concat(code)));
        });
    });
}
/**
 * 从 openclaw.json 读取 workspace 路径，扫描 <workspace>/skills/ 下的技能
 * OpenClaw 技能加载优先级：workspace > ~/.openclaw/skills > bundled
 */
export function listWorkspaceSkills() {
    var _a, _b, _c;
    try {
        var configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
        if (!fs.existsSync(configPath))
            return [];
        var raw = fs.readFileSync(configPath, 'utf8');
        var config = JSON.parse(raw);
        var workspace = (_c = (_b = (_a = config.agents) === null || _a === void 0 ? void 0 : _a.list) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.workspace;
        if (!workspace || typeof workspace !== 'string')
            return [];
        var resolved = workspace.startsWith('~') ? path.join(os.homedir(), workspace.slice(1)) : workspace;
        var skillsDir = path.join(resolved, 'skills');
        if (!fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory())
            return [];
        var scanned = scanSkillsFromDir(skillsDir);
        return scanned.map(function (s) { return ({
            slug: s.slug,
            version: 'workspace',
            source: 'openclaw-workspace',
            baseDir: s.baseDir,
            name: s.name,
            description: s.description,
        }); });
    }
    catch (_d) {
        return [];
    }
}
/**
 * 直接扫描 ~/.openclaw/skills 目录（clawhub list 输出格式可能变化时的兜底）
 */
function listManagedSkillsFromDisk() {
    if (!fs.existsSync(SKILLS_DIR))
        return [];
    var scanned = scanSkillsFromDir(SKILLS_DIR);
    return scanned.map(function (s) { return ({
        slug: s.slug,
        version: 'managed',
        source: 'openclaw-managed',
        baseDir: s.baseDir,
        name: s.name,
        description: s.description,
    }); });
}
export function listInstalled() {
    return __awaiter(this, void 0, void 0, function () {
        var seen, result, workspaceSkills, _i, workspaceSkills_1, s, output, parsed, _a, _b, line, clean, m, _c, parsed_1, s, _d, managedFromDisk, _e, managedFromDisk_1, s;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    seen = new Set();
                    result = [];
                    workspaceSkills = listWorkspaceSkills();
                    for (_i = 0, workspaceSkills_1 = workspaceSkills; _i < workspaceSkills_1.length; _i++) {
                        s = workspaceSkills_1[_i];
                        if (!seen.has(s.slug)) {
                            seen.add(s.slug);
                            result.push(s);
                        }
                    }
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, runClawhub(['list'])];
                case 2:
                    output = _f.sent();
                    if (output && !output.includes('No installed skills')) {
                        parsed = [];
                        for (_a = 0, _b = output.split('\n').filter(function (l) { return l.trim(); }); _a < _b.length; _a++) {
                            line = _b[_a];
                            clean = stripAnsi(line);
                            m = clean.match(/^(\S+)\s+v?(\d+\.\S+)/);
                            if (m) {
                                parsed.push({
                                    slug: m[1],
                                    version: m[2],
                                    source: 'openclaw-managed',
                                    baseDir: path.join(SKILLS_DIR, m[1]),
                                });
                            }
                        }
                        for (_c = 0, parsed_1 = parsed; _c < parsed_1.length; _c++) {
                            s = parsed_1[_c];
                            if (!seen.has(s.slug)) {
                                seen.add(s.slug);
                                result.push(s);
                            }
                        }
                    }
                    return [3 /*break*/, 4];
                case 3:
                    _d = _f.sent();
                    return [3 /*break*/, 4];
                case 4:
                    managedFromDisk = listManagedSkillsFromDisk();
                    for (_e = 0, managedFromDisk_1 = managedFromDisk; _e < managedFromDisk_1.length; _e++) {
                        s = managedFromDisk_1[_e];
                        if (!seen.has(s.slug)) {
                            seen.add(s.slug);
                            result.push(s);
                        }
                    }
                    return [2 /*return*/, result];
            }
        });
    });
}
export function search(query, limit) {
    return __awaiter(this, void 0, void 0, function () {
        var args, output, err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    args = query.trim() ? ['search', query.trim()] : ['explore'];
                    if (limit)
                        args.push('--limit', String(limit));
                    return [4 /*yield*/, runClawhub(args)];
                case 1:
                    output = _a.sent();
                    if (!output || output.includes('No skills found'))
                        return [2 /*return*/, []];
                    return [2 /*return*/, output.split('\n').filter(function (l) { return l.trim(); }).map(function (line) {
                            var clean = stripAnsi(line);
                            var m = clean.match(/^(\S+)\s+v?(\d+\.\S+)\s+(.+)$/);
                            if (m) {
                                var desc = m[3].replace(/\(\d+\.\d+\)$/, '').trim();
                                return { slug: m[1], name: m[1], version: m[2], description: desc };
                            }
                            m = clean.match(/^(\S+)\s+(.+)$/);
                            if (m) {
                                var desc = m[2].replace(/\(\d+\.\d+\)$/, '').trim();
                                return { slug: m[1], name: m[1], version: 'latest', description: desc };
                            }
                            return null;
                        }).filter(function (s) { return s !== null; })];
                case 2:
                    err_1 = _a.sent();
                    console.error('[ClawHub] search error:', err_1);
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
export function install(slug, version) {
    return __awaiter(this, void 0, void 0, function () {
        var args;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    args = ['install', slug];
                    if (version)
                        args.push('--version', version);
                    return [4 /*yield*/, runClawhub(args)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
export function uninstall(slug) {
    return __awaiter(this, void 0, void 0, function () {
        var skillDir, lockFile, lock;
        var _a;
        return __generator(this, function (_b) {
            skillDir = path.join(SKILLS_DIR, slug);
            if (fs.existsSync(skillDir)) {
                fs.rmSync(skillDir, { recursive: true, force: true });
            }
            lockFile = path.join(OPENCLAW_DIR, '.clawhub', 'lock.json');
            if (fs.existsSync(lockFile)) {
                try {
                    lock = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
                    if ((_a = lock.skills) === null || _a === void 0 ? void 0 : _a[slug]) {
                        delete lock.skills[slug];
                        fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2));
                    }
                }
                catch ( /* ignore */_c) { /* ignore */ }
            }
            return [2 /*return*/];
        });
    });
}
export function getSkillsDir() {
    return SKILLS_DIR;
}
function searchSkillInDir(dir, skillKey) {
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory())
        return null;
    var direct = path.join(dir, skillKey);
    if (fs.existsSync(direct) && fs.existsSync(path.join(direct, 'SKILL.md')))
        return direct;
    var entries = fs.readdirSync(dir, { withFileTypes: true });
    for (var _i = 0, entries_1 = entries; _i < entries_1.length; _i++) {
        var e = entries_1[_i];
        if (!e.isDirectory())
            continue;
        var p = path.join(dir, e.name, 'SKILL.md');
        if (fs.existsSync(p)) {
            var raw = fs.readFileSync(p, 'utf8');
            var fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
            if (fm) {
                var nameMatch = fm[1].match(/^\s*name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
                if (nameMatch && nameMatch[1].trim().toLowerCase() === skillKey.toLowerCase()) {
                    return path.join(dir, e.name);
                }
            }
        }
    }
    return null;
}
export function openSkillPath(skillKey, baseDir) {
    var _a, _b, _c;
    if (baseDir && fs.existsSync(baseDir))
        return baseDir;
    // 1. Workspace skills
    var workspaceSkills = listWorkspaceSkills();
    var ws = workspaceSkills.find(function (s) { return s.slug === skillKey || s.slug.toLowerCase() === skillKey.toLowerCase(); });
    if ((ws === null || ws === void 0 ? void 0 : ws.baseDir) && fs.existsSync(ws.baseDir))
        return ws.baseDir;
    // 2. ~/.openclaw/skills
    var managed = searchSkillInDir(SKILLS_DIR, skillKey);
    if (managed)
        return managed;
    // 3. 扫描 workspace 目录
    try {
        var configPath = path.join(OPENCLAW_DIR, 'openclaw.json');
        if (fs.existsSync(configPath)) {
            var config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            var workspace = (_c = (_b = (_a = config.agents) === null || _a === void 0 ? void 0 : _a.list) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.workspace;
            if (workspace) {
                var resolved = workspace.startsWith('~') ? path.join(os.homedir(), workspace.slice(1)) : workspace;
                var skillsDir = path.join(resolved, 'skills');
                var found = searchSkillInDir(skillsDir, skillKey);
                if (found)
                    return found;
            }
        }
    }
    catch (_d) {
        /* ignore */
    }
    return null;
}
/**
 * 扫描指定目录下的技能（含 SKILL.md 的子目录）
 */
export function scanSkillsFromDir(dirPath) {
    var results = [];
    if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory())
        return results;
    var entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (var _i = 0, entries_2 = entries; _i < entries_2.length; _i++) {
        var e = entries_2[_i];
        if (!e.isDirectory())
            continue;
        var skillDir = path.join(dirPath, e.name);
        var skillMd = path.join(skillDir, 'SKILL.md');
        if (!fs.existsSync(skillMd))
            continue;
        try {
            var raw = fs.readFileSync(skillMd, 'utf8');
            var fm = raw.match(/^---\s*\n([\s\S]*?)\n---/);
            var name_1 = e.name;
            var description = '';
            if (fm) {
                var nameMatch = fm[1].match(/^\s*name\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
                if (nameMatch)
                    name_1 = nameMatch[1].trim();
                var descMatch = fm[1].match(/^\s*description\s*:\s*["']?([^"'\n]+)["']?\s*$/m);
                if (descMatch)
                    description = descMatch[1].trim();
            }
            results.push({ slug: e.name, name: name_1, baseDir: skillDir, description: description || undefined });
        }
        catch ( /* skip */_a) { /* skip */ }
    }
    return results;
}
