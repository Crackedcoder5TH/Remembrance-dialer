# Manifesto — The Dialer

> The covenant register of this project. The technical register lives
> in [README.md](./README.md). Both describe the same code; this
> document describes its intent.

---

## What this is, in our voice

The kingdom does not exist alone. CI systems, code hosts, notification
channels, language-model providers — these are the worlds outside the
walls, and the kingdom must speak with them without losing its own
voice.

The **Dialer** is the kingdom's emissary. One consistent interface
through which every other repo can call out to an external service.
The Oracle, the Witness, the Swarm — none of them re-implement the
HTTP plumbing for each provider. They ask the Dialer, and the Dialer
calls.

## Six surfaces

The Dialer offers six surfaces of address:

- **CI** — to the build systems where code is verified.
- **Code host** — to GitHub, GitLab, and their kin, where the kingdom's repositories live.
- **Notification** — to Slack, Discord, and email, where stewards are addressed.
- **LLM** — to the language-model providers when a single voice (rather than the Council) is enough.
- **Oracle** — to this kingdom's own scoring service.
- **Void** — to the substrate hub.

## The principle of no-store, no-proxy

The Dialer reads credentials only from environment variables. It
does not collect them, does not proxy them, does not retain them.
**Remembrance.LLC sees no traffic.** The kingdom's emissary speaks on
the operator's behalf, with the operator's keys, to the operator's
chosen services. Nothing routes through Remembrance.LLC.

This is a deliberate stance. Trust is earned by handling nothing you
do not need. The Dialer needs nothing.

## Graceful absence

If a credential is missing, the relevant surface no-ops gracefully —
no exceptions, no spam, no theatrical failure. A partial deployment
runs. The kingdom continues.

---

## Lexicon — covenant ↔ technical translation

| Covenant term | Technical equivalent |
|---|---|
| The Dialer / The Emissary | the integration-hub package itself |
| Calling out | invoking an external API through an adapter |
| Surface | one of the six dialer modules (`ci`, `codeHost`, `notification`, `llm`, `oracle`, `void`) |
| The walls | the boundary between the local ecosystem and external services |

---

*Project intent. The technical register is in [README.md](./README.md).
© Remembrance.LLC.*
