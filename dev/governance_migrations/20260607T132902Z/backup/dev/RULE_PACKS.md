# Rule Packs Router

Read only the packs needed for the current task.

| Task signal | Pack | Purpose |
|---|---|---|
| First-time user signals (任一即可): "I'm new" / "新手" / "教我用" / "help me start" / "first time" / "我啱啱安裝" / "點開始" / "show me how" / "getting started" / "agent handoff kit 可幫我做甚麼" / "我想做 [type] project" / "點用" / "能力" / vague first message ≤ 30 chars / HANDOFF Active Objective 空白 + Session count 1 (fresh installation context) | `dev/rules/onboarding.md` | first-time user walk-through with 5 scenarios (A 寫代碼 / B 研究報告 / C 知識庫 / D 學寫代碼 / E 其他) × 5-step pattern (PLAN-style: confirm context / explain v2 fit / ask task scope / suggest minimum viable / confirm + transition); load proactively when signal present; transient pack, unload after onboarding completion |
| Destructive file operations, shell writes, Git state changes, package managers, installers, deploy, release, cloud tools, external APIs, credentials, locked files, permission errors | `dev/rules/safety.md` | safety checks for data loss, external systems, secrets, and high-risk operations |
| Code, tests, build, package manager, SDK, CLI, API | `dev/rules/coding.md` | development workflow and verification |
| Draft, edit, style, publication content | `dev/rules/writing.md` | writing workflow and tone control |
| Sources, evidence, comparison, fact finding | `dev/rules/research.md` | source handling and uncertainty |
| Governance, prompts, agents, handoff, startup/closeout, skills | `dev/rules/agent-governance.md` | governance changes and boundary control |
| Release, publish, deploy, tag, hotfix, GA | `dev/rules/release.md` | release verification and evidence |
| External notes, knowledge base, Notion, Obsidian, Drive | `dev/rules/knowledge.md` | external knowledge source integration |
| External tool integrations (Connector / MCP / Plugin / Skill) — declared in `## Installed Integrations`; tasks involving Notion / Drive / Slack / Linear / Dropbox / HubSpot / GitHub / etc. external read-write | `dev/rules/integrations.md` | Connector-first default + credential separation + multi-layer source-of-truth + cross-session resilience |
| Reply format, language, output schema | `dev/rules/communication.md` | user-facing response rules |

## Routing Rule

Load the minimum set. If uncertain, load the narrower pack first. If a task clearly involves safety risk plus another domain, load `dev/rules/safety.md` with the relevant domain pack and state why. Packs can add stricter rules, but cannot weaken core safety or closeout requirements.
