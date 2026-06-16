# APS Live capability spec

Status: product standard / local-supported APS Live capability in unreleased source; local AI queue bridge implemented; same-machine six-stage product-flow verification passed; true two-machine / independent-network verification and public release are not yet completed
Last updated: 2026-06-15
Owner surface: Agent Public Squares public product planning

This file defines the product boundary for the APS Live layer. APS Live is part of the APS product standard as a bounded handoff-tracking and exception-coordination layer. The current product model is an HTML APS Live 交接追蹤頁 generated automatically by `Check APS` when a live coordination candidate exists, with `aps live` retained as an explicit maintainer / manual regeneration command and `aps live --demo-preview` retained for demo preview. The page carries a Trystero room candidate for real-time peer presence, handoff status checks, bounded coordination, and one-click local AI follow-up through `aps live-bridge` into `_context/live_queue`. User-facing wording should call it APS Live 交接追蹤 or 即時核對, not a diagnostic receiver, not a generic chat room, and not a dashboard. The user should only need to read and use the generated page; they should not be instructed to ask AI to run `npx aps live` before APS Live can appear in the normal Check APS route. It is not a formal APS record writer and not a promise that terminal AI agents can be woken automatically. This status does not certify reliable cross-machine APS Live, npm release readiness, or true two-machine operation. Same-machine six-stage product-flow verification has passed; cross-machine browser-to-browser verification, APS Live end-to-end operation flow verification, 3+ participant one-to-one-boundary verification, and public release proof are still required before public docs can call it shipped reliable cross-machine Live.

## Purpose

APS Live exists to let joined APS participants look at the same handoff-tracking record and resolve disagreement, missing information, status drift, or project-consensus questions before a bad handoff happens. A handoff packet is treated like a logistics waybill: it has a sender, receiver, current station, next responsible person, source pointer, start condition, and final formal status. Live discussion is allowed when it serves that tracking record; it must not become an empty social chat. When discussion needs formal APS action, it returns to the local AI / terminal APS flow for user-approved action.

The operating spine is:

```text
Terminal Check APS / check Drive
-> open APS Live when a handoff chain needs live status checking, source/version clarification, missing information, or objection handling
-> APS Live connects peers through a Trystero room and exchanges handoff status and focused coordination messages
-> user chooses a local AI follow-up intent, such as summarise consensus, check write-back need, draft formal APS action, find missing information, or compare states
-> APS Live sends the discussion, current APS status, and selected intent into the local AI pending queue
-> local terminal AI reads the queue and forms the proposed next step
-> user approves in local AI / terminal
-> terminal APS command writes the formal state, if any
```

APS Live is not the user's goal. The user's goal is to move their project handoff forward with less confusion.

## Product Leadership Rule

APS Live must be led by APS state, not by an empty chat-room metaphor. The product owner / implementing AI must design it as a context-bound handoff-tracking surface:

- `Check APS`, `check Drive`, or local AI decides why Live is useful now.
- The generated page carries the current APS project, shared-goal state, relevant handoff chain, packet / version, peer confirmation state, missing information, and the exact question that needs live confirmation.
- The first visible screen must show tracking state before discussion: current station, whether the receiver can start, who is responsible for the next move, blocker reason, and the next formal APS action.
- A shared goal can contain multiple handoff chains, but the first usable slice shows one active handoff ticket clearly. Future multi-chain views may show related or dependent tickets, but must not replace the single-ticket tracking card as the first screen.
- The page helps both sides clarify source, version, role, status, and objections, but it must not replace the formal handoff packet. If a handoff lacks a receiver-readable source pointer, Live should ask for the missing shared source and then send the discussion back to local AI for a user-approved APS revision.
- The first visible screen shows a tracking card: what this handoff is, where it is in the flow, what AI already knows, what to ask the collaborator if blocked, and what must return to terminal before it becomes formal APS truth.
- The message box should be prefilled from that context whenever possible. A blank chat box is a failure state, not the default product experience.
- The local AI queue payload must include the current APS context and selected intent, not only raw chat messages.

If APS Live opens without project context, relevant APS state, handoff chain status, or a clear next decision, it is not meaningfully different from a normal chat tool and should not be considered successful APS Live.

## Six-stage Product Flow Definition

APS Live is not considered product-flow complete until this exact six-stage path is proven with two APS identities:

```text
共同基準
-> 已發出
-> 對方查看
-> 可開工判斷
-> 處理 / 補資料
-> 正式更新
```

Each stage must have evidence of transition, not only a visible label on the page.

| Stage | Product meaning | Minimum evidence |
|---|---|---|
| `共同基準` | A current shared goal / roles baseline exists, or the lack of one is the explicit blocker. | Terminal or packet evidence names the baseline version / missing baseline, and both identities see the same baseline state. |
| `已發出` | A formal shared-goal item, packet, or handoff ticket has been issued through APS state, not merely typed in Live. | Sender-side terminal evidence and Live ticket state point to the same issued work item. |
| `對方查看` | The receiver identity sees the same active ticket and reports its visible state. | Receiver-side page / terminal evidence shows the ticket, sender, receiver, `任務`, `真源`, and `開工條件`. |
| `可開工判斷` | The receiver makes a concrete decision: can start, needs missing information, disagrees, or must wait. | The decision is recorded as a receiver-side Live reply or terminal judgement, with reason. |
| `處理 / 補資料` | The chosen branch is acted on: coordination, missing-info request, objection, or start-ready handling. | Live discussion and local-AI queue evidence show the branch and the proposed next formal action. |
| `正式更新` | Local terminal AI proposes the formal APS update and the user approves or explicitly blocks it. | Formal APS command evidence records the user-approved update, or the ledger records the block. Live alone must not write this stage. |

This six-stage path is the product-flow gate. Trystero peer discovery and messaging are transport evidence. Local queue write / readback is bridge evidence. Unchanged packet / outbox / ack hashes are formal-boundary evidence. None of those can replace a missing six-stage transition.

## Minimum Useful Slice

The first user-facing APS Live surface should show only the smallest workflow a non-technical user needs. The page is an operation surface, not a policy document.

1. Show the handoff-tracking card: chain, current station, whether work can start, who is responsible, blocker, and next formal action.
2. Connect to the collaborator only when live coordination is useful.
3. Send focused status-check or missing-information messages.
4. Send the discussion to the local AI pending queue with a clear follow-up intent.
5. Return to the user's local AI conversation for AI summary, judgement, draft action, and user-approved formal APS write-back.

The page must not assume the user already knows why APS Live was opened. The first screen must explain the preceding situation in user terms: this handoff chain is at a specific station and either can move forward or needs live coordination. It must then show the current job-to-be-done, the blocker if any, the completion standard, and the return path to the local AI conversation.

The current normal user-facing layout is locked to the latest APS Live 交接追蹤 direction:

1. Top bar: page title `APS Live 交接追蹤`, project name, and participant identity pills generated from APS project state.
2. One main `交接單` ticket card: human order label, title, sender, receiver, current station, and visible status. The first supported view shows one primary ticket such as `交接單 1/1`; future related tickets may be summarized separately but must not displace the primary ticket.
3. One visual progress tracker: created, sent, receiver seen, start judgement, and complete / returned. It must not rely on colour alone: every stage needs an explicit icon plus text status such as `已完成`, `進行中`, `未通過 / 需處理`, or `未開始`.
4. Three human-readable handoff detail rows: `任務`, `真源`, and `開工條件`.
5. One right-side connection panel: a single `連接 APS Live` button plus connection / presence status. It must not make the local-AI return action look like the first step.
6. One `交接事件紀錄` timeline below the ticket card, with a compact default view and an expandable full history when entries grow. It must show handoff time concepts: when tracking started, when the formal packet / view state is known, when Live comments happen, and whether the ticket has been formally closed / returned. Unknown timestamps must be visibly labelled as pending or unrecorded, not left blank.
7. One operational stage guide labelled around `目前階段與正式操作`, not a generic tutorial. It tells non-technical users the current status, where the formal action happens, and one line they can tell the local AI / terminal for that stage.
8. One `協調與回應` block: quick reply buttons, editable draft, send button, stateful status, current-room message history, and the local-AI return panel after the discussion. The local-AI button should be phrased as drafting or summarising the next step, not completing formal APS state.
9. One return line that tells the user to go back to the local AI conversation for formal APS action, plus a small set of explicit terminal options: confirm / agree, object, return / request more information, and close. These options may draft formal APS actions only; they must not imply Live itself writes formal state.

This is the only current UI direction for normal APS Live. Do not reintroduce the old five-panel layout, standalone shared-goal chain board, upstream-context panel, separate `發給協作者`, separate `目前狀態`, duplicated connection areas, or a separate `交回本機 AI` panel. If future design adds multi-chain management, it must sit around or after the active ticket card; it must not turn the first screen into a board, table dump, or generic group chat.

Identity rule: APS Live is a product surface, not a one-off Adam / Jay task. Participant labels must come from the current APS project config, peer cards, packet sender / receiver, or generated demo fixture data. `Adam` and `Jay` may appear only as clearly marked examples, tests, screenshots, or demo fixtures. They must not be hard-coded as the product's identity model, default participants, CSS / DOM assumptions, room identity, or user journey contract.

Use a small, stable status icon vocabulary so non-technical users can scan state without reading every paragraph: `⏳` pending / not yet done, `✅` connected / sent / done, `⚠️` needs attention or fallback, `💬` live discussion, and `🤖` hand back to local AI. These icons must label state or action, not decorate unrelated text.

Status text must be stateful, not cumulative. After connection, send, receive, clear, or local-AI handoff, the visible discussion status must replace the previous state. A pending hint such as "not yet sent" must not remain visible after a message is sent.

The live send button must not be active until the page is connected and at least one remote peer is present in the room. Users may edit the draft while waiting, but the UI must not create a message card that looks sent when no collaborator can receive it.

The normal page should keep a local browser history for the current room so reload does not erase the immediate discussion context. This browser history is only a convenience transcript for the local user. It is not formal APS truth, not a Drive write, and not a substitute for local-AI summary plus user-approved APS record updates.

The first visible UI should therefore contain only the latest tracking-ticket workflow:

- Page title, project, and participants.
- The active handoff ticket with progress and status.
- `任務`, `真源`, and `開工條件` as readable facts, not raw packet fields.
- One connection action and one local-AI handoff action.
- One bounded coordination area with draft, send, status, and history together.
- One clear return path to the local AI conversation.

The first visible UI must not show JSON, raw status payloads, packet ids, packet internals, room ids, peer diagnostics, warning essays, liability-style disclaimers, or "Live cannot do" lists. Fallback text copied to the user's local AI must also be human-readable, not raw JSON. Those boundaries belong in the spec, tests, and AI prompt layer. A non-technical user should not have to read defensive product text before they can operate the page.

## Deferred Feature List

Keep these out of the first user-facing slice until the minimum workflow is understood and verified.

1. Cross-machine two-device Trystero verification using the dedicated APS Live Trystero QC module.
2. Connected-peer display that is understandable without raw peer ids.
3. Cross-machine validation that both sides see the same human-readable message cards in the discussion block.
4. Better local-AI queue success state when `aps live-bridge` is running.
5. A compact "what changed after discussion" review step before returning to terminal.
6. A separate maintainer / debug view for room id, raw payloads, peer diagnostics, console evidence, and status broadcasts.
7. Optional templates for repeated situations such as shared-goal confirmation, missing information, and status mismatch.
8. Public teaching-page integration after the two-machine Live path is proven.

## Capability Boundary

APS Live may do these things:

- Show which known APS names are currently present in the same live room.
- Show whether each side claims to be in the same project.
- Show a focused handoff-tracking view for one active ticket under the shared goal. Related ticket support is future scope and must not displace the active ticket first screen.
- Exchange short status summaries between live peers.
- Compare what each side says it can currently see: shared goal version, packet id, ack state, close state, Drive sync state, and missing evidence.
- Ask the collaborator for the missing shared source pointer, version, page, paragraph, table, file name, or Drive location needed before a receiver-side AI can safely start.
- Help both sides identify a likely mismatch: Drive not synced, wrong APS name, wrong project, old shared goal, missing packet, declined packet, stale packet version, or unclear handoff.
- Generate a proposed next step for each side to present to its own user.
- Send a structured local-only AI follow-up item to `_context/live_queue` through `aps live-bridge`.
- Produce a draft APS action for terminal confirmation, such as revise, decline, consume, close, or a new clarification packet.

APS Live must not do these things:

- Store the formal handoff truth.
- Treat chat history as a substitute for packet body, shared source pointers, receiver start conditions, or Drive records.
- Replace packet / outbox / ack / peer card / shared goal records.
- Act as a task board, audit page, unbounded social chat, or replacement for project tools outside APS handoff / consensus work.
- Promise that the other side has received, read, or accepted a handoff.
- Treat online presence as Drive sync.
- Treat a live message as an APS ack.
- Auto-start Codex, Claude Code, or any other AI session.
- Push messages into a running AI terminal as if it were a native APS capability. The supported route is a local pending queue that terminal AI reads on request.
- Claim that a button sends status to the other computer unless both sides are connected to the same APS Live Trystero room.
- Auto-consume, auto-decline, auto-revise, auto-withdraw, auto-close, or auto-publish.
- Send WhatsApp, Telegram, email, desktop notifications, or platform notifications.
- Add background watch, scheduled polling, or bot delivery to APS core.
- Carry credentials, private local paths, unredacted personal data, or sensitive project payloads.

## Required Technical Surfaces

A future implementation cannot be called APS Live until all four surfaces exist and are testable.

| Surface | Required definition | Minimum acceptance |
|---|---|---|
| Message channel | Which live transport carries focused status-check and coordination messages. Current candidate is Trystero, using room join, peer join / leave callbacks, and custom data actions. | Two browsers can join the same room and exchange handoff status and coordination messages without writing APS formal state. |
| Receiving surface | Where the user or AI sees the handoff-tracking state and live coordination. Current candidate is a separate APS Live HTML page, not the existing dashboard. | The page shows one active handoff ticket, progress with icon + text status, `任務` / `真源` / `開工條件`, current station, connection status, timestamped event log, operational stage guide, and bounded coordination messages without implying formal APS delivery. |
| State-write boundary | What, if anything, is written after a live exchange. | Live may write only a local AI follow-up item under `_context/live_queue` or hand a draft back to terminal. Formal APS state still requires terminal APS command and user approval. |
| User confirmation gate | Which user-visible prompt must be approved before formal APS state changes. | Any publish / revise / decline / consume / close remains impossible from Live alone. |

Trystero source note: the official `dmotz/trystero` GitHub README, checked 2026-06-14, describes CDN import from `https://esm.run/trystero`, `joinRoom({ appId }, roomId)`, peer presence callbacks, and current object-style `makeAction` usage through `action.send(...)` and `action.onMessage = (...)`. Local probing confirmed the CDN module currently returns action objects with `send`, `onMessage`, and `onReceiveProgress`, not the older array destructuring shape. This supports a live message channel. It does not make APS formal state durable and does not wake terminal AI agents by itself.

Current implementation note: `Check APS` generates or refreshes `_context/aps-live_<agent>.html` automatically for the current APS project when the live-routing section is relevant, then prints the local APS Live path for the user to open. The explicit `aps live` command remains available for maintainers, repair flows, and manual regeneration; it creates the same page and a local bridge token in `_context/live_bridge_token.json`. `aps live-bridge` starts a localhost receiver that accepts token-protected Live follow-up items and writes them to `_context/live_queue`. `aps live-queue` reads the queue for terminal AI, while `check-aps` surfaces that queue only when something is waiting. `aps live --demo-preview` can generate a standalone demo HTML, and `check-aps --demo-preview` must not write HTML; it only states that formal project runs auto-generate APS Live. `--dry-run` checks the same page plan and status fields without writing HTML or APS formal state. The current normal page uses the locked 交接追蹤 UI above: top bar with formal sender / receiver plus third-party coordination boundary, one numbered primary ticket card, progress stages with explicit icon + text status, `任務` / `真源` / `開工條件`, one connection panel, compact-plus-expanded timestamped event log, operational stage guide, one coordination block, one post-discussion local-AI return panel, and terminal option prompts for confirm / object / request information / close. The page imports Trystero from `https://esm.run/trystero`, calls `joinRoom({ appId }, roomId)`, assigns `onPeerJoin` / `onPeerLeave`, and defines `makeAction` channels for `aps-message`, `aps-status`, `aps-feedback`, and `aps-consensus`. Coordination messages carry `message_id`; the page uses short warmup resends plus receive-side de-duplication so messages sent immediately after peer discovery can still arrive once the WebRTC data channel is ready. Browser-local session history uses `sessionStorage` key `aps-live-session-v1` as a same-machine preview convenience only. Same-machine structural checks passed for the latest UI shape, and localhost bridge dry-run passed for queue write / readback. Cross-machine end-to-end behaviour and true two-peer Trystero message exchange still need two-machine verification before public docs may present it as reliable cross-machine support.

Trystero QC gate: APS Live is integrated into the APS product standard as a local-supported handoff-tracking capability, but cannot be promoted to reliable cross-machine support until the dedicated module `dev/qc/aps-live-trystero-qc.md` passes. That module must test more than "two tabs opened": it must cover the six-stage product flow, two machines or two isolated browser contexts, dynamic APS identities, peer presence, bidirectional message exchange, reconnect, offline / no-peer behavior, duplicate-message handling, local-AI queue handoff, Drive formal-truth boundary, user-facing status clarity, APS Live end-to-end operation flow, and 3+ participant presence / coordination while formal handoff remains one-to-one. If APS Live becomes part of the supported full product path, this module becomes a required part of 🔴 全面檢.

The APS Live end-to-end operation flow gate must prove the whole path: terminal `Check APS`, `check Drive`, or handoff preflight identifies a live coordination need; APS Live opens with the current project, APS identity, active ticket, sender, receiver, `任務`, `真源`, `開工條件`, blocker, and next formal action; peers coordinate; the user sends a selected follow-up intent into `_context/live_queue`; terminal AI reads the queue; terminal AI proposes the formal next step; and the user must approve before any formal APS command writes state. Passing peer-to-peer chat alone is not enough. The same gate must cover bridge online, bridge offline, invalid token, missing receiver-readable source, stale version, peer offline, wrong project, and declined / returned packet cases.

The six-stage product-flow gate must pass before the Trystero evidence can be treated as product readiness. The report must state, stage by stage, whether `共同基準`, `已發出`, `對方查看`, `可開工判斷`, `處理 / 補資料`, and `正式更新` were completed, failed, intentionally blocked, or not run. A report that only proves room connection, message delivery, page rendering, queue write / readback, or formal-state non-mutation is a transport / boundary pass, not a product-flow pass.

The 3+ participant gate must prove small-group presence without changing the APS formal model. Three or more APS identities may enter the same Live room and coordinate around a project or ticket, but the active handoff ticket must still show a single sender and a single receiver. At least one run must use non-Adam / non-Jay identities and display names that differ from `agent_id`. A third participant may clarify, supply missing information, or comment on status; that participant must not become a formal recipient, create ack state, consume another receiver's packet, satisfy close conditions, or turn the packet into a group-recipient handoff. A→B and A→C are two separate formal packets, not one group lane. B must not see or consume C-only packets, C must not see or consume B-only packets, and C's Live comment in an A→B discussion may only become coordination material for terminal AI judgement.

## Entry And Exit

APS Live should be opened when a handoff chain needs shared visibility or exception coordination. In the normal user journey, terminal AI runs `Check APS`; when Live is useful, `Check APS` automatically generates or refreshes the APS Live HTML and shows the path. The user should not need to know or request the generation command. The terminal remains the formal action surface: install, Check APS, check Drive, publish, revise, consume, decline, close, and any Drive write still happen through local AI / terminal after user approval.

### When terminal may suggest Live

`Check APS`, `check Drive`, or a handoff preflight may suggest APS Live whenever live coordination can reduce drift in a shared goal or handoff decision:

- A shared goal and roles draft needs peer confirmation, supplement, correction, or objection.
- Adam has written a packet but Jay cannot see it.
- Jay sees an old shared goal while Adam sees a newer one.
- The packet exists but the receiver cannot safely act because evidence is missing.
- One side has declined or requested more information, but the other side has not seen that state.
- Drive sync appears delayed.
- The AI is about to ask the user to wait, revise, withdraw, decline, or send a clarification packet and live peer status may reduce guesswork.

### When terminal must not suggest Live

APS Live should not be suggested when:

- The issue is a normal first-time setup or peer invite.
- There is no shared goal draft, packet, missing-information request, return reason, or confirmation topic to discuss yet.
- The peer is not confirmed.
- The task needs sensitive material, private credentials, or full file content that should not be broadcast through a browser room.
- The user is simply trying to read an incoming packet; `check Drive` remains the receiver-side reading path.

### Exit back to local AI / terminal

APS Live must end with a local-AI / terminal next line, not with a hidden action.

When the local bridge is running, the preferred exit is one click from Live into the local AI pending queue. The queued item must include the selected user intent, current APS status, and recent Live messages. It must ask AI to summarise and judge first, not to directly apply the conversation.

Examples:

```text
請回到本機 AI：請用 APS 根據雙方核對結果，判斷應等待同步、要求補資料、修訂，還是繼續交接；正式動作等我確認。
```

```text
請回到本機 AI：請用 APS 為 Jay 產生一份補資料請求草稿，等我確認後才發出正式交接。
```

```text
請回到本機 AI：請用 APS 根據 Live 核對結果，列出是否要修訂、退回或等待 Drive 同步；正式動作等我確認。
```

## User Journeys

### First Handoff Setup

1. User asks terminal AI to use APS for this project.
2. Terminal AI runs or guides `Check APS`.
3. If no shared goal and roles exists, terminal AI creates the draft baseline first.
4. If the collaborator is not joined, terminal AI generates a peer invite; Live is not useful yet.
5. After both sides are confirmed, terminal may suggest APS Live if the shared goal and roles draft needs live confirmation, supplement, correction, or objection before it becomes the working baseline.
6. Live shows the shared-goal confirmation as a tracking chain: current station, who must act, whether ordinary work can start, and what needs confirmation.
7. Live exits back to terminal: send, revise, or confirm `shared_goal_and_roles` through APS if the user approves.

### Second Handoff

1. User says in terminal: use APS to hand the next part to Jay.
2. Terminal AI checks peer state, shared goal, previous open packets, and risks.
3. If the path is clear, terminal AI prepares the formal packet and asks for approval; APS Live is not needed.
4. If the AI sees a mismatch or uncertain status, it may ask the user to open APS Live for that handoff chain.
5. Live lets participants compare the tracking state, visible packet, source / version, missing information, and next responsible person.
6. Live returns a proposed next terminal action.
7. Terminal AI asks the user to approve any formal write.

### Adam Wrote A Packet But Jay Cannot See It

Live may exchange:

- Adam sees packet id and version.
- Jay does or does not see the same packet.
- Each side's latest visible shared goal version.
- Each side's Drive sync state, if known.

Live must not re-send the packet or mark it read. The likely terminal outcomes are:

- Wait and rerun `check Drive`.
- Ask Adam to send the human notification again.
- Ask Adam to confirm the packet id and topic.
- If the packet is wrong, ask Adam to revise or withdraw after approval.

### Jay Has Insufficient Information

Live may exchange:

- Which required field is missing.
- Which evidence path or version Jay cannot verify.
- Whether Adam has a newer packet version.

Live must return to terminal with a proposed clarification or revise flow. It must not consume the original packet as done.

### Shared Goal Versions Differ

Live may exchange:

- Adam's current shared goal version.
- Jay's current shared goal version.
- Which side has confirmed or objected.

Live must stop normal task execution. Terminal must create a `shared_goal_and_roles_clarification` or revised `shared_goal_and_roles` packet after user approval.

### Peer Offline Or Not Present

Live may show the peer is not present in the live room. This means only "not present in Live now." It does not prove the peer is not installed, not using APS, or has not synced Drive.

Terminal should fall back to the normal APS path: human notification, wait for Drive sync, `Check APS`, and `check Drive`.

### Drive Has Packet But Live Has No Peer

Terminal should treat Drive as the formal truth. Live absence is not a blocker if packet / outbox / ack state is already enough to proceed.

## Diagnostic Message Shape

Live messages should be small and structured. They should describe what the sender sees, not ask the receiver to trust a conclusion.

Required fields:

| Field | Meaning |
|---|---|
| `project` | APS project slug or hashed room identity. |
| `agent_id` | Sender APS name. |
| `seen_shared_goal` | Latest shared goal version seen by this side, or unknown. |
| `seen_packet` | Packet id / version being discussed, or none. |
| `seen_ack` | Relevant ack / decline / close state seen by this side, or none. |
| `local_drive_state` | Human-readable sync state when known; never a promise. |
| `blocker` | The exact mismatch or missing information. |
| `proposed_terminal_action` | The next action to ask the user to approve in terminal. |

Forbidden fields:

- Credentials or tokens.
- Local absolute paths intended for the other side.
- Full private file contents.
- Unreviewed sensitive payloads.
- "I have received notification" unless the protocol later has a verifiable event for that.
- Any command that auto-writes APS formal state.

## Formal State Write-Back

Live can create a draft proposal only. Formal state belongs to APS terminal flow.

| Desired outcome | Live may do | Terminal must do |
|---|---|---|
| Ask for missing information | Draft missing-info summary. | User approves a clarification packet or revise request. |
| Accept incoming packet | Suggest that it seems complete. | User approves `consume` with a specific result. |
| Reject or cannot act | Draft reason. | User approves `decline`. |
| Fix wrong packet content | Identify mismatch. | Original sender approves `revise` or `withdraw`. |
| Finish a handoff line | Suggest closure only after evidence. | Original sender approves `close`. |
| Update shared goal | Compare versions and proposed changes. | A revised `shared_goal_and_roles` packet is sent and confirmed. |

## Local AI Pending Queue

The queue is the bridge between browser Live discussion and terminal AI judgement. It is useful only if it gives AI a clear job, not if it dumps raw chat.

Supported follow-up intents:

- Summarise consensus, disagreement, and pending decisions.
- Judge whether any Live discussion should be written back into formal APS records.
- Draft a formal APS action for user confirmation.
- Find missing information and draft questions for the other side.
- Compare whether both sides see the same shared goal, packet, ack, and status.

Queue rules:

- Queue items are local-only materials under `_context/live_queue`.
- Queue items are not formal APS truth.
- Queue items must include recent Live messages, current APS status, and selected intent.
- Terminal AI must read and summarise the queue before proposing any formal action.
- Formal publish / revise / decline / consume / close still needs user approval in terminal.
- Clipboard prompt fallback is allowed only when `aps live-bridge` is not running.

## Dashboard And Coordination Boundary

APS Live is not a dashboard section. HTML dashboard is retired from the current APS product path; APS Live should be opened from terminal `Check APS`, `check Drive`, or an explicit local AI recommendation, and it must remain a separate handoff-tracking and exception-coordination surface for the APS project.

APS Live is not a generic chat room. It may include chat when a handoff chain is blocked, unclear, mismatched, or disputed. Useful APS Live coordination should keep returning to one of these questions:

- Are we in the same project?
- Are we using the same shared goal version?
- Do we see the same packet / ack / close state?
- What is missing?
- Which handoff chain is blocked?
- Who must act next?
- What terminal action should each side ask the user to approve?

If the answer is not connected to APS handoff status, shared-goal confirmation, missing information, source / version mismatch, objection, or agent-to-agent follow-up, the conversation belongs in normal project tools, not APS Live.

## Acceptance Matrix

| Check | Pass condition |
|---|---|
| Terminal-first journey | A new user can start from `Check APS` and understand that Live is useful when confirmation, feedback, mismatch, or blockage needs live peer input. |
| Handoff tracking first | The first screen shows title, project, participants, one active handoff ticket, visual progress, `任務`, `真源`, `開工條件`, current station, connection status, compact event log, stage-completion guide, and bounded coordination before any generic chat behavior. |
| No old UI drift | The normal page does not reintroduce the old five-panel layout, standalone shared-goal chain list, upstream-context panel, separate `發給協作者`, separate `目前狀態`, duplicated connect sections, JSON / packet internals, or diagnostic receiver styling. |
| Multi-chain awareness | A shared goal may later show multiple handoff tickets, but the active ticket remains the first-screen anchor and the page must not become a project-management board. |
| Trystero-first coordination | The APS Live page exposes room connection and focused status-check messages as first-class actions, without implying notification receipt or formal acknowledgement. |
| Six-stage product flow | Two APS identities complete or explicitly block `共同基準` -> `已發出` -> `對方查看` -> `可開工判斷` -> `處理 / 補資料` -> `正式更新`, with evidence for each transition. Stage labels shown on the page are not enough. |
| APS Live end-to-end operation flow | `Check APS`, `check Drive`, or handoff preflight can lead into APS Live, then into local AI queue, then back to terminal AI recommendation and user-approved formal action. No hidden write occurs in Live, and bridge online / offline / invalid-token exits remain human-readable and bounded. |
| 3+ participant one-to-one-boundary | Three or more APS identities can be present and coordinate in the same Live context, while the active formal handoff ticket remains one sender to one receiver and no third participant can ack, consume, decline, satisfy close conditions, or become formal recipient by presence alone. Receiver-specific packets remain invisible / non-consumable to the wrong receiver. |
| Chat only for exceptions | A normal clear handoff can still proceed through terminal; chat is for missing information, version mismatch, unseen packet, objection, or unclear start condition. |
| Return to terminal | Every Live journey ends with a specific terminal next line. |
| Local AI queue | One click from Live can send structured discussion material to `_context/live_queue`; AI must still summarise and ask before formal write-back. |
| No formal write from Live | Live cannot consume, decline, revise, withdraw, close, publish, or ack. |
| No auto-wake promise | The spec does not claim Codex / Claude Code terminal will wake by itself. |
| No notification delivery claim | Online or live message presence is not treated as notification receipt. |
| Drive remains truth | Packet / outbox / ack / shared goal records remain the formal state. |
| No dashboard drift | HTML dashboard is retired and must not reappear as the Live implementation, a fake Live block, or a substitute for terminal `Check APS`. |
| Coordination boundary | Live supports APS handoff tracking and exception coordination, not unbounded social chat or a project-management system. |
| User approval gate | Every formal repair proposal requires terminal user confirmation. |

Minimum product acceptance:

```text
The next implementer cannot reasonably turn APS Live into a dashboard block, unbounded social chat, background notifier, terminal auto-wake, project-management board, or automatic handoff executor after reading this spec.
```

## Relationship To Existing Sources

- Existing roadmap: OPS `docs/plans/2026-05-28-aps-public-product-multi-agent-roadmap.md` remains the historical roadmap for Reliable Peer Handoff, Project Context Index, and automation-out-of-scope decisions.
- This spec is the focused draft for any future APS Live work after 2026-06-14.
- `Check APS` remains the terminal-first read-only status surface. HTML dashboard is retired and must not be used as a current product path or APS Live substitute.
- Public docs must not claim APS Live is shipped as reliable cross-machine support until the Trystero candidate passes two-machine verification and QC.

## Open Implementation Questions

- Whether the first transport remains Trystero plus localhost bridge, or moves to a packaged helper.
- Whether the APS Live HTML should continue to run from `file://` with localhost bridge, or move to a single local web app.
- Whether live diagnostic drafts are stored at all. If stored, they must be separate from packet / outbox / ack and clearly marked non-formal.
- How peers prove that a live room belongs to the same APS project without exposing secrets.
- How to avoid leaking local machine paths and sensitive project content through live messages.
