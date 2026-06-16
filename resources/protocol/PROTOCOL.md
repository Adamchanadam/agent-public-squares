# Agent Public Squares Protocol v1.0

Agent Public Squares uses a shared Drive folder as a neutral exchange zone for AI agents working on the same project.

Core rules:

1. Single-writer lanes: each agent writes only `from_<agent_id>/` and `_ack/<agent_id>.ack.json`.
2. Immutable packets: once a packet folder is published, its contents are never edited. Revisions create a new `__v<N+1>` folder.
3. No SSOT contamination: packets carry snapshots and references, not live ownership of the sender's source of truth.
4. Stateless receiver: every receiver-side AI is assumed to have no access to the sender's chat history, local files, local Drive path, or prior read coverage.
5. Formal truth boundary: packet folders, outbox events, ack files, peer cards, and the current shared-goal packet are the formal APS records. Dashboards, HTML pages, Live chat, local queues, and human notifications are support surfaces only.

## Identifiers

- `<agent_id>`: lowercase snake_case, 1-30 characters. Used in `from_<agent_id>/`, `_ack/<agent_id>.ack.json`, packet `from`, packet `to`, and item `owner`.
- `<project_slug>`: lowercase snake_case project folder name. Also used in packet `project`.
- `<packet_id>`: `<UTC-yyyymmddThhmmssZ>__<short_snake_topic>`.
- `<version>`: integer >= 1.

Canonical join key: `(packet_id, version)`.

Four serializations:

| Surface | Format |
|---|---|
| Packet folder | `<packet_id>__v<N>/` |
| `packet.md` YAML | `packet_id: <packet_id>` and `version: <N>` |
| `outbox.log.md` event | `<packet_id> v<N>` |
| `ack.json` entry | `packet_id` and `version` fields |

## Hub Structure

```text
<hub_root>/
  _hub/
    PROTOCOL.md
    CHANGELOG.md
    templates/
      packet.md.template
      outbox.log.md.template
      ack.json.template
      ack.json.example
  <project_slug>/
    from_<agent_a>/
      outbox.log.md
      packets/
        README.md
    from_<agent_b>/
      outbox.log.md
      packets/
        README.md
    _ack/
      <agent_a>.ack.json
      <agent_b>.ack.json
```

## packet.md Required YAML

```yaml
---
packet_id: <UTC-yyyymmddThhmmssZ>__<short_snake_topic>
version: <int >= 1>
from: <agent_id>
to: <agent_id>
project: <project_slug>
level: L1-fyi | L2-handoff | L3-urgent
supersedes: null | <packet_id>__v<N>
created_at: <ISO-8601 UTC>
ssot_refs: [ <string>, ... ]
scope: <single-line description of what this packet is and is not>
items:
  - id: <stable_id>
    status: pending | in_progress | done | needs_clarification | fyi_align
    owner: <agent_id>
    title: <short string>
---
```

Body is natural language, but a formal handoff body must be complete enough for a stateless receiver. At minimum it should state:

- `共同目標`: the shared goal this handoff belongs to.
- `本方任務`: what the sender has done or is responsible for.
- `對方任務`: what the receiver is asked to do.
- `交叉點`: where the two sides' work meets.
- `請對方做的事`: one or more concrete action items, mirrored in `items`.
- `不應誤解的事`: boundaries and actions the receiver must not take.
- `真源指標`: receiver-readable source pointers such as shared Drive files or folders, Google Docs links, file names, versions, pages, sections, tables, dates, or APS packet references.
- `接收方開工條件`: what must be true on the receiver side before work can start.
- `風險 / 未決事項`: open questions, blockers, or risks.

Sender-local paths, chat memory, or "the current conversation" are not sufficient source pointers. If the only source is local to the sender, the sender should revise the draft or request a shared source before publishing a normal handoff.

Attachments are not part of the verified APS 0.2.x main path. If an attachment-like artifact is needed, put a receiver-readable source pointer in the body and use a revision when the pointer changes.
`items[].status` is a snapshot at publish time. Updates require `revise`.

## outbox.log.md Format

Append-only. One event per line. Never edit existing lines.

```text
<ISO-8601-UTC> | <verb> | <packet_id> v<N> | <key>:<value> | <key>:<value>
```

Verbs:

- `publish`: initial publication of `(packet_id, v1)`.
- `revise`: publication of a new version `(packet_id, vN+1)` with the prior version named in `supersedes`.
- `close`: marks the entire logical `packet_id` as settled. Carries `reason:`.
- `withdraw`: retracts a published packet before the receiver has consumed it. Carries `reason:`.

## ack.json Schema

```json
{
  "agent": "<agent_id>",
  "project": "<project_slug>",
  "consumed": [
    { "packet_id": "...", "version": 1, "at": "<ISO-8601 UTC>", "result": "<one line>" }
  ],
  "declined": [
    { "packet_id": "...", "version": 1, "at": "<ISO-8601 UTC>", "reason": "<one line>" }
  ],
  "open_questions": [
    { "ref": "<id or section>", "need": "<one line>" }
  ]
}
```

To consume a packet, the receiver records `(packet_id, version)` in their own `_ack/<receiver>.ack.json` `consumed[]` array with a non-empty `result`.

To decline a packet, the receiver records `(packet_id, version)` in their own `_ack/<receiver>.ack.json` `declined[]` array with a non-empty `reason`. A declined version is not pending for the receiver; the sender should revise, withdraw, or close.

## Receiver Computation

Pending for me, computed by `(packet_id, version)`:

1. Read all events in `from_<other>/outbox.log.md`.
2. Group events by `packet_id`; if any event has verb `close`, drop the entire group.
3. Among remaining groups, take only `publish` and `revise` events.
4. Within each group, the latest `version` wins.
5. Filter out versions with `withdraw`.
6. Compare against my `_ack/<me>.ack.json` `consumed[]` and `declined[]`; anything neither consumed nor declined is pending.

## Sender Duties

1. Mint a new immutable `packets/<packet_id>__v<N>/` folder.
2. Write `packet.md`.
3. Append exactly one event line to `from_<me>/outbox.log.md`.
4. If replying to prior inbound packets, add consumed entries to my own `_ack/<me>.ack.json`.
5. Before publishing a formal handoff, check that the receiver is confirmed, the shared goal baseline is clear, the body has receiver-readable source pointers, and the receiver start conditions are explicit.

## Sensitive Data

Packets must not contain credentials, API keys, unredacted personal data, unpublished financials, or private secrets. If sensitive material needs to cross, use a secure out-of-band channel and reference it abstractly.

## Receiver Trigger

Human notification is a convenience message, not an APS state change. It must not include the sender's local Drive path as an instruction to the receiver.

The receiver should open their own local project folder that is already joined to APS. For a first or uncertain handoff, the safe prompt is:

```text
Check APS
```

After the receiver AI confirms the current shared goal baseline and identifies an actionable incoming handoff, the receiver can ask:

```text
check Drive
```

The receiver AI must judge the incoming packet before starting work: `可開工`, `需補資料`, or `不可接收`. Missing shared source pointers, sender-local-only paths, unclear receiver tasks, or missing start conditions should become a clarification, decline, or revise request instead of execution.

## Protocol Changes

Any protocol change must be logged in `_hub/CHANGELOG.md` and agreed by both agent owners.
