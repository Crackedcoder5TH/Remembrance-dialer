// Dialer MCP Server — uses @remembrance/mcp-base for the JSON-RPC,
// rate-limit, and sanitize boilerplate. Server-specific config:
// tool definitions, handlers, rate limits, and credential strip list.
'use strict';

const { createMcpServer } = require('../mcp-base');
const { TOOLS } = require('./tools');
const handlers = require('./handlers');

const server = createMcpServer({
  tools: TOOLS,
  handlers,
  serverInfo: { name: 'remembrance-dialer', version: '1.0.0' },
  rateLimits: {
    dialer_notify:           { windowMs: 60_000, maxCalls: 10 },
    dialer_ci_detect:        { windowMs: 60_000, maxCalls: 60 },
    dialer_codehost_status:  { windowMs: 60_000, maxCalls: 60 },
  },
  // The Dialer touches every external service — strip every credential class.
  sensitiveFields: [
    'apiKey', 'api_key',
    'token', 'githubToken', 'github_token',
    'webhookUrl', 'webhook_url',
    'clientId', 'client_id', 'clientSecret', 'client_secret',
    'smtpPassword', 'smtp_password',
  ],
});

if (require.main === module) server.start();

module.exports = server;
