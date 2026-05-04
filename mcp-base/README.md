# @remembrance/mcp-base

Shared scaffolding for every Remembrance MCP server. Lives in
`Remembrance-dialer` because the dialer is already the ecosystem's
adapter layer.

## What it does

Every MCP server in the ecosystem (substrate, reflector, witness,
swarm, dialer, oracle) needs the same boilerplate:

- JSON-RPC 2.0 stdio loop (initialize / tools/list / tools/call / ping)
- Per-tool rate limiting
- Egress sanitization (sensitive-field stripping)
- Tool dispatch via the Plugin Registry pattern

This package provides all of it as a single factory call. Each
server's own `server.js` shrinks from ~120 lines to ~30.

## Usage

```js
const { createMcpServer } = require('@remembrance/mcp-base');
const { TOOLS } = require('./tools');
const handlers = require('./handlers');

const server = createMcpServer({
  tools: TOOLS,
  handlers,
  serverInfo: { name: 'remembrance-substrate', version: '1.0.0' },
  rateLimits: {
    substrate_publish: { windowMs: 60_000, maxCalls: 10 },
    // ...
  },
  sensitiveFields: ['walletPath', 'wallet_key'], // beyond the defaults
});

if (require.main === module) server.start();
module.exports = server;
```

The factory returns:
- `start()` — bind to stdin/stdout
- `handleMessage(msg)` — single-message handler (useful for tests)
- `registry` — the populated Plugin Registry
- `TOOLS`, `SERVER_INFO` — pass-through

## Default sensitive fields

These are stripped from every egressing response automatically. Add
your own via `sensitiveFields` for per-server credentials (API keys,
wallet paths, webhooks).

```
sourceFile, source_file, sourceCommit, source_commit,
sourceUrl, source_url, author, voter, localPath, local_path
```

## Vendoring

In development, repos are sibling directories so each MCP server
just `require('../../Remembrance-dialer/mcp-base')` works. For
production npm publish, list `remembrance-dialer` (or a future
`@remembrance/mcp-base` package) as a peer dependency.

## Why the dialer?

The dialer's stated role is *"thin adapter layer that lets every
other repo talk to external services through one consistent
interface."* MCP is exactly that — a consistent interface between
MCP clients and ecosystem services. Putting `mcp-base` here keeps
the architectural responsibility in one place.

## Project intent

For the project's covenant register and full framing, see
[../MANIFESTO.md](../MANIFESTO.md). Technical register:
[../README.md](../README.md). The no-store / no-proxy stance from
those files applies — this module does not store, log, or transmit
anything itself; it's pure protocol scaffolding.
