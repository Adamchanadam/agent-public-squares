# APS Live capability spec

Status: product standard / local-supported APS Live capability in unreleased source; local AI queue bridge implemented; local executable matrix now covers no-baseline first use, unconfirmed shared-goal draft, normal confirmed-baseline handoff, missing-information return, stale generated-page refresh boundary, peer-offline / same-identity UI guard, wrong-project room isolation, Drive-sync-delay identity-risk scan, check-aps / check-drive / Live active-packet consistency, and the APS Live controlled handoff completion loop; true two-machine / independent-network verification and public release are not yet completed
Last updated: 2026-06-24 (S240 — APS Live product contract tightened: local AI opens Live only when useful, Live auto-enters real-time alignment, normal first screen hides transport / bridge jargon, and data freshness is separated from collaborator presence.)
Owner surface: Agent Public Squares public product planning

This file defines the product boundary for the APS Live layer. APS Live is part of the APS product standard as the active handoff workbench for an APS collaboration round: it tracks the current handoff stage, shows who acts next, lets participants exchange focused feedback / comments, and sends the result back to local AI before formal APS records are changed. It is also the exception-coordination surface when a blocker appears, but it is not only a problem page. The current product model is an HTML APS Live 交接追蹤工作台 generated or refreshed by `Check APS` when a handoff is active, a baseline / packet needs shared visibility, the user asks to coordinate with a collaborator, or a live coordination candidate exists; `aps live` is retained as an explicit maintainer / manual regeneration command and `aps live --demo-preview` is retained for demo preview. The page carries a Trystero room candidate for real-time peer presence and handoff status checks, plus a localhost `aps live-bridge` for token-protected formal-state refresh, local AI queue handoff, and limited user-confirmed formal progression. User-facing wording should call it APS Live 交接追蹤工作台, 即時對齊, or 即時核對, not a diagnostic receiver, not a generic chat room, and not a dashboard. The user should only need to read and use the generated page; they should not be instructed to ask AI to run `npx aps live` before APS Live can appear in the normal Check APS route. "No mandatory Live blocker" means Live is not required to repair state; it must not be worded as "Live is unnecessary" when the user wants real-time alignment. It is not a general APS record writer and not a promise that local AI sessions can be woken automatically. Trystero messages never write APS formal state. Limited Live-initiated state changes are allowed only through local `live-bridge`, after fresh Drive-state read, server-side preflight, explicit user confirmation, and read-back verification. This status does not certify reliable cross-machine APS Live, npm release readiness, true two-machine operation, real-user comprehension, or full first-use product-flow coverage. S105-style same-machine evidence proves only the exact scripted branch it ran: a baseline already existed, the receiver consumed it, then a missing-information handoff moved through Live and formal local-AI actions. The current local executable regression adds adjacent user-flow coverage for no-baseline first use through `Check APS`, unconfirmed shared-goal draft, normal confirmed-baseline handoff, missing-information return, stale generated-page refresh boundary, peer-offline / same-identity UI guard, wrong-project room isolation, Drive-sync-delay identity-risk scan, active packet consistency across `check-aps`, `check-drive`, and APS Live, and a controlled normal-handoff completion loop where the receiver uses live-bridge consume, the sender reads that result with `status --packet-id`, the sender closes through live-bridge, and `status --packet-id` reads back `已收結`. OPS browser evidence additionally proves the no-baseline generated page visibly blocks `共同基準` and exposes the refresh path. It still must not be generalized to real Trystero peer-offline events, real Drive sync timing, real human comprehension, or real two-device operation.

## Purpose

APS Live exists to let joined APS participants keep the same handoff round visible while it is being coordinated. During an active handoff window, users may keep the APS Live workbench open to track stage, see who acts next, receive status / feedback / comments, align on missing information or disagreement, and decide whether to progress, reject, return, or ask local AI to draft the formal next step. A handoff packet is treated like a logistics waybill: it has a sender, receiver, current station, next responsible person, source pointer, start condition, and final formal status. Live discussion is allowed when it serves that tracking record; it must not become an empty social chat. When discussion needs formal APS action, it returns to the local AI conversation / terminal APS flow for user-approved action.

## APS Live Product Contract

APS Live must be experienced as one product surface, not as separate transport / bridge / queue systems. When local AI gives the user an APS Live link, the page is expected to open into a useful handoff workbench, not a technical repair screen.

### Decision Landing / 決策落地

This table is the one-place APS Live product contract for first-screen behavior and local-AI handoff. Update it before changing generated APS Live HTML, `Check APS` / `check Drive` Live routing, local AI queue handoff, live-bridge user-facing behavior, APS skill guidance, or OPS product-grade QC rules. It is a product contract, not proof that runtime already complies.

| Decision area | Current contract | Applies when | Must not infer |
|---|---|---|---|
| When local AI opens Live | Local AI opens or refreshes APS Live when shared visibility can reduce handoff confusion: active handoff, shared-goal confirmation, missing information, return handling, disagreement, or next-round coordination. | `Check APS`, `check Drive`, APS natural-language handoff routing, and explicit "open APS Live" requests. | Do not open Live as a technical diagnosis page, and do not tell users to manually generate Live as the normal route. |
| First visible screen | The page shows current project / handoff state, collaborator presence, next action, and whether the action changes formal APS records. | Every generated APS Live page and browser fixture. | Do not expose Trystero, localhost, bridge, queue, raw room ids, tokens, `CLI`, `terminal`, or sync-service wording on the normal first screen. |
| Connection behavior | The page auto-attempts real-time alignment on load. Visible connection controls are retry / recovery, not the normal first step. | APS Live page load, reload, peer rejoin, and recovery flows. | Do not make the user choose a connection layer before they can understand the handoff state. |
| Formal truth boundary | Drive packet / outbox / ack records remain formal truth. Live chat, page load, browser history, and queue handoff do not write formal APS state. | Chat, comments, local AI handoff, and limited live-bridge actions. | Do not treat collaborator presence, chat delivery, or queued local-AI tasks as formal receipt, acceptance, completion, or close. |
| Local AI continuation | When page output needs AI summarisation, drafting, or ordinary formal APS action, the user returns to the local AI conversation with a copyable next sentence or queued item. | Draft handoff, shared-goal rewrite, publish / revise / withdraw, complex judgement, and ordinary continuation. | Do not imply the page can wake an AI session automatically or silently finish a formal action. |
| Recovery wording | Recovery is secondary and explains how to refresh or repair only when needed for in-page freshness or a blocked formal action. | Stale generated page, wrong project, invalid token, bridge unavailable, or page-level formal action requiring fresh read. | Do not make recovery wording look like APS Live is broken when the user can continue through the local AI conversation. |
| Version display | Version / compatibility appears only when it helps avoid a bad handoff. | Peer mismatch, stale installed APS, blocked action, or diagnostics. | Do not show raw version noise as normal first-screen status unless it changes the user action. |

The first visible screen must answer only three operational questions:

1. Has the page been generated from the latest APS project state that local AI just checked?
2. Is the collaborator currently in this APS Live page for real-time alignment?
3. What is the next user action, and does it change formal APS records?

The page must auto-attempt real-time alignment on load. A visible connect control is a retry / recovery control, not the normal first step. Local identity text must mean "this page belongs to this APS user"; it must not use wording such as "本機已連線" that can be confused with peer presence, Drive sync, bridge availability, or formal-state freshness.

The normal first screen must not expose Trystero, localhost, bridge, queue, raw room ids, tokens, `CLI`, `terminal`, or sync-service wording. User-facing copy should say `本機 AI 對話` when the next step is to return to the AI chat. Technical terms may appear only in maintainer docs, full diagnostics, or an explicitly opened advanced recovery panel.

Formal project status is still Drive / packet / outbox / ack truth. APS Live may show a recent `Check APS` state immediately, may refresh through local bridge when available, and may offer a copyable recovery instruction when refresh is needed. Failure to refresh formal state inside the page must not look like APS Live itself is broken if the workflow can continue through the local AI conversation.

The advanced recovery panel is allowed only as self-rescue: stale generated page, wrong project, invalid bridge token, or a page-level formal action that needs a fresh read. It must be hidden or secondary during normal work, must never imply the collaborator is offline, and must never be required just to read the stage and next action.

Version information is useful only when it helps users avoid a bad handoff. The first screen may show compact compatibility wording such as `APS 工具：相容`, `APS 工具：需更新`, or `APS 工具：未能確認`. Raw version numbers belong in details / diagnostics unless a mismatch blocks a formal action.

The operating spine is:

```text
Local AI conversation: Check APS / check Drive
-> open or refresh APS Live as the handoff workbench when a handoff round is active, a collaborator needs shared visibility, or live checking can reduce confusion
-> APS Live auto-attempts real-time alignment and exchanges stage status, feedback, comments, and focused coordination messages
-> user either sends the discussion into the local AI pending queue, or chooses a limited formal action exposed by local live-bridge
-> live-bridge re-reads formal APS state, preflights the action, asks for explicit user confirmation, writes only if still valid, and reads back the result
-> for publish / revise / withdraw / complex shared-goal rewrite, local AI still drafts and asks for user approval before the APS command writes formal state
```

APS Live is not the user's goal. The user's goal is to move their project handoff forward with less confusion.

## Product Leadership Rule

APS Live must be led by APS state, not by an empty chat-room metaphor. The product owner / implementing AI must design it as a context-bound handoff-tracking surface:

- `Check APS`, `check Drive`, or local AI decides why Live is useful now: active handoff workbench, real-time alignment, missing information, objection handling, or status drift.
- The generated page carries the current APS collaboration directory, shared-goal state, relevant handoff chain, packet / version, peer confirmation state, missing information, and the exact question that needs live confirmation.
- The first visible screen must show tracking state before discussion: current station, whether the receiver can start, who is responsible for the next move, blocker reason, and the next formal APS action.
- A shared goal can contain multiple handoff chains, but the first usable slice shows one active handoff ticket clearly. Future multi-chain views may show related or dependent tickets, but must not replace the single-ticket tracking card as the first screen.
- The page helps both sides clarify source, version, role, status, and objections, but it must not replace the formal handoff packet. If a handoff lacks a receiver-readable source pointer, Live should ask for the missing shared source and then send the discussion back to local AI for a user-approved APS revision.
- The first visible screen shows a tracking card: what this handoff is, where it is in the flow, what AI already knows, what to ask the collaborator if blocked, and what must return to the local AI conversation before it becomes formal APS truth.
- The message area must carry context without impersonating the user. For an active handoff or a selected issue, use a short contextual placeholder or a clearly editable short draft when helpful. For no-active-handoff alignment, receiver waiting, or next-round preparation, the textarea must start empty or use placeholder text only; never prefill a long handoff-draft-like message.
- The local AI queue payload must include the current APS context and selected intent, not only raw chat messages.

If APS Live opens without project context, relevant APS state, handoff chain status, or a clear next decision, it is not meaningfully different from a normal chat tool and should not be considered successful APS Live.

## Four-stage Main Flow + Internal Product Gate

APS Live's normal first screen must use four non-technical stages:

```text
準備交接包
-> 確認並發出
-> 對方查看 / 處理
-> 檢查回覆 / 收結
```

These four stages are the user-facing navigation layer. They tell a new user what is happening, whose turn it is, and which primary action to take. They must not expose the detailed APS state machine as the main progress bar.

The older six-stage path remains the internal product-flow gate:

APS Live is not considered product-flow complete until this exact internal six-stage path is proven with two APS identities:

```text
共同基準
-> 已發出
-> 對方查看
-> 可開工判斷
-> 處理 / 補資料
-> 正式更新
```

Each internal stage must have evidence of transition. Showing the four main labels on the page is not enough.

| Stage | Product meaning | Minimum evidence |
|---|---|---|
| `共同基準` | A current shared goal / roles baseline exists, or the lack of one is the explicit blocker. | Terminal or packet evidence names the baseline version / missing baseline, and both identities see the same baseline state. |
| `已發出` | A formal shared-goal item, packet, or handoff ticket has been issued through APS state, not merely typed in Live. | Sender-side local-AI / APS-command evidence and Live ticket state point to the same issued work item. |
| `對方查看` | The receiver identity sees the same active ticket and reports its visible state. | Receiver-side page / local-AI evidence shows the ticket, sender, receiver, `任務`, `真源`, and `開工條件`. |
| `可開工判斷` | The receiver makes a concrete decision: can start, needs missing information, disagrees, or must wait. | The decision is recorded as a receiver-side Live reply or local-AI judgement, with reason. |
| `處理 / 補資料` | The chosen branch is acted on: coordination, missing-info request, objection, or start-ready handling. | Live discussion and local-AI queue evidence show the branch and the proposed next formal action. |
| `正式更新` | Local AI proposes the formal APS update and the user approves or explicitly blocks it. | Formal APS command evidence records the user-approved update, or the ledger records the block. Live alone must not write this stage. |

This internal six-stage path is the product-flow gate. Trystero peer discovery and messaging are transport evidence. Local queue write / readback is bridge evidence. Unchanged packet / outbox / ack hashes are formal-boundary evidence. None of those can replace a missing internal six-stage transition. A same-machine pass may be recorded only for its declared branch. The general product-flow gate remains partial until the same internal stage labels are proven across the important first-use and negative variants, including the case where no `shared_goal_and_roles` baseline exists and `共同基準` must be blocked in the internal state rather than treated as completed.

The six-stage gate is a user-journey matrix, not a single happy-path script. A branch can pass only for the exact user flow it exercises. APS Live must not be called six-stage complete until the common first-use and daily-use flows below each have their own evidence row or an explicit blocked row:

| User flow | Required internal proof |
|---|---|
| First use with confirmed peer but no valid shared goal | `Check APS` must auto-generate APS Live, show the main stage as `準備交接包`, keep internal `共同基準` blocked, and return the user to local AI to draft `shared_goal_and_roles`; it must not mark the baseline done. |
| Shared-goal draft / unconfirmed baseline | The page must show a confirmation chain, receiver-side decision, and local-AI return path for agree / partial agree / object / later. |
| Normal handoff after confirmed baseline | The receiver sees the active ticket, makes a can-start judgement, and any Live discussion returns to local AI before formal state changes. |
| Missing information / return branch | Live may clarify what is missing, but the formal result is still a APS command `decline`, `revise`, `consume`, or `close` after user approval. |
| Stale, wrong project / identity, peer offline, or Drive sync delay | Live must surface the mismatch as the current blocker and must not treat presence, old HTML, or local queue history as APS ack or Drive sync. |

Current local executable coverage: PUBLIC `dev/qc/check_context_index.cjs` now checks all locally fixture-able rows above except true browser transport. It verifies that no-baseline first use enters through `Check APS`, uses the four-stage main flow, and keeps internal `共同基準` blocked; unconfirmed shared-goal drafts keep internal `共同基準` in progress rather than completed; normal confirmed-baseline handoff reaches the `對方查看 / 處理` main stage with internal `可開工判斷`; missing-information return blocks internal `可開工判斷` with a concrete missing-source / start-condition reason; stale generated pages carry a refresh-formal-state boundary and do not keep local-AI state pending after bridge consume; no-peer / same-identity pages keep send actions disabled until a real collaborator is present; wrong-project pages do not reuse the same room id; Drive-sync-delay-shaped incomplete peer artifacts surface as identity / sync risk; and `check-aps`, `check-drive`, APS Live, and localhost `live-bridge` point to the same active packet for the normal handoff branch. The controlled handoff completion loop starts a real localhost bridge and proves invalid-token rejection, formal-state refresh, preview without write, commit-without-confirm rejection, confirmed receiver `consume`, receiver-side `check-aps` / `check-drive` pending clearance, sender-side `status --packet-id` consumed readback, bridge-confirmed sender `close`, sender-side `status --packet-id` closed readback, missing-information `decline`, and post-write read-back verification. Each run writes `aps-live-controlled-handoff-completion-loop.json` under the disposable `dev/qc/evidence/context-index-regression-*` folder with the stage ledger. OPS browser evidence under `dev/qc/evidence/aps-live-local-gap-qc/` verifies the no-baseline generated page visually. These remain local regression checks only. They do not prove real Trystero peer-offline events, true two-machine Trystero reliability, real Drive sync timing, real user comprehension, npm / GitHub release readiness, or external notification delivery.

Passing one of these rows never upgrades the others. A report that says "six-stage passed" without naming which row was exercised is not a valid APS Live product-flow claim.


## APS Live Stage UX Specification

This section is the source of truth for the user-facing APS Live stage flow after a shared goal and roles baseline exists. It does not add a new formal APS write surface. It defines how the existing `進度與決策` and `釐清問題與求助 AI` tabs must guide a non-technical user at each stage. The visible main flow is four stages; the internal six-stage state remains available to local AI and regression ledgers.

Core UX rule: APS Live is stage-led, not feature-led. Every visible state must answer these five questions in plain language:

1. Where are we now?
2. Who should act next?
3. What is the one primary action?
4. Is this only Live coordination, local-AI drafting, or a formal APS write?
5. What screen or command should the user expect after the action?

The two APS Live tabs have fixed roles:

| Tab | Product role | Must do | Must not do |
|---|---|---|---|
| `進度與決策` | Primary driving surface. It tells the user the current stage, next actor, one primary action, one optional supporting action, and formal-write boundary. | Always show a clear next action, even when no formal action is available. | Show `目前沒有正式決策` as the main message when the correct next step is local-AI drafting. |
| `釐清問題與求助 AI` | Supporting work area for remarks, feedback, follow-up questions, missing information, disagreement, and selected Live discussion handoff to local AI. | Return the user to the primary stage after coordination, with a concrete local-AI next step. | Become a second competing workflow, or require the user to discover the correct next step by reading internal options. |

When `formal_actions` is empty, the page must still show a primary action if the APS stage has a valid non-formal next step. Empty formal actions means "Live cannot write a formal APS record here"; it must not be presented as "nothing to do."

When page-level formal refresh is unavailable, APS Live must distinguish a normal usable page from a blocking repair. If the current stage can continue through the local AI conversation, the page should say it is showing the latest state from the local AI check and keep the main next action on the workflow. The page-level refresh entry is secondary in that case. It becomes a primary blocker only when the user is trying to run a page-level formal action that requires a fresh state read. User-facing copy should say local AI conversation or the AI chat the user just used, not CLI, terminal, sync service, or snapshot mode, unless the page is explicitly speaking to maintainers.

### Stage-by-stage UX Contract

| Stage | Entry condition | Sender view primary action | Receiver view primary action | Supporting action | Formal-write boundary | Exit / next visible state |
|---|---|---|---|---|---|---|
| `共同基準` missing | No valid shared goal and roles baseline. | Ask local AI to draft shared goal and roles. | Same if receiver is the first user seeing the gap. | Use Live only after a confirmed peer exists and the draft needs live discussion. | Live must not create the baseline directly. The local AI drafts, user approves, then APS writes `shared_goal_and_roles`. | Shared-goal draft waiting for peer confirmation. |
| `共同基準` draft waiting | A shared-goal packet exists but the relevant peer has not confirmed or has objected. | Wait for peer, or revise after feedback. | Confirm baseline, ask for changes, object, or defer. | Live may clarify wording, roles, first round, and acceptance criteria. | Live may only use bridge-confirmed confirm / decline for the existing shared-goal packet; complex rewrite returns to local AI. | Confirmed baseline, declined baseline, or revised baseline draft. |
| `準備交接包` | Shared goal is confirmed, no active formal handoff packet exists. This is not an empty state. | **Primary:** hand current alignment to local AI to draft the first / next formal handoff package. | Reply to alignment or state what the receiver can accept; do not look for a formal task yet. | Use Live to align next goal, recipient, work request, deliverable, true source, constraints, and unknowns. | Live must not publish. The local AI prepares a handoff confirmation card; user confirms before Drive write. | `確認並發出` in local AI, or continued Live alignment if not enough information. |
| `確認並發出` | Local AI has prepared a formal handoff draft from the alignment. | Review recipient, task, true source pointers, start condition, not-to-do scope, risks, and delivery standard; confirm or revise. | Wait; the page should say the sender is still reviewing a draft and that no formal task has been sent yet. | Return to Live only if a point needs peer clarification before write. | Formal packet is written only after explicit sender approval. | Formal packet exists in sender outbox. |
| `對方查看 / 處理` | A formal packet exists, or the receiver is viewing / judging the packet. | Wait for receiver, or use Live only to check whether receiver sees the same packet / version. | Check Drive / Check APS to view the packet, then judge whether the receiver can start. | Ask sender for clarification if source, scope, version, or deliverable is unclear. | Live presence or message is not receipt. Viewing alone must not consume or accept. Accept / decline may be bridge-confirmed only after fresh state read, preflight, explicit confirmation, and readback. | Receiver branch: can start, missing information, disagree / cannot take, or wait. |
| `可開工判斷` | Receiver has enough context to choose a branch. | Wait for receiver branch. | Choose one: can start, missing information, disagree / cannot take, or wait. | Live may capture the reason in plain language. | Accept / decline may be bridge-confirmed only after fresh state read, preflight, explicit confirmation, and readback. Revision / supplement returns to sender local AI. | `處理 / 補資料`. |
| `處理 / 補資料` | Receiver branch has been chosen. | If receiver asks for more information, revise the same packet or send supplement after local-AI draft and approval. | Work on the task, or send missing-info / objection reason. | Live may coordinate the missing point, but must send the result back to local AI for formal action. | Live must not auto-revise, auto-publish, or treat discussion as completion. | Receiver ack / decline / reply, or revised sender packet. |
| `正式更新` | A user-approved formal action has been written or explicitly blocked. | Review the receiver result, then decide whether to close, revise, or start a new round. | If accepted, continue the work; if already replied, wait for sender close or revision request. | Live may explain the written result, but formal truth is packet / outbox / ack. | Close is only by sender after confirming the line is complete. | Closed handoff, revised handoff, or next-round preparation. |

### Primary-action wording rules

Use these labels for the main button or main instruction. The exact peer names and topic details must be generated from current APS state.

| State | Primary wording |
|---|---|
| Shared goal missing | `交給本機 AI 起草共同目標與分工` |
| Shared goal draft waiting | `確認共同基準` / `退回要求修訂` |
| Confirmed baseline, no active packet, sender view | `交給本機 AI 草擬交接包` as a visible primary button in the main stage card; the button queues the current Live alignment for local AI to list next-round goal, recipient, deliverable, true source, and gaps. It must not imply that a formal packet is ready before enough information exists, and it must not write formal APS records directly. |
| Confirmed baseline, no active packet, receiver view | `補充可接收範圍或需要的資料` |
| Live alignment completed but no formal packet | `回到本機 AI，確認交接卡後才會寫入 Drive` |
| Sender waiting after publish | `等待對方查看；需要時用 Live 核對對方是否看到同一件交接包` |
| Receiver viewing packet | `判斷可否開工` |
| Receiver missing information | `退回，請對方補資料` |
| Sender sees receiver result | `確認是否收結這條交接` |

The phrase `目前沒有正式決策` may appear only as secondary explanation. It must never be the dominant message when the page can offer a local-AI drafting, Live alignment, waiting, or receiver judgement action.

### Button result contract

Every APS Live button must end in one of three user-understandable result states. The page must not stop at an internal explanation such as "queued", "bridge connected", or "formal-state updated" without telling the user what to do next.

| Button family | Required result state | User-facing requirement |
|---|---|---|
| Local-AI handoff buttons | A visible operation card beside the button. | Show `已放入本機 AI 待辦` or a clear fallback, plus a textarea labelled as the next line to paste into the local AI conversation. The line must be a complete user sentence such as `Check APS，處理 APS Live 待辦...`, not an internal payload or policy explanation. This operation result is part of the user workflow: reloading the APS Live HTML must restore the last queued / fallback local-AI operation beside the relevant control, so the user does not repeat the same handoff because the page looked undone. Clearing the page history may clear this local operation hint, but must not alter formal packet / outbox / ack truth. |
| Formal decision buttons | A formal-state readback result after confirmation. | After preflight and explicit confirmation, show that the formal record was written and read back, then provide the next line to paste into local AI so it can continue from the latest formal state. If the action is cancelled or preflight fails, say no formal record changed and provide the recovery action. |
| Live message / alignment buttons | A waiting or handoff result. | After sending or saving a Live message, say whether the collaborator is expected to reply, whether the message is only a saved draft, and which visible button to use if the user wants local AI to summarise the alignment. |
| Local-AI queue follow-up | A deduped pending item and a reviewed archive path. | Repeated clicks for the same Live discussion must not create multiple visible next actions. `Check APS` and `live-queue` should merge duplicate queue items for the user, and after local AI has produced a draft it must have a clear way to archive reviewed Live queue items without changing formal packet / outbox / ack truth. |
| Sync / repair buttons | A repair or retry result. | If local APS is unavailable, show a copyable repair instruction for the local AI and keep the user-facing distinction between peer presence and formal progress sync. |

The same rule applies across the four visible stages (`準備交接包`, `確認並發出`, `對方查看 / 處理`, `檢查回覆 / 收結`) and the internal six-stage gate (`共同基準`, `已發出`, `對方查看`, `可開工判斷`, `處理 / 補資料`, `正式更新`): the user should either see the next visible page action, or receive one exact line to paste into local AI. Explaining why APS Live cannot write formal state is not enough on its own.

### Sender / receiver role guidance

For the same APS collaboration state, Adam-side and sandbox-side pages may need different primary text:

| Situation | Sender page should say | Receiver page should say |
|---|---|---|
| Shared goal confirmed, no packet | `下一步是準備交接包。你可先對齊；資料足夠後才草擬正式交接包。` | `本輪正式交接包尚未建立。你正在補充交接包資料，不是收正式任務。` |
| Sender wrote Live alignment message | `等待協作者回覆，或把目前對齊交給本機 AI 草擬。` | `回覆你能接甚麼、需要甚麼、交回甚麼才算完成。` |
| Formal packet sent | `已發出，等對方查看。Live 只能核對對方是否看到同一件。` | `你收到一件正式交接。先看任務、真源、開工條件，再判斷。` |
| Receiver asked for more information | `需要補資料。優先修訂同一條交接線或補充真源。` | `已說明缺甚麼；等待對方修訂或補充。` |
| Receiver accepted or replied | `查看對方結果，決定是否收結。` | `已回覆；等待發送方收結或要求修訂。` |

### UX acceptance checks

A page or CLI change touching APS Live stage guidance must pass these checks before it can be called product-ready:

1. A non-technical user can identify the current stage and next actor from the first visible screen.
2. `進度與決策` has one primary action for every valid APS stage, including "confirmed baseline with no active packet."
3. `釐清問題與求助 AI` never becomes the only place where the correct next step is discoverable.
4. When `進度與決策` already exposes a primary button, its surrounding copy must not point users to another tab button as if it were the main action.
5. The page never implies that Live chat, presence, or local queue write is a formal packet, ack, consume, decline, revise, publish, or close.
6. Sender and receiver pages use role-specific text when the correct action differs by role.
7. After a Live-to-local-AI handoff, the success state says what the user should do next and whether Drive has changed.
8. The `已發出` stage cannot become done until a formal APS packet or shared-goal item exists in APS state.
9. Normal user-facing UI must avoid exposing command / terminal / bridge / write jargon as the main instruction. If a technical boundary must be mentioned, express it as user outcome: whether a formal record will change, and who will confirm it.
10. In the confirmed-baseline / no-active-packet state, the page must not present `formal handoff package` as ready merely because the baseline exists. The primary action is to organise a next-round draft and surface missing goal / recipient / deliverable information; only local AI plus user confirmation may later turn it into a formal packet.


## Minimum Useful Slice

The first user-facing APS Live surface should show only the smallest workflow a non-technical user needs. The page is an operation surface, not a policy document.

1. Show the handoff-tracking card: chain, current station, whether work can start, who is responsible, blocker, and next formal action.
2. Connect to the collaborator only when live coordination is useful.
3. Send focused status-check or missing-information messages.
4. Send the discussion to the local AI pending queue with a clear follow-up intent.
5. Return to the user's local AI conversation for AI summary, judgement, draft action, and user-approved formal APS write-back.

The page must not assume the user already knows why APS Live was opened. The first screen must explain the preceding situation in user terms: this handoff chain is at a specific station and either can move forward or needs live coordination. It must then show the current job-to-be-done, the blocker if any, the completion standard, and the return path to the local AI conversation.

The current normal user-facing layout is locked to the latest APS Live 交接追蹤 direction:

1. Top bar: page title `APS Live 交接追蹤`, collaboration directory name, and participant identity pills generated from APS collaboration directory state.
2. One main `交接單` ticket card: human order label, title, sender, receiver, current station, and visible status. The first supported view shows one primary ticket such as `交接單 1/1`; future related tickets may be summarized separately but must not displace the primary ticket.
3. One visual progress tracker: created, sent, receiver seen, start judgement, and complete / returned. It must not rely on colour alone: every stage needs an explicit icon plus text status such as `已完成`, `進行中`, `未通過 / 需處理`, or `未開始`.
4. Three human-readable handoff detail rows: `任務`, `真源`, and `開工條件`.
5. One status area: real-time alignment auto-starts on load; any visible connect control is a retry / recovery control. The area separates collaborator presence from formal data freshness and must not make technical connection repair look like the first workflow step.
6. One `交接事件紀錄` timeline below the ticket card, with a compact default view and an expandable full history when entries grow. It must show handoff time concepts: when tracking started, when the formal packet / view state is known, when Live comments happen, and whether the ticket has been formally closed / returned. Unknown timestamps must be visibly labelled as pending or unrecorded, not left blank.
7. One operational stage guide labelled around `目前階段與正式操作`, not a generic tutorial. It tells non-technical users the current status, where the formal action happens, and one line they can tell the local AI conversation for that stage.
8. One `協調與回應` block: quick reply buttons, editable draft, send button, stateful status, current-room message history, and the local-AI return panel after the discussion. The local-AI button should be phrased as drafting or summarising the next step, not completing formal APS state.
9. One return line that tells the user to go back to the local AI conversation for formal APS action, plus a small set of explicit next-step options: confirm / agree, object, return / request more information, and close. These options may draft formal APS actions only; they must not imply Live itself writes formal state.

This is the only current UI direction for normal APS Live. Do not reintroduce the old five-panel layout, standalone shared-goal chain board, upstream-context panel, separate `發給協作者`, separate `目前狀態`, duplicated connection areas, or a separate `交回本機 AI` panel. If future design adds multi-chain management, it must sit around or after the active ticket card; it must not turn the first screen into a board, table dump, or generic group chat.

Identity rule: APS Live is a product surface, not a one-off Adam / Jay task. Participant labels must come from the current APS collaboration directory config, peer cards, packet sender / receiver, or generated demo fixture data. `Adam` and `Jay` may appear only as clearly marked examples, tests, screenshots, or demo fixtures. They must not be hard-coded as the product's identity model, default participants, CSS / DOM assumptions, room identity, or user journey contract.

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
4. A compact "what changed after discussion" review step before returning to local AI.
5. A separate maintainer / debug view for room id, raw payloads, peer diagnostics, console evidence, and status broadcasts.
6. Optional templates for repeated situations such as shared-goal confirmation, missing information, and status mismatch.
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
- Produce a draft APS action for local-AI confirmation, such as revise, decline, consume, close, or a new clarification packet.

APS Live must not do these things:

- Store the formal handoff truth.
- Treat chat history as a substitute for packet body, shared source pointers, receiver start conditions, or Drive records.
- Replace packet / outbox / ack / peer card / shared goal records.
- Act as a task board, audit page, unbounded social chat, or replacement for project tools outside APS handoff / consensus work.
- Promise that the other side has received, read, or accepted a handoff.
- Treat online presence as Drive sync.
- Treat a live message as an APS ack.
- Auto-start Codex, Claude Code, or any other AI session.
- Push messages into a running AI session as if it were a native APS capability. The supported route is a local pending queue that local AI reads on request.
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
| State-write boundary | What, if anything, is written after a live exchange. | Trystero and browser-local history never write APS formal state. Local `live-bridge` may write `_context/live_queue`, refresh formal state, or execute limited formal actions using the same APS functions as CLI. |
| User confirmation gate | Which user-visible prompt must be approved before formal APS state changes. | Live-initiated formal actions require fresh Drive-state read, server-side preflight, explicit user confirmation, and read-back verification. `publish`, `revise`, `withdraw`, and complex shared-goal rewrites remain local-AI actions. |

Trystero source note: the official `dmotz/trystero` GitHub README, checked 2026-06-14, describes CDN import from `https://esm.run/trystero`, `joinRoom({ appId }, roomId)`, peer presence callbacks, and current object-style `makeAction` usage through `action.send(...)` and `action.onMessage = (...)`. Local probing confirmed the CDN module currently returns action objects with `send`, `onMessage`, and `onReceiveProgress`, not the older array destructuring shape. This supports a live message channel. It does not make APS formal state durable and does not wake local AI conversations by itself.

Current implementation note: `Check APS` generates or refreshes `_context/aps-live_<agent>.html` automatically for the current APS collaboration directory when the user needs the handoff workbench, when an active / pending / recently coordinated handoff exists, when a shared-goal or packet state needs shared visibility, or when the live-routing section is relevant, then prints the local APS Live path for the user to open. If there is no mandatory Live blocker, `Check APS` must say that Live is optional for alignment, not that Live is unnecessary. The explicit `aps live` command remains available for maintainers, repair flows, and manual regeneration; it creates the same page and a local bridge token in `_context/live_bridge_token.json`. `aps live-bridge` starts a localhost receiver that accepts token-protected Live follow-up items, writes queue material to `_context/live_queue`, refreshes formal APS state, and performs only the limited bridge-confirmed formal actions. `aps live-queue` reads the queue for the local AI conversation, while `check-aps` surfaces that queue only when something is waiting. `aps live --demo-preview` can generate a standalone demo HTML, and `check-aps --demo-preview` must not write HTML; it only states that formal project runs auto-generate APS Live. `--dry-run` checks the same page plan and status fields without writing HTML or APS formal state. The current normal page uses the locked 交接追蹤工作台 UI above: top bar with formal sender / receiver plus third-party coordination boundary, one numbered primary ticket card, progress stages with explicit icon + text status, `任務` / `真源` / `開工條件`, one status area that auto-attempts real-time alignment and keeps connection controls as retry / recovery only, compact-plus-expanded timestamped event log, operational stage guide, one coordination block, one post-discussion local-AI return panel, a separate formal-state loaded-time line, and controlled formal action buttons for valid `consume`, `decline`, shared-goal confirmation, or sender `close` states. When no valid shared-goal baseline exists, APS Live must show that `共同基準` is blocked and must direct the user back to local AI to create a shared goal and roles draft before ordinary task packets. When a shared-goal draft exists but is not confirmed, APS Live must keep `共同基準` in progress, not completed. The page imports Trystero from `https://esm.run/trystero`, calls `joinRoom({ appId }, roomId)`, assigns `onPeerJoin` / `onPeerLeave`, and defines `makeAction` channels for `aps-message`, `aps-status`, `aps-feedback`, and `aps-consensus`. Coordination messages carry `message_id`; the page uses short warmup resends plus receive-side de-duplication so messages sent immediately after peer discovery can still arrive once the WebRTC data channel is ready. Browser-local session history uses `sessionStorage` key `aps-live-session-v1` as a same-machine preview convenience only. Same-machine structural and journey checks have passed only for declared local branches, local browser proof has passed for no-baseline visual state, and the local controlled completion loop has passed for invalid-token rejection, preview no-write, confirmed receiver consume, receiver pending clearance, sender consumed status readback, confirmed sender close, sender closed status readback, confirmed decline, and read-back verification. Cross-machine end-to-end behaviour, real Trystero peer-offline behavior, real Drive-delay timing, true two-peer Trystero message exchange, real human comprehension, and external notification delivery still need verification before public docs may present APS Live as reliable cross-machine support.

Bridge port note: `aps live` and `aps live-bridge` use a deterministic localhost bridge port derived from the resolved APS hub root and collaboration directory by default. Multiple AI project sessions on the same computer may therefore keep different APS collaboration directories open without sharing one fixed bridge port. Same collaboration directory plus same local hub path resolves to the same port so each agent page and bridge for that project still meet at one local endpoint. `--port` / `--bridge-port` is a maintainer override and must be treated as a possible manual-collision source during support.

Trystero QC gate: APS Live is integrated into the APS product standard as a local-supported handoff-tracking capability, but cannot be promoted to reliable cross-machine support until the dedicated module `dev/qc/aps-live-trystero-qc.md` passes. That module must test more than "two tabs opened": it must cover the six-stage product flow, two machines or two isolated browser contexts, dynamic APS identities, peer presence, bidirectional message exchange, reconnect, offline / no-peer behavior, duplicate-message handling, local-AI queue handoff, Drive formal-truth boundary, user-facing status clarity, APS Live end-to-end operation flow, and 3+ participant presence / coordination while formal handoff remains one-to-one. If APS Live becomes part of the supported full product path, this module becomes a required part of 🔴 全面檢.

APS Live operation smoke standard: the recurring smoke standard lives in `dev/qc/aps-live-trystero-qc.md` under `APS Live Operation Smoke Standard`. It must be used before a human two-machine smoke whenever Live connection, chat, local AI queue, status responses, handoff progression, or formal-state boundary changes. This recurring smoke is a product operation gate, not a one-time demo. It must cover entry path, connect / no-peer / peer-left / reconnect / wrong-project / same-identity states, bidirectional chat, bridge online / offline / invalid-token paths, local-AI `live-queue` readback, local-AI operation result persistence after HTML reload, formal state before / preview / commit / read-back comparisons, six-stage handoff progression, 3+ participant one-to-one boundary, and privacy / security rejection cases. A local or isolated-browser pass keeps development moving, but it must remain labelled local operation smoke and cannot replace the real two-machine Trystero gate.

The APS Live end-to-end operation flow gate must prove the whole path: local AI `Check APS`, `check Drive`, or handoff preflight identifies a live coordination need; APS Live opens with the current project, APS identity, active ticket, sender, receiver, `任務`, `真源`, `開工條件`, blocker, and next formal action; peers coordinate; the user sends a selected follow-up intent into `_context/live_queue`; local AI reads the queue; local AI proposes the formal next step; and the user must approve before any formal APS command writes state. Passing peer-to-peer chat alone is not enough. The same gate must cover bridge online, bridge offline, invalid token, missing receiver-readable source, stale version, peer offline, wrong project, and declined / returned packet cases.

The six-stage product-flow gate must pass before the Trystero evidence can be treated as product readiness. The report must state, stage by stage, whether `共同基準`, `已發出`, `對方查看`, `可開工判斷`, `處理 / 補資料`, and `正式更新` were completed, failed, intentionally blocked, or not run. A report that only proves room connection, message delivery, page rendering, queue write / readback, or formal-state non-mutation is a transport / boundary pass, not a product-flow pass.

The 3+ participant gate must prove small-group presence without changing the APS formal model. Three or more APS identities may enter the same Live room and coordinate around a project or ticket, but the active handoff ticket must still show a single sender and a single receiver. At least one run must use non-Adam / non-Jay identities and display names that differ from `agent_id`. A third participant may clarify, supply missing information, or comment on status; that participant must not become a formal recipient, create ack state, consume another receiver's packet, satisfy close conditions, or turn the packet into a group-recipient handoff. A→B and A→C are two separate formal packets, not one group lane. B must not see or consume C-only packets, C must not see or consume B-only packets, and C's Live comment in an A→B discussion may only become coordination material for local AI judgement.

## Entry And Exit

APS Live should be opened or kept open during an active APS handoff round when the user wants to coordinate with collaborators, check stages, receive feedback / comments, or resolve an exception before writing formal state. In the normal user journey, the local AI conversation runs `Check APS`; when Live is useful as a workbench or as an exception path, `Check APS` automatically generates or refreshes the APS Live HTML and shows the path. The user should not need to know or request the generation command. The local AI conversation remains the full formal content surface for install, Check APS, check Drive, publish, revise, withdraw, complex shared-goal rewrite, and any action that requires AI judgement. APS Live may only perform the limited bridge-confirmed formal actions defined above.

### When local AI should offer APS Live

Offer APS Live only after local AI has just checked or prepared the current APS state and the page will be useful on open. `Check APS`, `check Drive`, or a handoff preflight should offer APS Live whenever a user is in an active APS handoff window and wants shared visibility, real-time alignment, feedback / comments, or a lower-risk decision before formal write-back. Typical triggers include:

- A shared goal and roles draft needs peer confirmation, supplement, correction, or objection.
- A handoff round is active and the user wants to keep stage, next actor, feedback, and comments visible.
- The user explicitly asks to coordinate with a collaborator, ask what the other side sees, or align on the next step.
- Adam has written a packet but Jay cannot see it.
- Jay sees an old shared goal while Adam sees a newer one.
- The packet exists but the receiver cannot safely act because evidence is missing.
- One side has declined or requested more information, but the other side has not seen that state.
- Drive sync appears delayed.
- The AI is about to ask the user to wait, revise, withdraw, decline, or send a clarification packet and live peer status may reduce guesswork.

### When local AI should not offer APS Live

APS Live should not be offered as the next step when it would create confusion or bypass a simpler formal path:

- The issue is a normal first-time setup or peer invite.
- There is no shared goal draft, packet, missing-information request, return reason, or confirmation topic to discuss yet.
- The peer is not confirmed.
- The task needs sensitive material, private credentials, or full file content that should not be broadcast through a browser room.
- The user is simply trying to read an incoming packet and no live alignment is requested; `check Drive` remains the receiver-side reading path.

### Exit back to local AI conversation

APS Live must end with a local-AI next line, not with a hidden action.

When the local bridge is running, the preferred exit is one click from Live into the local AI pending queue. The queued item must include the selected user intent, current APS status, and recent Live messages. It must ask AI to summarise and judge first, not to directly apply the conversation.

Examples:

```text
交給本機 AI：請用 APS 根據雙方核對結果，判斷應等待同步、要求補資料、修訂，還是繼續交接；正式動作等我確認。
```

```text
交給本機 AI：請用 APS 為 Jay 產生一份補資料請求草稿，等我確認後才發出正式交接。
```

```text
交給本機 AI：請用 APS 根據 Live 核對結果，列出是否要修訂、退回或等待 Drive 同步；正式動作等我確認。
```

## User Journeys

### First Handoff Setup

1. User asks local AI to use APS for this project.
2. Local AI runs or guides `Check APS`.
3. If no shared goal and roles exists, local AI creates the draft baseline first.
4. If the collaborator is not joined, local AI generates a peer invite; Live is not the next step because there is no confirmed peer to join the workbench.
5. After both sides are confirmed, local AI may offer APS Live as the shared-goal workbench when the user wants live confirmation, supplement, correction, objection handling, or immediate alignment before the baseline becomes working truth.
6. Live shows the shared-goal confirmation as a tracking chain: current station, who must act, whether ordinary work can start, and what needs confirmation.
7. Live exits back to the local AI conversation: send, revise, or confirm `shared_goal_and_roles` through APS if the user approves.

### Second Handoff

1. User tells the local AI conversation: use APS to hand the next part to the collaborator.
2. Local AI checks peer state, shared goal, previous open packets, and risks.
3. If the user wants to create a formal record and the path is clear, local AI prepares the formal packet and asks for approval; APS Live is optional for alignment, not a precondition.
4. If the user wants live coordination, or if the AI sees a mismatch or uncertain status, it may ask the user to open APS Live for that handoff chain.
5. Live lets participants compare the tracking state, visible packet, source / version, missing information, and next responsible person.
6. Live returns a proposed next local-AI action.
7. Local AI asks the user to approve any formal write.

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
| `project` | APS collaboration directory slug or hashed room identity. |
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

Live can refresh formal state and can execute a small set of mechanical formal actions only through local `live-bridge`. Trystero chat, browser session history, and old HTML snapshots are never formal truth.

| Desired outcome | Live / bridge may do | Terminal / local AI must do |
|---|---|---|
| Ask for missing information | If the latest incoming packet is still pending and preflight passes, write `decline` with a user-supplied reason, then read back. | Draft a richer clarification or revise request when the missing information needs new content from AI. |
| Accept incoming packet | If the latest incoming packet is still pending and preflight passes, write `consume` with a specific result, then read back. | Judge the work itself and perform the actual task outside Live. |
| Reject or cannot act | If the latest incoming packet is still pending and preflight passes, write `decline` with a reason, then read back. | Draft longer rationale or negotiation text when needed. |
| Fix wrong packet content | Identify mismatch. | Original sender approves `revise` or `withdraw`. |
| Finish a handoff line | If the user's own outgoing packet is already consumed or declined and preflight passes, write `close`, then read back. | Decide whether a revised packet or follow-up task is needed before closure. |
| Update shared goal | Confirm or decline an incoming `shared_goal_and_roles` packet when still pending. | Create or revise `shared_goal_and_roles` content and send it as a formal packet. |

## Local AI Pending Queue

The queue is the bridge between browser Live discussion and local AI judgement. It is useful only if it gives AI a clear job, not if it dumps raw chat.

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
- Duplicate queue items for the same selected discussion must be merged for the user; repeated clicks must not create repeated next actions.
- Local AI must read and summarise the queue before proposing any formal action.
- After local AI has produced a user-visible draft or decision from the queue, it must be able to move the reviewed queue items to `_context/live_queue_reviewed` so stale Live material does not become the next `Check APS` action again.
- Formal publish / revise / decline / consume / close still needs user approval in the local AI conversation.
- Clipboard prompt fallback is allowed only when `aps live-bridge` is not running.

## Dashboard And Coordination Boundary

APS Live is not a dashboard section. HTML dashboard is retired from the current APS product path; APS Live should be opened from terminal `Check APS`, `check Drive`, or an explicit local AI recommendation, and it must remain a separate handoff-tracking workbench and exception-coordination surface for the APS collaboration directory.

APS Live is not a generic chat room. It may include conversation for active handoff coordination, feedback, comments, blocked chains, unclear status, mismatches, or disputes. Useful APS Live coordination should keep returning to one of these questions:

- Are we in the same project?
- Are we using the same shared goal version?
- Do we see the same packet / ack / close state?
- What is missing?
- Which handoff chain is blocked?
- Who must act next?
- What local-AI action should each side ask the user to approve?

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
| APS Live end-to-end operation flow | `Check APS`, `check Drive`, or handoff preflight can lead into APS Live, then into formal-state refresh, local AI queue, or a limited bridge-confirmed formal action. No hidden write occurs in Live, and bridge online / offline / invalid-token exits remain human-readable and bounded. |
| 3+ participant one-to-one-boundary | Three or more APS identities can be present and coordinate in the same Live context, while the active formal handoff ticket remains one sender to one receiver and no third participant can ack, consume, decline, satisfy close conditions, or become formal recipient by presence alone. Receiver-specific packets remain invisible / non-consumable to the wrong receiver. |
| Coordination is handoff-bound | A normal clear handoff can still proceed through terminal; Live conversation is for stage visibility, feedback, comments, missing information, version mismatch, unseen packet, objection, or unclear start condition. |
| Return to local AI | Every Live journey either ends with a verified bridge result or a specific local-AI next line. |
| Local AI queue | One click from Live can send structured discussion material to `_context/live_queue`; AI must still summarise and ask before formal write-back. |
| No hidden formal write from Live | Live cannot auto-consume, auto-decline, auto-revise, auto-withdraw, auto-close, auto-publish, or ack from Trystero/chat/page load. Limited `consume`, `decline`, and `close` are allowed only through local `live-bridge` preflight + confirmation + read-back. |
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
- `Check APS` remains the local-AI-first read-only status surface. HTML dashboard is retired and must not be used as a current product path or APS Live substitute.
- Public docs must not claim APS Live is shipped as reliable cross-machine support until the Trystero candidate passes two-machine verification and QC.

## Open Implementation Questions

- Whether the first transport remains Trystero plus localhost bridge, or moves to a packaged helper.
- Whether the APS Live HTML should continue to run from `file://` with localhost bridge, or move to a single local web app.
- Whether live diagnostic drafts are stored at all. If stored, they must be separate from packet / outbox / ack and clearly marked non-formal.
- How peers prove that a live room belongs to the same APS collaboration directory without exposing secrets.
- How to avoid leaking local machine paths and sensitive project content through live messages.
