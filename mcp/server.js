// Dialer MCP Server
//
// Same JSON-RPC stdio shape as the other ecosystem MCP servers.
// Exposes only the dialer surfaces not already reachable via the other
// servers (notification, CI detect, code-host status). LLM/oracle/void
// surfaces are intentionally omitted to avoid duplication.
'use strict';

const readline = require('readline');
const { TOOLS } = require('./tools');
const handlers = require('./handlers');
const registry = require('./registry');

const PROTOCOL_VERSION = '2024-11-05';
const SERVER_INFO = { name: 'remembrance-dialer', version: '1.0.0' };

const RATE_LIMITS = {
  dialer_notify:           { windowMs: 60_000, maxCalls: 10 },
  dialer_ci_detect:        { windowMs: 60_000, maxCalls: 60 },
  dialer_codehost_status:  { windowMs: 60_000, maxCalls: 60 },
};

const callLog = new Map();

function checkRateLimit(toolName) {
  const limit = RATE_LIMITS[toolName];
  if (!limit) return true;
  const now = Date.now();
  const calls = (callLog.get(toolName) || []).filter((t) => now - t < limit.windowMs);
  if (calls.length >= limit.maxCalls) return false;
  calls.push(now);
  callLog.set(toolName, calls);
  return true;
}

for (const tool of TOOLS) {
  if (!handlers[tool.name]) {
    throw new Error(`server: tool ${tool.name} declared but no handler exported`);
  }
  registry.register(tool.name, { handler: handlers[tool.name], schema: tool });
}

function jsonRpcResult(id, result) { return { jsonrpc: '2.0', id, result }; }
function jsonRpcError(id, code, message, data) {
  const err = { code, message };
  if (data !== undefined) err.data = data;
  return { jsonrpc: '2.0', id, error: err };
}
function send(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }

const SENSITIVE_FIELDS = new Set([
  'sourceFile', 'source_file',
  'sourceCommit', 'source_commit',
  'sourceUrl', 'source_url',
  'author', 'voter',
  'localPath', 'local_path',
  // The dialer touches every external service — strip every credential class.
  'apiKey', 'api_key',
  'token', 'githubToken', 'github_token',
  'webhookUrl', 'webhook_url',
  'clientId', 'client_id', 'clientSecret', 'client_secret',
  'smtpPassword', 'smtp_password',
]);

function sanitize(obj) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitize);
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.has(k)) continue;
    out[k] = sanitize(v);
  }
  return out;
}

async function handleMessage(msg) {
  const { id, method, params = {} } = msg;
  if (method === 'initialize') {
    return jsonRpcResult(id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }
  if (method === 'tools/list') return jsonRpcResult(id, { tools: TOOLS });
  if (method === 'tools/call') {
    const { name, arguments: args = {} } = params;
    const entry = registry.get(name);
    if (!entry) return jsonRpcError(id, -32601, `unknown tool: ${name}`);
    if (!checkRateLimit(name)) return jsonRpcError(id, -32000, `rate limit exceeded for ${name}`);
    try {
      const result = await entry.handler(args);
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
    catch (_e) { send(jsonRpcError(null, -32700, 'parse error')); return; }
    try {
      const response = await handleMessage(msg);
      if (response !== null) send(response);
    } catch (err) {
      send(jsonRpcError(msg.id ?? null, -32000, err.message || 'internal error'));
    }
  });
  rl.on('close', () => process.exit(0));
}

if (require.main === module) start();

module.exports = { handleMessage, TOOLS, SERVER_INFO };
