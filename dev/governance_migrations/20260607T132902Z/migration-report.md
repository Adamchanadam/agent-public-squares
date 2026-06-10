# Agent Handoff Kit Migration Report

Command: upgrade
Mode: upgrade-existing
Root: C:\Users\adam\_claude_desktop\Agent_Public_Squares
Created: 2026-06-07T13:29:02.856Z

## Created
- none

## Merged
- dev/RULE_PACKS.md - merge missing governance bridge routing row while preserving existing custom rows
- dev/rules/agent-governance.md - insert governance bridge workflow into agent-governance pack without replacing local additions

## Skipped Existing
- AGENTS.md
- CLAUDE.md
- GEMINI.md
- START_NEXT_SESSION_PROMPT.txt
- dev/SESSION_HANDOFF.md
- dev/SESSION_LOG.md
- dev/PROJECT_INDEX.md
- dev/DOC_SYNC_REGISTRY.md
- dev/PROJECT_DECISIONS.md
- dev/rules/safety.md
- dev/rules/coding.md
- dev/rules/writing.md
- dev/rules/research.md
- dev/rules/release.md
- dev/rules/knowledge.md
- dev/rules/communication.md
- dev/rules/onboarding.md
- dev/rules/integrations.md

## Conflicts
- none

## Metadata Updates
- dev/PROJECT_INDEX.md: Agent Handoff Kit template version 0.3.25 → 0.3.28

## Backup
- dev\governance_migrations\20260607T132902Z\backup

## Notes
- Existing files are preserved unless the installer can perform a bounded merge.
- Files that cannot be safely merged are reported as conflicts and are not overwritten.
- Metadata Updates section tracks row-level mutations (R-031.3) distinct from file-level changes.
