# Dialer MCP Server

Exposes the Dialer's notification, CI-detection, and code-host-status
surfaces over MCP via JSON-RPC 2.0 on stdin/stdout.

## Tools

| Tool | Mode | Description |
|---|---|---|
| `dialer_notify` | write | Send a notification via Slack, Discord, Teams, or Email |
| `dialer_ci_detect` | read | Detect the current CI environment + parsed metadata |
| `dialer_codehost_status` | read | Detect the current code host, repo, and branch |

> **LLM, oracle, and void surfaces are intentionally omitted** — they
> are reachable via the dedicated MCP servers (`@remembrance/swarm-mcp`,
> `@remembrance/oracle-mcp`, `@remembrance/substrate-mcp`). The Dialer
> MCP only ships what isn't already a tool elsewhere.

## Run

```bash
node mcp/server.js
```

## Configuration

Credentials come from environment variables only — the Dialer reads
them, forwards calls, and never persists or transmits them anywhere
other than the targeted external service.

| Var | Used for |
|---|---|
| `SLACK_WEBHOOK_URL` | Slack notifications |
| `DISCORD_WEBHOOK_URL` | Discord notifications |
| `TEAMS_WEBHOOK_URL` | Teams notifications |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD` | Email |
| `GITHUB_TOKEN` / `GITLAB_TOKEN` / etc. | Code-host introspection |

## Rate limits

| Class | Tools | Limit |
|---|---|---|
| write | `notify` | 10 / minute |
| read | `ci_detect`, `codehost_status` | 60 / minute |

## Sensitive fields stripped

The Dialer touches every external service so the strip list is large:
`apiKey`, `token`, `githubToken`, `webhookUrl`, `clientSecret`,
`smtpPassword`, plus the standard `sourceFile`/`author` set.

## Project intent

For project intent see [../MANIFESTO.md](../MANIFESTO.md). Technical
register: [../README.md](../README.md). The no-store / no-proxy stance
in those files applies equally to anything this server emits.
