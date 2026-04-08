'use strict';

/**
 * @typedef {Object} CodeHostDialResult
 * @property {string} provider - The code host provider name
 * @property {string} apiUrl - Resolved API URL
 * @property {string} token - Authentication token
 * @property {string} repo - Repository identifier
 * @property {string} branch - Current branch
 */

/**
 * Detect token from environment for GitHub
 * @returns {string} Token value or empty string
 */
function detectGitHubToken() {
  return process.env.GITHUB_TOKEN
    || process.env.GH_TOKEN
    || process.env.GITHUB_PAT
    || '';
}

/**
 * Detect token from environment for GitLab
 * @returns {string} Token value or empty string
 */
function detectGitLabToken() {
  return process.env.GITLAB_TOKEN
    || process.env.GL_TOKEN
    || process.env.CI_JOB_TOKEN
    || '';
}

/**
 * Detect token from environment for Bitbucket
 * @returns {string} Token value or empty string
 */
function detectBitbucketToken() {
  return process.env.BITBUCKET_TOKEN
    || process.env.BITBUCKET_ACCESS_TOKEN
    || '';
}

/**
 * Detect token from environment for Azure DevOps
 * @returns {string} Token value or empty string
 */
function detectAzureToken() {
  return process.env.AZURE_DEVOPS_TOKEN
    || process.env.AZURE_DEVOPS_PAT
    || process.env.SYSTEM_ACCESSTOKEN
    || '';
}

/**
 * Resolve API URL for a provider
 * @param {string} provider - Provider name
 * @param {Object} [config={}] - Configuration overrides
 * @returns {string} Resolved API URL
 */
function resolveApiUrl(provider, config = {}) {
  if (config.apiUrl) return config.apiUrl;

  switch (provider) {
    case 'github':
      return process.env.GITHUB_API_URL || 'https://api.github.com';
    case 'gitlab':
      return process.env.CI_API_V4_URL
        || (process.env.GITLAB_HOST ? `https://${process.env.GITLAB_HOST}/api/v4` : 'https://gitlab.com/api/v4');
    case 'bitbucket':
      return process.env.BITBUCKET_API_URL || 'https://api.bitbucket.org/2.0';
    case 'azure':
      return process.env.AZURE_DEVOPS_URL
        || (process.env.SYSTEM_COLLECTIONURI || 'https://dev.azure.com');
    default:
      return '';
  }
}

/**
 * Detect repository identifier from environment
 * @param {string} provider - Provider name
 * @returns {string} Repository identifier
 */
function detectRepo(provider) {
  switch (provider) {
    case 'github':
      return process.env.GITHUB_REPOSITORY || '';
    case 'gitlab':
      return process.env.CI_PROJECT_PATH || '';
    case 'bitbucket':
      return process.env.BITBUCKET_REPO_FULL_NAME
        || (process.env.BITBUCKET_WORKSPACE && process.env.BITBUCKET_REPO_SLUG
          ? `${process.env.BITBUCKET_WORKSPACE}/${process.env.BITBUCKET_REPO_SLUG}`
          : '');
    case 'azure':
      return process.env.BUILD_REPOSITORY_NAME || '';
    default:
      return '';
  }
}

/**
 * Detect current branch from environment
 * @param {string} provider - Provider name
 * @returns {string} Branch name
 */
function detectBranch(provider) {
  switch (provider) {
    case 'github': {
      const ref = process.env.GITHUB_REF || '';
      return ref.replace('refs/heads/', '');
    }
    case 'gitlab':
      return process.env.CI_COMMIT_BRANCH || '';
    case 'bitbucket':
      return process.env.BITBUCKET_BRANCH || '';
    case 'azure':
      return (process.env.BUILD_SOURCEBRANCH || '').replace('refs/heads/', '');
    default:
      return '';
  }
}

/**
 * Dial GitHub code host
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CodeHostDialResult}
 */
function dialGitHub(config = {}) {
  return {
    provider: 'github',
    apiUrl: resolveApiUrl('github', config),
    token: config.token || detectGitHubToken(),
    repo: config.repo || detectRepo('github'),
    branch: config.branch || detectBranch('github'),
  };
}

/**
 * Dial GitLab code host
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CodeHostDialResult}
 */
function dialGitLab(config = {}) {
  return {
    provider: 'gitlab',
    apiUrl: resolveApiUrl('gitlab', config),
    token: config.token || detectGitLabToken(),
    repo: config.repo || detectRepo('gitlab'),
    branch: config.branch || detectBranch('gitlab'),
  };
}

/**
 * Dial Bitbucket code host
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CodeHostDialResult}
 */
function dialBitbucket(config = {}) {
  return {
    provider: 'bitbucket',
    apiUrl: resolveApiUrl('bitbucket', config),
    token: config.token || detectBitbucketToken(),
    repo: config.repo || detectRepo('bitbucket'),
    branch: config.branch || detectBranch('bitbucket'),
  };
}

/**
 * Dial Azure DevOps code host
 * @param {Object} [config={}] - Configuration overrides
 * @returns {CodeHostDialResult}
 */
function dialAzure(config = {}) {
  return {
    provider: 'azure',
    apiUrl: resolveApiUrl('azure', config),
    token: config.token || detectAzureToken(),
    repo: config.repo || detectRepo('azure'),
    branch: config.branch || detectBranch('azure'),
  };
}

/**
 * Detect which code host is available based on env vars
 * @returns {string|null} Detected provider or null
 */
function detectCodeHost() {
  if (process.env.GITHUB_REPOSITORY || process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return 'github';
  if (process.env.CI_PROJECT_PATH || process.env.GITLAB_TOKEN) return 'gitlab';
  if (process.env.BITBUCKET_REPO_FULL_NAME || process.env.BITBUCKET_TOKEN) return 'bitbucket';
  if (process.env.BUILD_REPOSITORY_NAME || process.env.AZURE_DEVOPS_TOKEN) return 'azure';
  return null;
}

/**
 * Dial a code host by name or auto-detect
 * @param {Object} [config={}] - Configuration with optional `provider` field
 * @returns {CodeHostDialResult}
 */
function dial(config = {}) {
  const provider = config.provider || detectCodeHost();

  switch (provider) {
    case 'github':
      return dialGitHub(config);
    case 'gitlab':
      return dialGitLab(config);
    case 'bitbucket':
      return dialBitbucket(config);
    case 'azure':
      return dialAzure(config);
    default:
      return {
        provider: 'unknown',
        apiUrl: '',
        token: '',
        repo: '',
        branch: '',
      };
  }
}

module.exports = {
  dial,
  dialGitHub,
  dialGitLab,
  dialBitbucket,
  dialAzure,
  detectCodeHost,
  resolveApiUrl,
  detectRepo,
  detectBranch,
  detectGitHubToken,
  detectGitLabToken,
  detectBitbucketToken,
  detectAzureToken,
};
