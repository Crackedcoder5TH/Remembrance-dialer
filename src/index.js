'use strict';

/**
 * Remembrance Dialer - Universal integration hub for the Remembrance ecosystem
 *
 * Provides unified dialers for CI systems, code hosts, notifications,
 * LLM providers, Oracle Toolkit, and Void Data Compressor.
 *
 * @module remembrance-dialer
 */

const ciDialer = require('./dialers/ci-dialer');
const codeHostDialer = require('./dialers/code-host-dialer');
const notificationDialer = require('./dialers/notification-dialer');
const llmDialer = require('./dialers/llm-dialer');
const oracleDialer = require('./dialers/oracle-dialer');
const voidDialer = require('./dialers/void-dialer');
const registry = require('./registry');

module.exports = {
  /** CI system integrations (GitHub Actions, GitLab CI, Jenkins, CircleCI) */
  ci: ciDialer,

  /** Code host integrations (GitHub, GitLab, Bitbucket, Azure DevOps) */
  codeHost: codeHostDialer,

  /** Notification integrations (Slack, Discord, Teams, Email) */
  notification: notificationDialer,

  /** LLM provider integrations (Claude, OpenAI, Gemini, Grok, DeepSeek, Ollama) */
  llm: llmDialer,

  /** Oracle Toolkit integration (local or remote) */
  oracle: oracleDialer,

  /** Void Data Compressor integration (local or remote) */
  void: voidDialer,

  /** Central registry with auto-discovery */
  registry,
};
