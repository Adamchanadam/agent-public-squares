#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const apsBin = path.join(repoRoot, 'bin', 'aps.js');
const evidenceRoot = path.join(repoRoot, 'dev', 'qc', 'evidence');
const runRoot = fs.mkdtempSync(path.join(evidenceRoot, 'context-index-regression-'));
const hubRoot = path.join(runRoot, 'hub');
const apsConfigPath = path.join(repoRoot, '.aps', 'config.json');
const existingApsConfig = fs.existsSync(apsConfigPath) ? fs.readFileSync(apsConfigPath, 'utf8') : null;

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function packet(project, agent, packetId, version = 1) {
  writeFile(
    path.join(hubRoot, project, `from_${agent}`, 'packets', `${packetId}__v${version}`, 'packet.md'),
    `# Packet ${packetId}\n\nSource fixture.\n`,
  );
}

function contextLog(project, laneAgent, metadata) {
  writeFile(
    path.join(hubRoot, project, '_context', `from_${laneAgent}`, 'context.log.md'),
    `# Context log\n\n\`\`\`json\n${JSON.stringify(metadata, null, 2)}\n\`\`\`\n`,
  );
}

function runAps(subcommand, args) {
  const oldArgv = process.argv;
  const oldExit = process.exit;
  const oldLog = console.log;
  const oldError = console.error;
  const oldCwd = process.cwd();
  let stdout = '';
  let stderr = '';
  let status = 0;
  process.argv = [process.execPath, apsBin, subcommand, ...args];
  process.exit = (code = 0) => {
    const err = new Error(`process.exit(${code})`);
    err.__apsExit = true;
    err.code = code;
    throw err;
  };
  console.log = (...items) => {
    stdout += `${items.join(' ')}\n`;
  };
  console.error = (...items) => {
    stderr += `${items.join(' ')}\n`;
  };
  try {
    process.chdir(repoRoot);
    delete require.cache[require.resolve(apsBin)];
    require(apsBin);
  } catch (err) {
    if (err && err.__apsExit) {
      status = err.code;
    } else {
      status = 1;
      stderr += `${err && err.stack ? err.stack : err}\n`;
    }
  } finally {
    process.argv = oldArgv;
    process.exit = oldExit;
    console.log = oldLog;
    console.error = oldError;
    process.chdir(oldCwd);
    delete require.cache[require.resolve(apsBin)];
  }
  return { status, stdout, stderr };
}

function runContext(args) {
  return runAps('context', args);
}

function runInbox(args) {
  return runAps('inbox', args);
}

function runCheckDrive(args) {
  return runAps('check-drive', args);
}

function runCheckAps(args) {
  return runAps('check-aps', args);
}

function runDashboard(args) {
  return runAps('dashboard', args);
}

function runLive(args) {
  return runAps('live', args);
}

function runLiveQueue(args) {
  return runAps('live-queue', args);
}

function runPublish(args) {
  return runAps('publish', args);
}

function runConsume(args) {
  return runAps('consume', args);
}

function runDecline(args) {
  return runAps('decline', args);
}

function assert(condition, message, details = '') {
  if (!condition) {
    const suffix = details ? `\n${details}` : '';
    throw new Error(`${message}${suffix}`);
  }
}

function outputOf(result) {
  return `${result.stdout || ''}${result.stderr || ''}`;
}

function expectOutputCase(name, result, expectedStatus, requiredText, forbiddenText = []) {
  const output = outputOf(result);
  assert(
    result.status === expectedStatus,
    `${name}: expected exit ${expectedStatus}, got ${result.status}`,
    output,
  );
  for (const text of requiredText) {
    assert(output.includes(text), `${name}: missing expected output text "${text}"`, output);
  }
  for (const text of forbiddenText) {
    assert(!output.includes(text), `${name}: should not include "${text}"`, output);
  }
  console.log(`PASS ${name}`);
}

function expectCase(name, args, expectedStatus, requiredText) {
  expectOutputCase(name, runContext(args), expectedStatus, requiredText);
}

function expectInboxCase(name, args, expectedStatus, requiredText) {
  expectOutputCase(name, runInbox(args), expectedStatus, requiredText);
}

function expectCheckDriveCase(name, args, expectedStatus, requiredText, forbiddenText = []) {
  expectOutputCase(name, runCheckDrive(args), expectedStatus, requiredText, forbiddenText);
}

function expectCheckApsCase(name, args, expectedStatus, requiredText, forbiddenText = []) {
  expectOutputCase(name, runCheckAps(args), expectedStatus, requiredText, forbiddenText);
}

function expectDashboardCase(name, args, expectedStatus, requiredText) {
  expectOutputCase(name, runDashboard(args), expectedStatus, requiredText);
}

function expectLiveCase(name, args, expectedStatus, requiredText) {
  expectOutputCase(name, runLive(args), expectedStatus, requiredText);
}

function expectPublishCase(name, args, expectedStatus, requiredText) {
  const result = runPublish(args);
  const output = outputOf(result);
  assert(
    result.status === expectedStatus,
    `${name}: expected exit ${expectedStatus}, got ${result.status}`,
    output,
  );
  for (const text of requiredText) {
    assert(output.includes(text), `${name}: missing expected output text "${text}"`, output);
  }
  console.log(`PASS ${name}`);
}

function readRepoFile(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function expectRepoFileContains(name, relativePath, requiredText, forbiddenText = []) {
  const content = readRepoFile(relativePath);
  for (const text of requiredText) {
    assert(content.includes(text), `${name}: ${relativePath} missing "${text}"`);
  }
  for (const text of forbiddenText) {
    assert(!content.includes(text), `${name}: ${relativePath} should not include "${text}"`);
  }
  console.log(`PASS ${name}`);
}

function expectBsideInviteTranscriptFixture() {
  const relativePath = 'dev/qc/aps-ux-transcript-b-side-invite-fixture.json';
  const fixture = JSON.parse(readRepoFile(relativePath));
  assert(fixture.status === 'static_single_machine_fixture', 'B-side invite transcript fixture: status should be static_single_machine_fixture');
  assert(fixture.boundary.includes('not real human UAT'), 'B-side invite transcript fixture: boundary must keep human UAT separate');
  assert(fixture.boundary.includes('not true two-machine evidence'), 'B-side invite transcript fixture: boundary must keep true two-machine evidence separate');
  assert(Array.isArray(fixture.cases) && fixture.cases.length === 4, 'B-side invite transcript fixture: expected four invite cases');
  const expectedIds = [
    'b_invite_no_aps',
    'b_invite_same_cooperation_directory',
    'b_invite_different_cooperation_directory',
    'b_mutual_invites',
  ];
  for (const id of expectedIds) {
    const item = fixture.cases.find((entry) => entry.id === id);
    assert(item, `B-side invite transcript fixture: missing case ${id}`);
    for (const field of ['userInput', 'localState', 'acceptableFirstScreen', 'behindTheScenes', 'failureSample', 'passCondition']) {
      assert(typeof item[field] === 'string' && item[field].trim().length > 0, `B-side invite transcript fixture: ${id} missing ${field}`);
    }
    assert(Array.isArray(item.forbidden) && item.forbidden.length >= 4, `B-side invite transcript fixture: ${id} must include forbidden strings`);
    for (const bad of item.forbidden) {
      assert(!item.acceptableFirstScreen.includes(bad), `B-side invite transcript fixture: ${id} acceptable first screen includes forbidden text "${bad}"`);
    }
  }
  const allScreens = fixture.cases.map((entry) => entry.acceptableFirstScreen).join('\n');
  for (const text of [
    'Google Drive 共用資料夾本機路徑',
    '用戶名稱',
    '不需要重裝 APS',
    '不是叫你換本機工作目錄',
    '另一個邀請碼先不用',
  ]) {
    assert(allScreens.includes(text), `B-side invite transcript fixture: missing required first-screen text "${text}"`);
  }
  console.log('PASS B-side invite transcript fixture clears four first-screen branches');
}

function expectFirstCheckApsLiveTranscriptFixture() {
  const relativePath = 'dev/qc/aps-ux-check-aps-live-branches-fixture.json';
  const fixture = JSON.parse(readRepoFile(relativePath));
  assert(fixture.status === 'static_single_machine_fixture', 'First Check APS fixture: status should be static_single_machine_fixture');
  for (const text of ['not real human UAT', 'not true two-machine evidence', 'not real Trystero reliability', 'not real Drive timing proof']) {
    assert(fixture.boundary.includes(text), `First Check APS fixture: boundary must include "${text}"`);
  }
  const expectedCheckIds = [
    'check_aps_no_baseline_first_use',
    'check_aps_shared_goal_draft_unconfirmed',
    'check_aps_confirmed_baseline_no_active_packet',
    'check_aps_confirmed_baseline_active_handoff',
  ];
  const expectedFunctionIds = [
    'live_top_bar_and_identity',
    'live_primary_ticket',
    'live_progress_tracker',
    'live_task_source_start_condition',
    'live_connection_and_presence',
    'live_event_log',
    'live_stage_guide',
    'live_coordination_block',
    'live_local_ai_return',
    'live_terminal_options',
  ];
  const expectedBranchIds = [
    'live_no_baseline',
    'live_unconfirmed_baseline',
    'live_normal_handoff',
    'live_missing_information',
    'live_stale_page_refresh',
    'live_peer_offline',
    'live_wrong_project_identity',
    'live_drive_sync_delay',
    'live_three_plus_one_to_one',
    'live_no_formal_write',
  ];
  assert(Array.isArray(fixture.checkApsCases) && fixture.checkApsCases.length === expectedCheckIds.length, 'First Check APS fixture: expected four Check APS cases');
  assert(Array.isArray(fixture.apsLiveFunctions) && fixture.apsLiveFunctions.length === expectedFunctionIds.length, 'First Check APS fixture: expected ten APS Live functions');
  assert(Array.isArray(fixture.apsLiveBranches) && fixture.apsLiveBranches.length === expectedBranchIds.length, 'First Check APS fixture: expected ten APS Live branches');
  for (const id of expectedCheckIds) {
    const item = fixture.checkApsCases.find((entry) => entry.id === id);
    assert(item, `First Check APS fixture: missing Check APS case ${id}`);
    for (const field of ['userInput', 'localState', 'acceptableFirstScreen', 'behindTheScenes', 'passCondition']) {
      assert(typeof item[field] === 'string' && item[field].trim().length > 0, `First Check APS fixture: ${id} missing ${field}`);
    }
    assert(Array.isArray(item.forbidden) && item.forbidden.length >= 4, `First Check APS fixture: ${id} must include forbidden strings`);
    for (const bad of item.forbidden) {
      assert(!item.acceptableFirstScreen.includes(bad), `First Check APS fixture: ${id} acceptable first screen includes forbidden text "${bad}"`);
    }
  }
  for (const id of expectedFunctionIds) {
    const item = fixture.apsLiveFunctions.find((entry) => entry.id === id);
    assert(item, `First Check APS fixture: missing APS Live function ${id}`);
    assert(typeof item.acceptableBehavior === 'string' && item.acceptableBehavior.trim().length > 0, `First Check APS fixture: ${id} missing acceptableBehavior`);
    assert(Array.isArray(item.forbidden) && item.forbidden.length >= 2, `First Check APS fixture: ${id} must include forbidden strings`);
  }
  for (const id of expectedBranchIds) {
    const item = fixture.apsLiveBranches.find((entry) => entry.id === id);
    assert(item, `First Check APS fixture: missing APS Live branch ${id}`);
    assert(typeof item.acceptableBehavior === 'string' && item.acceptableBehavior.trim().length > 0, `First Check APS fixture: ${id} missing acceptableBehavior`);
    assert(Array.isArray(item.forbidden) && item.forbidden.length >= 2, `First Check APS fixture: ${id} must include forbidden strings`);
  }
  const combined = JSON.stringify(fixture);
  for (const text of [
    '共同基準',
    '需先建立共同目標與分工',
    'Check APS',
    'APS Live 交接追蹤',
    '任務',
    '真源',
    '開工條件',
    '連接 APS Live',
    '交接事件紀錄',
    '目前階段與正式操作',
    '協調與回應',
    '本機 AI',
    'Live 自動 consume',
    '三位或以上',
    '一對一',
  ]) {
    assert(combined.includes(text), `First Check APS fixture: missing required text "${text}"`);
  }
  console.log('PASS first Check APS and APS Live branch fixture covers baseline and live functions');
}



function expectFormalHandoffCycleFixture() {
  const relativePath = 'dev/qc/aps-ux-formal-handoff-cycle-fixture.json';
  const fixture = JSON.parse(readRepoFile(relativePath));
  assert(fixture.status === 'static_single_machine_fixture', 'Formal handoff cycle fixture: status should be static_single_machine_fixture');
  for (const text of ['not real human UAT', 'not true two-machine evidence', 'not real Drive timing proof', 'not an external notification proof']) {
    assert(fixture.boundary.includes(text), `Formal handoff cycle fixture: boundary must include "${text}"`);
  }
  const expectedIds = [
    'first_formal_handoff_from_natural_language',
    'receiver_check_drive_can_start',
    'receiver_check_drive_missing_information',
    'sender_revise_after_return',
    'sender_close_after_resolution',
  ];
  assert(Array.isArray(fixture.cases) && fixture.cases.length === expectedIds.length, 'Formal handoff cycle fixture: expected five cases');
  for (const id of expectedIds) {
    const item = fixture.cases.find((entry) => entry.id === id);
    assert(item, `Formal handoff cycle fixture: missing case ${id}`);
    for (const field of ['matrixRow', 'userInput', 'localState', 'acceptableFirstScreen', 'behindTheScenes', 'passCondition']) {
      assert(typeof item[field] === 'string' && item[field].trim().length > 0, `Formal handoff cycle fixture: ${id} missing ${field}`);
    }
    assert(Array.isArray(item.forbidden) && item.forbidden.length >= 5, `Formal handoff cycle fixture: ${id} needs forbidden strings`);
    for (const bad of item.forbidden) {
      assert(!item.acceptableFirstScreen.includes(bad), `Formal handoff cycle fixture: ${id} acceptable first screen includes forbidden text "${bad}"`);
    }
  }
  const combined = JSON.stringify(fixture);
  for (const text of [
    '交接確認卡',
    '不會直接寫入共用 Drive',
    '可開工',
    '資料不足',
    '原交接不應被說成完成',
    '修訂同一條交接線',
    '不重發一堆新包',
    '你是原發送方',
    '收件方 close 對方 packet',
  ]) {
    assert(combined.includes(text), `Formal handoff cycle fixture: missing required text "${text}"`);
  }
  console.log('PASS formal handoff cycle fixture clears first handoff, check Drive, revise, and close UX branches');
}
function expectNoviceNontechnicalUxAxis() {
  const relativePath = 'dev/qc/aps-novice-nontechnical-ux-axis.json';
  const axis = JSON.parse(readRepoFile(relativePath));
  assert(axis.status === 'acceptance_axis_standard', 'Novice non-technical UX axis: status should be acceptance_axis_standard');
  assert(axis.principle === '用戶講目的，AI 做技術', 'Novice non-technical UX axis: principle must be durable');
  assert(axis.hardGate.includes('standard-only gate is not a pass result'), 'Novice non-technical UX axis: product-result gate must distinguish standard from pass result');
  assert(axis.productGoal && axis.productGoal.includes('非技術新手只用自然語言'), 'Novice non-technical UX axis: product goal must be user-result-first');
  assert(axis.passResult && axis.passResult.includes('完成安裝或加入') && axis.passResult.includes('完成關閉'), 'Novice non-technical UX axis: pass result must cover the full cooperation journey');
  assert(Array.isArray(axis.notEnoughToPass) && axis.notEnoughToPass.length >= 3, 'Novice non-technical UX axis: must say what is not enough to pass');
  assert(Array.isArray(axis.completeJourney) && axis.completeJourney.length >= 7, 'Novice non-technical UX axis: expected complete journey stages');
  for (const id of ['start_or_invite', 'setup_or_join', 'first_check_aps', 'shared_baseline', 'first_formal_handoff', 'receiver_check_drive', 'missing_info_revise_close']) {
    const item = axis.completeJourney.find((entry) => entry.stage === id);
    assert(item, `Novice non-technical UX axis: missing stage ${id}`);
    for (const field of ['userGoal', 'acceptableGuidance']) {
      assert(typeof item[field] === 'string' && item[field].trim().length > 0, `Novice non-technical UX axis: ${id} missing ${field}`);
    }
    assert(Array.isArray(item.failIf) && item.failIf.length >= 3, `Novice non-technical UX axis: ${id} needs failure signals`);
  }
  const combined = JSON.stringify(axis);
  for (const text of [
    '不懂 npx',
    '自然語言',
    'Google Drive 本機路徑',
    '第一次 Check APS',
    '共同目標與分工',
    '交接確認卡',
    'check Drive',
    '資料不足退回',
    'revise',
    'close',
    'dev/qc/aps-ux-formal-handoff-cycle-fixture.json',
    'remainingSingleMachineGaps',
    '完整非技術真人 UAT',
    '只建立驗收標準，不代表產品結果已經通過',
    '命令能跑，不等於非技術新手能完成整條合作流程',
  ]) {
    assert(combined.includes(text), `Novice non-technical UX axis: missing required text "${text}"`);
  }
  expectRepoFileContains(
    'public flow map exposes novice non-technical UX product-result gate',
    'docs/qc/aps-flow-map.html',
    [
      '新手非技術 UX 驗收軸',
      '非技術新手只講目的時',
      '未過這一軸，不可宣稱產品旅程成熟',
      '目標是完成整條合作流程，不是只建立驗收標準',
      '單機產品流程可進入外部 gate 前檢',
    ],
  );
  expectRepoFileContains(
    'public UX matrix exposes novice non-technical UX product-result gate',
    'docs/qc/aps-ux-transcript-matrix.html',
    [
      '新手非技術 UX 驗收軸',
      '雙機測試前的產品結果閘',
      'AI 是否有足夠引導力帶他完成整個 APS 合作流程',
      '合格結果',
      '只建立驗收標準、命令能跑、AI persona 局部 fixture 通過，全部都不等於新手已能完成整條合作流程',
      '完整旅程通過',
      '單機 fixture / regression 已覆蓋完整合作流程',
      '真人 UAT、真兩機、真 Drive timing、外部通知仍未覆蓋',
      'dev/qc/aps-ux-formal-handoff-cycle-fixture.json',
      '真人 UAT 未跑',
    ],
  );
  console.log('PASS novice non-technical UX product-result gate is covered for single-machine fixture scope');
}
function listFilesRecursive(dirPath, predicate) {
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, predicate));
    } else if (!predicate || predicate(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function expectPublicDocsDoNotMentionDashboardHistory() {
  const files = [
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'dev', 'release-notes', 'v0.2.24.md'),
    ...listFilesRecursive(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
  ];
  const forbidden = ['dashboard', 'Dashboard', 'HTML dashboard', '_context/dashboard', '已退役'];
  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const text of forbidden) {
      assert(!content.includes(text), `public docs should not mention dashboard history: ${path.relative(repoRoot, filePath)} includes "${text}"`);
    }
  }
  console.log('PASS public docs do not mention dashboard history');
}

function inboxPacket(project, fromAgent, toAgent, packetId, topic, version = 1) {
  writeFile(
    path.join(hubRoot, project, `from_${fromAgent}`, 'outbox.log.md'),
    `2026-05-31T12:00:00Z | publish | ${packetId} v${version} | to:${toAgent} | items:1\n`,
  );
  writeFile(
    path.join(hubRoot, project, `from_${fromAgent}`, 'packets', `${packetId}__v${version}`, 'packet.md'),
    `---\npacket_id: ${packetId}\nversion: ${version}\nfrom: ${fromAgent}\nto: ${toAgent}\nproject: ${project}\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-05-31T12:00:00Z\nssot_refs: []\nscope: \"${topic}\"\nitems:\n  - id: \"檢查新手摘要是否清楚\"\n---\n\n# ${topic}\n\n## 共同目標\n讓 check Drive 報告先像人讀的摘要,再把技術細節放後面。\n\n## 請對方做的事\n確認收件報告是否先講重點、該不該做、下一步。\n\n## 風險\nProject Context Index 只可作背景,不可覆蓋交接內容。\n`,
  );
}

function writeAck(project, agent, consumed) {
  writeFile(
    path.join(hubRoot, project, '_ack', `${agent}.ack.json`),
    `${JSON.stringify({ agent, project, consumed }, null, 2)}\n`,
  );
}

function writePeerCard(project, peerId, displayName = peerId) {
  writeFile(
    path.join(hubRoot, project, '_peers', 'agents', `${peerId}.json`),
    `${JSON.stringify({
      project,
      agent_id: peerId,
      display_name: displayName,
      lane: `from_${peerId}`,
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-14T00:00:00.000Z',
    }, null, 2)}\n`,
  );
}

function extractPublishedPacketId(output, label) {
  const match = output.match(/已發佈\s+([0-9]{8}T[0-9]{6}Z__[a-z0-9_]+)\s+v1/);
  assert(match && match[1], `${label}: missing published packet id`, output);
  return match[1];
}

function publishReadyProject(project) {
  writeTempApsConfig(project, 'adam');
  writeFile(path.join(hubRoot, project, 'from_adam', 'outbox.log.md'), '');
  writeFile(
    path.join(hubRoot, project, '_peers', 'agents', 'jay.json'),
    `${JSON.stringify({
      project,
      agent_id: 'jay',
      display_name: 'Jay',
      lane: 'from_jay',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-02T00:00:00.000Z',
    }, null, 2)}\n`,
  );
}

function writeTempApsConfig(project, agentId) {
  writeFile(
    apsConfigPath,
    `${JSON.stringify({
      hubRoot,
      projectSlug: project,
      agentId,
      otherAgentId: null,
      role: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      version: 1,
    }, null, 2)}\n`,
  );
}

function runApsProcess(args, cwd = repoRoot) {
  const result = spawnSync(process.execPath, [apsBin, ...args], {
    cwd,
    encoding: 'utf8',
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function makeHandoffProject(name) {
  const projectRoot = path.join(runRoot, name);
  writeFile(path.join(projectRoot, 'AGENTS.md'), '# Test Handoff Project\n');
  writeFile(path.join(projectRoot, 'dev', 'RULE_PACKS.md'), '# Test Rule Packs\n');
  writeFile(path.join(projectRoot, 'dev', 'PROJECT_INDEX.md'), '# Test Project Index\n');
  return projectRoot;
}

try {
  fs.mkdirSync(evidenceRoot, { recursive: true });

  expectRepoFileContains(
    'protocol defines stateless receiver handoff boundary',
    'resources/protocol/PROTOCOL.md',
    [
      'Stateless receiver',
      'Formal truth boundary',
      '真源指標',
      '接收方開工條件',
      'Check APS',
      'check Drive',
    ],
    [
      'APS Hub has new traffic',
      'Read <hub_root>/<project_slug>',
      'process unconsumed items in from_<sender>',
    ],
  );

  expectRepoFileContains(
    'packet template includes formal handoff minimum body',
    'resources/protocol/templates/packet.md.template',
    [
      '## 共同目標',
      '## 本方任務',
      '## 對方任務',
      '## 交叉點',
      '## 請對方做的事',
      '## 不應誤解的事',
      '## 真源指標',
      '## 接收方開工條件',
      '## 風險 / 未決事項',
    ],
    ['Attachments go under ./attachments/'],
  );

  expectRepoFileContains(
    'bundled aps skill uses confirmation card and true source wording',
    'skills/aps/SKILL.md',
    [
      '交接確認卡',
      '真源指標',
      '接收方開工條件',
    ],
    ['交接定義卡', '證據位置'],
  );

  expectRepoFileContains(
    'bundled setup dialogue uses confirmation card and true source wording',
    'skills/aps/references/setup-dialogue.md',
    [
      '交接確認卡',
      '真源指標',
      '接收方開工條件',
      'Jay 交回甚麼才算完成',
    ],
    ['交接定義卡', '證據位置'],
  );

  expectRepoFileContains(
    'invite flow keeps one route and hides conflict detail until needed',
    'skills/aps/SKILL.md',
    [
      '受邀加入與互邀邊界硬規則',
      '正常第一屏必須簡短說明',
      '正常情況不會影響既有人',
      '邀請人不需要先知道或替受邀者設定用戶名稱',
      '不要求用戶自己輸入命令',
      '不得在正常第一屏先講內部風險',
      '不得列 A / B 選項',
      '只有在目前本機工作目錄已接到不同 APS 交換區或不同 APS 合作目錄時',
      'AI 要直接按已有共同資料、共同目標或最先約定者提出最佳建議',
    ],
  );

  expectRepoFileContains(
    'public invite guide keeps normal join simple and conflict-only',
    'docs/guides/aps-join-invite.html',
    [
      '你仍然可以把邀請貼給 AI。AI 會先讀目前的本機 APS 設定，再給你一個建議',
      '正常情況：',
      'AI 只會請你提供自己電腦上的 Google Drive 本機路徑和你想使用的用戶名稱。',
      '發現衝突時：',
      '雙方都發過邀請時：',
      '若沒有共同資料，就建議使用你剛貼上的邀請，另一個邀請碼先不要用。',
    ],
    [
      '請在那個項目自己的本機資料夾操作',
      '不要在原本已接 APS 的項目資料夾覆寫設定',
      '建議另開新資料夾',
      '先停下來選一個 APS 合作目錄作本次合作唯一合作空間',
    ],
  );

  expectRepoFileContains(
    'public install prompt stays short and delegates rules to AI install guide',
    'README.md',
    [
      '請在目前本機工作目錄，按以下頁面完成 Agent Public Squares（APS）安裝、加入或升級：',
      'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html',
      '詳細規則由頁面交給 AI 讀取和執行',
    ],
    [
      '如果我是受邀加入，第一屏請用以下方向簡短回覆',
      '下面網址是給本機 AI 代理讀的安裝／加入／升級依據',
      '既有同一 APS 合作目錄應走升級路徑：更新 npm 套件、執行 APS upgrade、再跑 doctor',
    ],
  );

  expectRepoFileContains(
    'invitation wording keeps one human entry and maintenance-only peer add',
    'README.md',
    [
      '對 AI 說「邀請協作者」；備用命令 `peer invite`',
      '用戶名稱由對方自己確認，發起人不需要預先知道',
      '一般邀請新協作者不要用這條路',
      '維護 / 兼容命令 `peer starter`',
    ],
    [
      '已知 APS 技術名稱時新增協作者',
      '一般邀請新協作者用 `peer invite`',
    ],
  );

  expectRepoFileContains(
    'setup dialogue keeps invite UX non-technical and user-name-led',
    'skills/aps/references/setup-dialogue.md',
    [
      '標準人類入口是「邀請協作者」',
      '對方會在自己電腦選定自己的用戶名稱',
      '不要把命令當成非技術用戶要手動輸入的主步驟',
      '只有雙方已約定對方用戶名稱且需要維護指定 starter pack 時',
    ],
    [
      '你自己在這個共用資料夾內叫甚麼名字(你的 agent_id)',
      '自己的 agent id',
      '已約定對方的 APS 技術名稱',
    ],
  );
  expectRepoFileContains(
    'AI dialogue draft quality sample keeps one-sentence handoff as confirmed draft intake',
    'skills/aps/SKILL.md',
    [
      '請用 APS 把這段工作交接給 <協作者>,先整理草稿,等我確認後才寫入共用 Drive。',
      'AI 不可只寫任務要求就 publish;必須先整理「交接確認卡」',
      '缺資料時每次最多問三題',
      '真源指標清單',
      '接收方開工條件',
    ],
    ['未經確認就 publish'],
  );

  expectRepoFileContains(
    'public first-user docs keep draft confirmation and no-auto-notification boundary',
    'docs/guides/index.html',
    [
      'AI 會整理草稿、等你確認、再寫入共用 Google Drive',
      '先整理草稿，等我確認後才寫入共用 Drive',
      '不會自動通知對方，也不會自動打開對方的 AI',
    ],
  );

  expectRepoFileContains(
    'public AI install guide keeps safe write gates and post-install baseline journey',
    'docs/guides/aps-ai-agent-install.html',
    [
      'AI 先做只讀檢查，再列出一次性安裝或升級計劃',
      '用戶確認一次後，該確認覆蓋計劃內的 npm install、init 或 upgrade、設定寫入與 doctor',
      '不要每個命令重複打斷',
      '用戶端 prompt 只需提供本頁網址；其餘安裝、加入、升級、確認與收尾規則，一律以本頁為準。',
      '安裝後先建立「夠安全開始」的共同目標與分工',
      '從用戶已提供的項目背景、目前資料夾內容和對話中整理；缺資料才問，最多問三個關鍵問題',
      '完成後，回報格式要貼近 CLI 結果，不要另創厚模板',
      '✅ APS 升級完成，doctor 預檢通過。',
    ],
  );

  expectRepoFileContains(
    'APS Live product-standard wording keeps local-support boundary and true-two-machine blocker',
    'docs/plans/aps-live-capability-spec.md',
    [
      'Status: product standard / local-supported APS Live capability in unreleased source',
      'APS Live is part of the APS product standard as a bounded handoff-tracking and exception-coordination layer',
      'This status does not certify reliable cross-machine APS Live',
      'or full first-use product-flow coverage',
      'S105-style same-machine evidence proves only the exact scripted branch it ran',
      'The current local executable regression adds adjacent user-flow coverage for no-baseline first use through `Check APS`, unconfirmed shared-goal draft, normal confirmed-baseline handoff, missing-information return, stale generated-page refresh boundary, peer-offline / same-identity UI guard, wrong-project room isolation, Drive-sync-delay identity-risk scan, and active packet consistency across `check-aps`, `check-drive`, and APS Live',
      'It still must not be generalized to real Trystero peer-offline events, real Drive sync timing, real human comprehension, or real two-device operation',
    ],
  );

  expectRepoFileContains(
    'public APS flow map shows product journey gates',
    'docs/qc/aps-flow-map.html',
    [
      'APS 全流程地圖與完成度檢查表',
      '真源定位',
      '本頁是 APS 產品旅程與完成度安排的真源',
      '凡改動 APS 使用者流程、功能邏輯、階段順序、完成度判斷或工作優先級，必須同步更新本頁',
      'CLI 實際行為以 <code>bin/aps.js</code> 為準',
      'QC 覆蓋狀態、缺口與阻塞以 OPS <code>dev/qc/QC_COVERAGE_INDEX.md</code> 為準',
      '用戶講目的，AI 做技術',
      '單機產品級完成，才推雙機',
      '本機工作目錄',
      'APS 交換區',
      'APS 合作目錄',
      '用戶名稱',
      'Check APS 基準確認',
      '收件方 check Drive',
      '雙機測試不是早期排錯手段',
      '真人 UAT gate',
      '外部 timing gate',
      '單機清零狀態與外部 gate',
      '不新增第二套優先級真源',
      '只可最後做雙機',
    ],
  );

  expectRepoFileContains(
    'public APS flow map links to UX transcript matrix',
    'docs/qc/aps-flow-map.html',
    [
      'href="aps-ux-transcript-matrix.html">UX 矩陣</a>',
      'APS 單機 UX Transcript 矩陣',
      '單機清零狀態與外部 gate',
    ],
  );

  expectRepoFileContains(
    'public APS UX transcript matrix defines first-screen gates',
    'docs/qc/aps-ux-transcript-matrix.html',
    [
      'APS 單機 UX Transcript 矩陣',
      '用戶輸入',
      '合格第一屏',
      'AI 背後應做',
      '不可出現',
      '通過條件',
      '證據狀態',
      '下一步證據',
      '真人 UAT gate',
      '需補 fixture',
      '已有本機證據',
      '外部 gate',
      'B 貼邀請：未安裝 APS',
      'B 貼邀請：已有同一 APS 合作目錄',
      'B 貼邀請：已有不同 APS 合作目錄',
      '互邀：A 和 B 都發過邀請',
      '加入後第一次 Check APS',
      '第一份正式交接',
      '收件方 check Drive：資料不足',
      '發送方收到退回後 revise',
      '預設建議更換、另開或改建本機工作目錄',
      '把邀請碼說成房間、身份、共同目標或正式交接',
      '單機清零狀態與下一個 gate',
      '單機完整合作流程已可驗收',
      'dev/qc/aps-ux-transcript-b-side-invite-fixture.json',
      'dev/qc/aps-ux-check-aps-live-branches-fixture.json',
      'APS Live 功能與分支覆蓋',
      'APS Live operation smoke',
      '真 Drive timing 與真兩機 / APS Live transport',
      'APS Live operation smoke 已有本機 CLI + localhost bridge evidence',
      'dev/qc/evidence/aps-live-operation-smoke/20260618T114335/',
      '16 PASS / 0 FAIL / 2 BLOCKED',
      'peer join / leave / reconnect',
      'A→B / B→A browser chat',
      '需先建立共同目標與分工',
      '共同基準：未通過 / 需處理',
      '共同基準：進行中',
      '連接 APS Live',
      '交接事件紀錄',
      '目前階段與正式操作',
      '協調與回應',
      'Live 自動寫入正式狀態',
      '真人新手 UAT',
      '若暴露表面困惑，需降回單機 partial 並補 regression',
    ],
  );

  expectBsideInviteTranscriptFixture();
  expectFirstCheckApsLiveTranscriptFixture();
  expectFormalHandoffCycleFixture();
  expectNoviceNontechnicalUxAxis();

  expectRepoFileContains(
    'governance map links to APS full flow map and UX matrix',
    'docs/qc/governance-map.html',
    [
      'href="aps-flow-map.html">流程地圖</a>',
      'href="aps-ux-transcript-matrix.html">UX 矩陣</a>',
      'APS 全流程地圖',
      'APS 單機 UX Transcript 矩陣',
      '安裝、邀請、加入、共同基準、正式交接、收件、退回與收結',
    ],
  );

  expectPublicDocsDoNotMentionDashboardHistory();

  expectRepoFileContains(
    'public pages expose current APS Live route without old status-surface history',
    'README.md',
    [
      'APS Live 交接追蹤頁',
      '正式狀態仍要回到 terminal',
    ],
    ['dashboard', 'Dashboard', 'HTML dashboard', '_context/dashboard', '已退役'],
  );

  expectRepoFileContains(
    'APS Live Trystero QC requires end-to-end and 3+ one-to-one-boundary gates',
    'dev/qc/aps-live-trystero-qc.md',
    [
      'Six-stage Product Flow Gate',
      '共同基準',
      '已發出',
      '對方查看',
      '可開工判斷',
      '處理 / 補資料',
      '正式更新',
      'The run must prove stage transition, not just stage visibility.',
      'Trystero evidence is message-channel evidence',
      'Six-stage product flow',
      'No Trystero peer event, queue item, screenshot, or unchanged hash may be counted as a substitute for a missing stage transition.',
      'APS Live Operation Smoke Standard',
      'Run this smoke before any true two-machine user test',
      'Entry path',
      'Connection',
      'Chat',
      'Status responses',
      'Local AI queue bridge',
      'Terminal follow-up',
      'Formal boundary',
      'Handoff progression',
      'Security and privacy',
      'dev/qc/evidence/aps-live-operation-smoke/<YYYYMMDD-HHMMSS>/',
      'formal-state-before.json',
      'formal-state-after-live.json',
      'formal-state-after-terminal.json',
      'Latest Local Operation Smoke',
      'dev/qc/evidence/aps-live-operation-smoke/20260618T114335/',
      '16 `PASS`, 0 `FAIL`, 2 `BLOCKED`',
      'real browser peer join / leave / reconnect',
      'real Trystero A-to-B / B-to-A browser chat',
      'APS Live end-to-end operation flow',
      '`Check APS`, `check Drive`, or handoff preflight identifies a live coordination need',
      'terminal AI reads the queue',
      '3+ participant presence / coordination with one-to-one formal handoff',
      'At least three distinct APS identities join the same project / Live context',
      'Formal APS handoff remains one sender to one receiver per packet',
      'Six-stage product-flow ledger',
      'QC scope-gap ledger',
      'End-to-end flow ledger',
      'missing the six-stage product-flow gate, APS Live end-to-end operation flow, and 3+ participant one-to-one-boundary gate',
    ],
  );

  expectRepoFileContains(
    'APS Live capability spec requires full operation loop and 3+ group boundary',
    'docs/plans/aps-live-capability-spec.md',
    [
      'The current local executable regression adds adjacent user-flow coverage for no-baseline first use through `Check APS`, unconfirmed shared-goal draft, normal confirmed-baseline handoff, missing-information return, stale generated-page refresh boundary, peer-offline / same-identity UI guard, wrong-project room isolation, Drive-sync-delay identity-risk scan, and active packet consistency across `check-aps`, `check-drive`, and APS Live',
      'Six-stage Product Flow Definition',
      'APS Live is not considered product-flow complete until this exact six-stage path is proven with two APS identities',
      'Each stage must have evidence of transition, not only a visible label on the page.',
      '`共同基準`',
      '`已發出`',
      '`對方查看`',
      '`可開工判斷`',
      '`處理 / 補資料`',
      '`正式更新`',
      'This six-stage path is the product-flow gate.',
      'None of those can replace a missing six-stage transition.',
      'the case where no `shared_goal_and_roles` baseline exists and `共同基準` must be shown as blocked rather than completed',
      'APS Live end-to-end operation flow',
      'APS Live operation smoke standard',
      'This recurring smoke is a product operation gate, not a one-time demo',
      'entry path, connect / no-peer / peer-left / reconnect / wrong-project / same-identity states',
      'bridge online / offline / invalid-token queue paths',
      'formal state before / after comparisons',
      '3+ participant one-to-one-boundary',
      'The APS Live end-to-end operation flow gate must prove the whole path',
      'The six-stage product-flow gate must pass before the Trystero evidence can be treated as product readiness.',
      'The 3+ participant gate must prove small-group presence without changing the APS formal model',
      'A third participant may clarify, supply missing information, or comment on status',
      'active formal handoff ticket remains one sender to one receiver',
      '`Check APS`, `check Drive`, or handoff preflight can lead into APS Live',
      'Three or more APS identities can be present and coordinate in the same Live context',
    ],
  );

  expectRepoFileContains(
    'public governance map keeps APS Live product-flow gate separate from Trystero transport',
    'docs/qc/governance-map.html',
    [
      'APS Live 產品標準驗收',
      '共同基準',
      '已發出',
      '對方查看',
      '可開工判斷',
      '處理 / 補資料',
      '正式更新',
      '再驗 Trystero 通訊',
      '頁面只顯示階段名稱、同機截圖、local queue 或 console clean 都不可代替流程走通',
      '正式狀態仍須回到 terminal',
    ],
  );

  const journeyProject = 'journey_handoff_flow';
  writeFile(path.join(hubRoot, journeyProject, 'from_adam', 'outbox.log.md'), '');
  writeFile(path.join(hubRoot, journeyProject, 'from_jay', 'outbox.log.md'), '');
  writeFile(
    path.join(hubRoot, journeyProject, '_ack', 'adam.ack.json'),
    `${JSON.stringify({ agent: 'adam', project: journeyProject, consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, journeyProject, '_ack', 'jay.ack.json'),
    `${JSON.stringify({ agent: 'jay', project: journeyProject, consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writePeerCard(journeyProject, 'adam', 'Adam');
  writePeerCard(journeyProject, 'jay', 'Jay');

  writeTempApsConfig(journeyProject, 'adam');
  const sharedGoalPublish = runPublish([
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'adam',
    '--to', 'jay',
    '--topic', 'shared_goal_and_roles',
    '--body',
    [
      '## 共同目標',
      'Adam 和 Jay 用 APS 完成一次可追蹤的任務交接。',
      '## 本方任務',
      'Adam 建立共同目標與分工，並準備第一個交接。',
      '## 對方任務',
      'Jay 先確認共同目標與分工，再按狀態接收具體交接。',
      '## 交叉點',
      '普通交接必須建立在 Jay 已確認共同基準之後。',
      '## 請對方做的事',
      '確認這份共同目標與分工是否可以作為目前有效基準。',
      '## 不應誤解的事',
      '這不是要求 Jay 立即處理普通任務。',
      '## 真源指標',
      'APS packet: shared_goal_and_roles v1。',
      '## 接收方開工條件',
      'Jay 在自己電腦上看到同一份 shared_goal_and_roles，並寫入確認 ack。',
      '## 風險 / 未決事項',
      '若 Jay 不同意，應退回或要求修訂，不應處理普通交接。',
    ].join('\n'),
    '--items', '確認共同目標與分工',
    '--strict-handoff',
  ]);
  const sharedGoalPublishOutput = outputOf(sharedGoalPublish);
  assert(sharedGoalPublish.status === 0, `journey shared goal publish: expected exit 0, got ${sharedGoalPublish.status}`, sharedGoalPublishOutput);
  const sharedGoalPacketId = extractPublishedPacketId(sharedGoalPublishOutput, 'journey shared goal publish');

  writeTempApsConfig(journeyProject, 'jay');
  const jayBeforeConfirm = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayBeforeConfirmOutput = outputOf(jayBeforeConfirm);
  assert(jayBeforeConfirm.status === 0, `journey jay check-aps before shared goal confirm: expected exit 0, got ${jayBeforeConfirm.status}`, jayBeforeConfirmOutput);
  for (const text of ['你收到共同目標與分工，尚未確認', '未確認前不應直接處理普通任務', '先讀共同目標與分工正文']) {
    assert(jayBeforeConfirmOutput.includes(text), `journey jay check-aps before confirm: missing ${text}`, jayBeforeConfirmOutput);
  }
  const jayBeforeConfirmLivePath = path.join(hubRoot, journeyProject, '_context', 'aps-live_jay.html');
  assert(fs.existsSync(jayBeforeConfirmLivePath), 'journey jay before confirm: check-aps should auto-generate APS Live for unconfirmed shared-goal draft');
  const jayBeforeConfirmLiveHtml = fs.readFileSync(jayBeforeConfirmLivePath, 'utf8');
  assert(jayBeforeConfirmLiveHtml.includes('共同目標與分工仍未完全確認'), 'journey jay before confirm live: missing unconfirmed shared-goal blocker', jayBeforeConfirmLiveHtml);
  assert(jayBeforeConfirmLiveHtml.includes('不可先開普通任務'), 'journey jay before confirm live: missing cannot-start warning', jayBeforeConfirmLiveHtml);
  assert(/tracking-step active" aria-label="共同基準：進行中"/.test(jayBeforeConfirmLiveHtml), 'journey jay before confirm live: common baseline should be in progress, not completed', jayBeforeConfirmLiveHtml);
  assert(!/tracking-step done" aria-label="共同基準：已完成"/.test(jayBeforeConfirmLiveHtml), 'journey jay before confirm live: common baseline must not be marked completed before confirmation', jayBeforeConfirmLiveHtml);

  const jayConfirmSharedGoal = runApsProcess(['consume',
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'jay',
    '--packet-id', sharedGoalPacketId,
    '--version', '1',
    '--result', 'Confirmed shared goal and roles v1 for journey handoff flow',
  ]);
  const jayConfirmSharedGoalOutput = outputOf(jayConfirmSharedGoal);
  assert(jayConfirmSharedGoal.status === 0, `journey jay consume shared goal: expected exit 0, got ${jayConfirmSharedGoal.status}`, jayConfirmSharedGoalOutput);

  const jayAfterConfirm = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayAfterConfirmOutput = outputOf(jayAfterConfirm);
  assert(jayAfterConfirm.status === 0, `journey jay check-aps after shared goal confirm: expected exit 0, got ${jayAfterConfirm.status}`, jayAfterConfirmOutput);
  for (const text of ['目前沒有明確卡點', '按共同目標與分工推進', '根據目前共同目標與分工']) {
    assert(jayAfterConfirmOutput.includes(text), `journey jay check-aps after confirm: missing ${text}`, jayAfterConfirmOutput);
  }
  const jayAfterConfirmFull = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay', '--full']);
  const jayAfterConfirmFullOutput = outputOf(jayAfterConfirmFull);
  assert(jayAfterConfirmFull.status === 0, `journey jay full check-aps after shared goal confirm: expected exit 0, got ${jayAfterConfirmFull.status}`, jayAfterConfirmFullOutput);
  for (const text of ['2/2 已確認', '可按已確認分工處理普通交接']) {
    assert(jayAfterConfirmFullOutput.includes(text), `journey jay full check-aps after confirm: missing ${text}`, jayAfterConfirmFullOutput);
  }

  writeTempApsConfig(journeyProject, 'adam');
  const validHandoffPublish = runPublish([
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'adam',
    '--to', 'jay',
    '--topic', 'homepage_copy_review',
    '--body',
    [
      '## 共同目標',
      'Adam 和 Jay 用 APS 完成一次可追蹤的任務交接。',
      '## 本方任務',
      'Adam 已整理首頁文案草稿，等待 Jay 審閱。',
      '## 對方任務',
      'Jay 審閱首頁文案是否清楚，並指出必須修改的句子。',
      '## 交叉點',
      'Jay 的回覆會決定 Adam 是否修訂首頁文案。',
      '## 請對方做的事',
      '請 Jay 檢查首頁標題、副標與第一段是否適合新手理解。',
      '## 不應誤解的事',
      '不要改整個網站架構，不要直接發佈。',
      '## 真源指標',
      'Google Docs: https://docs.google.com/document/d/demo-homepage-copy-v1；段落: 首屏標題、副標、第一段。',
      '## 接收方開工條件',
      'Jay 在自己電腦能打開上述 Google Docs，確認版本是 demo-homepage-copy-v1，並知道只需回覆修改建議。',
      '## 風險 / 未決事項',
      '若 Jay 無法打開文件，應退回要求 Adam 補共享來源。',
    ].join('\n'),
    '--items', '審閱首頁標題;審閱首頁副標;指出第一段必改句子',
    '--strict-handoff',
  ]);
  const validHandoffOutput = outputOf(validHandoffPublish);
  assert(validHandoffPublish.status === 0, `journey valid handoff publish: expected exit 0, got ${validHandoffPublish.status}`, validHandoffOutput);
  const validHandoffPacketId = extractPublishedPacketId(validHandoffOutput, 'journey valid handoff publish');

  writeTempApsConfig(journeyProject, 'jay');
  const jayCheckValidHandoff = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayCheckValidHandoffOutput = outputOf(jayCheckValidHandoff);
  assert(jayCheckValidHandoff.status === 0, `journey jay check-aps valid handoff: expected exit 0, got ${jayCheckValidHandoff.status}`, jayCheckValidHandoffOutput);
  for (const text of ['[✅ 可開工]', 'homepage copy review', '有 1 件交接等你處理']) {
    assert(jayCheckValidHandoffOutput.includes(text), `journey jay check valid handoff: missing ${text}`, jayCheckValidHandoffOutput);
  }
  const jayValidHandoffLive = runLive(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayValidHandoffLiveOutput = outputOf(jayValidHandoffLive);
  assert(jayValidHandoffLive.status === 0, `journey jay live valid handoff: expected exit 0, got ${jayValidHandoffLive.status}`, jayValidHandoffLiveOutput);
  const jayValidHandoffLiveHtml = fs.readFileSync(path.join(hubRoot, journeyProject, '_context', 'aps-live_jay.html'), 'utf8');
  assert(/tracking-step done" aria-label="共同基準：已完成"/.test(jayValidHandoffLiveHtml), 'journey jay valid handoff live: confirmed common baseline should be completed', jayValidHandoffLiveHtml);
  assert(/tracking-step active" aria-label="可開工判斷：進行中"/.test(jayValidHandoffLiveHtml), 'journey jay valid handoff live: can-start judgement should be active for normal pending handoff', jayValidHandoffLiveHtml);
  assert(jayValidHandoffLiveHtml.includes('可按交接內容開工'), 'journey jay valid handoff live: missing can-start label', jayValidHandoffLiveHtml);
  assert(!jayValidHandoffLiveHtml.includes('未見目前有效共同目標與分工基準'), 'journey jay valid handoff live: should not show no-baseline blocker after confirmation', jayValidHandoffLiveHtml);
  assert(jayValidHandoffLiveHtml.includes(`"seen_packet": "adam:${validHandoffPacketId}:v1"`), 'journey jay valid handoff live: snapshot should point to the same pending packet as terminal state', jayValidHandoffLiveHtml);
  assert(jayValidHandoffLiveHtml.includes('頁面資料來自生成時的 APS 快照'), 'journey jay valid handoff live: stale-page boundary should be visible', jayValidHandoffLiveHtml);
  assert(jayValidHandoffLiveHtml.includes('重新讀取正式狀態'), 'journey jay valid handoff live: stale-page refresh action should be visible', jayValidHandoffLiveHtml);
  assert(jayValidHandoffLiveHtml.includes('refreshFormalPrompt'), 'journey jay valid handoff live: refresh prompt script should be present', jayValidHandoffLiveHtml);

  const jayCheckDriveValid = runCheckDrive(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay', '--from', 'adam']);
  const jayCheckDriveValidOutput = outputOf(jayCheckDriveValid);
  assert(jayCheckDriveValid.status === 0, `journey jay check-drive valid handoff: expected exit 0, got ${jayCheckDriveValid.status}`, jayCheckDriveValidOutput);
  for (const text of ['今日收件報告', 'homepage_copy_review', validHandoffPacketId, '對方交了甚麼', '建議下一步']) {
    assert(jayCheckDriveValidOutput.includes(text), `journey jay check-drive valid handoff: missing ${text}`, jayCheckDriveValidOutput);
  }

  const jayConsumeValid = runApsProcess(['consume',
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'jay',
    '--packet-id', validHandoffPacketId,
    '--version', '1',
    '--result', 'Reviewed homepage_copy_review and preparing concrete feedback',
  ]);
  const jayConsumeValidOutput = outputOf(jayConsumeValid);
  assert(jayConsumeValid.status === 0, `journey jay consume valid handoff: expected exit 0, got ${jayConsumeValid.status}`, jayConsumeValidOutput);
  const jayAfterConsumeCheckAps = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayAfterConsumeCheckApsOutput = outputOf(jayAfterConsumeCheckAps);
  assert(jayAfterConsumeCheckAps.status === 0, `journey jay check-aps after consuming valid handoff: expected exit 0, got ${jayAfterConsumeCheckAps.status}`, jayAfterConsumeCheckApsOutput);
  assert(jayAfterConsumeCheckApsOutput.includes('目前沒有明確卡點'), 'journey jay check-aps after consume: formal state should move on even if an older Live HTML remains on disk', jayAfterConsumeCheckApsOutput);
  assert(!jayAfterConsumeCheckApsOutput.includes('有 1 件交接等你處理'), 'journey jay check-aps after consume: stale generated page must not keep old pending terminal state alive', jayAfterConsumeCheckApsOutput);
  console.log('PASS check-aps, check-drive, and APS Live point to the same active packet and stale generated pages keep a refresh boundary');

  writeTempApsConfig(journeyProject, 'adam');
  const badHandoffPublish = runPublish([
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'adam',
    '--to', 'jay',
    '--topic', 'homepage_asset_check',
    '--body',
    [
      '## 共同目標',
      'Adam 和 Jay 用 APS 完成一次可追蹤的任務交接。',
      '## 本方任務',
      'Adam 想請 Jay 檢查首頁素材。',
      '## 對方任務',
      'Jay 檢查素材是否可用。',
      '## 交叉點',
      'Jay 的判斷會影響 Adam 是否替換素材。',
      '## 請對方做的事',
      '請 Jay 確認素材是否可用。',
      '## 不應誤解的事',
      '不要直接替換正式素材。',
      '## 風險 / 未決事項',
      'Adam 尚未提供 Jay 可讀的素材來源。',
    ].join('\n'),
    '--items', '確認素材是否可用',
  ]);
  const badHandoffOutput = outputOf(badHandoffPublish);
  assert(badHandoffPublish.status === 0, `journey loose bad handoff publish: expected exit 0, got ${badHandoffPublish.status}`, badHandoffOutput);
  const badHandoffPacketId = extractPublishedPacketId(badHandoffOutput, 'journey loose bad handoff publish');

  writeTempApsConfig(journeyProject, 'jay');
  const jayCheckBadHandoff = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'jay']);
  const jayCheckBadHandoffOutput = outputOf(jayCheckBadHandoff);
  assert(jayCheckBadHandoff.status === 0, `journey jay check-aps bad handoff: expected exit 0, got ${jayCheckBadHandoff.status}`, jayCheckBadHandoffOutput);
  for (const text of ['[⚠️ 需退回補資料]', 'homepage asset check', '交接資料不足', '請對方修訂原交接']) {
    assert(jayCheckBadHandoffOutput.includes(text), `journey jay check bad handoff: missing ${text}`, jayCheckBadHandoffOutput);
  }
  const jayBadHandoffLivePath = path.join(hubRoot, journeyProject, '_context', 'aps-live_jay.html');
  assert(fs.existsSync(jayBadHandoffLivePath), 'journey jay bad handoff: check-aps should auto-generate APS Live for missing-information return');
  const jayBadHandoffLiveHtml = fs.readFileSync(jayBadHandoffLivePath, 'utf8');
  assert(/tracking-step done" aria-label="共同基準：已完成"/.test(jayBadHandoffLiveHtml), 'journey jay bad handoff live: common baseline should remain completed', jayBadHandoffLiveHtml);
  assert(/tracking-step blocked" aria-label="可開工判斷：未通過 \/ 需處理"/.test(jayBadHandoffLiveHtml), 'journey jay bad handoff live: can-start judgement should be blocked for missing information', jayBadHandoffLiveHtml);
  assert(jayBadHandoffLiveHtml.includes('未列明真源指標或來源位置'), 'journey jay bad handoff live: missing information blocker should be visible', jayBadHandoffLiveHtml);
  assert(jayBadHandoffLiveHtml.includes('請對方補真源、範圍或驗收標準'), 'journey jay bad handoff live: missing formal return action', jayBadHandoffLiveHtml);

  const jayDeclineBad = runApsProcess(['decline',
    '--hub-root', hubRoot,
    '--project', journeyProject,
    '--agent-id', 'jay',
    '--packet-id', badHandoffPacketId,
    '--version', '1',
    '--reason', 'Missing receiver-readable source pointer and receiver start condition',
  ]);
  const jayDeclineBadOutput = outputOf(jayDeclineBad);
  assert(jayDeclineBad.status === 0, `journey jay decline bad handoff: expected exit 0, got ${jayDeclineBad.status}`, jayDeclineBadOutput);

  writeTempApsConfig(journeyProject, 'adam');
  const adamSeesDecline = runCheckAps(['--hub-root', hubRoot, '--project', journeyProject, '--agent-id', 'adam']);
  const adamSeesDeclineOutput = outputOf(adamSeesDecline);
  assert(adamSeesDecline.status === 0, `journey adam check-aps after decline: expected exit 0, got ${adamSeesDecline.status}`, adamSeesDeclineOutput);
  for (const text of ['對方退回了', 'Missing receiver-readable source pointer', 'revise']) {
    assert(adamSeesDeclineOutput.includes(text), `journey adam check after decline: missing ${text}`, adamSeesDeclineOutput);
  }
  console.log('PASS shared-goal draft, normal handoff, and missing-info return journey variants are regression-covered');

  publishReadyProject('strict_publish_incomplete');
  expectPublishCase(
    'strict handoff blocks incomplete packet',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_publish_incomplete',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'handoff_gap',
      '--body', '請 Jay 接手下一步。',
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '缺少', '共同目標', '真源指標'],
  );

  writeTempApsConfig('starter_pack_demo', 'adam');
  const peerResult = runApsProcess(['peer', 'add', '--agent-id', 'user2', '--display-name', 'User 2']);
  const peerOutput = outputOf(peerResult);
  assert(peerResult.status === 0, `peer add starter pack: expected exit 0, got ${peerResult.status}`, peerOutput);
  const starterPath = path.join(hubRoot, '_hub', 'starter-pack-starter_pack_demo-user2.md');
  const starter = fs.readFileSync(starterPath, 'utf8');
  for (const text of [
    'adam 想邀請你一同用 Agent Public Squares（APS）進行 AI 跨機協作。',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html',
    '給人看的逐步詳解',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html',
    'APS 合作目錄名稱要跟發起方完全一樣',
    '\nstarter_pack_demo\n',
    '維護 / 兼容用 starter pack',
    '如果你未同意這個用戶名稱',
    '\nuser2\n',
    '你在自己的本機工作目錄如常打開 AI 工具即可',
    'APS 交換區只是 APS 用來同步交接資料',
  ]) {
    assert(starter.includes(text), `starter pack: missing ${text}`, starter);
  }
  assert(!starter.includes('你大致要做這幾件事： ☁️'), 'starter pack: invitation must not collapse into one paragraph', starter);
  assert(!starter.includes('你的用戶名稱請填'), 'starter pack: maintenance guide must not present assigned user name as ordinary invite flow', starter);
  console.log('PASS starter pack invitation is readable and AI-agent led');

  const starterAck = JSON.parse(fs.readFileSync(path.join(hubRoot, 'starter_pack_demo', '_ack', 'user2.ack.json'), 'utf8'));
  assert(Array.isArray(starterAck.declined), 'peer add ack skeleton: declined[] must exist for decline-aware protocol');
  const bridgePack = outputOf(runApsProcess(['bridge-pack']));
  assert(bridgePack.includes('ack.consumed'), 'bridge pack: pending logic must check consumed[]', bridgePack);
  assert(bridgePack.includes('ack.declined'), 'bridge pack: pending logic must check declined[]', bridgePack);
  console.log('PASS bridge pack and ack skeleton are decline-aware');

  writeTempApsConfig('open_invite_demo', 'adam');
  const inviteResult = runApsProcess(['peer', 'invite']);
  const inviteOutput = outputOf(inviteResult);
  assert(inviteResult.status === 0, `peer invite: expected exit 0, got ${inviteResult.status}`, inviteOutput);
  const invitePath = path.join(hubRoot, '_hub', 'open-invite-open_invite_demo.md');
  const invite = fs.readFileSync(invitePath, 'utf8');
  const inviteCodeMatch = invite.match(/APS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  assert(inviteCodeMatch, 'open invite: missing unique invite code', invite);
  const inviteCode = inviteCodeMatch[0];
  const inviteRecordPath = path.join(hubRoot, 'open_invite_demo', '_invites', `${inviteCode}.json`);
  assert(fs.existsSync(inviteRecordPath), 'open invite: missing invite JSON record');
  const inviteRecord = JSON.parse(fs.readFileSync(inviteRecordPath, 'utf8'));
  assert(inviteRecord.status === 'open', 'open invite record: expected open status before join', JSON.stringify(inviteRecord, null, 2));
  assert(inviteRecord.inviter_agent_id === 'adam', 'open invite record: expected inviter adam', JSON.stringify(inviteRecord, null, 2));
  for (const text of [
    '📨 APS 協作邀請：open_invite_demo',
    '你的加入邀請碼是：',
    inviteCode,
    '這個邀請碼只代表「可以加入這個 APS 合作目錄」，不代表你的用戶名稱',
    '你的用戶名稱由你自己決定，AI 會先檢查是否重名。',
    '請先做幾件簡單的事：',
    '先到你的 email 找 Google Drive 分享通知，接受分享資料夾「',
    '在你平日處理這個項目的本機工作目錄，打開能操作本機檔案的 AI 代理，例如 Codex、Claude Code 或 Claude Cowork',
    'AI 會建議你加入 open_invite_demo，並請你提供自己電腦上的 Google Drive 本機路徑和你想使用的用戶名稱。',
    '把下面 `---✂️---` 之間的整段直接貼給 AI',
    '---✂️---',
    '請在目前本機工作目錄，按以下頁面完成 Agent Public Squares（APS）安裝、加入或升級：',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html',
    'APS 合作目錄名稱：\nopen_invite_demo',
    `邀請碼：\n${inviteCode}`,
    'Google Drive 共用資料夾名稱：',
    '邀請人：\nadam',
    '請按頁內收尾輸出，用與 CLI 對齊的短格式回報',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html',
  ]) {
    assert(invite.includes(text), `open invite: missing ${text}`, invite);
  }
  for (const text of [
    '--- 可轉發邀請開始 ---',
    '📨 APS 協作邀請：open_invite_demo',
    '---✂️---',
    `APS 合作目錄名稱：\nopen_invite_demo`,
    `邀請碼：\n${inviteCode}`,
    '--- 可轉發邀請結束 ---',
  ]) {
    assert(inviteOutput.includes(text), `peer invite stdout: missing ${text}`, inviteOutput);
  }
  assert(!invite.includes('我收到一個 Agent Public Squares（APS）協作邀請。請你帶我加入這個 APS project。'), 'open invite: must not drift from the public HTML core prompt', invite);
  assert(!invite.includes('你的用戶名稱請填'), 'open invite: must not assign the recipient APS name', invite);
  assert(!invite.includes('你的用戶名稱請填'), 'open invite: must not assign the recipient user name', invite);
  assert(!invite.includes('\nuser2\n'), 'open invite: must not include hard-coded user2 identity', invite);
  assert(!invite.includes('建議另開新資料夾'), 'open invite: must not suggest a new local work folder as the default', invite);
  assert(!invite.includes('替你取的用戶名稱'), 'open invite: must not imply the inviter named the recipient', invite);
  assert(!invite.includes('不要直接在目前這個資料夾'), 'open invite: must not frame joining as leaving the current local work folder by default', invite);
  assert(!invite.includes('請先分清三個位置'), 'open invite: must not lead with internal location taxonomy', invite);
  assert(!invite.includes('收到邀請時，不要因為對方的邀請碼而改建或切換本機工作目錄'), 'open invite: must not show old internal risk wording in normal flow', invite);
  assert(!invite.includes('如果雙方都互相發出邀請，先停下來選一個共同 APS 合作目錄作本次合作唯一合作空間'), 'open invite: must not ask the recipient to resolve mutual-invite internals up front', invite);
  assert(!invite.includes('請先輸出「加入判斷卡」'), 'open invite: must not show the old decision-card wording', invite);
  assert(invite.includes('請在目前本機工作目錄，按以下頁面完成 Agent Public Squares（APS）安裝、加入或升級：'), 'open invite: must keep the client prompt short', invite);
  assert(invite.includes('請按頁內收尾輸出，用與 CLI 對齊的短格式回報'), 'open invite: must delegate completion reporting to the AI install page', invite);
  assert(!invite.includes('如果我是受邀加入，第一屏請用以下方向簡短回覆'), 'open invite: must not inline the long B-side prompt', invite);
  assert(!invite.includes('下面網址是給本機 AI 代理讀的安裝／加入依據'), 'open invite: must not keep the old long URL framing', invite);
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', 'from_user2')), 'open invite: must not create invitee lane');
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_ack', 'user2.ack.json')), 'open invite: must not create invitee ack');
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_peers', 'agents', 'user2.json')), 'open invite: must not create invitee peer card');
  console.log('PASS peer invite is copy-paste ready without preassigning identity');

  const inviteJoin = runApsProcess(
    ['init', '--target', 'codex', '--hub-root', hubRoot, '--project', 'open_invite_demo', '--agent-id', 'mira', '--invite-code', inviteCode],
    makeHandoffProject('open-invite-joiner-project'),
  );
  const inviteJoinOutput = outputOf(inviteJoin);
  assert(inviteJoin.status === 0, `invite-code join init: expected exit 0, got ${inviteJoin.status}`, inviteJoinOutput);
  const acceptedInviteRecord = JSON.parse(fs.readFileSync(inviteRecordPath, 'utf8'));
  assert(acceptedInviteRecord.status === 'accepted', 'open invite record: expected accepted status after join', JSON.stringify(acceptedInviteRecord, null, 2));
  assert(acceptedInviteRecord.accepted_by === 'mira', 'open invite record: expected accepted_by mira', JSON.stringify(acceptedInviteRecord, null, 2));
  assert(fs.existsSync(path.join(hubRoot, 'open_invite_demo', 'from_mira', 'outbox.log.md')), 'invite-code join: missing mira lane');
  assert(fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_ack', 'mira.ack.json')), 'invite-code join: missing mira ack');
  assert(fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_peers', 'agents', 'mira.json')), 'invite-code join: missing mira peer card');
  const inviteReuse = runApsProcess(
    ['init', '--target', 'codex', '--dry-run', '--hub-root', hubRoot, '--project', 'open_invite_demo', '--agent-id', 'noah', '--invite-code', inviteCode],
    makeHandoffProject('open-invite-reuse-project'),
  );
  const inviteReuseOutput = outputOf(inviteReuse);
  assert(inviteReuse.status === 1, `invite-code reuse: expected exit 1, got ${inviteReuse.status}`, inviteReuseOutput);
  assert(inviteReuseOutput.includes('is accepted'), 'invite-code reuse: missing accepted-code warning', inviteReuseOutput);
  console.log('PASS peer invite code records acceptance and blocks reuse');

  writeTempApsConfig('open_invite_demo', 'adam');
  const secondInvite = runApsProcess(['peer', 'invite']);
  const secondInviteOutput = outputOf(secondInvite);
  assert(secondInvite.status === 0, `second peer invite: expected exit 0, got ${secondInvite.status}`, secondInviteOutput);
  const secondInviteText = fs.readFileSync(invitePath, 'utf8');
  const secondInviteCodeMatch = secondInviteText.match(/APS-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}/);
  assert(secondInviteCodeMatch, 'second invite: missing invite code', secondInviteText);
  const secondInviteCode = secondInviteCodeMatch[0];
  const secondJoin = runApsProcess(
    ['init', '--target', 'codex', '--hub-root', hubRoot, '--project', 'open_invite_demo', '--agent-id', 'noah', '--invite-code', secondInviteCode],
    makeHandoffProject('open-invite-second-joiner-project'),
  );
  const secondJoinOutput = outputOf(secondJoin);
  assert(secondJoin.status === 0, `second invite-code join: expected exit 0, got ${secondJoin.status}`, secondJoinOutput);
  const projectPeers = fs.readdirSync(path.join(hubRoot, 'open_invite_demo', '_peers', 'agents'))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.replace(/\.json$/, ''))
    .sort();
  assert(projectPeers.includes('adam') && projectPeers.includes('mira') && projectPeers.includes('noah'), `multi-peer project: expected adam/mira/noah, got ${projectPeers.join(', ')}`);
  writeFile(path.join(hubRoot, 'open_invite_demo', 'from_adam', 'outbox.log.md'), '');
  const oneToOnePublish = runApsProcess(['publish', '--to', 'mira', '--topic', 'one_to_one_check', '--body', 'one-to-one packet for Mira only']);
  const oneToOneOutput = outputOf(oneToOnePublish);
  assert(oneToOnePublish.status === 0, `one-to-one publish: expected exit 0, got ${oneToOnePublish.status}`, oneToOneOutput);
  const oneToOnePacketId = extractPublishedPacketId(oneToOneOutput, 'one-to-one publish');
  const packetText = fs.readFileSync(path.join(hubRoot, 'open_invite_demo', 'from_adam', 'packets', `${oneToOnePacketId}__v1`, 'packet.md'), 'utf8');
  assert(packetText.includes('\nto: mira\n'), 'one-to-one packet: expected to mira', packetText);
  assert(!packetText.includes('\nto: noah\n'), 'one-to-one packet: must not target noah', packetText);
  console.log('PASS one project supports multiple confirmed peers while each packet stays one-to-one');

  writeFile(
    path.join(hubRoot, 'duplicate_join', '_peers', 'agents', 'alex.json'),
    `${JSON.stringify({
      project: 'duplicate_join',
      agent_id: 'alex',
      display_name: 'Alex',
      lane: 'from_alex',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-12T00:00:00.000Z',
    }, null, 2)}\n`,
  );
  const duplicateInit = runApsProcess(
    ['init', '--target', 'codex', '--dry-run', '--hub-root', hubRoot, '--project', 'duplicate_join', '--agent-id', 'alex'],
    makeHandoffProject('duplicate-joiner-project'),
  );
  const duplicateOutput = outputOf(duplicateInit);
  assert(duplicateInit.status === 1, `duplicate init: expected exit 1, got ${duplicateInit.status}`, duplicateOutput);
  assert(duplicateOutput.includes('用戶名稱 alex 在這個 APS 合作目錄已存在'), 'duplicate init: missing collision warning', duplicateOutput);
  console.log('PASS init blocks duplicate confirmed APS identity');

  const provisionalJoin = runApsProcess(
    ['init', '--target', 'codex', '--dry-run', '--hub-root', hubRoot, '--project', 'starter_pack_demo', '--agent-id', 'user2'],
    makeHandoffProject('provisional-joiner-project'),
  );
  const provisionalJoinOutput = outputOf(provisionalJoin);
  assert(provisionalJoin.status === 0, `provisional join init: expected exit 0, got ${provisionalJoin.status}`, provisionalJoinOutput);
  console.log('PASS init allows agreed provisional starter identity to self-confirm');
  const postJoinProject = 'post_join_peer_confirmation';
  const postInitiatorRoot = makeHandoffProject('post-join-mira-project');
  const postInitiatorInit = runApsProcess(
    ['init', '--target', 'codex', '--hub-root', hubRoot, '--project', postJoinProject, '--agent-id', 'mira_zero'],
    postInitiatorRoot,
  );
  assert(postInitiatorInit.status === 0, `post-join mira init: expected exit 0, got ${postInitiatorInit.status}`, outputOf(postInitiatorInit));

  writeTempApsConfig(postJoinProject, 'mira_zero');
  const postJoinInvite = runApsProcess(['peer', 'invite']);
  assert(postJoinInvite.status === 0, `post-join invite: expected exit 0, got ${postJoinInvite.status}`, outputOf(postJoinInvite));

  const postJoinerRoot = makeHandoffProject('post-join-noah-project');
  const postJoinerInit = runApsProcess(
    ['init', '--target', 'codex', '--hub-root', hubRoot, '--project', postJoinProject, '--agent-id', 'noah_joiner'],
    postJoinerRoot,
  );
  assert(postJoinerInit.status === 0, `post-join noah init: expected exit 0, got ${postJoinerInit.status}`, outputOf(postJoinerInit));

  writeTempApsConfig(postJoinProject, 'mira_zero');
  const postJoinPeerAdd = runApsProcess(['peer', 'add', '--agent-id', 'noah_joiner', '--display-name', 'Noah Joiner']);
  const postJoinPeerAddOutput = outputOf(postJoinPeerAdd);
  assert(postJoinPeerAdd.status === 0, `post-join peer add: expected exit 0, got ${postJoinPeerAdd.status}`, postJoinPeerAddOutput);
  assert(postJoinPeerAddOutput.includes('confirmed 已保留'), 'post-join peer add must not downgrade a confirmed joiner', postJoinPeerAddOutput);
  const noahCardAfterAdd = JSON.parse(fs.readFileSync(path.join(hubRoot, postJoinProject, '_peers', 'agents', 'noah_joiner.json'), 'utf8'));
  assert(noahCardAfterAdd.peer_state === 'confirmed', 'post-join peer add must preserve confirmed peer card', JSON.stringify(noahCardAfterAdd, null, 2));

  const postJoinSharedGoal = runPublish([
    '--hub-root', hubRoot,
    '--project', postJoinProject,
    '--agent-id', 'mira_zero',
    '--to', 'noah_joiner',
    '--topic', 'shared_goal_and_roles',
    '--body',
    [
      '## 共同目標',
      'Mira 和 Noah 用 APS 完成加入後共同基準確認。',
      '## 本方任務',
      'Mira 發出第一份共同目標與分工確認包。',
      '## 對方任務',
      'Noah 先確認共同基準,再接收普通交接。',
      '## 交叉點',
      '普通交接要等 Noah 已確認共同基準後才可推進。',
      '## 請對方做的事',
      '請 Noah 確認這份共同目標與分工。',
      '## 不應誤解的事',
      '這不是要求 Noah 立即處理普通任務。',
      '## 真源指標',
      'APS packet: shared_goal_and_roles v1。',
      '## 接收方開工條件',
      'Noah 在自己 workspace 能看到同一份 shared_goal_and_roles 並確認。',
      '## 風險 / 未決事項',
      '若 Noah 不同意,應退回或要求修訂。',
    ].join('\n'),
    '--items', '確認共同目標與分工',
    '--strict-handoff',
  ]);
  const postJoinSharedGoalOutput = outputOf(postJoinSharedGoal);
  assert(postJoinSharedGoal.status === 0, `post-join shared goal publish: expected exit 0, got ${postJoinSharedGoal.status}`, postJoinSharedGoalOutput);
  const postJoinSharedGoalPacketId = extractPublishedPacketId(postJoinSharedGoalOutput, 'post-join shared goal publish');

  writeTempApsConfig(postJoinProject, 'noah_joiner');
  const postJoinConsume = runApsProcess(['consume',
    '--hub-root', hubRoot,
    '--project', postJoinProject,
    '--agent-id', 'noah_joiner',
    '--packet-id', postJoinSharedGoalPacketId,
    '--version', '1',
    '--result', 'Confirmed shared_goal_and_roles v1 for post-join peer confirmation journey',
  ]);
  assert(postJoinConsume.status === 0, `post-join shared goal consume: expected exit 0, got ${postJoinConsume.status}`, outputOf(postJoinConsume));

  writeTempApsConfig(postJoinProject, 'mira_zero');
  const postJoinOrdinary = runPublish([
    '--hub-root', hubRoot,
    '--project', postJoinProject,
    '--agent-id', 'mira_zero',
    '--to', 'noah_joiner',
    '--topic', 'first_ordinary_handoff',
    '--body',
    [
      '## 共同目標',
      'Mira 和 Noah 用 APS 完成加入後第一份普通交接。',
      '## 本方任務',
      'Mira 已完成共同基準確認,準備交出第一個小任務。',
      '## 對方任務',
      'Noah 檢查第一份普通交接是否可開工。',
      '## 交叉點',
      'Noah 的判斷會決定下一輪是否需要補資料。',
      '## 請對方做的事',
      '請 Noah 回覆第一份普通交接是否可開工。',
      '## 不應誤解的事',
      '不要把這包當成新的共同基準版本。',
      '## 真源指標',
      'APS packet: shared_goal_and_roles v1; docs/demo-first-handoff.md v1。',
      '## 接收方開工條件',
      'Noah 已確認 shared_goal_and_roles v1,並能讀到本普通交接包。',
      '## 風險 / 未決事項',
      '若普通交接內容不足,Noah 應退回要求補資料。',
    ].join('\n'),
    '--items', '判斷第一份普通交接是否可開工',
    '--strict-handoff',
  ]);
  assert(postJoinOrdinary.status === 0, `post-join first ordinary handoff publish: expected exit 0, got ${postJoinOrdinary.status}`, outputOf(postJoinOrdinary));
  console.log('PASS post-join peer confirmation preserves confirmed joiner and reaches first ordinary handoff');

  publishReadyProject('publish_missing_peer');
  expectPublishCase(
    'publish blocks local APS identity override',
    ['--hub-root', hubRoot, '--project', 'publish_missing_peer', '--from', 'mary', '--to', 'jay', '--topic', 'identity_override', '--body', 'should block'],
    1,
    ['publish 已阻擋', '本機用戶名稱是 adam', '指令要求使用 mary', '--allow-agent-override'],
  );
  for (const [name, command, extraArgs, expectedText] of [
    ['revise blocks local APS identity override', 'revise', ['--packet-id', '20260612T000000Z__identity_override', '--body', 'should block', '--reason', 'identity check'], 'revise 已阻擋'],
    ['consume blocks local APS identity override', 'consume', ['--packet-id', '20260612T000000Z__identity_override', '--version', '1', '--result', 'should block'], 'consume 已阻擋'],
    ['decline blocks local APS identity override', 'decline', ['--packet-id', '20260612T000000Z__identity_override', '--version', '1', '--reason', 'identity check'], 'decline 已阻擋'],
    ['withdraw blocks local APS identity override', 'withdraw', ['--packet-id', '20260612T000000Z__identity_override', '--reason', 'identity check'], 'withdraw 已阻擋'],
    ['close blocks local APS identity override', 'close', ['--packet-id', '20260612T000000Z__identity_override', '--reason', 'identity check'], 'close 已阻擋'],
  ]) {
    const result = runApsProcess([command, '--hub-root', hubRoot, '--project', 'publish_missing_peer', '--agent-id', 'mary', ...extraArgs]);
    const output = outputOf(result);
    assert(result.status === 1, `${name}: expected exit 1, got ${result.status}`, output);
    for (const text of [expectedText, '本機用戶名稱是 adam', '指令要求使用 mary', '--allow-agent-override']) {
      assert(output.includes(text), `${name}: missing expected output text "${text}"`, output);
    }
    console.log(`PASS ${name}`);
  }
  expectPublishCase(
    'publish blocks explicit unregistered peer',
    ['--hub-root', hubRoot, '--project', 'publish_missing_peer', '--agent-id', 'adam', '--to', 'ghost_id', '--topic', 'missing_peer', '--body', 'should block'],
    1,
    ['not registered as a project peer', 'ask your AI to generate an APS invite', 'Maintenance fallback only'],
  );

  writeTempApsConfig('publish_provisional_peer', 'adam');
  const provisionalPeer = runApsProcess(['peer', 'add', '--agent-id', 'pending_peer', '--display-name', 'Pending Peer']);
  const provisionalPeerOutput = outputOf(provisionalPeer);
  assert(provisionalPeer.status === 0, `provisional peer add: expected exit 0, got ${provisionalPeer.status}`, provisionalPeerOutput);
  expectPublishCase(
    'publish blocks inactive provisional peer',
    ['--hub-root', hubRoot, '--project', 'publish_provisional_peer', '--agent-id', 'adam', '--to', 'pending_peer', '--topic', 'provisional_peer', '--body', 'should block'],
    1,
    ['no activity yet', 'ask your AI to generate an APS invite'],
  );

  publishReadyProject('decline_packet_demo');
  writeFile(
    path.join(hubRoot, 'decline_packet_demo', '_ack', 'jay.ack.json'),
    `${JSON.stringify({ agent: 'jay', project: 'decline_packet_demo', consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  const declinePublish = runPublish([
    '--hub-root', hubRoot,
    '--project', 'decline_packet_demo',
    '--agent-id', 'adam',
    '--to', 'jay',
    '--topic', 'decline_demo',
    '--body',
    [
      '## 共同目標',
      '測試退回狀態。',
      '## 本方任務',
      'Adam 提供一個故意缺資料的交接。',
      '## 對方任務',
      'Jay 應退回。',
      '## 交叉點',
      'Jay 需要來源檔。',
      '## 請對方做的事',
      '請確認能否處理。',
      '## 不應誤解',
      '這不是要求 Jay 在缺少來源檔時硬做。',
      '## 證據位置',
      'missing-source.md',
      '## 接收方開工條件',
      'Jay 能在共用 Drive 內找到 missing-source.md，否則應退回補資料。',
      '## 風險',
      '來源檔缺失。',
    ].join('\n'),
    '--items', '確認能否處理',
    '--strict-handoff',
  ]);
  const declinePublishOutput = outputOf(declinePublish);
  assert(declinePublish.status === 0, `decline demo publish: expected exit 0, got ${declinePublish.status}`, declinePublishOutput);
  const declinePacketId = (declinePublishOutput.match(/已發佈 (\d{8}T\d{6}Z__decline_demo) v1/) || [])[1];
  assert(declinePacketId, 'decline demo publish: missing packet id', declinePublishOutput);
  writeTempApsConfig('decline_packet_demo', 'jay');
  const declineResult = runApsProcess(['decline', '--packet-id', declinePacketId, '--version', '1', '--reason', 'missing source file']);
  const declineOutput = outputOf(declineResult);
  assert(declineResult.status === 0, `decline command: expected exit 0, got ${declineResult.status}`, declineOutput);
  assert(declineOutput.includes('已退回'), 'decline command: missing declined message', declineOutput);
  const afterDeclineInbox = runApsProcess(['inbox']);
  const afterDeclineInboxOutput = outputOf(afterDeclineInbox);
  assert(afterDeclineInbox.status === 0, `decline inbox: expected exit 0, got ${afterDeclineInbox.status}`, afterDeclineInboxOutput);
  assert(afterDeclineInboxOutput.includes('沒有待處理項目'), 'decline inbox: declined packet must not remain pending', afterDeclineInboxOutput);
  const consumeDeclined = runApsProcess(['consume', '--packet-id', declinePacketId, '--version', '1', '--result', 'should not consume']);
  const consumeDeclinedOutput = outputOf(consumeDeclined);
  assert(consumeDeclined.status === 1, `consume declined packet: expected exit 1, got ${consumeDeclined.status}`, consumeDeclinedOutput);
  assert(consumeDeclinedOutput.includes('already declined'), 'consume declined packet: missing already declined warning', consumeDeclinedOutput);
  writeTempApsConfig('decline_packet_demo', 'adam');
  const declineStatus = runApsProcess(['status', '--packet-id', declinePacketId]);
  const declineStatusOutput = outputOf(declineStatus);
  assert(declineStatus.status === 0, `decline status: expected exit 0, got ${declineStatus.status}`, declineStatusOutput);
  assert(declineStatusOutput.includes('已退回'), 'decline status: missing declined status', declineStatusOutput);
  assert(declineStatusOutput.includes('missing source file'), 'decline status: missing decline reason', declineStatusOutput);
  const declineCheckAps = runApsProcess(['check-aps']);
  const declineCheckApsOutput = outputOf(declineCheckAps);
  assert(declineCheckAps.status === 0, `decline check-aps: expected exit 0, got ${declineCheckAps.status}`, declineCheckApsOutput);
  for (const text of ['對方退回', 'missing source file', '修訂', '撤回', '收結']) {
    assert(declineCheckApsOutput.includes(text), `decline check-aps: missing ${text}`, declineCheckApsOutput);
  }
  const declineDashboard = runApsProcess(['dashboard']);
  const declineDashboardOutput = outputOf(declineDashboard);
  assert(declineDashboard.status === 0, `decline dashboard: expected exit 0, got ${declineDashboard.status}`, declineDashboardOutput);
  for (const text of ['dashboard 已退役', '未寫入任何 dashboard HTML', '請用 `npx aps check-aps`']) {
    assert(declineDashboardOutput.includes(text), `decline dashboard retired output: missing ${text}`, declineDashboardOutput);
  }
  assert(!fs.existsSync(path.join(hubRoot, 'decline_packet_demo', '_context', 'dashboard_adam.html')), 'retired dashboard command must not write personal dashboard');
  assert(!fs.existsSync(path.join(hubRoot, 'decline_packet_demo', '_context', 'dashboard.html')), 'retired dashboard command must not write dashboard index');
  console.log('PASS decline marks packet returned and surfaces sender next action');

  const identityProjectRoot = makeHandoffProject('identity-conflict-project');
  writeFile(path.join(identityProjectRoot, 'dev', 'rules', 'aps-bridge.md'), '# APS bridge\n');
  writeFile(path.join(identityProjectRoot, 'dev', 'RULE_PACKS.md'), 'APS route: dev/rules/aps-bridge.md\n');
  writeFile(path.join(identityProjectRoot, 'dev', 'PROJECT_INDEX.md'), 'APS config: .aps/config.json\n');
  writeFile(
    path.join(identityProjectRoot, '.aps', 'config.json'),
    `${JSON.stringify({
      hubRoot,
      projectSlug: 'identity_conflict_demo',
      agentId: 'adam',
      otherAgentId: null,
      role: null,
      createdAt: '2026-06-12T00:00:00.000Z',
      version: 1,
    }, null, 2)}\n`,
  );
  writeFile(path.join(hubRoot, '_hub', 'PROTOCOL.md'), '# protocol\n');
  writeFile(path.join(hubRoot, '_hub', 'CHANGELOG.md'), '# changelog\n');
  writeFile(path.join(hubRoot, 'identity_conflict_demo', 'from_adam', 'outbox.log.md'), '');
  writeFile(path.join(hubRoot, 'identity_conflict_demo', 'from_adam', 'packets', 'README.md'), '# packets\n');
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_ack', 'adam.ack.json'),
    `${JSON.stringify({ agent: 'adam', project: 'identity_conflict_demo', consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_ack', 'alex.ack.json'),
    `${JSON.stringify({ agent: 'mary', project: 'identity_conflict_demo', consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_ack', 'casey.ack.json'),
    `${JSON.stringify({ agent: 'casey', project: 'wrong_project', consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writeFile(path.join(hubRoot, 'identity_conflict_demo', 'from_bad-name', 'outbox.log.md'), '');
  writeFile(path.join(hubRoot, 'identity_conflict_demo', 'from_bad-name', 'packets', 'README.md'), '# packets\n');
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_peers', 'agents', 'bob.json'),
    `${JSON.stringify({
      project: 'identity_conflict_demo',
      agent_id: 'robert',
      display_name: 'Bob',
      lane: 'from_bob',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-12T00:00:00Z',
    }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_peers', 'agents', 'casey.json'),
    `${JSON.stringify({
      project: 'wrong_project',
      agent_id: 'casey',
      display_name: 'Casey',
      lane: 'from_casey',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-12T00:00:00Z',
    }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_peers', 'agents', 'dana.json'),
    `${JSON.stringify({
      project: 'identity_conflict_demo',
      agent_id: 'dana',
      display_name: 'Dana',
      lane: 'from_different_dana',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-12T00:00:00Z',
    }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'identity_conflict_demo', '_peers', 'agents', 'erin.json'),
    `${JSON.stringify({
      project: 'identity_conflict_demo',
      agent_id: 'erin',
      display_name: 'Erin',
      lane: 'from_erin',
      status: 'active',
      peer_state: 'confirmed',
      updated_at: '2026-06-12T00:00:00Z',
    }, null, 2)}\n`,
  );
  const identityDoctor = runApsProcess(['doctor'], identityProjectRoot);
  const identityDoctorOutput = outputOf(identityDoctor);
  assert(identityDoctor.status === 1, `identity doctor: expected exit 1, got ${identityDoctor.status}`, identityDoctorOutput);
  for (const text of [
    '身份結構檢查',
    'alex.ack.json 內的 agent 是 mary',
    'casey.ack.json 內的 project 是 wrong_project',
    'lane 名稱 from_bad-name 不是合法用戶名稱',
    'bob.json 內的 agent_id 是 robert',
    'casey.json 內的 project 是 wrong_project',
    'dana.json 內的 lane 是 from_different_dana',
    'bob 有 peer card,但缺少 lane 缺少 ack',
  ]) {
    assert(identityDoctorOutput.includes(text), `identity doctor: missing ${text}`, identityDoctorOutput);
  }
  const identityCheckAps = runApsProcess(['check-aps'], identityProjectRoot);
  const identityCheckApsOutput = outputOf(identityCheckAps);
  assert(identityCheckAps.status === 0, `identity check-aps: expected exit 0, got ${identityCheckAps.status}`, identityCheckApsOutput);
  for (const text of [
    '需要注意',
    '建議下一步（可直接複製給 AI）',
    'alex.ack.json 內的 agent 是 mary',
    'casey.ack.json 內的 project 是 wrong_project',
    'lane 名稱 from_bad-name 不是合法用戶名稱',
  ]) {
    assert(identityCheckApsOutput.includes(text), `identity check-aps: missing ${text}`, identityCheckApsOutput);
  }
  for (const text of ['風險與提醒', '數量摘要（排錯用）', '同步與 APS Live（排錯用）']) {
    assert(!identityCheckApsOutput.includes(text), `identity check-aps default: should not include ${text}`, identityCheckApsOutput);
  }
  const identityCheckApsFull = runApsProcess(['check-aps', '--full'], identityProjectRoot);
  const identityCheckApsFullOutput = outputOf(identityCheckApsFull);
  assert(identityCheckApsFull.status === 0, `identity check-aps --full: expected exit 0, got ${identityCheckApsFull.status}`, identityCheckApsFullOutput);
  for (const text of [
    '風險與提醒',
    '數量摘要（排錯用）',
    '同步與 APS Live（排錯用）',
    'HTML dashboard 已退役',
    'bob.json 內的 agent_id 是 robert',
    'casey.json 內的 project 是 wrong_project',
    'dana.json 內的 lane 是 from_different_dana',
    'bob 有 peer card,但缺少 lane 缺少 ack',
    '正式交接前先等對方完成 APS 設定並重跑 doctor',
  ]) {
    assert(identityCheckApsFullOutput.includes(text), `identity check-aps --full: missing ${text}`, identityCheckApsFullOutput);
  }
  console.log('PASS identity conflict and Drive sync delay scan catches ack, lane, peer-card, wrong-project, and incomplete peer artifacts');

  publishReadyProject('strict_publish_complete');
  expectPublishCase(
    'strict handoff allows complete packet',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_publish_complete',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'handoff_ready',
      '--body',
      [
        '## 共同目標',
        '讓新手交接流程在資料不足時先補洞,再發正式 APS 交接包。',
        '',
        '## 本方任務',
        '已完成發送方流程分析,並準備把問題交給 Jay 審閱。',
        '',
        '## 對方任務',
        'Jay 需要審閱交接定義卡是否足夠保護新手。',
        '',
        '## 交叉點',
        'Jay 只需審閱新手交接流程,不用接手整個專案。',
        '',
        '## 請對方做的事',
        '請確認三問補洞是否足夠。',
        '',
        '## 不應誤解',
        '這不是要求 Jay 發佈版本或覆寫文件。',
        '',
        '## 證據位置',
        '參考共用 Drive 內 README.md 與 skills/aps/SKILL.md 的新手交接流程。',
        '',
        '## 接收方開工條件',
        'Jay 能在自己的項目資料夾找到 README.md 與 skills/aps/SKILL.md，並確認這兩份檔案是最新同步版本。',
        '',
        '## 風險 / 未決事項',
        '仍需真實新手演練驗證。',
      ].join('\n'),
      '--items', '確認三問補洞是否足夠',
      '--strict-handoff',
    ],
    0,
    ['已發佈', '交接完整性檢查: 通過', '已申報項目'],
  );

  publishReadyProject('strict_publish_without_items');
  expectPublishCase(
    'strict handoff blocks body-only action item',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_publish_without_items',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'handoff_without_items',
      '--body',
      [
        '## 共同目標',
        '讓新手交接流程在資料不足時先補洞,再發正式 APS 交接包。',
        '',
        '## 本方任務',
        '已完成發送方流程分析。',
        '',
        '## 對方任務',
        'Jay 需要審閱交接定義卡。',
        '',
        '## 交叉點',
        'Jay 只需審閱新手交接流程。',
        '',
        '## 請對方做的事',
        '請確認三問補洞是否足夠。',
        '',
        '## 不應誤解',
        '這不是要求 Jay 發佈版本。',
        '',
        '## 證據位置',
        '參考 README 與 skills/aps/SKILL.md。',
        '',
        '## 接收方開工條件',
        'Jay 能在自己的項目資料夾找到 README.md 與 skills/aps/SKILL.md。',
        '',
        '## 風險 / 未決事項',
        '仍需真實新手演練驗證。',
      ].join('\n'),
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '請對方做的事', '--items', '缺少'],
  );

  publishReadyProject('strict_publish_empty_headings');
  expectPublishCase(
    'strict handoff blocks empty headings',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_publish_empty_headings',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'empty_headings',
      '--body',
      [
        '## 共同目標',
        '',
        '## 本方任務',
        '',
        '## 對方任務',
        '未確認',
        '',
        '## 交叉點',
        '',
        '## 請對方做的事',
        '',
        '## 不應誤解',
        '',
        '## 證據位置',
        '',
        '## 風險 / 未決事項',
        '未確認',
      ].join('\n'),
      '--items', '確認',
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '內容不足', '共同目標', '真源指標'],
  );

  publishReadyProject('strict_publish_template_words');
  expectPublishCase(
    'strict handoff blocks placeholder core content',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_publish_template_words',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'template_words',
      '--body',
      [
        '## 共同目標',
        '未確認',
        '',
        '## 本方任務',
        '待確認',
        '',
        '## 對方任務',
        '未確認',
        '',
        '## 交叉點',
        'TBD',
        '',
        '## 請對方做的事',
        '見 items。',
        '',
        '## 不應誤解',
        '不是正式要求。',
        '',
        '## 證據位置',
        'N/A',
        '',
        '## 風險 / 未決事項',
        '未確認',
      ].join('\n'),
      '--items', '確認',
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '內容不足', '共同目標', '本方任務', '真源指標'],
  );

  publishReadyProject('strict_local_source');
  expectPublishCase(
    'strict handoff blocks sender-local-only source',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_local_source',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'local_only_source',
      '--body',
      [
        '## 共同目標',
        '讓 Jay 審閱首頁交接流程。',
        '',
        '## 本方任務',
        'Adam 已整理目前首頁草稿。',
        '',
        '## 對方任務',
        'Jay 需要審閱首頁草稿。',
        '',
        '## 交叉點',
        'Jay 只審閱首頁草稿，不改其他頁。',
        '',
        '## 請對方做的事',
        '請審閱首頁草稿是否清楚。',
        '',
        '## 不應誤解',
        '這不是要求 Jay 發佈網站。',
        '',
        '## 證據位置',
        'C:\\Users\\adam\\Desktop\\homepage-draft.md',
        '',
        '## 接收方開工條件',
        'Jay 能讀到首頁草稿。',
        '',
        '## 風險 / 未決事項',
        '若 Jay 讀不到草稿，應退回補資料。',
      ].join('\n'),
      '--items', '審閱首頁草稿是否清楚',
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '可共享真源指標'],
  );

  publishReadyProject('strict_no_start');
  expectPublishCase(
    'strict handoff blocks missing receiver start condition',
    [
      '--hub-root', hubRoot,
      '--project', 'strict_no_start',
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', 'missing_start_condition',
      '--body',
      [
        '## 共同目標',
        '讓 Jay 審閱首頁交接流程。',
        '',
        '## 本方任務',
        'Adam 已整理目前首頁草稿。',
        '',
        '## 對方任務',
        'Jay 需要審閱首頁草稿。',
        '',
        '## 交叉點',
        'Jay 只審閱首頁草稿，不改其他頁。',
        '',
        '## 請對方做的事',
        '請審閱首頁草稿是否清楚。',
        '',
        '## 不應誤解',
        '這不是要求 Jay 發佈網站。',
        '',
        '## 證據位置',
        '共用 Drive 內 docs/guides/index.html，版本以 2026-06-14 同步檔為準。',
        '',
        '## 風險 / 未決事項',
        '若 Jay 讀不到草稿，應退回補資料。',
      ].join('\n'),
      '--items', '審閱首頁草稿是否清楚',
      '--strict-handoff',
    ],
    1,
    ['交接資料未齊', '接收方開工條件'],
  );
  publishReadyProject('strict_secret_like_body');
  const fakeSecretSamples = [
    ['openai key', 'sk-' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['anthropic key', 'sk-' + 'ant-APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['github pat', 'github_pat_' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['github oauth', 'gho_' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['github server', 'ghs_' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['notion token', 'ntn_' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['secret prefix', 'secret_' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['google oauth', 'ya29.' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['oauth refresh', '1//' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['slack bot', 'xoxb-' + 'APS-QC-FAKE-SECRET-000000'],
    ['slack user', 'xoxp-' + 'APS-QC-FAKE-SECRET-000000'],
    ['slack app', 'sl.' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['google api', 'AIza' + 'APS_QC_FAKE_SECRET_DO_NOT_USE_000000'],
    ['aws access', 'AKIA' + 'ABCDEFGHIJKLMNOP'],
    ['private key', '-----BEGIN ' + 'PRIVATE KEY-----\\nAPS_QC_FAKE_SECRET_DO_NOT_USE_000000\\n-----END ' + 'PRIVATE KEY-----'],
  ];
  for (const [sampleName, sampleValue] of fakeSecretSamples) {
    expectPublishCase(
      `strict handoff blocks credential-like body: ${sampleName}`,
      [
        '--hub-root', hubRoot,
        '--project', 'strict_secret_like_body',
        '--agent-id', 'adam',
        '--to', 'jay',
        '--topic', `credential_like_body_${sampleName.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
        '--body',
        [
          '## 共同目標',
          '讓 Jay 審閱首頁交接流程。',
          '',
          '## 本方任務',
          'Adam 已整理目前首頁草稿。',
          '',
          '## 對方任務',
          'Jay 需要審閱首頁草稿。',
          '',
          '## 交叉點',
          'Jay 只審閱首頁草稿，不改其他頁。',
          '',
          '## 請對方做的事',
          '請審閱首頁草稿是否清楚。',
          '',
          '## 不應誤解',
          '這不是要求 Jay 發佈網站。',
          '',
          '## 證據位置',
          '共用 Drive 內 docs/guides/index.html，版本以 2026-06-14 同步檔為準。',
          '',
          '## 接收方開工條件',
          'Jay 能讀到共用 Drive 內 docs/guides/index.html。',
          '',
          '## 風險 / 未決事項',
          `測試用假字串 ${sampleValue} 必須被 strict handoff 擋下。`,
        ].join('\\n'),
        '--items', '審閱首頁草稿是否清楚',
        '--strict-handoff',
      ],
      1,
      ['交接資料未齊', 'API key', 'token', '憑證'],
    );
  }
  const statusMatrixProject = 'status_lifecycle_matrix';
  writeTempApsConfig(statusMatrixProject, 'adam');
  writeFile(path.join(hubRoot, statusMatrixProject, 'from_adam', 'outbox.log.md'), '');
  writeFile(path.join(hubRoot, statusMatrixProject, 'from_jay', 'outbox.log.md'), '');
  writeFile(
    path.join(hubRoot, statusMatrixProject, '_ack', 'jay.ack.json'),
    `${JSON.stringify({ agent: 'jay', project: statusMatrixProject, consumed: [], declined: [], open_questions: [] }, null, 2)}\n`,
  );
  writePeerCard(statusMatrixProject, 'adam', 'Adam');
  writePeerCard(statusMatrixProject, 'jay', 'Jay');

  const publishLifecyclePacket = (topic, body) => {
    writeTempApsConfig(statusMatrixProject, 'adam');
    const result = runPublish([
      '--hub-root', hubRoot,
      '--project', statusMatrixProject,
      '--agent-id', 'adam',
      '--to', 'jay',
      '--topic', topic,
      '--body', body,
      '--items', '處理這個 lifecycle 狀態矩陣案例',
    ]);
    const output = outputOf(result);
    assert(result.status === 0, `status lifecycle ${topic} publish: expected exit 0, got ${result.status}`, output);
    return extractPublishedPacketId(output, `status lifecycle ${topic} publish`);
  };

  const expectLifecycleStatus = (name, packetId, requiredText) => {
    writeTempApsConfig(statusMatrixProject, 'adam');
    const result = runApsProcess(['status', '--hub-root', hubRoot, '--project', statusMatrixProject, '--agent-id', 'adam', '--packet-id', packetId]);
    const output = outputOf(result);
    assert(result.status === 0, `${name}: expected exit 0, got ${result.status}`, output);
    for (const text of requiredText) {
      assert(output.includes(text), `${name}: missing expected output text "${text}"`, output);
    }
  };

  const reviewPacketId = publishLifecyclePacket('status_matrix_review', '請 Jay 審閱 lifecycle 狀態矩陣案例。');
  expectLifecycleStatus('status matrix pending v1', reviewPacketId, ['最新版本: v1', '尚未看到收件方處理此最新版本']);
  writeTempApsConfig(statusMatrixProject, 'adam');
  const reviseMatrix = runApsProcess(['revise',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'adam',
    '--packet-id', reviewPacketId,
    '--body', 'v2 補充 Jay 需要的開工條件。',
    '--reason', '補齊 receiver start condition for lifecycle matrix',
    '--items', '重新審閱 lifecycle 狀態矩陣案例',
  ]);
  assert(reviseMatrix.status === 0, `status matrix revise: expected exit 0, got ${reviseMatrix.status}`, outputOf(reviseMatrix));
  assert(outputOf(reviseMatrix).includes('已修訂'), 'status matrix revise: missing revised output', outputOf(reviseMatrix));
  expectLifecycleStatus('status matrix pending v2', reviewPacketId, ['最新版本: v2', '尚未看到收件方處理此最新版本']);
  writeTempApsConfig(statusMatrixProject, 'jay');
  const declineMatrix = runApsProcess(['decline',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'jay',
    '--packet-id', reviewPacketId,
    '--version', '2',
    '--reason', 'Need one more receiver-readable source pointer',
  ]);
  assert(declineMatrix.status === 0, `status matrix decline v2: expected exit 0, got ${declineMatrix.status}`, outputOf(declineMatrix));
  expectLifecycleStatus('status matrix declined v2', reviewPacketId, ['最新版本: v2', '收件方已退回 / 不能處理', 'Need one more receiver-readable source pointer']);
  writeTempApsConfig(statusMatrixProject, 'adam');
  const withdrawOldVersion = runApsProcess(['withdraw',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'adam',
    '--packet-id', reviewPacketId,
    '--version', '1',
    '--reason', 'old version boundary check',
  ]);
  assert(withdrawOldVersion.status === 1, `status matrix withdraw old version: expected exit 1, got ${withdrawOldVersion.status}`, outputOf(withdrawOldVersion));
  assert(outputOf(withdrawOldVersion).includes('withdraw only supports the latest version'), 'status matrix withdraw old version: missing latest-version boundary', outputOf(withdrawOldVersion));

  const withdrawPacketId = publishLifecyclePacket('status_matrix_withdraw', '請 Jay 忽略這個稍後撤回的案例。');
  writeTempApsConfig(statusMatrixProject, 'adam');
  const withdrawMatrix = runApsProcess(['withdraw',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'adam',
    '--packet-id', withdrawPacketId,
    '--reason', 'No longer needed for lifecycle matrix',
  ]);
  assert(withdrawMatrix.status === 0, `status matrix withdraw latest: expected exit 0, got ${withdrawMatrix.status}`, outputOf(withdrawMatrix));
  expectLifecycleStatus('status matrix withdrawn', withdrawPacketId, ['最新版本: v1', '最新版本已撤回']);

  const closePacketId = publishLifecyclePacket('status_matrix_close', '請 Jay 處理後讓 Adam 收結這個案例。');
  writeTempApsConfig(statusMatrixProject, 'jay');
  const consumeMatrix = runApsProcess(['consume',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'jay',
    '--packet-id', closePacketId,
    '--version', '1',
    '--result', 'Handled lifecycle matrix close case',
  ]);
  assert(consumeMatrix.status === 0, `status matrix consume: expected exit 0, got ${consumeMatrix.status}`, outputOf(consumeMatrix));
  expectLifecycleStatus('status matrix consumed', closePacketId, ['最新版本: v1', '收件方已標記處理', 'Handled lifecycle matrix close case']);
  writeTempApsConfig(statusMatrixProject, 'adam');
  const closeMatrix = runApsProcess(['close',
    '--hub-root', hubRoot,
    '--project', statusMatrixProject,
    '--agent-id', 'adam',
    '--packet-id', closePacketId,
    '--reason', 'Accepted receiver result for lifecycle matrix',
  ]);
  assert(closeMatrix.status === 0, `status matrix close: expected exit 0, got ${closeMatrix.status}`, outputOf(closeMatrix));
  expectLifecycleStatus('status matrix closed', closePacketId, ['最新版本: v1', '已收結', 'Accepted receiver result for lifecycle matrix']);
  console.log('PASS status, revise, withdraw, close lifecycle matrix is regression-covered');

  packet('context_valid', 'adam', '20260531T120000Z__context_source');
  contextLog('context_valid', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_packet: '20260531T120000Z__context_source',
    source_version: 1,
    status: 'background_only',
    workstream: 'design',
  });

  contextLog('context_missing', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_packet: '20260531T120001Z__missing',
    source_version: 1,
    status: 'background_only',
    workstream: 'missing source',
  });

  packet('context_stale', 'adam', '20260531T120000Z__context_source');
  contextLog('context_stale', 'adam', {
    updated_at: '2000-01-01T00:00:00Z',
    source_agent: 'adam',
    source_packet: '20260531T120000Z__context_source',
    source_version: 1,
    status: 'background_only',
    workstream: 'stale source',
  });

  packet('context_newer_packet', 'jay', '20260531T120000Z__daily_summary', 1);
  packet('context_newer_packet', 'jay', '20260531T120000Z__daily_summary', 2);
  contextLog('context_newer_packet', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_refs: ['packet:jay:20260531T120000Z__daily_summary:v1'],
    status: 'background_only',
    workstream: 'newer packet source',
  });

  packet('context_conflict', 'adam', '20260531T120000Z__context_source');
  contextLog('context_conflict', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_packet: '20260531T120000Z__context_source',
    source_version: 1,
    status: 'background_only',
    freshness: 'conflict_packet_wins',
    workstream: 'conflict source',
  });

  contextLog('context_unsafe_file', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_refs: ['file:../../outside.md'],
    status: 'background_only',
    workstream: 'unsafe file',
  });

  contextLog('context_bad_agent', 'bad_agent', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: '../bad',
    source_packet: '20260531T120000Z__context_source',
    source_version: 1,
    status: 'background_only',
    workstream: 'bad agent',
  });

  packet('context_forbidden_field', 'adam', '20260531T120000Z__context_source');
  contextLog('context_forbidden_field', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_packet: '20260531T120000Z__context_source',
    source_version: 1,
    status: 'background_only',
    workstream: 'forbidden field',
    due_date: '2026-06-01',
  });

  inboxPacket('context_inbox', 'jay', 'adam', '20260531T120000Z__daily_summary', 'daily_summary');
  contextLog('context_inbox', 'jay', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'jay',
    source_packet: '20260531T120000Z__daily_summary',
    source_version: 1,
    status: 'background_only',
    workstream: 'new-user daily flow',
    current_focus: 'make check Drive readable',
  });
  writeFile(
    path.join(hubRoot, 'shared_goal_inbox', 'from_adam', 'outbox.log.md'),
    '2026-06-16T14:32:11Z | publish | 20260616T143211Z__shared_goal_and_roles v1 | to:jay | items:1\n',
  );
  writeFile(
    path.join(hubRoot, 'shared_goal_inbox', 'from_adam', 'packets', '20260616T143211Z__shared_goal_and_roles__v1', 'packet.md'),
    `---\npacket_id: 20260616T143211Z__shared_goal_and_roles\nversion: 1\nfrom: adam\nto: jay\nproject: shared_goal_inbox\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-06-16T14:32:11Z\nssot_refs: []\nscope: \"shared_goal_and_roles\"\nitems:\n  - id: \"Jay 確認共同目標與分工\"\n---\n\n# shared_goal_and_roles\n\n## Common Goal\n用 APS 建立 Jay 首輪共同基準，確保接收方先確認分工再處理普通交接。\n\n## Participants\nadam 負責發出基準；jay 負責確認、部分同意或提出異議。\n\n## First Round Scope\nadam 只發一對一共同目標確認包；jay 不應把它當成普通工作包。\n\n## Acceptance Criteria\nJay 的 check Drive 清楚顯示共同目標、分工、驗收標準與可選確認動作。\n\n## Open Items\nJay 仍未 consume 或 decline 這一版共同目標。\n`,
  );
  writeFile(
    path.join(hubRoot, 'shared_goal_inbox_insufficient', 'from_adam', 'outbox.log.md'),
    '2026-06-16T14:32:11Z | publish | 20260616T143211Z__shared_goal_and_roles v1 | to:jay | items:1\n',
  );
  writeFile(
    path.join(hubRoot, 'shared_goal_inbox_insufficient', 'from_adam', 'packets', '20260616T143211Z__shared_goal_and_roles__v1', 'packet.md'),
    `---\npacket_id: 20260616T143211Z__shared_goal_and_roles\nversion: 1\nfrom: adam\nto: jay\nproject: shared_goal_inbox_insufficient\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-06-16T14:32:11Z\nssot_refs: []\nscope: \"shared_goal_and_roles\"\nitems:\n  - id: \"Jay 確認共同目標與分工\"\n---\n\n# shared_goal_and_roles\n\nProject: incomplete_placeholder\n`,
  );
  inboxPacket('context_add', 'jay', 'adam', '20260531T120000Z__daily_summary', 'daily_summary');
  inboxPacket('context_add_exact', 'jay', 'adam', '20260531T120000Z__daily_summary', 'daily_summary', 1);
  inboxPacket('context_add_exact', 'jay', 'adam', '20260531T120000Z__daily_summary', 'daily_summary', 11);
  contextLog('context_add_exact', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_refs: ['packet:jay:20260531T120000Z__daily_summary:v11'],
    status: 'background_only',
    workstream: 'exact existing v11',
  });
  inboxPacket('dashboard_daily', 'jay', 'adam', '20260531T120000Z__daily_summary', 'daily_summary');
  writeFile(
    path.join(hubRoot, 'dashboard_daily', 'from_adam', 'outbox.log.md'),
    [
      '2026-05-31T12:05:00Z | publish | 20260531T120500Z__shared_goal_and_roles v1 | to:jay | items:1',
      '2026-05-31T12:10:00Z | publish | 20260531T121000Z__release_review v1 | to:jay | items:1',
      '',
    ].join('\n'),
  );
  writeFile(
    path.join(hubRoot, 'dashboard_daily', 'from_adam', 'packets', '20260531T120500Z__shared_goal_and_roles__v1', 'packet.md'),
    `---\npacket_id: 20260531T120500Z__shared_goal_and_roles\nversion: 1\nfrom: adam\nto: jay\nproject: dashboard_daily\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-05-31T12:05:00Z\nssot_refs: []\nscope: \"shared_goal_and_roles\"\nitems:\n  - id: \"確認這份共同目標與分工\"\n---\n\n# shared_goal_and_roles\n\n## 共同目標\n用 APS 驗證一個人可快速看懂項目現況、分工與下一步。\n\n## 每人角色\nadam 負責發起與整理; jay 負責確認可讀性與回覆。\n\n## 第一輪分工\nadam 發出共同目標與分工; jay 確認或指出不一致。\n\n## 驗收標準\nCheck APS terminal 狀態能看到共同目標、角色分工、交接同步和下一步。\n`,
  );
  writeFile(
    path.join(hubRoot, 'dashboard_daily', 'from_adam', 'packets', '20260531T121000Z__release_review__v1', 'packet.md'),
    `---\npacket_id: 20260531T121000Z__release_review\nversion: 1\nfrom: adam\nto: jay\nproject: dashboard_daily\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-05-31T12:10:00Z\nssot_refs: []\nscope: \"release_review\"\nitems:\n  - id: \"確認 Dashboard 是否可讀\"\n---\n\n# release_review\n\n## 共同目標\n確認 APS 營運總覽是否比純 context overview 更有用。\n`,
  );
  writeAck('dashboard_daily', 'jay', [
    {
      packet_id: '20260531T120500Z__shared_goal_and_roles',
      version: 1,
      result: 'Confirmed shared goal and roles v1',
      at: '2026-05-31T12:20:00Z',
    },
    {
      packet_id: '20260531T121000Z__release_review',
      version: 1,
      result: 'Read dashboard review',
      at: '2026-05-31T12:30:00Z',
    },
  ]);
  contextLog('dashboard_daily', 'adam', {
    updated_at: '2999-01-01T00:00:00Z',
    source_agent: 'adam',
    source_refs: [
      'packet:adam:20260531T121000Z__release_review:v1',
      'packet:jay:20260531T122000Z__missing_followup:v1',
      'url:https://docs.google.com/document/d/demo-project-context-index',
    ],
    status: 'background_only',
    workstream: 'dashboard',
    current_focus: 'APS operations overview should show whether work can move, pending handoffs, sent status, and evidence sources.',
  });
  writeTempApsConfig('dashboard_no_baseline', 'adam');
  writeFile(path.join(hubRoot, 'dashboard_no_baseline', 'from_adam', 'outbox.log.md'), '');
  writeFile(path.join(hubRoot, 'dashboard_no_baseline', 'from_jay', 'outbox.log.md'), '');
  writeFile(
    path.join(hubRoot, 'dashboard_no_baseline', '_peers', 'agents', 'adam.json'),
    `${JSON.stringify({ project: 'dashboard_no_baseline', agent_id: 'adam', display_name: 'Adam', lane: 'from_adam', status: 'active', peer_state: 'confirmed' }, null, 2)}\n`,
  );
  writeFile(
    path.join(hubRoot, 'dashboard_no_baseline', '_peers', 'agents', 'jay.json'),
    `${JSON.stringify({ project: 'dashboard_no_baseline', agent_id: 'jay', display_name: 'Jay', lane: 'from_jay', status: 'active', peer_state: 'confirmed' }, null, 2)}\n`,
  );

  expectCase(
    'valid context',
    ['check', '--hub-root', hubRoot, '--project', 'context_valid', '--agent-id', 'adam'],
    0,
    ['current_by_sources', '未見阻塞錯誤'],
  );
  expectCase(
    'flags before check',
    ['--hub-root', hubRoot, '--project', 'context_valid', '--agent-id', 'adam', 'check'],
    0,
    ['current_by_sources', '未見阻塞錯誤'],
  );
  expectCase(
    'no context is allowed',
    ['check', '--hub-root', hubRoot, '--project', 'context_no_context', '--agent-id', 'adam'],
    0,
    ['目前未建立 `_context/`。這不是錯誤'],
  );
  expectCase(
    'missing source blocks check',
    ['check', '--hub-root', hubRoot, '--project', 'context_missing', '--agent-id', 'adam'],
    1,
    ['unverified_source', '來源不存在'],
  );
  expectCase(
    'newer source warns stale',
    ['check', '--hub-root', hubRoot, '--project', 'context_stale', '--agent-id', 'adam'],
    0,
    ['possibly_stale', '可能過期'],
  );
  expectCase(
    'newer packet version warns stale',
    ['check', '--hub-root', hubRoot, '--project', 'context_newer_packet', '--agent-id', 'adam'],
    0,
    ['possibly_stale', '發現較新的相關 packet / outbox / ack'],
  );
  expectCase(
    'packet conflict warns packet wins',
    ['check', '--hub-root', hubRoot, '--project', 'context_conflict', '--agent-id', 'adam'],
    0,
    ['conflict_packet_wins', '必須以 packet / outbox / ack 為準'],
  );
  expectCase(
    'unsafe file source blocks check',
    ['check', '--hub-root', hubRoot, '--project', 'context_unsafe_file', '--agent-id', 'adam'],
    1,
    ['file 來源必須留在 project 內', 'unverified_source'],
  );
  expectCase(
    'invalid source agent blocks check',
    ['check', '--hub-root', hubRoot, '--project', 'context_bad_agent', '--agent-id', 'adam'],
    1,
    ['source_agent 格式不正確', 'unverified_source'],
  );
  expectCase(
    'forbidden context fields block check',
    ['check', '--hub-root', hubRoot, '--project', 'context_forbidden_field', '--agent-id', 'adam'],
    1,
    ['禁止欄位', 'due_date'],
  );
  expectCase(
    'unknown context action fails',
    ['nope', '--hub-root', hubRoot, '--project', 'context_valid', '--agent-id', 'adam'],
    1,
    ['context 子命令只支援 `check`、`add` 或 `html`'],
  );
  expectCase(
    'context add creates local background entry from packet',
    ['add', '--hub-root', hubRoot, '--project', 'context_add', '--agent-id', 'adam', '--from-packet', '20260531T120000Z__daily_summary', '--version', '1'],
    0,
    ['已從 packet 生成背景索引', 'packet:jay:20260531T120000Z__daily_summary:v1'],
  );
  expectCase(
    'context add is idempotent for same packet',
    ['add', '--hub-root', hubRoot, '--project', 'context_add', '--agent-id', 'adam', '--from-packet', '20260531T120000Z__daily_summary', '--version', '1'],
    0,
    ['背景索引已存在,未重複新增'],
  );
  expectCase(
    'context add exact source ref does not confuse v1 with v11',
    ['add', '--hub-root', hubRoot, '--project', 'context_add_exact', '--agent-id', 'adam', '--from-packet', '20260531T120000Z__daily_summary', '--version', '1'],
    0,
    ['已從 packet 生成背景索引', 'packet:jay:20260531T120000Z__daily_summary:v1'],
  );
  const exactLog = fs.readFileSync(path.join(hubRoot, 'context_add_exact', '_context', 'from_adam', 'context.log.md'), 'utf8');
  assert(exactLog.includes('"packet:jay:20260531T120000Z__daily_summary:v11"'), 'context add exact: missing pre-existing v11 source ref', exactLog);
  assert(exactLog.includes('"packet:jay:20260531T120000Z__daily_summary:v1"'), 'context add exact: missing newly added v1 source ref', exactLog);
  console.log('PASS context add exact source ref keeps v1 and v11 separate');
  expectCase(
    'context add output passes check',
    ['check', '--hub-root', hubRoot, '--project', 'context_add', '--agent-id', 'adam'],
    0,
    ['daily_summary', 'current_by_sources'],
  );
  expectCase(
    'context html creates read-only overview',
    ['html', '--hub-root', hubRoot, '--project', 'context_add', '--agent-id', 'adam'],
    0,
    ['已生成唯讀 HTML 大局速覽', 'overview.html'],
  );
  const overviewHtml = fs.readFileSync(path.join(hubRoot, 'context_add', '_context', 'overview.html'), 'utf8');
  assert(overviewHtml.includes('Project Context Index'), 'context html: missing context overview title', overviewHtml);
  assert(overviewHtml.includes('背景索引'), 'context html: missing background index section', overviewHtml);
  assert(overviewHtml.includes('daily_summary'), 'context html: missing generated context workstream', overviewHtml);
  assert(overviewHtml.includes('packet:jay:20260531T120000Z__daily_summary:v1'), 'context html: missing source ref', overviewHtml);
  assert(!overviewHtml.includes(hubRoot), 'context html: should not expose local hub path after dashboard retirement', overviewHtml);
  console.log('PASS context html contains safe overview content');
  expectCase(
    'context html marks conflict freshness as bad',
    ['html', '--hub-root', hubRoot, '--project', 'context_conflict', '--agent-id', 'adam'],
    0,
    ['已生成唯讀 HTML 大局速覽', 'overview.html'],
  );
  const conflictHtml = fs.readFileSync(path.join(hubRoot, 'context_conflict', '_context', 'overview.html'), 'utf8');
  assert(conflictHtml.includes('badge bad') && conflictHtml.includes('與 packet 衝突'), 'context html: conflict freshness should use bad badge', conflictHtml);
  console.log('PASS context html uses bad badge for conflict freshness');
  expectDashboardCase(
    'dashboard command is retired and writes no HTML',
    ['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--other-agent-id', 'jay'],
    0,
    ['dashboard 已退役', '未寫入任何 dashboard HTML', '請用 `npx aps check-aps`', 'APS Live 交接追蹤頁'],
  );
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_daily', '_context', 'dashboard_adam.html')), 'retired dashboard must not write personal dashboard');
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_daily', '_context', 'dashboard.html')), 'retired dashboard must not write dashboard index');
  const autoGeneratedLiveProjectPath = path.join(hubRoot, 'dashboard_daily', '_context', 'aps-live_adam.html');
  expectCheckApsCase(
    'check-aps shows user-facing status and keeps troubleshooting out of default view',
    ['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--other-agent-id', 'jay'],
    0,
    [
      'APS 整體狀態',
      '結論',
      '下一句可對 AI 說',
      '交接包狀態',
      '是否如期',
      '建議下一步',
      '建議下一步（可直接複製給 AI）',
      '```text',
      '[⚠️ 需退回補資料]',
      '[🔎 先核對風險]',
      'APS 狀態已在 terminal 顯示',
      'HTML dashboard 已退役',
      '不用打開 HTML 也可以繼續',
      '真正操作仍在這個 AI terminal',
      '不是背景自動監察',
      'APS Live 即時協作',
      `APS Live: ${autoGeneratedLiveProjectPath}`,
      '頁面已由 Check APS 自動生成 / 更新',
      '你只需打開頁面使用',
      'Live 只做即時核對',
    ],
    [
      '📊 數量摘要（排錯用）',
      '🔁 同步與 APS Live（排錯用）',
      'dashboard.html',
      '🎯 共同目標與分工詳情',
      '📤 我交出去的事',
      '👥 協作對象',
      '共用 Drive 本機路徑:',
      '來源:',
      'packet:',
      '可對 AI 說：「請讀',
      '生成方式：請 AI 執行',
    ],
  );
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_daily', '_context', 'dashboard_adam.html')), 'check-aps must not write personal dashboard after retirement');
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_daily', '_context', 'dashboard.html')), 'check-aps must not write dashboard index after retirement');
  assert(fs.existsSync(autoGeneratedLiveProjectPath), 'check-aps should auto-generate APS Live HTML when Live coordination is useful');
  expectCheckApsCase(
    'check-aps --full shows troubleshooting details',
    ['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--other-agent-id', 'jay', '--full'],
    0,
    [
      'APS 整體狀態',
      '共同目標與分工: 20260531T120500Z__shared_goal_and_roles v1: 1/1 已確認',
      '開工判斷',
      '待你處理: 1',
      '你交出去的事: 2',
      '等待對方: 0',
      '用 APS 驗證一個人可快速看懂項目現況、分工與下一步。',
      '逐人確認: jay: 已確認',
      '📊 數量摘要（排錯用）',
      '🔁 同步與 APS Live（排錯用）',
      'HTML dashboard 已退役',
      '共用 Drive 本機路徑:',
      '建議下一步（可直接複製給 AI）',
      '來源: packet:',
    ],
  );
  expectCheckApsCase(
    'check-aps routes confirmed peers to shared goal baseline before task packets',
    ['--hub-root', hubRoot, '--project', 'dashboard_no_baseline', '--agent-id', 'adam'],
    0,
    [
      '共同目標與分工: 未見目前有效基準',
      '[🔎 先建立基準]',
      '不要先發普通任務包',
      '下一句可對 AI 說',
      'APS Live 即時協作',
      '頁面已由 Check APS 自動生成 / 更新',
    ],
  );
  const noBaselineLivePath = path.join(hubRoot, 'dashboard_no_baseline', '_context', 'aps-live_adam.html');
  assert(fs.existsSync(noBaselineLivePath), 'check-aps should auto-generate no-baseline first-use APS Live page');
  const noBaselineLiveHtml = fs.readFileSync(noBaselineLivePath, 'utf8');
  assert(noBaselineLiveHtml.includes('需先建立共同目標與分工'), 'aps live no-baseline: missing first-use baseline title', noBaselineLiveHtml);
  assert(noBaselineLiveHtml.includes('未見目前有效共同目標與分工基準'), 'aps live no-baseline: missing explicit baseline blocker', noBaselineLiveHtml);
  assert(noBaselineLiveHtml.includes('請用 APS 建立共同目標與分工草稿'), 'aps live no-baseline: missing terminal return action', noBaselineLiveHtml);
  assert(/tracking-step blocked" aria-label="共同基準：未通過 \/ 需處理"/.test(noBaselineLiveHtml), 'aps live no-baseline: common baseline step should be blocked', noBaselineLiveHtml);
  assert(!/tracking-step done" aria-label="共同基準：已完成"/.test(noBaselineLiveHtml), 'aps live no-baseline: common baseline step must not be marked done', noBaselineLiveHtml);
  console.log('PASS check-aps auto-generates no-baseline APS Live with blocked common baseline');
  expectCheckApsCase(
    'check-aps demo preview shows terminal-first flow without real Drive writes',
    ['--demo-preview'],
    0,
    [
      'Demo preview',
      '假資料示範',
      '不讀 .aps/config.json',
      '不寫共用 Drive',
      'APS 整體狀態',
      '結論',
      '下一句可對 AI 說',
      '交接包狀態',
      '是否如期',
      '建議下一步',
      '建議下一步（可直接複製給 AI）',
      '```text',
      '有 1 件交接資料不足',
      '需退回補資料',
      'demo preview 不會生成 dashboard HTML',
      'APS Live 即時協作',
      '正式項目會由 Check APS 自動生成 APS Live 頁',
      'demo preview 不會寫入 HTML',
      'Live 只做即時核對',
    ],
    [
      '📊 數量摘要（排錯用）',
      '🔁 同步與 APS Live（排錯用）',
      '共用 Drive 本機路徑:',
      '來源:',
      'packet:',
      '可對 AI 說：「請讀',
      '生成方式：請 AI 執行',
    ],
  );
  expectCheckApsCase(
    'check-aps demo preview shows shared-goal confirmation mainline',
    ['--demo-preview', '--scenario', 'shared-goal'],
    0,
    [
      '示範場景: 共同目標與分工確認',
      '共同目標與分工仍未完成逐人確認',
      '第一輪正式任務要先等基準一致',
      '等待協作者確認',
      '建議開 APS Live',
      '正式項目會由 Check APS 自動生成 APS Live 頁',
      'demo preview 不會寫入 HTML',
      '正式確認仍要回到 terminal',
      '請用 APS 整理還有誰未確認共同目標與分工',
    ],
    [
      '📊 數量摘要（排錯用）',
      '🔁 同步與 APS Live（排錯用）',
      '共用 Drive 本機路徑:',
      '生成方式：請 AI 執行',
    ],
  );
  expectCheckApsCase(
    'check-aps demo preview --full shows troubleshooting details',
    ['--demo-preview', '--full'],
    0,
    [
      'Demo preview',
      '📊 數量摘要（排錯用）',
      '🔁 同步與 APS Live（排錯用）',
      '共用 Drive 本機路徑:',
      '建議下一步（可直接複製給 AI）',
      '來源: packet:',
    ],
  );
  const liveDemoPath = path.join(runRoot, 'aps-live-demo.html');
  const liveDemoDryRunPath = path.join(runRoot, 'aps-live-demo-dry-run.html');
  expectLiveCase(
    'aps live demo dry-run checks handoff check page plan without writing html',
    ['--demo-preview', '--dry-run', '--output', liveDemoDryRunPath],
    0,
    [
      'dry-run 通過',
      '將生成 HTML',
      '未寫入 HTML',
      '未建立資料夾',
      '未改正式 APS 狀態',
      '狀態欄位:',
      'current_case_title',
      'current_case_summary',
      'current_question',
      'suggested_message',
      'current_station',
      'can_start_label',
      'waiting_for',
      'next_formal_action',
      'tracking_steps',
      'handoff_chains',
      'context_cards',
      'evidence_refs',
      'Trystero 是 APS Live 主流程',
      '共同目標與分工確認',
    ],
  );
  assert(!fs.existsSync(liveDemoDryRunPath), 'aps live demo dry-run should not write output html');

  expectLiveCase(
    'aps live demo preview creates local handoff check page without Drive writes',
    ['--demo-preview', '--output', liveDemoPath],
    0,
    [
      'APS Live 交接追蹤頁示範',
      '不讀 .aps/config.json',
      '不寫共用 Drive',
      '不更新 packet / outbox / ack',
      'Trystero 是 APS Live 主流程',
    ],
  );
  const liveDemoHtml = fs.readFileSync(liveDemoPath, 'utf8');
  for (const text of [
    'APS Live 交接追蹤',
    '交接單',
    '交接單 1/1',
    '目前只顯示主要交接單',
    '正式交接仍是 adam → jay',
    '交接進度',
    'tracking-step-icon',
    'tracking-step-status',
    'tracking-legend',
    '已完成',
    '進行中',
    '未通過 / 需處理',
    '未開始',
    '任務',
    '真源',
    '開工條件',
    '交接事件紀錄',
    '最近交接事件',
    '展開完整交接事件紀錄',
    'event-time',
    '開始',
    '留言 / Comment',
    '尚未正式 close',
    '目前階段與正式操作',
    '目前狀態',
    '正式操作位置',
    '下一句可對 AI 說',
    'APS decline',
    '等待 jay 確認共同目標與分工',
    '本機 AI 帶我來 APS Live',
    '完成協商後交給本機 AI',
    '它只草擬下一步，不會直接寫入 APS 正式紀錄',
    '交給本機 AI 草擬下一步',
    '交給本機 AI 整理下一步',
    'AI 整理方式',
    '協調與回應',
    '本次 Live session',
    '接收方快速回應',
    '✅ 已收到',
    '⚠️ 需補資料',
    '❌ 不同意',
    'data-live-reply="received"',
    'data-live-reply="need-info"',
    'data-live-reply="disagree"',
    'handoff-reply',
    'reply_label',
    'reply_detail',
    '已送出快速回應',
    '可交給本機 AI 整理正式下一步',
    '這是給對方看的訊息草稿',
    '連接 APS Live',
    '重新讀取正式狀態',
    '頁面打開後會自動連接',
    '頁面資料來自生成時的 APS 快照',
    '發送核對訊息',
    'id="discussionStatus"',
    'id="forwardToAgentAfterDiscussion"',
    'disabled>等待對方進入後才能發送核對訊息',
    '⏳ 本次 session 尚未發送核對訊息',
    '清空紀錄',
    '整理共識 / 分歧 / 待決定事項',
    '產生補資料請求',
    '草擬退回理由',
    '判斷可否開工',
    '回到本機 AI 對話繼續 APS 流程',
    'Terminal 可做的正式選項',
    '確認 / 同意',
    '提出異議',
    '退回 / 補資料',
    '收結 / close',
    '共同目標與分工草稿 v1',
    'joinRoom',
    'makeAction',
    'aps-message',
    'onPeerJoin',
    'onPeerLeave',
    '共同目標與分工確認',
    'jay: 等待確認',
    '整理對方回饋後',
    '請用 APS 跟進以下 APS Live 交接追蹤協調內容',
    '今次 APS Live 已帶入的交接貨單',
    '目前追蹤狀態',
    '本機 AI 已知的項目背景',
    '依據摘要',
    '交給本機 AI 整理下一步',
    'aps-live-agent-queue',
    "bridge.url + '/queue'",
    '✅ 已發送核對訊息',
    '✅ 已發送。等待對方回覆',
    '等待對方進入後才能發送核對訊息',
    '未連接，請先用上方按鈕連接',
    '對方尚未進入 APS Live。請等對方進入後再發送',
    '同一 APS 身份的另一個視窗',
    '這不是協作者，不能當成',
    '正在確認是否真的是協作者',
    '協作者已確認身份',
    'autoConnectLive',
    'refreshFormalPrompt',
    '已載入本次頁面 session 記錄',
    'aps-live-session-v1:',
    '✅ 已交給本機 AI 整理下一步',
    '🤖 已交給本機 AI',
    '本次 session 記錄已清空',
    '本機 AI 佇列未連接',
    '請先整理，不要直接套用',
    '回到本機 AI',
    'local-browser-preview',
    'local-browser-preview',
  ]) {
    assert(liveDemoHtml.includes(text), `aps live demo html: missing ${text}`, liveDemoHtml);
  }
  for (const text of [
    'id="consume"',
    'id="decline"',
    'id="revise"',
    'id="withdraw"',
    'id="close"',
    'id="publish"',
    'id="forwardToAgentTop"',
    'id="startLiveTop"',
    '<h2>連接</h2>',
    '發給協作者',
    '<h2>目前狀態</h2>',
    '尚未發送訊息。先連接 APS Live',
    '⚠️ 未連接：群聊訊息草稿',
    '⚠️ 未連接，這只是本機草稿',
    'APS Live 診斷接收器',
    'APS Live 項目共識群聊頁',
    '交接資料板',
    '共同目標下的交接鏈',
    '本機 AI 已帶入的上游資訊',
    '需要核對的問題',
    'aps-live-tracking-v2:',
    '<h2>交回本機 AI</h2>',
    'forwardToAgentInline',
    '交給本機 AI 判斷下一步',
    '即時群聊訊息',
    '發送群聊訊息',
    '已發送群聊訊息',
    'placeholder="例：Jay',
    '項目共識群聊內容',
    '你來到這頁，通常是因為本機 AI 判斷',
    '如果你不知要寫甚麼，先選一個情景',
    '共同目標未確認',
    '交接資料不夠',
    '雙方狀態不同步',
    '日常項目討論',
    '進階用途',
    '進階連線資料',
    '進階：本機狀態、協作者與排錯資料',
    '在線代理',
    '最新回饋',
    '共識草稿',
    '廣播我看到的狀態',
    '廣播回饋草稿',
    '廣播共識草稿',
    '把我的狀態放入 Live 訊息',
    '複製回 terminal 下一句',
    '轉交本機 AI 跟進',
    '再貼到自己的 AI terminal',
    '回到 terminal 繼續 APS 正式流程',
    '正在連接 Trystero room',
    '已連接 Trystero room',
    'Trystero 未連接',
    'Trystero peer joined',
    'Trystero peer left',
    '已複製整理 prompt',
    '請先在 terminal 執行 aps live-bridge',
    '目前本機 APS 狀態',
    'JSON.stringify(recentMessages',
    '生成 APS 正式動作草稿',
    '比對雙方看到的狀態',
    '不可把 Live 訊息當成 APS ack',
    '正式紀錄邊界',
    '正式寫入 Drive 前仍要你批准',
    '正式寫回 Drive 前等我確認',
    '正式動作等我確認',
    '判斷是否需要寫回 APS 正式紀錄',
    '這頁只通訊，不替你完成正式紀錄',
    '不可把 Live 訊息當成對方已正式確認',
    '給 AI 核對用的狀態資料',
    '我這邊看到的狀態',
    '<code>packet:',
    '對方看到的狀態',
    '只在 Check APS / check Drive / 本機 AI 判斷交接卡住時',
    'APS Live is not a chat room',
    'data:image/png',
  ]) {
    assert(!liveDemoHtml.includes(text), `aps live demo html: should not expose old or formal-action wording ${text}`, liveDemoHtml);
  }
  const connectButtonCount = (liveDemoHtml.match(/id="connectLive"/g) || []).length;
  assert(connectButtonCount === 1, `aps live demo html: expected one connect button, got ${connectButtonCount}`, liveDemoHtml);
  assert(/tracking-step active" aria-label="共同基準：進行中"/.test(liveDemoHtml), 'aps live demo html: unconfirmed shared-goal draft should keep 共同基準 in progress', liveDemoHtml);
  assert(!/tracking-step done" aria-label="共同基準：已完成"/.test(liveDemoHtml), 'aps live demo html: unconfirmed shared-goal draft must not mark 共同基準 as completed', liveDemoHtml);
  assert(liveDemoHtml.indexOf('id="connectLive"') < liveDemoHtml.indexOf('完成協商後交給本機 AI'), 'aps live demo html: local AI handoff should appear after live coordination controls', liveDemoHtml);
  assert(liveDemoHtml.indexOf('id="messages"') < liveDemoHtml.indexOf('id="forwardToAgentAfterDiscussion"'), 'aps live demo html: local AI handoff button should be after discussion history', liveDemoHtml);
  assert(liveDemoHtml.indexOf('💬 異常協調') < liveDemoHtml.indexOf('id="messages"'), 'aps live demo html: message history should live inside discussion flow', liveDemoHtml);
  console.log('PASS aps live demo handoff check page keeps formal APS boundary');

  const liveProjectDryRunPath = path.join(runRoot, 'aps-live-project-dry-run.html');
  const liveProjectDryRun = runLive(['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--dry-run', '--output', liveProjectDryRunPath]);
  const liveProjectDryRunText = outputOf(liveProjectDryRun);
  assert(liveProjectDryRun.status === 0, `aps live project dry-run: expected exit 0, got ${liveProjectDryRun.status}`, liveProjectDryRunText);
  for (const text of [
    'dry-run 通過',
    '將生成 HTML',
    '未寫入 HTML',
    '未建立資料夾',
    '未改正式 APS 狀態',
    '狀態欄位:',
    'current_case_title',
    'current_case_summary',
    'current_question',
    'suggested_message',
    'current_station',
    'can_start_label',
    'waiting_for',
    'next_formal_action',
    'tracking_steps',
    'handoff_chains',
    'context_cards',
    'evidence_refs',
    '回到本機 AI 可直接說',
  ]) {
    assert(liveProjectDryRunText.includes(text), `aps live project dry-run: missing ${text}`, liveProjectDryRunText);
  }
  assert(!fs.existsSync(liveProjectDryRunPath), 'aps live project dry-run should not write output html');
  console.log('PASS aps live project dry-run checks plan without writing html');

  const liveOutput = runLive(['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam']);
  const liveOutputText = outputOf(liveOutput);
  assert(liveOutput.status === 0, `aps live project handoff check page: expected exit 0, got ${liveOutput.status}`, liveOutputText);
  for (const text of [
    'APS Live 交接追蹤頁',
    '不寫 packet / outbox / ack',
    '回到本機 AI 可直接說',
    '請回到本機 AI',
  ]) {
    assert(liveOutputText.includes(text), `aps live project output: missing ${text}`, liveOutputText);
  }
  const liveProjectHtml = fs.readFileSync(path.join(hubRoot, 'dashboard_daily', '_context', 'aps-live_adam.html'), 'utf8');
  const livePeerOutput = runLive(['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'jay']);
  const livePeerOutputText = outputOf(livePeerOutput);
  assert(livePeerOutput.status === 0, `aps live peer page: expected exit 0, got ${livePeerOutput.status}`, livePeerOutputText);
  const livePeerHtml = fs.readFileSync(path.join(hubRoot, 'dashboard_daily', '_context', 'aps-live_jay.html'), 'utf8');
  const liveRoomId = liveProjectHtml.match(/const roomId = "([^"]+)"/);
  const livePeerRoomId = livePeerHtml.match(/const roomId = "([^"]+)"/);
  assert(liveRoomId && livePeerRoomId, 'aps live project html: room id should be visible in generated script for QC');
  assert(liveRoomId[1] === livePeerRoomId[1], `aps live project html: paired pages should share one Trystero room, got ${liveRoomId[1]} and ${livePeerRoomId[1]}`);
  assert(liveProjectHtml.includes('"live_participants"'), 'aps live project html: snapshot should include project live participants for 3+ coordination');
  assert(liveProjectHtml.includes('function bindPeerEvent'), 'aps live project html: should include Trystero peer-event compatibility binding');
  assert(liveProjectHtml.includes("bindPeerEvent(room, 'onPeerJoin'"), 'aps live project html: should bind onPeerJoin through compatibility layer');
  assert(liveProjectHtml.includes("bindPeerEvent(room, 'onPeerLeave'"), 'aps live project html: should bind onPeerLeave through compatibility layer');
  for (const text of [
    'project',
    'agent_id',
    'seen_shared_goal',
    'seen_packet',
    'seen_ack',
    'current_case_title',
    'current_question',
    'current_station',
    'can_start_label',
    'waiting_for',
    'next_formal_action',
    'tracking_steps',
    'handoff_chains',
    '交接單',
    '交接單 1/1',
    '目前只顯示主要交接單',
    '正式交接仍是 adam → jay',
    'tracking-step-icon',
    'tracking-step-status',
    'tracking-legend',
    '已完成',
    '進行中',
    '未通過 / 需處理',
    '未開始',
    '任務',
    '真源',
    '開工條件',
    '交接事件紀錄',
    '展開完整交接事件紀錄',
    'event-time',
    '開始',
    '留言 / Comment',
    '尚未正式 close',
    '目前階段與正式操作',
    '目前狀態',
    '正式操作位置',
    '下一句可對 AI 說',
    'APS decline',
    '協調與回應',
    '完成協商後交給本機 AI',
    '今次要核對',
    '目前站點',
    '等誰行動',
    '能否開工',
    '本機 AI 已知的項目背景',
    'Terminal 可做的正式選項',
    '確認 / 同意',
    '提出異議',
    '退回 / 補資料',
    '收結 / close',
    'feedback_status',
    'pending_decision',
    'local_drive_state',
    'blocker',
    'proposed_terminal_action',
    '交給本機 AI 整理下一步',
    '交給本機 AI 草擬下一步',
    'id="forwardToAgentAfterDiscussion"',
    '本機 AI 佇列未連接',
    '重新讀取正式狀態',
    '頁面打開後會自動連接',
    '頁面資料來自生成時的 APS 快照',
    'autoConnectLive',
    'refreshFormalPrompt',
    'function remotePeerCount()',
    '等待對方進入後才能發送核對訊息',
    '偵測到同一 APS 身份的另一個視窗',
    '這不代表協作者已進入',
    '協作者離開',
    '對方暫時離開 APS Live；你仍可先整理訊息。',
  ]) {
    assert(liveProjectHtml.includes(text), `aps live project html: missing ${text}`, liveProjectHtml);
  }
  for (const text of [
    '這頁只通訊，不替你完成正式紀錄',
    'Live 不可做的事',
    '進階：本機狀態、協作者與排錯資料',
    '進階連線資料',
    '<pre id=',
    '<code>packet:',
    '回到 terminal 繼續 APS 正式流程',
    '已複製整理 prompt',
    '請先在 terminal 執行 aps live-bridge',
    '目前本機 APS 狀態',
    'JSON.stringify(recentMessages',
    '交接資料板',
    '共同目標下的交接鏈',
    '本機 AI 已帶入的上游資訊',
    '需要核對的問題',
    '<h2>交回本機 AI</h2>',
    'forwardToAgentInline',
    'id="forwardToAgentTop"',
    '交給本機 AI 判斷下一步',
    'placeholder="例：Jay',
  ]) {
    assert(!liveProjectHtml.includes(text), `aps live project html: should keep ${text} out of user UI`, liveProjectHtml);
  }
  assert(/tracking-step done" aria-label="共同基準：已完成"/.test(liveProjectHtml), 'aps live project html: shared-goal baseline should mark 共同基準 as completed when a baseline packet exists', liveProjectHtml);
  assert(/<button id="sendProjectMessageInline" type="button" disabled>等待對方進入後才能發送核對訊息<\/button>/.test(liveProjectHtml), 'aps live project html: send button should start disabled until a real peer is present', liveProjectHtml);
  const liveBridgeTokenPath = path.join(hubRoot, 'dashboard_daily', '_context', 'live_bridge_token.json');
  assert(fs.existsSync(liveBridgeTokenPath), 'aps live project should create local bridge token');
  const liveBridgeToken = JSON.parse(fs.readFileSync(liveBridgeTokenPath, 'utf8'));
  assert(liveBridgeToken.token && liveBridgeToken.token.length >= 32, 'aps live project bridge token should be generated');
  const liveProjectPath = path.join(hubRoot, 'dashboard_daily', '_context', 'aps-live_adam.html');
  const liveLinkCheckAps = runCheckAps(['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam']);
  const liveLinkCheckApsText = outputOf(liveLinkCheckAps);
  assert(liveLinkCheckAps.status === 0, `check-aps live link: expected exit 0, got ${liveLinkCheckAps.status}`, liveLinkCheckApsText);
  for (const text of [
    'APS Live 即時協作',
    `APS Live: ${liveProjectPath}`,
    'Live 只做即時核對',
  ]) {
    assert(liveLinkCheckApsText.includes(text), `check-aps live link: missing ${text}`, liveLinkCheckApsText);
  }

  writeFile(
    path.join(hubRoot, 'dashboard_daily', '_context', 'live_queue', '20260614T130000Z__review_consensus.json'),
    `${JSON.stringify({
      id: '20260614T130000Z__review_consensus',
      queued_at: '2026-06-14T13:00:00Z',
      project: 'dashboard_daily',
      source: 'aps-live',
      payload: {
        kind: 'aps-live-agent-queue',
        task_mode: '整理共識、分歧、待決定事項',
        agent_id: 'adam',
        prompt: '請用 APS 跟進以下 APS Live 交接追蹤協調內容。',
        recent_messages: [{ source: 'jay', data: { text: '共同目標 v1 需要補充驗收標準。' } }],
      },
    }, null, 2)}\n`,
  );
  const liveQueueCheckAps = runCheckAps(['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam']);
  const liveQueueCheckApsText = outputOf(liveQueueCheckAps);
  assert(liveQueueCheckAps.status === 0, `check-aps live queue: expected exit 0, got ${liveQueueCheckAps.status}`, liveQueueCheckApsText);
  for (const text of [
    'APS Live 待本機 AI 整理',
    'Live 討論已送入本機 AI 待處理佇列',
    '請用 APS 讀取 APS Live 待處理佇列',
    '已有 APS Live 討論待本機 AI 整理與判斷',
  ]) {
    assert(liveQueueCheckApsText.includes(text), `check-aps live queue: missing ${text}`, liveQueueCheckApsText);
  }
  const liveQueueOutput = runLiveQueue(['--hub-root', hubRoot, '--project', 'dashboard_daily']);
  const liveQueueText = outputOf(liveQueueOutput);
  assert(liveQueueOutput.status === 0, `aps live-queue: expected exit 0, got ${liveQueueOutput.status}`, liveQueueText);
  for (const text of [
    'APS Live 待本機 AI 整理',
    '整理共識、分歧、待決定事項',
    '請用 APS 跟進以下 APS Live 交接追蹤協調內容',
  ]) {
    assert(liveQueueText.includes(text), `aps live-queue: missing ${text}`, liveQueueText);
  }
  console.log('PASS aps live creates project handoff check page with diagnostic message shape');

  writeTempApsConfig('dashboard_dynamic_names', 'mary');
  for (const peerId of ['mary', 'tom', 'fanny']) {
    writeFile(path.join(hubRoot, 'dashboard_dynamic_names', `from_${peerId}`, 'outbox.log.md'), '');
    writeFile(
      path.join(hubRoot, 'dashboard_dynamic_names', '_peers', 'agents', `${peerId}.json`),
      `${JSON.stringify({
        project: 'dashboard_dynamic_names',
        agent_id: peerId,
        display_name: peerId.toUpperCase(),
        lane: `from_${peerId}`,
        status: 'active',
        peer_state: 'confirmed',
      }, null, 2)}\n`,
    );
  }
  expectDashboardCase(
    'dashboard retirement keeps arbitrary APS names out of stale HTML',
    ['--hub-root', hubRoot, '--project', 'dashboard_dynamic_names', '--agent-id', 'mary'],
    0,
    ['dashboard 已退役', '未寫入任何 dashboard HTML', '請用 `npx aps check-aps`'],
  );
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_dynamic_names', '_context', 'dashboard.html')), 'retired dashboard must not write dynamic dashboard index');
  assert(!fs.existsSync(path.join(hubRoot, 'dashboard_dynamic_names', '_context', 'dashboard_mary.html')), 'retired dashboard must not write dynamic personal dashboard');
  const dynamicCheckAps = runCheckAps(['--hub-root', hubRoot, '--project', 'dashboard_dynamic_names', '--agent-id', 'mary']);
  const dynamicCheckApsOutput = outputOf(dynamicCheckAps);
  assert(dynamicCheckAps.status === 0, `dynamic check-aps: expected exit 0, got ${dynamicCheckAps.status}`, dynamicCheckApsOutput);
  for (const text of ['本機代理: mary', '建議下一步（可直接複製給 AI）', 'check-aps --full']) {
    assert(dynamicCheckApsOutput.includes(text), `dynamic check-aps: missing ${text}`, dynamicCheckApsOutput);
  }
  const dynamicCheckApsFull = runCheckAps(['--hub-root', hubRoot, '--project', 'dashboard_dynamic_names', '--agent-id', 'mary', '--full']);
  const dynamicCheckApsFullOutput = outputOf(dynamicCheckApsFull);
  assert(dynamicCheckApsFull.status === 0, `dynamic check-aps --full: expected exit 0, got ${dynamicCheckApsFull.status}`, dynamicCheckApsFullOutput);
  for (const text of ['本機代理: mary', 'fanny: 已確認', 'tom: 已確認', 'HTML dashboard 已退役']) {
    assert(dynamicCheckApsFullOutput.includes(text), `dynamic check-aps --full: missing ${text}`, dynamicCheckApsFullOutput);
  }
  for (const staleSnippet of [
    'dashboard_adam.html',
    'dashboard_jay.html',
    'dashboard_user_2.html',
    'adam 的個人頁',
    'jay 的個人頁',
    'user_2 的個人頁',
    '本機代理: adam',
    '逐人確認: jay',
    'user_2 →',
    '>adam<',
    '>jay<',
    '>user_2<',
  ]) {
    assert(!dynamicCheckApsOutput.includes(staleSnippet), `dynamic check-aps: leaked stale demo snippet ${staleSnippet}`, dynamicCheckApsOutput);
    assert(!dynamicCheckApsFullOutput.includes(staleSnippet), `dynamic check-aps --full: leaked stale demo snippet ${staleSnippet}`, dynamicCheckApsFullOutput);
  }
  const dynamicLiveRooms = [];
  for (const peerId of ['mary', 'tom', 'fanny']) {
    const liveOutput = runLive(['--hub-root', hubRoot, '--project', 'dashboard_dynamic_names', '--agent-id', peerId]);
    const liveText = outputOf(liveOutput);
    assert(liveOutput.status === 0, `dynamic aps live ${peerId}: expected exit 0, got ${liveOutput.status}`, liveText);
    const html = fs.readFileSync(path.join(hubRoot, 'dashboard_dynamic_names', '_context', `aps-live_${peerId}.html`), 'utf8');
    const room = html.match(/const roomId = "([^"]+)"/);
    assert(room, `dynamic aps live ${peerId}: missing room id`, html);
    dynamicLiveRooms.push(room[1]);
    for (const expectedPeer of ['mary', 'tom', 'fanny']) {
      assert(html.includes(`"${expectedPeer}"`), `dynamic aps live ${peerId}: missing live participant ${expectedPeer}`, html);
    }
    for (const staleName of ['Jay', 'Adam']) {
      assert(!html.includes(staleName), `dynamic aps live ${peerId}: leaked non-current placeholder or identity ${staleName}`, html);
    }
  }
  assert(new Set(dynamicLiveRooms).size === 1, `dynamic aps live: 3+ project pages should share one Trystero room, got ${dynamicLiveRooms.join(', ')}`);
  writeTempApsConfig('dashboard_dynamic_names_other', 'mary');
  for (const peerId of ['mary', 'tom', 'fanny']) {
    writeFile(path.join(hubRoot, 'dashboard_dynamic_names_other', `from_${peerId}`, 'outbox.log.md'), '');
    writeFile(
      path.join(hubRoot, 'dashboard_dynamic_names_other', '_peers', 'agents', `${peerId}.json`),
      `${JSON.stringify({
        project: 'dashboard_dynamic_names_other',
        agent_id: peerId,
        display_name: `${peerId.toUpperCase()} OTHER`,
        lane: `from_${peerId}`,
        status: 'active',
        peer_state: 'confirmed',
      }, null, 2)}\n`,
    );
  }
  const otherProjectLive = runLive(['--hub-root', hubRoot, '--project', 'dashboard_dynamic_names_other', '--agent-id', 'mary']);
  const otherProjectLiveText = outputOf(otherProjectLive);
  assert(otherProjectLive.status === 0, `dynamic aps live wrong project isolation: expected exit 0, got ${otherProjectLive.status}`, otherProjectLiveText);
  const otherProjectLiveHtml = fs.readFileSync(path.join(hubRoot, 'dashboard_dynamic_names_other', '_context', 'aps-live_mary.html'), 'utf8');
  const otherProjectRoom = otherProjectLiveHtml.match(/const roomId = "([^"]+)"/);
  assert(otherProjectRoom, 'dynamic aps live wrong project isolation: missing room id', otherProjectLiveHtml);
  assert(!dynamicLiveRooms.includes(otherProjectRoom[1]), `dynamic aps live wrong project isolation: different project reused room id ${otherProjectRoom[1]}`);
  console.log('PASS dashboard and check-aps are driven by arbitrary APS names');
  expectInboxCase(
    'inbox daily brief includes context as background',
    ['--hub-root', hubRoot, '--project', 'context_inbox', '--agent-id', 'adam', '--from', 'jay'],
    0,
    [
      '今日收件報告',
      '收到 1 個新交接',
      '項目背景索引',
      '只作理解背景;真正要處理的內容仍以上面的交接為準。',
      '對方交了甚麼',
      '我該不該做',
      '建議下一步',
      '排錯時才需要的細節',
    ],
  );
  expectCheckDriveCase(
    'check-drive aliases inbox daily brief',
    ['--hub-root', hubRoot, '--project', 'context_inbox', '--agent-id', 'adam', '--from', 'jay'],
    0,
    [
      '今日收件報告',
      '收到 1 個新交接',
      '對方交了甚麼',
      '排錯時才需要的細節',
    ],
  );
  expectCheckDriveCase(
    'check-drive renders shared goal and roles confirmation as dedicated inbox item',
    ['--hub-root', hubRoot, '--project', 'shared_goal_inbox', '--agent-id', 'jay', '--from', 'adam'],
    0,
    [
      '共同目標與分工確認',
      '這不是普通任務',
      '用 APS 建立 Jay 首輪共同基準',
      'adam 負責發出基準；jay 負責確認、部分同意或提出異議。',
      'Jay 的 check Drive 清楚顯示共同目標、分工、驗收標準與可選確認動作。',
      'Jay 確認共同目標與分工',
      '同意:',
      '部分同意，需要修改',
      '有異議',
      '稍後處理',
      '不要把它標成普通 done',
    ],
  );
  expectCheckDriveCase(
    'check-drive warns when shared goal summary extraction is insufficient',
    ['--hub-root', hubRoot, '--project', 'shared_goal_inbox_insufficient', '--agent-id', 'jay', '--from', 'adam'],
    0,
    [
      '共同目標與分工確認',
      '收到共同目標與分工包，但摘要生成不足，請讀完整 packet 後再決定。',
      '未在基準包內摘出共同目標',
      'Jay 確認共同目標與分工',
      '不要把它標成普通 done',
    ],
    [
      '對方交了甚麼',
      'Project: incomplete_placeholder',
    ],
  );

  console.log('Project Context Index regression checks passed.');
} finally {
  if (existingApsConfig === null) {
    fs.rmSync(path.dirname(apsConfigPath), { recursive: true, force: true });
  } else {
    writeFile(apsConfigPath, existingApsConfig);
  }
  fs.rmSync(runRoot, { recursive: true, force: true });
}
