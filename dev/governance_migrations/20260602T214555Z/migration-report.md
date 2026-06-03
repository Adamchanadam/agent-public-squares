# Agent Handoff Kit Migration Report

Command: upgrade
Mode: upgrade-existing
Root: C:\Users\adam\_claude_desktop\Agent_Public_Squares
Created: 2026-06-02T21:45:55.200Z

## Created
- none

## Merged
- AGENTS.md - add managed core while preserving existing AGENTS.md content
- dev/SESSION_HANDOFF.md - move historical evidence out of hot handoff state
- dev/SESSION_LOG.md - restore SESSION_LOG machine boundaries and entry template contract
- START_NEXT_SESSION_PROMPT.txt - regenerate prompt from repaired handoff opening message

## Skipped Existing
- CLAUDE.md
- GEMINI.md
- START_NEXT_SESSION_PROMPT.txt
- dev/PROJECT_INDEX.md
- dev/DOC_SYNC_REGISTRY.md
- dev/RULE_PACKS.md
- dev/PROJECT_DECISIONS.md
- dev/rules/safety.md
- dev/rules/coding.md
- dev/rules/writing.md
- dev/rules/research.md
- dev/rules/agent-governance.md
- dev/rules/release.md
- dev/rules/knowledge.md
- dev/rules/communication.md
- dev/rules/onboarding.md
- dev/rules/integrations.md

## Conflicts
- none

## Metadata Updates
- dev/PROJECT_INDEX.md: Agent Handoff Kit template version 0.3.23 → 0.3.24

## Backup
- dev\governance_migrations\20260602T214555Z\backup

## Notes
- Existing files are preserved unless the installer can perform a bounded merge.
- Files that cannot be safely merged are reported as conflicts and are not overwritten.
- Metadata Updates section tracks row-level mutations (R-031.3) distinct from file-level changes.
