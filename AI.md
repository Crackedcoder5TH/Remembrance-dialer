# Remembrance-dialer — AI Instructions

> **Applies to any AI agent working in this repo** (Claude, Cursor,
> Aider, Continue, Windsurf, Cody, etc.). `CLAUDE.md` is a pointer to
> this file — instructions are tool-neutral.

## What This Repo Is

A single-package collection of **dialers** — small adapters that wrap
external services behind a consistent API. Other ecosystem repos
depend on this so they don't reimplement the same HTTP / SDK plumbing
for each provider.

Six dialer surfaces:

| Surface | Targets |
|---|---|
| `ci` | GitHub Actions, GitLab CI, Jenkins, CircleCI |
| `codeHost` | GitHub, GitLab, Bitbucket, Azure DevOps |
| `notification` | Slack, Discord, Teams, Email |
| `llm` | Anthropic, OpenAI, Google Gemini, xAI Grok, DeepSeek, Ollama |
| `oracle` | `remembrance-oracle-toolkit` (local or remote) |
| `void` | `Void-Data-Compressor` (local or remote) |

## Quick Reference

```bash
npm install
npm test
```

```js
const dialer = require('remembrance-dialer');
await dialer.notification.slack.send({ channel: '#ci', text: '...' });
const score = await dialer.oracle.score({ code: '...' });
const blob = await dialer.void.compress(buffer);
```

## Key rules for agents working here

- **Credentials come from environment variables only.** Do not write
  code that persists, transmits, or proxies credentials to any party
  other than the targeted external service. The Dialer reads env vars,
  forwards calls, and forgets.
- **Missing credentials must no-op gracefully** — no exceptions, no
  log spam. Partial deployments must continue running.
- Each dialer is independent. Importing one must not pull the others.

## Where it fits in the ecosystem

| Repo | Role |
|---|---|
| `Void-Data-Compressor` | substrate hub the `void` dialer talks to |
| `remembrance-oracle-toolkit` | scoring service the `oracle` dialer talks to |
| `REMEMBRANCE-AGENT-Swarm-` | uses the `llm` dialer for multi-provider dispatch |
| `REMEMBRANCE-Interface` | uses the `notification` + `codeHost` dialers |
| **Remembrance-dialer** *(this repo)* | the adapter layer everyone else imports |

## Project intent

For the project's covenant register and full framing, see
[MANIFESTO.md](./MANIFESTO.md). The technical register lives in
[README.md](./README.md).
