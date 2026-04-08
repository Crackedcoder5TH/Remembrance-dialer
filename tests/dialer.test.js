'use strict';

const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');

// Store original env vars for restoration
const originalEnv = { ...process.env };

/**
 * Helper to set env vars and restore after test
 * @param {Object} vars - Environment variables to set
 */
function setEnv(vars) {
  for (const [key, value] of Object.entries(vars)) {
    process.env[key] = value;
  }
}

/**
 * Helper to clear all CI/integration env vars
 */
function clearIntegrationEnvVars() {
  const prefixes = [
    'GITHUB_', 'GH_', 'GITLAB_', 'CI_', 'JENKINS_', 'CIRCLE',
    'BITBUCKET_', 'AZURE_', 'SYSTEM_', 'BUILD_',
    'SLACK_', 'DISCORD_', 'TEAMS_', 'EMAIL_',
    'ANTHROPIC_', 'OPENAI_', 'GEMINI_', 'GOOGLE_API_KEY',
    'XAI_', 'GROK_', 'DEEPSEEK_', 'OLLAMA_',
    'ORACLE_TOOLKIT_', 'VOID_COMPRESSOR_',
    'JOB_NAME', 'BUILD_NUMBER', 'BUILD_URL', 'WORKSPACE', 'NODE_NAME',
    'GIT_COMMIT', 'GIT_BRANCH', 'BUILD_TAG',
  ];

  for (const key of Object.keys(process.env)) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      delete process.env[key];
    }
  }
}

// ========================================
// CI Dialer Tests
// ========================================
describe('CI Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect GitHub Actions', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({ GITHUB_ACTIONS: 'true' });
    assert.equal(ciDialer.detectCI(), 'github');
  });

  it('should detect GitLab CI', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({ GITLAB_CI: 'true' });
    assert.equal(ciDialer.detectCI(), 'gitlab');
  });

  it('should detect Jenkins', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({ JENKINS_URL: 'https://jenkins.example.com/' });
    assert.equal(ciDialer.detectCI(), 'jenkins');
  });

  it('should detect CircleCI', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({ CIRCLECI: 'true' });
    assert.equal(ciDialer.detectCI(), 'circleci');
  });

  it('should return null when no CI detected', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    assert.equal(ciDialer.detectCI(), null);
  });

  it('should parse GitHub env vars', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_SHA: 'abc123',
      GITHUB_ACTOR: 'testuser',
      GITHUB_WORKFLOW: 'CI',
      GITHUB_RUN_ID: '12345',
      GITHUB_EVENT_NAME: 'push',
    });

    const env = ciDialer.parseGitHubEnv();
    assert.equal(env.repository, 'owner/repo');
    assert.equal(env.ref, 'refs/heads/main');
    assert.equal(env.sha, 'abc123');
    assert.equal(env.actor, 'testuser');
    assert.equal(env.eventName, 'push');
  });

  it('should parse GitLab env vars', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({
      CI_PROJECT_ID: '123',
      CI_PROJECT_PATH: 'group/project',
      CI_PIPELINE_ID: '456',
      CI_PIPELINE_SOURCE: 'push',
    });

    const env = ciDialer.parseGitLabEnv();
    assert.equal(env.projectId, '123');
    assert.equal(env.projectPath, 'group/project');
    assert.equal(env.pipelineSource, 'push');
  });

  it('should parse Jenkins env vars', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({
      JOB_NAME: 'my-job',
      BUILD_NUMBER: '42',
      JENKINS_URL: 'https://jenkins.example.com/',
    });

    const env = ciDialer.parseJenkinsEnv();
    assert.equal(env.jobName, 'my-job');
    assert.equal(env.buildNumber, '42');
    assert.equal(env.jenkinsUrl, 'https://jenkins.example.com/');
  });

  it('should parse CircleCI env vars', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({
      CIRCLE_PROJECT_REPONAME: 'my-repo',
      CIRCLE_PROJECT_USERNAME: 'my-org',
      CIRCLE_BUILD_NUM: '99',
      CIRCLE_BRANCH: 'main',
    });

    const env = ciDialer.parseCircleCIEnv();
    assert.equal(env.projectReponame, 'my-repo');
    assert.equal(env.projectUsername, 'my-org');
    assert.equal(env.buildNum, '99');
  });

  it('should dial GitHub Actions with correct structure', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_EVENT_NAME: 'push',
      GITHUB_RUN_ID: '12345',
    });

    const result = ciDialer.dialGitHub();
    assert.equal(result.provider, 'github');
    assert.ok(result.webhookUrl.includes('owner/repo'));
    assert.equal(result.trigger, 'push');
    assert.equal(result.status, 'running');
  });

  it('should auto-detect CI and dial', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    setEnv({ GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: 'owner/repo' });
    const result = ciDialer.dial();
    assert.equal(result.provider, 'github');
  });

  it('should return unknown when no CI detected via dial()', () => {
    const ciDialer = require('../src/dialers/ci-dialer');

    const result = ciDialer.dial();
    assert.equal(result.provider, 'unknown');
    assert.equal(result.status, 'unavailable');
  });
});

// ========================================
// Code Host Dialer Tests
// ========================================
describe('Code Host Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect GitHub code host', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ GITHUB_REPOSITORY: 'owner/repo' });
    assert.equal(codeHostDialer.detectCodeHost(), 'github');
  });

  it('should detect GitLab code host', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ GITLAB_TOKEN: 'test-token' });
    assert.equal(codeHostDialer.detectCodeHost(), 'gitlab');
  });

  it('should detect Bitbucket code host', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ BITBUCKET_TOKEN: 'test-token' });
    assert.equal(codeHostDialer.detectCodeHost(), 'bitbucket');
  });

  it('should detect Azure DevOps code host', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ AZURE_DEVOPS_TOKEN: 'test-token' });
    assert.equal(codeHostDialer.detectCodeHost(), 'azure');
  });

  it('should resolve default API URLs', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    assert.equal(codeHostDialer.resolveApiUrl('github'), 'https://api.github.com');
    assert.equal(codeHostDialer.resolveApiUrl('gitlab'), 'https://gitlab.com/api/v4');
    assert.equal(codeHostDialer.resolveApiUrl('bitbucket'), 'https://api.bitbucket.org/2.0');
  });

  it('should resolve custom API URL from config', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    assert.equal(
      codeHostDialer.resolveApiUrl('github', { apiUrl: 'https://custom.github.com/api/v3' }),
      'https://custom.github.com/api/v3'
    );
  });

  it('should detect tokens from env vars', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ GITHUB_TOKEN: 'gh-token-123' });
    assert.equal(codeHostDialer.detectGitHubToken(), 'gh-token-123');

    setEnv({ GITLAB_TOKEN: 'gl-token-456' });
    assert.equal(codeHostDialer.detectGitLabToken(), 'gl-token-456');
  });

  it('should detect repo from env vars', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ GITHUB_REPOSITORY: 'owner/repo' });
    assert.equal(codeHostDialer.detectRepo('github'), 'owner/repo');
  });

  it('should detect branch from env vars', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({ GITHUB_REF: 'refs/heads/feature-branch' });
    assert.equal(codeHostDialer.detectBranch('github'), 'feature-branch');
  });

  it('should dial GitHub with correct structure', () => {
    const codeHostDialer = require('../src/dialers/code-host-dialer');

    setEnv({
      GITHUB_TOKEN: 'test-token',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_REF: 'refs/heads/main',
    });

    const result = codeHostDialer.dialGitHub();
    assert.equal(result.provider, 'github');
    assert.equal(result.apiUrl, 'https://api.github.com');
    assert.equal(result.token, 'test-token');
    assert.equal(result.repo, 'owner/repo');
    assert.equal(result.branch, 'main');
  });
});

// ========================================
// Notification Dialer Tests
// ========================================
describe('Notification Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect Slack platform', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    setEnv({ SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test' });
    assert.equal(notificationDialer.detectPlatform(), 'slack');
  });

  it('should detect Discord platform', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    setEnv({ DISCORD_WEBHOOK_URL: 'https://discord.com/api/webhooks/test' });
    assert.equal(notificationDialer.detectPlatform(), 'discord');
  });

  it('should format Slack message with blocks', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    const payload = notificationDialer.formatSlackMessage('Hello world', {
      channel: '#general',
      title: 'Test',
    });

    assert.ok(payload.blocks);
    assert.equal(payload.blocks.length, 2); // header + section
    assert.equal(payload.blocks[0].type, 'header');
    assert.equal(payload.blocks[1].type, 'section');
    assert.equal(payload.blocks[1].text.text, 'Hello world');
    assert.equal(payload.channel, '#general');
  });

  it('should format Discord message with embeds', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    const payload = notificationDialer.formatDiscordMessage('Hello discord', {
      title: 'Test Notification',
      color: 0xff0000,
    });

    assert.ok(payload.embeds);
    assert.equal(payload.embeds.length, 1);
    assert.equal(payload.embeds[0].title, 'Test Notification');
    assert.equal(payload.embeds[0].description, 'Hello discord');
    assert.equal(payload.embeds[0].color, 0xff0000);
  });

  it('should format Teams message with Adaptive Card', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    const payload = notificationDialer.formatTeamsMessage('Hello teams', {
      title: 'Teams Test',
    });

    assert.equal(payload.type, 'message');
    assert.ok(payload.attachments);
    assert.equal(payload.attachments[0].contentType, 'application/vnd.microsoft.card.adaptive');
    const body = payload.attachments[0].content.body;
    assert.equal(body[0].text, 'Teams Test');
    assert.equal(body[1].text, 'Hello teams');
  });

  it('should format email message', () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    const payload = notificationDialer.formatEmailMessage('Email body', {
      to: 'test@example.com',
      subject: 'Test Subject',
    });

    assert.equal(payload.to, 'test@example.com');
    assert.equal(payload.subject, 'Test Subject');
    assert.equal(payload.body, 'Email body');
  });

  it('should throw when no webhook URL for Slack', async () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    await assert.rejects(
      () => notificationDialer.sendSlack('test'),
      { message: /Slack webhook URL is required/ }
    );
  });

  it('should throw when no webhook URL for Discord', async () => {
    const notificationDialer = require('../src/dialers/notification-dialer');

    await assert.rejects(
      () => notificationDialer.sendDiscord('test'),
      { message: /Discord webhook URL is required/ }
    );
  });
});

// ========================================
// LLM Dialer Tests
// ========================================
describe('LLM Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect Claude provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ ANTHROPIC_API_KEY: 'test-key' });
    assert.equal(llmDialer.detectProvider(), 'claude');
  });

  it('should detect OpenAI provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ OPENAI_API_KEY: 'test-key' });
    assert.equal(llmDialer.detectProvider(), 'openai');
  });

  it('should detect Gemini provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ GEMINI_API_KEY: 'test-key' });
    assert.equal(llmDialer.detectProvider(), 'gemini');
  });

  it('should detect Grok provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ XAI_API_KEY: 'test-key' });
    assert.equal(llmDialer.detectProvider(), 'grok');
  });

  it('should detect DeepSeek provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ DEEPSEEK_API_KEY: 'test-key' });
    assert.equal(llmDialer.detectProvider(), 'deepseek');
  });

  it('should detect Ollama provider', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ OLLAMA_HOST: 'http://localhost:11434' });
    assert.equal(llmDialer.detectProvider(), 'ollama');
  });

  it('should return null when no LLM detected', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    assert.equal(llmDialer.detectProvider(), null);
  });

  it('should build Claude request body', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const body = llmDialer.buildRequestBody('claude', 'Hello', {
      maxTokens: 1024,
      system: 'You are helpful.',
    });

    assert.equal(body.messages[0].content, 'Hello');
    assert.equal(body.max_tokens, 1024);
    assert.equal(body.system, 'You are helpful.');
  });

  it('should build OpenAI request body', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const body = llmDialer.buildRequestBody('openai', 'Hello', {
      system: 'You are helpful.',
    });

    assert.equal(body.messages.length, 2);
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages[1].role, 'user');
    assert.equal(body.messages[1].content, 'Hello');
  });

  it('should build Gemini request body', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const body = llmDialer.buildRequestBody('gemini', 'Hello', {});

    assert.ok(body.contents);
    assert.equal(body.contents[0].parts[0].text, 'Hello');
  });

  it('should build Ollama request body', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const body = llmDialer.buildRequestBody('ollama', 'Hello', {
      model: 'mistral',
    });

    assert.equal(body.prompt, 'Hello');
    assert.equal(body.model, 'mistral');
  });

  it('should resolve Claude endpoint', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ ANTHROPIC_API_KEY: 'sk-test' });
    const { url, headers } = llmDialer.resolveEndpoint('claude');

    assert.equal(url, 'https://api.anthropic.com/v1/messages');
    assert.equal(headers['x-api-key'], 'sk-test');
    assert.equal(headers['anthropic-version'], '2023-06-01');
  });

  it('should resolve OpenAI endpoint', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    setEnv({ OPENAI_API_KEY: 'sk-test' });
    const { url, headers } = llmDialer.resolveEndpoint('openai');

    assert.equal(url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(headers['Authorization'], 'Bearer sk-test');
  });

  it('should parse Claude response', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const parsed = {
      content: [{ type: 'text', text: 'Hello back!' }],
      usage: { input_tokens: 10, output_tokens: 5 },
    };

    const result = llmDialer.parseResponse('claude', parsed);
    assert.equal(result.text, 'Hello back!');
    assert.ok(result.usage);
  });

  it('should parse OpenAI response', () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    const parsed = {
      choices: [{ message: { content: 'Hello!' } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };

    const result = llmDialer.parseResponse('openai', parsed);
    assert.equal(result.text, 'Hello!');
  });

  it('should throw when no provider detected for send()', async () => {
    const llmDialer = require('../src/dialers/llm-dialer');

    await assert.rejects(
      () => llmDialer.send('test'),
      { message: /No LLM provider detected/ }
    );
  });
});

// ========================================
// Oracle Dialer Tests
// ========================================
describe('Oracle Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect mode based on local availability', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    const mode = oracleDialer.detectMode();
    // Mode will be 'local' if remembrance-oracle-toolkit exists nearby, otherwise 'remote'
    assert.ok(mode === 'local' || mode === 'remote');
  });

  it('should detect remote mode when URL is set', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    setEnv({ ORACLE_TOOLKIT_URL: 'https://oracle.example.com' });
    assert.equal(oracleDialer.detectMode(), 'remote');
  });

  it('should respect config.mode override', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    assert.equal(oracleDialer.detectMode({ mode: 'local' }), 'local');
    assert.equal(oracleDialer.detectMode({ mode: 'remote' }), 'remote');
  });

  it('should get default remote URL', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    assert.equal(oracleDialer.getRemoteUrl(), 'http://localhost:3000');
  });

  it('should get remote URL from env', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    setEnv({ ORACLE_TOOLKIT_URL: 'https://oracle.example.com' });
    assert.equal(oracleDialer.getRemoteUrl(), 'https://oracle.example.com');
  });

  it('should get remote URL from config', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    assert.equal(
      oracleDialer.getRemoteUrl({ remoteUrl: 'https://custom.oracle.com' }),
      'https://custom.oracle.com'
    );
  });

  it('should export all required functions', () => {
    const oracleDialer = require('../src/dialers/oracle-dialer');

    assert.equal(typeof oracleDialer.search, 'function');
    assert.equal(typeof oracleDialer.resolve, 'function');
    assert.equal(typeof oracleDialer.submit, 'function');
    assert.equal(typeof oracleDialer.register, 'function');
    assert.equal(typeof oracleDialer.cascade, 'function');
  });
});

// ========================================
// Void Dialer Tests
// ========================================
describe('Void Dialer', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should detect remote mode by default', () => {
    const voidDialer = require('../src/dialers/void-dialer');

    assert.equal(voidDialer.detectMode(), 'remote');
  });

  it('should get default remote URL', () => {
    const voidDialer = require('../src/dialers/void-dialer');

    assert.equal(voidDialer.getRemoteUrl(), 'http://localhost:3001');
  });

  it('should get remote URL from env', () => {
    const voidDialer = require('../src/dialers/void-dialer');

    setEnv({ VOID_COMPRESSOR_URL: 'https://void.example.com' });
    assert.equal(voidDialer.getRemoteUrl(), 'https://void.example.com');
  });

  it('should export all required functions', () => {
    const voidDialer = require('../src/dialers/void-dialer');

    assert.equal(typeof voidDialer.cascade, 'function');
    assert.equal(typeof voidDialer.coherence, 'function');
    assert.equal(typeof voidDialer.compress, 'function');
    assert.equal(typeof voidDialer.status, 'function');
  });
});

// ========================================
// Registry Tests
// ========================================
describe('Registry', () => {
  beforeEach(() => {
    clearIntegrationEnvVars();
  });

  afterEach(() => {
    clearIntegrationEnvVars();
    Object.assign(process.env, originalEnv);
  });

  it('should list all dialer names', () => {
    const registry = require('../src/registry');

    const names = registry.listDialers();
    assert.ok(names.includes('ci'));
    assert.ok(names.includes('code-host'));
    assert.ok(names.includes('notification'));
    assert.ok(names.includes('llm'));
    assert.ok(names.includes('oracle'));
    assert.ok(names.includes('void'));
    assert.equal(names.length, 6);
  });

  it('should get a dialer by name', () => {
    const registry = require('../src/registry');

    const ciDialer = registry.getDialer('ci');
    assert.ok(ciDialer);
    assert.equal(ciDialer.name, 'ci');
    assert.equal(ciDialer.category, 'integration');
    assert.ok(ciDialer.module);
  });

  it('should return undefined for unknown dialer', () => {
    const registry = require('../src/registry');

    assert.equal(registry.getDialer('nonexistent'), undefined);
  });

  it('should get dialers by category', () => {
    const registry = require('../src/registry');

    const integrations = registry.getDialersByCategory('integration');
    assert.equal(integrations.length, 2);
    assert.ok(integrations.some((d) => d.name === 'ci'));
    assert.ok(integrations.some((d) => d.name === 'code-host'));

    const remembrance = registry.getDialersByCategory('remembrance');
    assert.equal(remembrance.length, 2);
    assert.ok(remembrance.some((d) => d.name === 'oracle'));
    assert.ok(remembrance.some((d) => d.name === 'void'));
  });

  it('should discover available integrations from env', () => {
    const registry = require('../src/registry');

    setEnv({
      GITHUB_ACTIONS: 'true',
      GITHUB_REPOSITORY: 'owner/repo',
      ANTHROPIC_API_KEY: 'test-key',
    });

    const available = registry.discoverAvailable();
    assert.ok(available['ci']);
    assert.equal(available['ci'].detected, 'github');
    assert.ok(available['code-host']);
    assert.equal(available['code-host'].detected, 'github');
    assert.ok(available['llm']);
    assert.equal(available['llm'].detected, 'claude');
  });

  it('should discover oracle and void as always available (mode detection)', () => {
    const registry = require('../src/registry');

    const available = registry.discoverAvailable();
    // oracle and void always return a mode (local/remote), so they are always "detected"
    assert.ok(available['oracle']);
    assert.ok(available['void']);
  });

  it('should produce a summary', () => {
    const registry = require('../src/registry');

    const s = registry.summary();
    assert.equal(s.total, 6);
    assert.ok(s.dialers.length === 6);
    assert.ok(s.dialers.every((d) => d.name && d.category !== undefined));
  });
});

// ========================================
// Main Index Tests
// ========================================
describe('Main Index', () => {
  it('should export all dialers', () => {
    const index = require('../src/index');

    assert.ok(index.ci);
    assert.ok(index.codeHost);
    assert.ok(index.notification);
    assert.ok(index.llm);
    assert.ok(index.oracle);
    assert.ok(index.void);
    assert.ok(index.registry);
  });

  it('should expose dial functions on CI dialer', () => {
    const index = require('../src/index');

    assert.equal(typeof index.ci.dial, 'function');
    assert.equal(typeof index.ci.dialGitHub, 'function');
    assert.equal(typeof index.ci.dialGitLab, 'function');
    assert.equal(typeof index.ci.dialJenkins, 'function');
    assert.equal(typeof index.ci.dialCircleCI, 'function');
  });

  it('should expose dial functions on code host dialer', () => {
    const index = require('../src/index');

    assert.equal(typeof index.codeHost.dial, 'function');
    assert.equal(typeof index.codeHost.dialGitHub, 'function');
    assert.equal(typeof index.codeHost.dialGitLab, 'function');
    assert.equal(typeof index.codeHost.dialBitbucket, 'function');
    assert.equal(typeof index.codeHost.dialAzure, 'function');
  });

  it('should expose send functions on notification dialer', () => {
    const index = require('../src/index');

    assert.equal(typeof index.notification.send, 'function');
    assert.equal(typeof index.notification.sendSlack, 'function');
    assert.equal(typeof index.notification.sendDiscord, 'function');
    assert.equal(typeof index.notification.sendTeams, 'function');
    assert.equal(typeof index.notification.sendEmail, 'function');
  });

  it('should expose send functions on LLM dialer', () => {
    const index = require('../src/index');

    assert.equal(typeof index.llm.send, 'function');
    assert.equal(typeof index.llm.sendClaude, 'function');
    assert.equal(typeof index.llm.sendOpenAI, 'function');
    assert.equal(typeof index.llm.sendGemini, 'function');
    assert.equal(typeof index.llm.sendGrok, 'function');
    assert.equal(typeof index.llm.sendDeepSeek, 'function');
    assert.equal(typeof index.llm.sendOllama, 'function');
  });

  it('should expose Oracle functions', () => {
    const index = require('../src/index');

    assert.equal(typeof index.oracle.search, 'function');
    assert.equal(typeof index.oracle.resolve, 'function');
    assert.equal(typeof index.oracle.submit, 'function');
    assert.equal(typeof index.oracle.register, 'function');
    assert.equal(typeof index.oracle.cascade, 'function');
  });

  it('should expose Void functions', () => {
    const index = require('../src/index');

    assert.equal(typeof index.void.cascade, 'function');
    assert.equal(typeof index.void.coherence, 'function');
    assert.equal(typeof index.void.compress, 'function');
    assert.equal(typeof index.void.status, 'function');
  });
});
