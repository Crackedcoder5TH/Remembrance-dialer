# Remembrance Dialer — AI Instructions

## Role in Ecosystem

Universal integration hub for the Remembrance ecosystem. Provides six dialer types that connect ecosystem services to external systems (CI/CD, notifications, LLMs, etc.) through a central registry.

## Quick Reference

```bash
node src/index.js              # Start the dialer hub
node --test tests/**/*.test.js # Run tests
```

## Dialers

- **CI Dialer** — GitHub Actions, CI pipeline integration
- **Notification Dialer** — Slack, email, webhook notifications
- **LLM Dialer** — AI model API connections
- **Oracle Dialer** — Direct connection to remembrance-oracle-toolkit
- **Blockchain Dialer** — Pattern provenance via REMEMBRANCE-BLOCKCHAIN
- **Swarm Dialer** — Agent orchestration via REMEMBRANCE-AGENT-Swarm-

## Ecosystem Links

| Repo | Role |
|------|------|
| remembrance-oracle-toolkit | Core pattern library + oracle |
| Void-Data-Compressor | Substrate data + compression |
| Reflector-oracle- | Reflection + oracle integration |
| REMEMBRANCE-BLOCKCHAIN | Immutable pattern ledger |
| REMEMBRANCE-AGENT-Swarm- | Multi-agent orchestration |
| claw-code | CLI tool |
| awesome-design-md | Design resources |

## Key Rules

- All dialers must register with the central registry
- Dialer connections are lazy-initialized on first use
- Failed connections retry with exponential backoff
