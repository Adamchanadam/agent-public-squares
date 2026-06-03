<!-- BEGIN Agent Handoff Kit managed core -->
# Agent Handoff Kit Core Runtime

This is the lightweight core. It is the always-read contract for AI sessions.

## 1. Startup Reads

After this core is loaded, read in order:

1. `dev/SESSION_HANDOFF.md`
2. the latest entry in `dev/SESSION_LOG.md`
3. `dev/PROJECT_INDEX.md`
4. `dev/RULE_PACKS.md`

Then classify the user's task and read only the required rule pack(s). State which pack(s) you loaded and why, using plain language so the user understands the working mode without needing to know pack names.

Before classifying the task, detect first-time-user signals (R-029): if the user's first message in this session is short, vague, or contains onboarding signal keywords (e.g. "新手", "I'm new", "教我用", "help me start", "first time", "我剛安裝", "點開始", "show me how", "agent handoff kit 可幫我做甚麼", "我想做 [type] project", "點用", "能力"), or if the session is a fresh installation (HANDOFF Active Objective empty + Session count 1), load `dev/rules/onboarding.md` proactively BEFORE doing the regular task loop. The onboarding pack surfaces the AI's role and offers Scenario A-F selection (instead of immediately diving into task execution). Onboarding is a transient pack: after the user completes their first-task walk-through, unload it and load the regular scenario pack (coding / research / writing / knowledge / etc) for ongoing work.

If the user did not paste the previous opening message but the current project root is clear, read `AGENTS.md` first as fallback entry, then use this read order. If the root is unclear or mismatched, stop and ask for the intended project root before reading or editing project state.

Detect clear startup / handoff-start intent in natural language, such as "開工", "Start Agent Handoff", "開始接力", or "continue handoff". When that intent is clear and the current project root is clear, open `START_NEXT_SESSION_PROMPT.txt` and follow the opening message inside. If `START_NEXT_SESSION_PROMPT.txt` is missing or seems stale, read `dev/SESSION_HANDOFF.md` instead. Before changing anything, tell the user the current state and your recommended next step.

Ambiguous startup phrases need one concise confirmation question before treating them as Agent Handoff Kit startup. In particular, if the user says "<something> 開工", "<something> start", or similar wording that may refer to a real-world shift, event, project phase, or another context, ask whether they mean to start Agent Handoff Kit continuity for this project.

If a required file is missing, create the smallest useful version only after confirming the target project root.

Before acting on a non-trivial task, identify required local source-of-truth files and external sources from the handoff, project index, user request, and sync registry. Read them or mark them blocked. Reachable is not the same as ingested. Do not treat unread sources as absent.

After reading `dev/PROJECT_INDEX.md`, if `## Installed Integrations` is non-empty, run startup availability probe (R-030 Integration governance discipline; see `dev/rules/integrations.md`):

- For each declared Integration under Connectors / MCPs subsection, attempt minimal capability probe (e.g. for Notion: try `mcp__notion__search` with project DB name; for Drive: try `mcp__google-drive__list` with project folder).
- If probe succeeds: update the corresponding `Last Verified` cell to today's date; proceed normally.
- If probe fails (current AI tool lacks the Connector / auth expired / network issue): print warning in the startup card (`⚠️ Boundary` line) noting which Integration is declared-but-unavailable + that this session will fallback to paste flow when that external surface is touched. Do not attempt to auto-fix auth or credential issues; surface to the user to handle via the AI tool's own settings interface.
- Credential separation: AI must never request, log, or persist credential values (API keys / OAuth tokens / app secrets / refresh tokens). Credentials live in OS-level secure storage or AI-tool-specific config, never in `dev/*` files. Recognize common credential prefixes (`sk-`, `sk-ant-`, `ntn_`, `secret_`, `ya29.`, `1//`, `xoxp-`, `xoxb-`, `ghp_`, `gho_`, `ghs_`, `github_pat_`, `sl.`, `AKIA`, `AIza`) and redact + warn the user to rotate the token if accidentally pasted.

After startup reads are complete, show one short startup card. If onboarding is loaded, combine this card and the onboarding choice list into one first response. Do not print any standalone startup card before the onboarding rule has been read. Do not print a partial card. Do not print the cat banner twice. If you started drafting a card and then discovered onboarding applies, discard the draft and output only the final combined response.

Display version rule: after reading `dev/PROJECT_INDEX.md`, take the card version from the `## Stack` row `Agent Handoff Kit template version`. Print it as `vX.Y.Z`. If that row is missing, unreadable, or not a version, print `version unverified`. Never print the literal placeholder `v<version>` in user-facing startup or closeout output.

```text
   /\_/\   Agent Handoff Kit v<version>
  ( o.o )  continuity ready
   > ^ <

🔎 交接狀態：<loaded / new install / resumed>
📌 目前目標：<current objective>
⚠️ 注意事項：<important boundary or none>
🚀 下一步：<next action>
```

Keep the card short. Use plain Traditional Chinese labels in user-facing output. Use the full product name, not an abbreviation.

## 2. Work Loop

Use this loop for every task:

1. PLAN: restate the user's intent, scope, risk, and acceptance criteria.
2. READ: inspect relevant files from `PROJECT_INDEX.md` and search for related definitions before editing.
3. CHANGE: make focused changes only.
4. QC: run available checks or state why they cannot run.
5. PERSIST: classify durable facts before writing them. Current state belongs in handoff, chronological evidence in log, file / command / reference maps in project index, sync obligations in doc sync registry, and reusable operating procedure in the relevant rule pack or registered reference. Do not persist one-time delivery instructions, historical validation evidence, old hashes, old version facts, or incident notes as current state, next priorities, durable anchors, or startup instructions. Do not store reusable procedure knowledge only in handoff or log.

External skill flows, subagents, task plans, or another tool's "finish" step do not replace this loop. If you use any of them, the PLAN must include a final Agent Handoff Kit persistence step for the active project root, and completion cannot be claimed until that root's `dev/SESSION_HANDOFF.md`, `dev/SESSION_LOG.md`, `dev/PROJECT_INDEX.md`, and `dev/DOC_SYNC_REGISTRY.md` have been inspected and updated or explicitly marked not applicable.

For high-risk work, pause after PLAN. High-risk means destructive operations, ambiguous target, external systems, release/publish, or broad multi-file change.

## 2.1 Upgrade Done Contract

`agent-handoff-kit upgrade` is considered complete only when all of the following hold. The CLI enforces this contract; do not declare upgrade success without it.

1. `AGENTS.md` health state is `clean`: exactly one `# Agent Handoff Kit Core Runtime` heading, exactly one paired managed-core marker block, and no unmarked stale core ranges. Sandwich states (managed marker plus an unmarked stale core) are not clean; the installer must replace the stale ranges, not skip.
2. The CLI runs `doctor` automatically against the upgraded root after writes complete. `doctor` must report `status: passed` across required files, anchors, schema checks, handoff lifecycle checks, and credential separation checks. A `START_NEXT_SESSION_PROMPT.txt` convenience-copy warning does not block upgrade health; that file is regenerated at full closeout.
3. The migration report records every action taken, with backup paths for merged files.

If any check fails, the upgrade did not finish; resolve the failure (or hand the failure output to the user) before reporting completion. This contract is the single source of truth for upgrade success; downstream QA scripts and release-grade QA derive their assertions from it.

## 3. Safety Boundaries

Do not delete, reset, overwrite, bulk-move, or publish without explicit user approval.

Do not guess commands, APIs, SDK behavior, deployment steps, or file ownership when project docs or official docs are needed. Mark unverified facts as unverified.

Do not modify unrelated files. If unexpected user changes appear, work with them or ask before touching them.

Do not claim completion without evidence from checks, inspection, or a clear explanation of what could not be verified.

## 4. Closeout And Handoff

Detect end-of-session or handoff intent in natural language, such as "收工", "Wrap up Agent Handoff", "closeout", "wrap up", or "handoff". If intent is ambiguous, ask one concise confirmation question.

Ambiguous closeout phrases need one concise confirmation question before full closeout. In particular, if the user says "<something> 收工", "<something> close", or similar wording that may refer to a real-world shift, event, project phase, or another context, ask whether they mean to wrap up Agent Handoff Kit and write the project handoff.

At full closeout:

1. Reconcile `dev/SESSION_HANDOFF.md`. Do not append a new state snapshot under old state. Verify `Durable Anchors`, then rewrite or explicitly confirm every section under `Closeout-Reconciled State`.
2. Add a concise entry to `dev/SESSION_LOG.md` with work actually completed this session and the exact next-session opening message.
3. Update `dev/PROJECT_INDEX.md` if files, stack, commands, entry points, workspace identity, or durable document map changed.
4. Check `dev/DOC_SYNC_REGISTRY.md` and record required sync status.
5. Record unresolved drift risk, active worktree, parallel workspace, uncommitted changes, or blocked verification.
6. Complete the `State Reconciliation Check`: it must state when reconciliation happened, which state sections were rewritten or confirmed current, whether stale snapshots remain, whether the `Persistence routing checked` field is complete, whether completed / pending / risk / opening-message lifecycle conflicts were resolved, and whether the opening message matches current state. In the same step, run the handoff lifecycle consistency check before declaring handoff ready: compare `Completed This Session`, `Validation / QC`, `Next Priorities`, `Risks / Blockers`, and `Next Session Opening Message`. A completed or verified item must not remain as an unresolved next priority, active risk, or startup instruction unless it is explicitly reclassified as monitor-only, follow-up scope, blocked, or reopened with the missing evidence or trigger condition stated.
7. Run the handoff sufficiency check: the next AI should be able to continue from `AGENTS.md`, `dev/SESSION_HANDOFF.md`, `dev/PROJECT_INDEX.md`, and needed rule packs without searching old log history.
8. If either check fails, fix `dev/SESSION_HANDOFF.md` first; do not push current-state responsibility into `dev/SESSION_LOG.md`.
9. Regenerate `START_NEXT_SESSION_PROMPT.txt` from the fenced opening message in `dev/SESSION_HANDOFF.md`, then read it back or run the project's prompt mirror check before declaring closeout ready. `dev/SESSION_HANDOFF.md` is authoritative; `START_NEXT_SESSION_PROMPT.txt` is the stateful startup prompt that the next local agent must read. During an active session, do not regenerate it just to silence `doctor`; normal `doctor` may warn about drift, but closeout must make the copy match before handoff is declared ready.
10. Show a short closeout card, then provide the next-session startup entry in a fenced `text` code block. Primary entry, when the next local AI agent is already opened at this project root: `Start Agent Handoff` / `開工`. Fallback entry, when the next AI agent is not yet pointed at the project root: `Work in <project root>. Read AGENTS.md first, then Start Agent Handoff. Before changing anything, tell me the current state and your recommended next step.` Do not compose a separate stateful final-response prompt; the final response points to the persisted prompt file, not a third source of truth.
11. Run the closeout maintenance trigger check. This is a short required check, not a full maintenance pass every time. Record the result in the new `dev/SESSION_LOG.md` entry under `Log maintenance`.

    Hard triggers:

    (a) Advance the SESSION_LOG N-rule (R-010 SESSION_LOG handoff-role discipline) when `dev/SESSION_LOG.md` reaches N ≥ 11 entries, or when the main log exceeds 1500 lines. If triggered, move N ≥ 11 entries into `dev/SESSION_LOG_archive/archive_<batch>_<low_date>_to_<high_date>.md` with raw content preserved, maintain `dev/SESSION_LOG_archive/INDEX.md`, collapse absorbed N=4–10 entries to short-index lines, and port any unique narrative into the relevant durable source before collapsing it. If a research trail affected a long-term decision, public claim, strategy, governance rule, or material selection, port its evidence chain into `dev/PROJECT_DECISIONS.md` using that file's research-derived decision format before collapsing the log. Handoff capability rests on `dev/SESSION_HANDOFF.md`; `dev/SESSION_LOG.md` is trace-back / audit trail and does not carry handoff responsibility.

    (b) Maintain `dev/PROJECT_DECISIONS.md` per R-028 project narrative discipline when `dev/SESSION_HANDOFF.md` contains a decisions-like H2 section (e.g. `## Confirmed Decisions`, `## Decisions`, `## 已定案決策`) with a numbered list of ≥ 30 entries. If triggered, split the oldest entries, retaining the most recent 8–22 in the handoff hot tier, into `dev/PROJECT_DECISIONS.md` `## Decisions Archive`, newest first.

    (c) Append to `dev/PROJECT_DECISIONS.md` immediately, or at closeout, when the current session includes substantive task evolution, a multi-option architectural trade-off with recorded rationale, a cross-session accumulated pattern, or a user retrospective question. Use `## Evolution Timeline`, `## Architecture Choices`, or `## Insights & Learnings` as appropriate. If the decision is research-derived, use that file's evidence-chain format so the source, summary, inference, decision impact, and uncertainty survive future compression.

    (d) Run a full long-term maintenance pass every 10 closeouts as a backstop, even if no trigger seems obvious. Count closeouts from the main `dev/SESSION_LOG.md` entries plus archive index entry counts when an archive exists; if the count cannot be determined confidently, treat the current N=10 boundary as the backstop trigger.

    If none of the hard triggers, semantic triggers, or 10-closeout backstop applies, write a one-line no-op reason and do not perform full long-term maintenance. This keeps routine closeout fast while still preventing silent drift.

Installed handoff templates use English headings by default for cross-tool stability, but project teams may translate `dev/SESSION_HANDOFF.md` section headings and visible field labels into the project's working language. Keep the `ack:section:*` and `ack:field:*` semantic markers intact; `doctor` validates those markers so localized handoff notes remain supported.

Use this closeout card:

Use the same display version rule as startup: take the version from `dev/PROJECT_INDEX.md` `## Stack` row `Agent Handoff Kit template version`, print it as `vX.Y.Z`, and fall back to `version unverified` only when it cannot be verified. Never print the literal placeholder `v<version>`.

```text
   /\_/\   Agent Handoff Kit v<version>
  ( -.- )  handoff saved
   > ^ <

✅ Done: <completed summary>
🔎 QC: <validation summary>
📌 Handoff: opening message ready
⚠️ Boundary: <important boundary or none>
```

In `dev/SESSION_HANDOFF.md`, immediately before the fenced `Next Session Opening Message` content, write:

```text
📋 Next session: agent-managed startup content below
```

Record only work actually performed in the current session. Do not copy old completed work forward as new work.
`dev/SESSION_HANDOFF.md` carries continuity. `dev/SESSION_LOG.md` carries recent evidence. Archive old detail only when needed; do not create an archive directory by default.
Do not declare handoff ready if `dev/SESSION_HANDOFF.md` still contains stale state, unreconciled placeholders in current-state sections, or an opening message that no longer matches the reconciled state.

## 5. Pack Loading

Use `dev/RULE_PACKS.md` to decide which pack to read.

A pack may add task-specific requirements. A pack cannot weaken core safety. If two packs conflict, choose the safer and more verifiable path, then record the conflict in closeout.

When a task references external tools (Notion / Google Drive / Slack / Linear / GitHub / Dropbox / HubSpot / Atlassian / etc.) or `dev/PROJECT_INDEX.md` `## Installed Integrations` is non-empty, load `dev/rules/integrations.md` together with the relevant domain pack. The integrations pack covers Connector-first defaults, credential separation, multi-layer source-of-truth architecture, and cross-session resilience for declared integrations.

After the task, persist durable facts into the correct home: handoff for current state, log for trace evidence, project index for file / command / reference maps, doc sync registry for sync obligations, project decisions for long-term decisions or research-derived rationale, and rule packs or registered references for reusable operating procedures. Do not assume the next session remembers pack context unless it is recorded, and do not treat handoff/log persistence as sufficient for reusable procedure knowledge.

If a pack, skill, subagent plan, demo workspace, or external workflow produces its own closeout, treat it as subordinate evidence. The active project root still needs Agent Handoff Kit persistence before the task is complete.

## Core Complexity Rule

New default-core rules are allowed only when they apply to most sessions, protect safety or continuity, cannot live in a pack or registry, and keep the core within budget.
<!-- END Agent Handoff Kit managed core -->
