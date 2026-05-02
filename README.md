# remembrance-dialer

**The Dialer — universal integration hub for the Remembrance
ecosystem.** In covenant framing the Dialer is the *bridge* between
the kingdom and the outside world; in plain technical terms it is one
adapter surface for CI systems, code hosts, notifications, LLM
providers, the Oracle, and the Void substrate. Both descriptions
point at the same code.

> **A [Remembrance.LLC](#about-remembrancellc) project.**
> **Part of the [Remembrance Ecosystem](https://github.com/Crackedcoder5TH/Void-Data-Compressor)** —
> reference implementation of [Coherency Protocol v1.0](https://github.com/Crackedcoder5TH/Void-Data-Compressor/blob/main/COHERENCY_PROTOCOL.md).
> **Role**: the bridge — thin adapter layer that lets every other repo talk to external services through one consistent interface.
> **Verified capabilities**: see [CAPABILITIES.md](./CAPABILITIES.md).

---

## What it is

A single-package collection of **dialers** — small adapters that wrap
external services behind a consistent API:

| Surface | Targets |
|---|---|
| `ci` | GitHub Actions, GitLab CI, Jenkins, CircleCI |
| `codeHost` | GitHub, GitLab, Bitbucket, Azure DevOps |
| `notification` | Slack, Discord, Teams, Email |
| `llm` | Anthropic Claude, OpenAI, Google Gemini, xAI Grok, DeepSeek, Ollama |
| `oracle` | `remembrance-oracle-toolkit` (local or remote) |
| `void` | `Void-Data-Compressor` (local or remote) |

Other ecosystem repos depend on this so they don't reimplement the same
HTTP / SDK plumbing for each provider.

---

## Quickstart

```bash
git clone https://github.com/Crackedcoder5TH/Remembrance-dialer.git
cd Remembrance-dialer
npm install
npm test
```

Programmatic use:

```js
const dialer = require('remembrance-dialer');

// Send a Slack notification
await dialer.notification.slack.send({ channel: '#ci', text: 'build green' });

// Score a snippet through the toolkit
const score = await dialer.oracle.score({ code: '...' });

// Compress a payload via the substrate
const blob = await dialer.void.compress(buffer);
```

---

## Module layout

```
src/
  index.js                  # public surface
  registry.js               # auto-discovery + capability registry
  dialers/
    ci-dialer.js
    code-host-dialer.js
    notification-dialer.js
    llm-dialer.js
    oracle-dialer.js
    void-dialer.js
tests/
  dialer.test.js
```

Each dialer is independent — importing one does not pull the others.

---

## Configuration

All credentials are read from environment variables. The dialer never
persists secrets and never proxies traffic through a third-party service.

| Variable | Used by |
|---|---|
| `GITHUB_TOKEN` | code host + CI dialers |
| `SLACK_WEBHOOK_URL` | notification dialer |
| `DISCORD_WEBHOOK_URL` | notification dialer |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / etc. | LLM dialer |
| `ORACLE_URL` | oracle dialer (defaults to `http://localhost:3000`) |
| `VOID_URL` | void dialer (defaults to `http://localhost:8080`) |

Missing variables cause the relevant dialer to no-op gracefully rather
than throw — this keeps partial deployments running.

---

## Connected components

| Repository | Role |
|---|---|
| [Void-Data-Compressor](https://github.com/Crackedcoder5TH/Void-Data-Compressor) | substrate hub the `void` dialer talks to |
| [remembrance-oracle-toolkit](https://github.com/Crackedcoder5TH/remembrance-oracle-toolkit) | scoring service the `oracle` dialer talks to |
| [REMEMBRANCE-AGENT-Swarm-](https://github.com/Crackedcoder5TH/REMEMBRANCE-AGENT-Swarm-) | uses the `llm` dialer for multi-provider dispatch |
| [REMEMBRANCE-Interface](https://github.com/Crackedcoder5TH/REMEMBRANCE-Interface) | uses the `notification` + `codeHost` dialers |
| **Remembrance-dialer** *(this repo)* | the adapter layer everyone else imports |

---

## Lexicon — covenant ↔ technical translation

| Covenant term | Technical equivalent |
|---|---|
| The Bridge / The Dialer | the integration-hub package itself |
| Calling out | invoking an external API through an adapter |
| Kingdom | the local ecosystem (Oracle + Void + Witness + Swarm) |

---

## License

MIT.

---

## About Remembrance.LLC

Published by **Remembrance.LLC** as the integration layer of the
Remembrance Ecosystem. Code is MIT-licensed. The Dialer reads
credentials from environment variables only — **Remembrance.LLC
neither stores nor proxies any external-service traffic.**

---

*© Remembrance.LLC. MIT-licensed.*
