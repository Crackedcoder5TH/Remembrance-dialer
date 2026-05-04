// @remembrance/mcp-base — shared MCP server scaffolding
//
// Deduplicates the boilerplate every Remembrance MCP server needs:
//   - JSON-RPC 2.0 stdio loop (initialize / tools/list / tools/call / ping)
//   - Per-tool rate limiting
//   - Egress sanitization (sensitive-field stripping)
//   - Plugin Registry tool dispatch (oracle-pulled pattern)
//
// Each consumer (substrate, reflector, witness, swarm, dialer, oracle)
// passes its tool definitions, handlers, and config; the factory returns
// a started server object plus a `handleMessage` function for testing.
'use strict';

const readline = require('readline');
const { createRegistry } = require('./registry');

const PROTOCOL_VERSION = '2024-11-05';

// Default sensitive-field set every server should strip before egress.
// Servers can extend this with their own (e.g. apiKey, walletPath).
const DEFAULT_SENSITIVE_FIELDS = [
  'sourceFile', 'source_file',
  'sourceCommit', 'source_commit',
  'sourceUrl', 'source_url',
  'author', 'voter',
  'localPath', 'local_path',
];

function makeSanitizer(extraFields = []) {
  const fieldSet = new Set([...DEFAULT_SENSITIVE_FIELDS, ...extraFields]);
  function sanitize(obj) {
    if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (fieldSet.has(k)) continue;
      out[k] = sanitize(v);
    }
    return out;
  }
  return sanitize;
}

function makeRateLimiter(rateLimits = {}) {
  const callLog = new Map();
  return function checkRateLimit(toolName) {
    const limit = rateLimits[toolName];
    if (!limit) return true;
    const now = Date.now();
    const calls = (callLog.get(toolName) || []).filter((t) => now - t < limit.windowMs);
    if (calls.length >= limit.maxCalls) return false;
    calls.push(now);
    callLog.set(toolName, calls);
    return true;
  };
}

function jsonRpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return { jsonrpc: '2.0', id, error: err };
}

/**
 * Build an MCP server.
 *
 * @param {object} options
 * @param {Array<object>} options.tools          — tool definitions (name, description, inputSchema)
 * @param {Object<string, Function>} options.handlers — { toolName: async (args, ctx?) => result }
 * @param {{ name: string, version: string }} options.serverInfo
 * @param {Object<string, { windowMs: number, maxCalls: number }>} [options.rateLimits]
 * @param {string[]} [options.sensitiveFields]    — additional fields to strip before egress
 * @param {Object} [options.context]              — passed to handlers as second arg
 *
 * @returns {{ handleMessage, start, registry, TOOLS, SERVER_INFO }}
 */
function createMcpServer(options) {
  const {
    tools,
    handlers,
    serverInfo,
    rateLimits = {},
    sensitiveFields = [],
    context = {},
  } = options || {};

  if (!Array.isArray(tools) || tools.length === 0) {
    throw new Error('mcp-base: tools array is required');
  }
  if (!handlers || typeof handlers !== 'object') {
    throw new Error('mcp-base: handlers object is required');
  }
  if (!serverInfo || !serverInfo.name || !serverInfo.version) {
    throw new Error('mcp-base: serverInfo with name + version is required');
  }

  const registry = createRegistry();
  for (const tool of tools) {
    if (!handlers[tool.name]) {
      throw new Error(`mcp-base: tool ${tool.name} declared but no handler provided`);
    }
    registry.register(tool.name, { handler: handlers[tool.name], schema: tool });
  }

  const sanitize = makeSanitizer(sensitiveFields);
  const checkRateLimit = makeRateLimiter(rateLimits);

  async function handleMessage(msg) {
    const { id, method, params = {} } = msg;

    if (method === 'initialize') {
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo,
      });
    }
    if (method === 'tools/list') return jsonRpcResult(id, { tools });
    if (method === 'tools/call') {
      const { name, arguments: args = {} } = params;
      const entry = registry.get(name);
      if (!entry) return jsonRpcError(id, -32601, `unknown tool: ${name}`);
      if (!checkRateLimit(name)) return jsonRpcError(id, -32000, `rate limit exceeded for ${name}`);
      try {
        const result = await entry.handler(args, context);
        return jsonRpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(sanitize(result), null, 2) }],
        });
      } catch (err) {
        return jsonRpcError(id, -32000, err.message || 'handler failed');
      }
    }
    if (method === 'ping') return jsonRpcResult(id, {});
    if (id === undefined || id === null) return null;
    return jsonRpcError(id, -32601, `unknown method: ${method}`);
  }

  function start() {
    const rl = readline.createInterface({ input: process.stdin, terminal: false });
    rl.on('line', async (line) => {
      if (!line.trim()) return;
      let msg;
      try { msg = JSON.parse(line); }
      catch (_e) {
        process.stdout.write(JSON.stringify(jsonRpcError(null, -32700, 'parse error')) + '\n');
        return;
      }
      try {
        const response = await handleMessage(msg);
        if (response !== null) {
          process.stdout.write(JSON.stringify(response) + '\n');
        }
      } catch (err) {
        process.stdout.write(JSON.stringify(jsonRpcError(msg.id ?? null, -32000, err.message || 'internal error')) + '\n');
      }
    });
    rl.on('close', () => process.exit(0));
  }

  return {
    handleMessage,
    start,
    registry,
    TOOLS: tools,
    SERVER_INFO: serverInfo,
  };
}

module.exports = {
  createMcpServer,
  createRegistry,
  PROTOCOL_VERSION,
  DEFAULT_SENSITIVE_FIELDS,
};
