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
      warn: `⚠️ 高風險: ${commandName} 正在用 APS 名稱 ${requestedAgentId},但本機設定是 ${configuredAgentId}。請只在維護者修復或人工審計時使用 --allow-agent-override。`,
    };
  }
  return {
    ok: false,
    warn: null,
    reason: `${commandName} 已阻擋:本機 APS 名稱是 ${configuredAgentId},但指令要求使用 ${requestedAgentId}。日常命令不可冒用其他 APS 名稱;請回到 ${configuredAgentId} 的本機項目資料夾執行。若這是維護者修復或人工審計,請明確加 --allow-agent-override。`,
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
    pattern: /(^|\n)\s*(#{1,6}\s*)?(本方任務|我方任務|發送方任務|own-side task|sender task)\s*[:：]?/i,
    allowUnknown: false,
  },
  {
    key: 'counterpart_task',
    label: '對方任務',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(對方任務|收件方任務|counterpart task|receiver task)\s*[:：]?/i,
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
    label: '證據位置',
    pattern: /(^|\n)\s*(#{1,6}\s*)?(證據位置|證據|關鍵檔案|檔案位置|版本|evidence|source|reference)\s*[:：]?/i,
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
    else if (bodyHasSection) weak.push(section.label);
    else missing.push(section.label);
  }
  const warnings = [];
  const bodyHasRequestedAction = handoffRequiredSections
    .find((section) => section.key === 'requested_action')
    .pattern.test(text);
  if (bodyHasRequestedAction && items.length === 0) {
    warnings.push('正文有「請對方做的事」,但正式交接需要用 --items 或 --items-file 明示申報,讓收件方總覽可直接看到待辦。');
  }
  const hasLocalPath = /[A-Za-z]:\\|(^|\s)\/(?:Users|home|mnt|Volumes)\//.test(text);
  const hasLocalPathBoundary = /本機路徑|只適用於本方|只適用於我方|對方不可直接使用|local path/i.test(text);
  if (hasLocalPath && !hasLocalPathBoundary) {
    warnings.push('正文似乎包含本機路徑,但沒有標明只適用於本方電腦。');
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
  lines.push('建議:先補齊交接定義卡,再發正式 APS 交接包。');
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
  console.log('👋 這一步只設定你自己這一邊,把本項目接到共用 Drive 資料夾。');
  console.log('🧭 只問三件事;最後會先列出寫入計劃,你輸入 yes 才會寫入。');
  console.log('🤝 協作對象可在設定完成後再邀請,毋須現在決定。');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    printPromptBlock({
      step: '1/3',
      title: 'Google Drive 共用資料夾',
      body: [
        '☁️  請貼上你電腦上 Google Drive 同步資料夾的完整路徑。',
        '第一次建立可新增 Agent_Public_Squares;受邀加入則貼上對方分享給你的資料夾路徑。',
        '如果資料夾未存在,工具會替你建立;不會覆蓋原有內容。',
      ],
      example: 'G:\\我的雲端硬碟\\Agent_Public_Squares',
    });
    const hubRoot = await askWithDefault(
      rl,
      '請輸入 Google Drive 共用資料夾完整路徑',
      '',
      (value) => localizeValidation(validateNoPlaceholder('--hub-root', value)) || (path.isAbsolute(value) ? null : '請貼上完整路徑,例如 G:\\我的雲端硬碟\\Agent_Public_Squares 或 C:\\Users\\你\\Google Drive\\Agent_Public_Squares。')
    );
    const defaultProject = toSnakeCase(path.basename(process.cwd()), 'aps_uat');
    printPromptBlock({
      step: '2/3',
      title: '項目代號',
      body: [
        '📌 用來在共用 Drive 資料夾內分開不同合作項目,也會成為資料夾名稱。',
        '請用小寫英文字母、數字或底線。',
      ],
      example: 'branding_2026 或 aps_uat',
    });
    const projectSlug = await askWithDefault(rl, '請輸入項目代號', defaultProject, (value) => (
      localizeValidation(validateNoPlaceholder('--project', value) || validateSnakeCase('--project', value))
    ));
    const defaultAgent = '';
    printPromptBlock({
      step: '3/3',
      title: '你自己的 APS 名稱',
      body: [
        '👤 這是你在此 APS 項目中的共享身份,由你自己決定。',
        '請用小寫英文字母、數字或底線;不要照抄別人的名稱。',
      ],
      example: 'user1 或 project_lead',
    });
    const agentId = await askWithDefault(rl, '請輸入你自己的 APS 名稱', defaultAgent, (value) => (
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
    const values = { hubRoot, projectSlug, agentId, otherAgentId: null, role: inferredRole };
    const setupHint = inferredRole === 'B'
      ? '偵測:此項目在共用資料夾已存在,而且已有其他成員先完成設定。你似乎是加入者。若你確實是第一個設定的人,可忽略此提示。'
      : null;
    console.log('');
    printDivider('📝 寫入前計劃');
    console.log(`  ☁️  共用 Drive 資料夾 root: ${values.hubRoot}`);
    console.log(`  📁 項目代號: ${values.projectSlug}`);
    console.log(`  👤 你自己: ${values.agentId}`);
    console.log('  🤝 協作對象: 尚未設定 (設定好之後隨時可以邀請)');
    console.log(`  📂 會建立或使用的共用 Drive 項目資料夾: ${projectPath}`);
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
    console.log('🤝 想搵人一齊做?隨時可以邀請對方,幾時加都可以:');
    console.log('   • 在 AI 工具直接講「邀請新協作者加入呢個項目」,AI 會生成可轉發邀請。');
    console.log('   • 或用終端機指令 `npx aps peer invite`。');
    console.log('   • 若你同對方已約定 APS 技術名稱,才用 `npx aps peer add --agent-id <對方名稱> --display-name <顯示名>`。');
    console.log('🩺 備用檢查:終端機指令是 `npx aps doctor`。請留意指令名稱是 `aps`,不是 `asp`。');
    return 0;
  } finally {
    rl.close();
  }
}

function localizeValidation(message) {
  if (!message) return null;
  return String(message)
    .replace(/--project/g, '項目代號')
    .replace(/--agent-id/g, '你的 APS 名稱')
    .replace(/--other-agent-id/g, '對方 APS 名稱')
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

function peerCardJson({ projectSlug, agentId, displayName, status = 'active', peerState = 'provisional' }) {
  return `${JSON.stringify({
    project: projectSlug,
    agent_id: agentId,
    display_name: displayName || agentId,
    lane: `from_${agentId}`,
    status,
    peer_state: peerState,
    updated_at: isoNow(),
  }, null, 2)}\n`;
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
      return `APS 名稱 ${agentId} 已有 peer card,但內容讀取失敗。請先人工檢查 ${cardPath},不要覆寫同名身份。`;
    }
  }
  const active = hasSelfActivity({ hubRoot, projectSlug, agentId });
  if (card && card.status !== 'inactive' && card.peer_state === 'provisional' && !active) {
    return null;
  }
  return `APS 名稱 ${agentId} 在這個 project 已存在。請改用另一個自己的 APS 名稱;如果這其實是你本人的既有項目,請在原本已接入 APS 的本機項目資料夾執行 \`npx aps upgrade\` 或 \`npx aps config\`,不要用新安裝覆寫同名身份。`;
}

// Three-way publish reachability for the recipient. Authorization rests on peer state and
// real activity, never on role: confirmed → send; provisional but active → send + warn;
// inactive / unregistered / no activity → block.
function peerReachableForPublish({ peer, hubRoot, projectSlug, toId }) {
  if (!peer) {
    return { ok: false, reason: `${toId} is not registered as a project peer. For a new collaborator, run \`npx aps peer invite\` and wait for them to join with their own APS name. If you already agreed this exact id with them, run \`npx aps peer add --agent-id ${toId}\`.` };
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
  return { ok: false, reason: `${toId} is ${peer.peer_state || 'not confirmed'} and has no activity yet; wait for that peer to set up (init / join) before publishing a formal packet. For ordinary new collaborators, prefer \`npx aps peer invite\` so they choose their own APS name.` };
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
  const hasEvidence = packetHasAnyHeading(body, [/(證據位置|證據|來源|reference|ssot|檔案|file)/i]) || /\bhttps?:\/\//i.test(body);
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
  if (!hasEvidence) missing.push('未列明證據或來源位置');
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
    reason: hasRisk ? '交接有任務、共同目標、證據或來源，並列出風險。' : '交接有任務、共同目標、證據或來源；未見阻塞缺口。',
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
    '先確認內容齊全、證據位置能在本機對上、要求沒有和目前任務衝突。',
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
    roles: firstLineAfterHeading(body, /(每人角色|角色|參與者|participants|roles)/i) || '未在基準包內摘出角色分工',
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
      source: 'shared_goal_and_roles',
    });
  } else if (sharedGoal && (sharedGoal.state === 'partial' || sharedGoal.state === 'incoming_pending')) {
    actions.push({
      lane: sharedGoal.state === 'incoming_pending' ? '你要確認' : '等確認',
      item: `共同目標與分工: ${sharedGoal.label}`,
      next: sharedGoal.state === 'incoming_pending'
        ? '先讀 shared_goal_and_roles 正文，確認同意、部分同意或有異議，再寫具體 ack。'
        : '先完成受影響 peer 的一對一確認，再發第一輪正式任務包。',
      source: sharedGoal.latest ? packetSourceRef(sharedGoal.latest.senderId, sharedGoal.latest.packetId, sharedGoal.latest.version) : 'shared_goal_and_roles',
    });
  }
  for (const item of pendingItems.slice(0, 5)) {
    const actionability = item.actionability || assessPendingActionability(item, { sharedGoal });
    actions.push({
      lane: actionability.label,
      item: `${item.from} → ${agentId}: ${packetTopic(item.packetId)} v${item.version}`,
      next: `${actionability.next} 可對 AI 說：「${actionabilityPromptFor(item, item.from)}」`,
      source: packetSourceRef(item.from, item.packetId, item.version),
      state: actionability.state,
      reason: actionability.reason,
    });
  }
  for (const item of outgoingPackets.filter((packet) => packet.state === 'waiting').slice(0, 5)) {
    actions.push({
      lane: '等對方',
      item: `給 ${item.toId || '(未記錄)'}: ${packetTopic(item.packetId)} v${item.version}`,
      next: '等待對方 check Drive、標記處理或另發回覆；不要把已寫入 Drive 當成對方已收到通知。',
      source: packetSourceRef(agentId, item.packetId, item.version),
    });
  }
  for (const item of outgoingPackets.filter((packet) => packet.state === 'declined').slice(0, 5)) {
    actions.push({
      lane: '對方退回',
      item: `給 ${item.toId || '(未記錄)'}: ${packetTopic(item.packetId)} v${item.version}`,
      next: `讀對方退回原因: ${item.declined.reason || '(未記錄)'}；然後用 revise 修訂、withdraw 撤回，或 close 收結。`,
      source: packetSourceRef(agentId, item.packetId, item.version),
    });
  }
  for (const record of riskRecords.slice(0, 5)) {
    actions.push({
      lane: '先核對風險',
      item: `${record.owner}: ${record.message}`,
      next: record.next,
      source: record.source,
    });
  }
  return actions.slice(0, 12);
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

function renderProjectDashboardSummary(dashboard) {
  const { hubRoot, projectSlug, agentId, contextReport, incomingGroups, outgoingPackets, peers, sharedGoal } = dashboard;
  const pendingItems = incomingGroups.flatMap((group) => group.pending.map((item) => ({ ...item, from: group.from })));
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const riskRecords = dashboardRiskRecords({ incomingGroups, contextReport, peers, identityIssues: dashboard.identityIssues, sharedGoal });
  const riskItems = riskRecords.map((record) => record.message);
  const actionItems = dashboardActionItems({ pendingItems, outgoingPackets, riskRecords, agentId, sharedGoal, peers });
  const statusLines = dashboardStatusLines({ pendingItems, outgoingPackets, riskRecords, sharedGoal });
  const lines = [
    '🧭 APS 整體狀態',
    `📁 項目: ${projectSlug}`,
    `👤 本機代理: ${agentId}`,
    '',
    '🔎 目前判斷',
    ...statusLines.map((line) => `- ${line}`),
    '',
    `🎯 共同目標與分工: ${sharedGoalProgressText(sharedGoal)}`,
    `🧩 開工判斷: ${sharedGoalCanStartText(sharedGoal)}`,
    '',
    '📊 數量摘要',
    `📬 待你處理: ${pendingItems.length}`,
    `📤 你交出去的事: ${outgoingPackets.length}`,
    `⏳ 等待對方: ${waitingOutgoing.length}`,
    `👥 協作對象: ${peers.length}`,
    `⚠️ 風險與提醒: ${riskItems.length}`,
    '',
    '🚀 待我處理',
  ];
  if (actionItems.length === 0) {
    if (peers.length === 0) {
      lines.push('- 目前未有協作對象。先建立或更新共同目標與分工；要邀請新協作者時用 `npx aps peer invite`，讓對方自行選 APS 名稱。');
    } else {
      lines.push('- 目前沒有明確下一步。若要推進，先核對共同目標與分工，再按需發出一對一交接。');
    }
  } else {
    for (const item of actionItems.slice(0, 8)) {
      lines.push(`- [${actionLaneIcon(item)} ${item.lane}] ${item.item}`);
      lines.push(`  建議: ${item.next}`);
      if (item.reason) lines.push(`  判斷: ${item.reason}`);
      lines.push(`  來源: ${item.source}`);
    }
  }
  lines.push('');
  lines.push('🎯 共同目標與分工');
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
  lines.push('🔁 資料是否同步（排錯用）');
  lines.push(`- 共用 Drive 本機路徑: ${hubRoot}（只適用於這部電腦，不要發給對方）`);
  lines.push(`- 收件通道: ${incomingGroups.length} 條 peer lane 已讀取；待你處理 ${pendingItems.length} 件。`);
  lines.push(`- 發件紀錄: ${outgoingPackets.length} 件已發交接；等待對方 ${waitingOutgoing.length} 件。`);
  lines.push(`- 背景索引: ${contextReport.entries.length} 條；提醒 ${contextReport.issues.length} 項。`);
  lines.push(`- HTML dashboard: \`check-aps\` 會按需更新個人頁 \`_context/${dashboardFileNameForAgent(agentId)}\`，並更新共用入口 \`_context/dashboard.html\`。`);
  lines.push('');
  lines.push('🔎 邊界:這是按需讀取本機已同步資料的狀態摘要，不代表對方已收到人手通知或已完成 Google Drive 同步。共用 Drive 路徑只供本機用戶打開本機資料夾，不應放入給對方的通知。');
  return lines.join('\n');
}

function renderContextOverviewHtml({ report, projectSlug, dashboard = null }) {
  if (dashboard) return renderProjectDashboardHtml(dashboard);
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
  const config = loadConfig();
  const agentId = flagOrConfig('--agent-id', 'agentId', config);
  const dashboard = agentId ? buildDashboardData({ hubRoot, projectSlug, agentId, config: { ...config, agentId } }) : null;
  fs.writeFileSync(outputPath, renderContextOverviewHtml({ report, projectSlug, dashboard }), 'utf8');
  return outputPath;
}

function renderProjectDashboardHtml(dashboard) {
  const { hubRoot, projectSlug, agentId, contextReport, incomingGroups, outgoingPackets, peers, suggestedReads, sharedGoal } = dashboard;
  const generatedAt = isoNow();
  const pendingItems = incomingGroups.flatMap((group) => group.pending.map((item) => ({ ...item, from: group.from })));
  const waitingOutgoing = outgoingPackets.filter((item) => item.state === 'waiting');
  const contextErrors = contextReport.issues.filter((issue) => issue.severity === 'error');
  const contextWarnings = contextReport.issues.filter((issue) => issue.severity !== 'error');
  const riskRecords = dashboardRiskRecords({ incomingGroups, contextReport, peers, identityIssues: dashboard.identityIssues, sharedGoal });
  const actionItems = dashboardActionItems({ pendingItems, outgoingPackets, riskRecords, agentId, sharedGoal, peers });
  const statusLines = dashboardStatusLines({ pendingItems, outgoingPackets, riskRecords, sharedGoal });
  const primaryDecision = statusLines[0] || '目前沒有明確下一步。';
  const firstAction = actionItems[0] || null;
  const firstActionPrompt = firstAction ? (firstAction.next.match(/「(.+)」/) || [null, firstAction.next])[1] : null;
  const primaryDecisionIcon = dashboardDecisionIcon(primaryDecision);
  const emptyActionText = peers.length === 0
    ? '目前未有協作對象。先建立或更新共同目標與分工；要邀請新協作者時用 `npx aps peer invite`，讓對方自行選 APS 名稱。'
    : '目前沒有明確下一步。若要推進，先核對共同目標與分工，再按需發出一對一交接。';
  const actionRows = actionItems.map((item) => `<tr>
      <td><span class="badge ${actionBadgeClass(item)}">${actionLaneIcon(item)} ${htmlEscape(item.lane)}</span></td>
      <td>${htmlEscape(item.item)}</td>
      <td>${htmlEscape(item.reason || '可按建議下一步處理。')}</td>
      <td>${htmlEscape(item.next)}</td>
      <td><code>${htmlEscape(item.source)}</code></td>
    </tr>`).join('\n') || `<tr><td colspan="5" class="muted">${htmlEscape(emptyActionText)}</td></tr>`;
  const statusRows = statusLines.map((line) => `<li>${htmlEscape(line)}</li>`).join('\n');
  const outgoingRows = outgoingPackets.map((item) => `<tr>
      <td>${htmlEscape(item.toId || '(未記錄)')}</td>
      <td>${htmlEscape(packetTopic(item.packetId))}</td>
      <td>v${htmlEscape(item.version)}</td>
      <td><span class="badge ${item.state === 'waiting' ? 'warn' : item.state === 'withdrawn' || item.state === 'declined' ? 'bad' : 'ok'}">${htmlEscape(item.label)}</span></td>
      <td>${htmlEscape(inboxWhatSummary(item.summary))}</td>
      <td><code>${htmlEscape(packetSourceRef(agentId, item.packetId, item.version))}</code></td>
    </tr>`).join('\n') || '<tr><td colspan="6" class="muted">目前沒有由你發出的交接紀錄。</td></tr>';
  const readRows = suggestedReads.map((item) => `<tr>
      <td>${htmlEscape(item.title)}</td>
      <td>${htmlEscape(item.type)}</td>
      <td>${htmlEscape(item.why)}</td>
      <td>${sourceRefDisplay(item.ref)}</td>
    </tr>`).join('\n') || '<tr><td colspan="4" class="muted">目前沒有額外建議閱讀來源。</td></tr>';
  const contextRows = contextReport.entries.map((entry) => {
    const title = entry.workstream || entry.current_focus || entry.source_packet || `entry ${entry.blockIndex}`;
    const refs = normalizeSourceRefs(entry.sourceRefs.length > 0 ? entry.sourceRefs : entry.source_refs);
    return `<tr>
      <td>${htmlEscape(entry.lane_agent)}</td>
      <td>${htmlEscape(title)}</td>
      <td><span class="badge ${contextFreshnessBadgeClass(entry.freshness)}">${htmlEscape(contextFreshnessLabel(entry.freshness))}</span></td>
      <td>${htmlEscape(entry.current_focus || '(未記錄)')}</td>
      <td>${refs.map(sourceRefDisplay).join('<br>') || '<span class="muted">未列明</span>'}</td>
    </tr>`;
  }).join('\n') || '<tr><td colspan="5" class="muted">目前沒有背景索引條目。</td></tr>';
  const peerRows = peers.map((peer) => `<tr>
      <td>${htmlEscape(peer.agent_id)}</td>
      <td>${htmlEscape(peer.display_name || peer.agent_id)}</td>
      <td><span class="badge ${peer.peer_state === 'confirmed' ? 'ok' : peer.status === 'inactive' ? 'bad' : 'warn'}">${htmlEscape(peer.peer_state || peer.status || 'unknown')}</span></td>
      <td>${peer.is_self ? '本機 agent' : peer.is_default_peer ? '預設 peer' : 'project peer'}</td>
    </tr>`).join('\n') || '<tr><td colspan="4" class="muted">未見 peer card；舊二人設定仍可透過本機設定運作。</td></tr>';
  const identityCards = peers
    .slice()
    .sort((a, b) => (a.agent_id === agentId ? -1 : b.agent_id === agentId ? 1 : String(a.agent_id).localeCompare(String(b.agent_id))))
    .map((peer, index) => {
      const isSelf = peer.agent_id === agentId;
      const role = isSelf ? '自己' : peers.filter((item) => item.agent_id !== agentId).length > 1 ? `對方 ${index}` : '對方';
      const state = peer.peer_state || peer.status || 'unknown';
      const stateLabel = peer.peer_state === 'confirmed' ? '已確認' : peer.status === 'inactive' ? '停用' : state;
      const badgeClass = peer.peer_state === 'confirmed' ? 'ok' : peer.status === 'inactive' ? 'bad' : 'warn';
      return `<div class="identitycard ${isSelf ? 'self' : 'peer'}">
        <span class="role">${htmlEscape(role)}</span>
        <strong>${htmlEscape(peer.agent_id)}</strong>
        <span class="display">${htmlEscape(peer.display_name || peer.agent_id)}</span>
        <span class="badge ${badgeClass}">${htmlEscape(stateLabel)}</span>
      </div>`;
    }).join('\n') || `<div class="identitycard self"><span class="role">自己</span><strong>${htmlEscape(agentId)}</strong><span class="display">本機代理</span><span class="badge warn">未見 peer card</span></div>`;
  const riskRows = riskRecords.map((item) => `<tr>
      <td>${htmlEscape(item.owner)}</td>
      <td>${htmlEscape(item.message)}</td>
      <td>${htmlEscape(item.next)}</td>
      <td><code>${htmlEscape(item.source)}</code></td>
    </tr>`).join('\n') || '<tr><td colspan="4" class="muted">未見阻塞風險。仍須以最新 packet / outbox / ack 作準。</td></tr>';
  const confirmationRows = sharedGoal.confirmations.map((item) => `<tr>
      <td>${htmlEscape(item.peerId)}</td>
      <td>${sharedGoal.latest ? `v${htmlEscape(sharedGoal.latest.version)}` : '<span class="muted">未見基準</span>'}</td>
      <td><span class="badge ${item.state === 'confirmed' ? 'ok' : item.state === 'declined' ? 'bad' : 'warn'}">${htmlEscape(item.label)}</span></td>
      <td>${htmlEscape(item.entry && (item.entry.result || item.entry.reason) ? (item.entry.result || item.entry.reason) : '未記錄')}</td>
      <td>${htmlEscape(sharedGoalPeerNextStep(item))}</td>
    </tr>`).join('\n') || '<tr><td colspan="5" class="muted">目前未有 confirmed peer 需要確認。</td></tr>';
  const syncRows = [
    ['收件通道', `${incomingGroups.length} 條 peer lane 已讀取`, `待你處理 ${pendingItems.length} 件`],
    ['發件紀錄', `${outgoingPackets.length} 件已發交接`, `尚未看到對方處理 ${waitingOutgoing.length} 件`],
    ['共同目標與分工', sharedGoalProgressText(sharedGoal), sharedGoalCanStartText(sharedGoal)],
    ['背景索引', `${contextReport.entries.length} 條`, `${contextReport.issues.length} 項提醒 / 錯誤`],
  ].map((row) => `<tr><td>${htmlEscape(row[0])}</td><td>${htmlEscape(row[1])}</td><td>${htmlEscape(row[2])}</td></tr>`).join('\n');
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${htmlEscape(projectSlug)} APS 營運總覽 - Agent Public Squares</title>
<style>
  :root { --ink:#1d2430; --soft:#566174; --bg:#f4f0e7; --paper:#fffdf8; --line:#d7cdbc; --accent:#285d74; --ok:#2e7d4f; --warn:#9a5a1b; --bad:#b64234; --mono:ui-monospace, "Cascadia Code", Consolas, monospace; --sans:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; --serif:"Noto Serif TC","PMingLiU",Georgia,serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); line-height:1.68; padding:24px 16px 52px; }
  main { max-width:1120px; margin:0 auto; }
  nav, section, .callout, .metric, .decision, .ownerbar, .identitycard { background:var(--paper); border:1px solid var(--line); border-radius:6px; }
  nav { display:flex; flex-wrap:wrap; gap:8px 18px; padding:10px 14px; margin-bottom:20px; font-size:14px; }
  .brand { font-family:var(--serif); font-weight:700; }
  header { padding:22px 0; border-bottom:1px solid var(--line); margin-bottom:18px; }
  h1 { font-family:var(--serif); font-size:42px; line-height:1.12; margin:0 0 8px; }
  h2 { font-family:var(--serif); font-size:24px; margin:0 0 6px; }
  p { margin:0 0 12px; color:var(--soft); }
  section { padding:20px 22px; margin-bottom:18px; overflow:auto; }
  .callout { border-left:4px solid var(--bad); padding:13px 15px; margin-bottom:18px; color:var(--soft); }
  .decision { border-left:5px solid var(--accent); padding:18px 20px; margin-bottom:18px; }
  .decision strong { display:block; font-size:22px; color:var(--ink); margin-bottom:6px; }
  .ownerbar { display:flex; flex-wrap:wrap; align-items:center; gap:10px 14px; padding:11px 14px; margin-bottom:14px; border-left:5px solid var(--accent); }
  .ownerbar .label { color:var(--soft); font-size:13px; }
  .ownerbar .name { font-family:var(--serif); font-size:28px; font-weight:700; line-height:1; color:var(--ink); }
  .ownerbar .hint { color:var(--soft); font-size:13px; }
  .identitygrid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:10px; margin:0 0 16px; }
  .identitycard { padding:13px 14px; border-left:6px solid var(--line); }
  .identitycard.self { border-left-color:var(--accent); background:#eef5f7; }
  .identitycard.peer { border-left-color:#9a5a1b; }
  .identitycard .role { display:block; color:var(--soft); font-size:13px; font-weight:700; }
  .identitycard strong { display:block; font-family:var(--serif); font-size:30px; line-height:1.1; margin:2px 0; color:var(--ink); }
  .identitycard .display { display:block; color:var(--soft); margin-bottom:8px; }
  .copyline { font-family:var(--mono); font-size:13px; background:#ece5d4; border-radius:4px; padding:8px 10px; color:var(--ink); word-break:break-word; }
  .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:12px; margin:16px 0 20px; }
  .metric { padding:14px 15px; }
  .metric strong { display:block; font-size:28px; line-height:1.1; }
  .metric span { color:var(--soft); font-size:13px; }
  .badge { display:inline-flex; border:1px solid currentColor; border-radius:999px; padding:2px 9px; font-size:12px; font-weight:700; white-space:nowrap; }
  .ok { color:var(--ok); }
  .warn { color:var(--warn); }
  .bad { color:var(--bad); }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; vertical-align:top; border-bottom:1px solid var(--line); padding:9px 10px; }
  th { background:#e4edf0; color:var(--accent); white-space:nowrap; }
  code { font-family:var(--mono); font-size:12px; background:#ece5d4; border-radius:3px; padding:1px 5px; word-break:break-word; }
  a { color:var(--accent); font-weight:700; }
  .muted { color:#7a8493; }
  ul { margin:8px 0 0; padding-left:20px; }
  footer { text-align:center; color:#7a8493; font-size:12px; margin-top:26px; }
  @media (max-width: 760px) { h1 { font-size:32px; } .metrics { grid-template-columns:1fr 1fr; } }
</style>
</head>
<body>
<main>
<nav><span class="brand">Agent Public Squares</span><span>🧭 APS 營運總覽</span><span class="muted">新手決策視角</span></nav>
<header>
  <div class="ownerbar" aria-label="頁面擁有人">
    <span class="label">👤 個人頁</span>
    <span class="name">${htmlEscape(agentId)}</span>
    <span class="hint">只看這個 APS 名稱的待辦</span>
    <a href="dashboard.html">不是你？返回共用入口</a>
  </div>
  <div class="identitygrid" aria-label="自己與對方">
    ${identityCards}
  </div>
  <h1>${htmlEscape(projectSlug)}</h1>
  <p>這頁先回答現在能否推進、下一步做甚麼、哪一件事需要先退回或等待。</p>
  <div class="metrics">
    <div class="metric"><strong>${pendingItems.length}</strong><span>📬 待你處理</span></div>
    <div class="metric"><strong>${outgoingPackets.length}</strong><span>📤 你交出去的事</span></div>
    <div class="metric"><strong>${waitingOutgoing.length}</strong><span>⏳ 等待對方</span></div>
    <div class="metric"><strong>${sharedGoal.state === 'confirmed' ? '可' : '停'}</strong><span>${sharedGoal.state === 'confirmed' ? '✅' : '⚠️'} 普通交接開工</span></div>
  </div>
  <p class="muted">生成時間：${htmlEscape(generatedAt)}</p>
</header>
<div class="decision">
  <strong>${primaryDecisionIcon} ${htmlEscape(primaryDecision)}</strong>
  <p>🎯 項目基準：${htmlEscape(sharedGoalCanStartText(sharedGoal))}</p>
  <p>🚀 下一步</p>
  <p>${firstAction ? htmlEscape(firstActionPrompt) : htmlEscape(emptyActionText)}</p>
  ${firstAction ? `<p class="copyline">${htmlEscape(firstActionPrompt)}</p>` : ''}
</div>
<section>
  <h2>🔎 現在怎樣做</h2>
  <p>這裡只放會改變下一步的判斷；不是資料同步清單。</p>
  <ul>${statusRows}</ul>
</section>
<section>
  <h2>🚀 待我處理</h2>
  <p>每件交接先判斷能否開工；看到 pending 不等於可以直接做。</p>
  <table><thead><tr><th>開工判斷</th><th>事項</th><th>原因</th><th>建議下一步</th><th>來源</th></tr></thead><tbody>${actionRows}</tbody></table>
</section>
<section>
  <h2>🎯 共同目標與分工</h2>
  <p>這是普通交接能否開工的項目基準。三位或以上協作者時，要看每位受影響 peer 是否已確認同一個最新版本。</p>
  <table><tbody>
    <tr><th>確認進度</th><td>${htmlEscape(sharedGoalProgressText(sharedGoal))}</td></tr>
    <tr><th>開工判斷</th><td>${htmlEscape(sharedGoalCanStartText(sharedGoal))}</td></tr>
    <tr><th>最新版本</th><td>${sharedGoal.latest ? `${htmlEscape(sharedGoal.latest.packetId)} v${htmlEscape(sharedGoal.latest.version)}（${htmlEscape(sharedGoal.latest.senderId)} → ${htmlEscape(sharedGoal.latest.summary.to || '(未記錄)')}）` : '<span class="muted">未見 shared_goal_and_roles</span>'}</td></tr>
    <tr><th>共同目標</th><td>${htmlEscape(sharedGoal.summary.goal)}</td></tr>
    <tr><th>角色分工</th><td>${htmlEscape(sharedGoal.summary.roles)}</td></tr>
    <tr><th>第一輪分工</th><td>${htmlEscape(sharedGoal.summary.firstRound)}</td></tr>
    <tr><th>驗收標準</th><td>${htmlEscape(sharedGoal.summary.acceptance)}</td></tr>
  </tbody></table>
  <h3>👥 逐人確認狀態</h3>
  <table><thead><tr><th>peer</th><th>版本</th><th>狀態</th><th>說明</th><th>下一步</th></tr></thead><tbody>${confirmationRows}</tbody></table>
</section>
<section>
  <h2>📤 我交出去的事</h2>
  <p>這裡不推斷對方是否已看到通知；只顯示共用 Drive 資料夾內可讀到的明確狀態，例如 ack 已記錄、已收結或已撤回。</p>
  <table><thead><tr><th>收件人</th><th>主題</th><th>版本</th><th>狀態</th><th>摘要</th><th>來源</th></tr></thead><tbody>${outgoingRows}</tbody></table>
</section>
<section>
  <h2>📎 證據來源</h2>
  <p>需要核對時才讀這些來源；不要讓來源清單蓋過下一步。</p>
  <table><thead><tr><th>標題</th><th>類型</th><th>為甚麼要讀</th><th>連結 / 來源</th></tr></thead><tbody>${readRows}</tbody></table>
</section>
<section>
  <h2>🗂️ 背景資料</h2>
  <p>Project Context Index 只作背景，不可覆蓋最新交接要求。</p>
  <table><thead><tr><th>Agent</th><th>工作流</th><th>新鮮度</th><th>目前焦點</th><th>來源</th></tr></thead><tbody>${contextRows}</tbody></table>
</section>
<section>
  <h2>👥 誰在這個項目</h2>
  <table><thead><tr><th>Agent</th><th>顯示名稱</th><th>狀態</th><th>備註</th></tr></thead><tbody>${peerRows}</tbody></table>
</section>
<section>
  <h2>⚠️ 風險與未決</h2>
  <p>每項風險都要能轉成下一步；內部來源只放在證據欄。</p>
  <table><thead><tr><th>相關對象</th><th>風險</th><th>建議下一步</th><th>來源</th></tr></thead><tbody>${riskRows}</tbody></table>
</section>
<section>
  <h2>🔧 資料是否同步</h2>
  <p>排錯時才看這裡。此頁只讀，不會通知對方、不會標記完成、不會收結交接。</p>
  <table><thead><tr><th>項目</th><th>狀態</th><th>補充</th></tr></thead><tbody>${syncRows}</tbody></table>
  <p class="muted">共用 Drive 本機路徑：<a href="${htmlEscape(localFileHref(hubRoot))}">打開資料夾</a> <code>${htmlEscape(hubRoot)}</code>。這只適用於這部電腦，不要放入給對方的通知。</p>
  <p class="muted">技術來源：已同步的 packet / outbox / ack / context。若畫面與實際聊天不一致，先請 AI 讀最新交接包核對。</p>
</section>
<footer>Generated by <code>npx aps dashboard</code>. Read-only APS operations snapshot.</footer>
</main>
</body>
</html>
`;
}

function dashboardFileNameForAgent(agentId) {
  return `dashboard_${agentId}.html`;
}

function renderDashboardIndexHtml({ hubRoot, projectSlug, agentId, peers, currentDashboardFile }) {
  const generatedAt = isoNow();
  const contextPath = contextDir(hubRoot, projectSlug);
  const peerIds = Array.from(new Set([
    agentId,
    ...peers.map((peer) => peer.agent_id).filter(Boolean),
  ])).sort();
  const rows = peerIds.map((peerId) => {
    const fileName = dashboardFileNameForAgent(peerId);
    const filePath = path.join(contextPath, fileName);
    const exists = fs.existsSync(filePath);
    const stat = exists ? fs.statSync(filePath) : null;
    const label = `${exists ? '✅' : '⚠️'} ${peerId}${peerId === agentId ? '（剛更新）' : ''}`;
    const page = exists
      ? `<a href="${htmlEscape(fileName)}">${htmlEscape(fileName)}</a>`
      : `<span class="muted">${htmlEscape(fileName)} 尚未生成</span>`;
    const updated = stat ? stat.mtime.toISOString() : '未生成';
    const state = exists
      ? `✅ 已生成：${peerId} 的個人頁${peerId === agentId ? '（本次更新）' : '（上次生成）'}`
      : `🚀 尚未生成：${peerId} 需要在自己的本機項目資料夾執行 Check APS`;
    return `<tr><td>${htmlEscape(label)}</td><td>${page}</td><td>${htmlEscape(updated)}</td><td>${htmlEscape(state)}</td></tr>`;
  }).join('\n') || '<tr><td colspan="4" class="muted">目前未見任何 APS 用戶。</td></tr>';
  return `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${htmlEscape(projectSlug)} APS dashboard 入口 - Agent Public Squares</title>
<style>
  :root { --ink:#1d2430; --soft:#566174; --bg:#f4f0e7; --paper:#fffdf8; --line:#d7cdbc; --accent:#285d74; --mono:ui-monospace, "Cascadia Code", Consolas, monospace; --sans:"Noto Sans TC","Microsoft JhengHei",system-ui,sans-serif; --serif:"Noto Serif TC","PMingLiU",Georgia,serif; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font-family:var(--sans); line-height:1.68; padding:24px 16px 52px; }
  main { max-width:920px; margin:0 auto; }
  nav, section { background:var(--paper); border:1px solid var(--line); border-radius:6px; }
  nav { display:flex; flex-wrap:wrap; gap:8px 18px; padding:10px 14px; margin-bottom:20px; font-size:14px; }
  .brand { font-family:var(--serif); font-weight:700; }
  header { padding:22px 0; border-bottom:1px solid var(--line); margin-bottom:18px; }
  h1 { font-family:var(--serif); font-size:40px; line-height:1.12; margin:0 0 8px; }
  h2 { font-family:var(--serif); font-size:24px; margin:0 0 6px; }
  p { margin:0 0 12px; color:var(--soft); }
  section { padding:20px 22px; margin-bottom:18px; overflow:auto; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  th, td { text-align:left; vertical-align:top; border-bottom:1px solid var(--line); padding:9px 10px; }
  th { background:#e4edf0; color:var(--accent); white-space:nowrap; }
  code { font-family:var(--mono); font-size:12px; background:#ece5d4; border-radius:3px; padding:1px 5px; word-break:break-word; }
  a { color:var(--accent); font-weight:700; }
  .muted { color:#7a8493; }
  footer { text-align:center; color:#7a8493; font-size:12px; margin-top:26px; }
  @media (max-width: 760px) { h1 { font-size:32px; } }
</style>
</head>
<body>
<main>
<nav><span class="brand">Agent Public Squares</span><span>🧭 APS dashboard 入口</span><span class="muted">共用索引，不是個人待辦頁</span></nav>
<header>
  <p class="muted">項目共用入口</p>
  <h1>${htmlEscape(projectSlug)}</h1>
  <p><strong>🧭 共用入口，不是個人待辦。</strong>每位用戶的個人待辦、已發事項和下一步都不同，請打開自己的 APS 名稱頁。</p>
  <p class="muted">🧑 剛更新的是 ${htmlEscape(agentId)} 的個人頁：<a href="${htmlEscape(currentDashboardFile)}">${htmlEscape(currentDashboardFile)}</a>。如果你不是 ${htmlEscape(agentId)}，不要照這頁處理待辦。</p>
  <p class="muted">生成時間：${htmlEscape(generatedAt)}</p>
</header>
<section>
  <h2>🧭 選擇自己的 APS 視角</h2>
  <p>👥 多人項目會有多個個人頁；每次執行 <code>Check APS</code> 或 <code>dashboard</code> 時，APS 會根據 peer 清單與已生成檔案重新計算此表。</p>
  <table><thead><tr><th>APS 名稱</th><th>個人 dashboard</th><th>最後生成</th><th>生成狀態</th></tr></thead><tbody>${rows}</tbody></table>
</section>
<section>
  <h2>⚠️ 不要照別人的頁開工</h2>
  <p>如果你不是該 APS 名稱本人，不要根據該頁面的個人待辦採取行動。請在你自己的本機項目資料夾執行 <code>Check APS</code>，讓 APS 生成你的個人視角頁。</p>
  <p class="muted">📁 本機 Drive 路徑（排錯用）：<a href="${htmlEscape(localFileHref(hubRoot))}">打開資料夾</a> <code>${htmlEscape(hubRoot)}</code>。這只適用於這部電腦，不要放入給對方的通知。</p>
</section>
<footer>📄 由 APS 生成。這是共用入口頁，不是任何人的個人待辦頁。</footer>
</main>
</body>
</html>
`;
}

function writeProjectDashboardHtml({ hubRoot, projectSlug, agentId, config, fileName = dashboardFileNameForAgent(agentId) }) {
  const contextPath = contextDir(hubRoot, projectSlug);
  const outputPath = path.join(contextPath, fileName);
  const indexPath = path.join(contextPath, 'dashboard.html');
  fs.mkdirSync(contextPath, { recursive: true });
  const dashboard = buildDashboardData({ hubRoot, projectSlug, agentId, config: { ...config, agentId } });
  fs.writeFileSync(outputPath, renderProjectDashboardHtml(dashboard), 'utf8');
  fs.writeFileSync(indexPath, renderDashboardIndexHtml({
    hubRoot,
    projectSlug,
    agentId,
    peers: dashboard.peers,
    currentDashboardFile: fileName,
  }), 'utf8');
  return { dashboardPath: outputPath, indexPath };
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
          message: `lane 名稱 from_${agentId} 不是合法 APS 名稱。`,
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
            next: '先人工核對是否指向錯誤共用 Drive 項目；不要覆寫。',
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
            next: '先人工核對是否混入另一個 APS project 的 peer card。',
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
    : '(尚未邀請;普通邀請用 `npx aps peer invite`)';
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
  steps.push(writeFileOrUpdate(
    peerCardPath(hubRoot, projectSlug, agentId),
    peerCardJson({ projectSlug, agentId, displayName, peerState }),
    dryRun
  ));
  return steps;
}

function starterPackContent(values) {
  const folderName = path.basename(values.hubRoot || '') || 'Agent_Public_Squares';
  const senderName = values.agentId || '發出邀請的人';
  return `# APS 協作邀請 — ${values.projectSlug}

（這是給 ${values.otherAgentId} 的加入指引。把下面的訊息整段傳給對方即可，也可以直接轉發這份檔案的內容。）

---

📨 APS 協作邀請：${values.projectSlug}

${senderName} 想邀請你一同用 Agent Public Squares（APS）進行 AI 跨機協作。做法很簡單：你們共用一個 Google Drive 資料夾，兩邊的 AI 就能互相交收進度，不必每次重新交代背景。

你大致要做這幾件事：

☁️ 你會收到我經 Google Drive 分享的資料夾「${folderName}」（也可能收到一封 Google Drive 通知 email）。請先打開 Google Drive 接受分享，設為「離線可用」，等它同步到你的電腦。

🤖 你在自己本機的 AI Project 目錄如常打開 AI 工具即可；Google Drive 共用資料夾只是 APS 用來同步交接資料。請 AI 讀下面這個安裝指引，讓它替你檢查環境、安裝 APS、設定本機路徑與做驗收：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html

📌 設定時，項目代號要跟我完全一樣，請照抄：
${values.projectSlug}

👤 你的 APS 名稱請填：
${values.otherAgentId}

✅ 見到「通過」就裝好了。之後我有東西交給你，你在自己的 AI 工具輸入「check Drive」就會收到。

給人看的逐步詳解（有圖、有安裝命令）：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html
`;
}

function openInviteContent(values) {
  const folderName = path.basename(values.hubRoot || '') || 'Agent_Public_Squares';
  const senderName = values.agentId || '發出邀請的人';
  return `# APS 開放協作邀請 — ${values.projectSlug}

（這是給新協作者的開放加入邀請。把下面整段訊息傳給對方即可；對方的 APS 名稱由對方自己在本機設定時決定。）

---

📨 APS 協作邀請：${values.projectSlug}

${senderName} 想邀請你一同用 Agent Public Squares（APS）做 AI 跨機協作。

APS 的做法是：大家共用同一個 Google Drive 資料夾，各自用自己電腦上的 AI 工具，把進度交接到同一個項目裏。你不用預先接受 ${senderName} 替你取的 APS 名稱。

請先做一件事：

☁️ 你會收到 Google Drive 分享資料夾「${folderName}」。
請先接受分享，並在你自己的電腦上把這個資料夾設為「離線可用」，等它同步完成。

之後，請在你自己的本機項目資料夾打開 AI 工具，把下面 \`---✂️---\` 之間的整段直接貼給 AI：

---✂️---

請在目前本機項目資料夾，按這頁指引帶我安裝或加入 Agent Public Squares（APS）：
https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html

你要先讀完整頁面，再檢查目前資料夾是否適合安裝或加入。若目前資料夾已有 .aps/config.json，請先讀取並比對項目代號與共用 Drive 路徑，不要直接覆寫。任何會安裝套件、寫入檔案、修改設定或寫入共用 Drive 資料夾的步驟，先列出將會做甚麼，等我確認後才執行。Google Drive 本機路徑、項目代號、我的 APS 名稱由我提供或確認；如果我是受邀加入，項目代號以邀請訊息為準，APS 名稱仍由我自己決定，請先檢查是否重名。

邀請資訊如下：

項目代號：
${values.projectSlug}

Google Drive 共用資料夾名稱：
${folderName}

邀請人：
${senderName}

設定完成後，請執行 APS doctor 檢查，確認結果通過。通過後，請告訴我以後可以輸入「check Drive」接收 ${senderName} 交來的內容。

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
  // and choose their own APS name on their own machine. Old two-person setups still
  // pass an otherAgentId, so their counterpart lane / ack / provisional card stay built here.
  const hasCounterpart = Boolean(values.otherAgentId);
  const steps = [];

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
| 共用 Drive 項目 | \`${values.projectSlug}\` |
| Local agent | \`${values.agentId}\` |
| Partner agent | ${values.otherAgentId ? `\`${values.otherAgentId}\`` : '(尚未邀請;普通邀請用 `npx aps peer invite`)'} |
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
  npx aps init                    互動式設定:回答三條問題(Drive 資料夾 / 項目 / 你的名稱),只設定你自己這一邊
  npx aps init --target claude    只安裝 Claude Code 的 APS skill
  npx aps init --target codex     只安裝 Codex 的 APS skill
  npx aps init --refresh-skill    先備份既有 APS skill,再刷新安裝
  npx aps init --hub-root <path> --project <slug> --agent-id <id> [--other-agent-id <id>] [--role A|B]
                                  進階非互動設定 (對方與起手方向可選;只設自己也可)
  npx aps init --dry-run          只顯示會寫入的位置,不真正改檔
  npx aps upgrade                 npm 更新後刷新既有 APS 項目
  npx aps config                  顯示已保存的本機 APS 設定
  npx aps config --hub-root <path> --project <slug> --agent-id <id> [--other-agent-id <id>] [--role A|B]
                                  只保存或更新本機 APS 設定 (對方與起手方向可選)
  npx aps peers                   顯示本項目的 peers
  npx aps peer invite             生成開放邀請:對方自行選 APS 名稱,不預先建立 peer
  npx aps peer add --agent-id <id> [--display-name <name>]
                                  已知對方 APS 技術名稱時:新增 peer、lane、ack 與 starter pack
  npx aps peer starter --agent-id <id>
                                  重新產生給指定 peer 的 starter pack
  npx aps publish --to <id> --topic <snake> --body <text>
  npx aps publish --to <id> --topic <snake> --body-file <path> [--items "甲;乙" | --items-file <path>] [--strict-handoff]
                                  發佈 v1 交接包並追加 outbox;--items 由發送方申報「請對方做的事」,CLI 逐字記錄(分號分隔;項目本身含分號時改用 --items-file)
                                  --strict-handoff 會阻止缺少或內容不足的共同目標、雙方任務、交叉點、--items、證據或風險
  npx aps revise --packet-id <id> --body-file <path> --reason <text> [--items "甲;乙" | --items-file <path> | --clear-items]
                                  為自己發出的交接包建立下一個不可變版本;未指定 items 時沿用上一版
  npx aps inbox
  npx aps inbox --all
  npx aps inbox --from <agent_id>
                                  查看對方交來而本機尚未處理的項目
  npx aps check-drive
                                  同 inbox;給「check Drive」日常收件流程使用
  npx aps check-aps
                                  查看 APS 整體狀態:收件、發件、協作對象、下一步、風險;並按需更新 dashboard
  npx aps dashboard
                                  生成唯讀 APS 營運總覽 HTML
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
本機設定保存、peers / peer invite / peer starter、publish / revise / inbox / check-drive / check-aps / dashboard / status / context / consume / decline / withdraw / close,
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
    role: (getFlagValue('--role', 'A') || 'A').toUpperCase(),
  };
  // Non-interactive setup needs the three self-side core values; --other-agent-id and --role
  // are optional (solo install). If a counterpart is given, the old two-person path still runs.
  const coreFlagCount = [setupValues.hubRoot, setupValues.projectSlug, setupValues.agentId].filter(Boolean).length;
  const anySetupFlag = Boolean(setupValues.hubRoot || setupValues.projectSlug || setupValues.agentId || setupValues.otherAgentId || getRequiredFlagValue('--role'));
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
    console.log(`📁 項目代號: ${config.projectSlug || '(缺少)'}`);
    console.log(`👤 本機 agent: ${config.agentId || '(缺少)'}`);
    console.log(`🤝 對方 agent: ${config.otherAgentId || '尚未設定 (普通邀請用 `npx aps peer invite`,或在 AI 工具講「邀請新協作者加入呢個項目」)'}`);
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
    console.log(`📁 項目代號: ${projectSlug}`);
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
    console.log('🚀 下一步:如要邀請新協作對象,使用 `npx aps peer invite`。若已約定對方 APS 技術名稱,才使用 `npx aps peer add --agent-id <id> --display-name <name>`。');
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
    console.error('💡 普通邀請: npx aps peer invite');
    console.error('💡 已知對方 APS 技術名稱: npx aps peer add --agent-id fanny --display-name "Fanny"');
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
      const inviteTarget = path.join(hubRoot, '_hub', `open-invite-${projectSlug}.md`);
      const steps = [
        ensureDirectory(path.join(hubRoot, '_hub'), dryRun),
        writeFileOrUpdate(inviteTarget, openInviteContent(inviteValues), dryRun),
      ];
      console.log(`📨 APS peer invite: ${projectSlug}`);
      for (const result of steps) console.log(formatSetupResult(result));
      console.log('');
      console.log(`📄 invite: ${inviteTarget}`);
      console.log('ℹ️ 這是開放邀請,不會預先建立對方的 lane、ack 或 peer card。對方會在自己的電腦選定 APS 名稱並完成設定。');
      console.log('🚀 下一步:把 invite 內容傳給對方;對方完成後,你可用 `npx aps peers` 或「Check APS」查看新 peer。');
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
      console.log('⚠️ 狀態: provisional。對方仍須在自己的電腦完成 `npx aps init` 或 `npx aps upgrade`,才可視為 confirmed peer。');
    } else {
      console.log('ℹ️ 只重新生成 starter pack,未建立或改動 peer。若仲未邀請過呢位對象,請先用 `npx aps peer add --agent-id ' + peerId + '`。');
    }
    console.log('🚀 下一步:把 starter pack 內容或摘要通知傳給對方;對方完成後,由對方在自己的 AI 工具輸入「check Drive」。普通新協作者邀請可改用 `npx aps peer invite`。');
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
    console.error('想搵新人?用 `npx aps peer invite`,或在 AI 工具講「邀請新協作者加入呢個項目」。若已約定對方 APS 技術名稱,才用 `npx aps peer add --agent-id <對方> --display-name <名稱>`。');
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
    console.error('請先補齊共同目標、雙方任務邊界、--items 待辦、證據位置與風險,再重試。');
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
      console.log('✅ 通過檢查後,可以叫 AI 標記已處理。排錯時才需要用命令:npx aps consume --packet-id <id> --version <n> --result "<具體處理結果>"');
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
    const { dashboardPath, indexPath } = writeProjectDashboardHtml({ hubRoot, projectSlug, agentId, config: dashboardConfig });
    console.log('🧭 APS 營運總覽');
    console.log('✅ 已生成唯讀 APS 營運總覽。');
    console.log(`📄 個人 dashboard: ${dashboardPath}`);
    console.log(`📄 共用入口: ${indexPath}`);
    console.log('🔎 這是本機唯讀頁；先看能否推進、卡在哪、下一步叫 AI 做甚麼。');
  } catch (err) {
    console.error(`❌ dashboard 生成失敗:${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (subcommand === 'check-aps') {
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
    console.log(renderProjectDashboardSummary(dashboard));
    const { dashboardPath, indexPath } = writeProjectDashboardHtml({ hubRoot, projectSlug, agentId, config: dashboardConfig });
    console.log('');
    console.log(`📄 個人 dashboard 已按需更新: ${dashboardPath}`);
    console.log(`📄 共用 dashboard 入口已按需更新: ${indexPath}`);
    console.log('⚠️ 注意:這不是背景自動監察;只有你要求 Check APS 時才重新讀取和生成。');
  } catch (err) {
    console.error(`❌ Check APS 失敗:${err.message}`);
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
    console.log(`📁 項目代號: ${projectSlug}`);
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
      console.log('  📭 尚未邀請協作對象。想搵人一齊做?喺 AI 工具講「邀請新協作者加入呢個項目」,或用 `npx aps peer invite`。若已約定對方 APS 技術名稱,才用 `npx aps peer add --agent-id <對方> --display-name <名稱>`。隨時都做得。');
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
      console.log('🤝 想搵人一齊做:喺 AI 工具講「邀請新協作者加入呢個項目」,或備用指令 `npx aps peer invite`;若已約定對方 APS 技術名稱,才用 `npx aps peer add --agent-id <對方> --display-name <名稱>`。');
      console.log('💡 其他備用命令:`npx aps inbox`、`npx aps publish --to <對方> --topic ... --body-file ... --items "甲;乙"`、`npx aps consume ...`、`npx aps revise --body-file ...`、`npx aps config`。');
    } else {
      console.log('❌ 狀態: 未通過 (本機核心有缺)');
      console.log('🚀 下一步:先修正上面本機核心缺少的路徑或疑似衝突檔,再繼續使用 APS。不要在未檢查內容前刪除衝突檔。');
      console.log('💡 提示:如果剛剛重新執行過 `npx aps init`,請確認上方「項目代號」是否就是你剛才建立的項目。');
    }
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error(`❌ doctor 失敗:${err.message}`);
    process.exit(1);
  }
}

console.error(`❌ 不認識的子命令: ${subcommand}`);
console.error('💡 請先執行: npx aps --help');
process.exit(1);
