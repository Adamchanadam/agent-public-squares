# Session Handoff

Last Updated: 2026-05-30 (S50 governance path sync — Adam manually renamed the local project folder, and the Drive Hub folder is also now renamed. Verified current git root is `C:\Users\adam\_claude_desktop\Agent_Public_Squares`; verified current Drive Hub exists at `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; verified old Drive Hub path `...\AI_Public_Squares\` no longer exists. Adam later manually deleted the stale local UAT sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified it no longer exists. Updated active governance paths and next-session opening message. Historical logs, archives, and old QC evidence retain their original path snapshots.)

<!-- ack:section:durable-anchors -->
## Durable Anchors

Stable facts that should survive across sessions. Update only when they change, but verify they still match reality at closeout.

1. Project root and boundary: `C:\Users\adam\_claude_desktop\Agent_Public_Squares` is the design / implementation / documentation SSOT workspace for Agent Public Squares (APS). It is not a product runtime workspace. The local working-folder rename is complete and verified in S50. 0.2.13 (PUBLISHED) changed the DEFAULT shared-folder name for NEW installs to `Agent_Public_Squares` and scrubbed the underscore `AI_Public_Squares` from user-facing defaults / examples; existing older `AI_Public_Squares` folders + configs remain compatible; the `AI Public Squares` product alias (with a space) is retained.
2. Product identity: Agent Public Squares is a cross-machine collaboration protocol and npm package (`@adamchanadam/aps`, Apache-2.0) for AI agents exchanging structured packets through a locally synced shared folder. `AI Public Squares` is a recognized LEGACY alias; `APS` is the abbreviation; the npm package name stays `@adamchanadam/aps`. **npm latest is `0.2.13` (early-testing public release, published 2026-05-30 S48).**
3. Governance model: Agent Handoff Kit doctor is the governance health check for this root. External skill flows, demo workspaces, and other tool outputs are subordinate evidence; this root's handoff / log / index / registry are authoritative for this workspace.
4. Runtime storage boundary: the shared Drive folder at `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\` owns runtime `_hub/`, templates, lane data, and ack files. This repo owns npm package source, public docs, plans, and QC truth. Structural tokens `hubRoot` / `--hub-root` / `_hub/` / `<hub_root>` / PROTOCOL schema / `setupHub` / `doctorHub` must NOT be renamed; only user-facing prose says 「共用 Drive 資料夾」.
5. Release boundary: GitHub repo `Adamchanadam/agent-public-squares` is public; Pages serves from `main` root. **GitHub release `v0.2.13` (tag `v0.2.13`→`6059f45`) is the Latest release**; older `v0.2.12`→`c9e8057` and `v0.2.8`→`136042c` retained as pre-releases. **npm `@adamchanadam/aps@latest` = `0.2.13`.** The receive trigger is `check Drive` (legacy `check Hub` still recognized as a hidden alias). Do not reuse the old repo name `ai-public-squares` (breaks GitHub redirects). Product remains early testing, not production-ready.
6. Product scope decision (locked 2026-05-29 S45): the automation / background-notification / scheduling layer — `aps watch`, file-based `_notify`, OS / AI-platform scheduling, desktop notifications, Telegram-bot auto-send / auto-pushing into a running session — is **OUT OF APS SCOPE**, NOT deferred. APS is a manual, human-in-loop, synced-folder structured-handoff protocol: it produces a copy-ready human notification and the receiver runs `check Drive` by hand. Deferred (still in-scope future): true multi-agent platform, multi-recipient packet, group alias, Project Context Index, Dropbox / OneDrive formal support.
7. QC discipline (locked 2026-05-29 S46): `bin/aps.js` is the user-visible-behaviour truth source; `skills/aps/**` and public docs are teaching layers that must follow it. Structure-level checks (`description` ≤1024 / valid YAML / trigger phrases / section + link integrity) passing does NOT mean the behaviour / product model is aligned — the two are not interchangeable. When CLI behaviour changes (question count, flags, generated artifacts, command contracts, exit codes), the teaching layers must be re-aligned, or the divergence recorded as a blocking gate in Risks + release gate. SSOT for this rule: `dev/qc/triggers.md` 外發前檢 9(d); memory `feedback-structure-vs-behaviour-drift`.

<!-- ack:section:closeout-reconciled-state -->
## Closeout-Reconciled State

This is the current-state area. At every full closeout, rewrite or explicitly confirm every section below. Do not append a new state snapshot under an old one.

<!-- ack:section:current-baseline -->
## Current Baseline

1. Workspace: `C:\Users\adam\_claude_desktop\Agent_Public_Squares`, branch `main`, remote `origin = https://github.com/Adamchanadam/agent-public-squares.git`. S50 verified git root at this path and current branch `main`. No push / tag / release / publish action was performed in S50.
2. Public release: **npm latest `@adamchanadam/aps@0.2.13`; GitHub release `v0.2.13` is Latest; GitHub Pages live with the 0.2.13 content.** `package.json` is `0.2.13`. All four public surfaces read back and agree (see Validation / QC).
3. **0.2.13「人性化上手」FULLY SHIPPED.** 第一段 (CLI) + 第二段 (skill) + 第三段+ (public surfaces + naming unification + starter-pack rewrite + joiner page) + B4/B5 + 第四段 UAT + **第五段 gated release** all DONE. Nothing about 0.2.13 remains.
4. **Naming unification (0.2.13, shipped):** new installs default the shared folder to `Agent_Public_Squares`; the underscore `AI_Public_Squares` is scrubbed from every user-facing default / example. The `AI Public Squares` product alias (space) + `check Hub` trigger stay recognized. Existing older `AI_Public_Squares` folders / configs keep working. The maintainer's real Drive Hub is now verified at `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; historical plan / QC files may still contain earlier path snapshots and should not be bulk-rewritten as current state.
5. **Joiner page** `docs/guides/aps-join-invite.html` is live on Pages; `starterPackContent()` generates a forwardable invite linking to it (with the three install commands). `peer add` writes a project-scoped starter pack (`starter-pack-<project>-<peer>.md`).
6. Governance state: brand / vocab discipline holds. QC 9(d) behaviour-truth gate verified GREEN at the release-check. Agent Handoff Kit doctor `status: passed` (45 checks). **The Kit was upgraded `0.3.14 → 0.3.17` this session** (auto-doctor 三向對齊; AGENTS.md core skipped clean; only the handoff lifecycle placeholder + PROJECT_INDEX version record changed).

<!-- ack:section:task-understanding-summary -->
## Task Understanding Summary

<!-- ack:field:user-intent -->
- User intent: build APS into a usable public pre-release product for non-technical users, with reliable natural-language AI-assisted cross-machine handoff. Adam wants strong product / UX judgment, fact-checkable delivery, and root-cause governance — not patch-stacking. Each external action (publish / push / tag / release) is individually authorized.
<!-- ack:field:task-essence -->
- Task essence: **0.2.13「人性化上手」is publicly shipped.** The staged build is complete and verified across npm / repo / Pages / GitHub release. S50 resolved the deferred local-folder + real Drive Hub rename in governance state after Adam manually renamed the folders, then verified Adam's manual deletion of the stale `AI_Public_Squares_UAT` sibling. Remaining active concerns are Project Context Index design and monitoring real-world 0.2.13 adoption.
<!-- ack:field:success-criteria -->
- Current success criteria (0.2.13): MET. npm latest is 0.2.13; the three-question / items / invite model ships across CLI + skill + public docs (9(d) GREEN); the shared-folder default is `Agent_Public_Squares` for new installs without breaking existing folders; automation stays out of scope; items is an explicit contract; every external action was individually authorized and read back.

<!-- ack:section:active-objective -->
## Active Objective

**0.2.13「人性化上手」is DONE and publicly shipped (S48).** No 0.2.13 work remains.

The **Agent Handoff Kit tool upgrade `0.3.14 → 0.3.17` is also DONE this session** (dry-run previewed → applied → auto-doctor `status: passed`, version 三向對齊 v0.3.17; AGENTS.md core skipped clean; only `dev/SESSION_HANDOFF.md` lifecycle placeholder + `dev/PROJECT_INDEX.md` version record changed; backup `dev/governance_migrations/20260530T054058Z/`). No upgrade work remains.

Deferred (in-scope future, NOT this session): Project Context Index design; true multi-agent platform; multi-recipient packet; group alias; Dropbox / OneDrive formal support.

Out of APS scope (NOT deferred): `aps watch`, file-based `_notify`, OS / AI-platform scheduling, desktop notifications, Telegram-bot auto-send.

<!-- ack:section:completed-this-session -->
## Completed This Session

Record only work actually completed in the current session (S50). Earlier S49/S48 work is in `dev/SESSION_LOG.md` and the archive.

1. **Verified local project rename:** current cwd and git root are `C:\Users\adam\_claude_desktop\Agent_Public_Squares`; branch is `main`; `AGETNS.md` does not exist, so `AGENTS.md` remains the active governance entry.
2. **Verified real Drive Hub rename:** `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\` exists and contains `_hub/`, protocol files, starter packs, and project lanes; old `...\AI_Public_Squares\` path does not exist.
3. **Updated active governance paths:** handoff, project index, doc sync registry, session log, and next-session prompt now point to the verified local root / Drive Hub path. Historical logs, archives, old plans, and QC evidence were intentionally not bulk-rewritten.
4. **Resolved stale UAT sibling:** Adam manually deleted `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified `Test-Path` returns `False`. Before deletion, read-only inspection showed it was not a git repo and still pointed at the old local / Drive paths, so rebuilding from npm latest is the clean path if a new UAT is needed. No same-named UAT Hub was present under `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\`.
5. **Startup integration probe:** `context7` and `chrome-devtools` were callable in this Codex session; `PROJECT_INDEX.md` Last Verified cells updated to 2026-05-30.

<!-- ack:section:next-priorities -->
## Next Priorities

1. **Project Context Index design** — deferred (in-scope future). Direction recorded in roadmap §4.5 (S48): markdown source (`_context/*.md`, AI read/write) → CLI on-demand read-only HTML overview; the HTML stays a derived, timestamped, packets-are-truth, no-kanban snapshot in the `docs/` visual style. Reference mock (fake data, gitignored): `dev/qc/evidence/2026-05-30-context-index-mock/`. Implementation still deferred until core validation.
2. **Monitor 0.2.13 adoption** — Jay (and any new joiner) reinstall `@latest` (now 0.2.13) and exercise the three-question install + joiner page on a real machine; capture any defect.
3. **Path hygiene on future edits** — when touching older plan docs, distinguish current-state paths from historical evidence before replacing `AI_Public_Squares`.
4. **Fresh UAT only if needed** — the stale local `AI_Public_Squares_UAT` sibling is gone. Any future UAT should be created as a clean workspace using npm `@latest` and the verified `Agent_Public_Squares` Drive Hub path.

<!-- ack:section:next-task-required-reading -->
## Next Task Required Reading

Before acting on the next task, read or mark blocked:

| Source | Why required | Status |
|---|---|---|
| `AGENTS.md` | Active governance contract | confirmed |
| `dev/SESSION_HANDOFF.md` | Current state | confirmed |
| `dev/SESSION_LOG.md` latest entry (S48) | Current evidence | confirmed |
| `dev/PROJECT_INDEX.md` | Workspace map + source-of-truth pointers | confirmed |
| `dev/RULE_PACKS.md` | Task routing | confirmed |

<!-- ack:section:risks-blockers -->
## Risks / Blockers

1. **0.2.13 is published — no release work pending.** All four public surfaces (npm / repo main / Pages / GitHub release) read back and agree. Nothing about 0.2.13 is unpushed or unverified.
2. **Kit version drift RESOLVED**: the Agent Handoff Kit was upgraded `0.3.14 → 0.3.17` this session; doctor reports version 三向對齊 (tool / project record / npm latest all v0.3.17). No drift remains.
3. **`items` must use the explicit contract, never prose-parsing** (codex-validated, UAT + release-check confirmed): sender declares `--items`; CLI records verbatim into frontmatter; reader reads frontmatter only; `revise` preserves prior items unless `--items` / `--clear-items`.
4. **Naming / rename discipline.** New installs default to `Agent_Public_Squares`; existing older `AI_Public_Squares` folders + configs keep working — do NOT force-migrate users. Underscore `AI_Public_Squares` scrubbed from user-facing defaults only; `AI Public Squares` (space) product alias + `check Hub` trigger stay recognized. Local dev-folder + maintainer Drive Hub rename are complete as of S50; historical plans / QC evidence may retain old path snapshots.
5. **Automation stays out of scope**: never re-add `watch` / `_notify` / OS+platform scheduling / desktop notifications / Telegram-bot auto-send.
6. **Brand / structural discipline**: never rename `hubRoot` / `--hub-root` / `_hub/` / PROTOCOL schema / `setupHub` / `doctorHub`; never reuse `ai-public-squares`. Any skill frontmatter edit re-measures `description` ≤1024 + valid YAML (currently 729).
7. **codex / claude-p invocation**: call directly (NOT `cmd /c`); long / Chinese prompts via a UTF-8 prompt file + `"$(cat file)" < /dev/null`. Runbook `GENERIC_OPERATIONAL_RUNBOOK.md` §3i / §5k.
8. **Per-project Drive verification still required** for each real project (path, offline availability, sync).
9. **Real Hub / scratch**: the real Drive hub keeps earlier UAT slugs (Adam confirmed disposable UAT). The S48 release-check round-trip ran in OS-temp sandboxes with redirected HOME (real Hub + real `~/.claude` untouched); left for OS temp cleanup.
10. **QC discipline in force**: structure-pass ≠ behaviour-aligned; `bin/aps.js` is the behaviour truth; teaching layers follow; staged CLI-ahead-of-teaching must be tracked as a blocking item. SSOT `dev/qc/triggers.md` 外發前檢 9(d).

<!-- ack:section:validation-qc -->
## Validation / QC

- **0.2.13 release-check GREEN** (report `dev/qc/2026-05-30-aps-full-audit-0.2.13-release-check.md`): 外發前檢 (快檢 4 + 9 項) + 全面檢 可跑部分全部通過. Highlights — `node --check` clean; `npm pack --dry-run` version 0.2.13 / 14 files; skill `description` 729 ≤1024 + 0 colon-space (valid YAML); bracket-path `init --dry-run` exit 0 (0.2.10 regression holds); 9(d) teaching-layer old-model markers 0; HTML `<section>` balance (index 10/10, guides hub 3/3, walkthrough 16/16, join 7/7, maintainers 5/5) + 0 local .md links; browser render index/walkthrough 0 console error (join page only favicon-404, cosmetic); fresh isolated 0.2.13 round-trip all GREEN (incl. items verbatim, revise preserve = 2 / --clear-items = 0, consume ack written).
- **Post-publish read-backs (all agree):** `npm view` version + dist-tags.latest 0.2.13, 14 files; `npx --yes @adamchanadam/aps@latest --help` shows v0.2.13; GitHub Pages join page 200 + index 「三條問題」/ 0 「五個值」; `origin/main` == HEAD; `gh release view v0.2.13` reports `isPrerelease=false`, `isDraft=false`, target `6059f45`, Latest release; `git ls-remote --tags origin v0.2.13` → 6059f45.
- **Agent Handoff Kit doctor**: `status: passed`, 45 checks — both at the release-check (Kit v0.3.14) and after the **Kit upgrade to v0.3.17** (version now 三向對齊; prompt mirror + credential sweep ok).
- **S50 governance path sync validation**: local path checks confirmed current git root `C:\Users\adam\_claude_desktop\Agent_Public_Squares`, current Drive Hub `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`, old Drive Hub absence, and initially untouched local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`. Adam later manually deleted that stale UAT sibling; this session verified it no longer exists. Adam explicitly asked to run `npx --yes @adamchanadam/agent-handoff-kit@latest upgrade`; external execution succeeded and reported v0.3.17 already current (create 0 / merge 0 / skip 20 / conflict 0). External `doctor` then passed: 45 checks, `status: passed`, prompt mirror ok, credential sweep ok. Only warning: SESSION_LOG entry count is 11, so the N-rule must advance at next full closeout.
- **S50 scoped audit**: `dev/qc/2026-05-30-aps-full-audit-s50-governance-path-sync.md` created. Result: scoped pass with one governance warning (SESSION_LOG N-rule). This is a path-sync / governance audit, not a complete release-grade full audit and not release / publish clearance; cross-workspace / protocol-runtime items were not run.
- **QC root-fix from S50 audit lesson**: Adam identified the root problem that QC reports must not silently hide failed / blocked / not-run items behind a passing summary. `dev/qc/triggers.md` now has a shared QC result closeout rule: every item must have a clear status, summaries must not overstate pass scope, failed / blocked items require root-fix or explicit blocker handling, and reports must end with unresolved-item sections.
- `START_NEXT_SESSION_PROMPT.txt` regenerated at this closeout.

<!-- ack:section:workspace-identity -->
## Workspace Identity

Expected project root: `C:\Users\adam\_claude_desktop\Agent_Public_Squares`
Git root: same
Branch: `main`
Latest pushed state: the 0.2.13 release commit is `6059f45` (pushed; `ff044e9..6059f45`). This S49 public-surface cleanup commit advances `main` again and is pushed after README / governance cleanup. **npm latest `0.2.13`; tag `v0.2.13`→`6059f45`; GitHub release `v0.2.13` is Latest; Pages live with 0.2.13.** `package.json` is `0.2.13`.
Remote: `origin = https://github.com/Adamchanadam/agent-public-squares.git` (public, Apache-2.0, HTTPS via Windows Credential Manager). GitHub auto-redirects old web+git URLs but NOT Pages — do not reuse the old slug.
Worktree status: governance path sync in progress after Adam's manual folder rename; `dev/PROJECT_INDEX.md` already had an unstaged `context7` Last Verified update before S50 edits. Agent Handoff Kit recorded version `0.3.17`. Outside the repo (not git-tracked): memory files; `GENERIC_OPERATIONAL_RUNBOOK.md`; OS-temp release-check sandboxes (auto-cleaned). Adam manually deleted the stale local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified it no longer exists.
Execution environment note: Claude Code on Windows, git-bash Bash tool + PowerShell tool. Isolated-hub tests use temp Hub + redirected HOME (real Hub + real `~/.claude` skills untouched); the redirect (HOME / USERPROFILE) and REPO/UAT paths must be re-exported in every Bash call. codex via direct call (never `cmd /c`).

<!-- ack:section:sync-status -->
## Sync Status

Use statuses from `dev/DOC_SYNC_REGISTRY.md`: `confirmed`, `unverified`, `pending`, `blocked`, `not_applicable`.

- `bin/aps.js` + `skills/aps/**` + README + `docs/**`: `confirmed` — 0.2.13 shipped behaviour + teaching, published + pushed + live on Pages; 9(d) GREEN.
- `package.json`: `confirmed` — 0.2.13, published as npm latest.
- npm registry: `confirmed` — latest 0.2.13, 14 files (read back).
- GitHub Pages: `confirmed` — live with 0.2.13 content (read back).
- GitHub release / tag: `confirmed` — `v0.2.13`→`6059f45`, `isPrerelease=false`, GitHub Latest release (read back).
- `dev/release-notes/v0.2.13.md` (changelog) + `dev/release-notes/v0.2.13.github.md` (release body): `confirmed` — committed at this closeout.
- `dev/qc/2026-05-30-aps-full-audit-0.2.13-release-check.md`: `confirmed` — committed in the release commit `6059f45`.
- `dev/qc/2026-05-30-aps-full-audit-s50-governance-path-sync.md`: `confirmed` — scoped audit for S50 local folder rename + formal Drive Hub rename governance sync; scoped pass with one closeout-maintenance warning; not a complete release-grade full audit.
- `dev/qc/triggers.md`: `confirmed` — S50 added the shared QC result closeout rule so failed / blocked / not-run items cannot be silently hidden after full audit or similar QC.
- `dev/PROJECT_INDEX.md`: `confirmed` — workspace identity / release rows updated; S50 path sync updates current root and Drive Hub path.
- Agent Handoff Kit upgrade (0.3.14→0.3.17): `confirmed` — applied this session; doctor 三向對齊 v0.3.17; backup `dev/governance_migrations/20260530T054058Z/`.
- Memories + runbook: `confirmed` (outside repo / not committed).
- SESSION_LOG archive: `confirmed` — S49 prepended; N-rule moved S39 short-index entry to batch 010; INDEX updated.

<!-- ack:section:state-reconciliation-check -->
## State Reconciliation Check

At full closeout, complete this check after updating the state sections above.

- Reconciled at: 2026-05-30 S50 governance path sync, covering: verified local project root `C:\Users\adam\_claude_desktop\Agent_Public_Squares`; verified real Drive Hub `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; verified Adam's manual deletion of stale local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; removed stale rename-deferred state from active handoff; preserved historical path snapshots in logs / archives / old QC evidence.
<!-- ack:field:state-sections-rewritten-or-confirmed -->
- State sections rewritten or confirmed current: Last Updated; Durable Anchors (#1/#4 path facts updated; #2/#3/#5/#6/#7 confirmed); Current Baseline; Task Understanding; Active Objective; Completed This Session (S50 only); Next Priorities; Risks / Blockers; Workspace Identity; Sync Status; this check; Handoff Sufficiency Check; Next Session Opening Message.
<!-- ack:field:stale-snapshots-left -->
- Stale snapshots left in this handoff: none. Historical detail lives in `dev/SESSION_LOG.md` (S48 + recent) and `dev/SESSION_LOG_archive/*`.
<!-- ack:field:lifecycle-conflicts-resolved -->
- Completed / pending / risk / opening-message lifecycle conflicts resolved or explicitly reclassified: yes. The local dev-folder + real Drive Hub rename is no longer pending after S50 verification; the stale UAT sibling is deleted and no longer a decision item. Remaining open work is Project Context Index design and 0.2.13 adoption monitoring.
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

📋 Next session: copy and paste the whole block below

```text
Work in C:\Users\adam\_claude_desktop\Agent_Public_Squares (template SSOT for Agent Public Squares; npm `@adamchanadam/aps`; GitHub repo Adamchanadam/agent-public-squares is public; Pages enabled). The local working-folder rename is complete.

Current state (2026-05-30, after S50 governance path sync): 0.2.13「人性化上手」is PUBLICLY SHIPPED and fully read back. npm latest = `@adamchanadam/aps@0.2.13`; `package.json` = 0.2.13; GitHub release `v0.2.13`→`6059f45` is the GitHub Latest release (`isPrerelease=false`); GitHub Pages live with the 0.2.13 content. The local project root is now verified as `C:\Users\adam\_claude_desktop\Agent_Public_Squares`. The real Drive Hub is now verified as `G:\我的雲端硬碟\Adam 工作目錄\AI_Projects\Agent_Public_Squares\`; old `...\AI_Public_Squares\` Drive Hub path no longer exists. Adam manually deleted stale local sibling `C:\Users\adam\_claude_desktop\AI_Public_Squares_UAT`; this session verified it no longer exists. Historical logs, archives, old plans, and QC evidence may still show old path snapshots.

0.2.13 shipped the「人性化上手」model end to end: three-question `init` (own side only; counterpart invited later via `peer add`), items as an explicit `--items` sender contract (verbatim into frontmatter; revise preserves / `--clear-items` empties), doctor local-core vs peer split (solo passes), publish actionable no-recipient guidance + reachability gate, the shared-folder default name unified to `Agent_Public_Squares` (underscore `AI_Public_Squares` scrubbed from user-facing defaults; existing folders keep working), a rewritten forwardable starter-pack invite linking to the new joiner page `docs/guides/aps-join-invite.html`, and project-scoped starter-pack filenames. CLI ↔ skill ↔ public docs are aligned (外發前檢 9(d) GREEN).

The Agent Handoff Kit tool was upgraded `0.3.14 → 0.3.17` in S48 (doctor 三向對齊 v0.3.17; AGENTS.md core skipped clean), so no Kit upgrade is pending.

The next actionable work is all deferred / monitoring: Project Context Index design; monitoring real-world 0.2.13 adoption (Jay / new joiner reinstall @latest and exercise three-question install + joiner page). The stale local `AI_Public_Squares_UAT` sibling is deleted; any future UAT should be rebuilt cleanly from npm `@latest`. Out of APS scope (never re-add): watch / _notify / scheduling / desktop notif / bot auto-send.

Do not commit, push, tag, release, publish, or change GitHub Pages unless Adam explicitly asks (each external action is its own authorization). `items` uses the explicit contract, never prose-parsing. New installs default the shared folder to Agent_Public_Squares; existing older AI_Public_Squares folders keep working; the underscore name is scrubbed from user-facing defaults only (`AI Public Squares` with a space and the `check Hub` trigger stay recognized). Do not bulk-rewrite old historical evidence solely to rename path snapshots.

Read in order:
1. AGENTS.md
2. dev/SESSION_HANDOFF.md
3. dev/SESSION_LOG.md (latest S50 entry)
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
