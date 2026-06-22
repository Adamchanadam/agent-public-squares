# APS Live Trystero QC module

Status: draft standard / local product-flow matrix and controlled completion loop covered for fixture-able branches; reliable cross-machine gate not yet passed
Last updated: 2026-06-20
Owner surface: Agent Public Squares public QC

This module defines the dedicated verification gate for APS Live real-time peer-to-peer behavior. It is required before APS Live can be described as reliable cross-machine support. Same-machine preview, two browser tabs, static HTML inspection, or a local queue dry-run are useful development checks, but they do not pass this module by themselves.

## Product Rule

APS Live is a product capability, not a one-off Adam / Jay demo. All tests must prove that the page uses APS project state and packet state to identify participants, room context, handoff ticket, and next action. `Adam` and `Jay` may be used as labelled fixtures only. A pass requires at least one test run with non-Adam / non-Jay APS names so hard-coded identity assumptions are caught.

## Six-stage Product Flow Gate

The basic APS Live product flow is a separate required gate. It must be proven before Trystero transport evidence can be used to promote APS Live. Transport success, page rendering, same-machine screenshots, local queue write / readback, or "no formal state was mutated" evidence cannot substitute for this gate.

The six stages are fixed:

```text
共同基準
已發出
對方查看
可開工判斷
處理 / 補資料
正式更新
```

A pass requires a two-identity operation ledger, even when the run is same-machine. The ledger must show both sides moving through every stage, with the trigger, visible state, evidence source, user or AI decision, and next formal action recorded for each stage. A UI that merely displays these stage labels is not sufficient. The run must prove stage transition, not just stage visibility. A same-machine scripted branch may be recorded as evidence for that branch only; it must not be used to claim full first-use product coverage unless the required negative variants are also exercised.

The six-stage gate is product-flow evidence. Trystero evidence is message-channel evidence. Formal-boundary evidence proves Live did not secretly write APS state. APS Live cannot be called integrated or release-ready unless all three layers pass in the same acceptance package.

This gate is a matrix of common user flows, not one route. Each claim must name the exercised flow: first use with no baseline, unconfirmed shared-goal draft, normal handoff after confirmed baseline, missing-information return, stale page, peer offline, wrong project / identity, or Drive sync delay. A single scripted missing-information branch cannot be renamed into general six-stage coverage. For the first-use no-baseline flow, the upstream trigger must be `Check APS` / `check-aps`, not only a maintainer running `aps live`: the test must prove that a normal user receives the generated APS Live page automatically and that `共同基準` is blocked rather than completed.

Current local executable coverage: PUBLIC `dev/qc/check_context_index.cjs` covers the fixture-able local branches: no-baseline first use through `check-aps`, unconfirmed shared-goal draft with `共同基準` in progress, normal confirmed-baseline handoff with `可開工判斷` active, missing-information return with `可開工判斷` blocked, stale generated-page refresh boundary, no-peer / same-identity send guard, wrong-project room isolation, Drive-sync-delay-shaped incomplete peer artifacts, active-packet consistency across `check-aps`, `check-drive`, and APS Live, plus the APS Live controlled handoff completion loop. That loop starts a real localhost `live-bridge` and proves invalid token rejection, preview no-write, commit-without-confirm rejection, confirmed receiver `consume`, receiver-side pending clearance in `check-aps` and `check-drive`, sender-side consumed readback through `status --packet-id`, confirmed sender `close`, sender-side `已收結` readback through `status --packet-id`, confirmed missing-information `decline`, and post-write read-back verification. Each successful run writes `aps-live-controlled-handoff-completion-loop.json` under the disposable context-index regression evidence folder. OPS `dev/qc/evidence/aps-live-local-gap-qc/` adds a local browser visual proof for the no-baseline generated page. This does not pass the reliable cross-machine Trystero gate and does not cover real Trystero peer-offline behavior, real Drive sync timing, real user comprehension, external notification delivery, or true two-device behavior.

## APS Live Operation Smoke Standard

This is the recurring operation smoke standard for APS Live. It is not a one-off demo record. Run it whenever APS Live connection, chat, local AI queue, status wording, handoff progression, or formal-state boundary changes. It may be run on one machine with isolated browser profiles to catch product-flow regressions before asking for a real two-machine test, but it cannot certify reliable cross-machine APS Live.

The smoke answers one product question: can a non-technical user move from a blocked or uncertain APS handoff into APS Live, coordinate with the collaborator, send the result back to local AI, and return to terminal formal action without hidden writes, split-brain state, or misleading status?

### When To Run

Run this smoke before any true two-machine user test when one of these surfaces changes:

- APS Live generated HTML, status text, connect controls, message controls, browser-local transcript, or local-AI return wording.
- Trystero import, room id, peer join / leave handling, action channels, resend, or de-duplication.
- `Check APS`, `check Drive`, `aps live`, `aps live-bridge`, or `aps live-queue` behavior.
- Formal APS packet, outbox, ack, shared-goal, consume, decline, revise, close, or publish boundary wording.
- UX transcript matrix rows covering first Check APS, Live, missing information, revise, close, or 3+ participant behavior.

### Required Scenarios

Every recurring smoke package must list each scenario as `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`. A missing scenario is a failed package, not an implicit pass.

| Scenario family | Required branches | Pass condition |
|---|---|---|
| Entry path | `Check APS` opens or refreshes Live; `check Drive` or handoff preflight can recommend Live; maintainer `aps live` regeneration remains secondary. | The user is not told to run technical commands as the normal path. The page opens only with project, user, active ticket, blocker, and next formal action context. |
| Connection | no peer, peer joins, peer leaves, reconnect / reload, stale page, same identity in another tab, wrong APS project / room. | The visible state is current and plain-language. Same identity and wrong project are not counted as valid collaborators. Offline means only not present in Live now. |
| Chat | A sends to B, B sends to A, near-simultaneous sends, immediate send after peer discovery, duplicate warmup resend. | Both sides see one human-readable message in the right ticket context. Duplicate cards are not created. Chat history remains browser-local convenience only. |
| Status responses | connected, connected without peer, peer left, wrong project / identity, no baseline, unconfirmed baseline, confirmed baseline, normal handoff, missing information, Drive sync delay, declined / returned packet. | Each state gives one clear next user action. Old pending hints do not remain after a later state. No status text claims formal ack, notification receipt, or Drive sync proof. |
| Local AI queue bridge | bridge online, bridge offline, invalid token, selected follow-up intent, recent messages attached. | Online bridge can write `_context/live_queue` local material and can refresh formal APS state. Offline fallback is copyable human-readable text. Invalid token is rejected without queue or formal state writes. |
| Terminal follow-up | `aps live-queue` and `Check APS` surface queued Live material; terminal AI summarises and judges first. | Terminal proposal is a draft or recommendation unless the user chooses one of the limited bridge-confirmed formal actions. `publish`, `revise`, `withdraw`, and complex shared-goal rewrite remain terminal / local-AI approval flows. |
| Formal boundary | Compare formal state before Live, after Trystero chat / queue, after bridge-confirmed limited action, and after any terminal-approved action. | Trystero chat, page load, browser history, and queue handoff do not modify formal records. Local `live-bridge` may modify only the allowed limited actions after fresh read, preflight, user confirmation, and read-back verification. |
| Handoff progression | Six stages from `共同基準` to `正式更新`, including normal handoff, no-baseline block, unconfirmed-baseline block, and missing-information return. | The ledger records both identities, trigger, visible state, queue / terminal evidence, decision, and next formal action for every stage or explicit block. |
| 3+ participant boundary | three distinct identities, non-Adam / non-Jay names, display names differ from `agent_id`, A->B and A->C separate packets, C comments in A->B Live room. | Presence and bounded coordination work, but formal handoff remains one sender to one receiver. Third party cannot ack, consume, decline, close, or satisfy another receiver's packet. |
| Security and privacy | local absolute paths, credentials-like strings, private file snippets, oversized messages. | Sensitive material is not broadcast as receiver instruction. Local paths are not treated as receiver-readable truth. User-facing fallback never exposes raw JSON as the normal path. |

### Required Evidence Package

Store recurring smoke evidence under:

```text
dev/qc/evidence/aps-live-operation-smoke/<YYYYMMDD-HHMMSS>/
```

The folder must contain these files or an explicit blocked reason for each missing file:

| Evidence file | Purpose |
|---|---|
| `summary.json` | Run metadata: APS source commit, OS, browser, network shape, participants, project, room mode, and whether physical machines or isolated browser profiles were used. |
| `scenario-ledger.md` | One row per required scenario branch with `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN`, reason, and next action. |
| `six-stage-ledger.md` | Stage-by-stage product-flow ledger for `共同基準`, `已發出`, `對方查看`, `可開工判斷`, `處理 / 補資料`, and `正式更新`. |
| `events.jsonl` | Structured peer join, leave, reconnect, send, receive, de-dup, queue, and terminal-return events. |
| `screenshots/` | Before / after screenshots or captures for entry, connection, chat, queue return, stale / offline, wrong project, and missing-information branches. |
| `formal-state-before.json` | File list or hashes for formal APS records before Live. |
| `formal-state-after-live.json` | File list or hashes after Live chat and queue creation, before terminal-approved formal action. |
| `formal-state-after-terminal.json` | File list or hashes after the user-approved terminal formal action, or blocked reason if no formal action was approved. |
| `aps-live-controlled-handoff-completion-loop.json` | Stage ledger for the normal handoff completion loop: shared baseline, strict handoff, receiver can-start, bridge consume, receiver readback clear, sender consumed status, bridge close, and sender closed status. |
| `queue-readback.txt` | Terminal readback from `aps live-queue` or `Check APS` showing how local AI should summarise / judge queued material. |
| `browser-console.json` | Browser errors, warnings, and transport diagnostics with secrets redacted. |

### Pass / Fail Policy

- Product-flow evidence, Trystero / browser evidence, local queue evidence, and formal-boundary evidence are separate layers. One layer cannot pass another layer by proxy.
- Same-machine isolated-browser smoke may pass local product operation only. It must be labelled `local operation smoke`, not `reliable cross-machine`.
- True two-machine support requires the same scenario ledger on physical machines or independent network contexts.
- Stale screenshots, mixed project folders, mixed identities, or evidence copied from a different APS collaboration directory fail the package.
- A package fails if user-facing wording asks a non-technical user to operate the core flow through `npx`, raw JSON, room id, packet id, or internal diagnostics.
- A package fails if Live chat, presence, or queue material is treated as formal ack, consume, decline, revise, close, publish, notification receipt, or Drive sync proof.

### Latest Local Operation Smoke

Latest run: `dev/qc/evidence/aps-live-operation-smoke/20260618T114335/`

Result: `partial_with_blocked_transport` — 16 `PASS`, 0 `FAIL`, 2 `BLOCKED`.

Passed locally: `Check APS` generated APS Live, maintainer `aps live` regenerated the page, no-peer send stayed disabled, wrong-project room id was isolated, no-baseline blocked `共同基準`, unconfirmed baseline stayed `進行中`, missing-information status surfaced, localhost bridge accepted a valid queue item, invalid token was rejected, offline fallback text was human-readable, terminal `live-queue` and `Check APS` read queued material, bridge preview did not write formal state, commit without confirm was rejected, bridge-confirmed `consume`, sender `close`, and missing-information `decline` changed formal state only after read / preflight / confirm, read-back verification passed, wrong-recipient consume was rejected in the 3+ participant boundary, local hub path was not exposed in generated HTML, and normal UI did not expose raw JSON.

Blocked locally: real browser peer join / leave / reconnect, and real Trystero A-to-B / B-to-A browser chat. These need isolated browser profiles or true two-machine / independent-network evidence. This run does not certify reliable cross-machine APS Live.

## Required Test Matrix

| Area | Minimum scenarios | Pass condition |
|---|---|---|
| Six-stage product flow | Same-machine two-identity rehearsal at minimum, then two-machine / independent-network proof before release. Run the whole sequence: `共同基準` baseline exists and is confirmed; `已發出` formal packet or shared-goal item is issued; `對方查看` receiver identity sees the same active ticket; `可開工判斷` receiver decides can-start / missing-info / disagree; `處理 / 補資料` the selected branch is handled through Live coordination and local-AI queue; `正式更新` terminal AI proposes the formal APS update and the user-approved command records or intentionally blocks it. Also run the first-use no-baseline branch where no valid `shared_goal_and_roles` exists: APS Live must show `共同基準` as blocked and direct the user back to local AI to create a shared-goal draft, not mark the baseline as completed. | Every stage has evidence from both identities for the branch being claimed. The report distinguishes stage labels shown on the page from actual stage transitions. No Trystero peer event, queue item, screenshot, or unchanged hash may be counted as a substitute for a missing stage transition. A no-baseline page cannot pass if `共同基準` is shown as `已完成`. |
| Check APS first-use Live entry | Confirmed peers exist, no valid `shared_goal_and_roles` exists, and the user runs `Check APS` / `check-aps` as the normal status entry. | `check-aps` auto-generates `_context/aps-live_<agent>.html`; terminal output tells the user to open the generated page; the HTML shows `需先建立共同目標與分工`, marks `共同基準` as `未通過 / 需處理`, and does not show `共同基準：已完成`. |
| Local shared-goal draft branch | A `shared_goal_and_roles` packet exists but is not yet confirmed by the receiver. | APS Live shows the confirmation context, keeps `共同基準` as `進行中`, blocks ordinary task start, and sends the user back to terminal/local AI for agree, partial agree, objection, or later handling. |
| Local normal handoff branch | Shared goal is confirmed and the receiver sees an ordinary handoff with receiver-readable source and start condition. | APS Live or terminal status reaches `可開工判斷` without no-baseline blockers; formal consume / reply remains a terminal/local-AI action requiring user approval. |
| Local missing-information branch | Shared goal is confirmed but the ordinary handoff lacks receiver-readable source, scope, or start condition. | APS Live blocks `可開工判斷`, shows the concrete missing information, and routes to terminal/local AI for decline, revise, consume, or close after user approval. |
| Official API alignment | Re-check current Trystero documentation or source before changing transport code. | The test notes record reviewed source, date, import style, `joinRoom` shape, action API shape, and any unsupported assumptions. |
| Identity | Same identity opened twice; two different identities; non-Adam / non-Jay names; display name differs from `agent_id`. | Same identity is not counted as collaborator. Dynamic identities render correctly and no UI / room logic depends on Adam or Jay. |
| Room formation | Two isolated browsers on one machine; two physical machines on different networks when available; wrong room id; wrong project. | Correct peers see each other. Wrong room / wrong project does not appear as a valid collaborator. |
| Presence lifecycle | Join, leave, reload, reconnect, sleep / wake, temporary network loss. | Status changes are visible, stateful, and do not imply Drive sync, notification receipt, or APS acknowledgement. |
| Bidirectional messages | A sends to B; B sends to A; both send near-simultaneously; message sent immediately after peer discovery. | Both sides receive human-readable messages once, in the right ticket context, without duplicate cards from warmup resend. |
| Handoff status exchange | No shared-goal baseline; shared-goal draft unconfirmed; shared-goal confirmation; normal packet ready; receiver missing source; declined / returned packet; stale packet version; peer confirmed but not connected; wrong project or identity. | Live surfaces the mismatch or next question, can refresh formal state through local bridge, and may expose only currently valid limited actions. No-baseline and unconfirmed-baseline states must not be collapsed into ordinary handoff readiness. |
| APS Live end-to-end operation flow | `Check APS`, `check Drive`, or handoff preflight identifies a live coordination need; opens APS Live with project, `agent_id`, active ticket, sender, receiver, `任務`, `真源`, `開工條件`, blocker, and next formal action; peers coordinate; the user sends the selected follow-up intent into local AI queue or chooses a limited bridge-confirmed formal action; terminal AI reads the queue when queue handoff is used; terminal handles any publish / revise / withdraw / complex shared-goal action. Include bridge online, bridge offline, invalid token, receiver-missing-source, stale version, peer offline, wrong project, and declined / returned packet cases. | The run proves the whole upstream / downstream loop without hidden writes: Trystero does not write formal state, bridge invalid-token and offline paths are bounded, bridge-confirmed `consume` / `decline` / `close` actions read back latest state, and `publish`, `revise`, `withdraw`, or shared-goal rewrite remains a terminal action requiring user approval. |
| 3+ participant presence / coordination with one-to-one formal handoff | At least three distinct APS identities join the same project / Live context; at least one run uses non-Adam / non-Jay names and display names that differ from `agent_id`; one active handoff ticket has a clear sender, receiver, and next responsible person; the third participant can be present, send bounded coordination, or contribute missing information. Include separate A→B and A→C formal packets, receiver-specific inbox checks, wrong-recipient consume rejection, and a case where C comments in the A→B Live room. | All participants can see presence and coordination context, but the third participant is not treated as the formal recipient, cannot create ack / consume / decline state for another receiver, cannot satisfy close conditions, and does not turn the active ticket into a group-recipient packet. B must not see or consume C-only packets, C must not see or consume B-only packets, and C's Live comment may appear only as coordination material in queue. Formal APS handoff remains one sender to one receiver per packet. |
| Local AI queue | Bridge online; bridge offline; invalid token; selected follow-up intent; recent messages attached. | Online bridge writes a local-only queue item. Offline path gives a human-readable fallback. Queue payload includes current APS context and selected intent, not raw chat alone. |
| Reload / local transcript | Reload same page; open second local tab with same identity; clear session data. | Reload keeps only current-room convenience history. Same-identity tab remains local preview only. No browser history is treated as formal truth. |
| Security and privacy | Local absolute paths; credentials-like strings; private file content; oversized payload. | Sensitive or local-only material is not broadcast as user-visible peer instruction. Local paths are not sent as receiver-readable truth. |
| User-facing state | Not connected; connected without peer; peer present; message sent; reply received; queue handoff done; peer left. | The UI shows one clear current state. Old pending hints do not remain after later actions. |
| Formal-truth boundary | Packet exists in Drive but peer offline; peer online but Drive not synced; Live message says receiver saw something. | Packet / outbox / ack / shared-goal records remain the formal truth. Live presence and chat are never treated as APS ack or Drive sync. |

## Minimum Pass Package

A Trystero QC run is passable only when the report includes:

1. Environment: OS, browser, network shape, Trystero source reviewed, APS source commit, test page path, and whether the test used physical machines or isolated browsers.
2. Participants: actual `agent_id` values, display names, project id, and proof that at least one run used non-Adam / non-Jay identities.
3. Six-stage product-flow ledger: one row per stage for `共同基準`, `已發出`, `對方查看`, `可開工判斷`, `處理 / 補資料`, and `正式更新`. Each row must name the acting identity, observing identity, trigger, visible page state, terminal or queue evidence, expected formal APS result, and whether the stage passed, failed, or was intentionally blocked.
4. Evidence: screenshots or structured logs for peer join, message A to B, message B to A, reconnect, no-peer behavior, same-identity guard, local-AI queue handoff, end-to-end terminal return, and 3+ participant presence / coordination when that gate is in scope.
5. Formal-boundary proof: evidence that Trystero chat, page load, browser history, and queue handoff did not write packet / outbox / ack / consume / decline / revise / close / publish state; evidence that any bridge-confirmed limited write had preflight, user confirmation, and read-back verification; and evidence that a 3+ participant run did not convert one-to-one formal handoff into a group-recipient packet.
6. End-to-end flow ledger: for every run that opens Live from `Check APS`, `check Drive`, or handoff preflight, list the upstream trigger, the active handoff ticket, the selected local-AI intent or bridge action, the queue item when used, the terminal AI recommendation when used, and the user-approved or blocked formal action. The ledger must explicitly mark whether bridge online, bridge offline, invalid-token, preflight-fail, and read-back-fail paths were exercised.
7. QC scope-gap ledger: explicitly state whether product-flow, transport, formal-boundary, UI visibility, documentation claims, and first-use negative variants were tested separately. If any one layer is represented only by another layer's evidence, the run fails.
8. 3+ participant ledger: list all participants, roles, display names, active ticket sender / receiver, third-party coordination messages, receiver-specific inbox / consume checks, and proof that no group-recipient formal packet or third-party ack was created.
9. Failure ledger: every failed, blocked, or not-run scenario listed with reason and next action.

## Full Audit Integration

When APS Live is integrated into the supported APS tool path, 🔴 全面檢 must include this module. A full audit cannot pass if this module is required but absent, skipped, only replaced by a same-machine visual check, or missing the six-stage product-flow gate, APS Live end-to-end operation flow, and 3+ participant one-to-one-boundary gate.

APS Live may be described as a local-supported APS product-standard handoff-tracking capability only when the local product-flow gates pass. Until this module passes on a real two-peer setup, public wording must not describe APS Live as reliable shipped cross-machine Live.

Even after a 3+ participant run passes, public wording must keep the APS formal model precise: APS Live may support small-group presence and coordination, but formal APS handoff packets remain one sender to one receiver per packet.
