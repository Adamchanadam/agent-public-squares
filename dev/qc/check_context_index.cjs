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

function runPublish(args) {
  return runAps('publish', args);
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

function expectCase(name, args, expectedStatus, requiredText) {
  const result = runContext(args);
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

function expectInboxCase(name, args, expectedStatus, requiredText) {
  const result = runInbox(args);
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

function expectCheckDriveCase(name, args, expectedStatus, requiredText) {
  const result = runCheckDrive(args);
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

function expectCheckApsCase(name, args, expectedStatus, requiredText) {
  const result = runCheckAps(args);
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

function expectDashboardCase(name, args, expectedStatus, requiredText) {
  const result = runDashboard(args);
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
    ['交接資料未齊', '缺少', '共同目標', '證據位置'],
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
    '項目代號要跟我完全一樣',
    '\nstarter_pack_demo\n',
    '\nuser2\n',
    '你在自己本機的 AI Project 目錄如常打開 AI 工具即可',
    'Google Drive 共用資料夾只是 APS 用來同步交接資料',
  ]) {
    assert(starter.includes(text), `starter pack: missing ${text}`, starter);
  }
  assert(!starter.includes('你大致要做這幾件事： ☁️'), 'starter pack: invitation must not collapse into one paragraph', starter);
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
  for (const text of [
    '📨 APS 協作邀請：open_invite_demo',
    '把下面 `---✂️---` 之間的整段直接貼給 AI',
    '---✂️---',
    '請在目前本機項目資料夾，按這頁指引帶我安裝或加入 Agent Public Squares（APS）：',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html',
    '你要先讀完整頁面，再檢查目前資料夾是否適合安裝或加入。',
    '若目前資料夾已有 .aps/config.json，請先讀取並比對項目代號與共用 Drive 路徑，不要直接覆寫。',
    'Google Drive 本機路徑、項目代號、我的 APS 名稱由我提供或確認；如果我是受邀加入，項目代號以邀請訊息為準，APS 名稱仍由我自己決定，請先檢查是否重名。',
    '項目代號：\nopen_invite_demo',
    'Google Drive 共用資料夾名稱：',
    '邀請人：\nadam',
    '通過後，請告訴我以後可以輸入「check Drive」接收 adam 交來的內容。',
    'https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-join-invite.html',
  ]) {
    assert(invite.includes(text), `open invite: missing ${text}`, invite);
  }
  assert(!invite.includes('我收到一個 Agent Public Squares（APS）協作邀請。請你帶我加入這個 APS project。'), 'open invite: must not drift from the public HTML core prompt', invite);
  assert(!invite.includes('你的 APS 名稱請填'), 'open invite: must not assign the recipient APS name', invite);
  assert(!invite.includes('\nuser2\n'), 'open invite: must not include hard-coded user2 identity', invite);
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', 'from_user2')), 'open invite: must not create invitee lane');
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_ack', 'user2.ack.json')), 'open invite: must not create invitee ack');
  assert(!fs.existsSync(path.join(hubRoot, 'open_invite_demo', '_peers', 'agents', 'user2.json')), 'open invite: must not create invitee peer card');
  console.log('PASS peer invite is copy-paste ready without preassigning identity');

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
  assert(duplicateOutput.includes('APS 名稱 alex 在這個 project 已存在'), 'duplicate init: missing collision warning', duplicateOutput);
  console.log('PASS init blocks duplicate confirmed APS identity');

  const provisionalJoin = runApsProcess(
    ['init', '--target', 'codex', '--dry-run', '--hub-root', hubRoot, '--project', 'starter_pack_demo', '--agent-id', 'user2'],
    makeHandoffProject('provisional-joiner-project'),
  );
  const provisionalJoinOutput = outputOf(provisionalJoin);
  assert(provisionalJoin.status === 0, `provisional join init: expected exit 0, got ${provisionalJoin.status}`, provisionalJoinOutput);
  console.log('PASS init allows agreed provisional starter identity to self-confirm');

  publishReadyProject('publish_missing_peer');
  expectPublishCase(
    'publish blocks local APS identity override',
    ['--hub-root', hubRoot, '--project', 'publish_missing_peer', '--from', 'mary', '--to', 'jay', '--topic', 'identity_override', '--body', 'should block'],
    1,
    ['publish 已阻擋', '本機 APS 名稱是 adam', '指令要求使用 mary', '--allow-agent-override'],
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
    for (const text of [expectedText, '本機 APS 名稱是 adam', '指令要求使用 mary', '--allow-agent-override']) {
      assert(output.includes(text), `${name}: missing expected output text "${text}"`, output);
    }
    console.log(`PASS ${name}`);
  }
  expectPublishCase(
    'publish blocks explicit unregistered peer',
    ['--hub-root', hubRoot, '--project', 'publish_missing_peer', '--agent-id', 'adam', '--to', 'ghost_id', '--topic', 'missing_peer', '--body', 'should block'],
    1,
    ['not registered as a project peer', 'peer invite', 'peer add'],
  );

  writeTempApsConfig('publish_provisional_peer', 'adam');
  const provisionalPeer = runApsProcess(['peer', 'add', '--agent-id', 'pending_peer', '--display-name', 'Pending Peer']);
  const provisionalPeerOutput = outputOf(provisionalPeer);
  assert(provisionalPeer.status === 0, `provisional peer add: expected exit 0, got ${provisionalPeer.status}`, provisionalPeerOutput);
  expectPublishCase(
    'publish blocks inactive provisional peer',
    ['--hub-root', hubRoot, '--project', 'publish_provisional_peer', '--agent-id', 'adam', '--to', 'pending_peer', '--topic', 'provisional_peer', '--body', 'should block'],
    1,
    ['no activity yet', 'peer invite'],
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
  for (const text of ['對方退回', 'missing source file', 'revise 修訂', 'withdraw 撤回', 'close 收結']) {
    assert(declineCheckApsOutput.includes(text), `decline check-aps: missing ${text}`, declineCheckApsOutput);
  }
  const declineDashboard = runApsProcess(['dashboard']);
  const declineDashboardOutput = outputOf(declineDashboard);
  assert(declineDashboard.status === 0, `decline dashboard: expected exit 0, got ${declineDashboard.status}`, declineDashboardOutput);
  const declineDashboardHtml = fs.readFileSync(path.join(hubRoot, 'decline_packet_demo', '_context', 'dashboard.html'), 'utf8');
  for (const text of ['對方退回', 'missing source file', 'revise 修訂', 'withdraw 撤回', 'close 收結']) {
    assert(declineDashboardHtml.includes(text), `decline dashboard html: missing ${text}`, declineDashboardHtml);
  }
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
    'lane 名稱 from_bad-name 不是合法 APS 名稱',
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
    '風險與提醒',
    'alex.ack.json 內的 agent 是 mary',
    'casey.ack.json 內的 project 是 wrong_project',
    'lane 名稱 from_bad-name 不是合法 APS 名稱',
    'bob.json 內的 agent_id 是 robert',
    'casey.json 內的 project 是 wrong_project',
    'dana.json 內的 lane 是 from_different_dana',
    'bob 有 peer card,但缺少 lane 缺少 ack',
  ]) {
    assert(identityCheckApsOutput.includes(text), `identity check-aps: missing ${text}`, identityCheckApsOutput);
  }
  console.log('PASS identity conflict scan catches ack, lane, peer-card, and incomplete identity issues');

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
        '參考 README 與 skills/aps/SKILL.md 的新手交接流程。',
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
    ['交接資料未齊', '內容不足', '共同目標', '證據位置'],
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
    ['交接資料未齊', '內容不足', '共同目標', '本方任務', '證據位置'],
  );

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
    '2026-05-31T12:10:00Z | publish | 20260531T121000Z__release_review v1 | to:jay | items:1\n',
  );
  writeFile(
    path.join(hubRoot, 'dashboard_daily', 'from_adam', 'packets', '20260531T121000Z__release_review__v1', 'packet.md'),
    `---\npacket_id: 20260531T121000Z__release_review\nversion: 1\nfrom: adam\nto: jay\nproject: dashboard_daily\nlevel: L2-aps-packet\nsupersedes: null\ncreated_at: 2026-05-31T12:10:00Z\nssot_refs: []\nscope: \"release_review\"\nitems:\n  - id: \"確認 Dashboard 是否可讀\"\n---\n\n# release_review\n\n## 共同目標\n確認 Daily Index 是否比純 context overview 更有用。\n`,
  );
  writeAck('dashboard_daily', 'jay', [
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
    current_focus: 'Daily Index should show pending handoffs, sent status, and suggested reading.',
  });

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
  assert(overviewHtml.includes('執行真相一律以 packet / outbox / ack 為準'), 'context html: missing packet authority warning', overviewHtml);
  assert(overviewHtml.includes('daily_summary'), 'context html: missing generated context workstream', overviewHtml);
  assert(overviewHtml.includes('packet:jay:20260531T120000Z__daily_summary:v1'), 'context html: missing source ref', overviewHtml);
  assert(!overviewHtml.includes(path.join(hubRoot, 'context_add')), 'context html: should not expose local absolute project path', overviewHtml);
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
    'dashboard creates daily index',
    ['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--other-agent-id', 'jay'],
    0,
    ['已生成唯讀 Daily Index', 'dashboard.html'],
  );
  const dashboardHtml = fs.readFileSync(path.join(hubRoot, 'dashboard_daily', '_context', 'dashboard.html'), 'utf8');
  for (const text of [
    '下一步',
    '這裡只整理已同步資料中可追溯的行動線索，不是自動派工。',
    '你要處理',
    '建議下一步',
    '今日要看',
    '我發出的交接',
    '建議先讀',
    '項目背景',
    '風險與未決',
    'daily_summary',
    '對方已標記處理',
    'ack 已記錄',
    '可以反映已存在的 ack / close / withdraw 狀態',
    '不推斷對方是否已看到通知',
    'Google Docs',
    'https://docs.google.com/document/d/demo-project-context-index',
    '執行真相一律以 packet / outbox / ack 為準',
  ]) {
    assert(dashboardHtml.includes(text), `dashboard html: missing ${text}`, dashboardHtml);
  }
  assert(!dashboardHtml.includes(hubRoot), 'dashboard html: should not expose local absolute hub path in action or risk sources', dashboardHtml);
  console.log('PASS dashboard contains daily index sections and Google Docs link');
  expectCheckApsCase(
    'check-aps shows full APS status and updates dashboard',
    ['--hub-root', hubRoot, '--project', 'dashboard_daily', '--agent-id', 'adam', '--other-agent-id', 'jay'],
    0,
    [
      'APS 整體狀態',
      '待你處理: 1',
      '你發出的交接: 1',
      '尚未看到對方處理: 0',
      '下一步',
      '[你要處理]',
      '[先核對風險]',
      '來源:',
      '今日要看',
      '我發出的交接',
      '協作對象',
      'Dashboard 已按需更新',
      '不是背景自動監察',
    ],
  );
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

  console.log('Project Context Index regression checks passed.');
} finally {
  if (existingApsConfig === null) {
    fs.rmSync(path.dirname(apsConfigPath), { recursive: true, force: true });
  } else {
    writeFile(apsConfigPath, existingApsConfig);
  }
  fs.rmSync(runRoot, { recursive: true, force: true });
}
