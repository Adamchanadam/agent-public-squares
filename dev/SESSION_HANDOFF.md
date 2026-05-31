# Session Handoff

Last Updated: 2026-05-31 (S55 local Project Context Index / Daily Index QC — APS 0.2.14 remains the public latest; local package candidate is 0.2.15 for `aps context` / `aps context check` / `aps context add` / `aps context html`, `aps dashboard`, and daily `aps check-drive`; `npm test` now runs `dev/qc/check_context_index.cjs` for no context, valid context, missing source, stale source, newer packet version freshness, conflict marker, forbidden fields, flags-first command order, unsafe `file:` source, invalid `source_agent`, unknown context action, context add generation + exact source-ref idempotency, context html safe overview + conflict severity, dashboard Daily Index sections, Google Docs URL rendering, explicit `ack 已記錄` status wording, no recipient-notification inference, inbox daily-brief output with context as background, and check-drive alias behavior. No commit, push, tag, release, npm publish, GitHub Pages change, or Drive Hub write was performed in S55.)

<!-- ack:section:durable-anchors -->
## Durable Anchors

Stable facts that should survive across sessions. Update only when they change, but verify they still match reality at closeout.

1. Project root and boundary: `C:\Users\adam\_claude_desktop\Agent_Public_Squares` is the design / implementation / documentation SSOT workspace for Agent Public Squares (APS). It is not a product runtime workspace. The local working-folder rename is complete and verified in S50. 0.2.13 (PUBLISHED) changed the DEFAULT shared-folder name for NEW installs to `Agent_Public_Squares` and scrubbed the underscore `AI_Public_Squares` from user-facing defaults / examples; existing older `AI_Public_Squares` folders + configs remain compatible; the `AI Public Squares` product alias (with a space) is retained.
2. Product identity: Agent Public Squares is a cross-machine collaboration protocol and npm package (`@adamchanadam/aps`, Apache-2.0) for AI agents exchanging structured packets through a locally synced shared folder. `AI Public Squares` is a recognized LEGACY alias; `APS` is the abbreviation; the npm package name stays `@adamchanadam/aps`. **npm latest is `0.2.14` (readable packet UX root-fix, published 2026-05-31 S54).**
3. Governance model: Agent Handoff Kit doctor is the governance health check for this root. External skill flows, demo workspaces, and other tool outputs are subordinate evidence; this root's handoff / log / index / registry are authoritative for this workspace.
4. Runtime storage boundary: the shared Drive folder at `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\` owns runtime `_hub/`, templates, lane data, and ack files. This repo owns npm package source, public docs, plans, and QC truth. Structural tokens `hubRoot` / `--hub-root` / `_hub/` / `<hub_root>` / PROTOCOL schema / `setupHub` / `doctorHub` must NOT be renamed; only user-facing prose says 「共用 Drive 資料夾」.
5. Release boundary: GitHub repo `Adamchanadam/agent-public-squares` is public; Pages serves from `main` root. **GitHub release `v0.2.14` (tag `v0.2.14`→`cf367f1`) is the Latest release**; older `v0.2.13`→`6059f45`, `v0.2.12`→`c9e8057`, and `v0.2.8`→`136042c` retained. **npm `@adamchanadam/aps@latest` = `0.2.14`.** The receive trigger is `check Drive` (legacy `check Hub` still recognized as a hidden alias). Do not reuse the old repo name `ai-public-squares` (breaks GitHub redirects). Product remains early testing, not production-ready.
6. Product scope decision (locked 2026-05-29 S45): the automation / background-notification / scheduling layer — `aps watch`, file-based `_notify`, OS / AI-platform scheduling, desktop notifications, Telegram-bot auto-send / auto-pushing into a running session — is **OUT OF APS SCOPE**, NOT deferred. APS is a manual, human-in-loop, synced-folder structured-handoff protocol: it produces a copy-ready human notification and the receiver runs `check Drive` by hand. Deferred (still in-scope future): true multi-agent platform, multi-recipient packet, group alias, Project Context Index, Dropbox / OneDrive formal support.
7. QC discipline (locked 2026-05-29 S46): `bin/aps.js` is the user-visible-behaviour truth source; `skills/aps/**` and public docs are teaching layers that must follow it. Structure-level checks (`description` ≤1024 / valid YAML / trigger phrases / section + link integrity) passing does NOT mean the behaviour / product model is aligned — the two are not interchangeable. When CLI behaviour changes (question count, flags, generated artifacts, command contracts, exit codes), the teaching layers must be re-aligned, or the divergence recorded as a blocking gate in Risks + release gate. SSOT for this rule: `dev/qc/triggers.md` 外發前檢 9(d); memory `feedback-structure-vs-behaviour-drift`.

<!-- ack:section:closeout-reconciled-state -->
## Closeout-Reconciled State

This is the current-state area. At every full closeout, rewrite or explicitly confirm every section below. Do not append a new state snapshot under an old one.

<!-- ack:section:current-baseline -->
## Current Baseline

1. Workspace: `C:\Users\adam\_claude_desktop\Agent_Public_Squares`, branch `main`, remote `origin = https://github.com/Adamchanadam/agent-public-squares.git`. S52 closeout verified this is the active root state carried forward from S50/S51. No push / tag / release / publish action was performed in S50-S52.
2. Public release: **npm latest `@adamchanadam/aps@0.2.14`; GitHub release `v0.2.14` is Latest; GitHub Pages entry and joiner page return 200.** Local `package.json` is 0.2.15 for the unpublished Project Context Index / Daily Index candidate.
3. **0.2.13「人性化上手」FULLY SHIPPED.** 第一段 (CLI) + 第二段 (skill) + 第三段+ (public surfaces + naming unification + starter-pack rewrite + joiner page) + B4/B5 + 第四段 UAT + **第五段 gated release** all DONE. Nothing about 0.2.13 remains.
4. **Naming unification (0.2.13, shipped):** new installs default the shared folder to `Agent_Public_Squares`; the underscore `AI_Public_Squares` is scrubbed from every user-facing default / example. The `AI Public Squares` product alias (space) + `check Hub` trigger stay recognized. Existing older `AI_Public_Squares` folders / configs keep working. The maintainer's real Drive Hub is now verified at `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; historical plan / QC files may still contain earlier path snapshots and should not be bulk-rewritten as current state.
5. **Joiner page** `docs/guides/aps-join-invite.html` is live on Pages; `starterPackContent()` generates a forwardable invite linking to it (with the three install commands). `peer add` writes a project-scoped starter pack (`starter-pack-<project>-<peer>.md`).
6. Governance state: brand / vocab discipline holds. QC 9(d) behaviour-truth gate verified GREEN at the release-check. Agent Handoff Kit doctor `status: passed` (45 checks). **The Kit is now v0.3.20** after Adam's 2026-05-31 local upgrade; doctor confirms tool / project record / npm latest 三向對齊 v0.3.20. Latest migration report: `dev/governance_migrations/20260531T071022Z/migration-report.md`.

<!-- ack:section:task-understanding-summary -->
## Task Understanding Summary

<!-- ack:field:user-intent -->
- User intent: build APS into a usable public pre-release product for non-technical users, with reliable natural-language AI-assisted cross-machine handoff. Adam wants strong product / UX judgment, fact-checkable delivery, and root-cause governance — not patch-stacking. Each external action (publish / push / tag / release) is individually authorized.
<!-- ack:field:task-essence -->
- Task essence: **0.2.14 is publicly shipped and read back.** It fixes three new-user UX gaps: useful notification / inbox summaries, successful post-close status reporting, and a human-readable `inbox` receive report that explains what the other side sent, whether to act yet, and the next step before showing technical details. Remaining active concerns are Project Context Index design and monitoring real-world adoption.
<!-- ack:field:success-criteria -->
- Current success criteria: 0.2.14 public release criteria are MET. Release commit `cf367f1` was pushed to `origin/main`, tag `v0.2.14` was pushed, GitHub release `v0.2.14` is Latest, npm latest is `0.2.14`, `npx --yes @adamchanadam/aps@latest --help` shows v0.2.14, Pages entry + joiner pages return 200, and local governance has been updated after readback.

<!-- ack:section:active-objective -->
## Active Objective

**0.2.14 is DONE and publicly shipped (S54).** It is the current npm latest and GitHub Latest release for the readable-summary, post-close-status, and human-readable inbox-report UX root-fix.

The **Agent Handoff Kit tool is now v0.3.20**. Adam updated this root again on 2026-05-31; the latest migration merged `AGENTS.md`, updated `dev/PROJECT_INDEX.md` metadata from 0.3.18 to 0.3.20, and wrote backup `dev/governance_migrations/20260531T071022Z/`. Follow-up doctor reports `status: passed` and tool / project record / npm latest 三向對齊 v0.3.20. No Kit upgrade work remains.

No 0.2.14 release work remains. Commit / push / tag / GitHub release / npm publish were explicitly authorized by Adam and completed in S54. Any future external action still requires fresh explicit authorization.

Active local follow-up: Project Context Index first slice is now packaged as local 0.2.15 candidate after S55. The design source has been consolidated into roadmap §4.4, and the local CLI has `aps context` / `aps context check` with schema / source / freshness checks, including forbidden-field blocking and newer packet version detection; `aps context add` generates a local background entry from an existing packet with exact source-ref idempotency; `aps context html` generates `_context/overview.html` as a read-only human snapshot; `aps dashboard` generates `_context/dashboard.html` as a read-only Project Dashboard / Daily Index. The dashboard reads locally synced packet / outbox / ack / peer cards / context log, can show explicit synced states such as `ack 已記錄`, close, and withdraw, and must not infer that the recipient saw a notification from Drive file existence. `inbox` now starts with a daily human brief and may show Project Context Index as background only before the handoff summary; `check-drive` is the daily alias for the same route. Auto-refresh, task-board behavior, true multi-agent platform, multi-recipient packet, group alias, and Dropbox / OneDrive formal support remain deferred.

Out of APS scope (NOT deferred): `aps watch`, file-based `_notify`, OS / AI-platform scheduling, desktop notifications, Telegram-bot auto-send.

<!-- ack:section:completed-this-session -->
## Completed This Session

Record only work actually completed in the current session (S50-S53). Earlier S49/S48 work is in `dev/SESSION_LOG.md` and the archive.

1. **Verified local project rename:** current cwd and git root are `C:\Users\adam\_claude_desktop\Agent_Public_Squares`; branch is `main`; `AGETNS.md` does not exist, so `AGENTS.md` remains the active governance entry.
2. **Verified real Drive Hub rename:** `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\` exists and contains `_hub/`, protocol files, starter packs, and project lanes; old `...\AI_Public_Squares\` path does not exist.
3. **Updated active governance paths:** handoff, project index, doc sync registry, session log, and next-session prompt now point to the verified local root / Drive Hub path. Historical logs, archives, old plans, and QC evidence were intentionally not bulk-rewritten.
4. **Resolved stale UAT sibling:** Adam manually deleted `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified `Test-Path` returns `False`. Before deletion, read-only inspection showed it was not a git repo and still pointed at the old local / Drive paths, so rebuilding from npm latest is the clean path if a new UAT is needed. No same-named UAT Hub was present under `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\`.
5. **Startup integration probe:** `context7` and `chrome-devtools` were callable in this Codex session; `PROJECT_INDEX.md` Last Verified cells updated to 2026-05-30.
6. **Added QC closeout root-fix:** `dev/qc/triggers.md` now requires explicit pass / fail / blocked / not-run / not-applicable status handling so QC reports cannot silently hide unresolved items.
7. **Verified Agent Handoff Kit v0.3.20:** Adam updated the local root; latest migration `dev/governance_migrations/20260531T071022Z/` merged `AGENTS.md` and updated project metadata. Doctor v0.3.20 reports `status: passed`, 45 checks, prompt mirror ok, credential sweep ok, and version 三向對齊.
8. **Completed closeout maintenance:** `SESSION_LOG` N-rule advanced; S42/S41/S40 raw entries moved to archive batch 011 and S49-S43 collapsed to short index entries.
9. **Completed S53 two-folder APS self-UAT:** created independent `agent_a` / `agent_b` folders under `dev/qc/evidence/2026-05-31-two-agent-uat/`, initialized both against the real shared Drive Hub, ran A→B publish / inbox / consume / status, B→A reply / inbox / consume, and closed both packet lines.
10. **Prepared 0.2.14 candidate before release:** fixed `bin/aps.js` summary extraction, post-close status reporting, and `inbox` human-readable receive reports; bumped local `package.json` to `0.2.14`; created / updated `dev/release-notes/v0.2.14.md` plus `dev/release-notes/v0.2.14.github.md`.
11. **Released 0.2.14:** Adam explicitly authorized commit, push, tag, GitHub release, and npm publish. Commit `cf367f1` (`Release APS 0.2.14 readable inbox UX`) was pushed to `origin/main`; tag `v0.2.14` was pushed; GitHub release `Agent Public Squares v0.2.14` was created and appears as Latest; `npm publish --access public` published `@adamchanadam/aps@0.2.14`.

<!-- ack:section:next-priorities -->
## Next Priorities

1. **Project Context Index design / CLI** — local 0.2.15 candidate work started in S55. Direction is recorded in roadmap §4.4 as the one-place design source: per-agent markdown source (`_context/from_<agent_id>/context.log.md`) → freshness / drift checks → packet-derived local context entry → CLI on-demand overview → read-only Project Dashboard / Daily Index; it must not promise automatic freshness, must stay background-only, and packet / outbox / ack remain execution truth. Local CLI now has `aps context` / `aps context check` for schema / source / freshness checks, `aps context add --from-packet <id> --version <n>` for idempotent packet-derived local entries, `aps context html` for `_context/overview.html`, `aps dashboard` for `_context/dashboard.html`, plus `aps check-drive` as the daily receive alias. `npm test` runs `dev/qc/check_context_index.cjs` to cover missing source, stale source, newer packet version freshness, conflict marker, forbidden fields, unsafe `file:` source, invalid `source_agent`, flags-first command order, unknown context action, context add generation + exact source-ref idempotency, context html safe overview + conflict severity, dashboard Daily Index sections, Google Docs URL rendering, explicit `ack 已記錄` status wording, no recipient-notification inference, inbox daily-brief output, and check-drive alias behavior. Auto-refresh remains deferred. Reference demo (fake data, gitignored): `dev/qc/evidence/2026-05-31-context-html-demo/`.
2. **Monitor 0.2.14 adoption** — Jay (and any new joiner) reinstall `@latest` (now 0.2.14) and exercise the three-question install + joiner page plus the new human-readable `check Drive` / `inbox` report on a real machine; capture any defect. S53 self-UAT validates two independent folders on one machine, but not real cross-machine Drive sync latency.
4. **Path hygiene on future edits** — when touching older plan docs, distinguish current-state paths from historical evidence before replacing `AI_Public_Squares`.
5. **Fresh UAT only if needed** — the stale local `AI_Public_Squares_UAT` sibling is gone. Any future UAT should be created as a clean workspace using npm `@latest` and the verified `Agent_Public_Squares` Drive Hub path.

<!-- ack:section:next-task-required-reading -->
## Next Task Required Reading

Before acting on the next task, read or mark blocked:

| Source | Why required | Status |
|---|---|---|
| `AGENTS.md` | Active governance contract | confirmed |
| `dev/SESSION_HANDOFF.md` | Current state | confirmed |
| `dev/SESSION_LOG.md` latest entry (S53) | Current evidence | confirmed |
| `dev/PROJECT_INDEX.md` | Workspace map + source-of-truth pointers | confirmed |
| `dev/RULE_PACKS.md` | Task routing | confirmed |

<!-- ack:section:risks-blockers -->
## Risks / Blockers

1. **0.2.14 is published — no release work pending.** Public surfaces read back and agree: npm latest 0.2.14, `npx @latest --help` v0.2.14, `origin/main` and tag `v0.2.14` point to `cf367f1`, GitHub release `v0.2.14` is Latest, and Pages entry / joiner pages return 200.
2. **Kit version drift RESOLVED**: the Agent Handoff Kit is now v0.3.20; doctor reports version 三向對齊 (tool / project record / npm latest all v0.3.20). No drift remains.
3. **`items` must use the explicit contract, never prose-parsing** (codex-validated, UAT + release-check confirmed): sender declares `--items`; CLI records verbatim into frontmatter; reader reads frontmatter only; `revise` preserves prior items unless `--items` / `--clear-items`.
4. **Naming / rename discipline.** New installs default to `Agent_Public_Squares`; existing older `AI_Public_Squares` folders + configs keep working — do NOT force-migrate users. Underscore `AI_Public_Squares` scrubbed from user-facing defaults only; `AI Public Squares` (space) product alias + `check Hub` trigger stay recognized. Local dev-folder + maintainer Drive Hub rename are complete as of S50; historical plans / QC evidence may retain old path snapshots.
5. **Automation stays out of scope**: never re-add `watch` / `_notify` / OS+platform scheduling / desktop notifications / Telegram-bot auto-send.
6. **Brand / structural discipline**: never rename `hubRoot` / `--hub-root` / `_hub/` / PROTOCOL schema / `setupHub` / `doctorHub`; never reuse `ai-public-squares`. Any skill frontmatter edit re-measures `description` ≤1024 + valid YAML (currently 729).
7. **codex / claude-p invocation**: call directly (NOT `cmd /c`); long / Chinese prompts via a UTF-8 prompt file + `"$(cat file)" < /dev/null`. Runbook `GENERIC_OPERATIONAL_RUNBOOK.md` §3i / §5k.
8. **Per-project Drive verification still required** for each real project (path, offline availability, sync).
9. **Real Hub / scratch**: the real Drive hub keeps earlier UAT slugs (Adam confirmed disposable UAT). The S48 release-check round-trip ran in OS-temp sandboxes with redirected HOME (real Hub + real `~/.claude` untouched); left for OS temp cleanup.
10. **QC discipline in force**: structure-pass ≠ behaviour-aligned; `bin/aps.js` is the behaviour truth; teaching layers follow; staged CLI-ahead-of-teaching must be tracked as a blocking item. SSOT `dev/qc/triggers.md` 外發前檢 9(d).
11. **0.2.14 release boundary**: summary extraction for notifications / inbox now skips pure headings; `status --packet-id` after a closed packet now reports `已收結`; `inbox` now leads with `對方交了甚麼`, `對方請你做`, `我該不該做`, and `建議下一步` before technical packet details. This is published as npm latest 0.2.14 and GitHub Latest release `v0.2.14`.

<!-- ack:section:validation-qc -->
## Validation / QC

- **0.2.13 release-check GREEN** (report `dev/qc/2026-05-30-aps-full-audit-0.2.13-release-check.md`): 外發前檢 (快檢 4 + 9 項) + 全面檢 可跑部分全部通過. Highlights — `node --check` clean; `npm pack --dry-run` version 0.2.13 / 14 files; skill `description` 729 ≤1024 + 0 colon-space (valid YAML); bracket-path `init --dry-run` exit 0 (0.2.10 regression holds); 9(d) teaching-layer old-model markers 0; HTML `<section>` balance (index 10/10, guides hub 3/3, walkthrough 16/16, join 7/7, maintainers 5/5) + 0 local .md links; browser render index/walkthrough 0 console error (join page only favicon-404, cosmetic); fresh isolated 0.2.13 round-trip all GREEN (incl. items verbatim, revise preserve = 2 / --clear-items = 0, consume ack written).
- **Post-publish read-backs (all agree):** `npm view` version + dist-tags.latest 0.2.13, 14 files; `npx --yes @adamchanadam/aps@latest --help` shows v0.2.13; GitHub Pages join page 200 + index 「三條問題」/ 0 「五個值」; `origin/main` == HEAD; `gh release view v0.2.13` reports `isPrerelease=false`, `isDraft=false`, target `6059f45`, Latest release; `git ls-remote --tags origin v0.2.13` → 6059f45.
- **Agent Handoff Kit doctor**: `status: passed`, 45 checks — both at the release-check (Kit v0.3.14), after the Kit upgrade to v0.3.17, and after Adam's 2026-05-31 upgrade to **v0.3.20**. Latest doctor confirms version 三向對齊, prompt mirror ok, credential sweep ok.
- **S50-S52 governance path sync validation**: local path checks confirmed current git root `C:\Users\adam\_claude_desktop\Agent_Public_Squares`, current Drive Hub `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`, old Drive Hub absence, and initially untouched local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`. Adam later manually deleted that stale UAT sibling; this session verified it no longer exists. Adam then updated Agent Handoff Kit again to v0.3.20; latest migration `20260531T071022Z` merged `AGENTS.md`, updated project metadata, and reported no conflicts. External `doctor` then passed: 45 checks, `status: passed`, prompt mirror ok, credential sweep ok. S52 closeout advanced the SESSION_LOG N-rule by archiving S42/S41/S40 into batch 011 and collapsing S49-S43 to short index entries.
- **S50 scoped audit**: `dev/qc/2026-05-30-aps-full-audit-s50-governance-path-sync.md` created. Result: scoped pass with one governance warning (SESSION_LOG N-rule). This is a path-sync / governance audit, not a complete release-grade full audit and not release / publish clearance; cross-workspace / protocol-runtime items were not run.
- **QC root-fix from S50 audit lesson**: Adam identified the root problem that QC reports must not silently hide failed / blocked / not-run items behind a passing summary. `dev/qc/triggers.md` now has a shared QC result closeout rule: every item must have a clear status, summaries must not overstate pass scope, failed / blocked items require root-fix or explicit blocker handling, and reports must end with unresolved-item sections.
- `START_NEXT_SESSION_PROMPT.txt` regenerated at S52 closeout.
- **S53 two-folder self-UAT and local root-fix:** created two independent local folders under `dev/qc/evidence/2026-05-31-two-agent-uat/`, installed npm latest packages, initialized A=`adam_uat` and B=`jay_uat` against the shared Drive Hub `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares`, ran A→B publish / inbox / consume / status, then B→A reply / inbox / consume, then both senders closed their packets. Final inbox on both sides was empty. Then locally fixed the two UX defects in `bin/aps.js` and re-ran a regression packet `20260531T095528Z__summary_rootfix_uat`: notification / inbox summary showed useful content, consume was detected, close succeeded, and status after close returned `已收結` with exit code 0. Evidence report: `dev/qc/evidence/2026-05-31-two-agent-uat/RESULTS.md`. Boundary: one machine only; does not prove real cross-machine Drive sync latency.
- **0.2.14 local candidate checks / external-release-prep:** `node --check bin\aps.js` passed; `npm test` passed (`No tests yet`); `npm pack --dry-run --json` reports `@adamchanadam/aps@0.2.14`, 14 files; `node bin\aps.js --help` shows v0.2.14 pre-release; `node bin\aps.js bogus` exits 1 with the expected help guidance; bracket-path `init --dry-run` accepts a real path containing `[Project]`, spaces, and `@`; isolated `doctor`, `upgrade --dry-run`, and `inbox --all` in the inbox-report regression workspace all passed; post-close status regression on `20260531T095528Z__summary_rootfix_uat` exits 0 and reports `已收結`; isolated inbox-report regression `20260531T111538Z__inbox_report_uat` shows `對方交了甚麼`, `對方請你做`, `我該不該做`, `建議下一步`, and technical details in the intended order; skill frontmatter description is 729 chars / 0 colon-space / ok; HTML `.md` href scan has zero matches; public HTML section counts are balanced; Chrome DevTools rendered `docs/index.html`, `docs/guides/index.html`, `docs/guides/aps-onboarding-walkthrough.html`, `docs/guides/aps-join-invite.html`, `docs/maintainers/index.html`, and `docs/qc/governance-map.html` with no console errors; strict credential scan has zero matches; `git diff --check` passed with LF→CRLF warnings only; Agent Handoff Kit doctor v0.3.20 passed, with only the SESSION_LOG N-rule warning for next full closeout. Result: scoped GREEN for local 0.2.14 candidate readiness before S54 publish.
- **0.2.14 post-publish readbacks:** `npm view @adamchanadam/aps version dist-tags.latest dist.fileCount bin --json` reports version/latest 0.2.14, 14 files, bin `aps`; `npx --yes @adamchanadam/aps@latest --help` shows v0.2.14; `npm view @adamchanadam/aps time --json` records `0.2.14` at `2026-05-31T11:48:11.039Z`; `git ls-remote origin refs/heads/main` and `git rev-parse HEAD` both point to `cf367f1`; `git ls-remote --tags origin v0.2.14` points to `cf367f1`; `gh release view v0.2.14` reports `isDraft=false`, `isPrerelease=false`, target `main`; `gh release view v0.2.14 --json body` confirms the release body contains the 0.2.14 fixes / compatibility / verification notes; `gh release list --limit 3` lists v0.2.14 as Latest; GitHub Pages entry and joiner page both return HTTP 200.
- **S55 local 0.2.15 Project Context Index / Daily Index candidate checks:** scoped release-check report `dev/qc/2026-05-31-aps-0.2.15-release-check.md` now records local candidate pass with warnings. `node --check bin\aps.js`, `node --check dev\qc\check_context_index.cjs`, `npm test`, `git diff --check`, `node bin\aps.js --help`, `node bin\aps.js bogus`, bracket-path `init --dry-run`, dashboard demo generation, context HTML demo generation, skill frontmatter check, public HTML `.md` link scan, sensitive-string scan, `npm view @adamchanadam/aps version dist-tags.latest bin dist.fileCount --json`, and `npm pack --dry-run --json` passed or returned the expected result. `--help` shows v0.2.15 pre-release; `npm pack --dry-run --json` reports `@adamchanadam/aps@0.2.15` with 15 files; npm registry readback still shows public latest 0.2.14. The regression covers forbidden fields, newer packet versions, exact `v1` / `v11` source-ref idempotency, HTML conflict severity, dashboard Daily Index sections, Google Docs URL rendering, explicit `ack 已記錄` status wording, no recipient-notification inference, and `check-drive` daily brief behavior. Browser snapshot / screenshot evidence for the generated dashboard was written under `dev/qc/evidence/2026-05-31-context-html-demo/`. Agent Handoff Kit doctor was completed using exact pinned version `@adamchanadam/agent-handoff-kit@0.3.20`: `status: passed`, 45 checks, 0 failed, with prompt mirror and SESSION_LOG N-rule closeout warnings.

<!-- ack:section:workspace-identity -->
## Workspace Identity

Expected project root: `C:\Users\adam\_claude_desktop\Agent_Public_Squares`
Git root: same
Branch: `main`
Latest pushed state: 0.2.14 release commit `cf367f1` pushed to `origin/main`; tag `v0.2.14`→`cf367f1`; GitHub release `v0.2.14` is Latest; npm latest `@adamchanadam/aps@0.2.14`; Pages entry / joiner pages return 200.
Remote: `origin = https://github.com/Adamchanadam/agent-public-squares.git` (public, Apache-2.0, HTTPS via Windows Credential Manager). GitHub auto-redirects old web+git URLs but NOT Pages — do not reuse the old slug.
Worktree status: release commit `cf367f1` is pushed and tagged; current worktree contains uncommitted local 0.2.15 Project Context Index / Daily Index candidate changes plus untracked candidate QC / release-note files. No commit, push, tag, GitHub release, npm publish, GitHub Pages change, or Drive Hub write has been performed for 0.2.15. Outside the repo (not git-tracked): memory files; `GENERIC_OPERATIONAL_RUNBOOK.md`; OS-temp release-check sandboxes (auto-cleaned); ignored S53 evidence under `dev/qc/evidence/2026-05-31-two-agent-uat/` and S55 dashboard demo evidence under `dev/qc/evidence/2026-05-31-context-html-demo/`. Adam manually deleted the stale local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified it no longer exists.
Execution environment note: Claude Code on Windows, git-bash Bash tool + PowerShell tool. Isolated-hub tests use temp Hub + redirected HOME (real Hub + real `~/.claude` skills untouched); the redirect (HOME / USERPROFILE) and REPO/UAT paths must be re-exported in every Bash call. codex via direct call (never `cmd /c`).

<!-- ack:section:sync-status -->
## Sync Status

Use statuses from `dev/DOC_SYNC_REGISTRY.md`: `confirmed`, `unverified`, `pending`, `blocked`, `not_applicable`.

- `bin/aps.js` + `skills/aps/**` + README + `docs/**`: `confirmed` — 0.2.14 shipped behaviour + teaching, published + pushed + live on Pages; README version hint corrected to 0.2.14; local 0.2.15 Project Context Index / Daily Index candidate is confirmed by `npm test`, browser snapshot evidence, `--help`, pack dry-run, and Agent Handoff Kit doctor v0.3.20 status passed.
- `package.json`: `confirmed` — local version 0.2.15 is an unpublished candidate above npm latest 0.2.14; help and pack dry-run confirm 0.2.15.
- npm registry: `confirmed` — latest 0.2.14, 14 files, bin `aps`, published 2026-05-31T11:48:11.039Z (read back).
- GitHub Pages: `confirmed` — entry and joiner pages HTTP 200 after release push.
- GitHub release / tag: `confirmed` — `v0.2.14`→`cf367f1`, `isPrerelease=false`, `isDraft=false`, GitHub Latest release (read back).
- `dev/release-notes/v0.2.13.md` (changelog) + `dev/release-notes/v0.2.13.github.md` (release body): `confirmed` — committed at this closeout.
- `dev/release-notes/v0.2.14.md` (changelog) + `dev/release-notes/v0.2.14.github.md` (release body): `confirmed` — committed in release commit `cf367f1`; GitHub release body created from the GitHub note file.
- `dev/qc/2026-05-30-aps-full-audit-0.2.13-release-check.md`: `confirmed` — committed in the release commit `6059f45`.
- `dev/qc/2026-05-30-aps-full-audit-s50-governance-path-sync.md`: `confirmed` — scoped audit for S50 local folder rename + formal Drive Hub rename governance sync; scoped pass with one closeout-maintenance warning; not a complete release-grade full audit.
- `dev/qc/triggers.md`: `confirmed` — S50 added the shared QC result closeout rule so failed / blocked / not-run items cannot be silently hidden after full audit or similar QC.
- `dev/PROJECT_INDEX.md`: `confirmed` — workspace identity / release rows updated; S50 path sync updates current root and Drive Hub path.
- Agent Handoff Kit upgrade (latest v0.3.20): `confirmed` — Adam updated this root on 2026-05-31; migration report `dev/governance_migrations/20260531T071022Z/migration-report.md`; doctor 三向對齊 v0.3.20.
- Memories + runbook: `confirmed` (outside repo / not committed).
- SESSION_LOG archive: `confirmed` — S52 closeout moved S42/S41/S40 into archive batch 011 with raw content preserved; S49-S43 collapsed to short index entries; INDEX updated.

<!-- ack:section:state-reconciliation-check -->
## State Reconciliation Check

At full closeout, complete this check after updating the state sections above.

- Reconciled at: 2026-05-31 S53 candidate sync, covering: verified local project root `C:\Users\adam\_claude_desktop\Agent_Public_Squares`; verified real Drive Hub `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; recorded local 0.2.14 candidate state; verified Agent Handoff Kit v0.3.20; preserved historical path snapshots in logs / archives / old QC evidence.
<!-- ack:field:state-sections-rewritten-or-confirmed -->
- State sections rewritten or confirmed current: Last Updated; Durable Anchors; Current Baseline; Task Understanding; Active Objective; Completed This Session (S50-S52); Next Priorities; Risks / Blockers; Validation / QC; Workspace Identity; Sync Status; this check; Handoff Sufficiency Check; Next Session Opening Message.
<!-- ack:field:stale-snapshots-left -->
- Stale snapshots left in this handoff: none. Historical detail lives in `dev/SESSION_LOG.md` (S48 + recent) and `dev/SESSION_LOG_archive/*`.
<!-- ack:field:lifecycle-conflicts-resolved -->
- Completed / pending / risk / opening-message lifecycle conflicts resolved or explicitly reclassified: yes. Folder rename, Drive Hub rename, stale UAT decision, Kit v0.3.20 upgrade, QC closeout-rule root-fix, SESSION_LOG N-rule maintenance, S53 root-fix, 0.2.14 candidate preparation, and S54 0.2.14 release are no longer pending. Remaining work is Project Context Index design and real-world adoption monitoring.
<!-- ack:field:opening-message-matches-current-state -->
- Opening message matches current state: yes. `START_NEXT_SESSION_PROMPT.txt` regenerated during this explicit governance sync.
<!-- ack:field:next-ai-can-continue -->
- Next AI can continue from `AGENTS.md`, this handoff, `dev/PROJECT_INDEX.md`, and needed rule packs without searching old log history: yes.

If any answer is no, blocked, or uncertain, fix this handoff before declaring handoff ready.

Lifecycle consistency rule: compare `Completed This Session`, `Validation / QC`, `Next Priorities`, `Risks / Blockers`, and `Next Session Opening Message`. A completed or verified item must not remain as an unresolved next priority, active risk, or startup instruction unless explicitly reclassified as monitor-only, follow-up scope, blocked, or reopened with the missing evidence or trigger condition stated.

<!-- ack:section:handoff-sufficiency-check -->
## Handoff Sufficiency Check

Can the next AI continue from `AGENTS.md`, this handoff, `dev/PROJECT_INDEX.md`, and needed rule packs without searching old log history?

Answer: yes.

Continuity rule: this file carries current state and next action. `SESSION_LOG.md` carries recent evidence only. Archive old detail only when needed; do not create an archive directory by default.

<!-- ack:section:next-session-opening-message -->
## Next Session Opening Message

📋 Next session: agent-managed startup content below

```text
Work in C:\Users\adam\_claude_desktop\Agent_Public_Squares (template SSOT for Agent Public Squares; npm `@adamchanadam/aps`; GitHub repo Adamchanadam/agent-public-squares is public; Pages enabled). The local working-folder rename is complete.

Current state (2026-05-31, after S54 0.2.14 release and local S55 0.2.15 candidate prep): 0.2.14 is PUBLICLY SHIPPED and fully read back. npm latest = `@adamchanadam/aps@0.2.14`; GitHub release `v0.2.14`→`cf367f1` is the GitHub Latest release (`isPrerelease=false`, `isDraft=false`); GitHub Pages entry and joiner pages return 200. Local `package.json` is 0.2.15 for the unpublished Project Context Index / Daily Index candidate. The local project root is verified as `C:\Users\adam\_claude_desktop\Agent_Public_Squares`. The real Drive Hub is verified as `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; old `...\AI_Public_Squares\` Drive Hub path no longer exists. Agent Handoff Kit is v0.3.20 and doctor passes. S53 two-folder self-UAT passed core APS flow, found two CLI UX defects, and S54 published the source fixes plus the follow-up inbox-report UX layer: useful summary extraction, post-close status reporting, and human-readable `inbox` receive reports. Historical logs, archives, old plans, and QC evidence may still show old path snapshots.

0.2.13 shipped the「人性化上手」model end to end: three-question `init` (own side only; counterpart invited later via `peer add`), items as an explicit `--items` sender contract (verbatim into frontmatter; revise preserves / `--clear-items` empties), doctor local-core vs peer split (solo passes), publish actionable no-recipient guidance + reachability gate, the shared-folder default name unified to `Agent_Public_Squares` (underscore `AI_Public_Squares` scrubbed from user-facing defaults; existing folders keep working), a rewritten forwardable starter-pack invite linking to the new joiner page `docs/guides/aps-join-invite.html`, and project-scoped starter-pack filenames. CLI ↔ skill ↔ public docs are aligned (外發前檢 9(d) GREEN).

The Agent Handoff Kit tool is now v0.3.20 after Adam's 2026-05-31 local upgrade (doctor 三向對齊 v0.3.20; latest migration merged `AGENTS.md` and reported no conflicts), so no Kit upgrade is pending.

The next actionable work: finish release-grade QC for local 0.2.15 Project Context Index / Daily Index candidate, then decide whether to commit and later run the external release sequence. 0.2.14 release checks and post-publish readbacks passed: `node --check`, `npm test`, `npm pack --dry-run --json` reports 0.2.14 / 14 files, `npx --yes @adamchanadam/aps@latest --help` shows v0.2.14, npm latest is 0.2.14, GitHub release v0.2.14 is Latest, remote main and tag point to `cf367f1`, Pages entry / joiner pages return 200, and Agent Handoff Kit doctor passes with only the next-closeout SESSION_LOG warning. Local 0.2.15 candidate is not public latest: it has `context` / `context add` / `context html` / `dashboard` / `check-drive` regression coverage, including forbidden fields, newer packet versions, exact source-ref idempotency, Google Docs URL rendering, explicit `ack 已記錄` dashboard wording, no recipient-notification inference, and readable daily brief behavior. Monitoring real-world adoption still needs Jay / new joiner reinstall @latest and exercise three-question install + joiner page plus the new `check Drive` / `inbox` report on a real machine. The stale local `AI_Public_Squares_UAT` sibling is deleted; any future UAT should be rebuilt cleanly from npm `@latest` unless deliberately testing local source. Out of APS scope (never re-add): watch / _notify / scheduling / desktop notif / bot auto-send.

Do not commit, push, tag, release, publish, or change GitHub Pages unless Adam explicitly asks (each external action is its own authorization). `items` uses the explicit contract, never prose-parsing. New installs default the shared folder to Agent_Public_Squares; existing older AI_Public_Squares folders keep working; the underscore name is scrubbed from user-facing defaults only (`AI Public Squares` with a space and the `check Hub` trigger stay recognized). Do not bulk-rewrite old historical evidence solely to rename path snapshots.

Read in order:
1. AGENTS.md
2. dev/SESSION_HANDOFF.md
3. dev/SESSION_LOG.md (latest S53 entry)
4. dev/PROJECT_INDEX.md
5. dev/RULE_PACKS.md
6. dev/qc/triggers.md (🟡 外發前檢 / 🔴 全面檢; 9(d) behaviour-truth)

If this root does not match the expected project root, stop and ask for confirmation.

Voice / writing hard rule: user-facing prose must be contemporary written Traditional Chinese; no piled-up technical terms or clause numbers as sentence subjects, no broken Chinese-English fragments, minimal English. Colloquial Cantonese only inside verbatim user-trigger quotes. HTML must not link local `.md` files; use plain `<span class="path">` for internal spec paths.

Brand / vocab discipline: display name `Agent Public Squares`; trigger `check Drive`; concept 「共用 Drive 資料夾」; shared-folder default `Agent_Public_Squares`. `AI Public Squares` (space) and `check Hub` stay RECOGNIZED legacy aliases. Structural tokens `hubRoot` / `--hub-root` / `_hub/` / `<hub_root>` / PROTOCOL schema / `setupHub` / `doctorHub` must NOT be renamed. Do not reuse the old repo slug `ai-public-squares`. Any skill frontmatter edit re-measures `description` ≤1024 + valid YAML.

External review (read-only second opinion): call codex DIRECTLY, never via `cmd /c` (git bash MSYS mangles `/c`). Long/Chinese prompts: write a UTF-8 prompt file, then `codex exec --skip-git-repo-check -c sandbox_mode="read-only" -c approval_policy="never" "$(cat promptfile)" < /dev/null 2>&1 | tee out.txt`. Method recorded in C:\Users\adam\_claude_desktop\GENERIC_OPERATIONAL_RUNBOOK.md §3i / §5k.

QC vocabulary: if Adam says 跑快檢 / 跑外發前檢 / 跑全面檢 (quick-check / release-check / full-check), load dev/qc/triggers.md and run that tier; if vague, ask 「你指快檢 / 外發前檢 / 全面檢?」.

After reading, summarize current objective, confirmed decisions, pending work, risks, and the next recommended action.
```
