# APS 0.2.16 Strict Handoff Intake Full Audit

Date: 2026-06-02
Scope: local `@adamchanadam/aps@0.2.16` candidate after commit `08b5470` (`Add strict APS handoff intake`), plus the audit-time root-fix that makes strict formal handoff require machine-readable `--items`.

This audit covers the new formal handoff intake feature and related daily-use scenarios. It is not a release, npm publish, GitHub release, tag, push, GitHub Pages deploy, or production clearance.

## Result

Scoped result: pass after one audit-time fix.

The audit found one real product gap: before the fix, `publish --strict-handoff` allowed a formal packet whose body had a "請對方做的事" section but no `--items`. That left the packet's machine-readable `items` field empty, which is bad for receiver-side summaries and new-user reliability.

Fix applied during audit:

- `bin/aps.js` now treats `--items` / `--items-file` as mandatory for strict formal handoff.
- Body headings no longer satisfy the strict "requested action" requirement by themselves.
- `dev/qc/check_context_index.cjs` now includes `strict handoff blocks body-only action item`.
- Help and governance wording now say strict mode blocks missing machine-readable `--items`.

## Coverage

| Area | Scenario | Expected | Result |
|---|---|---|---|
| Strict intake | User says only "請 Jay 接手下一步。" with `--strict-handoff` | exit 1, no formal publish | Pass |
| Strict complete packet | Complete handoff body + `--items` | exit 0, packet written, readiness pass | Pass |
| Strict body-only action | Complete body but no `--items` | exit 1 after audit fix | Pass |
| Local path safety | Body contains local path without boundary wording | exit 1 | Pass |
| Local path with boundary | Body contains local path and says it is sender-only | exit 0 | Pass |
| Backward compatibility | Non-strict incomplete body | warning, still writes | Pass |
| Recipient routing | Missing `--to` with available confirmed peer | exit 1 with actionable peer guidance | Pass |
| Receiver UX | Jay `inbox --from adam` and `check-drive --from adam` | daily report shows "對方請你做" and next-step guidance | Pass |
| CLI help | `node bin\aps.js --help` | shows `v0.2.16 pre-release` and strict handoff wording | Pass |
| Regression suite | `npm test` | all strict + context + dashboard + inbox checks pass | Pass |
| Package dry-run | `npm pack --dry-run --json` | 0.2.16, 15 package files | Pass |
| Teaching layers | README / docs / skill / setup dialogue | definition card, gap filling, `--strict-handoff`, `--items` wording present | Pass |
| Product boundary | README / docs / skill | no auto-notify / auto-trigger / group-send promise | Pass |

## Evidence

Local evidence folder:

```text
dev/qc/evidence/2026-06-02-strict-handoff-audit/
```

Commands run:

```text
node --check bin\aps.js
node --check dev\qc\check_context_index.cjs
npm test
node bin\aps.js --help
npm pack --dry-run --json
git diff --check
```

Manual application scenarios used a disposable local Hub under:

```text
dev/qc/evidence/2026-06-02-strict-handoff-audit/node_20260602T082255Z/hub
```

Important observed outputs:

- Strict incomplete handoff exited 1 with `交接資料未齊`.
- Strict complete handoff exited 0 with `交接完整性檢查: 通過`.
- Strict body-only action item now exits 1 with missing `請對方做的事（--items）`.
- Local path without sender-only boundary exits 1.
- Local path with sender-only boundary exits 0.
- Non-strict incomplete publish exits 0 but prints the incompleteness warning.
- Missing recipient exits 1 and lists the available confirmed peer.
- Receiver `inbox` and `check-drive` show `對方請你做` and next-step guidance.

## Boundary

Public npm latest remains `@adamchanadam/aps@0.2.15`.

Local source is `0.2.16` candidate only. It has not been pushed, tagged, released, published, or deployed to GitHub Pages.

This audit does not prove real remote-machine Google Drive sync latency. It uses a local disposable Hub fixture. The previously published 0.2.15 two-agent audit remains the latest public-version fresh-workspace audit.

The Node `child_process.spawnSync` path was not usable in this Codex sandbox (`EPERM`), so manual scenario evidence used direct tool-run CLI commands instead of a spawned child-process harness. The repo regression suite still loads `bin/aps.js` in-process and passes.
