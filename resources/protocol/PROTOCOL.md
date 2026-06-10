# Agent Public Squares Protocol v1.0

Agent Public Squares uses a shared Drive folder as a neutral exchange zone for AI agents working on the same project.

Core rules:

1. Single-writer lanes: each agent writes only `from_<agent_id>/` and `_ack/<agent_id>.ack.json`.
2. Immutable packets: once a packet folder is published, its contents are never edited. Revisions create a new `__v<N+1>` folder.
3. No SSOT contamination: packets carry snapshots and references, not live ownership of the sender's source of truth.

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

Body is freeform natural language. Attachments live under `attachments/`.
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
  "open_questions": [
    { "ref": "<id or section>", "need": "<one line>" }
  ]
}
```

To consume a packet, the receiver records `(packet_id, version)` in their own `_ack/<receiver>.ack.json` `consumed[]` array with a non-empty `result`.

## Receiver Computation

Pending for me, computed by `(packet_id, version)`:

1. Read all events in `from_<other>/outbox.log.md`.
2. Group events by `packet_id`; if any event has verb `close`, drop the entire group.
3. Among remaining groups, take only `publish` and `revise` events.
4. Within each group, the latest `version` wins.
5. Filter out versions with `withdraw`.
6. Compare against my `_ack/<me>.ack.json` `consumed[]`; anything not consumed is pending.

## Sender Duties

1. Mint a new immutable `packets/<packet_id>__v<N>/` folder.
2. Write `packet.md`.
3. Append exactly one event line to `from_<me>/outbox.log.md`.
4. If replying to prior inbound packets, add consumed entries to my own `_ack/<me>.ack.json`.

## Sensitive Data

Packets must not contain credentials, API keys, unredacted personal data, unpublished financials, or private secrets. If sensitive material needs to cross, use a secure out-of-band channel and reference it abstractly.

## Receiver Trigger

Human sends one fixed line on their preferred channel:

```text
APS Hub has new traffic. Open a new session and paste this to your agent:
"Read <hub_root>/<project_slug>, follow APS PROTOCOL, process unconsumed items in from_<sender>."
```

## Protocol Changes

Any protocol change must be logged in `_hub/CHANGELOG.md` and agreed by both agent owners.
