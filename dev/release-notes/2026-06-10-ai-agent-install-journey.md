# 2026-06-10 — AI-agent-led beginner install journey

This documentation update reshapes the public Agent Public Squares beginner journey around one clear action: a non-technical user opens a local AI agent such as Codex or Claude Code in the project folder, then pastes one prompt that asks the agent to read the AI-agent install page and guide the setup.

## What changed

- Added `docs/guides/aps-ai-agent-install.html`, a page written for local AI agents that can read/write the project folder, run commands, and access the web.
- Rewrote the public entry page, guides hub, first-install walkthrough, and join-invite page so human readers see a simpler route first.
- Updated `README.md` to make the AI-agent install prompt the recommended path and keep raw commands as a fallback.
- Added a Windows Google Drive reminder: the APS shared folder should be set to "可離線使用" through right-click → "顯示其他選項" → "離線存取" → "可離線使用".
- Added the reference image `docs/guides/google_drive_local_access_pic_1.png` to the first-install, join-invite, and AI-agent install pages.

## Verification

- Human route dry-run passed through local Chrome DevTools snapshots on desktop and mobile.
- AI-agent route dry-run passed with `node bin\aps.js init --dry-run --hub-root C:\tmp\aps-ai-agent-dry-run-hub --project demo_project --agent-id adam`; the command listed planned writes and did not create the dry-run Hub or `.aps/config.json`.
- Existing-project routing check passed: `node bin\aps.js upgrade --dry-run` refused to run without `.aps/config.json`, matching the documented split between new install and upgrade.
- Local HTML link and image source audit passed.
- No local `.md` hyperlinks remain in the public docs route.
- `git diff --check` passed with Windows line-ending warnings only.
- Agent Handoff Kit doctor v0.3.28 passed 48 checks, with the expected SESSION_LOG N-rule warning after adding S65.

## Boundaries

- This is a documentation and onboarding-flow release note. It does not change the APS CLI package version.
- It does not prove remote second-machine Google Drive sync latency.
- GitHub Pages reflects these pages only after the commit is pushed to `main`.
