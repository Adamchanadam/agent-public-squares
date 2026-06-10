# 2026-06-10 Check APS Status Surface QC

## Scope

This report covers the local landing check for the new `Check APS` / `check-aps` actionable status surface.

The checked change set adds:

- `npx aps check-aps` as the whole-project APS status command.
- On-demand `_context/dashboard.html` refresh from `check-aps`.
- Narrow natural-language routing for `Check APS` / `APS 狀態`.
- Documentation and QC standards for the status surface.

This report does not claim npm publish, GitHub push, GitHub Pages deploy, or real second-machine Google Drive sync verification.

## Result

Scoped local landing status: passed.

External release status: not triggered.

## Checks

| Check | Status | Evidence |
|---|---|---|
| CLI syntax | passed | `node --check bin\aps.js` |
| Regression suite | passed | `npm test`; includes `check-aps shows full APS status and updates dashboard` |
| QC test syntax | passed | `node --check dev\qc\check_context_index.cjs` |
| Diff whitespace | passed | `git diff --check`; only Windows LF-to-CRLF warnings |
| CLI help surface | passed | `node bin\aps.js --help` shows `npx aps check-aps` |
| Skill frontmatter budget | passed | `skills/aps/SKILL.md` description length: 771 chars |
| Package dry run | passed | `npm pack --dry-run`; package includes `bin/`, `skills/`, `dev/qc/check_context_index.cjs`, examples, resources |
| Handoff Kit doctor | passed | `npx --yes @adamchanadam/agent-handoff-kit@0.3.28 doctor --root .`; status passed |
| HTML `.md` link sweep | passed | `rg -n 'href=["''][^"'']+\.md' docs`; no matches |
| Private repo / stale metric sweep | passed | `rg -n "private repo\|私人 repo\|34 / 34\|34/34" README.md docs`; no matches |
| Unknown command behavior | passed | `node bin\aps.js bogus`; expected exit 1 with help guidance |
| Dry-run install path | passed | `node bin\aps.js init --dry-run`; no file writes |
| Targeted skill dry-runs | passed | `node bin\aps.js init --target claude --dry-run`; `node bin\aps.js init --target codex --dry-run` |
| Bridge Pack output | passed | `node bin\aps.js bridge-pack --role B` |

## UX And Routing Findings

| Item | Status | Evidence |
|---|---|---|
| `Check APS` is whole-project status | passed | CLI, skill, README, public docs, QC rules all describe收件、發件、協作對象、風險 |
| `check Drive` remains receiver-side inbox | passed | CLI alias unchanged; regression `check-drive aliases inbox daily brief` passed |
| Dashboard refresh is on-demand | passed | CLI output and docs say按需更新; no watch / background monitoring introduced |
| No state mutation by status surface | passed | `check-aps` uses dashboard data and writes only `_context/dashboard.html`; regression covers dashboard refresh |
| No notification receipt inference | passed | CLI and docs state status is local synced-data view, not proof the other side received notification |
| Agent Handoff Kit boundary | passed | skill and QC rules keep `收工`, generic `交接包`, and generic `check/status` outside APS auto-trigger |

## Not Triggered

| Item | Reason |
|---|---|
| npm publish | Requires explicit release authorization |
| Git commit | Requires explicit commit authorization |
| Git push / tag / GitHub release | Requires explicit release authorization |
| GitHub Pages verification | No deploy or external publish was requested |
| Real second-machine Drive sync | No cross-machine UAT was requested in this local landing check |

## Blockers

None for local landing.

External release remains blocked until explicit authorization for commit, publish / push, and any required post-publish readback.

## Warnings

- `git diff --check` prints Windows LF-to-CRLF warnings for modified files; no whitespace errors were reported.
- The first attempt to run Handoff Kit doctor with `@latest` was rejected for unpinned external execution risk. The passed run used pinned `@adamchanadam/agent-handoff-kit@0.3.28`.
