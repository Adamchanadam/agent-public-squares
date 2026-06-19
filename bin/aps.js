#!/usr/bin/env node
/**
 * APS — Agent Public Squares
 * Bootstrap CLI for setting up cross-machine AI agent collaboration.
 *
 * Status: bridge-pack fixture provision, skill install, Hub skeleton setup,
 * and local publish / inbox / consume / close smoke flow are available.
 *
 * Roadmap: dev/qc/2026-05-22-zero-knowledge-funnel-audit.md in repo.
 */

const path = require('path');
const fs = require('fs');
const readline = require('readline');
const http = require('http');
const crypto = require('crypto');

const rawSubcommand = process.argv[2];
const subcommand = rawSubcommand === 'check-drive' || rawSubcommand === 'check-hub'
  ? 'inbox'
  : rawSubcommand;
const args = process.argv.slice(3);
const packageJson = require('../package.json');
const packageVersion = packageJson.version || 'version unknown';

function hasFlag(name) {
  return args.includes(name);
}

function getFlagValue(name, fallback) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) return fallback;
  return process.argv[index + 1];
}

function getRequiredFlagValue(name) {
  const value = getFlagValue(name, null);
  return value && !value.startsWith('--') ? value : null;
}

function localAgentOverrideCheck({ config, requestedAgentId, commandName }) {
  const configuredAgentId = config && config.agentId;
  if (!configuredAgentId || !requestedAgentId || requestedAgentId === configuredAgentId) {
    return { ok: true, warn: null };
  }
  if (hasFlag('--allow-agent-override')) {
    return {
      ok: true,
      warn: `⚠️ 高風險: ${commandName} 正在使用用戶名稱 ${requestedAgentId},但本機設定是 ${configuredAgentId}。請只在維護者修復或人工審計時使用 --allow-agent-override。`,
    };
  }
  return {
    ok: false,
    warn: null,
    reason: `${commandName} 已阻擋:本機用戶名稱是 ${configuredAgentId},但指令要求使用 ${requestedAgentId}。日常命令不可冒用其他用戶名稱;請回到 ${configuredAgentId} 的本機工作目錄執行。若這是維護者修復或人工審計,請明確加 --allow-agent-override。`,
  };
}

function enforceLocalAgentIdentityOrExit({ config, requestedAgentId, commandName, errorPrefix }) {
  const check = localAgentOverrideCheck({ config, requestedAgentId, commandName });
  if (!check.ok) {
    console.error(`${errorPrefix}:${check.reason}`);
    process.exit(1);
  }
  if (check.warn) {
    console.log(check.warn);
  }
}

function readBodyInput() {
  const body = getRequiredFlagValue('--body');
  const bodyFile = getRequiredFlagValue('--body-file');
  if (body && bodyFile) {
    throw new Error('Use either --body or --body-file, not both.');
  }
  if (bodyFile) {
    const resolvedPath = path.resolve(process.cwd(), bodyFile);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`--body-file not found: ${resolvedPath}`);
    }
    const stat = fs.statSync(resolvedPath);
    if (!stat.isFile()) {
      throw new Error(`--body-file is not a file: ${resolvedPath}`);
    }
    return fs.readFileSync(resolvedPath, 'utf8');
  }
  if (body) return body;
  throw new Error('Missing required flag: --body or --body-file');
}

// Collapse a single declared action item to one clean line. Items are recorded
// verbatim from what the sender's AI declares; we only normalize whitespace so a
// multi-line paste cannot break the frontmatter list.
function normalizeItem(value) {
  return String(value).replace(/\r?\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Read declared action items from --items "a;b;c" or --items-file <path>.
// Items are an explicit sender-declared contract: the AI states them, the CLI
// records them verbatim. We never reverse-parse them out of the free-form body.
// Returns { provided, items }; `provided` is false only when neither flag is given,
// so callers (e.g. revise) can tell "leave items unchanged" from "set items to []".
function readItemsInput() {
  const itemsFlag = getRequiredFlagValue('--items');
  const itemsFile = getRequiredFlagValue('--items-file');
  if (itemsFlag && itemsFile) {
    throw new Error('Use either --items or --items-file, not both.');
  }
  if (itemsFile) {
    const resolvedPath = path.resolve(process.cwd(), itemsFile);
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isFile()) {
      throw new Error(`--items-file not found or not a file: ${resolvedPath}`);
    }
    const items = fs.readFileSync(resolvedPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map(normalizeItem)
      .filter(Boolean);
    return { provided: true, items };
  }
  if (itemsFlag) {
    const items = itemsFlag.split(';').map(normalizeItem).filter(Boolean);
    return { provided: true, items };
  }
  return { provided: false, items: [] };
}

const handoffRequiredSections = [
  {
    key: 'common_goal',
    label: '共同目標',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(共同目標|common goal|goal)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'own_task',
    label: '本方任務',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(本方任務|我方任務|發送方任務|本方已完成|我方已完成|已做甚麼|已完成|own-side task|sender task|sender done)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'counterpart_task',
    label: '對方任務',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(對方任務|收件方任務|對方要做甚麼|Jay 要做甚麼|請.*接手|counterpart task|receiver task)\s*[:：]?/i,
    allowUnknown: true,
  },
  {
    key: 'crossing_point',
    label: '交叉點',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(交叉點|接手點|需要對方接手|crossing point|handoff point)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'requested_action',
    label: '請對方做的事（--items）',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(請對方做的事|請.*做|requested action|action requested)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'do_not_misunderstand',
    label: '不應誤解的事',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(不應誤解|不要誤解|不可誤解|不要做|不應做|do not misunderstand|out of scope|boundary)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'evidence',
    label: '真源指標',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(真源指標|可共享真源|證據位置|證據|關鍵檔案|檔案位置|版本|evidence|source|reference)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'receiver_start_condition',
    label: '接收方開工條件',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(接收方開工條件|開工條件|開始前條件|可開工條件|ready to start|start condition)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'risks',
    label: '風險 / 未決事項',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(風險|未決|注意事項|risks?|open items?|unknowns?)\s*[:：]?/i,
    allowUnknown: true,
  },
];

function sectionContent(text, section) {
  const lines = String(text || '').split(/\r?\n/);
  const start = lines.findIndex((line) => section.pattern.test(`\n${line}`));
  if (start < 0) return null;
  const collected = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*#{1,6}\s+\S/.test(lines[index])) break;
    collected.push(lines[index]);
  }
  return collected.join('\n').trim();
}

function hasSubstantiveContent(value, allowUnknown) {
  const text = String(value || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_~>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return false;
  const weak = /^(未確認|未知|待確認|不確定|沒有|無|n\/a|na|none|unknown|tbd|to be confirmed|not sure)$/i;
  if (!allowUnknown && weak.test(text)) return false;
  if (text.length < 4 && !/[A-Za-z0-9]{2,}/.test(text)) return false;
  return true;
}

function containsLocalOnlyPath(text) {
  return /(?:^|[\s("'`])(?:[A-Za-z]:[\\/]|file:\/\/|\/(?:Users|home|mnt|Volumes)\/)/i.test(String(text || ''));
}

function stripWindowsLocalPaths(text) {
  return String(text || '').replace(/(^|[\s("'`])[A-Za-z]:[\\/][^\s<>"']+/g, '$1 ');
}

function hasLocalPathBoundary(text) {
  return /本機路徑|只適用於本方|只適用於我方|只適用於這部電腦|對方不可直接使用|local path/i.test(String(text || ''));
}

function hasShareableSourcePointer(text) {
  const value = String(text || '').trim();
  if (!value) return false;
  const sourcePatterns = [
    /\bhttps?:\/\//i,
    /docs\.google\.com|drive\.google\.com/i,
    /Google Drive|共用 Drive|共享|共用資料夾|shared folder/i,
    /\bfrom_[A-Za-z0-9_-]+[\\/](?:packets|acks|context)\b/i,
    /\b(?:docs|skills|src|bin|dev|README|CHANGELOG|_context)[\\/][^\s<>"']+/i,
    /\b[\w.-]+\.(?:md|html|js|json|docx?|xlsx?|pdf|txt|csv)\b/i,
    /檔名|文件|資料夾|版本|頁碼|第\s*\d+\s*頁|段落|表格|工作表|packet id|version|v\d+/i,
  ];
  return sourcePatterns.some((pattern) => pattern.test(value));
}

function hasPotentialSecret(text) {
  const value = String(text || '');
  const patterns = [
    /\bsk-(?:ant-)?[A-Za-z0-9_-]{12,}\b/,
    /\b(?:github_pat_|ghp_|gho_|ghs_)[A-Za-z0-9_]{12,}\b/,
    /\bntn_[A-Za-z0-9_-]{12,}\b/,
    /\bsecret_[A-Za-z0-9_-]{12,}\b/,
    /\bya29\.[A-Za-z0-9._-]{12,}\b/,
    /\b1\/\/[A-Za-z0-9._-]{12,}\b/,
    /\bxox[abprs]-[A-Za-z0-9-]{12,}\b/,
    /\bsl\.[A-Za-z0-9._-]{12,}\b/,
    /\bAIza[A-Za-z0-9_-]{20,}\b/,
    /\bAKIA[A-Z0-9]{16}\b/,
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  ];
  return patterns.some((pattern) => pattern.test(value));
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

function handoffReadinessReport(body, items) {
  const text = String(body || '');
  const present = [];
  const missing = [];
  const weak = [];
  for (const section of handoffRequiredSections) {
    const bodyHasSection = section.pattern.test(text);
    const content = sectionContent(text, section);
    const sectionReady = bodyHasSection && hasSubstantiveContent(content, section.allowUnknown);
    if (section.key === 'requested_action' && items.length === 0) {
      missing.push(section.label);
      continue;
    }
    const found = section.key === 'requested_action'
      ? items.length > 0
      : sectionReady;
    if (found) present.push(section.label);
    else if (bodyHasSection) pushUnique(weak, section.label);
    else missing.push(section.label);
  }
  const warnings = [];
  const bodyHasRequestedAction = handoffRequiredSections
    .find((section) => section.key === 'requested_action')
    .pattern.test(text);
  if (bodyHasRequestedAction && items.length === 0) {
    warnings.push('正文有「請對方做的事」,但正式交接需要用 --items 或 --items-file 明示申報,讓收件方總覽可直接看到待辦。');
  }
  const evidenceSection = sectionContent(text, handoffRequiredSections.find((section) => section.key === 'evidence'));
  if (evidenceSection && hasSubstantiveContent(evidenceSection, false) && !hasShareableSourcePointer(evidenceSection)) {
    pushUnique(weak, '可共享真源指標');
  }
  if (containsLocalOnlyPath(evidenceSection) && !hasShareableSourcePointer(stripWindowsLocalPaths(evidenceSection))) {
    pushUnique(weak, '可共享真源指標');
  }
  if (containsLocalOnlyPath(text) && !hasLocalPathBoundary(text)) {
    warnings.push('正文似乎包含本機路徑,但沒有標明只適用於本方電腦。');
  }
  if (hasPotentialSecret(text)) {
    warnings.push('正文似乎包含 API key、token 或憑證字串;不得寫入 APS 正式交接。');
  }
  return {
    ready: missing.length === 0 && weak.length === 0 && warnings.length === 0,
    present,
    missing,
    weak,
    warnings,
  };
}

function formatHandoffReadiness(report) {
  if (report.ready) {
    return [
      '🔎 交接完整性檢查: 通過',
      `✅ 已包含: ${report.present.join(' / ')}`,
    ];
  }
  const lines = ['⚠️ 交接完整性檢查: 有缺口'];
  if (report.missing.length > 0) lines.push(`- 缺少: ${report.missing.join(' / ')}`);
  if (report.weak && report.weak.length > 0) lines.push(`- 內容不足: ${report.weak.join(' / ')}`);
  for (const warning of report.warnings) lines.push(`- 注意: ${warning}`);
  lines.push('建議:先補齊交接確認卡,再發正式 APS 交接包。');
  return lines;
}

function printHandoffReadiness(report, write = console.log) {
  for (const line of formatHandoffReadiness(report)) write(line);
}

function contextActionFromArgs(argv) {
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith('--')) {
      if (argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
      continue;
    }
    positional.push(arg);
  }
  if (positional.length === 0) return 'summary';
  if (positional.length === 1 && positional[0] === 'check') return 'check';
  if (positional.length === 1 && positional[0] === 'add') return 'add';
  if (positional.length === 1 && positional[0] === 'html') return 'html';
  return null;
}

function configPath() {
  return path.join(process.cwd(), '.aps', 'config.json');
}

function loadConfig() {
  const filePath = configPath();
  if (!fs.existsSync(filePath)) return {};
  try {
    return readJson(filePath);
  } catch (err) {
    throw new Error(`APS config is not valid JSON: ${filePath}. ${err.message}`);
  }
}

function loadConfigOrExit() {
  try {
    return loadConfig();
  } catch (err) {
    console.error(`Config failed: ${err.message}`);
    console.error('Fix `.aps/config.json`, or rerun `npx aps config --hub-root ... --project ... --agent-id ...` (--other-agent-id / --role A|B optional).');
    process.exit(1);
  }
}

function saveConfig(values, dryRun) {
  return writeConfig(values, dryRun);
}

function writeConfig(values, dryRun) {
  const filePath = configPath();
  const existing = fs.existsSync(filePath) ? loadConfig() : {};
  const content = {
    ...existing,
    hubRoot: values.hubRoot,
    projectSlug: values.projectSlug,
    agentId: values.agentId,
    otherAgentId: values.otherAgentId,
    role: values.role,
  };
  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
  }
  return { ok: true, path: filePath, message: dryRun ? `would write/update ${filePath}` : `wrote/updated ${filePath}` };
}

function flagOrConfig(flagName, configKey, config) {
  return getRequiredFlagValue(flagName) || config[configKey] || null;
}

function requireValues(values) {
  const missing = Object.entries(values)
    .filter(([, value]) => value === null || value === undefined || value === '')
    .map(([name]) => name);
  if (missing.length > 0) {
    console.error(`Missing required values: ${missing.join(', ')}`);
    console.error('Run `npx aps init` for guided setup first, or pass all required flags.');
    process.exit(1);
  }
}

function homeDir() {
  return process.env.HOME || process.env.USERPROFILE || null;
}

function copyDirectory(sourceDir, targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

function writeFileIfMissing(filePath, content, dryRun) {
  if (fs.existsSync(filePath)) {
    return { ok: false, skipped: true, path: filePath, message: `exists; not overwriting (${filePath})` };
  }
  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return { ok: true, skipped: false, path: filePath, message: dryRun ? `would write ${filePath}` : `wrote ${filePath}` };
}

function writeFileOrUpdate(filePath, content, dryRun) {
  if (!dryRun) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }
  return { ok: true, skipped: false, path: filePath, message: dryRun ? `would write/update ${filePath}` : `wrote/updated ${filePath}` };
}

function writePeerCardPreservingConfirmed(filePath, nextCard, dryRun) {
  if (fs.existsSync(filePath)) {
    try {
      const current = readJson(filePath);
      if (current && current.status !== 'inactive' && current.peer_state === 'confirmed' && nextCard.peer_state !== 'confirmed') {
        return { ok: false, skipped: true, preserved: true, path: filePath, message: `existing confirmed peer preserved (${filePath})` };
      }
    } catch (err) {
      // Malformed peer cards are rewritten by the caller's requested state.
    }
  }
  return writeFileOrUpdate(filePath, `${JSON.stringify(nextCard, null, 2)}\n`, dryRun);
}

function upsertManagedBlock(filePath, blockName, blockContent, insertBeforePattern, dryRun) {
  const begin = `<!-- BEGIN APS managed ${blockName} -->`;
  const end = `<!-- END APS managed ${blockName} -->`;
  const block = `${begin}\n${blockContent.trim()}\n${end}`;
  const current = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  const pattern = new RegExp(`${escapeRegExp(begin)}[\\s\\S]*?${escapeRegExp(end)}`);
  let next;
  let verb;
  if (pattern.test(current)) {
    next = current.replace(pattern, block);
    verb = 'refresh';
  } else if (insertBeforePattern && insertBeforePattern.test(current)) {
    next = current.replace(insertBeforePattern, `\n${block}\n\n$&`);
    verb = 'add';
  } else {
    next = `${current.replace(/\s*$/, '')}\n\n${block}\n`;
    verb = 'add';
  }
  if (!dryRun && next !== current) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, next, 'utf8');
  }
  return {
    ok: true,
    skipped: next === current,
    path: filePath,
    message: dryRun
      ? `would ${verb} APS ${blockName} registration in ${filePath}`
      : (next === current ? `APS ${blockName} registration already current (${filePath})` : `${verb}ed APS ${blockName} registration in ${filePath}`),
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function ensureDirectory(dirPath, dryRun) {
  if (fs.existsSync(dirPath)) {
    return { ok: false, skipped: true, path: dirPath, message: `exists; not overwriting (${dirPath})` };
  }
  if (!dryRun) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  return { ok: true, path: dirPath, message: dryRun ? `would create ${dirPath}` : `created ${dirPath}` };
}

function ensureHandoffKitReady() {
  const required = [
    'AGENTS.md',
    path.join('dev', 'RULE_PACKS.md'),
    path.join('dev', 'PROJECT_INDEX.md'),
  ];
  const missing = required.filter((relativePath) => !fs.existsSync(path.join(process.cwd(), relativePath)));
  if (missing.length > 0) {
    throw new Error(`Agent Handoff Kit is not initialized in this project. Missing: ${missing.join(', ')}. Run \`npx --yes @adamchanadam/agent-handoff-kit@latest init\` first, then rerun \`npx aps init\`.`);
  }
}

function timestampForPath() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..*$/, 'Z');
}

function installSkill({ label, targetDir, dryRun, refresh }) {
  const sourceDir = path.join(__dirname, '..', 'skills', 'aps');
  if (!fs.existsSync(path.join(sourceDir, 'SKILL.md'))) {
    return {
      ok: false,
      label,
      targetDir,
      message: `source skill not found at ${sourceDir}`,
    };
  }
  if (fs.existsSync(targetDir)) {
    if (refresh) {
      const backupDir = `${targetDir}.backup-${timestampForPath()}`;
      if (!dryRun) {
        try {
          fs.renameSync(targetDir, backupDir);
          copyDirectory(sourceDir, targetDir);
        } catch (err) {
          return {
            ok: false,
            label,
            targetDir,
            message: `failed to refresh ${targetDir}: ${err.message}`,
          };
        }
      }
      return {
        ok: true,
        refreshed: true,
        label,
        targetDir,
        backupDir,
        message: dryRun ? `would backup ${targetDir} to ${backupDir} and refresh skill` : `backed up ${targetDir} to ${backupDir} and refreshed skill`,
      };
    }
    return {
      ok: false,
      skipped: true,
      label,
      targetDir,
      message: `target already exists; not overwriting (${targetDir})`,
    };
  }
  if (!dryRun) {
    try {
      copyDirectory(sourceDir, targetDir);
    } catch (err) {
      return {
        ok: false,
        label,
        targetDir,
        message: `failed to install to ${targetDir}: ${err.message}`,
      };
    }
  }
  return {
    ok: true,
    label,
    targetDir,
    message: dryRun ? `would install to ${targetDir}` : `installed to ${targetDir}`,
  };
}

function validateSnakeCase(label, value) {
  if (!/^[a-z][a-z0-9_]{0,29}$/.test(value)) {
    return `${label} must be lowercase snake_case, start with a letter, and be 1-30 characters. Got '${value}'.`;
  }
  return null;
}

function validateNoPlaceholder(label, value) {
  // Reject doc placeholder markers (`<...>` angle brackets and `...` ellipsis) only.
  // Square brackets `[ ]` are legal in real filesystem paths (e.g. a Google Drive
  // folder literally named `[Project]`), so they must not be treated as placeholders
  // for `--hub-root`. The snake_case fields (`--project` / `--agent-id` /
  // `--other-agent-id`) are still bracket-rejected by validateSnakeCase.
  if (/[<>]/.test(value) || value.includes('...')) {
    return `${label} still looks like a placeholder: '${value}'. Replace it with your real value before running the command.`;
  }
  return null;
}

function validateDistinctAgents(agentId, otherAgentId) {
  return agentId === otherAgentId
    ? '--agent-id 與 --other-agent-id 必須是兩個不同的共用 Drive 資料夾共享身份,例如 adam / jay。'
    : null;
}

function toSnakeCase(value, fallback) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 30);
  if (/^[a-z]/.test(normalized)) return normalized;
  return fallback;
}

const promptStates = new WeakMap();

function promptState(rl) {
  if (promptStates.has(rl)) return promptStates.get(rl);
  const state = { queue: [], resolver: null, closed: false };
  rl.on('line', (line) => {
    const answer = line.trim();
    if (state.resolver) {
      const resolve = state.resolver;
      state.resolver = null;
      resolve(answer);
    } else {
      state.queue.push(answer);
    }
  });
  rl.on('close', () => {
    state.closed = true;
    if (state.resolver) {
      const resolve = state.resolver;
      state.resolver = null;
      resolve(null);
    }
  });
  promptStates.set(rl, state);
  return state;
}

function askLine(rl, question) {
  const state = promptState(rl);
  if (rl.output) rl.output.write(question);
  if (state.queue.length > 0) return Promise.resolve(state.queue.shift());
  if (state.closed) return Promise.resolve(null);
  return new Promise((resolve) => {
    state.resolver = resolve;
  });
}

async function askWithDefault(rl, question, defaultValue, validate) {
  while (true) {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = await askLine(rl, `${question}${suffix}: `);
    if (answer === null) {
      console.log('');
      throw new Error('輸入在設定完成前中止。請重新執行 `npx aps init`,並回答每一條問題。');
    }
    const value = answer || defaultValue;
    const error = validate ? validate(value) : null;
    if (!error) return value;
    console.log(`  ${error}`);
  }
}

function printDivider(label = '') {
  const line = '─'.repeat(48);
  if (!label) {
    console.log(line);
    return;
  }
  console.log(line);
  console.log(label);
  console.log(line);
}

function printPromptBlock({ step, title, body, example }) {
  console.log('');
  printDivider(`${step} ${title}`);
  for (const line of body) console.log(line);
  if (example) {
    console.log('');
    console.log(`例子: ${example}`);
  }
  console.log('');
}

function brandCardLines() {
  const bannerWidth = 37;
  const centerLine = (text = '') => {
    const safeText = String(text).slice(0, bannerWidth);
    const left = Math.floor((bannerWidth - safeText.length) / 2);
    return `${' '.repeat(left)}${safeText}`.padEnd(bannerWidth, ' ');
  };
  return [
    '-'.repeat(bannerWidth),
    centerLine('✦ Agent Public Squares ✦'),
    centerLine('=^._.^=  <-- 共用 Drive -->  =^._.^='),
    centerLine('packets  |  versions  |  ack'),
    centerLine(`v${packageVersion} pre-release`),
    '-'.repeat(bannerWidth),
  ];
}

function printBrandCard() {
  const useAnsi = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
  for (const [index, line] of brandCardLines().entries()) {
    if (useAnsi && (index === 1 || index === 2)) {
      console.log(`\x1b[36;1m${line}\x1b[0m`);
    } else if (useAnsi && index === 4) {
      console.log(`\x1b[33m${line}\x1b[0m`);
    } else {
      console.log(line);
    }
  }
}

async function runInteractiveInit() {
  const root = homeDir();
  if (!root) {
    console.error('Could not detect your home directory. Set HOME or USERPROFILE, then rerun `npx aps init`.');
    return 1;
  }

  printBrandCard();
  console.log('');
  printDivider('APS 初次設定');
  console.log('👋 這一步只設定你自己這一邊,把本機工作目錄接到 APS 交換區與 APS 合作目錄。');
  console.log('🧭 只問三件事;最後會先列出寫入計劃,你輸入 yes 才會寫入。');
  console.log('🤝 協作對象可在設定完成後再邀請,毋須現在決定。');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    printPromptBlock({
      step: '1/3',
      title: 'APS 交換區',
      body: [
        '☁️  請貼上你電腦上 Google Drive 同步資料夾的完整路徑。',
        '第一次建立可新增 Agent_Public_Squares;受邀加入則貼上對方分享給你的資料夾路徑。',
        '如果資料夾未存在,工具會替你建立;不會覆蓋原有內容。',
      ],
      example: 'G:\\我的雲端硬碟\\Agent_Public_Squares',
    });
    const hubRoot = await askWithDefault(
      rl,
      '請輸入 APS 交換區完整路徑',
      '',
      (value) => localizeValidation(validateNoPlaceholder('--hub-root', value)) || (path.isAbsolute(value) ? null : '請貼上完整路徑,例如 G:\\我的雲端硬碟\\Agent_Public_Squares 或 C:\\Users\\你\\Google Drive\\Agent_Public_Squares。')
    );
    const defaultProject = 'shared_project';
    printPromptBlock({
      step: '2/3',
      title: 'APS 合作目錄名稱',
      body: [
        '📌 用來在 APS 交換區內分開不同合作項目,也會成為資料夾名稱。',
        '請用合作項目或任務命名,不要用人名、電腦名、AI 名稱或發起人名稱。',
        '請用小寫英文字母、數字或底線。',
      ],
      example: 'brand_refresh_2026 或 client_site_rebuild',
    });
    const projectSlug = await askWithDefault(rl, '請輸入 APS 合作目錄名稱', defaultProject, (value) => (
      localizeValidation(validateNoPlaceholder('--project', value) || validateSnakeCase('--project', value))
    ));
    const defaultAgent = '';
    printPromptBlock({
      step: '3/3',
      title: '你自己的用戶名稱',
      body: [
        '👤 這是你在此 APS 合作目錄中的共享身份,由你自己決定。',
        '請用小寫英文字母、數字或底線;不要照抄別人的名稱。',
      ],
      example: 'user1 或 project_lead',
    });
    const agentId = await askWithDefault(rl, '請輸入你自己的用戶名稱', defaultAgent, (value) => (
      localizeValidation(validateNoPlaceholder('--agent-id', value) || validateSnakeCase('--agent-id', value))
    ));

    const projectPath = projectDir(hubRoot, projectSlug);
    // Role is no longer asked. It only seeds the bridge-pack fixture and is never used for
    // authorization. Infer the setup direction: if this project already exists in the Hub and
    // someone else is already confirmed / active here, this user is most likely the joiner.
    let inferredRole = 'A';
    try {
      if (fs.existsSync(projectPath)) {
        const others = readPeerCards(hubRoot, projectSlug).filter((peer) => peer.agent_id && peer.agent_id !== agentId);
        const someoneElseActive = others.some((peer) => peerIsConfirmed(peer))
          || others.some((peer) => hasSelfActivity({ hubRoot, projectSlug, agentId: peer.agent_id }));
        if (someoneElseActive) inferredRole = 'B';
      }
    } catch (err) { /* detection is best-effort; it never blocks setup */ }
    const values = { hubRoot, projectSlug, agentId, otherAgentId: null, role: inferredRole, inviteCode: null };
    const setupHint = inferredRole === 'B'
      ? '偵測:此 APS 合作目錄已存在,而且已有其他成員先完成設定。你似乎是加入者。若你確實是第一個設定的人,可忽略此提示。'
      : null;
    console.log('');
    printDivider('📝 寫入前計劃');
    console.log(`  ☁️  APS 交換區: ${values.hubRoot}`);
    console.log(`  📁 APS 合作目錄: ${values.projectSlug}`);
    console.log(`  👤 你自己: ${values.agentId}`);
    console.log('  🤝 協作對象: 尚未設定 (設定好之後隨時可以邀請)');
    console.log(`  📂 會建立或使用的 APS 合作目錄資料夾: ${projectPath}`);
    console.log(`  ⚙️  本機設定檔: ${configPath()}`);
    if (setupHint) {
      console.log('');
      console.log(`  📍 ${setupHint}`);
    }
    console.log('');
    const confirm = await askLine(rl, '確認無誤請輸入 yes,工具才會安裝 skill、建立共用 Drive 資料夾 skeleton 並保存本機設定: ');
    console.log('');
    if (confirm === null) throw new Error('輸入在寫入確認前中止。沒有寫入共用 Drive 資料夾檔案。請重新執行 `npx aps init`。');
    if (confirm.toLowerCase() !== 'yes') {
      console.log('已取消。沒有寫入共用 Drive 資料夾檔案。');
      return 1;
    }
    ensureHandoffKitReady();

    const installTargets = [
      { label: 'Claude Code', targetDir: path.join(root, '.claude', 'skills', 'aps') },
      { label: 'Codex', targetDir: path.join(root, '.codex', 'skills', 'aps') },
    ];
    console.log('');
    for (const result of installTargets.map((item) => installSkill({ ...item, dryRun: false, refresh: false }))) {
      console.log(formatSetupResult(result, `${result.label}: `));
      if (!result.ok && !result.skipped) return 1;
    }
    console.log('');
    console.log('☁️ 建立共用 Drive 資料夾:');
    for (const result of setupHub(values, false)) {
      console.log(formatSetupResult(result));
    }
    console.log('');
    console.log('✅ APS 設定完成 (已設定你自己這一邊)。');
    console.log('🚀 下一步:在這個項目資料夾打開 AI 工具,輸入「教我用 APS」。AI 應讀取現有設定、檢查共用 Drive 資料夾,先建立共同目標與分工;已有 confirmed peer 並完成基準確認後,才建議測試交接或正式交接。');
    console.log('🤝 想邀請協作者?隨時可以在 AI 工具說「邀請新協作者加入這個項目」。');
    console.log('   • AI 會生成同一份可轉發邀請,讓對方在自己電腦選定用戶名稱。');
    console.log('   • 你不需要先知道或替對方設定用戶名稱。');
    console.log('   • 終端機命令只屬備用 / 維護路徑;一般新協作者邀請不要把 `peer add` 當成選項。');
    console.log('🩺 備用檢查:在 AI 工具說「Check APS」;熟悉終端機時才直接用 `npx aps doctor`。請留意指令名稱是 `aps`,不是 `asp`。');
    return 0;
  } finally {
    rl.close();
  }
}

function localizeValidation(message) {
  if (!message) return null;
  return String(message)
    .replace(/--project/g, 'APS 合作目錄名稱')
    .replace(/--agent-id/g, '你的用戶名稱')
    .replace(/--other-agent-id/g, '對方用戶名稱')
    .replace(/--hub-root/g, '共用 Drive 資料夾 root path')
    .replace(/must be lowercase snake_case, start with a letter, and be 1-30 characters\. Got/g, '必須以小寫英文字母開頭,只可使用小寫英文字母、數字與底線,長度為 1 至 30 字元。目前收到')
    .replace(/still looks like a placeholder:/g, '仍像示例或佔位值:')
    .replace(/Replace it with your real value before running the command\./g, '請改用真實值後再繼續。');
}

function formatSetupResult(result, labelPrefix = '') {
  const icon = result.ok ? '✅' : result.skipped ? '⏭️' : '❌';
  return `${icon} ${labelPrefix}${localizeSetupMessage(result.message)}`;
}

function localizeSetupMessage(message) {
  return String(message)
    .replace(/^would install to /, '將會安裝到 ')
    .replace(/^installed to /, '已安裝到 ')
    .replace(/^would backup (.*) to (.*) and refresh skill$/, '將會備份 $1 到 $2,並刷新 skill')
    .replace(/^backed up (.*) to (.*) and refreshed skill$/, '已備份 $1 到 $2,並刷新 skill')
    .replace(/^failed to refresh (.*): (.*)$/, '刷新失敗: $1 ($2)')
    .replace(/^target already exists; not overwriting \((.*)\)$/, '目標已存在,不覆寫 ($1)')
    .replace(/^failed to install to (.*): (.*)$/, '安裝失敗: $1 ($2)')
    .replace(/^source skill not found at /, '找不到 skill 來源: ')
    .replace(/^would create /, '將會建立 ')
    .replace(/^created /, '已建立 ')
    .replace(/^would write /, '將會寫入 ')
    .replace(/^wrote /, '已寫入 ')
    .replace(/^would write\/update /, '將會寫入或更新 ')
    .replace(/^wrote\/updated /, '已寫入或更新 ')
    .replace(/^would add APS rule-pack-route registration in /, '將會新增 APS 路由註冊到 ')
    .replace(/^would refresh APS rule-pack-route registration in /, '將會更新 APS 路由註冊於 ')
    .replace(/^added APS rule-pack-route registration in /, '已新增 APS 路由註冊到 ')
    .replace(/^refreshed APS rule-pack-route registration in /, '已更新 APS 路由註冊於 ')
    .replace(/^APS rule-pack-route registration already current \((.*)\)$/, 'APS 路由註冊已是最新 ($1)')
    .replace(/^would add APS project-index-skill registration in /, '將會新增 APS 項目索引註冊到 ')
    .replace(/^would refresh APS project-index-skill registration in /, '將會更新 APS 項目索引註冊於 ')
    .replace(/^added APS project-index-skill registration in /, '已新增 APS 項目索引註冊到 ')
    .replace(/^refreshed APS project-index-skill registration in /, '已更新 APS 項目索引註冊於 ')
    .replace(/^APS project-index-skill registration already current \((.*)\)$/, 'APS 項目索引註冊已是最新 ($1)')
    .replace(/^exists; not overwriting \((.*)\)$/, '已存在,不覆寫 ($1)');
}

function packetTimestamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function isoNow(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function validateTopic(topic) {
  if (!/^[a-z][a-z0-9_]{0,39}$/.test(topic)) {
    return `--topic must be lower_snake, start with a letter, and be 1-40 characters. Got '${topic}'.`;
  }
  return null;
}

function validatePacketId(packetId) {
  if (!/^\d{8}T\d{6}Z__[a-z][a-z0-9_]{0,39}$/.test(packetId)) {
    return `--packet-id must look like <UTC-yyyymmddThhmmssZ>__<short_snake_topic>. Got '${packetId}'.`;
  }
  return null;
}

function requireFlags(names) {
  const missing = names.filter((name) => !getRequiredFlagValue(name));
  if (missing.length > 0) {
    console.error(`Missing required flags: ${missing.join(', ')}`);
    process.exit(1);
  }
}

function projectDir(hubRoot, projectSlug) {
  return path.join(hubRoot, projectSlug);
}

function contextDir(hubRoot, projectSlug) {
  return path.join(projectDir(hubRoot, projectSlug), '_context');
}

function apsLiveBridgeTokenPath(hubRoot, projectSlug) {
  return path.join(contextDir(hubRoot, projectSlug), 'live_bridge_token.json');
}

function apsLiveQueueDir(hubRoot, projectSlug) {
  return path.join(contextDir(hubRoot, projectSlug), 'live_queue');
}

function safeQueueFileToken(value) {
  return String(value || 'aps_live')
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'aps_live';
}

function readOrCreateApsLiveBridgeToken({ hubRoot, projectSlug, dryRun = false }) {
  const tokenPath = apsLiveBridgeTokenPath(hubRoot, projectSlug);
  if (fs.existsSync(tokenPath)) {
    const tokenRecord = readJson(tokenPath);
    if (tokenRecord && tokenRecord.token) return tokenRecord.token;
  }
  const token = crypto.randomBytes(24).toString('hex');
  if (!dryRun) {
    writeJson(tokenPath, {
      project: projectSlug,
      token,
      created_at: isoNow(),
      note: 'Local-only APS Live bridge token. Do not send to peers.',
    });
  }
  return token;
}

function readApsLiveBridgeToken({ hubRoot, projectSlug }) {
  const tokenPath = apsLiveBridgeTokenPath(hubRoot, projectSlug);
  if (!fs.existsSync(tokenPath)) return null;
  const tokenRecord = readJson(tokenPath);
  return tokenRecord && tokenRecord.token ? tokenRecord.token : null;
}

function writeApsLiveQueueItem({ hubRoot, projectSlug, payload }) {
  const queueDir = apsLiveQueueDir(hubRoot, projectSlug);
  const queuedAt = isoNow();
  const messageId = payload && (payload.message_id || payload.task_id || payload.created_at);
  const fileName = `${packetTimestamp(new Date())}__${safeQueueFileToken(messageId || payload && payload.task_mode)}.json`;
  const queuePath = path.join(queueDir, fileName);
  const record = {
    id: path.basename(queuePath, '.json'),
    queued_at: queuedAt,
    project: projectSlug,
    source: 'aps-live',
    payload,
  };
  writeJson(queuePath, record);
  return { queuePath, record };
}

function readApsLiveQueueItems({ hubRoot, projectSlug, limit = 8 }) {
  const queueDir = apsLiveQueueDir(hubRoot, projectSlug);
  if (!fs.existsSync(queueDir)) return [];
  return fs.readdirSync(queueDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => {
      const filePath = path.join(queueDir, name);
      try {
        return { filePath, ...readJson(filePath) };
      } catch (err) {
        return { filePath, id: name, queued_at: '(無法讀取)', payload: { task_mode: '讀取失敗', error: err.message } };
      }
    })
    .sort((a, b) => String(b.queued_at || '').localeCompare(String(a.queued_at || '')))
    .slice(0, limit);
}

function contextLogPath(hubRoot, projectSlug, agentId) {
  return path.join(contextDir(hubRoot, projectSlug), `from_${agentId}`, 'context.log.md');
}

function pathWithinDir(candidatePath, parentDir) {
  const relative = path.relative(path.resolve(parentDir), path.resolve(candidatePath));
  return relative === '' || (!!relative && !relative.startsWith('..') && !path.isAbsolute(relative));
}

function peerAgentsDir(hubRoot, projectSlug) {
  return path.join(projectDir(hubRoot, projectSlug), '_peers', 'agents');
}

function peerCardPath(hubRoot, projectSlug, agentId) {
  return path.join(peerAgentsDir(hubRoot, projectSlug), `${agentId}.json`);
}

function inviteDir(hubRoot, projectSlug) {
  return path.join(projectDir(hubRoot, projectSlug), '_invites');
}

function inviteRecordPath(hubRoot, projectSlug, inviteCode) {
  return path.join(inviteDir(hubRoot, projectSlug), `${inviteCode}.json`);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function appendLine(filePath, line) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

function generateInviteCode(projectSlug) {
  const projectToken = String(projectSlug || 'APS')
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, 'X');
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `APS-${projectToken}-${random.slice(0, 4)}-${random.slice(4, 8)}`;
}

function validateInviteCode(inviteCode) {
  if (!inviteCode) return null;
  return /^APS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(String(inviteCode).trim())
    ? null
    : `--invite-code must look like APS-ABCD-1234-5678. Got '${inviteCode}'.`;
}

function createInviteRecord({ hubRoot, projectSlug, inviterAgentId, dryRun }) {
  let inviteCode = generateInviteCode(projectSlug);
  let recordPath = inviteRecordPath(hubRoot, projectSlug, inviteCode);
  for (let attempt = 0; fs.existsSync(recordPath) && attempt < 5; attempt += 1) {
    inviteCode = generateInviteCode(projectSlug);
    recordPath = inviteRecordPath(hubRoot, projectSlug, inviteCode);
  }
  if (fs.existsSync(recordPath)) throw new Error('Could not generate a unique invite code. Please retry.');
  const record = {
    invite_code: inviteCode,
    project: projectSlug,
    inviter_agent_id: inviterAgentId,
    status: 'open',
    created_at: isoNow(),
    accepted_by: null,
    accepted_at: null,
  };
  if (!dryRun) writeJson(recordPath, record);
  return { record, recordPath };
}

function acceptInviteCode({ hubRoot, projectSlug, inviteCode, agentId, dryRun }) {
  const recordPath = inviteRecordPath(hubRoot, projectSlug, inviteCode);
  if (!fs.existsSync(recordPath)) {
    throw new Error(`Invite code ${inviteCode} was not found for project ${projectSlug}. Ask the inviter to generate a fresh APS invite and send you the full invitation message.`);
  }
  const record = readJson(recordPath);
  if (record.project !== projectSlug) {
    throw new Error(`Invite code ${inviteCode} belongs to project ${record.project}, not ${projectSlug}.`);
  }
  if (record.status !== 'open') {
    throw new Error(`Invite code ${inviteCode} is ${record.status}; ask the inviter for a fresh invite.`);
  }
  const next = {
    ...record,
    status: 'accepted',
    accepted_by: agentId,
    accepted_at: isoNow(),
  };
  if (!dryRun) writeJson(recordPath, next);
  return {
    ok: true,
    path: recordPath,
    message: dryRun ? `would mark invite ${inviteCode} accepted by ${agentId}` : `marked invite ${inviteCode} accepted by ${agentId}`,
  };
}

function peerCardRecord({ projectSlug, agentId, displayName, status = 'active', peerState = 'provisional' }) {
  return {
    project: projectSlug,
    agent_id: agentId,
    display_name: displayName || agentId,
    lane: `from_${agentId}`,
    status,
    peer_state: peerState,
    updated_at: isoNow(),
  };
}

function peerCardJson({ projectSlug, agentId, displayName, status = 'active', peerState = 'provisional' }) {
  return `${JSON.stringify(peerCardRecord({ projectSlug, agentId, displayName, status, peerState }), null, 2)}\n`;
}

function readPeerCards(hubRoot, projectSlug) {
  const dirPath = peerAgentsDir(hubRoot, projectSlug);
  if (!fs.existsSync(dirPath)) return [];
  const peers = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const filePath = path.join(dirPath, entry.name);
    try {
      const card = readJson(filePath);
      if (card && card.agent_id) peers.push({ ...card, path: filePath });
    } catch (err) {
      const agentId = entry.name.replace(/\.json$/, '');
      peers.push({
        agent_id: agentId,
        display_name: agentId,
        lane: `from_${agentId}`,
        status: 'invalid',
        peer_state: 'invalid',
        path: filePath,
        error: err.message,
      });
    }
  }
  peers.sort((a, b) => String(a.agent_id).localeCompare(String(b.agent_id)));
  return peers;
}

function peerCompatibilityView(config) {
  const peers = [];
  if (config.agentId) {
    peers.push({
      agent_id: config.agentId,
      display_name: config.agentId,
      lane: `from_${config.agentId}`,
      status: 'active',
      peer_state: 'confirmed',
      source: '.aps/config.json',
      is_self: true,
    });
  }
  if (config.otherAgentId) {
    peers.push({
      agent_id: config.otherAgentId,
      display_name: config.otherAgentId,
      lane: `from_${config.otherAgentId}`,
      status: 'active',
      peer_state: 'confirmed',
      source: '.aps/config.json',
      is_default_peer: true,
    });
  }
  return peers;
}

function listProjectPeers({ hubRoot, projectSlug, config }) {
  const cards = readPeerCards(hubRoot, projectSlug);
  if (cards.length > 0) {
    return {
      source: '_peers/agents',
      peers: cards.map((peer) => ({
        ...peer,
        is_self: peer.agent_id === config.agentId,
        is_default_peer: peer.agent_id === config.otherAgentId,
      })),
    };
  }
  return { source: '.aps/config.json compatibility', peers: peerCompatibilityView(config) };
}

function findPeer({ hubRoot, projectSlug, config, agentId }) {
  return listProjectPeers({ hubRoot, projectSlug, config }).peers.find((peer) => peer.agent_id === agentId) || null;
}

function peerIsConfirmed(peer) {
  return peer && peer.status !== 'inactive' && peer.peer_state === 'confirmed';
}

// Genuine evidence that <agentId> has acted from its own machine on this Hub:
// it has published from its own lane, or has a real consumed entry in its own ack.
// A bare lane / ack does NOT count, because init and peer add create those skeletons
// for both sides regardless of whether the agent has actually joined.
function hasSelfActivity({ hubRoot, projectSlug, agentId }) {
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md');
  if (fs.existsSync(outboxPath)) {
    try {
      if (readOutboxEvents(outboxPath).some((event) => event.verb === 'publish' || event.verb === 'revise')) {
        return true;
      }
    } catch (err) { /* unreadable outbox is not evidence */ }
  }
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  if (fs.existsSync(ackPath)) {
    try {
      const ack = readJson(ackPath);
      if (ack && ack.agent === agentId && Array.isArray(ack.consumed) && ack.consumed.length > 0) {
        return true;
      }
      if (ack && ack.agent === agentId && Array.isArray(ack.declined) && ack.declined.length > 0) {
        return true;
      }
    } catch (err) { /* unreadable ack is not evidence */ }
  }
  return false;
}

// Participation self-confirms: mark <agentId>'s OWN peer card confirmed. Only ever the self
// card; never the counterpart (per roadmap 4.2 "each card written by that agent itself").
// No-op when already confirmed or when the card was explicitly marked inactive.
function selfConfirmPeer({ hubRoot, projectSlug, agentId }) {
  const cardPath = peerCardPath(hubRoot, projectSlug, agentId);
  let displayName = agentId;
  if (fs.existsSync(cardPath)) {
    try {
      const card = readJson(cardPath);
      if (card.display_name) displayName = card.display_name;
      if (card.status === 'inactive') return false;
      if (card.peer_state === 'confirmed') return false;
    } catch (err) { /* malformed card will be rewritten as confirmed */ }
  }
  fs.mkdirSync(path.dirname(cardPath), { recursive: true });
  fs.writeFileSync(cardPath, peerCardJson({ projectSlug, agentId, displayName, peerState: 'confirmed' }), 'utf8');
  return true;
}

function localConfigMatchesSelf({ hubRoot, projectSlug, agentId }) {
  try {
    const config = loadConfig();
    return config.hubRoot === hubRoot && config.projectSlug === projectSlug && config.agentId === agentId;
  } catch (err) {
    return false;
  }
}

function selfIdentityConflict({ hubRoot, projectSlug, agentId }) {
  if (localConfigMatchesSelf({ hubRoot, projectSlug, agentId })) return null;
  const lanePath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`);
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  const cardPath = peerCardPath(hubRoot, projectSlug, agentId);
  if (!fs.existsSync(lanePath) && !fs.existsSync(ackPath) && !fs.existsSync(cardPath)) return null;

  let card = null;
  if (fs.existsSync(cardPath)) {
    try {
      card = readJson(cardPath);
    } catch (err) {
      return `用戶名稱 ${agentId} 已有 peer card,但內容讀取失敗。請先人工檢查 ${cardPath},不要覆寫同名身份。`;
    }
  }
  const active = hasSelfActivity({ hubRoot, projectSlug, agentId });
  if (card && card.status !== 'inactive' && card.peer_state === 'provisional' && !active) {
    return null;
  }
  return `用戶名稱 ${agentId} 在這個 APS 合作目錄已存在。請改用另一個自己的用戶名稱;如果這其實是你本人的既有項目,請在原本已接入 APS 的本機工作目錄執行 \`npx aps upgrade\` 或 \`npx aps config\`,不要用新安裝覆寫同名身份。`;
}

// Three-way publish reachability for the recipient. Authorization rests on peer state and
// real activity, never on role: confirmed → send; provisional but active → send + warn;
// inactive / unregistered / no activity → block.
function peerReachableForPublish({ peer, hubRoot, projectSlug, toId }) {
  if (!peer) {
    return { ok: false, reason: `${toId} is not registered as a project peer. For a new collaborator, ask your AI to generate an APS invite and wait for them to join with their own user name. Maintenance fallback only: if you already agreed this exact user name with them, use peer add for that exact id.` };
  }
  if (peer.status === 'inactive') {
    return { ok: false, reason: `${toId} is marked inactive and is no longer an active peer for new handoffs.` };
  }
  if (peer.peer_state === 'confirmed') {
    return { ok: true };
  }
  if (hasSelfActivity({ hubRoot, projectSlug, agentId: toId })) {
    return {
      ok: true,
      warn: `${toId} is still listed as ${peer.peer_state || 'provisional'}, but has real activity on this 共用 Drive 資料夾, so the packet will be sent. ${toId}'s own next publish / consume / init will mark its status confirmed.`,
    };
  }
  return { ok: false, reason: `${toId} is ${peer.peer_state || 'not confirmed'} and has no activity yet; wait for that peer to set up before publishing a formal packet. For ordinary new collaborators, ask your AI to generate an APS invite so they choose their own user name.` };
}

function ensureExistingFile(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}. Run \`aps init --hub-root ...\` first, or check the path and project slug.`);
  }
}

function ensureExistingDir(dirPath, label) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    throw new Error(`${label} not found: ${dirPath}. Run \`aps init --hub-root ...\` first, or check the path and project slug.`);
  }
}

function yamlDoubleQuote(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

// Clip a one-line summary to maxLength, appending a single ellipsis when it was
// actually shortened, so a truncated summary never reads as an unfinished sentence.
// Short text is returned unchanged (no spurious ellipsis). Total length stays <= maxLength.
function clipWithEllipsis(value, maxLength) {
  const text = String(value || '');
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function isBodySectionLabel(line) {
  const text = String(line || '').trim();
  if (!text || text.length > 80) return false;
  return /^(common goal|own-side task|counterpart task|crossing point|requested action|do not misunderstand|evidence|risks and open items|共同目標|本方任務|對方任務|交叉點|請對方做的事|不應誤解|證據|風險|未決|摘要|目標|注意事項)\s*[:：]$/i.test(text);
}

function firstBodyContentLine(body) {
  return String(body || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line
      && !line.startsWith('#')
      && !line.startsWith('---')
      && !line.startsWith('|')
      && !isBodySectionLabel(line));
}

function packetScopeFromBody(body, fallback) {
  const meaningful = firstLineAfterHeading(body, /(請對方做的事|請.*做|requested action|action requested)/i)
    || firstLineAfterHeading(body, /(共同目標|摘要|目標|common goal|summary|goal)/i)
    || firstBodyContentLine(body);
  return yamlDoubleQuote(clipWithEllipsis(meaningful || fallback, 120));
}

function compactNoticeText(value, fallback, maxLength = 220) {
  const text = String(value || '')
    .replace(/\r?\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clipWithEllipsis(text || fallback, maxLength);
}

function firstMeaningfulBodyLine(body) {
  return firstBodyContentLine(body);
}

function firstLineAfterHeading(body, headingPattern) {
  const lines = String(body || '').split(/\r?\n/);
  let inside = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#+\s+/.test(trimmed)) {
      inside = headingPattern.test(trimmed);
      continue;
    }
    if (isBodySectionLabel(trimmed)) {
      inside = headingPattern.test(trimmed);
      continue;
    }
    if (inside && trimmed && !trimmed.startsWith('|')) return trimmed;
  }
  return null;
}

function noticeSummaryFromBody(body, fallback) {
  return compactNoticeText(
    firstLineAfterHeading(body, /(請對方做的事|請.*做|requested action|action requested)/i)
      || firstLineAfterHeading(body, /(共同目標|摘要|目標|common goal|summary|goal)/i)
      || firstMeaningfulBodyLine(body),
    fallback
  );
}

function noticeAttentionFromBody(body) {
  return compactNoticeText(
    firstLineAfterHeading(body, /(注意|不應誤解|風險|未決|do not misunderstand|risks|open items)/i),
    '請先由收件人確認時間、工作目錄與資料狀態已準備好,再叫 AI 介入。'
  );
}

function receiverNotice({ projectSlug, topic, packetId, version, label, fromId, toId, summary, attention }) {
  const receiverLabel = toId || '對方';
  return [
    `📨 APS ${label}`,
    '',
    `📌 項目: ${projectSlug}`,
    fromId ? `👤 來源: ${fromId}` : '👤 來源: 發送方',
    `🧭 主題: ${topic}`,
    `📦 交接包: ${packetId} v${version}`,
    '',
    '🔎 重點摘要',
    compactNoticeText(summary, '請收件方 AI 讀取共用 Drive 資料夾內的交接包正文。'),
    '',
    '⚠️ 注意事項',
    compactNoticeText(attention, '請先由收件人確認時間、工作目錄與資料狀態已準備好,再叫 AI 介入。'),
    '不要使用發送方的本機 Google Drive 路徑;收件方 AI 會讀取自己電腦上的 APS 設定。',
    '',
    `🚀 ${receiverLabel} 下一步`,
    '請在你自己電腦上打開已接入 APS 的對應項目資料夾,由你本人確認可以處理後,向 AI 輸入「check Drive」。',
  ].join('\n');
}

function parseOutboxLine(line) {
  if (!line.trim() || line.trim().startsWith('<!--') || line.trim().startsWith('#')) return null;
  const parts = line.split('|').map((part) => part.trim());
  if (parts.length < 3) return null;
  const packetVersion = parts[2].match(/^(.+)\s+v(\d+)$/);
  if (!packetVersion) return null;
  const kv = {};
  for (const part of parts.slice(3)) {
    const index = part.indexOf(':');
    if (index > 0) kv[part.slice(0, index)] = part.slice(index + 1);
  }
  return {
    at: parts[0],
    verb: parts[1],
    packetId: packetVersion[1],
    version: Number(packetVersion[2]),
    kv,
  };
}

function readOutboxEvents(outboxPath) {
  if (!fs.existsSync(outboxPath)) return [];
  return fs.readFileSync(outboxPath, 'utf8')
    .split(/\r?\n/)
    .map(parseOutboxLine)
    .filter(Boolean);
}

function readPacketSummary(hubRoot, projectSlug, senderId, packetId, version) {
  const packetPath = path.join(projectDir(hubRoot, projectSlug), `from_${senderId}`, 'packets', `${packetId}__v${version}`, 'packet.md');
  if (!fs.existsSync(packetPath)) {
    return { packetPath, scope: '(packet.md not found)', items: [], body: '' };
  }
  const text = fs.readFileSync(packetPath, 'utf8');
  let header = {};
  try {
    header = parsePacketHeader(packetPath);
  } catch (_) {
    header = {};
  }
  const scopeMatch = text.match(/^scope:\s*"?(.+?)"?\s*$/m);
  const itemMatches = parseFrontmatterItems(text);
  return {
    packetPath,
    from: header.from,
    to: header.to,
    project: header.project,
    scope: scopeMatch ? scopeMatch[1] : '(scope not found)',
    items: itemMatches,
    body: packetBodyText(text),
  };
}

function packetBodyText(packetText) {
  let body = String(packetText || '').replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
  body = body.replace(/^# .*(?:\r?\n)+/, '');
  return body.trim();
}

function inboxWhatSummary(item) {
  const summary = firstLineAfterHeading(item.body, /(請對方做的事|請.*做|requested action|action requested)/i)
    || firstLineAfterHeading(item.body, /(共同目標|摘要|目標|common goal|summary|goal)/i)
    || firstBodyContentLine(item.body)
    || item.scope
    || item.packetId;
  return compactNoticeText(summary, item.packetId, 260);
}

function inboxActionLines(item) {
  if (item.items && item.items.length > 0) {
    return item.items.map((action) => `- ${action}`);
  }
  const action = firstLineAfterHeading(item.body, /(請對方做的事|請.*做|requested action|action requested)/i);
  if (action) return [`- ${compactNoticeText(action, action, 220)}`];
  return ['- 對方未用 `--items` 明確列出待辦。請先讀完整內容,再決定是否需要對方補交。'];
}

function inboxAttentionText(item) {
  return noticeAttentionFromBody(item.body);
}

function isSharedGoalInboxItem(item) {
  return sharedGoalTopicFrom({ packetId: item.packetId, summary: item }) === 'shared_goal_and_roles';
}

function sharedGoalInboxDetails(item) {
  const summary = sharedGoalSummaryFromBody(item.body);
  const openItems = firstLineAfterHeading(item.body, /(風險\s*\/\s*未決事項|風險|未決|open items|risks and open items)/i)
    || '未在基準包內摘出未決事項';
  const requested = item.items && item.items.length > 0
    ? item.items.join('；')
    : firstLineAfterHeading(item.body, /(請對方做的事|請.*做|requested action|action requested)/i)
      || '確認這一版共同目標與分工；如不同意，提出修訂或異議。';
  const extracted = [summary.goal, summary.roles, summary.firstRound, summary.acceptance, openItems];
  const insufficient = extracted.some((value) => /^未在基準包內摘出/.test(String(value || '')));
  return { summary, openItems, requested, insufficient };
}

function packetHasAnyHeading(body, patterns) {
  return patterns.some((pattern) => firstLineAfterHeading(body, pattern));
}

function packetBodyWithoutActionHeadings(body) {
  return packetBodyText(body)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && !/^[-*]\s+id\s*:/i.test(line))
    .filter((line) => !/^(共同目標|請對方做的事|風險|摘要|目標|每人角色|角色|第一輪分工|驗收標準|證據位置|不應誤解|交叉點)\s*$/i.test(line))
    .join('\n');
}

function actionabilityPromptFor(item, sourceId) {
  const topic = packetTopic(item.packetId);
  if (item.actionability && item.actionability.state === 'return') {
    return `請讀 ${sourceId} 的 ${topic} v${item.version}，判斷是否資料不足；若不足，幫我生成退回理由。`;
  }
  if (item.actionability && item.actionability.state === 'clarify_goal') {
    return `請先核對共同目標與分工，再決定是否處理 ${sourceId} 的 ${topic} v${item.version}。`;
  }
  if (item.actionability && item.actionability.state === 'wait_revision') {
    return `請等 ${sourceId} 修訂 ${topic} v${item.version}，暫時不要標記已處理。`;
  }
  return `請讀 ${sourceId} 的 ${topic} v${item.version}，先做完整性預檢，再決定是否處理。`;
}

function assessPendingActionability(item, { sharedGoal = null } = {}) {
  const topic = packetTopic(item.packetId);
  const scope = String(item.scope || '').trim();
  if (topic === 'shared_goal_and_roles' || scope === 'shared_goal_and_roles') {
    return {
      state: 'clarify_goal',
      label: '先確認共同目標',
      reason: '這不是普通任務，是共同目標與分工基準。先確認同意、部分同意或有異議。',
      next: '先讀共同目標與分工正文；確認後才處理普通交接。',
    };
  }
  if (!sharedGoal || sharedGoal.state === 'missing') {
    return {
      state: 'clarify_goal',
      label: '先釐清共同目標',
      reason: '目前未見有效共同目標與分工；不應先處理普通任務。',
      next: '先要求對方發出或補發 shared_goal_and_roles。',
    };
  }
  if (sharedGoal.state === 'declined' || sharedGoal.state === 'partial' || sharedGoal.state === 'incoming_pending') {
    return {
      state: 'clarify_goal',
      label: '先釐清共同目標',
      reason: `共同目標與分工仍是「${sharedGoal.label}」；普通任務可能建立在未確認口徑上。`,
      next: '先完成共同目標與分工確認或釐清，再處理普通任務。',
    };
  }
  const body = String(item.body || '');
  const hasAction = (item.items && item.items.length > 0) || packetHasAnyHeading(body, [/(請對方做的事|請.*做|requested action|action requested)/i]);
  const hasGoal = packetHasAnyHeading(body, [/(共同目標|common goal|目標)/i]);
  const hasEvidence = packetHasAnyHeading(body, [/(真源指標|可共享真源|證據位置|證據|來源|reference|ssot|檔案|file)/i]) || /\bhttps?:\/\//i.test(body);
  const evidenceSection = firstLineAfterHeading(body, /(真源指標|可共享真源|證據位置|證據|來源|reference|ssot|檔案|file)/i) || '';
  const hasShareableEvidence = hasEvidence && (
    hasShareableSourcePointer(evidenceSection)
    || /\bhttps?:\/\//i.test(body)
    || hasShareableSourcePointer(body)
  );
  const hasReceiverStartCondition = packetHasAnyHeading(body, [/(接收方開工條件|開工條件|開始前條件|可開工條件|ready to start|start condition)/i]);
  const hasRisk = packetHasAnyHeading(body, [/(風險|未決|注意|risk|open question)/i]);
  const bodyContent = packetBodyWithoutActionHeadings(body);
  const actionText = [
    ...(item.items || []),
    firstLineAfterHeading(body, /(請對方做的事|請.*做|requested action|action requested)/i) || '',
  ].join(' ');
  const looksLikeReviewMissingObject = /(確認|審閱|review|check|判斷|是否適合|是否可用)/i.test(actionText)
    && !/(候選|原文|如下|：|:|「|」|『|』|https?:\/\/)/.test(bodyContent);
  const missing = [];
  if (!hasAction) missing.push('未清楚列出要你做的事');
  if (!hasGoal) missing.push('未列明共同目標');
  if (looksLikeReviewMissingObject) missing.push('要求審閱或確認，但沒有提供要審閱的實際內容');
  if (!hasEvidence) missing.push('未列明真源指標或來源位置');
  if (hasEvidence && !hasShareableEvidence) missing.push('真源指標不是對方可找回的共享來源');
  if (containsLocalOnlyPath(evidenceSection) && !hasShareableEvidence) missing.push('只列出發送方本機路徑，收件方不能直接開工');
  if (!hasReceiverStartCondition) missing.push('未列明接收方開工條件');
  if (missing.length > 0) {
    return {
      state: 'return',
      label: '需退回補資料',
      reason: missing.join('；'),
      next: '請對方修訂原交接，補齊缺少資料；補齊前不要標記已處理。',
    };
  }
  return {
    state: 'actionable',
    label: '可開工',
    reason: hasRisk ? '交接有任務、共同目標、真源指標或來源，並列出風險。' : '交接有任務、共同目標、真源指標或來源；未見阻塞缺口。',
    next: '先讀完整交接內容，做本機對接檢查；通過後再處理或回覆。',
  };
}

function contextInboxBrief(report) {
  if (!report || !report.exists || report.entries.length === 0) return [];
  const errors = report.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = report.issues.length - errors;
  const lines = [
    '🧭 項目背景索引',
    '只作理解背景;真正要處理的內容仍以上面的交接為準。',
  ];
  if (errors > 0) {
    lines.push(`背景索引有 ${errors} 個來源錯誤,本次不可把它當成事實。`);
  } else if (warnings > 0) {
    lines.push(`背景索引有 ${warnings} 個提醒,閱讀時要先核對最新交接。`);
  } else {
    lines.push('背景索引來源檢查未見阻塞錯誤。');
  }
  for (const entry of report.entries.slice(0, 3)) {
    const title = entry.workstream || entry.current_focus || entry.source_packet || `entry ${entry.blockIndex}`;
    lines.push(`- ${entry.lane_agent}: ${title} (${entry.freshness})`);
  }
  if (report.entries.length > 3) lines.push(`- 另有 ${report.entries.length - 3} 條背景索引未在此展開。`);
  return lines;
}

function renderInboxDailyBrief({ agentId, total, groups, contextReport }) {
  const activeSources = groups.filter((group) => group.pending.length > 0).map((group) => group.from);
  const sourceText = activeSources.length > 0 ? activeSources.join(', ') : '暫時沒有';
  const lines = [
    '🔎 今日收件報告',
    total === 0
      ? `${agentId} 目前沒有新的交接要處理。`
      : `${agentId} 收到 ${total} 個新交接,來源: ${sourceText}。`,
  ];
  if (total > 0) {
    lines.push('先讀摘要與下一步,確認本機資料能對上後,才叫 AI 標記已處理。');
  }
  const contextLines = contextInboxBrief(contextReport);
  if (contextLines.length > 0) {
    lines.push('', ...contextLines);
  }
  return lines.join('\n');
}

function renderHumanInboxItem(item, sourceId, index, total) {
  if (isSharedGoalInboxItem(item)) return renderSharedGoalInboxItem(item, sourceId, index, total);
  const heading = total > 1 ? `📦 新交接 ${index}/${total}` : '📦 新交接';
  return [
    heading,
    '',
    '🔎 對方交了甚麼',
    inboxWhatSummary(item),
    '',
    '📌 對方請你做',
    ...inboxActionLines(item),
    '',
    '✅ 我該不該做',
    '可以先讀,但不要因為看到這件交接就立即開工或標記已處理。',
    '先確認內容齊全、真源指標能在本機對上、要求沒有和目前任務衝突。',
    '',
    '⚠️ 需要留意',
    inboxAttentionText(item),
    '',
    '🚀 建議下一步',
    '先讓 AI 讀完整交接內容,做完整性預檢與本機對接檢查。通過後,再標記已處理或整理回覆。',
    '',
    '📄 排錯時才需要的細節',
    `來源: ${sourceId}`,
    `主題: ${item.packetId.replace(/^\d{8}T\d{6}Z__/, '')}`,
    `版本: v${item.version}`,
    `packet id: ${item.packetId}`,
    `交接包: ${item.packetPath}`,
  ].join('\n');
}

function renderSharedGoalInboxItem(item, sourceId, index, total) {
  const heading = total > 1 ? `📦 新交接 ${index}/${total}` : '📦 新交接';
  const details = sharedGoalInboxDetails(item);
  const topic = packetTopic(item.packetId);
  const receiverLabel = item.to || '本方';
  const lines = [
    heading,
    '',
    '🔎 類型',
    '共同目標與分工確認。這不是普通任務，不應直接當成工作包處理。',
    '',
    '📌 共同目標摘要',
  ];
  if (details.insufficient) {
    lines.push('收到共同目標與分工包，但摘要生成不足，請讀完整 packet 後再決定。');
  }
  lines.push(
    `- 共同目標: ${details.summary.goal}`,
    `- 參與者 / 角色: ${details.summary.roles}`,
    `- 第一輪範圍: ${details.summary.firstRound}`,
    `- 驗收標準: ${details.summary.acceptance}`,
    `- 未決事項: ${details.openItems}`,
    '',
    `✅ 需要 ${receiverLabel} 確認`,
    `- ${compactNoticeText(details.requested, details.requested, 260)}`,
    '',
    '🚀 可選動作',
    `- 同意: 讓 AI 寫入確認，result 必須寫清楚同意 ${topic} v${item.version}。`,
    '- 部分同意，需要修改: 不要標記普通完成，請對方修訂或發 shared_goal_and_roles_clarification。',
    '- 有異議: 退回或要求釐清，並寫清楚不同意哪一項。',
    '- 稍後處理: 不寫 ack；下次 check Drive 仍會看到這個共同目標包。',
    '',
    '📄 排錯時才需要的細節',
    `來源: ${sourceId}`,
    `主題: ${topic}`,
    `版本: v${item.version}`,
    `packet id: ${item.packetId}`,
    `交接包: ${item.packetPath}`,
  );
  return lines.join('\n');
}

function parsePacketHeader(packetPath) {
  const text = fs.readFileSync(packetPath, 'utf8');
  const headerMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!headerMatch) {
    throw new Error(`packet header not found: ${packetPath}`);
  }
  const header = {};
  for (const line of headerMatch[1].split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (match) header[match[1]] = match[2].replace(/^"|"$/g, '').trim();
  }
  return header;
}

// Render declared items as a YAML block for the packet frontmatter.
// Empty list stays as `items: []` so old readers and no-items packets are unchanged.
function renderItemsYaml(items) {
  if (!items || items.length === 0) return 'items: []';
  return ['items:', ...items.map((item) => `  - id: "${yamlDoubleQuote(item)}"`)].join('\n');
}

function unescapeYamlDouble(value) {
  return String(value).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

// Read declared items ONLY from the packet's frontmatter `items:` block, never from
// the free-form body. This is the read side of the explicit items contract: a stray
// `- id:` line in the body must not be mistaken for a declared action item.
function parseFrontmatterItems(text) {
  const headerMatch = String(text || '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!headerMatch) return [];
  const items = [];
  let inItems = false;
  for (const line of headerMatch[1].split(/\r?\n/)) {
    if (/^items:\s*\[\s*\]\s*$/.test(line)) { inItems = false; continue; }
    if (/^items:\s*$/.test(line)) { inItems = true; continue; }
    if (inItems) {
      // Only a top-level entry at the renderer's exact 2-space indent counts. A more deeply
      // indented line (a hypothetical nested list) is skipped, not collected; the next column-0
      // key ends the items block.
      const match = line.match(/^ {2}-\s+id:\s*"?(.*?)"?\s*$/);
      if (match) { items.push(unescapeYamlDouble(match[1])); continue; }
      if (/^\S/.test(line)) inItems = false;
    }
  }
  return items;
}

function latestOwnPacketVersion({ hubRoot, projectSlug, agentId, packetId, allowClosed = false }) {
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md');
  ensureExistingFile(outboxPath, `from_${agentId} outbox`);
  const events = readOutboxEvents(outboxPath).filter((event) => event.packetId === packetId);
  if (events.length === 0) {
    throw new Error(`packet ${packetId} was not found in from_${agentId}/outbox.log.md`);
  }
  if (!allowClosed && events.some((event) => event.verb === 'close')) {
    throw new Error(`packet ${packetId} is already closed in from_${agentId}/outbox.log.md`);
  }
  const candidates = events.filter((event) => event.verb === 'publish' || event.verb === 'revise');
  if (candidates.length === 0) {
    throw new Error(`packet ${packetId} has no publish or revise event in from_${agentId}/outbox.log.md`);
  }
  candidates.sort((a, b) => b.version - a.version);
  return { outboxPath, events, latest: candidates[0] };
}

function pendingPackets({ hubRoot, projectSlug, agentId, otherAgentId }) {
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${otherAgentId}`, 'outbox.log.md');
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  const ack = fs.existsSync(ackPath) ? readJson(ackPath) : { consumed: [], declined: [] };
  const consumed = new Set((ack.consumed || []).map((entry) => `${entry.packet_id}::${entry.version}`));
  const declined = new Set((ack.declined || []).map((entry) => `${entry.packet_id}::${entry.version}`));
  const groups = new Map();
  for (const event of readOutboxEvents(outboxPath)) {
    if (!groups.has(event.packetId)) groups.set(event.packetId, []);
    groups.get(event.packetId).push(event);
  }
  const pending = [];
  for (const [packetId, events] of groups.entries()) {
    if (events.some((event) => event.verb === 'close')) continue;
    const candidates = events.filter((event) => event.verb === 'publish' || event.verb === 'revise');
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => b.version - a.version);
    const latest = candidates[0];
    const withdrawn = events.some((event) => event.verb === 'withdraw' && event.version === latest.version);
    if (withdrawn) continue;
    if (consumed.has(`${packetId}::${latest.version}`)) continue;
    if (declined.has(`${packetId}::${latest.version}`)) continue;
    const summary = readPacketSummary(hubRoot, projectSlug, otherAgentId, packetId, latest.version);
    const receiverId = summary.to || latest.kv.to;
    if (receiverId && receiverId !== agentId) continue;
    pending.push({
      packetId,
      version: latest.version,
      event: latest,
      ...summary,
    });
  }
  return pending;
}

function findIncomingPacket({ hubRoot, projectSlug, agentId, packetId, version }) {
  const projectPath = projectDir(hubRoot, projectSlug);
  ensureExistingDir(projectPath, 'project directory');
  const lanes = fs.readdirSync(projectPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('from_'));
  const matches = [];
  for (const lane of lanes) {
    const senderId = lane.name.slice('from_'.length);
    const packetPath = path.join(projectPath, lane.name, 'packets', `${packetId}__v${version}`, 'packet.md');
    if (!fs.existsSync(packetPath)) continue;
    const header = parsePacketHeader(packetPath);
    matches.push({ senderId, packetPath, header });
  }
  const addressed = matches.find((match) => match.header.to === agentId);
  if (addressed) return addressed;
  if (matches.length > 0) {
    const receivers = matches.map((match) => match.header.to || '(missing to)').join(', ');
    throw new Error(`${packetId} v${version} is not addressed to ${agentId}; packet receiver is ${receivers}.`);
  }
  throw new Error(`${packetId} v${version} was not found in any peer lane.`);
}

function pendingPacketsFromAllPeers({ hubRoot, projectSlug, agentId, config }) {
  const peerSet = new Set(listProjectPeers({ hubRoot, projectSlug, config }).peers
    .map((peer) => peer.agent_id)
    .filter((peerId) => peerId && peerId !== agentId));
  if (config.otherAgentId && config.otherAgentId !== agentId) peerSet.add(config.otherAgentId);
  const grouped = [];
  for (const peerId of [...peerSet].sort()) {
    grouped.push({
      from: peerId,
      pending: pendingPackets({ hubRoot, projectSlug, agentId, otherAgentId: peerId }),
    });
  }
  return grouped;
}

function contextSourcePath({ hubRoot, projectSlug, sourceRef, entry }) {
  const ref = String(sourceRef || '').trim();
  const packetAgent = /^[a-z][a-z0-9_]*$/.test(entry.source_agent || '') ? entry.source_agent : null;
  if (/^packet:[a-z][a-z0-9_]*:\d{8}T\d{6}Z__[a-z][a-z0-9_]{0,39}:v\d+$/.test(ref)) {
    const [, agentId, packetId, versionText] = ref.split(':');
    return path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', `${packetId}__${versionText}`, 'packet.md');
  }
  if (/^outbox:[a-z][a-z0-9_]*$/.test(ref)) {
    const [, agentId] = ref.split(':');
    return path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md');
  }
  if (/^ack:[a-z][a-z0-9_]*$/.test(ref)) {
    const [, agentId] = ref.split(':');
    return path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  }
  if (/^peer:[a-z][a-z0-9_]*$/.test(ref)) {
    const [, agentId] = ref.split(':');
    return peerCardPath(hubRoot, projectSlug, agentId);
  }
  if (/^file:.+/.test(ref)) {
    const rel = ref.slice('file:'.length).trim();
    return path.resolve(projectDir(hubRoot, projectSlug), rel);
  }
  if (entry.source_packet && entry.source_version && packetAgent) {
    return path.join(projectDir(hubRoot, projectSlug), `from_${packetAgent}`, 'packets', `${entry.source_packet}__v${entry.source_version}`, 'packet.md');
  }
  return null;
}

function isContextUrlRef(sourceRef) {
  const ref = String(sourceRef || '').trim();
  if (!ref.startsWith('url:')) return false;
  try {
    const url = new URL(ref.slice('url:'.length));
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_) {
    return false;
  }
}

function contextUrlFromRef(sourceRef) {
  return String(sourceRef || '').trim().slice('url:'.length);
}

function contextIssue(severity, filePath, message) {
  return { severity, filePath, message };
}

function htmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function pngAssetDataUri(relativePath) {
  const assetPath = path.join(__dirname, '..', relativePath);
  try {
    const data = fs.readFileSync(assetPath);
    return `data:image/png;base64,${data.toString('base64')}`;
  } catch (error) {
    return '';
  }
}

function normalizeSourceRefs(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return [String(value).trim()].filter(Boolean);
}

const CONTEXT_FORBIDDEN_FIELDS = [
  'assignee',
  'assigned_to',
  'due_date',
  'deadline',
  'kanban',
  'kanban_status',
  'priority',
  'auto_priority',
  'reminder_time',
  'reminder_at',
  'responsibility_score',
  'notification_status',
  'platform_notification_status',
];

function parseContextJsonBlocks(text) {
  const blocks = [];
  const regex = /```json\s*([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(String(text || '')))) {
    try {
      blocks.push(JSON.parse(match[1]));
    } catch (_) {
      // Invalid blocks are reported by parseContextLog; source-ref lookup just ignores them.
    }
  }
  return blocks;
}

function contextLogHasSourceRef(filePath, sourceRef) {
  if (!fs.existsSync(filePath)) return false;
  return parseContextJsonBlocks(fs.readFileSync(filePath, 'utf8'))
    .some((entry) => normalizeSourceRefs(entry.source_refs).includes(sourceRef));
}

function packetTopic(packetId) {
  return String(packetId || '').replace(/^\d{8}T\d{6}Z__/, '');
}

function parsePacketSourceRef(sourceRef) {
  const match = String(sourceRef || '').trim()
    .match(/^packet:([a-z][a-z0-9_]*):(\d{8}T\d{6}Z__[a-z][a-z0-9_]{0,39}):v(\d+)$/);
  if (!match) return null;
  return { agentId: match[1], packetId: match[2], version: Number(match[3]) };
}

function packetRefsForContextEntry(entry) {
  const refs = normalizeSourceRefs(entry.source_refs)
    .map(parsePacketSourceRef)
    .filter(Boolean);
  const packetAgent = /^[a-z][a-z0-9_]*$/.test(entry.source_agent || '') ? entry.source_agent : null;
  if (entry.source_packet && entry.source_version && packetAgent) {
    refs.push({
      agentId: packetAgent,
      packetId: entry.source_packet,
      version: Number(entry.source_version),
    });
  }
  return refs;
}

function latestPacketVersionInLane({ hubRoot, projectSlug, agentId, packetId }) {
  const packetsDir = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets');
  let latest = 0;
  if (fs.existsSync(packetsDir)) {
    for (const entry of fs.readdirSync(packetsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const match = entry.name.match(new RegExp(`^${packetId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}__v(\\d+)$`));
      if (match) latest = Math.max(latest, Number(match[1]));
    }
  }
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md');
  if (fs.existsSync(outboxPath)) {
    try {
      for (const event of readOutboxEvents(outboxPath)) {
        if (event.packetId === packetId) latest = Math.max(latest, Number(event.version) || 0);
      }
    } catch (_) {
      // A malformed outbox is reported elsewhere if it is a declared source.
    }
  }
  return latest;
}

function hasNewerPacketActivity({ hubRoot, projectSlug, entry, updatedAt }) {
  for (const ref of packetRefsForContextEntry(entry)) {
    if (latestPacketVersionInLane({ hubRoot, projectSlug, agentId: ref.agentId, packetId: ref.packetId }) > ref.version) {
      return true;
    }
    const ackDir = path.join(projectDir(hubRoot, projectSlug), '_ack');
    if (!Number.isFinite(updatedAt) || !fs.existsSync(ackDir)) continue;
    for (const ackFile of fs.readdirSync(ackDir, { withFileTypes: true })) {
      if (!ackFile.isFile() || !ackFile.name.endsWith('.ack.json')) continue;
      const ackPath = path.join(ackDir, ackFile.name);
      try {
        const ack = readJson(ackPath);
        const consumed = Array.isArray(ack.consumed) ? ack.consumed : [];
        const related = consumed.some((item) => item.packet_id === ref.packetId && Number(item.version) >= ref.version);
        if (related && fs.statSync(ackPath).mtime.getTime() > updatedAt) return true;
      } catch (_) {
        // Unreadable ack only affects freshness if it is explicitly listed in source_refs.
      }
    }
  }
  return false;
}

function findContextPacket({ hubRoot, projectSlug, agentId, packetId, version }) {
  const projectPath = projectDir(hubRoot, projectSlug);
  ensureExistingDir(projectPath, 'project directory');
  const lanes = fs.readdirSync(projectPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('from_'));
  const matches = [];
  for (const lane of lanes) {
    const senderId = lane.name.slice('from_'.length);
    const packetPath = path.join(projectPath, lane.name, 'packets', `${packetId}__v${version}`, 'packet.md');
    if (!fs.existsSync(packetPath)) continue;
    const header = parsePacketHeader(packetPath);
    matches.push({ senderId, packetPath, header });
  }
  if (matches.length === 0) {
    throw new Error(`${packetId} v${version} was not found in this project.`);
  }
  const related = matches.find((match) => match.header.to === agentId)
    || matches.find((match) => match.header.from === agentId || match.senderId === agentId);
  if (!related) {
    const endpoints = matches.map((match) => `${match.header.from || match.senderId}->${match.header.to || '(missing to)'}`).join(', ');
    throw new Error(`${packetId} v${version} is not connected to ${agentId}. Found: ${endpoints}.`);
  }
  return related;
}

function appendContextEntryFromPacket({ hubRoot, projectSlug, agentId, packetId, version }) {
  const source = findContextPacket({ hubRoot, projectSlug, agentId, packetId, version });
  const summary = readPacketSummary(hubRoot, projectSlug, source.senderId, packetId, version);
  const sourceRef = `packet:${source.senderId}:${packetId}:v${version}`;
  const filePath = contextLogPath(hubRoot, projectSlug, agentId);
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (contextLogHasSourceRef(filePath, sourceRef)) {
    return { filePath, sourceRef, entry: null, skipped: true };
  }
  const sourceMtime = fs.statSync(source.packetPath).mtime.getTime();
  const updatedAt = isoNow(new Date(Math.max(Date.now(), sourceMtime + 1000)));
  const entry = {
    updated_at: updatedAt,
    source_agent: agentId,
    source_refs: [sourceRef],
    status: 'background_only',
    workstream: packetTopic(packetId),
    current_focus: inboxWhatSummary({
      packetId,
      scope: summary.scope,
      body: summary.body,
      items: summary.items,
    }),
  };
  const heading = `## ${entry.updated_at} ${entry.workstream}`;
  const block = `${heading}\n\n\`\`\`json\n${JSON.stringify(entry, null, 2)}\n\`\`\`\n\n`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!existing) {
    fs.writeFileSync(filePath, `# Context log\n\n${block}`, 'utf8');
  } else {
    fs.writeFileSync(filePath, `${existing.replace(/\s*$/, '\n\n')}${block}`, 'utf8');
  }
  return { filePath, sourceRef, entry, skipped: false };
}

function contextEntryFreshness({ entry, sourcePaths, issues, hubRoot, projectSlug }) {
  if (issues.some((issue) => issue.severity === 'error' && /source|來源|not found|不存在/i.test(issue.message))) {
    return 'unverified_source';
  }
  if (entry.freshness === 'conflict_packet_wins' || entry.conflict_with_packet === true) {
    return 'conflict_packet_wins';
  }
  const updatedAt = Date.parse(entry.updated_at || '');
  if (hasNewerPacketActivity({ hubRoot, projectSlug, entry, updatedAt })) {
    return 'possibly_stale';
  }
  if (Number.isFinite(updatedAt)) {
    for (const sourcePath of sourcePaths) {
      if (!sourcePath || !fs.existsSync(sourcePath)) continue;
      const mtime = fs.statSync(sourcePath).mtime.getTime();
      if (mtime > updatedAt) return 'possibly_stale';
    }
  }
  return 'current_by_sources';
}

function parseContextLog({ filePath, laneAgentId, hubRoot, projectSlug }) {
  const text = fs.readFileSync(filePath, 'utf8');
  const entries = [];
  const issues = [];
  const regex = /```json\s*([\s\S]*?)```/g;
  let match;
  let blockIndex = 0;
  while ((match = regex.exec(text))) {
    blockIndex += 1;
    let entry;
    try {
      entry = JSON.parse(match[1]);
    } catch (err) {
      issues.push(contextIssue('error', filePath, `第 ${blockIndex} 個 JSON metadata 無法解析: ${err.message}`));
      continue;
    }
    const entryIssues = [];
    for (const key of ['updated_at', 'source_agent', 'status']) {
      if (!entry[key]) entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條缺少必要欄位: ${key}`));
    }
    if (entry.status && entry.status !== 'background_only') {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 status 必須是 background_only，目前是 ${entry.status}`));
    }
    if (entry.updated_at && Number.isNaN(Date.parse(entry.updated_at))) {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 updated_at 不是可解析時間: ${entry.updated_at}`));
    }
    if (entry.source_agent && validateSnakeCase('source_agent', entry.source_agent)) {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 source_agent 格式不正確: ${entry.source_agent}`));
    }
    if (entry.source_agent && entry.source_agent !== laneAgentId) {
      entryIssues.push(contextIssue('warn', filePath, `第 ${blockIndex} 條 source_agent (${entry.source_agent}) 與 lane (${laneAgentId}) 不一致`));
    }
    if (entry.source_packet && validatePacketId(entry.source_packet)) {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 source_packet 格式不正確: ${entry.source_packet}`));
    }
    if (entry.source_version && !/^[1-9]\d*$/.test(String(entry.source_version))) {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 source_version 必須是正整數: ${entry.source_version}`));
    }
    for (const field of CONTEXT_FORBIDDEN_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(entry, field)) {
        entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條含禁止欄位: ${field}`));
      }
    }
    const sourceRefs = normalizeSourceRefs(entry.source_refs);
    if ((!entry.source_packet || !entry.source_version) && sourceRefs.length === 0) {
      entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條缺少可追溯來源: source_packet/source_version 或 source_refs`));
    }
    const sourcePaths = [];
    const sourceUrls = [];
    const refsToCheck = sourceRefs.length > 0 ? sourceRefs : [''];
    const projectPath = projectDir(hubRoot, projectSlug);
    for (const ref of refsToCheck) {
      if (isContextUrlRef(ref)) {
        sourceUrls.push(contextUrlFromRef(ref));
        continue;
      }
      const sourcePath = contextSourcePath({ hubRoot, projectSlug, sourceRef: ref, entry });
      if (!sourcePath) {
        entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 source_refs 格式未能識別: ${ref || '(empty)'}`));
        continue;
      }
      if (String(ref || '').trim().startsWith('file:') && !pathWithinDir(sourcePath, projectPath)) {
        entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條 file 來源必須留在 project 內: ${ref}`));
        continue;
      }
      sourcePaths.push(sourcePath);
      if (!fs.existsSync(sourcePath)) {
        entryIssues.push(contextIssue('error', filePath, `第 ${blockIndex} 條來源不存在: ${ref || `${entry.source_packet} v${entry.source_version}`} -> ${sourcePath}`));
      }
    }
    const freshness = contextEntryFreshness({ entry, sourcePaths, issues: entryIssues, hubRoot, projectSlug });
    if (freshness === 'possibly_stale') {
      entryIssues.push(contextIssue('warn', filePath, `第 ${blockIndex} 條可能過期:發現較新的相關 packet / outbox / ack，或來源比 context 更新時間新`));
    }
    if (freshness === 'conflict_packet_wins') {
      entryIssues.push(contextIssue('warn', filePath, `第 ${blockIndex} 條標示與 packet 衝突:必須以 packet / outbox / ack 為準`));
    }
    entries.push({
      ...entry,
      lane_agent: laneAgentId,
      filePath,
      blockIndex,
      sourceRefs,
      sourcePaths,
      sourceUrls,
      freshness,
      issues: entryIssues,
    });
    issues.push(...entryIssues);
  }
  if (blockIndex === 0 && text.trim()) {
    issues.push(contextIssue('error', filePath, 'context.log.md 沒有任何 ```json metadata``` 區塊'));
  }
  return { entries, issues };
}

function readProjectContext({ hubRoot, projectSlug }) {
  const root = contextDir(hubRoot, projectSlug);
  if (!fs.existsSync(root)) {
    return { root, exists: false, entries: [], issues: [] };
  }
  const entries = [];
  const issues = [];
  for (const dirent of fs.readdirSync(root, { withFileTypes: true })) {
    if (!dirent.isDirectory() || !dirent.name.startsWith('from_')) continue;
    const laneAgentId = dirent.name.slice('from_'.length);
    const filePath = contextLogPath(hubRoot, projectSlug, laneAgentId);
    if (!fs.existsSync(filePath)) {
      issues.push(contextIssue('warn', filePath, `缺少 ${dirent.name}/context.log.md`));
      continue;
    }
    const parsed = parseContextLog({ filePath, laneAgentId, hubRoot, projectSlug });
    entries.push(...parsed.entries);
    issues.push(...parsed.issues);
  }
  return { root, exists: true, entries, issues };
}

function printContextReport(report, mode) {
  console.log('🔎 APS Project Context Index');
  console.log('📌 性質:背景索引,不是執行真相。packet / outbox / ack 仍然作準。');
  console.log(`📄 位置: ${report.root}`);
  if (!report.exists) {
    console.log('📭 目前未建立 `_context/`。這不是錯誤;舊項目可繼續使用 APS。');
    return;
  }
  console.log(`📚 索引條目: ${report.entries.length}`);
  const errors = report.issues.filter((issue) => issue.severity === 'error');
  const warnings = report.issues.filter((issue) => issue.severity !== 'error');
  console.log(`✅ 檢查結果: ${errors.length === 0 ? '未見阻塞錯誤' : `${errors.length} 個錯誤`}${warnings.length ? `, ${warnings.length} 個提醒` : ''}`);
  if (report.entries.length > 0) {
    console.log('');
    console.log('📌 背景摘要');
    for (const entry of report.entries) {
      const title = entry.workstream || entry.current_focus || entry.source_packet || `entry ${entry.blockIndex}`;
      console.log(`- ${entry.lane_agent}: ${title}`);
      console.log(`  更新: ${entry.updated_at || '(未記錄)'} / 新鮮度: ${entry.freshness}`);
      if (entry.waiting_on) console.log(`  等待: ${entry.waiting_on}`);
      if (entry.current_focus && entry.current_focus !== title) console.log(`  焦點: ${entry.current_focus}`);
      if (entry.source_packet) console.log(`  來源 packet: ${entry.source_packet} v${entry.source_version || '?'}`);
    }
  }
  if (report.issues.length > 0) {
    console.log('');
    console.log(mode === 'check' ? '⚠️ 檢查項' : '⚠️ 需要留意');
    for (const issue of report.issues) {
      const icon = issue.severity === 'error' ? '❌' : '⚠️';
      console.log(`${icon} ${issue.message}`);
      console.log(`   ${issue.filePath}`);
    }
  }
  console.log('');
  console.log('🚀 下一步:若要開工,先讀最新 packet / outbox / ack;context 只用來理解背景。');
}

function contextFreshnessLabel(freshness) {
  if (freshness === 'current_by_sources') return '來源可核對';
  if (freshness === 'possibly_stale') return '可能過期';
  if (freshness === 'unverified_source') return '來源未核實';
  if (freshness === 'conflict_packet_wins') return '與 packet 衝突';
  return freshness || '未知';
}

function contextFreshnessBadgeClass(freshness) {
  if (freshness === 'current_by_sources') return 'ok';
  if (freshness === 'unverified_source' || freshness === 'conflict_packet_wins') return 'bad';
  return 'warn';
}

function allProjectPeerIds({ hubRoot, projectSlug, agentId, config }) {
  const ids = new Set();
  for (const peer of listProjectPeers({ hubRoot, projectSlug, config }).peers) {
    if (peer.agent_id && peer.agent_id !== agentId) ids.add(peer.agent_id);
  }
  if (config.otherAgentId && config.otherAgentId !== agentId) ids.add(config.otherAgentId);
  const projectPath = projectDir(hubRoot, projectSlug);
  if (fs.existsSync(projectPath)) {
    for (const entry of fs.readdirSync(projectPath, { withFileTypes: true })) {
      if (entry.isDirectory() && entry.name.startsWith('from_')) {
        const id = entry.name.slice('from_'.length);
        if (id && id !== agentId) ids.add(id);
      }
    }
  }
  return [...ids].sort();
}

function dashboardIncomingGroups({ hubRoot, projectSlug, agentId, config }) {
  const groups = [];
  for (const peerId of allProjectPeerIds({ hubRoot, projectSlug, agentId, config })) {
    try {
      groups.push({
        from: peerId,
        pending: pendingPackets({ hubRoot, projectSlug, agentId, otherAgentId: peerId }),
      });
    } catch (err) {
      groups.push({ from: peerId, pending: [], error: err.message });
    }
  }
  return groups;
}

function ownOutgoingPackets({ hubRoot, projectSlug, agentId }) {
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md');
  if (!fs.existsSync(outboxPath)) return [];
  const groups = new Map();
  for (const event of readOutboxEvents(outboxPath)) {
    if (!groups.has(event.packetId)) groups.set(event.packetId, []);
    groups.get(event.packetId).push(event);
  }
  const items = [];
  for (const [packetId, events] of groups.entries()) {
    const candidates = events.filter((event) => event.verb === 'publish' || event.verb === 'revise');
    if (candidates.length === 0) continue;
    candidates.sort((a, b) => b.version - a.version);
    const latest = candidates[0];
    const summary = readPacketSummary(hubRoot, projectSlug, agentId, packetId, latest.version);
    const toId = summary.to || latest.kv.to;
    const ackPath = toId ? path.join(projectDir(hubRoot, projectSlug), '_ack', `${toId}.ack.json`) : null;
    const ack = ackPath && fs.existsSync(ackPath) ? readJson(ackPath) : { consumed: [], declined: [] };
    const consumed = (ack.consumed || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(latest.version));
    const declined = (ack.declined || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(latest.version));
    const closed = events.find((event) => event.verb === 'close');
    const withdrawn = events.find((event) => event.verb === 'withdraw' && Number(event.version) === Number(latest.version));
    let state = 'waiting';
    let label = '尚未看到對方標記處理';
    if (withdrawn) {
      state = 'withdrawn';
      label = '已撤回';
    } else if (closed) {
      state = 'closed';
      label = '已收結';
    } else if (declined) {
      state = 'declined';
      label = '對方已退回 / 不能處理';
    } else if (consumed) {
      state = 'consumed';
      label = '對方已標記處理（ack 已記錄）';
    }
    items.push({
      packetId,
      version: latest.version,
      toId,
      summary,
      state,
      label,
      consumed,
      declined,
      closed,
      withdrawn,
    });
  }
  items.sort((a, b) => String(b.packetId).localeCompare(String(a.packetId)));
  return items;
}

function ackStateForPacket({ hubRoot, projectSlug, agentId, packetId, version }) {
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  if (!fs.existsSync(ackPath)) return { state: 'missing_ack', label: '未見 ack', ackPath };
  try {
    const ack = readJson(ackPath);
    const consumed = (ack.consumed || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
    const declined = (ack.declined || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
    if (declined) return { state: 'declined', label: '已退回 / 有異議', ackPath, entry: declined };
    if (consumed) return { state: 'confirmed', label: '已確認', ackPath, entry: consumed };
    return { state: 'pending', label: '未確認', ackPath };
  } catch (err) {
    return { state: 'ack_error', label: `ack 讀取失敗: ${err.message}`, ackPath };
  }
}

function sharedGoalTopicFrom({ packetId, summary }) {
  const topic = packetTopic(packetId);
  const scope = String(summary && summary.scope ? summary.scope : '').trim();
  if (topic === 'shared_goal_and_roles' || scope === 'shared_goal_and_roles') return 'shared_goal_and_roles';
  if (topic === 'shared_goal_and_roles_clarification' || scope === 'shared_goal_and_roles_clarification') return 'shared_goal_and_roles_clarification';
  return topic;
}

function scanSharedGoalPackets({ hubRoot, projectSlug }) {
  const projectPath = projectDir(hubRoot, projectSlug);
  if (!fs.existsSync(projectPath)) return [];
  const packets = [];
  for (const lane of fs.readdirSync(projectPath, { withFileTypes: true })) {
    if (!lane.isDirectory() || !lane.name.startsWith('from_')) continue;
    const senderId = lane.name.slice('from_'.length);
    const packetsDir = path.join(projectPath, lane.name, 'packets');
    if (!fs.existsSync(packetsDir)) continue;
    for (const folder of fs.readdirSync(packetsDir, { withFileTypes: true })) {
      if (!folder.isDirectory()) continue;
      const match = folder.name.match(/^(.+)__v(\d+)$/);
      if (!match) continue;
      const packetId = match[1];
      const version = Number(match[2]);
      const summary = readPacketSummary(hubRoot, projectSlug, senderId, packetId, version);
      const topic = sharedGoalTopicFrom({ packetId, summary });
      if (topic !== 'shared_goal_and_roles' && topic !== 'shared_goal_and_roles_clarification') continue;
      let createdAt = '';
      try {
        const header = parsePacketHeader(summary.packetPath);
        createdAt = header.created_at || '';
      } catch (_) { /* keep empty createdAt */ }
      packets.push({ senderId, packetId, version, summary, topic, createdAt });
    }
  }
  packets.sort((a, b) => {
    const byTime = String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
    if (byTime) return byTime;
    const byId = String(b.packetId).localeCompare(String(a.packetId));
    if (byId) return byId;
    return b.version - a.version;
  });
  return packets;
}

function sharedGoalSummaryFromBody(body) {
  return {
    goal: firstLineAfterHeading(body, /(共同目標|common goal|目標)/i) || '未在基準包內摘出共同目標',
    roles: firstLineAfterHeading(body, /(每人角色|角色|參與者|participants|^#+\s+roles\b)/i) || '未在基準包內摘出角色分工',
    firstRound: firstLineAfterHeading(body, /(第一輪分工|first.*split|first round)/i) || '未在基準包內摘出第一輪分工',
    acceptance: firstLineAfterHeading(body, /(驗收標準|acceptance)/i) || '未在基準包內摘出驗收標準',
  };
}

function sharedGoalStatus({ hubRoot, projectSlug, agentId, peers }) {
  const confirmedPeerIds = peers
    .filter((peer) => peer.agent_id && peer.agent_id !== agentId && peer.peer_state === 'confirmed' && peer.status !== 'inactive')
    .map((peer) => peer.agent_id)
    .sort();
  const packets = scanSharedGoalPackets({ hubRoot, projectSlug });
  const baselines = packets.filter((packet) => packet.topic === 'shared_goal_and_roles');
  const clarifications = packets.filter((packet) => packet.topic === 'shared_goal_and_roles_clarification');
  if (baselines.length === 0) {
    return {
      state: 'missing',
      label: '未見目前有效基準',
      summary: {
        goal: '未建立',
        roles: '未建立',
        firstRound: '未建立',
        acceptance: '未建立',
      },
      confirmations: confirmedPeerIds.map((peerId) => ({ peerId, label: '未發給此 peer 確認', state: 'not_sent' })),
      latest: null,
      clarifications,
    };
  }
  const latest = baselines[0];
  const target = latest.summary.to || '';
  const confirmations = confirmedPeerIds.map((peerId) => {
    if (peerId === latest.senderId) return { peerId, label: '發出者已確認', state: 'confirmed' };
    if (target !== peerId) return { peerId, label: '未見此 peer 對最新版確認', state: 'not_targeted' };
    return { peerId, ...ackStateForPacket({ hubRoot, projectSlug, agentId: peerId, packetId: latest.packetId, version: latest.version }) };
  });
  if (target === agentId) {
    confirmations.unshift({
      peerId: agentId,
      ...ackStateForPacket({ hubRoot, projectSlug, agentId, packetId: latest.packetId, version: latest.version }),
    });
  }
  const hasDecline = confirmations.some((item) => item.state === 'declined');
  const hasPending = confirmations.some((item) => item.state === 'pending' || item.state === 'missing_ack' || item.state === 'ack_error' || item.state === 'not_targeted' || item.state === 'not_sent');
  let state = 'confirmed';
  let label = '最新版已確認';
  if (hasDecline) {
    state = 'declined';
    label = '有 peer 退回或提出異議';
  } else if (target === agentId && confirmations[0] && confirmations[0].state === 'pending') {
    state = 'incoming_pending';
    label = '你收到共同目標與分工，尚未確認';
  } else if (hasPending) {
    state = 'partial';
    label = '已有基準，但未完成所有相關 peer 確認';
  }
  return {
    state,
    label,
    summary: sharedGoalSummaryFromBody(latest.summary.body),
    confirmations,
    latest,
    clarifications,
  };
}

function sharedGoalProgressText(sharedGoal) {
  if (!sharedGoal || !sharedGoal.latest) return '未見基準';
  const confirmations = sharedGoal.confirmations || [];
  if (confirmations.length === 0) return sharedGoal.label;
  const confirmed = confirmations.filter((item) => item.state === 'confirmed').length;
  const declined = confirmations.filter((item) => item.state === 'declined').length;
  const pending = confirmations.length - confirmed - declined;
  const parts = [`${confirmed}/${confirmations.length} 已確認`];
  if (pending > 0) parts.push(`${pending} 未確認`);
  if (declined > 0) parts.push(`${declined} 有異議`);
  return `${sharedGoal.latest.packetId} v${sharedGoal.latest.version}: ${parts.join('，')}`;
}

function sharedGoalCanStartText(sharedGoal) {
  if (!sharedGoal || sharedGoal.state === 'missing') return '不可發普通任務包：先建立共同目標與分工';
  if (sharedGoal.state === 'confirmed') return '可按已確認分工處理普通交接';
  if (sharedGoal.state === 'incoming_pending') return '不可先做普通任務：你尚未確認共同目標與分工';
  if (sharedGoal.state === 'declined') return '不可先做普通任務：有人退回或提出異議';
  return '暫不建議發普通任務包：仍有受影響 peer 未確認基準';
}

function sharedGoalPeerNextStep(item) {
  if (item.state === 'confirmed') return '已可按此基準處理相關交接';
  if (item.state === 'declined') return '先讀異議，發釐清包或修訂共同目標與分工';
  if (item.state === 'not_sent' || item.state === 'not_targeted') return '用 shared_goal_and_roles 一對一補發確認包';
  if (item.state === 'missing_ack' || item.state === 'ack_error') return '先核對對方 ack 檔與 Drive 同步';
  return '提醒對方 check Drive 並明確確認、部分同意或提出異議';
}

function actionBadgeClass(item) {
  if (item.state === 'return' || item.state === 'declined') return 'bad';
  if (item.state === 'clarify_goal' || item.state === 'wait_revision' || item.lane === '先核對風險' || item.lane === '等對方') return 'warn';
  return 'ok';
}

function dashboardDecisionIcon(line) {
  if (/資料不足|退回|不可|風險|未見|卡住/.test(line || '')) return '⚠️';
  if (/沒有明確|核對|等待|釐清/.test(line || '')) return '🔎';
  return '✅';
}

function actionLaneIcon(item) {
  const lane = item && item.lane ? item.lane : '';
  if (/退回|不足/.test(lane)) return '⚠️';
  if (/核對|釐清|建立/.test(lane)) return '🔎';
  if (/等待|等對方/.test(lane)) return '⏳';
  if (/可開工/.test(lane)) return '✅';
  return '📌';
}

function packetSourceRef(agentId, packetId, version) {
  return `packet:${agentId}:${packetId}:v${version}`;
}

function sourceRefDisplay(ref) {
  const value = String(ref || '').trim();
  if (isContextUrlRef(value)) {
    const url = contextUrlFromRef(value);
    let label = url;
    try {
      const parsed = new URL(url);
      label = parsed.hostname.includes('docs.google.com') ? 'Google Docs' : parsed.hostname;
    } catch (_) { /* keep raw URL */ }
    return `<a href="${htmlEscape(url)}" target="_blank" rel="noopener noreferrer">${htmlEscape(label)}</a>`;
  }
  return `<code>${htmlEscape(value)}</code>`;
}

function localFileHref(filePath) {
  const resolved = path.resolve(String(filePath || '')).replace(/\\/g, '/');
  return `file:///${resolved.split('/').map((part, index) => {
    if (index === 0 && /^[A-Za-z]:$/.test(part)) return part;
    return encodeURIComponent(part);
  }).join('/')}`;
}

function collectSuggestedReads({ incomingGroups, outgoingPackets, contextReport, sharedGoal }) {
  const reads = [];
  if (sharedGoal && sharedGoal.latest) {
    reads.push({
      title: `共同目標與分工 v${sharedGoal.latest.version}`,
      type: '項目基準',
      why: '這是目前可讀到的項目共同口徑；發第一輪任務前應先核對。',
      ref: packetSourceRef(sharedGoal.latest.senderId, sharedGoal.latest.packetId, sharedGoal.latest.version),
    });
  }
  for (const group of incomingGroups) {
    for (const item of group.pending) {
      reads.push({
        title: `${packetTopic(item.packetId)} v${item.version}`,
        type: '新交接',
        why: '這是目前待你處理的交接，應先讀正文再決定是否標記處理。',
        ref: packetSourceRef(group.from, item.packetId, item.version),
      });
    }
  }
  for (const entry of contextReport.entries || []) {
    const refs = normalizeSourceRefs(entry.sourceRefs.length > 0 ? entry.sourceRefs : entry.source_refs);
    for (const ref of refs) {
      reads.push({
        title: entry.workstream || entry.current_focus || ref,
        type: isContextUrlRef(ref) ? '延伸文檔' : '背景來源',
        why: entry.freshness === 'current_by_sources'
          ? '背景索引引用的來源，可用來補足上下文。'
          : `此來源狀態是「${contextFreshnessLabel(entry.freshness)}」，閱讀前先核對最新 packet。`,
        ref,
      });
    }
  }
  for (const item of outgoingPackets.slice(0, 3)) {
    reads.push({
      title: `${packetTopic(item.packetId)} v${item.version}`,
      type: '已發出',
      why: '這是你發出去的交接，可用來核對對方是否已標記處理。',
      ref: packetSourceRef(item.summary.from || '', item.packetId, item.version),
    });
  }
  const seen = new Set();
  return reads.filter((item) => {
    const key = `${item.type}::${item.ref}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 12);
}

function buildDashboardData({ hubRoot, projectSlug, agentId, config }) {
  const contextReport = readProjectContext({ hubRoot, projectSlug });
  const outgoingPackets = ownOutgoingPackets({ hubRoot, projectSlug, agentId });
  const peers = listProjectPeers({ hubRoot, projectSlug, config }).peers;
  const identityIssues = scanIdentityIssues({ hubRoot, projectSlug });
  const sharedGoal = sharedGoalStatus({ hubRoot, projectSlug, agentId, peers });
  const incomingGroups = dashboardIncomingGroups({ hubRoot, projectSlug, agentId, config }).map((group) => ({
    ...group,
    pending: (group.pending || []).map((item) => ({
      ...item,
      actionability: assessPendingActionability(item, { sharedGoal }),
    })),
  }));
  const suggestedReads = collectSuggestedReads({ incomingGroups, outgoingPackets, contextReport, sharedGoal });
  return { hubRoot, projectSlug, agentId, contextReport, incomingGroups, outgoingPackets, peers, identityIssues, suggestedReads, sharedGoal };
}

function buildCheckApsDemoDashboard(scenario = 'handoff-blocked') {
  if (scenario === 'shared-goal') return buildSharedGoalDemoDashboard();
  const sharedGoal = {
    state: 'confirmed',
    label: '最新版已確認',
    summary: {
      goal: '完成一個新手能跟隨的 APS 任務交接流程。',
      roles: 'adam 負責產品判斷與發起交接；jay 負責接手指定任務並回報缺口。',
      firstRound: 'adam 先整理要交接的任務；jay 先檢查資料是否足夠開工。',
      acceptance: 'Jay 能清楚知道下一步，資料不足時會退回補資料，而不是硬做。',
    },
    confirmations: [
      { peerId: 'jay', label: '已確認', state: 'confirmed' },
    ],
    latest: {
      senderId: 'adam',
      packetId: '20260614T120000Z__shared_goal_and_roles',
      version: 1,
      summary: { to: 'jay' },
    },
    clarifications: [],
  };
  return {
    hubRoot: '(demo preview：不是真實共用 Drive 路徑)',
    projectSlug: 'demo_project',
    agentId: 'adam',
    contextReport: {
      entries: [],
      issues: [],
    },
    incomingGroups: [
      {
        from: 'jay',
        pending: [
          {
            from: 'jay',
            packetId: '20260614T123000Z__homepage_copy_review',
            version: 1,
            scope: 'homepage_copy_review',
            items: ['核對首頁新手流程文字是否可直接照做'],
            body: 'Jay 發來首頁文案檢查，但沒有附上實際修改位置和驗收方式。',
            actionability: {
              state: 'return',
              label: '需退回補資料',
              reason: '交接內容缺少實際修改位置和驗收方式，直接開工容易改錯範圍。',
              next: '先請 Jay 補回檔案位置、要檢查的段落和怎樣算通過。',
            },
          },
        ],
      },
    ],
    outgoingPackets: [
      {
        packetId: '20260614T121500Z__invite_jay_to_review',
        version: 1,
        toId: 'jay',
        state: 'waiting',
        label: '等待對方處理',
        summary: { from: 'adam', to: 'jay' },
      },
    ],
    peers: [
      {
        agent_id: 'adam',
        display_name: 'Adam',
        peer_state: 'confirmed',
        status: 'active',
        is_self: true,
      },
      {
        agent_id: 'jay',
        display_name: 'Jay',
        peer_state: 'confirmed',
        status: 'active',
      },
    ],
    identityIssues: [],
    suggestedReads: [],
    sharedGoal,
  };
}

function buildSharedGoalDemoDashboard() {
  const sharedGoal = {
    state: 'partial',
    label: '等待協作者確認',
    summary: {
      goal: '完成一個新手能跟隨的 APS 任務交接流程。',
      roles: 'adam 負責產品判斷與發起交接；jay 負責用新手角度確認可讀性與補充缺口；fanny 暫未加入第一輪確認。',
      firstRound: 'adam 先提出共同目標與分工草稿；jay 先確認、補充或提出修正；確認後才開始第一個正式任務交接。',
      acceptance: 'Jay 明確回覆同意、部分同意或有異議；Adam 批准後，正式版本才寫回 APS Drive 紀錄。',
    },
    confirmations: [
      { peerId: 'jay', label: '等待確認', state: 'pending' },
      { peerId: 'fanny', label: '未發給此 peer 確認', state: 'not_sent' },
    ],
    latest: {
      senderId: 'adam',
      packetId: '20260614T120000Z__shared_goal_and_roles',
      version: 1,
      summary: { to: 'jay' },
    },
    clarifications: [],
  };
  return {
    hubRoot: '(demo preview：不是真實共用 Drive 路徑)',
    projectSlug: 'demo_project',
    agentId: 'adam',
    contextReport: {
      entries: [],
      issues: [],
    },
    incomingGroups: [],
    outgoingPackets: [
      {
        packetId: '20260614T120000Z__shared_goal_and_roles',
        version: 1,
        toId: 'jay',
        state: 'waiting',
        label: '等待 Jay 確認共同目標與分工',
        summary: { from: 'adam', to: 'jay' },
      },
    ],
    peers: [
      {
        agent_id: 'adam',
        display_name: 'Adam',
        peer_state: 'confirmed',
        status: 'active',
        is_self: true,
      },
      {
        agent_id: 'jay',
        display_name: 'Jay',
        peer_state: 'confirmed',
        status: 'active',
      },
      {
        agent_id: 'fanny',
        display_name: 'Fanny',
        peer_state: 'confirmed',
        status: 'active',
      },
    ],
    identityIssues: [],
    suggestedReads: [],
    sharedGoal,
  };
}

function hideLocalPaths(value) {
  return String(value || '').replace(/[A-Za-z]:[\\/][^\s<>"']+/g, '(本機路徑已隱藏)');
}

function dashboardRiskRecords({ incomingGroups, contextReport, peers, identityIssues = [], sharedGoal = null }) {
  return [
    ...(sharedGoal && sharedGoal.state === 'declined' ? [{
      message: '共同目標與分工有 peer 退回或提出異議；未釐清前不應發第一輪任務包。',
      owner: '共同目標與分工',
      source: sharedGoal.latest ? packetSourceRef(sharedGoal.latest.senderId, sharedGoal.latest.packetId, sharedGoal.latest.version) : 'shared_goal_and_roles',
      next: '先用 shared_goal_and_roles_clarification 或修訂版處理不一致。',
    }] : []),
    ...identityIssues.map((issue) => ({
      message: issue.message,
      owner: issue.owner || '身份結構',
      source: issue.source || 'identity',
      next: issue.next || '先重跑 doctor 並人工核對共用 Drive 同步狀態。',
    })),
    ...incomingGroups.filter((group) => group.error).map((group) => ({
      message: `未能讀取 ${group.from} 的 outbox: ${group.error}`,
      owner: group.from,
      source: `outbox:${group.from}`,
      next: '先檢查對方 lane、Google Drive 同步與 outbox 檔案是否可讀。',
    })),
    ...contextReport.issues.map((issue) => ({
      message: hideLocalPaths(issue.message),
      owner: issue.file ? String(issue.file).replace(/\\/g, '/').split('/').slice(-2).join('/') : '背景索引',
      source: issue.file ? String(issue.file).replace(/\\/g, '/').split('/').slice(-3).join('/') : 'context',
      next: '先核對最新 packet / outbox / ack，再決定是否採用背景索引內容。',
    })),
    ...peers.filter((peer) => peer.peer_state && peer.peer_state !== 'confirmed').map((peer) => ({
      message: `${peer.agent_id} 尚未確認；正式交接前先確認對方已完成設置。`,
      owner: peer.agent_id,
      source: `peer:${peer.agent_id}`,
      next: '先請對方完成 APS 接入或用 starter pack 確認身份，不要把未確認 peer 當成已可穩定交接。',
    })),
  ];
}

function dashboardRiskItems({ incomingGroups, contextReport, peers, identityIssues = [] }) {
  return dashboardRiskRecords({ incomingGroups, contextReport, peers, identityIssues }).map((record) => record.message);
}

function dashboardActionItems({ pendingItems, outgoingPackets, riskRecords, agentId, sharedGoal, peers }) {
  const actions = [];
  const confirmedPeers = peers.filter((peer) => peer.agent_id && peer.agent_id !== agentId && peer.peer_state === 'confirmed' && peer.status !== 'inactive');
  if (sharedGoal && sharedGoal.state === 'missing') {
    actions.push({
      lane: '先建立基準',
      item: '共同目標與分工: 未見目前有效基準',
      next: confirmedPeers.length > 0
        ? '先建立共同目標與分工，然後用 shared_goal_and_roles 一對一發給 confirmed peer 確認；不要先發普通任務包。'
        : '先建立共同目標與分工。若要邀請協作者，先定清楚共同目標、角色、第一輪分工與驗收標準。',
      defaultNext: confirmedPeers.length > 0
        ? '先建立共同目標與分工，然後用 APS 一對一發給已加入的協作者確認；不要先發普通任務包。'
        : '先建立共同目標與分工。若要邀請協作者，先定清楚共同目標、角色、第一輪分工與驗收標準。',
      source: 'shared_goal_and_roles',
    });
  } else if (sharedGoal && (sharedGoal.state === 'partial' || sharedGoal.state === 'incoming_pending')) {
    actions.push({
      lane: sharedGoal.state === 'incoming_pending' ? '你要確認' : '等確認',
      item: `共同目標與分工: ${sharedGoal.label}`,
      next: sharedGoal.state === 'incoming_pending'
        ? '先讀 shared_goal_and_roles 正文，確認同意、部分同意或有異議，再寫具體 ack。'
        : '先完成受影響 peer 的一對一確認，再發第一輪正式任務包。',
      defaultNext: sharedGoal.state === 'incoming_pending'
        ? '先讀共同目標與分工正文，確認同意、部分同意或有異議，再記錄具體回覆。'
        : '先完成受影響協作者的一對一確認，再發第一輪正式任務包。',
      source: sharedGoal.latest ? packetSourceRef(sharedGoal.latest.senderId, sharedGoal.latest.packetId, sharedGoal.latest.version) : 'shared_goal_and_roles',
    });
  }
  for (const item of pendingItems.slice(0, 5)) {
    const actionability = item.actionability || assessPendingActionability(item, { sharedGoal });
    const topic = packetTopic(item.packetId);
    actions.push({
      lane: actionability.label,
      item: `${item.from} → ${agentId}: ${topic} v${item.version}`,
      defaultItem: `${item.from} 交來: ${humanizeTopicForUser(topic)}`,
      next: `${actionability.next} 可對 AI 說：「${actionabilityPromptFor(item, item.from)}」`,
      defaultNext: actionability.next,
      source: packetSourceRef(item.from, item.packetId, item.version),
      state: actionability.state,
      reason: actionability.reason,
    });
  }
  for (const item of outgoingPackets.filter((packet) => packet.state === 'waiting').slice(0, 5)) {
    const topic = packetTopic(item.packetId);
    actions.push({
      lane: '等對方',
      item: `給 ${item.toId || '(未記錄)'}: ${topic} v${item.version}`,
      defaultItem: `交給 ${item.toId || '對方'}: ${humanizeTopicForUser(topic)}`,
      next: '等待對方 check Drive、標記處理或另發回覆；不要把已寫入 Drive 當成對方已收到通知。',
      source: packetSourceRef(agentId, item.packetId, item.version),
    });
  }
  for (const item of outgoingPackets.filter((packet) => packet.state === 'declined').slice(0, 5)) {
    const topic = packetTopic(item.packetId);
    actions.push({
      lane: '對方退回',
      item: `給 ${item.toId || '(未記錄)'}: ${topic} v${item.version}`,
      defaultItem: `${item.toId || '對方'} 退回: ${humanizeTopicForUser(topic)}`,
      next: `讀對方退回原因: ${item.declined.reason || '(未記錄)'}；然後用 revise 修訂、withdraw 撤回，或 close 收結。`,
      defaultNext: `先讀對方退回原因: ${item.declined.reason || '(未記錄)'}；再判斷要修訂、撤回，還是收結這條交接。`,
      source: packetSourceRef(agentId, item.packetId, item.version),
    });
  }
  for (const record of riskRecords.slice(0, 5)) {
    actions.push({
      lane: '先核對風險',
      item: `${record.owner}: ${record.message}`,
      defaultItem: `${record.owner}: ${defaultRiskMessage(record.message)}`,
      next: record.next,
      defaultNext: defaultRiskNextText(record.next),
      source: record.source,
    });
  }
  return actions.slice(0, 12);
}

function defaultRiskMessage(message) {
  return String(message || '')
    .replace(/packet:[^\s]+/g, '某條交接來源')
    .replace(/\s*->\s*\(本機路徑已隱藏\)/g, '')
    .replace(/packet \/ outbox \/ ack/g, '交接紀錄');
}

function defaultRiskNextText(text) {
  return String(text || '')
    .replace(/packet \/ outbox \/ ack/g, '交接紀錄')
    .replace(/packet:[^\s]+/g, '某條交接來源');
}

function humanizeTopicForUser(topic) {
  if (!topic) return '(未記錄)';
  if (topic === 'shared_goal_and_roles') return '共同目標與分工';
  return topic.replace(/_/g, ' ');
}

function defaultActionItemText(item) {
  return item.defaultItem || item.item;
}

function defaultActionNextText(item) {
  return item.defaultNext || item.next;
}

function dashboardStatusLines({ pendingItems, outgoingPackets, riskRecords, sharedGoal }) {
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const blockers = riskRecords.filter((record) => /退回|異議|失敗|錯誤|缺少|不可|未見目前有效基準/.test(record.message));
  const pendingByState = pendingItems.reduce((map, item) => {
    const state = item.actionability ? item.actionability.state : 'actionable';
    map[state] = (map[state] || 0) + 1;
    return map;
  }, {});
  const lines = [];
  if (pendingByState.return > 0) {
    lines.push(`目前有 ${pendingByState.return} 件交接資料不足，應先退回請對方補資料。`);
  } else if (pendingByState.clarify_goal > 0) {
    lines.push(`目前有 ${pendingByState.clarify_goal} 件交接要先釐清共同目標與分工。`);
  } else if (pendingItems.length > 0) {
    lines.push(`有 ${pendingItems.length} 件需要你處理。`);
  } else {
    lines.push('目前沒有需要你處理的新交接。');
  }
  lines.push(`共同目標與分工：${sharedGoalProgressText(sharedGoal)}。`);
  lines.push(`開工判斷：${sharedGoalCanStartText(sharedGoal)}。`);
  if (waitingOutgoing.length > 0) {
    lines.push(`你有 ${waitingOutgoing.length} 件交接仍在等對方處理。`);
  } else {
    lines.push('沒有看到你發出的交接被卡住。');
  }
  if (blockers.length > 0) {
    lines.push(`有 ${blockers.length} 項需要先核對的阻塞風險。`);
  } else if (riskRecords.length > 0) {
    lines.push(`有 ${riskRecords.length} 項提醒，處理前先核對最新交接紀錄。`);
  } else {
    lines.push('未見阻塞風險。');
  }
  return lines;
}

function checkApsPrimaryOutcome({ pendingItems, outgoingPackets, riskRecords, sharedGoal, peers, agentId }) {
  const confirmedPeers = peers.filter((peer) => peer.agent_id && peer.agent_id !== agentId && peer.peer_state === 'confirmed' && peer.status !== 'inactive');
  const pendingByState = pendingItems.reduce((map, item) => {
    const state = item.actionability ? item.actionability.state : 'actionable';
    map[state] = (map[state] || 0) + 1;
    return map;
  }, {});
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const declinedOutgoing = outgoingPackets.filter((item) => item.state === 'declined');
  const blockerCount = riskRecords.filter((record) => /退回|異議|失敗|錯誤|缺少|不可|未見目前有效基準/.test(record.message)).length;
  if (sharedGoal && sharedGoal.state === 'missing') {
    return {
      decision: '未見共同目標與分工，暫時不應發普通任務交接。',
      prompt: '請先幫我建立這個 APS 項目的共同目標與分工，先做到夠安全開始。',
      next: confirmedPeers.length > 0
        ? '先建立共同目標與分工，再發給已加入的協作者確認。'
        : '先建立共同目標與分工；若要找人協作，之後再產生 APS 邀請。',
    };
  }
  if (sharedGoal && sharedGoal.state === 'incoming_pending') {
    return {
      decision: '有共同目標與分工等你確認，未確認前不應直接處理普通任務。',
      prompt: '請用 APS 讀取共同目標與分工，幫我判斷是同意、部分同意，還是要提出異議。',
      next: '先確認共同目標與分工，再決定是否讀普通交接。',
    };
  }
  if (sharedGoal && sharedGoal.state === 'partial') {
    return {
      decision: '共同目標與分工仍未完成逐人確認，第一輪正式任務要先等基準一致。',
      prompt: '請用 APS 整理還有誰未確認共同目標與分工，並建議下一步。',
      next: '先完成受影響協作者的一對一確認。',
    };
  }
  if (declinedOutgoing.length > 0) {
    return {
      decision: `對方退回了 ${declinedOutgoing.length} 件你交出去的事，需要先處理退回原因。`,
      prompt: '請用 APS 讀對方退回原因，幫我判斷要 revise、withdraw，還是 close。',
      next: '先處理退回，再開新交接線。',
    };
  }
  if (pendingByState.return > 0) {
    return {
      decision: `有 ${pendingByState.return} 件交接資料不足，不適合直接開工。`,
      prompt: '請用 APS 讀取待處理交接，幫我整理缺甚麼，先產生補資料或退回建議。',
      next: '先退回補資料或要求對方修訂，不要 consume 成 done。',
    };
  }
  if (pendingByState.clarify_goal > 0) {
    return {
      decision: `有 ${pendingByState.clarify_goal} 件交接要先釐清共同目標與分工。`,
      prompt: '請用 APS 比對這件交接和目前共同目標與分工，先整理共識確認問題。',
      next: '先做共識確認，不要直接開工。',
    };
  }
  if (pendingItems.length > 0) {
    return {
      decision: `有 ${pendingItems.length} 件交接等你處理，先做本機對接檢查再決定是否開工。`,
      prompt: '請用 APS check Drive，逐件讀取待處理交接並做本機對接檢查。',
      next: '先處理收件，不要只看數量摘要。',
    };
  }
  if (blockerCount > 0) {
    return {
      decision: `目前沒有新交接要處理，但有 ${blockerCount} 項阻塞風險要先核對。`,
      prompt: '請用 APS 根據風險清單逐項核對，先判斷是否需要補資料、修訂或等待同步。',
      next: '先消除阻塞風險，再發新交接。',
    };
  }
  if (waitingOutgoing.length > 0) {
    return {
      decision: `你有 ${waitingOutgoing.length} 件交接仍在等對方處理。`,
      prompt: '請用 APS 查看我交出去的事，幫我判斷是否只需等待、要補發人類通知，還是要修訂。',
      next: '不要把已寫入 Drive 當成對方已收到；必要時只補發人類通知。',
    };
  }
  if (confirmedPeers.length === 0) {
    return {
      decision: '目前未見已完成加入的協作者，還不能做正式跨機任務交接。',
      prompt: '請用 APS 先建立共同目標與分工；若我要邀請協作者，請幫我產生 APS 邀請。',
      next: '先建立基準，再邀請協作者加入。',
    };
  }
  return {
    decision: '目前沒有明確卡點，可以按項目目標決定下一輪交接或檢查。',
    prompt: '請用 APS 根據目前共同目標與分工，建議我下一輪應交接給誰和交接甚麼。',
    next: '若要推進，先說明你想交給哪位協作者和本輪目標。',
  };
}

function checkApsPacketStatusLines({ pendingItems, outgoingPackets, riskRecords }) {
  const pendingByState = pendingItems.reduce((map, item) => {
    const state = item.actionability ? item.actionability.state : 'actionable';
    map[state] = (map[state] || 0) + 1;
    return map;
  }, {});
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const declinedOutgoing = outgoingPackets.filter((item) => item.state === 'declined');
  const blockers = riskRecords.filter((record) => /退回|異議|失敗|錯誤|缺少|不可|未見目前有效基準/.test(record.message));
  const lines = [];
  lines.push(`- 收件: ${pendingItems.length} 件待判斷。${pendingByState.return ? `${pendingByState.return} 件資料不足，要先退回補資料。` : pendingItems.length > 0 ? '先逐件做完整性與本機對接檢查。' : '目前沒有新交接要處理。'}`);
  lines.push(`- 發件: ${outgoingPackets.length} 件由你發出。${waitingOutgoing.length > 0 ? `${waitingOutgoing.length} 件仍等對方處理。` : '沒有看到等待對方的發件。'}`);
  if (declinedOutgoing.length > 0) {
    lines.push(`- 是否如期: 否。對方退回 ${declinedOutgoing.length} 件你交出去的事，要先處理退回原因。`);
  } else if (pendingByState.return > 0 || pendingByState.clarify_goal > 0 || blockers.length > 0) {
    lines.push('- 是否如期: 否。先處理缺資料、共同目標或阻塞風險，不要直接開工。');
  } else if (waitingOutgoing.length > 0) {
    lines.push('- 是否如期: 部分等待中。已寫入 Drive 不等於對方已收到通知，可視情況補發人類通知。');
  } else {
    lines.push('- 是否如期: 暫時未見阻塞。下一步按共同目標與分工推進。');
  }
  return lines;
}

function checkApsHasLiveCandidate({ pendingItems, outgoingPackets, riskRecords, sharedGoal = null, peers = [], agentId = '' }) {
  const pendingByState = pendingItems.reduce((map, item) => {
    const state = item.actionability ? item.actionability.state : 'actionable';
    map[state] = (map[state] || 0) + 1;
    return map;
  }, {});
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const declinedOutgoing = outgoingPackets.filter((item) => item.state === 'declined');
  const blockers = riskRecords.filter((record) => /退回|異議|失敗|錯誤|缺少|不可|未見目前有效基準/.test(record.message));
  const confirmedPeerCount = peers.filter((peer) => peer.agent_id && peer.agent_id !== agentId && peer.peer_state === 'confirmed' && peer.status !== 'inactive').length;
  const sharedGoalNeedsLive = sharedGoal && (
    sharedGoal.state === 'incoming_pending'
    || sharedGoal.state === 'partial'
    || sharedGoal.state === 'declined'
    || (sharedGoal.state === 'missing' && confirmedPeerCount > 0)
  );
  return pendingByState.return > 0
    || pendingByState.clarify_goal > 0
    || waitingOutgoing.length > 0
    || declinedOutgoing.length > 0
    || sharedGoalNeedsLive
    || blockers.length > 0;
}

function checkApsLiveRoutingLines({ pendingItems, outgoingPackets, riskRecords, sharedGoal = null, peers = [], hubRoot, projectSlug, agentId, livePath: generatedLivePath = null, liveGenerated = false, demoPreview = false }) {
  const hasLiveCandidate = checkApsHasLiveCandidate({ pendingItems, outgoingPackets, riskRecords, sharedGoal, peers, agentId });
  if (!hasLiveCandidate) return [];
  const livePath = path.join(contextDir(hubRoot, projectSlug), apsLiveFileNameForAgent(agentId));
  const lines = [
    '建議開 APS Live：當共同目標與分工、交接包、補資料、退回或確認需要對方回饋時使用。',
  ];
  if (demoPreview) {
    lines.push('正式項目會由 Check APS 自動生成 APS Live 頁；demo preview 不會寫入 HTML。');
  } else if (generatedLivePath) {
    lines.push(`APS Live: ${generatedLivePath}`);
    lines.push(liveGenerated
      ? '頁面已由 Check APS 自動生成 / 更新；你只需打開頁面使用，不需要自行要求 AI 生成。'
      : '本機已找到 APS Live 頁；你只需打開頁面使用，不需要自行要求 AI 生成。');
  } else if (fs.existsSync(livePath)) {
    lines.push(`APS Live: ${livePath}`);
    lines.push('本機已找到 APS Live 頁；你只需打開頁面使用，不需要自行要求 AI 生成。');
  } else {
    lines.push('APS Live 頁會由 Check APS 在真項目自動生成；目前未能確認路徑，請先檢查本機 APS 設定。');
  }
  lines.push('邊界：Live 只做即時核對；正式確認仍要回到 terminal，經你批准後才寫回 APS Drive 紀錄。');
  return lines;
}

function renderProjectDashboardSummary(dashboard, options = {}) {
  const { hubRoot, projectSlug, agentId, contextReport, incomingGroups, outgoingPackets, peers, sharedGoal } = dashboard;
  const full = Boolean(options.full);
  const liveQueueItems = Array.isArray(options.liveQueueItems) ? options.liveQueueItems : [];
  const pendingItems = incomingGroups.flatMap((group) => group.pending.map((item) => ({ ...item, from: group.from })));
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const riskRecords = dashboardRiskRecords({ incomingGroups, contextReport, peers, identityIssues: dashboard.identityIssues, sharedGoal });
  const riskItems = riskRecords.map((record) => record.message);
  const actionItems = dashboardActionItems({ pendingItems, outgoingPackets, riskRecords, agentId, sharedGoal, peers });
  const statusLines = dashboardStatusLines({ pendingItems, outgoingPackets, riskRecords, sharedGoal });
  const primaryOutcome = checkApsPrimaryOutcome({ pendingItems, outgoingPackets, riskRecords, sharedGoal, peers, agentId });
  const packetStatusLines = checkApsPacketStatusLines({ pendingItems, outgoingPackets, riskRecords });
  const liveRoutingLines = checkApsLiveRoutingLines({
    pendingItems,
    outgoingPackets,
    riskRecords,
    sharedGoal,
    peers,
    hubRoot,
    projectSlug,
    agentId,
    livePath: options.livePath,
    liveGenerated: Boolean(options.liveGenerated),
    demoPreview: Boolean(options.demoPreview),
  });
  const lines = [
    '🧭 APS 整體狀態',
    `📁 項目: ${projectSlug}`,
    `👤 本機代理: ${agentId}`,
    '',
    '🔎 結論',
    `- ${primaryOutcome.decision}`,
    '',
    '📦 交接包狀態',
    ...packetStatusLines,
    '',
    '📌 需要跟進的交接',
  ];
  if (actionItems.length === 0) {
    lines.push(`- ${primaryOutcome.next}`);
  } else {
    for (const item of actionItems.slice(0, 8)) {
      lines.push(`- [${actionLaneIcon(item)} ${item.lane}] ${full ? item.item : defaultActionItemText(item)}`);
      lines.push(`  狀態: ${full ? item.next : defaultActionNextText(item)}`);
      if (item.reason) lines.push(`  判斷: ${item.reason}`);
      if (full) lines.push(`  來源: ${item.source}`);
    }
  }
  if (riskItems.length > 0) {
    lines.push('');
    lines.push('⚠️ 需要注意');
    for (const item of riskRecords.slice(0, 3)) {
      lines.push(`- ${full ? item.message : defaultRiskMessage(item.message)}`);
      lines.push(`  建議: ${full ? item.next : defaultRiskNextText(item.next)}`);
    }
  }
  if (liveRoutingLines.length > 0) {
    lines.push('');
    lines.push('📡 APS Live 即時協作');
    for (const line of liveRoutingLines) lines.push(`- ${line}`);
  }
  if (liveQueueItems.length > 0) {
    const latestQueue = liveQueueItems[0];
    const latestPayload = latestQueue.payload || {};
    lines.push('');
    lines.push('📥 APS Live 待本機 AI 整理');
    lines.push(`- 有 ${liveQueueItems.length} 件 Live 討論已送入本機 AI 待處理佇列。`);
    lines.push(`- 最新一件: ${latestPayload.task_mode || '請 AI 判斷下一步'}。來源: ${latestPayload.agent_id || latestPayload.snapshot && latestPayload.snapshot.agent_id || '(未記錄)'}`);
    lines.push('- 這只是本機待辦材料；是否寫回共同目標、交接包、補資料或確認紀錄，仍要等你批准。');
  }
  if (full) {
    lines.push('');
    lines.push('📌 目前狀態');
    lines.push(...statusLines.map((line) => `- ${line}`));
    lines.push('');
    lines.push(`🎯 共同目標與分工: ${sharedGoalProgressText(sharedGoal)}`);
    lines.push(`🧩 開工判斷: ${sharedGoalCanStartText(sharedGoal)}`);
    lines.push('');
    lines.push('🎯 共同目標與分工詳情');
    lines.push(`- 確認進度: ${sharedGoalProgressText(sharedGoal)}`);
    lines.push(`- 開工判斷: ${sharedGoalCanStartText(sharedGoal)}`);
    if (sharedGoal.latest) {
      lines.push(`- 最新版本: ${sharedGoal.latest.packetId} v${sharedGoal.latest.version}（${sharedGoal.latest.senderId} → ${sharedGoal.latest.summary.to || '(未記錄)'}）`);
    }
    lines.push(`- 共同目標: ${sharedGoal.summary.goal}`);
    lines.push(`- 角色分工: ${sharedGoal.summary.roles}`);
    lines.push(`- 第一輪分工: ${sharedGoal.summary.firstRound}`);
    if (sharedGoal.confirmations.length === 0) {
      lines.push('- peer 確認: 未有 confirmed peer 需要確認。');
    } else {
      lines.push(`- 逐人確認: ${sharedGoal.confirmations.map((item) => `${item.peerId}: ${item.label}，下一步 ${sharedGoalPeerNextStep(item)}`).join('；')}`);
    }
    lines.push('');
    lines.push('📤 我交出去的事');
    if (outgoingPackets.length === 0) {
      lines.push('- 目前沒有由你發出的交接紀錄。');
    } else {
      for (const item of outgoingPackets.slice(0, 5)) {
        lines.push(`- 給 ${item.toId || '(未記錄)'}: ${packetTopic(item.packetId)} v${item.version} — ${item.label}`);
      }
    }
    lines.push('');
    lines.push('👥 協作對象');
    if (peers.length === 0) {
      lines.push('- 未見協作對象卡；舊二人設定仍可透過本機設定運作。');
    } else {
      for (const peer of peers.slice(0, 8)) {
        const markers = [peer.is_self ? '本機' : null, peer.is_default_peer ? '預設對方' : null].filter(Boolean).join(', ');
        const suffix = markers ? ` (${markers})` : '';
        const stateLabel = peer.peer_state === 'confirmed' ? '已確認' : peer.peer_state || peer.status || 'unknown';
        lines.push(`- ${peer.agent_id}${suffix}: ${stateLabel}`);
      }
    }
    lines.push('');
    lines.push('⚠️ 風險與未決');
    if (riskItems.length === 0) {
      lines.push('- 未見阻塞風險。仍須以最新 packet / outbox / ack 作準。');
    } else {
      for (const item of riskRecords.slice(0, 8)) {
        lines.push(`- ${item.owner}: ${item.message}`);
        lines.push(`  建議: ${item.next}`);
        lines.push(`  來源: ${item.source}`);
      }
    }
    lines.push('');
    lines.push('📊 數量摘要（排錯用）');
    lines.push(`- 待你處理: ${pendingItems.length}`);
    lines.push(`- 你交出去的事: ${outgoingPackets.length}`);
    lines.push(`- 等待對方: ${waitingOutgoing.length}`);
    lines.push(`- 協作對象: ${peers.length}`);
    lines.push(`- 風險與提醒: ${riskItems.length}`);
    lines.push('');
    lines.push('🔁 同步與 APS Live（排錯用）');
    lines.push(`- 共用 Drive 本機路徑: ${hubRoot}（只適用於這部電腦，不要發給對方）`);
    lines.push(`- 收件通道: ${incomingGroups.length} 條 peer lane 已讀取；待你處理 ${pendingItems.length} 件。`);
    lines.push(`- 發件紀錄: ${outgoingPackets.length} 件已發交接；等待對方 ${waitingOutgoing.length} 件。`);
    lines.push(`- 背景索引: ${contextReport.entries.length} 條；提醒 ${contextReport.issues.length} 項。`);
    lines.push('- HTML dashboard 已退役：`check-aps` 不再生成 `_context/dashboard.html` 或個人 dashboard。日常狀態以 terminal 摘要為準。');
    lines.push(`- APS Live: 若有真實協調需要，\`check-aps\` 會按需生成 \`_context/${apsLiveFileNameForAgent(agentId)}\`，並仍須回到 terminal 才可寫正式 APS 狀態。`);
    lines.push('');
    lines.push('🔎 邊界:這是按需讀取本機已同步資料的狀態摘要，不代表對方已收到人手通知或已完成 Google Drive 同步。共用 Drive 路徑只供本機用戶打開本機資料夾，不應放入給對方的通知。');
  } else {
    lines.push('');
    lines.push('🔎 深入排錯: 如 AI 需要路徑、同步、數量或完整追溯資料，可執行 `check-aps --full`；日常推進不用看。');
  }
  lines.push('');
  lines.push('------------------------------');
  lines.push('🚀 建議下一步（可直接複製給 AI）');
  lines.push('下一句可對 AI 說:');
  lines.push('```text');
  if (liveQueueItems.length > 0) {
    lines.push('請用 APS 讀取 APS Live 待處理佇列，先整理共識、分歧、待決定事項，判斷哪些需要寫回正式 APS 紀錄；如需要正式動作，先生成草稿和風險，等我確認。');
  } else {
    lines.push(primaryOutcome.prompt);
  }
  lines.push('```');
  lines.push(`跟進理由: ${liveQueueItems.length > 0 ? '已有 APS Live 討論待本機 AI 整理與判斷。' : primaryOutcome.next}`);
  lines.push('------------------------------');
  return lines.join('\n');
}

function renderContextOverviewHtml({ report, projectSlug, dashboard = null }) {
  const generatedAt = isoNow();
  const errors = report.issues.filter((issue) => issue.severity === 'error');
  const warnings = report.issues.filter((issue) => issue.severity !== 'error');
  const rows = report.entries.map((entry) => {
    const title = entry.workstream || entry.current_focus || entry.source_packet || `entry ${entry.blockIndex}`;
    const sourceRefs = normalizeSourceRefs(entry.sourceRefs.length > 0 ? entry.sourceRefs : entry.source_refs);
    return `<tr>
      <td>${htmlEscape(entry.lane_agent)}</td>
      <td>${htmlEscape(title)}</td>
      <td><span class="badge ${contextFreshnessBadgeClass(entry.freshness)}">${htmlEscape(contextFreshnessLabel(entry.freshness))}</span></td>
      <td>${htmlEscape(entry.updated_at || '(未記錄)')}</td>
      <td>${sourceRefs.map((ref) => `<code>${htmlEscape(ref)}</code>`).join('<br>') || '<span class="muted">未列明</span>'}</td>
    </tr>`;
  }).join('\n') || '<tr><td colspan="5" class="muted">目前沒有背景索引條目。</td></tr>';
  const issueRows = report.issues.map((issue) => `<li><strong>${issue.severity === 'error' ? '錯誤' : '提醒'}:</strong> ${htmlEscape(issue.message)}</li>`).join('\n')
    || '<li>未見阻塞錯誤或提醒。</li>';
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${htmlEscape(projectSlug)} 項目大局速覽 - Agent Public Squares</title>
<style>
  :root { --ink:#1b2230; --soft:#4b5568; --bg:#f6f3ec; --paper:#fffdf7; --line:#d8d1c0; --accent:#2f5d7c; --ok:#2e7d4f; --warn:#a55d1f; --bad:#b94a3a; --mono:ui-monospace, "Cascadia Code", Consolas, monospace; --sans:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; --serif:"Noto Serif TC","PMingLiU",Georgia,serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); line-height:1.75; padding:28px 16px 56px; }
  main { max-width:920px; margin:0 auto; }
  nav, section, .callout { background:var(--paper); border:1px solid var(--line); border-radius:6px; }
  nav { display:flex; flex-wrap:wrap; gap:8px 18px; padding:10px 14px; margin-bottom:22px; font-size:14px; }
  .brand { font-family:var(--serif); font-weight:700; }
  header { padding:24px 0; border-bottom:1px solid var(--line); margin-bottom:22px; }
  h1 { font-family:var(--serif); font-size:clamp(30px,6vw,48px); line-height:1.1; margin:0 0 10px; }
  h2 { font-family:var(--serif); font-size:24px; margin:0 0 8px; }
  p { margin:0 0 12px; color:var(--soft); }
  section { padding:22px 24px; margin-bottom:20px; }
  .callout { border-left:4px solid var(--bad); padding:14px 16px; margin-bottom:20px; color:var(--soft); }
  .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:14px; }
  .badge { display:inline-flex; border:1px solid currentColor; border-radius:999px; padding:2px 9px; font-size:12px; font-weight:700; }
  .ok { color:var(--ok); }
  .warn { color:var(--warn); }
  .bad { color:var(--bad); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; vertical-align:top; border-bottom:1px solid var(--line); padding:10px 12px; }
  th { background:#e2edf3; color:var(--accent); }
  code { font-family:var(--mono); font-size:12px; background:#ece6d3; border-radius:3px; padding:1px 5px; word-break:break-word; }
  .muted { color:#7c8798; }
  footer { text-align:center; color:#7c8798; font-size:12px; margin-top:28px; }
</style>
</head>
<body>
<main>
<nav><span class="brand">Agent Public Squares</span><span>Project Context Index</span><span class="muted">唯讀衍生快照</span></nav>
<header>
  <p class="muted">項目大局速覽</p>
  <h1>${htmlEscape(projectSlug)}</h1>
  <p>先用這頁理解背景，再讀具體 packet。這頁不是執行真相，不會自動刷新。</p>
  <div class="meta">
    <span class="badge">生成 ${htmlEscape(generatedAt)}</span>
    <span class="badge ${errors.length ? 'bad' : 'ok'}">${errors.length ? `${errors.length} 個錯誤` : '未見阻塞錯誤'}</span>
    <span class="badge ${warnings.length ? 'warn' : 'ok'}">${warnings.length ? `${warnings.length} 個提醒` : '沒有提醒'}</span>
  </div>
</header>
<div class="callout">
  <strong>這頁只作背景索引。</strong>
  真正開工前，請先讀最新交接包、發件紀錄與處理回條；如果這頁與最新交接不一致，先叫 AI 核對最新交接。
</div>
<section>
  <h2>背景索引</h2>
  <p>每條背景都必須有來源引用與新鮮度狀態。</p>
  <table>
    <thead><tr><th>來源 agent</th><th>工作流</th><th>新鮮度</th><th>更新時間</th><th>來源引用</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>
<section>
  <h2>檢查結果</h2>
  <ul>${issueRows}</ul>
</section>
<footer>Generated by <code>npx aps context html</code>. This page is read-only and generated on demand.</footer>
</main>
</body>
</html>
`;
}

function writeContextOverviewHtml({ hubRoot, projectSlug, report }) {
  const outputPath = path.join(contextDir(hubRoot, projectSlug), 'overview.html');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, renderContextOverviewHtml({ report, projectSlug }), 'utf8');
  return outputPath;
}

function dashboardFileNameForAgent(agentId) {
  return `dashboard_${agentId}.html`;
}

function writeProjectDashboardHtml({ hubRoot, projectSlug, agentId, config, fileName = dashboardFileNameForAgent(agentId) }) {
  const contextPath = contextDir(hubRoot, projectSlug);
  const outputPath = path.join(contextPath, fileName);
  const indexPath = path.join(contextPath, 'dashboard.html');
  void config;
  return { dashboardPath: outputPath, indexPath, retired: true };
}

function apsLiveFileNameForAgent(agentId) {
  return `aps-live_${agentId || 'agent'}.html`;
}

function safeLiveDiagnosticText(value, fallback = 'unknown') {
  const text = String(value || '').trim();
  if (!text) return fallback;
  return hideLocalPaths(text)
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 240);
}

function liveTrackingState({ isMissingSharedGoalFlow, isSharedGoalFlow, firstPending, firstWaiting, targetPeer, agentId, blocker }) {
  if (isMissingSharedGoalFlow) {
    return {
      station: '需先建立共同目標',
      canStart: '不可先開普通任務',
      waitingFor: agentId,
      nextAction: '先回本機 AI 建立共同目標與分工草稿，再發給協作者確認',
      blocker: blocker || '未見目前有效共同目標與分工基準',
      chatMode: '暫不需要',
      impact: '阻塞第一輪交接',
      dependency: '先建立共同目標與分工',
    };
  }
  if (isSharedGoalFlow) {
    return {
      station: '共同目標確認',
      canStart: '不可先開普通任務',
      waitingFor: targetPeer,
      nextAction: '請對方確認、補充或反對共同目標與分工',
      blocker: blocker || '共同目標與分工仍未完全確認',
      chatMode: '需要協調',
      impact: '阻塞第一輪交接',
      dependency: '等共同目標確認',
    };
  }
  if (firstPending) {
    const actionability = firstPending.actionability || {};
    if (actionability.state === 'return') {
      return {
        station: '需補資料',
        canStart: '不可開工',
        waitingFor: firstPending.from || targetPeer,
        nextAction: '請對方補真源、範圍或驗收標準',
        blocker: actionability.reason || blocker || '交接資料不足',
        chatMode: '需要協調',
        impact: '阻塞這條交接鏈',
        dependency: '等對方補資料',
      };
    }
    if (actionability.state === 'clarify_goal') {
      return {
        station: '需先釐清共同目標',
        canStart: '不可開工',
        waitingFor: targetPeer,
        nextAction: '先完成共同目標與分工確認',
        blocker: actionability.reason || blocker || '共同目標未確認',
        chatMode: '需要協調',
        impact: '阻塞普通交接',
        dependency: '等共同目標確認',
      };
    }
    return {
      station: '可開工判斷',
      canStart: '可按交接內容開工',
      waitingFor: agentId,
      nextAction: '回正式交接內容檢查後開始處理',
      blocker: '未見阻塞缺口',
      chatMode: '暫不需要',
      impact: '普通交接',
      dependency: '無',
    };
  }
  if (firstWaiting) {
    return {
      station: '已發出，等對方查看',
      canStart: '等待對方',
      waitingFor: targetPeer,
      nextAction: '請對方確認是否看到同一件交接包',
      blocker: blocker || '仍在等待對方處理或回覆',
      chatMode: '視情況協調',
      impact: '可能阻塞下一步',
      dependency: '等對方 check Drive',
    };
  }
  return {
    station: '未指定交接鏈',
    canStart: '未適用',
    waitingFor: agentId,
    nextAction: '回本機 AI 決定下一個正式 APS 動作',
    blocker: blocker || '目前沒有明確交接卡點',
    chatMode: '暫不需要',
    impact: '未見阻塞',
    dependency: '無',
  };
}

function liveTrackingSteps(tracking, context = {}) {
  const station = String(tracking && tracking.station || '');
  const sharedGoal = context.sharedGoal || null;
  const blocked = /需補資料|不可|釐清|共同目標/.test(`${station} ${tracking && tracking.canStart || ''}`);
  const hasSharedGoalPacket = Boolean(sharedGoal && sharedGoal.latest);
  if (station.includes('共同目標')) {
    const sharedGoalState = sharedGoal && sharedGoal.state ? sharedGoal.state : 'missing';
    if (!hasSharedGoalPacket || sharedGoalState === 'missing') {
      return ['共同基準', '已發出', '對方查看', '可開工判斷', '處理 / 補資料', '正式更新'].map((label, index) => {
        const state = index === 0 ? 'blocked' : 'todo';
        const meta = liveStepStatusMeta(state);
        return {
          label,
          state,
          icon: meta.icon,
          status_label: meta.label,
        };
      });
    }
    if (sharedGoalState === 'confirmed') {
      return ['共同基準', '已發出', '對方查看', '可開工判斷', '處理 / 補資料', '正式更新'].map((label, index) => {
        const state = index < 3 ? 'done' : index === 3 ? 'active' : 'todo';
        const meta = liveStepStatusMeta(state);
        return {
          label,
          state,
          icon: meta.icon,
          status_label: meta.label,
        };
      });
    }
    if (sharedGoalState === 'declined') {
      return ['共同基準', '已發出', '對方查看', '可開工判斷', '處理 / 補資料', '正式更新'].map((label, index) => {
        const state = index === 1 ? 'done' : index === 0 ? 'blocked' : 'todo';
        const meta = liveStepStatusMeta(state);
        return {
          label,
          state,
          icon: meta.icon,
          status_label: meta.label,
        };
      });
    }
    return ['共同基準', '已發出', '對方查看', '可開工判斷', '處理 / 補資料', '正式更新'].map((label, index) => {
      const state = index === 1 ? 'done' : index === 0 ? 'active' : 'todo';
      const meta = liveStepStatusMeta(state);
      return {
        label,
        state,
        icon: meta.icon,
        status_label: meta.label,
      };
    });
  }
  const activeIndex = station.includes('共同目標') ? 0
    : station.includes('已發出') ? 1
      : station.includes('可開工') || station.includes('需補') || station.includes('釐清') ? 3
        : 1;
  const steps = ['共同基準', '已發出', '對方查看', '可開工判斷', '處理 / 補資料', '正式更新'];
  return steps.map((label, index) => {
    const state = index < activeIndex ? 'done' : index === activeIndex ? (blocked ? 'blocked' : 'active') : 'todo';
    const meta = liveStepStatusMeta(state);
    return {
      label,
      state,
      icon: meta.icon,
      status_label: meta.label,
    };
  });
}

function liveStepStatusMeta(state) {
  switch (state) {
    case 'done':
      return { icon: '✓', label: '已完成' };
    case 'active':
      return { icon: '→', label: '進行中' };
    case 'blocked':
      return { icon: '!', label: '未通過 / 需處理' };
    default:
      return { icon: '○', label: '未開始' };
  }
}

function liveEventTimeLabel(value, fallback = '尚未記錄') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

function outboxEventTime(event) {
  if (!event) return null;
  return event.at || (event.kv && (event.kv.at || event.kv.created_at || event.kv.updated_at)) || null;
}

function packetCreatedTime(item) {
  if (!item) return null;
  return item.created_at
    || item.createdAt
    || (item.header && (item.header.created_at || item.header.createdAt))
    || (item.summary && (item.summary.created_at || item.summary.createdAt))
    || outboxEventTime(item.event)
    || null;
}

function buildApsLiveDiagnosticSnapshot(dashboard, options = {}) {
  const { projectSlug, agentId, incomingGroups, outgoingPackets, sharedGoal } = dashboard;
  const liveParticipants = Array.from(new Set([
    agentId,
    ...(dashboard.peers || [])
      .filter((peer) => peer.agent_id && peer.status !== 'inactive' && peer.peer_state === 'confirmed')
      .map((peer) => peer.agent_id),
  ].filter(Boolean))).sort();
  const pendingItems = incomingGroups.flatMap((group) => group.pending.map((item) => ({ ...item, from: group.from })));
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const firstPending = pendingItems[0] || null;
  const firstWaiting = waitingOutgoing[0] || null;
  const snapshotGeneratedAt = isoNow();
  const ticketStartedAt = packetCreatedTime(firstPending) || packetCreatedTime(firstWaiting) || snapshotGeneratedAt;
  const ticketSentAt = packetCreatedTime(firstWaiting) || packetCreatedTime(firstPending) || '';
  const ticketClosedAt = firstWaiting && firstWaiting.closed ? outboxEventTime(firstWaiting.closed) : '';
  const ticketReturnedAt = firstWaiting && (firstWaiting.declined || firstWaiting.withdrawn)
    ? outboxEventTime(firstWaiting.declined || firstWaiting.withdrawn)
    : '';
  const firstWaitingTopic = firstWaiting ? packetTopic(firstWaiting.packetId) : null;
  const firstWaitingPeer = firstWaiting && (firstWaiting.toId || (firstWaiting.summary && firstWaiting.summary.to));
  const firstPeer = (dashboard.peers || []).find((peer) => peer.agent_id && peer.agent_id !== agentId && peer.peer_state === 'confirmed');
  const targetPeer = firstPending
    ? firstPending.from
    : firstWaitingPeer || (firstPeer && firstPeer.agent_id) || '協作者';
  const isMissingSharedGoalFlow = Boolean(sharedGoal && sharedGoal.state === 'missing');
  const isSharedGoalFlow = sharedGoal && (
    sharedGoal.state === 'partial'
    || sharedGoal.state === 'incoming_pending'
    || firstWaitingTopic === 'shared_goal_and_roles'
  );
  const seenPacket = firstPending
    ? `${firstPending.from}:${firstPending.packetId}:v${firstPending.version}`
    : firstWaiting
      ? `${agentId}:${firstWaiting.packetId}:v${firstWaiting.version}`
      : 'none';
  const blocker = firstPending && firstPending.actionability
    ? firstPending.actionability.reason || firstPending.actionability.next
    : isMissingSharedGoalFlow
      ? '未見目前有效共同目標與分工基準；普通任務交接必須先有共同目標、角色分工與驗收標準。'
      : isSharedGoalFlow
      ? '共同目標與分工仍在確認中；需要對方回饋同意、補充、修正或提出異議，才適合寫成正式基準。'
      : waitingOutgoing.length > 0
      ? '有交接等待對方處理；Live 用來即時核對雙方看到的狀態、回饋和分歧，不代表對方已正式確認。'
      : '目前沒有明確交接卡點；可先回到本機 AI 推進正式 APS 動作，需要核對狀態時才開 APS Live。';
  const sharedGoalSummary = sharedGoal && sharedGoal.summary ? sharedGoal.summary : {};
  const firstTopic = firstPending
    ? packetTopic(firstPending.packetId)
    : firstWaiting
      ? packetTopic(firstWaiting.packetId)
      : 'project_consensus';
  const caseTitle = isMissingSharedGoalFlow
    ? '需先建立共同目標與分工'
    : isSharedGoalFlow
    ? `等待 ${targetPeer} 確認共同目標與分工`
    : firstPending
      ? `${targetPeer} 交來 ${humanizeTopicForUser(firstTopic)}，需要先判斷能否開工`
      : firstWaiting
        ? `你交給 ${targetPeer} 的 ${humanizeTopicForUser(firstTopic)} 正在等待回覆`
        : '交接狀態核對';
  const caseSummary = isMissingSharedGoalFlow
    ? '本機 AI 未見目前有效共同目標與分工基準。第一輪普通任務不得先開始，需先建立共同目標、角色分工、第一輪範圍與驗收標準。'
    : isSharedGoalFlow
    ? `本機 AI 看到共同目標與分工仍未完全確認：${sharedGoalProgressText(sharedGoal)}。這頁要讓協作者確認、補充或提出異議。`
    : firstPending
      ? `本機 AI 看到 ${targetPeer} 有一件待處理交接：${humanizeTopicForUser(firstTopic)} v${firstPending.version}。目前判斷是：${safeLiveDiagnosticText(blocker)}`
      : firstWaiting
        ? `本機 AI 看到你已發出 ${humanizeTopicForUser(firstTopic)} v${firstWaiting.version} 給 ${targetPeer}，但仍在等待對方處理或回覆。`
        : '目前沒有明確阻塞交接；這頁可用來把會影響 APS 交接的共識、分歧和待決定事項留下來。';
  const currentQuestion = isMissingSharedGoalFlow
    ? '目前尚未有共同目標與分工基準。是否要先請本機 AI 起草共同目標、角色分工、第一輪範圍與驗收標準？'
    : isSharedGoalFlow
    ? `${targetPeer} 是否同意目前共同目標、角色、第一輪分工和驗收標準？如不同意，需要改哪裏？`
    : firstPending
      ? `這件交接是否資料足夠？若不足，${targetPeer} 要補充哪些檔案位置、範圍或驗收標準？`
      : firstWaiting
        ? `${targetPeer} 那邊是否已同步到同一件交接包？目前是未讀、處理中、需要補資料，還是已完成？`
        : '這段討論是否會影響共同目標、分工、交接範圍、驗收標準或下一個正式 APS 動作？';
  const suggestedMessage = isMissingSharedGoalFlow
    ? '請先回本機 AI：請幫我建立 APS 共同目標與角色分工草稿，列出共同目標、參與者、第一輪範圍、驗收標準與待確認項，再逐一發給協作者確認。'
    : isSharedGoalFlow
    ? `${targetPeer}，本機 AI 帶我來 APS Live，是想確認共同目標與分工是否一致。我看到：${sharedGoalProgressText(sharedGoal)}。請你確認三件事：一、共同目標是否正確；二、你的角色與第一輪分工是否正確；三、驗收標準有沒有需要補充或反對的地方。`
    : firstPending
      ? `${targetPeer}，我這邊收到你交來的 ${humanizeTopicForUser(firstTopic)} v${firstPending.version}。本機 AI 判斷目前可能未足夠直接開工，原因是：${safeLiveDiagnosticText(blocker)}。請你補充要處理的具體位置、依據檔案或版本，以及怎樣才算完成。`
      : firstWaiting
        ? `${targetPeer}，我已發出 ${humanizeTopicForUser(firstTopic)} v${firstWaiting.version} 給你，但仍在等回覆。請你確認是否看到同一件交接包，以及現在是未讀、處理中、需要補資料，還是已完成。`
        : `${targetPeer}，我想把這段項目討論留在 APS Live，避免之後交接時目標或分工漂移。請你補充目前已同意甚麼、仍有甚麼分歧、下一步誰要做甚麼，以及哪些內容不應寫入正式 APS 紀錄。`;
  const trackingState = liveTrackingState({ isMissingSharedGoalFlow, isSharedGoalFlow, firstPending, firstWaiting, targetPeer, agentId, blocker });
  const trackingSteps = liveTrackingSteps(trackingState, { sharedGoal, firstPending, firstWaiting, isMissingSharedGoalFlow, isSharedGoalFlow });
  const chainTitle = isMissingSharedGoalFlow
    ? '共同目標與分工未建立'
    : isSharedGoalFlow
    ? '共同目標與分工確認'
    : humanizeTopicForUser(firstTopic);
  const activeChain = {
    title: safeLiveDiagnosticText(chainTitle),
    status: safeLiveDiagnosticText(trackingState.station),
    waiting_for: safeLiveDiagnosticText(trackingState.waitingFor || targetPeer),
    can_start: safeLiveDiagnosticText(trackingState.canStart),
    dependency: safeLiveDiagnosticText(trackingState.dependency),
    impact: safeLiveDiagnosticText(trackingState.impact),
  };
  const handoffChains = [
    activeChain,
    ...waitingOutgoing
      .filter((item) => !firstWaiting || item.packetId !== firstWaiting.packetId)
      .slice(0, 3)
      .map((item) => ({
        title: safeLiveDiagnosticText(humanizeTopicForUser(packetTopic(item.packetId))),
        status: '已發出，等對方處理',
        waiting_for: safeLiveDiagnosticText(item.toId || (item.summary && item.summary.to) || '協作者'),
        can_start: '等待對方',
        dependency: '等對方 check Drive',
        impact: '普通交接',
      })),
  ];
  const contextCards = [
    ['今次要核對', caseTitle],
    ['目前站點', trackingState.station],
    ['等誰行動', trackingState.waitingFor],
    ['能否開工', trackingState.canStart],
  ];
  const evidenceRefs = Array.from(new Set([
    sharedGoal && sharedGoal.latest ? packetSourceRef(sharedGoal.latest.senderId, sharedGoal.latest.packetId, sharedGoal.latest.version) : null,
    firstPending ? packetSourceRef(firstPending.from, firstPending.packetId, firstPending.version) : null,
    firstWaiting ? packetSourceRef(agentId, firstWaiting.packetId, firstWaiting.version) : null,
  ].filter(Boolean)));
  const evidenceLabels = Array.from(new Set([
    sharedGoal && sharedGoal.latest ? `共同目標與分工草稿 v${sharedGoal.latest.version}` : null,
    firstPending ? `${targetPeer} 交來的 ${humanizeTopicForUser(firstTopic)} v${firstPending.version}` : null,
    firstWaiting ? `你交給 ${targetPeer} 的 ${humanizeTopicForUser(firstTopic)} v${firstWaiting.version}` : null,
  ].filter(Boolean)));
  return {
    project: safeLiveDiagnosticText(options.project || projectSlug),
    agent_id: safeLiveDiagnosticText(options.agentId || agentId),
    live_participants: liveParticipants.map((value) => safeLiveDiagnosticText(value)),
    live_focus: isMissingSharedGoalFlow || isSharedGoalFlow ? '共同目標與分工確認' : '任務交接狀態核對',
    target_peer: safeLiveDiagnosticText(targetPeer, '協作者'),
    current_case_title: safeLiveDiagnosticText(caseTitle),
    current_case_summary: safeLiveDiagnosticText(caseSummary, caseTitle),
    current_question: safeLiveDiagnosticText(currentQuestion),
    suggested_message: safeLiveDiagnosticText(suggestedMessage, ''),
    current_station: safeLiveDiagnosticText(trackingState.station),
    can_start_label: safeLiveDiagnosticText(trackingState.canStart),
    waiting_for: safeLiveDiagnosticText(trackingState.waitingFor),
    next_formal_action: safeLiveDiagnosticText(trackingState.nextAction),
    generated_at: safeLiveDiagnosticText(snapshotGeneratedAt),
    ticket_started_at: safeLiveDiagnosticText(ticketStartedAt),
    ticket_sent_at: safeLiveDiagnosticText(ticketSentAt, ''),
    ticket_comment_at: '',
    ticket_closed_at: safeLiveDiagnosticText(ticketClosedAt, ''),
    ticket_returned_at: safeLiveDiagnosticText(ticketReturnedAt, ''),
    chat_mode_label: safeLiveDiagnosticText(trackingState.chatMode),
    chain_dependency: safeLiveDiagnosticText(trackingState.dependency),
    chain_impact: safeLiveDiagnosticText(trackingState.impact),
    tracking_steps: trackingSteps,
    handoff_chains: handoffChains,
    context_cards: contextCards.map(([label, value]) => ({ label, value: safeLiveDiagnosticText(value) })),
    evidence_refs: evidenceRefs,
    evidence_labels: evidenceLabels,
    seen_shared_goal: sharedGoalProgressText(sharedGoal),
    shared_goal_goal: safeLiveDiagnosticText(sharedGoalSummary.goal || '未見共同目標摘要'),
    shared_goal_roles: safeLiveDiagnosticText(sharedGoalSummary.roles || '未見角色分工摘要'),
    shared_goal_first_round: safeLiveDiagnosticText(sharedGoalSummary.firstRound || '未見第一輪分工摘要'),
    shared_goal_acceptance: safeLiveDiagnosticText(sharedGoalSummary.acceptance || '未見驗收標準摘要'),
    seen_packet: safeLiveDiagnosticText(seenPacket, 'none'),
    seen_ack: firstWaiting && firstWaiting.state ? safeLiveDiagnosticText(firstWaiting.state) : 'none',
    feedback_status: isMissingSharedGoalFlow
      ? '目前沒有可供協作者確認的共同目標與分工草稿。'
      : isSharedGoalFlow
      ? safeLiveDiagnosticText((sharedGoal.confirmations || []).map((item) => `${item.peerId}: ${item.label}`).join('；') || sharedGoalProgressText(sharedGoal))
      : firstPending
        ? '等待本機判斷是否可處理、需補資料或退回。'
        : waitingOutgoing.length > 0
          ? '等待對方 check Drive、標記處理或另發回覆。'
          : '目前沒有明確待回饋事項。',
    pending_decision: isMissingSharedGoalFlow
      ? '先建立共同目標與分工草稿；在協作者確認前，不應把普通任務視為可開工。'
      : isSharedGoalFlow
      ? '整理對方回饋後，決定同意原草稿、修訂共同目標與分工、補發給其他協作者，或暫停第一輪任務交接。'
      : firstPending
        ? '判斷要等待同步、要求補資料、退回不能處理，還是繼續交接。'
        : '判斷是否需要等待、修訂、補發人類通知，或回到正常交接流程。',
    local_drive_state: options.demo
      ? 'demo preview：本機假資料，不代表 Google Drive 同步。'
      : '本頁按開啟時本機已同步資料生成；不是背景監察，也不代表對方已同步。',
    blocker: safeLiveDiagnosticText(blocker, 'unknown'),
    proposed_terminal_action: isMissingSharedGoalFlow
      ? '請回到本機 AI：請用 APS 建立共同目標與分工草稿，確認後才發普通任務包。'
      : isSharedGoalFlow
      ? '請回到本機 AI：請用 APS 根據對方對共同目標與分工的回饋，整理共識、分歧與下一步。'
      : firstPending
        ? '請回到本機 AI：請用 APS 根據雙方核對結果，判斷要等待同步、請對方補資料、退回不能處理，還是繼續交接。'
        : '請回到本機 AI：請用 APS 根據雙方核對結果，判斷應等待同步、要求補資料、修訂，還是繼續交接。',
  };
}

function apsLiveRoomId(snapshot) {
  const project = safeQueueFileToken(snapshot.project || 'project');
  const participantSource = Array.isArray(snapshot.live_participants) && snapshot.live_participants.length > 0
    ? [...snapshot.live_participants, snapshot.agent_id, snapshot.target_peer]
    : [snapshot.agent_id, snapshot.target_peer];
  const participants = Array.from(new Set(participantSource))
    .filter((value) => value && value !== 'none')
    .map((value) => safeQueueFileToken(String(value)))
    .sort()
    .join('_') || safeQueueFileToken(snapshot.agent_id || 'agent');
  const basis = [
    snapshot.project || 'project',
    participants,
    snapshot.live_focus || 'aps-live',
  ].join('|');
  const digest = crypto.createHash('sha256').update(basis).digest('hex').slice(0, 16);
  return `aps:${project}:${participants}:${digest}`.replace(/[^a-zA-Z0-9:_-]+/g, '_').slice(0, 120);
}

function renderApsLiveHtml({ dashboard, snapshot, demo = false, generatedAt = isoNow(), bridge = null }) {
  const peers = dashboard.peers || [];
  const roomId = apsLiveRoomId(snapshot);
  const safeSnapshotJson = JSON.stringify(snapshot, null, 2).replace(/</g, '\\u003c');
  const safeBridgeJson = JSON.stringify(bridge, null, 2).replace(/</g, '\\u003c');
  const trackingStepsHtml = (snapshot.tracking_steps || []).map((step) => {
    const meta = liveStepStatusMeta(step.state || 'todo');
    const icon = step.icon || meta.icon;
    const statusLabel = step.status_label || meta.label;
    return `
          <div class="tracking-step ${htmlEscape(step.state || 'todo')}" aria-label="${htmlEscape(`${step.label}：${statusLabel}`)}">
            <span class="tracking-step-icon" aria-hidden="true">${htmlEscape(icon)}</span>
            <span class="tracking-step-title">${htmlEscape(step.label)}</span>
            <span class="tracking-step-status">${htmlEscape(statusLabel)}</span>
          </div>`;
  }).join('');
  const trackingLegendHtml = ['done', 'active', 'blocked', 'todo'].map((state) => {
    const meta = liveStepStatusMeta(state);
    return `<span class="tracking-legend-item ${htmlEscape(state)}"><span aria-hidden="true">${htmlEscape(meta.icon)}</span>${htmlEscape(meta.label)}</span>`;
  }).join('');
  const targetPeerText = snapshot.target_peer && snapshot.target_peer !== 'none'
    ? snapshot.target_peer
    : '協作者';
  const liveParticipants = Array.isArray(snapshot.live_participants) ? snapshot.live_participants : [];
  const coordinatingParticipants = liveParticipants
    .filter((value) => value && value !== snapshot.agent_id && value !== targetPeerText);
  const participantBoundaryText = coordinatingParticipants.length > 0
    ? `旁聽 / 協調：${coordinatingParticipants.join('、')}。正式交接仍是 ${snapshot.agent_id} → ${targetPeerText}。`
    : `正式交接仍是 ${snapshot.agent_id} → ${targetPeerText}；其他人即使在線，也只算協調，不改變接收者。`;
  const ticketOrdinalText = '交接單 1/1';
  const evidenceText = (snapshot.evidence_labels || []).slice(0, 3).join('、') || '目前未指定正式交接；只作交接狀態核對。';
  const taskText = snapshot.current_question || snapshot.current_case_summary || snapshot.current_case_title;
  const startConditionText = `${snapshot.can_start_label || '未確認'}；${snapshot.next_formal_action || snapshot.proposed_terminal_action || '等待本機 AI 判斷下一步'}`;
  const stageActionMap = new Map([
    ['共同基準', ['本機 AI / Terminal', '已見共同目標與分工包時，此步代表基準包存在；若仍未確認，下一步是請接收方明確同意、部分同意、有異議或稍後。']],
    ['已發出', ['本機 AI / Terminal', '請用 APS 檢查這張交接單是否已正式發出；如內容錯誤，先草擬修訂或撤回。']],
    ['對方查看', ['對方本機 AI / Terminal', '請對方執行 Check APS 或 check Drive；若看不到同一張單，在 Live 留言說明版本或同步差異。']],
    ['可開工判斷', ['APS Live + 本機 AI', '若同意就回「已收到」；若資料不足就回「需補資料」；若不同意就回「不同意」。']],
    ['處理 / 補資料', ['APS Live + 本機 AI', '把缺口、補充位置或反對理由講清楚，再交給本機 AI 草擬正式補資料、退回或修訂。']],
    ['正式更新', ['本機 AI / Terminal', '回到本機 AI，要求它根據 Live 討論草擬正式下一步；使用者確認後才寫入 APS。']],
  ]);
  const stageGuideRowsHtml = (snapshot.tracking_steps || []).map((step) => {
    const meta = liveStepStatusMeta(step.state || 'todo');
    const [where, nextLine] = stageActionMap.get(step.label) || ['本機 AI / Terminal', '請回到本機 AI 檢查正式 APS 下一步。'];
    return `
          <div class="stage-guide-row">
            <strong>${htmlEscape(step.label)}</strong>
            <span class="stage-status ${htmlEscape(step.state || 'todo')}">${htmlEscape(step.icon || meta.icon)} ${htmlEscape(step.status_label || meta.label)}</span>
            <span>${htmlEscape(where)}</span>
            <span>${htmlEscape(nextLine)}</span>
          </div>`;
  }).join('');
  const isBlockedStatus = /等待|未|需|不可|異議|退回/.test(`${snapshot.current_station} ${snapshot.can_start_label} ${snapshot.blocker}`);
  const eventRows = [
    { key: 'start', icon: '✓', title: '開始', time: liveEventTimeLabel(snapshot.ticket_started_at || snapshot.generated_at || generatedAt, '本頁生成時'), detail: `${snapshot.agent_id} 建立交接追蹤；已帶入任務、依據與開工條件。`, state: 'done' },
    { key: 'sent', icon: '✓', title: '正式包 / 查看', time: liveEventTimeLabel(snapshot.ticket_sent_at, '等待正式包或對方查看紀錄'), detail: snapshot.current_case_title, state: snapshot.ticket_sent_at ? 'done' : 'active' },
    { key: 'comment', icon: isBlockedStatus ? '!' : '…', title: isBlockedStatus ? '留言 / Comment：未通過' : '留言 / Comment', time: liveEventTimeLabel(snapshot.ticket_comment_at, '等待 Live 留言'), detail: `${snapshot.current_station} / ${snapshot.waiting_for}`, state: isBlockedStatus ? 'blocked' : 'active' },
    { key: 'close', icon: snapshot.ticket_closed_at ? '✓' : '○', title: '收結 / Close', time: liveEventTimeLabel(snapshot.ticket_closed_at || snapshot.ticket_returned_at, snapshot.ticket_returned_at ? '已退回，等待正式處理' : '尚未正式 close'), detail: snapshot.next_formal_action || '由本機 AI 整理正式下一步。', state: snapshot.ticket_closed_at ? 'done' : (snapshot.ticket_returned_at ? 'blocked' : 'todo') },
  ];
  const renderEventRow = (item, suffix = '') => `
          <div class="event-row ${htmlEscape(item.state)}">
            <span class="event-icon" id="${htmlEscape(`live${item.key}Icon${suffix}`)}">${htmlEscape(item.icon)}</span>
            <strong>${htmlEscape(item.title)}</strong>
            <span class="event-time" id="${htmlEscape(`live${item.key}Time${suffix}`)}">${htmlEscape(item.time)}</span>
            <span>${htmlEscape(item.detail)}</span>
          </div>`;
  const eventPreviewHtml = eventRows.slice(0, 3).map((item) => renderEventRow(item, 'Preview')).join('');
  const eventRowsHtml = eventRows.map((item) => renderEventRow(item, 'Full')).join('');
  const terminalActions = [
    ['確認 / 同意', '請用 APS 根據這次 Live 討論，草擬確認這份共同目標與分工或交接單的正式記錄，等我確認。'],
    ['提出異議', '請用 APS 根據這次 Live 討論，整理分歧、風險與需要修訂的位置，先給我草稿。'],
    ['退回 / 補資料', '請用 APS 根據這次 Live 討論，草擬補資料請求或 APS decline 退回理由；正式送出前先問我。'],
    ['收結 / close', '請用 APS 檢查是否已有足夠證據 close 這條交接；只草擬，不要直接寫入。'],
  ];
  const terminalActionsHtml = terminalActions.map(([label, line]) => `
          <div class="terminal-action">
            <strong>${htmlEscape(label)}</strong>
            <span>${htmlEscape(line)}</span>
          </div>`).join('');
  const messagePlaceholder = `${targetPeerText}，請核對這一版 ${snapshot.live_focus || '交接狀態'}：你是否看到同一版？如同意，請補一句驗收標準或下一步。`;
  const refreshFormalPrompt = '請用 APS 執行 Check APS，重新讀取 Drive 最新狀態，並刷新 APS Live 交接追蹤頁。';
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>APS Live 交接追蹤頁</title>
  <style>
    :root { color-scheme: light; --ink: #1e1b16; --muted: #665f55; --line: #221f1a; --paper: #fff3d7; --paper-soft: #fff9e9; --blue: #2368b3; --blue-soft: #e7f1ff; --orange: #ef8d2c; --green: #4f9b60; --purple: #7357a6; --red: #d75b43; --ok: #1f7a4d; }
    * { box-sizing: border-box; }
    body { margin: 0; color: var(--ink); font-family: "Segoe UI", "Noto Sans TC", Arial, sans-serif; background:
      radial-gradient(circle at 18px 18px, rgba(35,31,26,.05) 1px, transparent 1.5px) 0 0 / 34px 34px,
      linear-gradient(180deg, #fff6df 0%, #f8edcf 100%); line-height: 1.55; }
    main { width: min(1160px, calc(100% - 32px)); margin: 0 auto; padding: 24px 0 44px; }
    header { text-align: center; padding: 8px 0 18px; margin-bottom: 12px; }
    h1 { margin: 0 0 4px; font-size: clamp(30px, 4.6vw, 50px); line-height: 1.06; letter-spacing: 0; font-weight: 900; }
    h2 { font-size: 19px; margin: 0 0 10px; }
    p { margin: 0 0 10px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; }
    section { border: 3px solid var(--line); border-radius: 14px; padding: 16px; background: rgba(255,249,233,.92); box-shadow: 0 5px 0 rgba(30,27,22,.13); }
    .hero { border-color: #163f73; background: #f6fbff; position: relative; overflow: hidden; }
    .hero h2 { font-size: 24px; }
    .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 16px; }
    .identity-pair { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .agent-pill { display: inline-flex; align-items: center; gap: 8px; border: 3px solid var(--line); border-radius: 16px; background: #fffefa; padding: 8px 14px; font-weight: 900; box-shadow: 0 3px 0 rgba(30,27,22,.13); }
    .agent-dot { width: 11px; height: 11px; border: 2px solid var(--line); border-radius: 50%; background: var(--green); }
    .agent-dot.blue { background: var(--blue); }
    .boundary-line { width: 100%; flex-basis: 100%; color: var(--muted); font-size: 13px; text-align: right; }
    .ticket-card { border: 3px solid var(--line); border-radius: 18px; background: rgba(255,253,244,.95); padding: 18px; box-shadow: 0 8px 0 rgba(30,27,22,.10); }
    .ticket-head { display: flex; justify-content: space-between; gap: 18px; align-items: flex-start; margin-bottom: 12px; }
    .ticket-title { margin: 0; font-size: clamp(26px, 3.8vw, 38px); line-height: 1.08; font-weight: 900; }
    .ticket-title mark { background: linear-gradient(transparent 62%, rgba(239,141,44,.42) 0); padding: 0 5px; }
    .stamp { border: 3px solid #91aeca; border-radius: 50%; width: 78px; height: 78px; display: grid; place-items: center; color: #47759a; font-weight: 900; transform: rotate(-8deg); flex: 0 0 auto; background: rgba(231,241,255,.5); }
    .ticket-layout { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(300px, .65fr); gap: 22px; }
    .ticket-details { border: 2px solid rgba(34,31,26,.20); border-radius: 16px; overflow: hidden; background: rgba(255,255,255,.55); }
    .detail-row { display: grid; grid-template-columns: 128px 1fr; gap: 14px; padding: 12px 14px; border-bottom: 1px solid rgba(34,31,26,.14); }
    .detail-row:last-child { border-bottom: 0; }
    .detail-row strong { color: #164e63; font-size: 18px; }
    .detail-row span { color: var(--ink); }
    .action-panel { border-left: 3px dashed rgba(34,31,26,.26); padding-left: 20px; display: flex; flex-direction: column; gap: 8px; justify-content: center; }
    .action-panel .hint { color: var(--muted); font-size: 14px; }
    .mode-picker { display: grid; gap: 5px; font-size: 13px; font-weight: 800; color: var(--muted); }
    .mode-picker select { width: 100%; border: 2px solid rgba(34,31,26,.26); border-radius: 10px; padding: 7px 10px; background: #fffefa; color: var(--ink); font: inherit; font-weight: 750; }
    .event-log { margin-top: 14px; }
    .event-preview { border: 2px solid rgba(34,31,26,.16); border-radius: 12px; padding: 2px 10px; background: rgba(255,255,255,.46); }
    .event-history { border-top: 1px solid rgba(34,31,26,.13); padding-top: 10px; }
    .event-row { display: grid; grid-template-columns: 38px minmax(120px, .45fr) minmax(132px, .5fr) 1fr; gap: 12px; align-items: center; padding: 12px 6px; border-bottom: 1px solid rgba(34,31,26,.13); }
    .event-row:last-child { border-bottom: 0; }
    .event-icon { width: 30px; height: 30px; border: 2px solid var(--line); border-radius: 50%; display: grid; place-items: center; font-weight: 900; background: #e8e0d0; }
    .event-row.done .event-icon { background: #d7ecd8; color: #1f6b3e; }
    .event-row.active .event-icon { background: #fff0c9; color: #8a5a00; }
    .event-row.blocked .event-icon { background: #fff4f2; color: #9f2f1d; }
    .event-time { font-size: 13px; font-weight: 850; color: #164e63; }
    .event-row span:not(.event-icon) { color: var(--muted); }
    .stage-guide { margin-top: 14px; }
    .stage-guide-row { display: grid; grid-template-columns: minmax(110px, .7fr) minmax(118px, .7fr) minmax(160px, .9fr) minmax(280px, 1.7fr); gap: 10px; padding: 10px 0; border-bottom: 1px solid rgba(34,31,26,.13); align-items: start; }
    .stage-guide-row:last-child { border-bottom: 0; }
    .stage-guide-row strong { color: #164e63; }
    .stage-guide-row span { color: var(--muted); }
    .stage-status { display: inline-flex; align-items: center; gap: 5px; width: max-content; max-width: 100%; border: 2px solid rgba(34,31,26,.24); border-radius: 999px; padding: 3px 8px; font-weight: 900; background: #fffdf4; }
    .stage-status.done { color: #155e3b; background: #eaf8ee; }
    .stage-status.active { color: #164e63; background: #e5f2ff; }
    .stage-status.blocked { color: #8a2f1e; background: #fff4f2; }
    .status-badge { display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%; border: 3px solid var(--line); border-radius: 999px; background: #ffe5ae; color: #5b3500; padding: 8px 12px; font-weight: 900; box-shadow: 0 3px 0 rgba(30,27,22,.14); }
    .status-badge::before { content: ""; width: 11px; height: 11px; border: 2px solid var(--line); border-radius: 50%; background: #c9851f; }
    .quick-facts { display: grid; gap: 8px; margin-top: 4px; }
    .quick-fact { border: 2px solid rgba(34,31,26,.36); border-radius: 10px; padding: 9px 10px; background: #fff9e9; }
    .quick-fact strong { display: block; color: #164e63; margin-bottom: 2px; }
    .quick-fact span { display: block; color: var(--muted); }
    .sketch-mark { display: inline-block; border-bottom: 8px solid rgba(239,141,44,.55); line-height: .9; padding: 0 6px 4px; }
    .scene { display: grid; grid-template-columns: minmax(130px, 1fr) minmax(320px, 2.4fr) minmax(130px, 1fr); gap: 14px; align-items: center; margin-top: 12px; }
    .actor { min-height: 220px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; }
    .face { width: 78px; height: 78px; border: 3px solid var(--line); border-radius: 50%; background: #fff; display: grid; place-items: center; font-size: 38px; box-shadow: 0 4px 0 rgba(30,27,22,.14); }
    .actor-label { border: 3px solid currentColor; border-radius: 12px; background: #fffdf4; padding: 8px 12px; font-weight: 900; text-align: center; }
    .actor.left .actor-label { color: var(--blue); }
    .actor.right .actor-label { color: var(--green); }
    .speech { border: 3px solid var(--line); border-radius: 22px; background: #fffefa; padding: 10px 12px; font-weight: 800; text-align: center; max-width: 210px; }
    .shared-board { border: 5px solid #1d4d86; border-radius: 18px; background: #dff1ff; padding: 14px; box-shadow: inset 0 0 0 4px rgba(255,255,255,.7), 0 7px 0 rgba(30,27,22,.16); }
    .board-title { background: var(--blue); color: #fff; border: 3px solid var(--line); border-radius: 10px; padding: 8px 14px; width: max-content; max-width: 100%; margin: -34px auto 14px; font-size: 26px; font-weight: 900; box-shadow: 0 4px 0 rgba(30,27,22,.18); }
    .board-lane { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 10px; }
    .board-card { border: 3px solid var(--line); border-radius: 10px; background: #fffaf0; min-height: 126px; padding: 10px 6px; display: grid; place-items: center; text-align: center; font-weight: 900; }
    .board-card .icon { font-size: 34px; line-height: 1; }
    .board-card small { display: block; min-width: 52px; height: 7px; border-radius: 999px; background: var(--orange); margin-top: 6px; }
    .board-card:nth-child(2) small { background: var(--blue); }
    .board-card:nth-child(3) small { background: var(--green); }
    .board-card:nth-child(4) small { background: var(--purple); }
    .board-card:nth-child(5) small { background: var(--red); }
    .journey { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .journey-step { border: 1px solid #dce7df; border-radius: 8px; padding: 12px; background: #fff; min-height: 156px; display: flex; flex-direction: column; gap: 8px; }
    .journey-step small { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 999px; background: #edf7f1; color: #155e3b; font-weight: 700; }
    .journey-step strong { display: block; margin-bottom: 6px; }
    .journey-step.done { border-color: #8bc8a9; background: #f2fbf6; }
    .tracking-map { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; margin: 14px 0; }
    .tracking-step { position: relative; border: 3px solid var(--line); border-radius: 10px; padding: 9px 8px; min-height: 92px; background: #fffdf4; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; text-align: center; font-weight: 850; box-shadow: 0 3px 0 rgba(30,27,22,.12); }
    .tracking-step-icon { width: 28px; height: 28px; border: 2px solid currentColor; border-radius: 50%; display: grid; place-items: center; font-weight: 950; background: rgba(255,255,255,.72); line-height: 1; }
    .tracking-step-title { display: block; }
    .tracking-step-status { display: block; color: var(--muted); font-size: 13px; line-height: 1.25; font-weight: 850; }
    .tracking-step.done { background: #eaf8ee; color: #155e3b; }
    .tracking-step.active { background: #e5f2ff; color: #164e63; }
    .tracking-step.blocked { background: #fff4f2; color: #8a2f1e; }
    .tracking-step.blocked .tracking-step-status { color: #8a2f1e; }
    .tracking-legend { display: flex; flex-wrap: wrap; gap: 8px; margin: -4px 0 14px; }
    .tracking-legend-item { display: inline-flex; align-items: center; gap: 5px; border: 2px solid rgba(34,31,26,.22); border-radius: 999px; background: #fffdf4; padding: 4px 9px; font-size: 13px; font-weight: 900; color: var(--muted); }
    .tracking-legend-item span { width: 18px; height: 18px; display: grid; place-items: center; border: 2px solid currentColor; border-radius: 50%; line-height: 1; }
    .tracking-legend-item.done { color: #155e3b; }
    .tracking-legend-item.active { color: #164e63; }
    .tracking-legend-item.blocked { color: #8a2f1e; }
    .chain-list { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .chain-card { border: 3px solid var(--line); border-radius: 10px; padding: 12px; background: #fffefa; min-height: 120px; display: flex; flex-direction: column; gap: 6px; }
    .chain-card.active { background: #e5f2ff; }
    .chain-card strong, .chain-card span, .chain-card small { display: block; }
    .chain-card small { color: var(--muted); }
    .tracking-summary { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .status-chip { border: 3px solid var(--line); border-radius: 10px; padding: 10px; background: #fffdf4; }
    .status-chip strong { display: block; color: #164e63; margin-bottom: 4px; }
    .scenario-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .scenario { border: 1px solid #dce7df; background: #fff; color: var(--ink); text-align: left; border-radius: 8px; padding: 12px; min-height: 116px; }
    .scenario strong { display: block; margin-bottom: 6px; }
    .scenario span { display: block; color: var(--muted); font-size: 14px; }
    .context-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .context-card { border: 1px solid #cfe1ec; border-radius: 8px; padding: 12px; background: #fff; }
    .context-card strong { display: block; margin-bottom: 5px; color: #164e63; }
    .context-card span { display: block; color: var(--ink); }
    code { background: #eef4f8; border: 1px solid #d7e2ea; border-radius: 4px; padding: 1px 4px; }
    .span-7 { grid-column: span 7; }
    .span-5 { grid-column: span 5; }
    .span-12 { grid-column: span 12; }
    .note { background: var(--soft); border-color: #cdd6e2; }
    .warn { border-color: #d9a441; background: #fff8e8; color: #5f3a00; }
    .danger { border-color: #d98a82; background: #fff4f2; color: var(--danger); }
    .muted { color: var(--muted); }
    .pill { display: inline-flex; align-items: center; padding: 4px 9px; border: 2px solid var(--line); border-radius: 999px; font-size: 13px; color: var(--muted); background: #fffefa; }
    ul { padding-left: 20px; margin: 8px 0 0; }
    li { margin: 6px 0; }
    .peers li { display: flex; justify-content: space-between; gap: 12px; border-bottom: 1px solid #eef1f5; padding-bottom: 6px; }
    textarea, pre { width: 100%; min-height: 180px; resize: vertical; border: 3px solid var(--line); border-radius: 10px; padding: 12px; background: #fffefa; color: var(--ink); font: 15px/1.5 "Segoe UI", "Noto Sans TC", Arial, sans-serif; overflow: auto; }
    select { border: 1px solid var(--line); border-radius: 6px; padding: 9px 10px; font: inherit; background: #fff; color: var(--ink); max-width: 100%; }
    button { border: 3px solid var(--line); background: var(--blue); color: #fff; border-radius: 10px; padding: 8px 12px; font: inherit; font-weight: 800; cursor: pointer; box-shadow: 0 3px 0 rgba(30,27,22,.16); }
    button:disabled { border-color: #c7d2df; background: #e2e8f0; color: #64748b; cursor: not-allowed; }
    button.secondary { background: #fffefa; color: var(--blue); }
    .toolbar { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
    .handoff-ai-panel { margin-top: 14px; border: 2px solid rgba(35,104,179,.28); border-radius: 12px; padding: 12px; background: #f4fbff; }
    .handoff-ai-panel h3 { margin-top: 0; }
    .handoff-ai-panel button { margin-top: 8px; width: 100%; }
    .reply-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }
    .reply-button { min-height: 86px; text-align: left; background: #fffefa; color: var(--ink); }
    .reply-button strong { display: block; font-size: 17px; margin-bottom: 3px; }
    .reply-button span { display: block; color: var(--muted); font-size: 13px; font-weight: 650; }
    .reply-button.ok { background: #eaf8ee; }
    .reply-button.warn { background: #fff0c9; }
    .reply-button.danger { background: #fff4f2; }
    .core-steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .step { border: 1px solid #dce7df; border-radius: 8px; padding: 12px; background: #fff; }
    .step strong { display: block; margin-bottom: 4px; }
    .compact-status { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: auto; }
    .advanced-panel { margin-top: 14px; border-top: 1px solid #dce7df; padding-top: 10px; }
    .messages { display: grid; gap: 8px; margin-top: 10px; }
    .message { border: 1px solid var(--line); border-radius: 8px; padding: 10px; background: #fbfcfe; }
    .message strong { display: block; margin-bottom: 4px; }
    .terminal { border: 3px solid var(--line); background: #fffefa; padding: 12px; border-radius: 10px; font-weight: 850; }
    .terminal-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .terminal-action { border: 2px solid rgba(34,31,26,.22); border-radius: 10px; background: #fffdf4; padding: 10px; }
    .terminal-action strong { display: block; color: #164e63; margin-bottom: 5px; }
    .terminal-action span { display: block; color: var(--muted); font-size: 14px; }
    .decision { border-color: #b7d7ea; background: #f4fbff; }
    .live { border-color: #a7d7bd; background: #f2fbf6; }
    .live-status { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-top: 10px; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; background: #9aa6b2; }
    .status-dot.online { background: var(--ok); }
    .status-dot.warn { background: #d9a441; }
    .status-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: var(--muted); font-size: 14px; margin: 10px 0 0; }
    .section-head { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: space-between; }
    .event-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
    .event-box { border: 1px solid #dce7df; border-radius: 8px; padding: 10px; background: #fff; min-height: 130px; }
    .event-box h3 { margin: 0 0 8px; font-size: 15px; }
    .event-box pre { min-height: 88px; margin: 0; }
    .status-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .status-table th, .status-table td { border-bottom: 1px solid #e7edf4; padding: 9px 6px; text-align: left; vertical-align: top; }
    .status-table th { width: 160px; color: var(--muted); font-weight: 650; }
    details { margin-top: 12px; }
    summary { cursor: pointer; color: var(--accent); font-weight: 650; }
    @media (max-width: 920px) { .scenario-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 1040px) { .topbar, .ticket-head { flex-direction: column; } .identity-pair { justify-content: flex-start; } .boundary-line { text-align: left; } .ticket-layout { grid-template-columns: 1fr; } .action-panel { border-left: 0; border-top: 3px dashed rgba(34,31,26,.26); padding-left: 0; padding-top: 16px; } .scene { grid-template-columns: 1fr; } .actor { min-height: auto; flex-direction: row; justify-content: flex-start; } .board-title { margin-top: 0; } }
    @media (max-width: 920px) { .tracking-map, .data-board .tracking-map { grid-template-columns: repeat(3, minmax(0, 1fr)); } .chain-list, .tracking-summary, .data-row, .data-lists, .reply-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .board-lane { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 920px) { .terminal-actions { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    @media (max-width: 760px) { main { width: min(100% - 20px, 1080px); padding-top: 18px; } .span-7, .span-5 { grid-column: span 12; } .peers li { display: block; } .event-row, .detail-row, .event-grid, .core-steps, .journey, .scenario-grid, .context-grid, .tracking-map, .stage-guide-row, .chain-list, .tracking-summary, .board-lane, .terminal-actions { grid-template-columns: 1fr; } .actor { align-items: flex-start; } }
  </style>
</head>
<body>
  <main>
    <div class="topbar">
      <div>
        <span class="pill">${demo ? '本機示範' : '本機 APS Live 頁'}</span>
        <h1>APS Live 交接追蹤</h1>
        <p class="muted">📁 專案：<strong>${htmlEscape(snapshot.project)}</strong></p>
      </div>
      <div class="identity-pair" aria-label="參與者">
        <span class="agent-pill"><span class="agent-dot"></span>${htmlEscape(snapshot.agent_id)}</span>
        <span class="muted">×</span>
        <span class="agent-pill"><span class="agent-dot blue"></span>${htmlEscape(targetPeerText)}</span>
        <span class="boundary-line">${htmlEscape(participantBoundaryText)}</span>
      </div>
    </div>

    <section class="ticket-card" aria-label="交接單">
      <div class="ticket-head">
        <div>
          <p class="muted">${htmlEscape(ticketOrdinalText)} · 目前只顯示主要交接單</p>
          <h2 class="ticket-title"><mark>${htmlEscape(snapshot.current_case_title)}</mark></h2>
        </div>
        <div class="stamp">${htmlEscape(snapshot.current_station)}</div>
      </div>
      <div class="tracking-map" aria-label="交接進度">
${trackingStepsHtml}
      </div>
      <div class="tracking-legend" aria-label="交接進度狀態說明">
${trackingLegendHtml}
      </div>
      <div class="ticket-layout">
        <div class="ticket-details">
          <div class="detail-row"><strong>任務</strong><span>${htmlEscape(taskText)}</span></div>
          <div class="detail-row"><strong>真源</strong><span>${htmlEscape(evidenceText)}</span></div>
          <div class="detail-row"><strong>開工條件</strong><span>${htmlEscape(startConditionText)}</span></div>
        </div>
        <div class="action-panel">
          <button id="connectLive" class="secondary" type="button">連接 APS Live</button>
          <button id="refreshFormalState" class="secondary" type="button">重新讀取正式狀態</button>
          <div class="compact-status">
            <span><span id="liveDot" class="status-dot"></span> <strong id="liveState">⏳ 未連接</strong></span>
          </div>
          <div id="onlinePeers" class="status-row">目前在線：等待對方進入</div>
          <p class="hint">頁面打開後會自動連接；完成協商後再把內容交給本機 AI 草擬正式下一步。頁面資料來自生成時的 APS 快照，如對方剛確認或 Drive 剛同步，請重新讀取正式狀態。</p>
        </div>
      </div>
    </section>

    <section class="event-log" aria-label="交接事件紀錄">
      <h2>交接事件紀錄</h2>
      <div class="event-preview" aria-label="最近交接事件">
${eventPreviewHtml}
      </div>
      <details class="event-history">
        <summary>展開完整交接事件紀錄（${eventRows.length} 條）</summary>
${eventRowsHtml}
      </details>
      <details class="stage-guide">
        <summary>目前階段與正式操作</summary>
        <div class="stage-guide-row">
          <strong>階段</strong>
          <span>目前狀態</span>
          <span>正式操作位置</span>
          <span>下一句可對 AI 說</span>
        </div>
${stageGuideRowsHtml}
      </details>
    </section>

    <div class="grid">
      <section class="span-12">
        <div class="section-head">
          <h2>協調與回應</h2>
          <span class="muted">本次 Live session</span>
        </div>
        <h3>接收方快速回應</h3>
        <p class="muted">${htmlEscape(targetPeerText)} 可先用一個狀態回覆，讓雙方 AI 立即知道交接單是否可以繼續推進；其他在線成員只作協調。</p>
        <div class="reply-grid" aria-label="接收方快速回應">
          <button class="reply-button ok" data-live-reply="received" type="button" disabled><strong>✅ 已收到</strong><span>我看到同一張交接單，可以進入開工判斷。</span></button>
          <button class="reply-button warn" data-live-reply="need-info" type="button" disabled><strong>⚠️ 需補資料</strong><span>來源、版本、範圍或驗收標準不足。</span></button>
          <button class="reply-button danger" data-live-reply="disagree" type="button" disabled><strong>❌ 不同意</strong><span>共同目標、角色或分工需要先修正。</span></button>
        </div>
        <p class="muted">這是給對方看的訊息草稿，可以直接發，也可以先修改。</p>
        <textarea id="projectMessage" placeholder="${htmlEscape(messagePlaceholder)}">${htmlEscape(snapshot.suggested_message || '')}</textarea>
        <div class="toolbar">
          <button id="sendProjectMessageInline" type="button" disabled>等待對方進入後才能發送核對訊息</button>
          <button id="clearMessages" class="secondary" type="button">清空紀錄</button>
        </div>
        <div id="discussionStatus" class="status-row">⏳ 本次 session 尚未發送核對訊息。發出或收到回覆後，訊息會顯示在下面。</div>
        <div id="messages" class="messages" aria-live="polite"></div>
        <div class="handoff-ai-panel">
          <h3>完成協商後交給本機 AI</h3>
          <p class="muted">有對方回覆、補資料、不同意或同步狀態後，才使用這一步；它只草擬下一步，不會直接寫入 APS 正式紀錄。</p>
          <label class="mode-picker">
            <span>AI 整理方式</span>
            <select id="agentTaskMode" aria-label="本機 AI 跟進方式">
              <option value="整理共識 / 分歧 / 待決定事項">整理共識 / 分歧 / 待決定事項</option>
              <option value="產生補資料請求">產生補資料請求</option>
              <option value="草擬退回理由">草擬退回理由</option>
              <option value="判斷可否開工">判斷可否開工</option>
            </select>
          </label>
          <button id="forwardToAgentAfterDiscussion" type="button">交給本機 AI 草擬下一步</button>
        </div>
      </section>
      <section class="span-12">
        <h2>回到本機 AI 對話繼續 APS 流程</h2>
        <p class="terminal" id="terminalLine">${htmlEscape(snapshot.proposed_terminal_action)}</p>
        <h3>Terminal 可做的正式選項</h3>
        <p class="muted">以下句子只用來請本機 AI 草擬正式動作；正式寫入、退回、修訂或 close 前仍要使用者確認。</p>
        <div class="terminal-actions" aria-label="Terminal 可做的正式選項">
${terminalActionsHtml}
        </div>
      </section>
    </div>
  </main>
  <script type="module">
    const snapshot = ${safeSnapshotJson};
    const bridge = ${safeBridgeJson};
    const roomId = ${JSON.stringify(roomId)};
    const refreshFormalPrompt = ${JSON.stringify(refreshFormalPrompt)};
    const liveAppId = 'agent-public-squares-live';
    let room = null;
    let connectingLive = false;
    let sendStatus = null;
    let sendProjectMessageAction = null;
    let sendFeedback = null;
    let sendConsensus = null;
    let receiveStatus = null;
    let receiveProjectMessage = null;
    let receiveFeedback = null;
    let receiveConsensus = null;
    const connectedPeers = new Set();
    const peerAgents = new Map();
    const receivedLiveMessageIds = new Set();
    const messageHistory = [];
    let lastPeerJoinAt = 0;
    const channel = 'BroadcastChannel' in window ? new BroadcastChannel('aps-live-local-preview:' + roomId) : null;
    const messages = document.getElementById('messages');
    const liveDot = document.getElementById('liveDot');
    const liveState = document.getElementById('liveState');
    const connectLiveButton = document.getElementById('connectLive');
    const discussionStatus = document.getElementById('discussionStatus');
    const sendProjectMessageButton = document.getElementById('sendProjectMessageInline');
    const quickReplyButtons = Array.from(document.querySelectorAll('[data-live-reply]'));
    const onlinePeers = document.getElementById('onlinePeers');
    const latestProjectMessage = document.getElementById('latestProjectMessage');
    const latestFeedback = document.getElementById('latestFeedback');
    const latestConsensus = document.getElementById('latestConsensus');
    function markJourney(id) {
      const node = document.getElementById(id);
      if (node) node.classList.add('done');
    }
    function setLiveState(label, mode = '') {
      liveState.textContent = label;
      liveDot.className = 'status-dot ' + mode;
    }
    function setDiscussionStatus(label) {
      if (discussionStatus) discussionStatus.textContent = label;
    }
    const storageKey = 'aps-live-session-v1:' + roomId + ':' + snapshot.agent_id;
    function remotePeerCount() {
      return Array.from(peerAgents.values()).filter(peer => peer && peer.agent_id && peer.agent_id !== snapshot.agent_id).length;
    }
    function canSendProjectMessage() {
      return Boolean(sendProjectMessageAction && remotePeerCount() > 0);
    }
    function updateSendButtonState() {
      if (!sendProjectMessageButton) return;
      const canSend = canSendProjectMessage();
      sendProjectMessageButton.disabled = !canSend;
      sendProjectMessageButton.textContent = canSend ? '發送核對訊息' : (sendProjectMessageAction ? '等待對方進入後才能發送核對訊息' : '未連接，請先用上方按鈕連接');
      for (const button of quickReplyButtons) {
        button.disabled = !canSend;
      }
    }
    function persistMessages() {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(messageHistory.slice(-100)));
      } catch (error) { /* current browser session history is best-effort */ }
    }
    function renderMessage(source, data) {
      const node = document.createElement('div');
      node.className = 'message';
      const title = document.createElement('strong');
      title.textContent = source;
      const body = document.createElement('p');
      body.textContent = readableMessage(source, data);
      node.append(title, body);
      messages.prepend(node);
    }
    function restoreMessages() {
      try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || '[]');
        if (!Array.isArray(saved) || saved.length === 0) return;
        for (const item of saved) {
          if (!item || !item.source) continue;
          messageHistory.push({ source: item.source, data: item.data, recorded_at: item.recorded_at });
          renderMessage(item.source, item.data);
        }
        setDiscussionStatus('💬 已載入本次頁面 session 記錄。可繼續討論，或交給本機 AI 整理。');
      } catch (error) { /* invalid session cache should not block the page */ }
    }
    function updateOnlinePeers() {
      if (!onlinePeers) return;
      const rows = ['我: ' + snapshot.agent_id];
      for (const [peerId, peer] of peerAgents.entries()) {
        if (!peer || !peer.agent_id) {
          rows.push('未識別身份的視窗 (' + peerId + ')');
        } else if (peer.agent_id === snapshot.agent_id) {
          rows.push('同一身份另一視窗: ' + peer.agent_id);
        } else {
          rows.push('協作者: ' + peer.agent_id);
        }
      }
      onlinePeers.textContent = rows.length > 1 ? '目前在線：' + rows.join('；') : '目前在線：等待對方進入';
    }
    function readableMessage(source, data) {
      if (!data) return source;
      if (data.text) return data.text;
      if (data.next_step) return data.next_step;
      if (data.reply_label) return data.reply_label + '：' + (data.reply_detail || data.next_action || '');
      if (data.fallback) return data.fallback;
      if (data.blocker) return data.blocker;
      if (data.error) return data.error;
      if (data.peerId) return data.peerId;
      if (data.task_mode) return data.task_mode;
      return source;
    }
    function addMessage(source, data) {
      messageHistory.push({ source, data, recorded_at: new Date().toISOString() });
      persistMessages();
      renderMessage(source, data);
      updateLiveCommentEvent(source, data);
    }
    function updateLiveCommentEvent(source, data) {
      const recordedAt = data && data.sent_at ? data.sent_at : new Date().toISOString();
      const label = new Date(recordedAt).toISOString().replace('T', ' ').slice(0, 16);
      for (const suffix of ['Preview', 'Full']) {
        const time = document.getElementById('livecommentTime' + suffix);
        const icon = document.getElementById('livecommentIcon' + suffix);
        if (time) time.textContent = label;
        if (icon) icon.textContent = data && (data.reply === 'disagree' || data.reply_label === '不同意') ? '!' : '✓';
      }
    }
    function projectMessagePayload() {
      const text = document.getElementById('projectMessage').value.trim();
      return {
        kind: 'project-message',
        message_id: 'aps-live-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        project: snapshot.project,
        agent_id: snapshot.agent_id,
        text,
        current_case_title: snapshot.current_case_title,
        current_question: snapshot.current_question,
        related_shared_goal: snapshot.seen_shared_goal,
        related_packet: snapshot.seen_packet,
        proposed_terminal_action: snapshot.proposed_terminal_action,
        sent_at: new Date().toISOString(),
      };
    }
    function liveReplyPayload(reply) {
      const replyMap = {
        received: {
          reply_label: '已收到',
          reply_detail: '我看到同一張交接單，可以進入開工判斷。',
          next_action: '請本機 AI 判斷是否可開工，並在需要時整理正式 ack 或補資料要求。',
          task_mode: '判斷可否開工',
        },
        'need-info': {
          reply_label: '需補資料',
          reply_detail: '來源、版本、範圍或驗收標準不足，暫時不適合開工。',
          next_action: '請本機 AI 整理缺口，生成補資料追問或退回理由草稿。',
          task_mode: '產生補資料請求',
        },
        disagree: {
          reply_label: '不同意',
          reply_detail: '共同目標、角色或分工需要先修正，暫時不應推進普通交接。',
          next_action: '請本機 AI 整理分歧，生成共同目標與分工修訂草稿。',
          task_mode: '整理共識 / 分歧 / 待決定事項',
        },
      };
      const selected = replyMap[reply] || replyMap['need-info'];
      return {
        kind: 'handoff-reply',
        message_id: 'aps-live-reply-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        project: snapshot.project,
        agent_id: snapshot.agent_id,
        reply,
        ...selected,
        current_case_title: snapshot.current_case_title,
        current_question: snapshot.current_question,
        related_shared_goal: snapshot.seen_shared_goal,
        related_packet: snapshot.seen_packet,
        sent_at: new Date().toISOString(),
      };
    }
    function selectedAgentTaskMode() {
      const node = document.getElementById('agentTaskMode');
      return node ? node.value : '整理共識 / 分歧 / 待決定事項';
    }
    function buildAgentForwardPrompt(taskMode = selectedAgentTaskMode()) {
      const recentMessages = messageHistory.slice(-12);
      const contextText = (snapshot.context_cards || [])
        .map(card => '- ' + card.label + ': ' + card.value)
        .join('\\n') || '- 未見已帶入資料';
      const evidenceText = (snapshot.evidence_labels || []).length
        ? (snapshot.evidence_labels || []).map(item => '- ' + item).join('\\n')
        : '- 目前未指定正式交接，只作交接狀態核對';
      const messageText = recentMessages.length
        ? recentMessages.map((item, index) => {
          const text = readableMessage(item.source, item.data);
          return (index + 1) + '. ' + item.source + ': ' + text;
        }).join('\\n')
        : '- 尚未有 Live 訊息；請按目前事件和問題先整理下一步。';
      return [
        '請用 APS 跟進以下 APS Live 交接追蹤協調內容。',
        '',
        '今次我想本機 AI 做的事：',
        taskMode,
        '',
        '今次 APS Live 已帶入的交接貨單：',
        snapshot.current_case_title || snapshot.live_focus,
        '',
        '目前要問清楚的問題：',
        snapshot.current_question || snapshot.pending_decision,
        '',
        '目前追蹤狀態：',
        '- 目前站點: ' + (snapshot.current_station || '未確認'),
        '- 能否開工: ' + (snapshot.can_start_label || '未確認'),
        '- 等誰行動: ' + (snapshot.waiting_for || '未確認'),
        '- 下一個正式動作: ' + (snapshot.next_formal_action || snapshot.proposed_terminal_action || '未確認'),
        '',
        '本機 AI 已知的項目背景：',
        contextText,
        '',
        '依據摘要：',
        evidenceText,
        '',
        '請先整理，不要直接套用：',
        '1. 先整理共識、分歧、待決定事項和風險。',
        '2. 判斷哪些內容只是 Live 討論，不應直接當成正式 APS 紀錄。',
        '3. 若需要正式 APS 動作，先生成草稿、影響和風險，等我確認後才寫入 Drive。',
        '',
        '最近 APS Live 核對訊息：',
        messageText,
      ].join('\\n');
    }
    function livePayload(kind) {
      return {
        kind,
        project: snapshot.project,
        agent_id: snapshot.agent_id,
        live_focus: snapshot.live_focus,
        current_station: snapshot.current_station,
        can_start_label: snapshot.can_start_label,
        waiting_for: snapshot.waiting_for,
        next_formal_action: snapshot.next_formal_action,
        seen_shared_goal: snapshot.seen_shared_goal,
        seen_packet: snapshot.seen_packet,
        seen_ack: snapshot.seen_ack,
        feedback_status: snapshot.feedback_status,
        pending_decision: snapshot.pending_decision,
        current_case_title: snapshot.current_case_title,
        current_question: snapshot.current_question,
        proposed_terminal_action: snapshot.proposed_terminal_action,
        sent_at: new Date().toISOString(),
      };
    }
    function actionSender(action) {
      if (Array.isArray(action)) return action[0];
      return action && action.send;
    }
    function bindActionMessage(action, handler) {
      if (Array.isArray(action)) {
        action[1]((data, peerId, details) => {
          if (data && data.message_id) {
            if (receivedLiveMessageIds.has(data.message_id)) return;
            receivedLiveMessageIds.add(data.message_id);
          }
          handler(data, peerId, details);
        });
        return;
      }
      action.onMessage = (data, details = {}) => {
        if (data && data.message_id) {
          if (receivedLiveMessageIds.has(data.message_id)) return;
          receivedLiveMessageIds.add(data.message_id);
        }
        handler(data, details.peerId || 'unknown', details);
      };
    }
    function bindPeerEvent(roomHandle, eventName, handler) {
      if (!roomHandle) return;
      if (typeof roomHandle[eventName] === 'function') {
        roomHandle[eventName](handler);
        return;
      }
      roomHandle[eventName] = handler;
    }
    async function sendProjectMessageWithWarmupRetry(payload) {
      if (!sendProjectMessageAction) return;
      await sendProjectMessageAction(payload);
      for (const delayMs of [3000, 7000, 12000]) {
        window.setTimeout(() => {
          sendProjectMessageAction({ ...payload, retry_after_warmup: true }).catch(error => {
            addMessage('訊息補送未完成', { fallback: '對方可能未即時收到。請稍後再按一次發送，或回到本機 AI 對話整理下一步。' });
          });
        }, delayMs);
      }
    }
    function targetPeer(peerId) {
      return peerId ? { target: peerId } : undefined;
    }
    function recordPeerStatus(peerId, data) {
      const remoteAgentId = data && data.agent_id ? String(data.agent_id) : '';
      if (!peerId || !remoteAgentId) return;
      peerAgents.set(peerId, { agent_id: remoteAgentId, updated_at: new Date().toISOString() });
      updateOnlinePeers();
      if (remoteAgentId === snapshot.agent_id) {
        setDiscussionStatus('⚠️ 偵測到同一 APS 身份的另一個視窗。這不是協作者，不能當成 ' + (snapshot.target_peer || '對方') + '。');
        addMessage('⚠️ 同一身份另一視窗', { text: remoteAgentId + ' 的另一個視窗已連上；這不代表協作者已進入。' });
      } else {
        setDiscussionStatus('✅ ' + remoteAgentId + ' 已連接。可以發送核對訊息。');
        addMessage('✅ 協作者已確認身份', { text: remoteAgentId + ' 已連接 APS Live，可以開始核對交接狀態。' });
      }
      updateSendButtonState();
    }
    async function connectLive() {
      if (room || connectingLive) return;
      connectingLive = true;
      if (connectLiveButton) {
        connectLiveButton.disabled = true;
        connectLiveButton.textContent = '正在連接 APS Live';
      }
      setLiveState('⏳ 正在連接 APS Live', 'warn');
      try {
        const { joinRoom, selfId } = await import('https://esm.run/trystero');
        room = joinRoom({ appId: liveAppId }, roomId);
        const statusAction = room.makeAction('aps-status');
        const projectMessageAction = room.makeAction('aps-message');
        const feedbackAction = room.makeAction('aps-feedback');
        const consensusAction = room.makeAction('aps-consensus');
        sendStatus = actionSender(statusAction);
        sendProjectMessageAction = actionSender(projectMessageAction);
        sendFeedback = actionSender(feedbackAction);
        sendConsensus = actionSender(consensusAction);
        connectedPeers.add('我: ' + snapshot.agent_id + ' (' + selfId + ')');
        updateOnlinePeers();
        markJourney('journeyConnect');
        bindPeerEvent(room, 'onPeerJoin', async peerId => {
          connectedPeers.add(peerId);
          peerAgents.set(peerId, { agent_id: null, updated_at: new Date().toISOString() });
          lastPeerJoinAt = Date.now();
          updateOnlinePeers();
          addMessage('⏳ 偵測到新連線', { text: '已見到另一個視窗進入，正在確認對方 APS 身份。' });
          setDiscussionStatus('⏳ 已見到另一個視窗，正在確認是否真的是協作者。');
          updateSendButtonState();
          if (sendStatus) {
            await sendStatus(livePayload('status'), peerId);
            await sendStatus(livePayload('status'));
          }
        });
        bindPeerEvent(room, 'onPeerLeave', peerId => {
          connectedPeers.delete(peerId);
          peerAgents.delete(peerId);
          updateOnlinePeers();
          addMessage('⚠️ 協作者離開', { text: '對方暫時離開 APS Live；你仍可先整理訊息。' });
          setDiscussionStatus('⚠️ 對方暫時離開。可先整理訊息，稍後再確認。');
          updateSendButtonState();
        });
        bindActionMessage(statusAction, (data, peerId) => {
          recordPeerStatus(peerId, data);
          addMessage('✅ 收到 APS 狀態 ' + peerId, data);
        });
        bindActionMessage(projectMessageAction, (data, peerId) => {
          if (latestProjectMessage) latestProjectMessage.textContent = data && data.text ? data.text : '收到核對訊息';
          addMessage('💬 收到核對訊息 ' + peerId, data);
          updateSendButtonState();
          setDiscussionStatus('💬 已收到對方訊息。可以回覆，或交給本機 AI 整理。');
        });
        bindActionMessage(feedbackAction, (data, peerId) => {
          if (latestFeedback) latestFeedback.textContent = data && data.pending_decision ? data.pending_decision : '收到回覆';
          addMessage('💬 收到回覆 ' + peerId, data);
        });
        bindActionMessage(consensusAction, (data, peerId) => {
          if (latestConsensus) latestConsensus.textContent = data && data.proposed_terminal_action ? data.proposed_terminal_action : '收到整理內容';
          addMessage('🤖 收到整理內容 ' + peerId, data);
        });
        setLiveState('✅ 已連接 APS Live', 'online');
        setDiscussionStatus('✅ 已連接 APS Live，正在等待對方進入。');
        if (connectLiveButton) connectLiveButton.textContent = '已連接 APS Live';
        updateSendButtonState();
        markJourney('journeyConnect');
        await sendStatus(livePayload('status'));
      } catch (error) {
        setLiveState('⚠️ 暫時未連上對方', 'warn');
        setDiscussionStatus('⚠️ 暫時未連上對方。可先保留草稿，連接後再發送。');
        if (connectLiveButton) {
          connectLiveButton.disabled = false;
          connectLiveButton.textContent = '重新連接 APS Live';
        }
        updateSendButtonState();
        addMessage('⚠️ Live 連接未完成', { fallback: '暫時未連上對方。你仍可先寫好訊息，或回到本機 AI 對話請它整理下一步。' });
      } finally {
        connectingLive = false;
      }
    }
    async function requestFormalRefresh() {
      try {
        await navigator.clipboard.writeText(refreshFormalPrompt);
        setDiscussionStatus('🔎 已複製重新讀取正式狀態的句子。請回到本機 AI 對話貼上，讓它重新 Check APS 並刷新這頁。');
        addMessage('🔎 重新讀取正式狀態', { next_step: refreshFormalPrompt });
      } catch (error) {
        setDiscussionStatus('🔎 請回到本機 AI 對話說：「' + refreshFormalPrompt + '」');
        addMessage('🔎 重新讀取正式狀態', { next_step: refreshFormalPrompt });
      }
    }
    function autoConnectLive() {
      window.setTimeout(() => {
        if (!room && !connectingLive) connectLive();
      }, 250);
    }
    async function sendProjectMessage() {
      const payload = projectMessagePayload();
      if (!payload.text) {
        setDiscussionStatus('⚠️ 請先輸入要發送的核對訊息。');
        addMessage('⚠️ 本機提示', { blocker: '請先輸入要發送的核對訊息。' });
        return;
      }
      if (!canSendProjectMessage()) {
        setDiscussionStatus(sendProjectMessageAction
          ? '⚠️ 對方尚未進入 APS Live。請等對方進入後再發送。'
          : '⚠️ 請先連接 APS Live，並等待對方進入後再發送。');
        return;
      }
      if (sendProjectMessageAction) await sendProjectMessageWithWarmupRetry(payload);
      if (latestProjectMessage) latestProjectMessage.textContent = payload.text;
      markJourney('journeyDiscuss');
      setDiscussionStatus('✅ 已發送。等待對方回覆；回覆會顯示在下面。');
      addMessage('✅ 已發送核對訊息', payload);
    }
    async function sendLiveReply(reply) {
      const payload = liveReplyPayload(reply);
      if (!canSendProjectMessage()) {
        setDiscussionStatus(sendFeedback
          ? '⚠️ 對方尚未進入 APS Live。請等對方進入後再回應。'
          : '⚠️ 請先連接 APS Live，並等待對方進入後再回應。');
        return;
      }
      if (sendFeedback) await sendFeedback(payload);
      const agentMode = document.getElementById('agentTaskMode');
      if (agentMode && payload.task_mode) agentMode.value = payload.task_mode;
      markJourney('journeyDiscuss');
      setDiscussionStatus('✅ 已送出「' + payload.reply_label + '」。可交給本機 AI 整理正式下一步。');
      addMessage('✅ 已送出快速回應', payload);
    }
    function buildAgentQueuePayload() {
      const taskMode = selectedAgentTaskMode();
      return {
        kind: 'aps-live-agent-queue',
        task_mode: taskMode,
        message_id: 'aps-live-agent-queue-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        project: snapshot.project,
        agent_id: snapshot.agent_id,
        prompt: buildAgentForwardPrompt(taskMode),
        snapshot,
        recent_messages: messageHistory.slice(-24),
        created_at: new Date().toISOString(),
      };
    }
    async function forwardToAgent() {
      const payload = buildAgentQueuePayload();
      if (!bridge || !bridge.enabled || !bridge.url || !bridge.token) {
        await navigator.clipboard.writeText(payload.prompt);
        addMessage('⚠️ 本機 AI 佇列未連接', {
          fallback: '未能直接交給本機 AI；我已把整理內容複製到剪貼簿。請回到你的 AI 工具貼上，讓它整理下一步。',
          task_mode: payload.task_mode,
        });
        markJourney('journeyReturn');
        return;
      }
      try {
        const response = await fetch(bridge.url + '/queue', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: bridge.token, payload }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || 'queue request failed');
        addMessage('✅ 已交給本機 AI 整理下一步', {
          queued: true,
          task_mode: payload.task_mode,
          next_step: '回到你的 AI 工具說「Check APS」，AI 會看到 APS Live 待處理內容。',
        });
        setDiscussionStatus('🤖 已交給本機 AI。回到 AI 工具說「Check APS」。');
        markJourney('journeyReturn');
      } catch (error) {
        await navigator.clipboard.writeText(payload.prompt);
        addMessage('⚠️ 本機 AI 佇列未連接', {
          fallback: '未能直接交給本機 AI；我已把整理內容複製到剪貼簿。請回到你的 AI 工具貼上，讓它整理下一步。',
          task_mode: payload.task_mode,
        });
        setDiscussionStatus('⚠️ 未能直接交給本機 AI；已複製整理內容，可貼回 AI 工具。');
        markJourney('journeyReturn');
      }
    }
    function sendSnapshot() {
      const data = { ...snapshot, sent_at: new Date().toISOString(), transport: 'local-browser-preview' };
      addMessage('本頁送出', data);
      if (channel) channel.postMessage(data);
    }
    if (channel) {
      channel.onmessage = (event) => addMessage('收到同機頁面訊息', event.data);
    } else {
      addMessage('⚠️ 本機提示', { blocker: '這個瀏覽器不支援本機頁面互傳；仍可複製狀態摘要回本機 AI 使用。' });
    }
    function bindClick(id, handler) {
      const node = document.getElementById(id);
      if (node) node.addEventListener('click', handler);
    }
    bindClick('connectLive', connectLive);
    bindClick('refreshFormalState', requestFormalRefresh);
    bindClick('sendProjectMessage', sendProjectMessage);
    bindClick('sendProjectMessageInline', sendProjectMessage);
    for (const button of quickReplyButtons) {
      button.addEventListener('click', () => sendLiveReply(button.getAttribute('data-live-reply')));
    }
    bindClick('forwardToAgent', forwardToAgent);
    bindClick('forwardToAgentAfterDiscussion', forwardToAgent);
    document.getElementById('clearMessages').addEventListener('click', () => {
      messages.textContent = '';
      messageHistory.length = 0;
      try { sessionStorage.removeItem(storageKey); } catch (error) { /* session cache clear is best-effort */ }
      setDiscussionStatus('⏳ 本次 session 記錄已清空。可繼續發送新的核對訊息。');
    });
    restoreMessages();
    updateSendButtonState();
    autoConnectLive();
  </script>
</body>
</html>
`;
}

function apsLiveHasClearBlocker(snapshot) {
  return snapshot
    && snapshot.seen_packet !== 'none'
    && !String(snapshot.blocker || '').startsWith('目前沒有明確交接卡點');
}

function writeApsLiveHtml({ hubRoot, projectSlug, agentId, config, demo = false, outputPath = null, dryRun = false, dashboard: providedDashboard = null, bridgePort = 47879 }) {
  const dashboard = providedDashboard || (demo
    ? buildCheckApsDemoDashboard()
    : buildDashboardData({ hubRoot, projectSlug, agentId, config: { ...config, agentId } }));
  const snapshot = buildApsLiveDiagnosticSnapshot(dashboard, { demo, project: projectSlug, agentId });
  const livePath = outputPath || path.join(contextDir(hubRoot, projectSlug), apsLiveFileNameForAgent(agentId));
  if (dryRun) {
    return { livePath, snapshot, dryRun: true };
  }
  const bridge = demo
    ? { enabled: false, url: null, token: null }
    : {
      enabled: true,
      url: `http://127.0.0.1:${bridgePort}`,
      token: readOrCreateApsLiveBridgeToken({ hubRoot, projectSlug }),
    };
  const html = renderApsLiveHtml({ dashboard, snapshot, demo, bridge });
  fs.mkdirSync(path.dirname(livePath), { recursive: true });
  fs.writeFileSync(livePath, html, 'utf8');
  return { livePath, snapshot };
}

function renderApsLiveQueueReport(items) {
  const lines = [
    '📥 APS Live 待本機 AI 整理',
  ];
  if (items.length === 0) {
    lines.push('- 目前沒有 APS Live 送入本機 AI 待處理佇列的內容。');
    return lines.join('\n');
  }
  lines.push(`- 共有 ${items.length} 件待整理內容。`);
  for (const item of items) {
    const payload = item.payload || {};
    const recentMessages = Array.isArray(payload.recent_messages) ? payload.recent_messages : [];
    lines.push('');
    lines.push(`## ${payload.task_mode || '請 AI 判斷下一步'}`);
    lines.push(`- 佇列時間: ${item.queued_at || '(未記錄)'}`);
    lines.push(`- 來源代理: ${payload.agent_id || payload.snapshot && payload.snapshot.agent_id || '(未記錄)'}`);
    lines.push(`- 訊息數量: ${recentMessages.length}`);
    lines.push('- AI 處理提示:');
    lines.push('```text');
    lines.push(payload.prompt || '(沒有 prompt)');
    lines.push('```');
  }
  return lines.join('\n');
}

function startApsLiveBridge({ hubRoot, projectSlug, port }) {
  const token = readApsLiveBridgeToken({ hubRoot, projectSlug });
  if (!token) {
    throw new Error('未見 APS Live bridge token。請先執行 `aps live` 生成 APS Live 頁。');
  }
  const server = http.createServer((req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS');
    res.setHeader('access-control-allow-headers', 'content-type');
    res.setHeader('content-type', 'application/json; charset=utf-8');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, project: projectSlug }));
      return;
    }
    if (req.method !== 'POST' || req.url !== '/queue') {
      res.writeHead(404);
      res.end(JSON.stringify({ ok: false, error: 'not found' }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString('utf8');
      if (body.length > 250000) {
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        const request = JSON.parse(body || '{}');
        if (request.token !== token) {
          res.writeHead(403);
          res.end(JSON.stringify({ ok: false, error: 'invalid token' }));
          return;
        }
        if (!request.payload || typeof request.payload !== 'object') {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: 'missing payload' }));
          return;
        }
        const { queuePath } = writeApsLiveQueueItem({ hubRoot, projectSlug, payload: request.payload });
        res.writeHead(200);
        res.end(JSON.stringify({
          ok: true,
          queued_path: queuePath,
          next_terminal_line: '請用 APS 讀取 APS Live 待處理佇列，先整理交接追蹤狀態、卡點、共識、分歧與待決定事項，判斷哪些需要寫回正式 APS 紀錄；如需要正式動作，先生成草稿和風險，等我確認。',
        }));
      } catch (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
  });
  server.listen(port, '127.0.0.1', () => {
    console.log('📡 APS Live 本機 AI 接收器');
    console.log(`✅ 已啟動: http://127.0.0.1:${port}`);
    console.log('🔎 Live 交接追蹤頁可一鍵交給本機 AI 整理下一步；此接收器只寫入本機待處理佇列，不寫 packet / outbox / ack。');
    console.log('🚀 用法: 保持此 terminal 開啟，再到 APS Live 交接追蹤頁按「交給本機 AI 整理下一步」。');
  });
  return server;
}

function packetStatus({ hubRoot, projectSlug, agentId, packetId }) {
  const { outboxPath, events, latest } = latestOwnPacketVersion({ hubRoot, projectSlug, agentId, packetId, allowClosed: true });
  const packetPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', `${packetId}__v${latest.version}`, 'packet.md');
  ensureExistingFile(packetPath, `packet ${packetId} v${latest.version}`);
  const header = parsePacketHeader(packetPath);
  const toId = header.to || latest.kv.to;
  const ackPath = toId ? path.join(projectDir(hubRoot, projectSlug), '_ack', `${toId}.ack.json`) : null;
  const ack = ackPath && fs.existsSync(ackPath) ? readJson(ackPath) : { consumed: [], declined: [] };
  const consumed = (ack.consumed || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(latest.version));
  const declined = (ack.declined || []).find((entry) => entry.packet_id === packetId && Number(entry.version) === Number(latest.version));
  const closed = events.find((event) => event.verb === 'close');
  const withdrawn = events.find((event) => event.verb === 'withdraw' && Number(event.version) === Number(latest.version));
  return {
    packetId,
    version: latest.version,
    fromId: agentId,
    toId,
    outboxPath,
    packetPath,
    ackPath,
    consumed,
    declined,
    closed,
    withdrawn,
    events,
  };
}

function writePacket({ hubRoot, projectSlug, fromId, toId, topic, body, level, items = [] }) {
  const now = isoNow();
  const packetId = `${packetTimestamp()}__${topic}`;
  const outboxPath = path.join(projectDir(hubRoot, projectSlug), `from_${fromId}`, 'outbox.log.md');
  ensureExistingFile(outboxPath, `from_${fromId} outbox`);
  const packetDir = path.join(projectDir(hubRoot, projectSlug), `from_${fromId}`, 'packets', `${packetId}__v1`);
  if (fs.existsSync(packetDir)) {
    throw new Error(`packet folder already exists: ${packetDir}`);
  }
  fs.mkdirSync(packetDir, { recursive: true });
  const scope = packetScopeFromBody(body, topic);
  const packetMd = `---\npacket_id: ${packetId}\nversion: 1\nfrom: ${fromId}\nto: ${toId}\nproject: ${projectSlug}\nlevel: ${level}\nsupersedes: null\ncreated_at: ${now}\nssot_refs: []\nscope: \"${scope}\"\n${renderItemsYaml(items)}\n---\n\n# ${topic}\n\n${body}\n`;
  fs.writeFileSync(path.join(packetDir, 'packet.md'), packetMd, 'utf8');
  appendLine(outboxPath, `${now} | publish | ${packetId} v1 | to:${toId} | items:${items.length || 'none'}`);
  return { packetId, version: 1, packetDir, items };
}

function revisePacket({ hubRoot, projectSlug, agentId, packetId, body, reason, items = [], itemsProvided = false, clearItems = false }) {
  const { outboxPath, latest } = latestOwnPacketVersion({ hubRoot, projectSlug, agentId, packetId });
  const previousVersion = latest.version;
  const nextVersion = previousVersion + 1;
  const previousPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', `${packetId}__v${previousVersion}`, 'packet.md');
  ensureExistingFile(previousPath, `previous packet v${previousVersion}`);
  const previousText = fs.readFileSync(previousPath, 'utf8');
  const previousHeader = parsePacketHeader(previousPath);
  const toId = previousHeader.to || latest.kv.to;
  if (!toId) {
    throw new Error(`could not infer receiver for ${packetId}; previous packet header is missing 'to'.`);
  }
  // Items lifecycle: an explicit --items/--items-file sets them; --clear-items empties them;
  // otherwise the prior version's declared items carry forward, so a revision that does not
  // mention items never silently drops the action list.
  let finalItems;
  if (itemsProvided) finalItems = items;
  else if (clearItems) finalItems = [];
  else finalItems = parseFrontmatterItems(previousText);
  const now = isoNow();
  const packetDir = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', `${packetId}__v${nextVersion}`);
  if (fs.existsSync(packetDir)) {
    throw new Error(`packet folder already exists: ${packetDir}`);
  }
  fs.mkdirSync(packetDir, { recursive: true });
  const scope = packetScopeFromBody(body, previousHeader.scope || packetId);
  const level = previousHeader.level || 'L2-aps-packet';
  const packetMd = `---\npacket_id: ${packetId}\nversion: ${nextVersion}\nfrom: ${agentId}\nto: ${toId}\nproject: ${projectSlug}\nlevel: ${level}\nsupersedes: ${packetId}__v${previousVersion}\ncreated_at: ${now}\nssot_refs: []\nscope: \"${scope}\"\n${renderItemsYaml(finalItems)}\n---\n\n# Revision ${nextVersion} for ${packetId}\n\n${body}\n`;
  fs.writeFileSync(path.join(packetDir, 'packet.md'), packetMd, 'utf8');
  appendLine(outboxPath, `${now} | revise | ${packetId} v${nextVersion} | to:${toId} | reason:${reason} | items:${finalItems.length || 'none'}`);
  return { packetId, version: nextVersion, previousVersion, packetDir, outboxPath, toId, items: finalItems };
}

function consumePacket({ hubRoot, projectSlug, agentId, packetId, version, result }) {
  findIncomingPacket({ hubRoot, projectSlug, agentId, packetId, version });
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  if (!fs.existsSync(ackPath)) {
    throw new Error(`ack file not found: ${ackPath}`);
  }
  const ack = readJson(ackPath);
  ack.consumed = ack.consumed || [];
  ack.declined = ack.declined || [];
  const declined = ack.declined.some((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
  if (declined) {
    throw new Error(`${packetId} v${version} is already declined; ask the sender to revise, withdraw, or close instead of marking it handled.`);
  }
  const already = ack.consumed.some((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
  if (!already) {
    ack.consumed.push({
      packet_id: packetId,
      version: Number(version),
      at: isoNow(),
      result,
    });
    writeJson(ackPath, ack);
  }
  return { ackPath, already };
}

function declinePacket({ hubRoot, projectSlug, agentId, packetId, version, reason }) {
  findIncomingPacket({ hubRoot, projectSlug, agentId, packetId, version });
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`);
  if (!fs.existsSync(ackPath)) {
    throw new Error(`ack file not found: ${ackPath}`);
  }
  const ack = readJson(ackPath);
  ack.consumed = ack.consumed || [];
  ack.declined = ack.declined || [];
  const consumed = ack.consumed.some((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
  if (consumed) {
    throw new Error(`${packetId} v${version} is already consumed; do not also decline the same version.`);
  }
  const already = ack.declined.some((entry) => entry.packet_id === packetId && Number(entry.version) === Number(version));
  if (!already) {
    ack.declined.push({
      packet_id: packetId,
      version: Number(version),
      at: isoNow(),
      reason,
    });
    writeJson(ackPath, ack);
  }
  return { ackPath, already };
}

function withdrawPacket({ hubRoot, projectSlug, agentId, packetId, version, reason }) {
  const { outboxPath, events, latest } = latestOwnPacketVersion({ hubRoot, projectSlug, agentId, packetId });
  const targetVersion = version || latest.version;
  if (Number(targetVersion) !== Number(latest.version)) {
    throw new Error(`withdraw only supports the latest version (${latest.version}); publish a new revision if an older version needs correction.`);
  }
  if (events.some((event) => event.verb === 'withdraw' && Number(event.version) === Number(targetVersion))) {
    throw new Error(`${packetId} v${targetVersion} is already withdrawn.`);
  }
  const packetPath = path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', `${packetId}__v${targetVersion}`, 'packet.md');
  ensureExistingFile(packetPath, `packet v${targetVersion}`);
  const header = parsePacketHeader(packetPath);
  const receiverId = header.to || latest.kv.to;
  if (!receiverId) {
    throw new Error(`could not infer receiver for ${packetId}; packet header is missing 'to'.`);
  }
  const ackPath = path.join(projectDir(hubRoot, projectSlug), '_ack', `${receiverId}.ack.json`);
  if (fs.existsSync(ackPath)) {
    const ack = readJson(ackPath);
    const consumed = (ack.consumed || []).some((entry) => entry.packet_id === packetId && Number(entry.version) === Number(targetVersion));
    if (consumed) {
      throw new Error(`${receiverId} has already consumed ${packetId} v${targetVersion}; publish a revision or close with a corrective reason instead.`);
    }
  }
  appendLine(outboxPath, `${isoNow()} | withdraw | ${packetId} v${targetVersion} | reason:${reason}`);
  return { outboxPath, version: targetVersion, receiverId, ackPath };
}

function closePacket({ hubRoot, projectSlug, agentId, packetId, reason }) {
  const { outboxPath, latest } = latestOwnPacketVersion({ hubRoot, projectSlug, agentId, packetId });
  const version = latest.version;
  appendLine(outboxPath, `${isoNow()} | close | ${packetId} v${version} | reason:${reason}`);
  return { outboxPath, version };
}

function scanConflictFiles(rootDir) {
  const found = [];
  if (!fs.existsSync(rootDir)) return found;
  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);
    if (/conflict|conflicted/i.test(entry.name)) found.push(entryPath);
    if (entry.isDirectory()) found.push(...scanConflictFiles(entryPath));
  }
  return found;
}

function scanIdentityIssues({ hubRoot, projectSlug }) {
  const issues = [];
  const projectPath = projectDir(hubRoot, projectSlug);
  if (!fs.existsSync(projectPath)) return issues;

  const lanes = new Set();
  const acks = new Set();
  const peerCards = new Set();

  for (const entry of fs.readdirSync(projectPath, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name.startsWith('from_')) {
      const agentId = entry.name.slice('from_'.length);
      lanes.add(agentId);
      if (validateSnakeCase('agent', agentId)) {
        issues.push({
          severity: 'error',
          owner: agentId,
          source: `lane:${agentId}`,
          message: `lane 名稱 from_${agentId} 不是合法用戶名稱。`,
          next: '先人工核對是否 Google Drive 同步衝突或錯誤改名；不要直接發包。',
        });
      }
    }
  }

  const ackDir = path.join(projectPath, '_ack');
  if (fs.existsSync(ackDir)) {
    for (const entry of fs.readdirSync(ackDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ack.json')) continue;
      const agentId = entry.name.replace(/\.ack\.json$/, '');
      const filePath = path.join(ackDir, entry.name);
      acks.add(agentId);
      try {
        const ack = readJson(filePath);
        if (ack.agent !== agentId) {
          issues.push({
            severity: 'error',
            owner: agentId,
            source: `ack:${agentId}`,
            message: `${entry.name} 內的 agent 是 ${ack.agent || '(missing)'},與檔名 ${agentId} 不一致。`,
            next: '先人工核對 ack 是否由另一個身份複製或同步錯配；不要把它當成有效已讀 / 退回狀態。',
          });
        }
        if (ack.project && ack.project !== projectSlug) {
          issues.push({
            severity: 'error',
            owner: agentId,
            source: `ack:${agentId}`,
            message: `${entry.name} 內的 project 是 ${ack.project},與目前項目 ${projectSlug} 不一致。`,
            next: '先人工核對是否指向錯誤 APS 合作目錄；不要覆寫。',
          });
        }
      } catch (err) {
        issues.push({
          severity: 'error',
          owner: agentId,
          source: `ack:${agentId}`,
          message: `${entry.name} 不是可讀 JSON: ${err.message}`,
          next: '先人工修復或請該身份重新同步；不要手動猜測狀態。',
        });
      }
    }
  }

  const peerDir = peerAgentsDir(hubRoot, projectSlug);
  if (fs.existsSync(peerDir)) {
    for (const entry of fs.readdirSync(peerDir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      const fileAgentId = entry.name.replace(/\.json$/, '');
      const filePath = path.join(peerDir, entry.name);
      peerCards.add(fileAgentId);
      try {
        const card = readJson(filePath);
        if (card.agent_id !== fileAgentId) {
          issues.push({
            severity: 'error',
            owner: fileAgentId,
            source: `peer:${fileAgentId}`,
            message: `${entry.name} 內的 agent_id 是 ${card.agent_id || '(missing)'},與檔名 ${fileAgentId} 不一致。`,
            next: '先人工核對 peer card 是否來自錯誤身份或同步衝突；不要把它當成 confirmed peer。',
          });
        }
        if (card.project && card.project !== projectSlug) {
          issues.push({
            severity: 'error',
            owner: fileAgentId,
            source: `peer:${fileAgentId}`,
            message: `${entry.name} 內的 project 是 ${card.project},與目前項目 ${projectSlug} 不一致。`,
            next: '先人工核對是否混入另一個 APS 合作目錄的 peer card。',
          });
        }
        const expectedLane = `from_${fileAgentId}`;
        if (card.lane && card.lane !== expectedLane) {
          issues.push({
            severity: 'error',
            owner: fileAgentId,
            source: `peer:${fileAgentId}`,
            message: `${entry.name} 內的 lane 是 ${card.lane},預期應是 ${expectedLane}。`,
            next: '先人工核對身份 lane 對應；不要向此 peer 發正式交接。',
          });
        }
      } catch (err) {
        issues.push({
          severity: 'error',
          owner: fileAgentId,
          source: `peer:${fileAgentId}`,
          message: `${entry.name} 不是可讀 JSON: ${err.message}`,
          next: '先人工修復 peer card 或請對方重新完成 APS 設定。',
        });
      }
    }
  }

  const allIds = new Set([...lanes, ...acks, ...peerCards]);
  for (const id of [...allIds].sort()) {
    const hasLane = lanes.has(id);
    const hasAck = acks.has(id);
    const hasPeerCard = peerCards.has(id);
    if (hasPeerCard && (!hasLane || !hasAck)) {
      issues.push({
        severity: 'warn',
        owner: id,
        source: `identity:${id}`,
        message: `${id} 有 peer card,但${hasLane ? '' : '缺少 lane '}${hasAck ? '' : '缺少 ack'}`.trim(),
        next: '這可能只是對方未完成接入或同步未完成；正式交接前先等對方完成 APS 設定並重跑 doctor。',
      });
    }
  }

  return issues;
}

// doctor health is split in two: local-core decides the exit code and must pass even
// when there is no counterpart yet; peer health is informational and never flips the
// exit code, so a solo (just-installed, not-yet-invited) project is still 通過.
function doctorHub({ hubRoot, projectSlug, agentId, otherAgentId }) {
  function fileCheck(filePath, label) {
    return { ok: fs.existsSync(filePath) && fs.statSync(filePath).isFile(), label, path: filePath };
  }
  function dirCheck(dirPath, label) {
    return { ok: fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory(), label, path: dirPath };
  }
  function containsCheck(filePath, label, expected) {
    const ok = fs.existsSync(filePath)
      && fs.statSync(filePath).isFile()
      && fs.readFileSync(filePath, 'utf8').includes(expected);
    return { ok, label, path: filePath };
  }
  const projectPath = projectDir(hubRoot, projectSlug);
  const coreChecks = [
    fileCheck(configPath(), 'local APS config'),
    fileCheck(path.join(process.cwd(), 'dev', 'rules', 'aps-bridge.md'), 'local APS bridge'),
    containsCheck(path.join(process.cwd(), 'dev', 'RULE_PACKS.md'), 'Handoff Kit APS route', 'dev/rules/aps-bridge.md'),
    containsCheck(path.join(process.cwd(), 'dev', 'PROJECT_INDEX.md'), 'Handoff Kit APS project index', '.aps/config.json'),
    dirCheck(hubRoot, '共用 Drive 資料夾 root'),
    fileCheck(path.join(hubRoot, '_hub', 'PROTOCOL.md'), 'protocol'),
    fileCheck(path.join(hubRoot, '_hub', 'CHANGELOG.md'), 'changelog'),
    fileCheck(path.join(projectPath, `from_${agentId}`, 'outbox.log.md'), `${agentId} outbox`),
    dirCheck(path.join(projectPath, `from_${agentId}`, 'packets'), `${agentId} packets`),
    fileCheck(path.join(projectPath, '_ack', `${agentId}.ack.json`), `${agentId} ack`),
  ];

  const peerIds = new Set();
  for (const peer of readPeerCards(hubRoot, projectSlug)) {
    if (peer.agent_id && peer.agent_id !== agentId) peerIds.add(peer.agent_id);
  }
  if (otherAgentId && otherAgentId !== agentId) peerIds.add(otherAgentId);
  const peerChecks = [];
  for (const peerId of [...peerIds].sort()) {
    const cardPath = peerCardPath(hubRoot, projectSlug, peerId);
    let state = '(無 peer card;舊式預設對方)';
    if (fs.existsSync(cardPath)) {
      try {
        const card = readJson(cardPath);
        state = `${card.status || 'active'} / ${card.peer_state || 'unknown'}`;
      } catch (_) {
        state = 'invalid card';
      }
    }
    const checks = [
      fileCheck(path.join(projectPath, `from_${peerId}`, 'outbox.log.md'), `${peerId} outbox`),
      dirCheck(path.join(projectPath, `from_${peerId}`, 'packets'), `${peerId} packets`),
      fileCheck(path.join(projectPath, '_ack', `${peerId}.ack.json`), `${peerId} ack`),
    ];
    peerChecks.push({ peerId, state, checks, allOk: checks.every((check) => check.ok) });
  }
  const conflicts = scanConflictFiles(projectPath);
  const identityIssues = scanIdentityIssues({ hubRoot, projectSlug });
  return { coreChecks, peerChecks, conflicts, identityIssues };
}

function bridgePackContent(role, values) {
  const fixtureDir = role === 'B' ? 'demo-agent-b' : 'demo-agent-a';
  const fixturePath = path.join(__dirname, '..', 'examples', fixtureDir, 'dev', 'rules', 'aps-bridge.md');
  let content = fs.readFileSync(fixturePath, 'utf8');
  content = content.replace(/`<your_agent_id>`/g, `\`${values.agentId}\``);
  content = content.replace(/`<your_project_slug>`/g, `\`${values.projectSlug}\``);
  content = content.replace(/`<your_shared_drive_folder_absolute_path>`/g, `\`${values.hubRoot}\``);
  const counterpartLabel = values.otherAgentId
    ? `\`${values.otherAgentId}\``
    : '(尚未邀請;新協作者請在 AI 工具說「邀請新協作者」)';
  content = content.replace(/`<counterpart_agent_id>`/g, counterpartLabel);
  return content;
}

function ackJson(agentId, projectSlug) {
  return `${JSON.stringify({
    agent: agentId,
    project: projectSlug,
    consumed: [],
    declined: [],
    open_questions: [],
  }, null, 2)}\n`;
}

function packetsReadme(agentId) {
  return `# from_${agentId} packets

This directory holds immutable packet folders authored by agent \`${agentId}\`.
Each packet folder is named \`<UTC-yyyymmddThhmmssZ>__<short_snake_topic>__v<N>/\`.
After publish, packets are never edited. Revisions add a new \`__v<N+1>/\` folder.

See \`<hub_root>/_hub/PROTOCOL.md\`.
`;
}

function ensurePeerArtifacts({ hubRoot, projectSlug, agentId, displayName, peerState, dryRun }) {
  const resourcesDir = path.join(__dirname, '..', 'resources', 'protocol');
  const templatesDir = path.join(resourcesDir, 'templates');
  const outboxTemplate = fs.readFileSync(path.join(templatesDir, 'outbox.log.md.template'), 'utf8');
  const steps = [];
  steps.push(ensureDirectory(path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets'), dryRun));
  steps.push(writeFileIfMissing(path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'outbox.log.md'), outboxTemplate, dryRun));
  steps.push(writeFileIfMissing(path.join(projectDir(hubRoot, projectSlug), `from_${agentId}`, 'packets', 'README.md'), packetsReadme(agentId), dryRun));
  steps.push(writeFileIfMissing(path.join(projectDir(hubRoot, projectSlug), '_ack', `${agentId}.ack.json`), ackJson(agentId, projectSlug), dryRun));
  steps.push(writePeerCardPreservingConfirmed(
    peerCardPath(hubRoot, projectSlug, agentId),
    peerCardRecord({ projectSlug, agentId, displayName, peerState }),
    dryRun
  ));
  return steps;
}

function starterPackContent(values) {
  const folderName = path.basename(values.hubRoot || '') || 'Agent_Public_Squares';
  const senderName = values.agentId || '發出邀請的人';
  return `# APS 維護用加入指引 — ${values.projectSlug}

（這是維護 / 兼容用 starter pack，只適用於雙方已明確約定用戶名稱為 ${values.otherAgentId} 的情況。一般新協作者應改用一次加入邀請碼，讓對方在自己電腦決定用戶名稱。）

---

📨 APS 維護用加入指引：${values.projectSlug}

${senderName} 想邀請你一同用 Agent Public Squares（APS）進行 AI 跨機協作。做法很簡單：你們共用一個 APS 交換區，並在同一個 APS 合作目錄內交收進度，不必每次重新交代背景。

開始前請先確認一件事：

⚠️ 這份指引預設你已同意在這個 APS 合作目錄使用用戶名稱：
${values.otherAgentId}

如果你未同意這個用戶名稱，請不要照這份 starter pack 設定；請要求 ${senderName} 改發一次加入邀請碼，讓你自行選定用戶名稱。

☁️ 你會收到我經 Google Drive 分享的資料夾「${folderName}」（也可能收到一封 Google Drive 通知 email）。請先打開 Google Drive 接受分享，設為「離線可用」，等它同步到你的電腦。

🤖 你在自己的本機工作目錄如常打開 AI 工具即可；APS 交換區只是 APS 用來同步交接資料。請 AI 讀下面這個安裝指引，讓它替你檢查環境、安裝 APS、設定本機路徑與做驗收：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html

📌 設定時，APS 合作目錄名稱要跟發起方完全一樣：
${values.projectSlug}

✅ 見到「通過」就裝好了。之後對方有東西交給你，你在自己的 AI 工具輸入「check Drive」就會收到。

給人看的逐步詳解（有圖、有安裝命令）：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html
`;
}

function openInviteContent(values, inviteRecord = null) {
  const folderName = path.basename(values.hubRoot || '') || 'Agent_Public_Squares';
  const senderName = values.agentId || '發出邀請的人';
  const inviteCode = inviteRecord && inviteRecord.invite_code ? inviteRecord.invite_code : 'APS-XXXX-XXXX-XXXX';
  return `# APS 一次加入邀請 — ${values.projectSlug}

（這是給新協作者的一次加入邀請。把下面整段訊息傳給對方即可；對方的用戶名稱由對方自己在本機設定時決定。）

---

📨 APS 協作邀請：${values.projectSlug}

${senderName} 想邀請你一同用 Agent Public Squares（APS）做 AI 跨機協作。

APS 的做法是：大家共用同一個 APS 交換區，並把同一個合作項目的進度交接到同一個 APS 合作目錄裏。

你的加入邀請碼是：
${inviteCode}

這個邀請碼只代表「可以加入這個 APS 合作目錄」，不代表你的用戶名稱。你的用戶名稱由你自己決定，AI 會先檢查是否重名。

請先做幾件簡單的事：

1. 先到你的 email 找 Google Drive 分享通知，接受分享資料夾「${folderName}」。
2. 在你自己的電腦上把這個資料夾設為「離線可用」，等它同步完成。
3. 在你平日處理這個項目的本機工作目錄，打開能操作本機檔案的 AI 代理，例如 Codex、Claude Code 或 Claude Cowork。
4. 把下面 \`---✂️---\` 之間的整段直接貼給 AI。

AI 會建議你加入 ${values.projectSlug}，並請你提供自己電腦上的 Google Drive 本機路徑和你想使用的用戶名稱。

---✂️---

請在目前本機工作目錄，按以下頁面完成 Agent Public Squares（APS）安裝、加入或升級：

https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html

邀請資訊如下：

APS 合作目錄名稱：
${values.projectSlug}

邀請碼：
${inviteCode}

Google Drive 共用資料夾名稱：
${folderName}

邀請人：
${senderName}

設定完成後，請按頁內收尾輸出，用與 CLI 對齊的短格式回報；通過後再告訴我以後可以輸入「Check APS」查看整體狀態，或輸入「check Drive」接收 ${senderName} 交來的內容。

---✂️---

給人看的逐步圖解：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html
`;
}

function setupHub(values, dryRun) {
  const identityConflict = selfIdentityConflict({
    hubRoot: values.hubRoot,
    projectSlug: values.projectSlug,
    agentId: values.agentId,
  });
  if (identityConflict) throw new Error(identityConflict);

  ensureHandoffKitReady();
  const resourcesDir = path.join(__dirname, '..', 'resources', 'protocol');
  const templatesDir = path.join(resourcesDir, 'templates');
  const projectDir = path.join(values.hubRoot, values.projectSlug);
  // A counterpart is only built when one is known. A three-question install sets up
  // only the local side. Ordinary collaborators are invited later via `aps peer invite`
  // and choose their own user name on their own machine. Old two-person setups still
  // pass an otherAgentId, so their counterpart lane / ack / provisional card stay built here.
  const hasCounterpart = Boolean(values.otherAgentId);
  const steps = [];
  if (values.inviteCode) {
    acceptInviteCode({
      hubRoot: values.hubRoot,
      projectSlug: values.projectSlug,
      inviteCode: values.inviteCode,
      agentId: values.agentId,
      dryRun: true,
    });
  }

  const dirs = [
    path.join(values.hubRoot, '_hub'),
    path.join(values.hubRoot, '_hub', 'templates'),
    path.join(projectDir, `from_${values.agentId}`, 'packets'),
    path.join(projectDir, '_ack'),
    peerAgentsDir(values.hubRoot, values.projectSlug),
  ];
  if (hasCounterpart) dirs.push(path.join(projectDir, `from_${values.otherAgentId}`, 'packets'));
  for (const dirPath of dirs) {
    steps.push(ensureDirectory(dirPath, dryRun));
  }

  const protocolSource = path.join(resourcesDir, 'PROTOCOL.md');
  const protocolTarget = path.join(values.hubRoot, '_hub', 'PROTOCOL.md');
  steps.push(writeFileIfMissing(protocolTarget, fs.readFileSync(protocolSource, 'utf8'), dryRun));

  const changelogTarget = path.join(values.hubRoot, '_hub', 'CHANGELOG.md');
  steps.push(writeFileIfMissing(changelogTarget, '# APS Protocol Changelog\n\n- v1.0: Initial protocol bundled with `@adamchanadam/aps`.\n', dryRun));

  for (const templateName of ['packet.md.template', 'outbox.log.md.template', 'ack.json.template', 'ack.json.example']) {
    const source = path.join(templatesDir, templateName);
    const target = path.join(values.hubRoot, '_hub', 'templates', templateName);
    steps.push(writeFileIfMissing(target, fs.readFileSync(source, 'utf8'), dryRun));
  }

  const outboxTemplate = fs.readFileSync(path.join(templatesDir, 'outbox.log.md.template'), 'utf8');
  steps.push(writeFileIfMissing(path.join(projectDir, `from_${values.agentId}`, 'outbox.log.md'), outboxTemplate, dryRun));
  steps.push(writeFileIfMissing(path.join(projectDir, `from_${values.agentId}`, 'packets', 'README.md'), packetsReadme(values.agentId), dryRun));
  steps.push(writeFileIfMissing(path.join(projectDir, '_ack', `${values.agentId}.ack.json`), ackJson(values.agentId, values.projectSlug), dryRun));
  steps.push(writeFileOrUpdate(peerCardPath(values.hubRoot, values.projectSlug, values.agentId), peerCardJson({
    projectSlug: values.projectSlug,
    agentId: values.agentId,
    displayName: values.agentId,
    peerState: 'confirmed',
  }), dryRun));
  if (values.inviteCode) {
    steps.push(acceptInviteCode({
      hubRoot: values.hubRoot,
      projectSlug: values.projectSlug,
      inviteCode: values.inviteCode,
      agentId: values.agentId,
      dryRun,
    }));
  }
  if (hasCounterpart) {
    steps.push(writeFileIfMissing(path.join(projectDir, `from_${values.otherAgentId}`, 'outbox.log.md'), outboxTemplate, dryRun));
    steps.push(writeFileIfMissing(path.join(projectDir, `from_${values.otherAgentId}`, 'packets', 'README.md'), packetsReadme(values.otherAgentId), dryRun));
    steps.push(writeFileIfMissing(path.join(projectDir, '_ack', `${values.otherAgentId}.ack.json`), ackJson(values.otherAgentId, values.projectSlug), dryRun));
    steps.push(writeFileIfMissing(peerCardPath(values.hubRoot, values.projectSlug, values.otherAgentId), peerCardJson({
      projectSlug: values.projectSlug,
      agentId: values.otherAgentId,
      displayName: values.otherAgentId,
      peerState: 'provisional',
    }), dryRun));
  }

  const bridgeTarget = path.join(process.cwd(), 'dev', 'rules', 'aps-bridge.md');
  steps.push(writeFileOrUpdate(bridgeTarget, bridgePackContent(values.role, values), dryRun));

  steps.push(saveConfig(values, dryRun));
  steps.push(...registerHandoffKitIntegration(values, dryRun));

  return steps;
}

function registerHandoffKitIntegration(values, dryRun) {
  const projectRoot = process.cwd();
  const rulePacksPath = path.join(projectRoot, 'dev', 'RULE_PACKS.md');
  const projectIndexPath = path.join(projectRoot, 'dev', 'PROJECT_INDEX.md');
  const steps = [];

  const routeRow = '| APS / AI Public Squares / Agent Public Squares / 教我用 APS / 教我用 AI Public Squares / 教我用 Agent Public Squares / Check APS / check Drive / check Hub / Hub 有新嘢 / 跨機合作 / Drive 同步不到 / sync stuck / conflict | `dev/rules/aps-bridge.md` | APS cross-machine collaboration route: load the bridge rules and `.aps/config.json` before APS setup, daily use, status checks, inbox checks, or recovery. |';
  steps.push(upsertManagedBlock(
    rulePacksPath,
    'rule-pack-route',
    routeRow,
    /^## Routing Rule/m,
    dryRun
  ));

  const today = new Date().toISOString().slice(0, 10);
  const skillBlock = `### APS Installed Skill

| Field | Value |
|---|---|
| Installed by | \`@adamchanadam/aps init\` |
| Local bridge | \`dev/rules/aps-bridge.md\` |
| Local config | \`.aps/config.json\` |
| APS 合作目錄 | \`${values.projectSlug}\` |
| Local agent | \`${values.agentId}\` |
| Partner agent | ${values.otherAgentId ? `\`${values.otherAgentId}\`` : '(尚未邀請;新協作者請在 AI 工具說「邀請新協作者」)'} |
| Trigger route | Registered in \`dev/RULE_PACKS.md\`; when the user mentions APS / AI Public Squares / Agent Public Squares / 教我用 APS / 教我用 AI Public Squares / 教我用 Agent Public Squares / Check APS / check Drive / check Hub / Hub 有新嘢 / Drive sync / conflict, read \`dev/rules/aps-bridge.md\` and \`.aps/config.json\` before answering. |
| Last verified | ${today} |`;
  steps.push(upsertManagedBlock(
    projectIndexPath,
    'project-index-skill',
    skillBlock,
    /^### Source-of-truth Architecture/m,
    dryRun
  ));

  return steps;
}

if (!subcommand || subcommand === '--help' || subcommand === '-h') {
  printBrandCard();
  console.log(`
透過共用 Drive 資料夾,讓不同電腦上的 AI 代理做一對一交接。

用法:
  npx aps init                    互動式設定:回答三條問題(APS 交換區 / APS 合作目錄 / 你的用戶名稱),只設定你自己這一邊
  npx aps init --target claude    只安裝 Claude Code 的 APS skill
  npx aps init --target codex     只安裝 Codex 的 APS skill
  npx aps init --refresh-skill    先備份既有 APS skill,再刷新安裝
  npx aps init --hub-root <path> --project <slug> --agent-id <id> [--invite-code APS-....] [--other-agent-id <id>] [--role A|B]
                                  進階非互動設定 (對方與起手方向可選;只設自己也可)
  npx aps init --dry-run          只顯示會寫入的位置,不真正改檔
  npx aps upgrade                 npm 更新後刷新既有 APS 合作目錄
  npx aps config                  顯示已保存的本機 APS 設定
  npx aps config --hub-root <path> --project <slug> --agent-id <id> [--other-agent-id <id>] [--role A|B]
                                  只保存或更新本機 APS 設定 (對方與起手方向可選)
  npx aps peers                   顯示本 APS 合作目錄的 peers
  npx aps peer invite             備用命令:生成一次加入邀請碼;對方自行選用戶名稱,不預先建立 peer
  npx aps peer add --agent-id <id> [--display-name <name>]
                                  維護 / 兼容:已明確約定對方用戶名稱時才補登 peer 與 starter pack
  npx aps peer starter --agent-id <id>
                                  維護 / 兼容:重新產生給指定 peer 的 starter pack
  npx aps publish --to <id> --topic <snake> --body <text>
  npx aps publish --to <id> --topic <snake> --body-file <path> [--items "甲;乙" | --items-file <path>] [--strict-handoff]
                                  發佈 v1 交接包並追加 outbox;--items 由發送方申報「請對方做的事」,CLI 逐字記錄(分號分隔;項目本身含分號時改用 --items-file)
                                  --strict-handoff 會阻止缺少或內容不足的共同目標、雙方任務、交叉點、--items、真源指標或風險
  npx aps revise --packet-id <id> --body-file <path> --reason <text> [--items "甲;乙" | --items-file <path> | --clear-items]
                                  為自己發出的交接包建立下一個不可變版本;未指定 items 時沿用上一版
  npx aps inbox
  npx aps inbox --all
  npx aps inbox --from <agent_id>
                                  查看對方交來而本機尚未處理的項目
  npx aps check-drive
                                  同 inbox;給「check Drive」日常收件流程使用
  npx aps check-aps
                                  查看 APS 整體狀態:交接包狀態、是否如期、下一步;不生成 dashboard HTML
  npx aps check-aps --full
                                  顯示完整排錯資料:數量、同步、路徑、peer、風險與追溯資料
  npx aps check-aps --demo-preview
                                  顯示 Check APS 終端畫面示範;只用假資料,不讀設定,不寫共用 Drive
  npx aps check-aps --demo-preview --scenario shared-goal
                                  顯示共同目標與分工確認主流程示範
  npx aps live
                                  生成 APS Live 交接追蹤頁;用 Trystero 做即時核對,但不寫 packet / outbox / ack
  npx aps live --dry-run
                                  只檢查並列出會生成的 APS Live 交接追蹤頁;不寫 HTML 或正式 APS 狀態
  npx aps live --output <path>
                                  生成到指定 HTML 路徑;只改輸出檔位置
  npx aps live-bridge
                                  啟動 APS Live 本機 AI 接收器;Live 交接追蹤頁可一鍵送入本機待處理佇列
  npx aps live-queue
                                  讀取 APS Live 已送入本機 AI 待處理佇列的內容
  npx aps live --demo-preview
                                  生成 APS Live 交接追蹤頁示範;只用假資料,不讀設定,不寫共用 Drive,不代表跨機已驗收
  npx aps live --demo-preview --scenario shared-goal
                                  生成共同目標與分工確認主流程示範頁
  npx aps dashboard
                                  已退役;不再生成 dashboard HTML,請用 check-aps 或 APS Live
  npx aps status --packet-id <id>
                                  查看自己發出的交接包目前狀態
  npx aps context
  npx aps context check
  npx aps context add --from-packet <id> --version <n>
  npx aps context html
                                  檢查或生成 Project Context Index;不寫 packet / outbox / ack
  npx aps consume --packet-id <id> --version <n> --result <text>
                                  在自己的 ack 檔標記某版本已處理
  npx aps decline --packet-id <id> --version <n> --reason <text>
                                  在自己的 ack 檔退回某版本,表示不能處理或資料不足
  npx aps withdraw --packet-id <id> --reason <text>
                                  撤回自己尚未被對方處理的最新版本
  npx aps close --packet-id <id> --reason <text>
                                  在自己的 outbox 追加收結事件
  npx aps doctor
                                  檢查共用 Drive 資料夾骨架、ack、outbox、疑似衝突檔名與身份結構
  npx aps bridge-pack             輸出 Bridge Pack 範本,預設為 User A 角色
  npx aps bridge-pack --role B    輸出 User B 角色的 Bridge Pack 範本
  npx aps --help                  顯示本說明

bridge-pack 會把範本內容輸出到 stdout;可重導向到工作目錄的
Bridge Pack 位置,例如:
  npx aps bridge-pack > dev/rules/aps-bridge.md

本地原始碼測試:
  node bin/aps.js bridge-pack > dev/rules/aps-bridge.md

init 保存 .aps/config.json 後,日常命令可省略 --hub-root、--project、
--agent-id 與 --other-agent-id。需要臨時覆蓋設定時,仍可傳入這些參數。

狀態:已可使用 bridge-pack、skill 安裝、初始共用 Drive 資料夾設置、既有項目升級、
本機設定保存、peers / peer invite / peer starter、publish / revise / inbox / check-drive / check-aps / status / context / consume / decline / withdraw / close,
以及只讀 doctor。
這個預發布版本已有一次維護者真實 Google Drive 往返驗證;每個真實項目
仍需要各自做項目級同步驗證。
GitHub: https://github.com/Adamchanadam/agent-public-squares
`);
  process.exit(0);
}

if (subcommand === 'init' && args.length === 0) {
  runInteractiveInit()
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(`互動式設定失敗:${err.message}`);
      process.exit(1);
    });
  return;
} else if (subcommand === 'init') {
  const validTargets = ['claude', 'codex', 'both'];
  const target = getFlagValue('--target', 'both').toLowerCase();
  const dryRun = hasFlag('--dry-run');
  const refreshSkill = hasFlag('--refresh-skill');
  const setupValues = {
    hubRoot: getRequiredFlagValue('--hub-root'),
    projectSlug: getRequiredFlagValue('--project'),
    agentId: getRequiredFlagValue('--agent-id'),
    otherAgentId: getRequiredFlagValue('--other-agent-id'),
    inviteCode: getRequiredFlagValue('--invite-code'),
    role: (getFlagValue('--role', 'A') || 'A').toUpperCase(),
  };
  // Non-interactive setup needs the three self-side core values; --other-agent-id and --role
  // are optional (solo install). If a counterpart is given, the old two-person path still runs.
  const coreFlagCount = [setupValues.hubRoot, setupValues.projectSlug, setupValues.agentId].filter(Boolean).length;
  const anySetupFlag = Boolean(setupValues.hubRoot || setupValues.projectSlug || setupValues.agentId || setupValues.otherAgentId || setupValues.inviteCode || getRequiredFlagValue('--role'));
  const doSetup = coreFlagCount === 3;
  if (!validTargets.includes(target)) {
    console.error(`Invalid --target value: must be claude, codex, or both (got '${target}').`);
    process.exit(1);
  }
  if (anySetupFlag && !doSetup) {
    console.error('共用 Drive 資料夾 setup requires at least: --hub-root, --project, --agent-id. (--other-agent-id and --role A|B are optional; add them for an old two-person setup.)');
    process.exit(1);
  }
  if (doSetup) {
    const errors = [
      validateNoPlaceholder('--hub-root', setupValues.hubRoot),
      validateSnakeCase('--project', setupValues.projectSlug),
      validateSnakeCase('--agent-id', setupValues.agentId),
      setupValues.otherAgentId ? validateSnakeCase('--other-agent-id', setupValues.otherAgentId) : null,
      setupValues.otherAgentId ? validateDistinctAgents(setupValues.agentId, setupValues.otherAgentId) : null,
      setupValues.inviteCode ? validateInviteCode(setupValues.inviteCode) : null,
      setupValues.role === 'A' || setupValues.role === 'B' ? null : `--role must be A or B (got '${setupValues.role}').`,
    ].filter(Boolean);
    if (errors.length > 0) {
      for (const error of errors) console.error(error);
      process.exit(1);
    }
  }

  const root = homeDir();
  if (!root) {
    console.error('Could not detect your home directory. Set HOME or USERPROFILE, then rerun `npx aps init`.');
    process.exit(1);
  }
  if (doSetup) {
    try {
      ensureHandoffKitReady();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  const installTargets = [];
  if (target === 'claude' || target === 'both') {
    installTargets.push({
      label: 'Claude Code',
      targetDir: path.join(root, '.claude', 'skills', 'aps'),
    });
  }
  if (target === 'codex' || target === 'both') {
    installTargets.push({
      label: 'Codex',
      targetDir: path.join(root, '.codex', 'skills', 'aps'),
    });
  }

  console.log(`APS init v${packageVersion} — skill installer${doSetup ? ' + 共用 Drive 資料夾 setup' : ''}${dryRun ? ' (dry run)' : ''}`);
  console.log('');
  console.log('這個命令會安裝 APS skill 檔案,讓 AI 工具懂得使用 APS。');
  if (doSetup) {
    console.log('它也會建立初始共用 Drive 資料夾 skeleton、本地 Bridge Pack 與 `.aps/config.json`。');
    console.log('完成後,日常命令可以使用已保存設定,毋須重複輸入長參數。');
    console.log('目前仍屬前期測試;每個真實項目仍要驗證自己的 Google Drive 同步狀態。');
  } else {
    console.log('如要同時建立共用 Drive 資料夾 skeleton,請至少提供 --hub-root、--project、--agent-id(--other-agent-id 與 --role A|B 可選)。');
  }
  console.log('');

  const results = installTargets.map((item) => installSkill({ ...item, dryRun, refresh: refreshSkill }));
  for (const result of results) {
    console.log(formatSetupResult(result, `${result.label}: `));
  }

  const failed = results.filter((result) => !result.ok && !result.skipped);
  const setupResults = [];
  if (doSetup) {
    console.log('');
    console.log('☁️ 建立共用 Drive 資料夾:');
    try {
      setupResults.push(...setupHub(setupValues, dryRun));
      for (const result of setupResults) {
        console.log(formatSetupResult(result));
      }
    } catch (err) {
      console.error(`共用 Drive 資料夾設定失敗:${err.message}`);
      process.exit(1);
    }
  }
  console.log('');
  const skipped = [
    ...results.filter((result) => result.skipped),
    ...setupResults.filter((result) => result.skipped),
  ];
  if (failed.length > 0) {
    console.log('有一個或多個目標安裝失敗。已盡量保留既有檔案不變。');
  } else if (dryRun && results.some((result) => result.refreshed)) {
    console.log('Dry run 完成。上方只列出將會備份與刷新哪些 skill;目前未改動任何檔案。');
  } else if (dryRun) {
    console.log('Dry run 完成。上方只列出將會寫入、刷新或略過的位置;目前未改動任何檔案。');
  } else if (results.some((result) => result.refreshed)) {
    console.log('✅ APS skill 已刷新。原有 skill 已改名備份,新版本已安裝。');
    console.log('🚀 下一步:請重新啟動 Claude Code 或 Codex,再在項目資料夾輸入「教我用 APS」。');
  } else if (skipped.length > 0) {
    console.log('安裝完成,並安全略過既有檔案。既有檔案沒有被覆寫。');
    console.log('如要刷新既有安裝,請執行 `npx aps init --refresh-skill`;工具會先備份舊 skill,再安裝新版本。');
  } else {
    console.log('✅ 設定完成。如果 Claude Code 或 Codex 未即時看到 APS skill,請重新啟動該 AI 工具。');
    console.log('🚀 下一步:打開 AI 工具並輸入「教我用 APS」。AI 應讀取 `.aps/config.json`,檢查共用 Drive 資料夾,先建立共同目標與分工;已有 confirmed peer 並完成基準確認後,才建議測試交接或正式交接。');
  }
  console.log('');
  console.log('手動 Bridge Pack 備用命令仍可使用:');
  console.log('  npx aps bridge-pack > dev/rules/aps-bridge.md');
  process.exit(failed.length > 0 ? 1 : 0);
}

if (subcommand === 'upgrade') {
  const validTargets = ['claude', 'codex', 'both'];
  const target = getFlagValue('--target', 'both').toLowerCase();
  const dryRun = hasFlag('--dry-run');
  if (!validTargets.includes(target)) {
    console.error(`Invalid --target value: must be claude, codex, or both (got '${target}').`);
    process.exit(1);
  }
  const config = loadConfigOrExit();
  const setupValues = {
    hubRoot: flagOrConfig('--hub-root', 'hubRoot', config),
    projectSlug: flagOrConfig('--project', 'projectSlug', config),
    agentId: flagOrConfig('--agent-id', 'agentId', config),
    otherAgentId: flagOrConfig('--other-agent-id', 'otherAgentId', config),
    role: (getFlagValue('--role', config.role || 'A') || 'A').toUpperCase(),
  };
  // A solo (self-only) project has no counterpart, so --other-agent-id / --role are
  // optional on upgrade; old two-person config still carries them and upgrades unchanged.
  requireValues({
    '--hub-root': setupValues.hubRoot,
    '--project': setupValues.projectSlug,
    '--agent-id': setupValues.agentId,
  });
  const errors = [
    validateNoPlaceholder('--hub-root', setupValues.hubRoot),
    validateSnakeCase('--project', setupValues.projectSlug),
    validateSnakeCase('--agent-id', setupValues.agentId),
    setupValues.otherAgentId ? validateSnakeCase('--other-agent-id', setupValues.otherAgentId) : null,
    setupValues.otherAgentId ? validateDistinctAgents(setupValues.agentId, setupValues.otherAgentId) : null,
    setupValues.role === 'A' || setupValues.role === 'B' ? null : `--role must be A or B (got '${setupValues.role}').`,
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    ensureHandoffKitReady();
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  const root = homeDir();
  if (!root) {
    console.error('Could not detect your home directory. Set HOME or USERPROFILE, then rerun `npx aps upgrade`.');
    process.exit(1);
  }
  const installTargets = [];
  if (target === 'claude' || target === 'both') {
    installTargets.push({ label: 'Claude Code', targetDir: path.join(root, '.claude', 'skills', 'aps') });
  }
  if (target === 'codex' || target === 'both') {
    installTargets.push({ label: 'Codex', targetDir: path.join(root, '.codex', 'skills', 'aps') });
  }

  console.log(`APS upgrade v${packageVersion}${dryRun ? ' (dry run)' : ''}`);
  console.log('');
  console.log('這個命令用於已安裝 APS 的項目。');
  console.log('建議先執行 `npm install --save-dev @adamchanadam/aps@latest`,再執行 `npx aps upgrade`。');
  console.log('工具會讀取既有 `.aps/config.json`,備份並刷新 APS skill,更新本地橋接與註冊,再檢查共用 Drive 資料夾狀態。');
  console.log('');

  const results = installTargets.map((item) => installSkill({ ...item, dryRun, refresh: true }));
  for (const result of results) {
    console.log(formatSetupResult(result, `${result.label}: `));
  }
  const failed = results.filter((result) => !result.ok && !result.skipped);
  if (failed.length > 0) {
    console.log('');
    console.log('有一個或多個 skill 目標刷新失敗。已盡量保留既有檔案不變。');
    process.exit(1);
  }

  console.log('');
  console.log('☁️ 更新既有 APS 項目設定:');
  let setupResults = [];
  try {
    setupResults = setupHub(setupValues, dryRun);
    for (const result of setupResults) {
      console.log(formatSetupResult(result));
    }
  } catch (err) {
    console.error(`Upgrade failed:${err.message}`);
    process.exit(1);
  }
  if (dryRun) {
    console.log('');
    console.log('Dry run 完成。移除 `--dry-run` 後重新執行,才會真正刷新。');
    process.exit(0);
  }

  const output = doctorHub(setupValues);
  const failedChecks = output.coreChecks.filter((check) => !check.ok).length + output.conflicts.length;
  console.log('');
  if (failedChecks === 0) {
    console.log('✅ APS 升級完成,doctor 預檢通過。');
    console.log('🚀 下一步:重新啟動 Claude Code 或 Codex,再在項目資料夾輸入「教我用 APS」。');
  } else {
    console.log('⚠️ APS 已刷新,但 doctor 預檢仍有問題。請執行 `npx aps doctor` 查看細節。');
  }
  process.exit(failedChecks === 0 ? 0 : 1);
}

if (subcommand === 'bridge-pack') {
  const roleFlag = process.argv.indexOf('--role');
  const roleArg = (roleFlag >= 0 && process.argv[roleFlag + 1])
    ? process.argv[roleFlag + 1].toUpperCase()
    : 'A';
  if (roleArg !== 'A' && roleArg !== 'B') {
    console.error(`❌ --role 只可使用 A 或 B。目前收到: ${process.argv[roleFlag + 1]}`);
    process.exit(1);
  }
  const fixtureDir = roleArg === 'B' ? 'demo-agent-b' : 'demo-agent-a';
  const fixturePath = path.join(__dirname, '..', 'examples', fixtureDir, 'dev', 'rules', 'aps-bridge.md');
  try {
    process.stdout.write(fs.readFileSync(fixturePath, 'utf8'));
    process.exit(0);
  } catch (err) {
    console.error(`Failed to read Bridge Pack fixture at ${fixturePath}: ${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'config') {
  try {
    const dryRun = hasFlag('--dry-run');
    const existing = loadConfig();
    // Writing config needs the three self-side core values; --other-agent-id and --role stay
    // optional and fall back to whatever the existing config held, so a solo project can save
    // without a counterpart and an old two-person config is not silently wiped.
    const explicitWrite = Boolean(getRequiredFlagValue('--hub-root') || getRequiredFlagValue('--project') || getRequiredFlagValue('--agent-id') || getRequiredFlagValue('--other-agent-id') || getRequiredFlagValue('--role'));
    if (explicitWrite) {
      const values = {
        hubRoot: getRequiredFlagValue('--hub-root'),
        projectSlug: getRequiredFlagValue('--project'),
        agentId: getRequiredFlagValue('--agent-id'),
        otherAgentId: getRequiredFlagValue('--other-agent-id') || existing.otherAgentId || null,
        role: (getFlagValue('--role', '') || existing.role || 'A').toUpperCase(),
      };
      const coreCount = [values.hubRoot, values.projectSlug, values.agentId].filter(Boolean).length;
      if (coreCount < 3) {
        console.error('❌ 寫入設定至少需要 --hub-root、--project、--agent-id(--other-agent-id 與 --role A|B 可選)。');
        process.exit(1);
      }
      const errors = [
        validateNoPlaceholder('--hub-root', values.hubRoot),
        validateSnakeCase('--project', values.projectSlug),
        validateSnakeCase('--agent-id', values.agentId),
        values.otherAgentId ? validateSnakeCase('--other-agent-id', values.otherAgentId) : null,
        values.otherAgentId ? validateDistinctAgents(values.agentId, values.otherAgentId) : null,
        values.role === 'A' || values.role === 'B' ? null : `--role must be A or B (got '${values.role}').`,
      ].filter(Boolean);
      if (errors.length > 0) {
        for (const error of errors) console.error(error);
        process.exit(1);
      }
      const result = writeConfig(values, dryRun);
      console.log(`⚙️ APS config ${dryRun ? 'dry run' : 'saved'}`);
      console.log(localizeSetupMessage(result.message));
      process.exit(0);
    }

    const filePath = configPath();
    const config = loadConfig();
    if (!fs.existsSync(filePath)) {
      console.log('❌ APS config: 找不到');
      console.log(`📄 ${filePath}`);
      console.log('');
      console.log('🚀 下一步:執行 `npx aps init` 進入互動式設定。');
      process.exit(1);
    }
    console.log('⚙️ APS 本機設定');
    console.log(`📄 設定檔: ${filePath}`);
    console.log(`☁️ 共用 Drive 資料夾 root: ${config.hubRoot || '(缺少)'}`);
    console.log(`📁 APS 合作目錄: ${config.projectSlug || '(缺少)'}`);
    console.log(`👤 本機 agent: ${config.agentId || '(缺少)'}`);
    console.log(`🤝 對方 agent: ${config.otherAgentId || '尚未設定 (新協作者請在 AI 工具說「邀請新協作者加入這個項目」;CLI invite 只是備用命令)'}`);
    console.log(`🧭 設定起手方向: ${config.role === 'A' ? '發起人(建立共用 Drive 資料夾)' : config.role === 'B' ? '加入者' : config.role || '(未記錄)'}`);
    console.log('   起手方向只影響設定時的預設,不影響日後誰可發送 / 接收(收發由 agent 身份與 packet 收件人決定)。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 設定失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'peers') {
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const output = listProjectPeers({ hubRoot, projectSlug, config: { ...config, agentId } });
    console.log(`👥 APS peers (${output.source})`);
    console.log(`📁 APS 合作目錄: ${projectSlug}`);
    console.log('');
    for (const peer of output.peers) {
      const markers = [
        peer.is_self ? '本機' : null,
        peer.is_default_peer ? '預設對方' : null,
      ].filter(Boolean).join(', ');
      const suffix = markers ? ` (${markers})` : '';
      console.log(`- ${peer.agent_id}${suffix}`);
      console.log(`  名稱: ${peer.display_name || peer.agent_id}`);
      console.log(`  lane: ${peer.lane || `from_${peer.agent_id}`}`);
      console.log(`  狀態: ${peer.status || 'active'} / ${peer.peer_state || 'unknown'}`);
      if (peer.path) console.log(`  peer card: ${peer.path}`);
      if (peer.error) console.log(`  ⚠️ 讀取錯誤: ${peer.error}`);
    }
    if (output.peers.length === 0) console.log('📭 尚未找到 peer。');
    console.log('');
    console.log('🚀 下一步:如要邀請新協作對象,在 AI 工具說「邀請新協作者」。AI 會生成一次加入邀請,讓對方自行確認用戶名稱。`peer add` 只屬維護 / 兼容,不要作為新人邀請選項。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ peers 失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'peer') {
  const action = args[0];
  if (action !== 'invite' && action !== 'add' && action !== 'starter') {
    console.error('❌ peer 子命令只支援 `invite`、`add` 或 `starter`。');
    console.error('💡 一般邀請:在 AI 工具說「邀請新協作者」;CLI 備用命令是 `npx aps peer invite`。');
    console.error('💡 維護 / 兼容:只有已明確約定對方用戶名稱時才用 `npx aps peer add --agent-id <id>`。');
    process.exit(1);
  }
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const localAgentId = flagOrConfig('--local-agent-id', 'agentId', config);
  const dryRun = hasFlag('--dry-run');
  if (action === 'invite') {
    requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--local-agent-id': localAgentId });
    const errors = [
      validateSnakeCase('--project', projectSlug),
      validateSnakeCase('--local-agent-id', localAgentId),
    ].filter(Boolean);
    if (errors.length > 0) {
      for (const error of errors) console.error(error);
      process.exit(1);
    }
    try {
      const inviteValues = { ...config, hubRoot, projectSlug, agentId: localAgentId, otherAgentId: null };
      const { record: inviteRecord, recordPath } = createInviteRecord({
        hubRoot,
        projectSlug,
        inviterAgentId: localAgentId,
        dryRun,
      });
      const inviteTarget = path.join(hubRoot, '_hub', `open-invite-${projectSlug}.md`);
      const uniqueInviteTarget = path.join(inviteDir(hubRoot, projectSlug), `${inviteRecord.invite_code}.md`);
      const inviteMessage = openInviteContent(inviteValues, inviteRecord);
      const steps = [
        ensureDirectory(path.join(hubRoot, '_hub'), dryRun),
        writeFileOrUpdate(peerCardPath(hubRoot, projectSlug, localAgentId), peerCardJson({
          projectSlug,
          agentId: localAgentId,
          displayName: localAgentId,
          peerState: 'confirmed',
        }), dryRun),
        dryRun
          ? { ok: true, path: recordPath, message: `would write invite record ${recordPath}` }
          : { ok: true, path: recordPath, message: `wrote invite record ${recordPath}` },
        writeFileOrUpdate(uniqueInviteTarget, inviteMessage, dryRun),
        writeFileOrUpdate(inviteTarget, inviteMessage, dryRun),
      ];
      console.log(`📨 APS peer invite: ${projectSlug}`);
      for (const result of steps) console.log(formatSetupResult(result));
      console.log('');
      console.log(`🔑 invite code: ${inviteRecord.invite_code}`);
      console.log(`📄 invite: ${inviteTarget}`);
      console.log(`📄 invite record: ${recordPath}`);
      console.log('ℹ️ 這是一次加入邀請,不會預先建立對方的 lane、ack 或 peer card。對方會在自己的電腦選定用戶名稱並完成設定。');
      console.log('🚀 下一步:把下面整段邀請傳給對方;對方完成後,在 AI 工具說「Check APS」查看是否已加入。熟悉終端機時才把 peers 命令當備用檢查。');
      console.log('');
      console.log('--- 可轉發邀請開始 ---');
      console.log(inviteMessage.trimEnd());
      console.log('--- 可轉發邀請結束 ---');
      process.exit(0);
    } catch (err) {
      console.error(`❌ peer invite 失敗:${err.message}`);
      process.exit(1);
    }
  }
  requireFlags(['--agent-id']);
  const peerId = getRequiredFlagValue('--agent-id');
  const displayName = getFlagValue('--display-name', peerId);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--local-agent-id': localAgentId, '--agent-id': peerId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--local-agent-id', localAgentId),
    validateSnakeCase('--agent-id', peerId),
    validateDistinctAgents(localAgentId, peerId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const starterValues = { ...config, hubRoot, projectSlug, agentId: localAgentId, otherAgentId: peerId };
    const starterTarget = path.join(hubRoot, '_hub', `starter-pack-${projectSlug}-${peerId}.md`);
    const steps = [];
    if (action === 'add') {
      steps.push(...ensurePeerArtifacts({
        hubRoot,
        projectSlug,
        agentId: peerId,
        displayName,
        peerState: 'provisional',
        dryRun,
      }));
    }
    steps.push(writeFileOrUpdate(starterTarget, starterPackContent(starterValues), dryRun));
    console.log(action === 'add' ? `👥 APS peer add: ${peerId}` : `📦 APS peer starter: ${peerId}`);
    for (const result of steps) console.log(formatSetupResult(result));
    console.log('');
    console.log(`📄 starter pack: ${starterTarget}`);
    if (action === 'add') {
      const preservedConfirmed = steps.some((result) => result && result.preserved);
      if (preservedConfirmed) {
        console.log('✅ 狀態: confirmed 已保留。對方已在自己的電腦完成加入;請先用「Check APS」核對,再發 `shared_goal_and_roles` 確認共同基準。');
      } else {
        console.log('⚠️ 狀態: provisional。對方仍須在自己的電腦完成 APS 安裝 / 加入,才可視為 confirmed peer。');
      }
    } else {
      console.log('ℹ️ 只重新生成維護用 starter pack,未建立或改動 peer。若這是一般新協作者,請改用一次加入邀請碼,不要用 starter pack 作主流程。');
    }
    console.log('🚀 下一步:starter pack 只屬維護 / 兼容路徑。一般新協作者請改用一次加入邀請碼;對方完成後,由對方在自己的 AI 工具輸入「Check APS」或「check Drive」。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ peer ${action} 失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'publish') {
  requireFlags(['--topic']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const fromId = getRequiredFlagValue('--from') || getRequiredFlagValue('--agent-id') || config.agentId || null;
  const explicitTo = getRequiredFlagValue('--to');
  const toId = explicitTo || getRequiredFlagValue('--other-agent-id') || config.otherAgentId || null;
  const topic = getRequiredFlagValue('--topic');
  let body;
  let itemsInput;
  try {
    body = readBodyInput();
    itemsInput = readItemsInput();
  } catch (err) {
    console.error(`❌ 發佈失敗:${err.message}`);
    process.exit(1);
  }
  const level = getFlagValue('--level', 'L2-aps-packet');
  const strictHandoff = hasFlag('--strict-handoff');
  const handoffReport = handoffReadinessReport(body, itemsInput.items);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--from': fromId });
  if (!toId) {
    // No recipient resolved: actionable guidance, not a cryptic "Missing required values: --to".
    let peers = [];
    try {
      peers = listProjectPeers({ hubRoot, projectSlug, config: { ...config, agentId: fromId } }).peers
        .filter((peer) => peer.agent_id && peer.agent_id !== fromId);
    } catch (err) { /* listing is best-effort for the hint */ }
    console.error('❌ 未指定收件對象。每個 APS 交接包都要交畀一位協作對象。');
    if (peers.length > 0) {
      console.error('本項目目前的協作對象:');
      for (const peer of peers) console.error(`  - ${peer.agent_id} (${peer.status || 'active'} / ${peer.peer_state || 'unknown'})`);
      console.error('用 `npx aps publish --to <對方> --topic ... --body-file ...` 指定收件對象。');
    } else {
      console.error('本項目仲未有協作對象。');
    }
    console.error('想邀請新人?請在 AI 工具說「邀請新協作者加入這個項目」;CLI invite 只屬備用命令。`peer add` 只作維護 / 兼容,不要當成新人邀請選項。');
    process.exit(1);
  }
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--from', fromId),
    validateSnakeCase('--to', toId),
    validateTopic(topic),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  if (strictHandoff && !handoffReport.ready) {
    console.error('❌ 發佈失敗:交接資料未齊。');
    printHandoffReadiness(handoffReport, console.error);
    console.error('請先補齊共同目標、雙方任務邊界、--items 待辦、可共享真源指標、接收方開工條件與風險,再重試。');
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: fromId,
    commandName: 'publish',
    errorPrefix: '❌ 發佈失敗',
  });
  try {
    // Recipient reachability runs for every resolved recipient. An explicit --to (the new
    // multi-peer path) blocks on failure; the old config-default partner (fallback) only warns,
    // so the established two-person "publish then invite" flow is never hard-blocked.
    {
      const peer = findPeer({ hubRoot, projectSlug, config: { ...config, agentId: fromId }, agentId: toId });
      const reach = peerReachableForPublish({ peer, hubRoot, projectSlug, toId });
      if (!reach.ok) {
        if (explicitTo) {
          throw new Error(reach.reason);
        }
        console.log(`⚠️ ${reach.reason}`);
    } else if (reach.warn) {
        console.log(`⚠️ ${reach.warn}`);
      }
    }
    if (!strictHandoff && !handoffReport.ready) {
      printHandoffReadiness(handoffReport);
      console.log('⚠️ 非嚴格模式會繼續寫入。AI 主流程應使用 `--strict-handoff`,避免把含糊交接發給新手 peer。');
      console.log('');
    }
    // Participation self-confirms: when we publish as the locally configured agent (identity
    // not overridden via --from / --agent-id), mark our own peer card confirmed so the other
    // side can reply to us. Never touches the counterpart's card.
    if (fromId && fromId === config.agentId && !getRequiredFlagValue('--from') && !getRequiredFlagValue('--agent-id')) {
      try { selfConfirmPeer({ hubRoot, projectSlug, agentId: fromId }); } catch (err) { /* non-fatal */ }
    }
    const result = writePacket({ hubRoot, projectSlug, fromId, toId, topic, body, level, items: itemsInput.items });
    const notice = receiverNotice({
      projectSlug,
      topic,
      packetId: result.packetId,
      version: result.version,
      label: '放了一個新交接包',
      fromId,
      toId,
      summary: noticeSummaryFromBody(body, topic),
      attention: noticeAttentionFromBody(body),
    });
    console.log(`✅ 已發佈 ${result.packetId} v${result.version}`);
    if (strictHandoff || handoffReport.ready) {
      printHandoffReadiness(handoffReport);
    }
    console.log(`📦 交接包: ${result.packetDir}`);
    console.log(`📋 已申報項目: ${result.items.length ? result.items.join(' / ') : '(無 — 如要列明請對方做的事,可加 --items "甲;乙")'}`);
    console.log('');
    console.log('📣 可直接複製貼上的通知訊息:');
    console.log(notice);
    console.log('');
    console.log('📧 Email 主旨: APS 有新交接包');
    console.log(`📧 Email 正文: ${notice}`);
    console.log('');
    console.log('🚀 下一步:把上面的通知訊息複製貼上到 Telegram、WhatsApp、Email 或你們平常使用的通訊工具。由收件人本人決定何時叫自己的 AI `check Drive`;CLI inbox 命令只作排錯備用。');
  } catch (err) {
    console.error(`❌ 發佈失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (subcommand === 'revise') {
  requireFlags(['--packet-id', '--reason']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  let body;
  let itemsInput;
  try {
    body = readBodyInput();
    itemsInput = readItemsInput();
  } catch (err) {
    console.error(`❌ 修訂失敗:${err.message}`);
    process.exit(1);
  }
  const clearItems = hasFlag('--clear-items');
  if (itemsInput.provided && clearItems) {
    console.error('❌ 修訂失敗:--items / --items-file 與 --clear-items 不可同時使用。');
    process.exit(1);
  }
  const reason = getRequiredFlagValue('--reason');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: agentId,
    commandName: 'revise',
    errorPrefix: '❌ 修訂失敗',
  });
  try {
    const output = revisePacket({ hubRoot, projectSlug, agentId, packetId, body, reason, items: itemsInput.items, itemsProvided: itemsInput.provided, clearItems });
    const notice = receiverNotice({
      projectSlug,
      topic: packetId,
      packetId,
      version: output.version,
      label: '修訂了一個交接包',
      fromId: agentId,
      toId: output.toId,
      summary: noticeSummaryFromBody(body, packetId),
      attention: noticeAttentionFromBody(body),
    });
    console.log(`✅ 已修訂 ${packetId}: v${output.previousVersion} -> v${output.version}`);
    console.log(`📦 交接包: ${output.packetDir}`);
    console.log(`📋 項目: ${output.items.length ? output.items.join(' / ') : '(無)'}${(itemsInput.provided || clearItems) ? '' : ' (沿用上一版)'}`);
    console.log('');
    console.log('📣 可直接複製貼上的通知訊息:');
    console.log(notice);
    console.log('');
    console.log('🚀 下一步:請把通知貼給對方,由對方本人決定何時叫自己的 AI「check Drive」。命令列備用做法是請對方執行 `npx aps inbox`;最新未讀版本會重新顯示為待處理項目。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 修訂失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'inbox') {
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const otherAgentId = getRequiredFlagValue('--from') || flagOrConfig('--other-agent-id', 'otherAgentId', config);
  // With no explicit --from and no default counterpart (a solo project), scan all known peers so
  // `aps inbox` never fails cryptically just because no counterpart is configured yet.
  const allSources = hasFlag('--all') || !otherAgentId;
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    allSources ? null : validateSnakeCase('--from/--other-agent-id', otherAgentId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  let exitCode = 0;
  try {
    const groups = allSources
      ? pendingPacketsFromAllPeers({ hubRoot, projectSlug, agentId, config: { ...config, agentId } })
      : [{ from: otherAgentId, pending: pendingPackets({ hubRoot, projectSlug, agentId, otherAgentId }) }];
    let contextReport = null;
    try {
      contextReport = readProjectContext({ hubRoot, projectSlug });
    } catch (_) {
      contextReport = null;
    }
    const total = groups.reduce((count, group) => count + group.pending.length, 0);
    console.log(renderInboxDailyBrief({ agentId, total, groups, contextReport }));
    console.log('');
    if (total === 0) {
      console.log(`📭 APS 共用 Drive 資料夾: ${agentId} 沒有待處理項目`);
    } else {
      console.log(`📬 APS 共用 Drive 資料夾: ${agentId} 有 ${total} 個待處理項目`);
      console.log('');
      console.log('🔎 收件總覽');
      let index = 1;
      for (const group of groups) {
        for (const item of group.pending) {
          console.log(`${index}. ${group.from} / ${item.packetId.replace(/^\d{8}T\d{6}Z__/, '')} / v${item.version}`);
          index += 1;
        }
      }
      console.log('');
      index = 1;
      for (const group of groups) {
        for (const item of group.pending) {
          console.log(renderHumanInboxItem(item, group.from, index, total));
          console.log('');
          index += 1;
        }
      }
      const hasSharedGoalPending = groups.some((group) => group.pending.some((item) => isSharedGoalInboxItem(item)));
      if (hasSharedGoalPending) {
        console.log('✅ 若是共同目標與分工確認,先決定同意、部分同意需修改、有異議或稍後處理；不要把它標成普通 done。');
        console.log('排錯時才需要用命令:npx aps consume --packet-id <id> --version <n> --result "<同意哪一版共同目標與分工>"');
      } else {
        console.log('✅ 通過檢查後,可以叫 AI 標記已處理。排錯時才需要用命令:npx aps consume --packet-id <id> --version <n> --result "<具體處理結果>"');
      }
    }
  } catch (err) {
    console.error(`❌ 收件檢查失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(exitCode);
}

if (subcommand === 'status') {
  requireFlags(['--packet-id']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const output = packetStatus({ hubRoot, projectSlug, agentId, packetId });
    console.log(`🔎 APS 交接狀態: ${packetId}`);
    console.log(`📦 最新版本: v${output.version}`);
    console.log(`👤 發送方: ${output.fromId}`);
    console.log(`🤝 收件 peer: ${output.toId || '(未能判斷)'}`);
    console.log(`📄 交接包: ${output.packetPath}`);
    console.log(`📄 outbox: ${output.outboxPath}`);
    if (output.ackPath) console.log(`📄 收件方 ack: ${output.ackPath}`);
    console.log('');
    if (output.withdrawn) {
      console.log('⚠️ 狀態: 最新版本已撤回。');
    } else if (output.closed) {
      console.log(`✅ 狀態: 已收結。原因: ${output.closed.kv.reason || '(未記錄)'}`);
    } else if (output.declined) {
      console.log(`❌ 狀態: 收件方已退回 / 不能處理。原因: ${output.declined.reason || '(未記錄)'}`);
      console.log(`🕒 退回時間: ${output.declined.at || '(未記錄)'}`);
    } else if (output.consumed) {
      console.log(`✅ 狀態: 收件方已標記處理。結果: ${output.consumed.result || '(未記錄)'}`);
      console.log(`🕒 處理時間: ${output.consumed.at || '(未記錄)'}`);
    } else {
      console.log('📭 狀態: 尚未看到收件方處理此最新版本。');
    }
    console.log('');
    console.log('🔎 備註:目前 v1 協定不可靠推斷「是否已回覆」,除非對方另發回覆 packet 或原發包方收結。');
    console.log('🚀 下一步:如要提醒對方,請重新傳送摘要式人類通知;不要自動觸發對方 AI。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 狀態查詢失敗:${err.message}`);
    if (String(err.message || '').includes('was not found in from_')) {
      console.error('🔎 提示:`status --packet-id` 只查本機 agent 自己發出的交接包。若要看對方交來的新內容,請用 `npx aps inbox --all` 或 `npx aps inbox --from <agent_id>`。');
    }
    process.exit(1);
  }
}

if (subcommand === 'dashboard') {
  console.log('🧭 APS dashboard 已退役');
  console.log('✅ 未寫入任何 dashboard HTML。');
  console.log('🔎 日常狀態請用 `npx aps check-aps`，它會直接在 terminal 顯示可行動摘要。');
  console.log('📡 需要即時協調時，`check-aps` 會按需生成 APS Live 交接追蹤頁。');
  console.log('⚠️ 邊界: `_context/dashboard.html` 與 `_context/dashboard_<agent>.html` 不再屬於現行 APS 產品路徑。');
  process.exit(0);
}

if (subcommand === 'check-aps') {
  const full = args.includes('--full');
  if (args.includes('--demo-preview')) {
    const scenario = getFlagValue('--scenario', 'handoff-blocked');
    console.log('🧪 Demo preview: 以下是假資料示範，只用來檢查 Check APS 第一屏是否易懂；不讀 .aps/config.json，不寫共用 Drive，不更新 HTML。');
    console.log(`🔎 示範場景: ${scenario === 'shared-goal' ? '共同目標與分工確認' : '交接資料不足'}`);
    console.log('');
    console.log('📄 HTML dashboard 已退役；demo preview 不會生成 dashboard HTML。');
    console.log('');
    console.log(renderProjectDashboardSummary(buildCheckApsDemoDashboard(scenario), { full, demoPreview: true }));
    process.exit(0);
  }
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const otherAgentId = flagOrConfig('--other-agent-id', 'otherAgentId', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const dashboardConfig = { ...config, hubRoot, projectSlug, agentId, otherAgentId };
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    otherAgentId ? validateSnakeCase('--other-agent-id', otherAgentId) : null,
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const dashboard = buildDashboardData({ hubRoot, projectSlug, agentId, config: dashboardConfig });
    const pendingItems = dashboard.incomingGroups.flatMap((group) => group.pending.map((item) => ({ ...item, from: group.from })));
    const riskRecords = dashboardRiskRecords({
      incomingGroups: dashboard.incomingGroups,
      contextReport: dashboard.contextReport,
      peers: dashboard.peers,
      identityIssues: dashboard.identityIssues,
      sharedGoal: dashboard.sharedGoal,
    });
    const shouldGenerateLive = checkApsHasLiveCandidate({
      pendingItems,
      outgoingPackets: dashboard.outgoingPackets,
      riskRecords,
      sharedGoal: dashboard.sharedGoal,
      peers: dashboard.peers,
      agentId,
    });
    const liveResult = shouldGenerateLive
      ? writeApsLiveHtml({ hubRoot, projectSlug, agentId, config: dashboardConfig, dashboard })
      : null;
    console.log('🧭 APS 狀態已在 terminal 顯示');
    console.log('- HTML dashboard 已退役；不再生成舊 dashboard 頁。');
    if (liveResult) console.log(`- APS Live: ${liveResult.livePath}`);
    console.log('🔎 不用打開 HTML 也可以繼續；真正操作仍在這個 AI terminal。');
    console.log('⚠️ 注意:這不是背景自動監察;只有你要求 Check APS 時才重新讀取和生成。');
    console.log('');
    const liveQueueItems = readApsLiveQueueItems({ hubRoot, projectSlug });
    console.log(renderProjectDashboardSummary(dashboard, {
      full,
      liveQueueItems,
      livePath: liveResult ? liveResult.livePath : null,
      liveGenerated: Boolean(liveResult),
    }));
  } catch (err) {
    console.error(`❌ Check APS 失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (subcommand === 'live') {
  const liveOutputFlag = getRequiredFlagValue('--output');
  const liveOutputPath = liveOutputFlag ? path.resolve(process.cwd(), liveOutputFlag) : null;
  const dryRun = args.includes('--dry-run');
  const bridgePort = Number(getFlagValue('--bridge-port', getFlagValue('--port', '47879')));
  if (args.includes('--demo-preview')) {
    const scenario = getFlagValue('--scenario', 'shared-goal');
    const outputPath = liveOutputPath || path.resolve(process.cwd(), 'aps-live-demo.html');
    let livePath = null;
    let snapshot = null;
    try {
      const demoDashboard = buildCheckApsDemoDashboard(scenario);
      const result = writeApsLiveHtml({
        hubRoot: '(demo preview)',
        projectSlug: 'demo_project',
        agentId: 'adam',
        config: {},
        demo: true,
        outputPath,
        dryRun,
        dashboard: demoDashboard,
      });
      livePath = result.livePath;
      snapshot = result.snapshot;
    } catch (err) {
      console.error(`❌ APS Live demo 生成失敗:${err.message}`);
      process.exit(1);
    }
    console.log('🧪 APS Live 交接追蹤頁示範');
    console.log(`🔎 示範場景: ${scenario === 'shared-goal' ? '共同目標與分工確認' : '交接資料不足'}`);
    console.log(dryRun ? '✅ dry-run 通過：已檢查 APS Live 交接追蹤頁示範方案。' : '✅ 已生成 APS Live 交接追蹤頁示範。');
    console.log(dryRun ? `📄 將生成 HTML: ${livePath}` : `📄 HTML: ${livePath}`);
    console.log('🔎 這是假資料示範；不讀 .aps/config.json，不寫共用 Drive，不更新 packet / outbox / ack。');
    console.log('📡 Trystero 是 APS Live 主流程；連不上就不能當成對方已看到或已確認，只能保留可複製資料。');
    console.log('🔎 注意:連接 Trystero room 後可做即時核對；正式紀錄仍要回到本機 AI / Drive 流程更新。');
    if (dryRun) {
      console.log('🧪 dry-run: 未寫入 HTML，未建立資料夾，未改正式 APS 狀態。');
      console.log(`🔎 狀態欄位: ${Object.keys(snapshot).join(', ')}`);
      console.log(`🚀 dry-run 下一句: ${snapshot.proposed_terminal_action}`);
    } else {
      console.log('🚀 下一步: 打開此 HTML，先看交接進度和目前站點，再按「連接 APS Live」測試即時核對；未連接時可用本機預覽。');
    }
    process.exit(0);
  }
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const otherAgentId = flagOrConfig('--other-agent-id', 'otherAgentId', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const liveConfig = { ...config, hubRoot, projectSlug, agentId, otherAgentId };
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    otherAgentId ? validateSnakeCase('--other-agent-id', otherAgentId) : null,
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const { livePath, snapshot } = writeApsLiveHtml({ hubRoot, projectSlug, agentId, config: liveConfig, outputPath: liveOutputPath, dryRun, bridgePort });
    console.log('📡 APS Live 交接追蹤頁');
    console.log(dryRun ? '✅ dry-run 通過：已檢查 APS Live 交接追蹤頁生成方案。' : '✅ 已生成 APS Live 交接追蹤頁。');
    console.log(dryRun ? `📄 將生成 HTML: ${livePath}` : `📄 HTML: ${livePath}`);
    console.log('🔎 這頁先顯示交接單、目前站點、等誰行動和事件紀錄；需要即時同步、回饋或建立共識時使用。不寫 packet / outbox / ack，也不代表 Drive 已同步。');
    console.log('📡 Trystero 是 APS Live 主流程；連不上就不能當成對方已看到或已確認，只能保留可複製資料。');
    if (apsLiveHasClearBlocker(snapshot)) {
      console.log(`🔎 建議使用原因: ${snapshot.blocker}`);
    } else {
      console.log('🔎 目前未見必須由 Live 解決的交接卡點；可先回到本機 AI / terminal 推進正式 APS 動作。');
    }
    console.log('🔎 注意:連接 Trystero room 後可做即時核對；正式紀錄仍要回到本機 AI / Drive 流程更新。');
    if (!dryRun) {
      console.log(`📥 本機 AI 接收器: 另開 terminal 執行 \`npx aps live-bridge --port ${bridgePort}\`，Live 頁即可一鍵送入本機待處理佇列。`);
    }
    if (dryRun) {
      console.log('🧪 dry-run: 未寫入 HTML，未建立資料夾，未改正式 APS 狀態。');
      console.log(`🔎 狀態欄位: ${Object.keys(snapshot).join(', ')}`);
    }
    console.log('');
    console.log('🚀 回到本機 AI 可直接說:');
    console.log('```');
    console.log(snapshot.proposed_terminal_action);
    console.log('```');
  } catch (err) {
    console.error(`❌ APS Live 生成失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (subcommand === 'live-queue') {
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug });
  const errors = [
    validateSnakeCase('--project', projectSlug),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const items = readApsLiveQueueItems({ hubRoot, projectSlug, limit: Number(getFlagValue('--limit', '8')) || 8 });
    console.log(renderApsLiveQueueReport(items));
  } catch (err) {
    console.error(`❌ APS Live 佇列讀取失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (subcommand === 'context') {
  const action = contextActionFromArgs(args);
  if (!action) {
    console.error('❌ context 子命令只支援 `check`、`add` 或 `html`;不加子命令時顯示唯讀摘要。');
    console.error('💡 例子: npx aps context check');
    console.error('💡 例子: npx aps context add --from-packet <id> --version <n>');
    console.error('💡 例子: npx aps context html');
    process.exit(1);
  }
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  if (action === 'add') {
    requireFlags(['--from-packet', '--version']);
    const packetId = getRequiredFlagValue('--from-packet');
    const version = Number(getRequiredFlagValue('--version'));
    const addErrors = [
      validatePacketId(packetId),
      Number.isInteger(version) && version > 0 ? null : '--version must be a positive integer.',
    ].filter(Boolean);
    if (addErrors.length > 0) {
      for (const error of addErrors) console.error(error);
      process.exit(1);
    }
    let addExitCode = 0;
    try {
      const result = appendContextEntryFromPacket({ hubRoot, projectSlug, agentId, packetId, version });
      console.log('🧭 APS Project Context Index');
      if (result.skipped) {
        console.log('✅ 背景索引已存在,未重複新增。');
      } else {
        console.log('✅ 已從 packet 生成背景索引。');
      }
      console.log(`📄 context log: ${result.filePath}`);
      console.log(`🔗 來源: ${result.sourceRef}`);
      console.log('⚠️ 注意:context 只作背景索引;真正執行仍以 packet / outbox / ack 為準。');
    } catch (err) {
      console.error(`❌ context add 失敗:${err.message}`);
      process.exit(1);
    }
    process.exit(addExitCode);
  }
  if (action === 'html') {
    let htmlExitCode = 0;
    try {
      const report = readProjectContext({ hubRoot, projectSlug });
      const outputPath = writeContextOverviewHtml({ hubRoot, projectSlug, report });
      console.log('🧭 APS Project Context Index');
      console.log('✅ 已生成唯讀 HTML 大局速覽。');
      console.log(`📄 HTML: ${outputPath}`);
      console.log('⚠️ 注意:HTML 只作人類閱讀快照;真正執行仍以 packet / outbox / ack 為準。');
    } catch (err) {
      console.error(`❌ context html 失敗:${err.message}`);
      process.exit(1);
    }
    process.exit(htmlExitCode);
  }
  let exitCode = 0;
  try {
    const report = readProjectContext({ hubRoot, projectSlug });
    printContextReport(report, action === 'check' ? 'check' : 'summary');
    const hasErrors = report.issues.some((issue) => issue.severity === 'error');
    exitCode = action === 'check' && hasErrors ? 1 : 0;
  } catch (err) {
    console.error(`❌ context 檢查失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(exitCode);
}

if (subcommand === 'consume') {
  requireFlags(['--packet-id', '--version', '--result']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  const version = Number(getRequiredFlagValue('--version'));
  const result = getRequiredFlagValue('--result');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
    Number.isInteger(version) && version >= 1 ? null : '--version must be an integer >= 1.',
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: agentId,
    commandName: 'consume',
    errorPrefix: '❌ 標記處理失敗',
  });
  try {
    const output = consumePacket({ hubRoot, projectSlug, agentId, packetId, version, result });
    // Participation self-confirms: consuming as the locally configured agent confirms our own card.
    if (agentId === config.agentId && !getRequiredFlagValue('--agent-id')) {
      try { selfConfirmPeer({ hubRoot, projectSlug, agentId }); } catch (err) { /* non-fatal */ }
    }
    console.log(output.already ? `✅ 已標記過 ${packetId} v${version}` : `✅ 已標記處理 ${packetId} v${version}`);
    console.log(`📄 ack: ${output.ackPath}`);
    console.log('');
    console.log('🚀 下一步:如需要回覆對方,請優先在 AI 工具中說「幫我回覆這個 APS 交接」。命令列備用做法是 `npx aps publish ...`;如事情已完成,請原發包方收結原交接。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 標記處理失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'decline') {
  requireFlags(['--packet-id', '--version', '--reason']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  const version = Number(getRequiredFlagValue('--version'));
  const reason = getRequiredFlagValue('--reason');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
    Number.isInteger(version) && version >= 1 ? null : '--version must be an integer >= 1.',
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: agentId,
    commandName: 'decline',
    errorPrefix: '❌ 退回失敗',
  });
  try {
    const output = declinePacket({ hubRoot, projectSlug, agentId, packetId, version, reason });
    if (agentId === config.agentId && !getRequiredFlagValue('--agent-id')) {
      try { selfConfirmPeer({ hubRoot, projectSlug, agentId }); } catch (err) { /* non-fatal */ }
    }
    console.log(output.already ? `✅ 已退回過 ${packetId} v${version}` : `✅ 已退回 ${packetId} v${version}`);
    console.log(`📄 ack: ${output.ackPath}`);
    console.log('');
    console.log('🚀 下一步:通知原發包方用 `revise` 修訂、`withdraw` 撤回,或在確認不用再跟進時 `close` 收結。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 退回失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'withdraw') {
  requireFlags(['--packet-id', '--reason']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  const versionArg = getRequiredFlagValue('--version');
  const version = versionArg ? Number(versionArg) : null;
  const reason = getRequiredFlagValue('--reason');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
    version === null || (Number.isInteger(version) && version >= 1) ? null : '--version must be an integer >= 1 when provided.',
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: agentId,
    commandName: 'withdraw',
    errorPrefix: '❌ 撤回失敗',
  });
  try {
    const output = withdrawPacket({ hubRoot, projectSlug, agentId, packetId, version, reason });
    console.log(`✅ 已撤回 ${packetId} v${output.version}`);
    console.log(`📄 outbox: ${output.outboxPath}`);
    console.log('');
    console.log(`🔎 已在可用時檢查接收方 ack: ${output.ackPath}`);
    console.log('🚀 下一步:請通知對方在自己電腦的 AI 工具中說「check Drive」。這個版本不應再顯示為待處理項目。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 撤回失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'close') {
  requireFlags(['--packet-id', '--reason']);
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const packetId = getRequiredFlagValue('--packet-id');
  const reason = getRequiredFlagValue('--reason');
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    validatePacketId(packetId),
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  enforceLocalAgentIdentityOrExit({
    config,
    requestedAgentId: agentId,
    commandName: 'close',
    errorPrefix: '❌ 收結失敗',
  });
  try {
    const output = closePacket({ hubRoot, projectSlug, agentId, packetId, reason });
    console.log(`✅ 已收結 ${packetId} v${output.version}`);
    console.log(`📄 outbox: ${output.outboxPath}`);
    console.log('');
    console.log('🚀 下一步:雙方可再說「check Drive」或執行 `npx aps inbox`;已收結的交接不應再顯示為待處理項目。');
    process.exit(0);
  } catch (err) {
    console.error(`❌ 收結失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'doctor') {
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const otherAgentId = flagOrConfig('--other-agent-id', 'otherAgentId', config);
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug, '--agent-id': agentId });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    validateSnakeCase('--agent-id', agentId),
    otherAgentId ? validateSnakeCase('--other-agent-id', otherAgentId) : null,
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    const output = doctorHub({ hubRoot, projectSlug, agentId, otherAgentId });
    let failed = 0;
    console.log(`🩺 APS 共用 Drive 資料夾 doctor v${packageVersion}`);
    console.log(`📄 設定檔: ${configPath()}`);
    console.log(`☁️ 共用 Drive 資料夾 root: ${hubRoot}`);
    console.log(`📁 APS 合作目錄: ${projectSlug}`);
    console.log(`👤 本機 agent: ${agentId}`);
    console.log('');
    console.log('🔧 本機核心檢查:');
    for (const check of output.coreChecks) {
      console.log(`${check.ok ? '✅ 正常' : '❌ 缺少'}  ${check.label}: ${check.path}`);
      if (!check.ok) failed += 1;
    }
    if (output.conflicts.length > 0) {
      console.log('');
      console.log('⚠️ 找到疑似衝突檔名:');
      for (const filePath of output.conflicts) console.log(`- ${filePath}`);
      failed += 1;
    } else {
      console.log('');
      console.log('✅ 沒有找到疑似衝突檔名。');
    }
    const identityErrors = output.identityIssues.filter((issue) => issue.severity === 'error');
    if (output.identityIssues.length > 0) {
      console.log('');
      console.log('⚠️ 身份結構檢查:');
      for (const issue of output.identityIssues) {
        console.log(`${issue.severity === 'error' ? '❌' : '⚠️'} ${issue.owner || 'identity'}: ${issue.message}`);
        console.log(`   建議: ${issue.next}`);
      }
      failed += identityErrors.length;
    } else {
      console.log('');
      console.log('✅ 身份結構檢查未見 lane / ack / peer card 錯配。');
    }
    console.log('');
    console.log('🤝 協作對象狀態 (僅供參考,不影響本機健康):');
    if (output.peerChecks.length === 0) {
      console.log('  📭 尚未邀請協作對象。想邀請協作者時,在 AI 工具說「邀請新協作者加入這個項目」即可。AI 會生成一次加入邀請,對方自行確認用戶名稱；`peer add` 只屬維護 / 兼容。');
    } else {
      for (const peer of output.peerChecks) {
        console.log(`  - ${peer.peerId} (${peer.state})${peer.allOk ? '' : ' ⚠️ 通道未齊'}`);
        for (const check of peer.checks) {
          if (!check.ok) console.log(`      ⚠️ 缺少 ${check.label}: ${check.path}`);
        }
      }
    }
    console.log('');
    if (failed === 0) {
      console.log('✅ 狀態: 通過 (本機核心齊全)');
      console.log('🚀 下一步:請優先在 AI 工具中輸入「教我用 APS」。AI 應先讀現有設定,再檢查收件箱,用總覽、摘要、預檢、細節與下一步整理結果。');
      console.log('🤝 想邀請協作者:在 AI 工具說「邀請新協作者加入這個項目」。AI 會生成一次加入邀請,對方自行確認用戶名稱；`peer add` 只屬維護 / 兼容。');
      console.log('💡 其他備用命令:`npx aps inbox`、`npx aps publish --to <對方> --topic ... --body-file ... --items "甲;乙"`、`npx aps consume ...`、`npx aps revise --body-file ...`、`npx aps config`。');
    } else {
      console.log('❌ 狀態: 未通過 (本機核心有缺)');
      console.log('🚀 下一步:先修正上面本機核心缺少的路徑或疑似衝突檔,再繼續使用 APS。不要在未檢查內容前刪除衝突檔。');
      console.log('💡 提示:如果剛剛重新執行過 `npx aps init`,請確認上方「APS 合作目錄」是否就是你剛才建立的合作目錄。');
    }
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error(`❌ doctor 失敗:${err.message}`);
    process.exit(1);
  }
}

if (subcommand === 'live-bridge') {
  const config = loadConfigOrExit();
  const hubRoot = flagOrConfig('--hub-root', 'hubRoot', config);
  const projectSlug = flagOrConfig('--project', 'projectSlug', config);
  const port = Number(getFlagValue('--port', getFlagValue('--bridge-port', '47879')));
  requireValues({ '--hub-root': hubRoot, '--project': projectSlug });
  const errors = [
    validateSnakeCase('--project', projectSlug),
    Number.isInteger(port) && port > 0 && port < 65536 ? null : '--port must be a number from 1 to 65535.',
  ].filter(Boolean);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  try {
    startApsLiveBridge({ hubRoot, projectSlug, port });
  } catch (err) {
    console.error(`❌ APS Live 本機 AI 接收器啟動失敗:${err.message}`);
    process.exit(1);
  }
} else {
  console.error(`❌ 不認識的子命令: ${subcommand}`);
  console.error('💡 請先執行: npx aps --help');
  process.exit(1);
}
