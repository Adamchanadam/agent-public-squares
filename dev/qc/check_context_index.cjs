#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const apsBin = path.join(repoRoot, 'bin', 'aps.js');
const evidenceRoot = path.join(repoRoot, 'dev', 'qc', 'evidence');
const runRoot = fs.mkdtempSync(path.join(evidenceRoot, 'context-index-regression-'));
const hubRoot = path.join(runRoot, 'hub');

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
  fs.rmSync(runRoot, { recursive: true, force: true });
}
