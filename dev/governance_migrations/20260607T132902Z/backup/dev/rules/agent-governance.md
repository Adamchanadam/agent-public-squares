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

## Checks

- Verify affected files are indexed or intentionally installed templates.
- Check `dev/DOC_SYNC_REGISTRY.md` for governance, closeout/startup, and README sync rows.
- Confirm old overlapping wording was retired or marked legacy.
- Confirm any new durable file is reachable from `dev/PROJECT_INDEX.md` and does not rely only on a one-session handoff note.

## Closeout

Record the changed rule home, reason, complexity impact, retired wording, and follow-up checks.
