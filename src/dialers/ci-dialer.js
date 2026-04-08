'use strict';

const { execFileSync } = require('node:child_process');

/**
 * @typedef {Object} CIDialResult
 * @property {string} provider - The CI provider name
 * @property {string} webhookUrl - Webhook URL for triggering builds
 * @property {string} trigger - The event that triggered the build
 * @property {string} status - Current build status
 */

/**
 * Parse GitHub Actions environment variables
 * @returns {Object} Parsed GitHub Actions environment
 */
function parseGitHubEnv() {
  return {
    repository: process.env.GITHUB_REPOSITORY || '',
    ref: process.env.GITHUB_REF || '',
    sha: process.env.GITHUB_SHA || '',
    actor: process.env.GITHUB_ACTOR || '',
    workflow: process.env.GITHUB_WORKFLOW || '',
    runId: process.env.GITHUB_RUN_ID || '',
    runNumber: process.env.GITHUB_RUN_NUMBER || '',
    eventName: process.env.GITHUB_EVENT_NAME || '',
    serverUrl: process.env.GITHUB_SERVER_URL || 'https://github.com',
    apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
    token: process.env.GITHUB_TOKEN || '',
  };
}

/**
 * Parse GitLab CI environment variables
 * @returns {Object} Parsed GitLab CI environment
 */
function parseGitLabEnv() {
  return {
    projectId: process.env.CI_PROJECT_ID || '',
    projectPath: process.env.CI_PROJECT_PATH || '',
    pipelineId: process.env.CI_PIPELINE_ID || '',
    pipelineSource: process.env.CI_PIPELINE_SOURCE || '',
    jobId: process.env.CI_JOB_ID || '',
    jobName: process.env.CI_JOB_NAME || '',
    commitSha: process.env.CI_COMMIT_SHA || '',
    commitBranch: process.env.CI_COMMIT_BRANCH || '',
    serverUrl: process.env.CI_SERVER_URL || 'https://gitlab.com',
    apiUrl: process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4',
    token: process.env.CI_JOB_TOKEN || '',
  };
}

/**
 * Parse Jenkins environment variables
 * @returns {Object} Parsed Jenkins environment
 */
function parseJenkinsEnv() {
  return {
    jobName: process.env.JOB_NAME || '',
    buildNumber: process.env.BUILD_NUMBER || '',
    buildUrl: process.env.BUILD_URL || '',
    jenkinsUrl: process.env.JENKINS_URL || '',
    workspace: process.env.WORKSPACE || '',
    nodeName: process.env.NODE_NAME || '',
    gitCommit: process.env.GIT_COMMIT || '',
    gitBranch: process.env.GIT_BRANCH || '',
    buildTag: process.env.BUILD_TAG || '',
  };
}

/**
 * Parse CircleCI environment variables
 * @returns {Object} Parsed CircleCI environment
 */
function parseCircleCIEnv() {
  return {
    projectReponame: process.env.CIRCLE_PROJECT_REPONAME || '',
    projectUsername: process.env.CIRCLE_PROJECT_USERNAME || '',
    buildNum: process.env.CIRCLE_BUILD_NUM || '',
    buildUrl: process.env.CIRCLE_BUILD_URL || '',
    branch: process.env.CIRCLE_BRANCH || '',
    sha1: process.env.CIRCLE_SHA1 || '',
    workflowId: process.env.CIRCLE_WORKFLOW_ID || '',
    jobName: process.env.CIRCLE_JOB || '',
    repositoryUrl: process.env.CIRCLE_REPOSITORY_URL || '',
    token: process.env.CIRCLE_TOKEN || '',
  };
}

/**
 * Detect which CI environment is currently active
 * @returns {string|null} The detected CI provider or null
 */
function detectCI() {
  if (process.env.GITHUB_ACTIONS === 'true') return 'github';
  if (process.env.GITLAB_CI === 'true') return 'gitlab';
  if (process.env.JENKINS_URL) return 'jenkins';
  if (process.env.CIRCLECI === 'true') return 'circleci';
  return null;
}

/**
 * Dial GitHub Actions CI
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CIDialResult}
 */
function dialGitHub(config = {}) {
  const env = parseGitHubEnv();
  const serverUrl = config.serverUrl || env.serverUrl;
  const repository = config.repository || env.repository;

  return {
    provider: 'github',
    webhookUrl: `${serverUrl}/${repository}/actions`,
    trigger: config.trigger || env.eventName || 'manual',
    status: config.status || (env.runId ? 'running' : 'idle'),
  };
}

/**
 * Dial GitLab CI
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CIDialResult}
 */
function dialGitLab(config = {}) {
  const env = parseGitLabEnv();
  const serverUrl = config.serverUrl || env.serverUrl;
  const projectPath = config.projectPath || env.projectPath;

  return {
    provider: 'gitlab',
    webhookUrl: `${serverUrl}/${projectPath}/pipelines`,
    trigger: config.trigger || env.pipelineSource || 'manual',
    status: config.status || (env.pipelineId ? 'running' : 'idle'),
  };
}

/**
 * Dial Jenkins CI
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CIDialResult}
 */
function dialJenkins(config = {}) {
  const env = parseJenkinsEnv();
  const jenkinsUrl = config.jenkinsUrl || env.jenkinsUrl;
  const jobName = config.jobName || env.jobName;

  return {
    provider: 'jenkins',
    webhookUrl: jenkinsUrl ? `${jenkinsUrl}job/${encodeURIComponent(jobName)}/build` : '',
    trigger: config.trigger || (env.buildTag ? 'scm' : 'manual'),
    status: config.status || (env.buildNumber ? 'running' : 'idle'),
  };
}

/**
 * Dial CircleCI
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CIDialResult}
 */
function dialCircleCI(config = {}) {
  const env = parseCircleCIEnv();
  const username = config.username || env.projectUsername;
  const reponame = config.reponame || env.projectReponame;

  return {
    provider: 'circleci',
    webhookUrl: `https://circleci.com/api/v2/project/gh/${username}/${reponame}/pipeline`,
    trigger: config.trigger || (env.workflowId ? 'webhook' : 'manual'),
    status: config.status || (env.buildNum ? 'running' : 'idle'),
  };
}

/**
 * Dial a CI provider by name or auto-detect
 * @param {Object} [config={}] - Configuration with optional `provider` field
 * @returns {CIDialResult}
 */
function dial(config = {}) {
  const provider = config.provider || detectCI();

  switch (provider) {
    case 'github':
      return dialGitHub(config);
    case 'gitlab':
      return dialGitLab(config);
    case 'jenkins':
      return dialJenkins(config);
    case 'circleci':
      return dialCircleCI(config);
    default:
      return {
        provider: 'unknown',
        webhookUrl: '',
        trigger: 'none',
        status: 'unavailable',
      };
  }
}

module.exports = {
  dial,
  dialGitHub,
  dialGitLab,
  dialJenkins,
  dialCircleCI,
  detectCI,
  parseGitHubEnv,
  parseGitLabEnv,
  parseJenkinsEnv,
  parseCircleCIEnv,
};
