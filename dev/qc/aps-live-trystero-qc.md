# APS Live Trystero QC module

Status: draft standard / not yet passed
Last updated: 2026-06-15
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

A pass requires a two-identity operation ledger, even when the run is same-machine. The ledger must show both sides moving through every stage, with the trigger, visible state, evidence source, user or AI decision, and next formal action recorded for each stage. A UI that merely displays these stage labels is not sufficient. The run must prove stage transition, not just stage visibility.

The six-stage gate is product-flow evidence. Trystero evidence is message-channel evidence. Formal-boundary evidence proves Live did not secretly write APS state. APS Live cannot be called integrated or release-ready unless all three layers pass in the same acceptance package.

## Required Test Matrix

| Area | Minimum scenarios | Pass condition |
|---|---|---|
| Six-stage product flow | Same-machine two-identity rehearsal at minimum, then two-machine / independent-network proof before release. Run the whole sequence: `共同基準` baseline exists and is confirmed; `已發出` formal packet or shared-goal item is issued; `對方查看` receiver identity sees the same active ticket; `可開工判斷` receiver decides can-start / missing-info / disagree; `處理 / 補資料` the selected branch is handled through Live coordination and local-AI queue; `正式更新` terminal AI proposes the formal APS update and the user-approved command records or intentionally blocks it. | Every stage has evidence from both identities. The report distinguishes stage labels shown on the page from actual stage transitions. No Trystero peer event, queue item, screenshot, or unchanged hash may be counted as a substitute for a missing stage transition. |
| Official API alignment | Re-check current Trystero documentation or source before changing transport code. | The test notes record reviewed source, date, import style, `joinRoom` shape, action API shape, and any unsupported assumptions. |
| Identity | Same identity opened twice; two different identities; non-Adam / non-Jay names; display name differs from `agent_id`. | Same identity is not counted as collaborator. Dynamic identities render correctly and no UI / room logic depends on Adam or Jay. |
| Room formation | Two isolated browsers on one machine; two physical machines on different networks when available; wrong room id; wrong project. | Correct peers see each other. Wrong room / wrong project does not appear as a valid collaborator. |
| Presence lifecycle | Join, leave, reload, reconnect, sleep / wake, temporary network loss. | Status changes are visible, stateful, and do not imply Drive sync, notification receipt, or APS acknowledgement. |
| Bidirectional messages | A sends to B; B sends to A; both send near-simultaneously; message sent immediately after peer discovery. | Both sides receive human-readable messages once, in the right ticket context, without duplicate cards from warmup resend. |
| Handoff status exchange | Shared-goal confirmation; normal packet ready; receiver missing source; declined / returned packet; stale packet version. | Live surfaces the mismatch or next question, then returns to local AI / terminal for formal action. It does not consume, decline, revise, close, publish, or ack. |
| APS Live end-to-end operation flow | `Check APS`, `check Drive`, or handoff preflight identifies a live coordination need; opens APS Live with project, `agent_id`, active ticket, sender, receiver, `任務`, `真源`, `開工條件`, blocker, and next formal action; peers coordinate; the user sends the selected follow-up intent into local AI queue; terminal AI reads the queue; terminal proposes a formal APS action; the user approves before any formal command runs. Include bridge online, bridge offline, invalid token, receiver-missing-source, stale version, peer offline, wrong project, and declined / returned packet cases. | The run proves the whole upstream / downstream loop without hidden writes: Live may create only local queue material, terminal AI must summarise / judge first, fallback text is human-readable rather than raw JSON, and any `publish`, `revise`, `decline`, `consume`, `close`, or shared-goal update remains a terminal action requiring user approval. |
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
5. Formal-boundary proof: evidence that Live did not write packet / outbox / ack / consume / decline / revise / close / publish state, and that a 3+ participant run did not convert one-to-one formal handoff into a group-recipient packet.
6. End-to-end flow ledger: for every run that opens Live from `Check APS`, `check Drive`, or handoff preflight, list the upstream trigger, the active handoff ticket, the selected local-AI intent, the queue item, the terminal AI recommendation, and the user-approved or blocked formal action. The ledger must explicitly mark whether bridge online, bridge offline, and invalid-token paths were exercised.
7. QC scope-gap ledger: explicitly state whether product-flow, transport, formal-boundary, UI visibility, and documentation claims were tested separately. If any one layer is represented only by another layer's evidence, the run fails.
8. 3+ participant ledger: list all participants, roles, display names, active ticket sender / receiver, third-party coordination messages, receiver-specific inbox / consume checks, and proof that no group-recipient formal packet or third-party ack was created.
9. Failure ledger: every failed, blocked, or not-run scenario listed with reason and next action.

## Full Audit Integration

When APS Live is integrated into the supported APS tool path, 🔴 全面檢 must include this module. A full audit cannot pass if this module is required but absent, skipped, only replaced by a same-machine visual check, or missing the six-stage product-flow gate, APS Live end-to-end operation flow, and 3+ participant one-to-one-boundary gate.

APS Live may be described as a local-supported APS product-standard handoff-tracking capability only when the local product-flow gates pass. Until this module passes on a real two-peer setup, public wording must not describe APS Live as reliable shipped cross-machine Live.

Even after a 3+ participant run passes, public wording must keep the APS formal model precise: APS Live may support small-group presence and coordination, but formal APS handoff packets remain one sender to one receiver per packet.
