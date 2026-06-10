# Agent Governance Pack

## Scope

Use for governance rules, prompts, agent instructions, handoff systems, startup/closeout behavior, skills, and rule packs.

## Load When

- User asks to change AI behavior, project governance, prompts, handoff, startup, closeout, or tool-use rules.
- A change affects `AGENTS.md`, `dev/*`, rule packs, installer templates, or durable workflow docs.

## Rules

1. Locate the existing source of truth before adding a rule.
2. Prefer merge, replace, or registry rows over append-only rule growth.
3. Keep public runtime rules generic; project-specific incidents belong in logs, runbooks, or project index.
4. Do not let development-only workspace rules enter public runtime.
5. Check complexity budget before adding default-core behavior.
6. Before creating durable workflow, runbook, or instruction files, first verify whether `dev/SESSION_HANDOFF.md`, `dev/PROJECT_INDEX.md`, `dev/DOC_SYNC_REGISTRY.md`, or existing rule packs can carry the need without a new file.

9. Governance bridge is a triggered review, not a default startup scan. Use it when an important file, source-of-truth document, runbook, production guide, workflow, checklist, stock list, or similar durable document may need to be connected to project governance.

## Governance Bridge Workflow

Use this workflow when the user asks for governance bridge / 治理打通 / 把文件接入 Agent Handoff Kit / 接入 Agent Handoff Kit / connect this document to governance, or asks to scan for unbridged governance documents / 掃描未接入 Agent Handoff Kit 的重要文件.

1. Identify the target. If the user named a file, inspect that file and its surrounding directory. If no file is named, run a bounded repo scan for likely durable documents such as source-of-truth files, runbooks, workflows, guides, checklists, stock lists, production guides, and rules.
2. Check the target file itself: it should state its role, scope, update trigger, owner or responsible workflow when known, and what must not be inferred from it.
3. Check `dev/PROJECT_INDEX.md`: the file should be discoverable with its role and "read when" condition. Source-of-truth or reference files should appear in Fact Base, External Sources, Directory Map, Entry Points, or another existing indexed home that fits the project.
4. Check `dev/DOC_SYNC_REGISTRY.md`: future same-type changes should have a matching change type or an explicit reason no durable sync rule is needed.
5. Check related workflows, guides, runbooks, or rule packs: if a process creates or updates the file, that process should say when to update the file or its index row.
6. Check `dev/SESSION_HANDOFF.md`: only current state, next action, unresolved risk, blocker, or a startup-needed fact should be in handoff. Do not copy whole documents or old evidence into handoff.
7. Check `dev/SESSION_LOG.md`: this session's bridge review, validation, and evidence can be logged when it affects future action, but log entries must not become current state.
8. Search for duplicate source-of-truth risk. If another file has the same durable role, recommend merge, reference, or retire options; do not delete, rename, or move files without explicit approval.

For repo-wide scans, report candidates as candidates. Do not fail ordinary docs merely because they are not indexed; only durable files that future agents need to discover, update, or distinguish from drafts should be bridged.

Output format:

- Status: bridged / partially bridged / unbridged / blocked.
- Already bridged: list the governance links that are present.
- Gaps: list missing links and why they matter for the next agent.
- Suggested patches: list exact files and sections to update.
- Manual decisions: list duplicates, naming choices, deletion, renaming, external sync, or ownership questions requiring user confirmation.
- Acceptance: give one concrete check that proves the bridge is complete.

## Checks

- Verify affected files are indexed or intentionally installed templates.
- Check `dev/DOC_SYNC_REGISTRY.md` for governance, closeout/startup, and README sync rows.
- Confirm old overlapping wording was retired or marked legacy.
- Confirm any new durable file is reachable from `dev/PROJECT_INDEX.md` and does not rely only on a one-session handoff note.

## Closeout

Record the changed rule home, reason, complexity impact, retired wording, and follow-up checks.
