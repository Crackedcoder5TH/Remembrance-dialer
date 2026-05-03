// Dialer MCP — tool schemas
//
// Tight scope: only the surfaces not already covered by other ecosystem
// MCP servers. LLM, oracle, and void surfaces are intentionally omitted
// because consumers can reach those via @remembrance/swarm-mcp,
// @remembrance/oracle-mcp, and @remembrance/substrate-mcp respectively.
'use strict';

const TOOLS = [
  {
    name: 'dialer_notify',
    description: 'Send a notification via Slack, Discord, Teams, or Email. Provider is auto-detected from the configured env vars unless explicitly specified.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['slack', 'discord', 'teams', 'email', 'auto'], description: 'Target platform (default: auto-detect)' },
        message: { type: 'string', description: 'Message body' },
        channel: { type: 'string', description: 'Slack/Discord channel name' },
        subject: { type: 'string', description: 'Email subject (email only)' },
        to: { type: 'string', description: 'Email recipient (email only)' },
      },
      required: ['message'],
    },
  },
  {
    name: 'dialer_ci_detect',
    description: 'Detect the current CI environment (GitHub Actions, GitLab CI, Jenkins, CircleCI) and return parsed metadata: provider, build number, branch, commit, PR number, etc. Read-only.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'dialer_codehost_status',
    description: 'Detect the current code host (GitHub, GitLab, Bitbucket, Azure DevOps), the active repo, and the active branch. Read-only — does not call any external API unless a token is present.',
    inputSchema: {
      type: 'object',
      properties: {
        provider: { type: 'string', enum: ['github', 'gitlab', 'bitbucket', 'azure', 'auto'], description: 'Force a specific provider (default: auto-detect)' },
      },
      required: [],
    },
  },
];

module.exports = { TOOLS };
