# Examples and historical fixtures

This folder keeps old Bridge Pack fixtures for maintainers and regression review.

New APS users should not copy these files into their project. The current setup path is:

1. Open the local project folder in a local AI agent.
2. Ask the AI agent to follow the install guide:
   <https://adamchanadam.github.io/agent-public-squares/docs/guides/aps-ai-agent-install.html>
3. Let the AI agent run `npx aps init` only after the user confirms the Google Drive local path, project code, and their own APS name.
4. Use `npx aps peer invite` for a normal open invite. The invite does not preassign the recipient's APS name.

## Fixture folders

| Folder | Purpose |
|---|---|
| `demo-agent-a/dev/rules/aps-bridge.md` | Historical User A Bridge Pack copy from MVP validation. |
| `demo-agent-b/dev/rules/aps-bridge.md` | Historical User B Bridge Pack copy from MVP validation. |

The two fixture bodies are intentionally preserved as historical samples. They are not the current onboarding instruction and should not be treated as the source of truth for public setup.

## When to inspect them

Use these fixtures only when checking legacy compatibility or comparing old MVP behavior. For live setup, public docs and the CLI are authoritative.
