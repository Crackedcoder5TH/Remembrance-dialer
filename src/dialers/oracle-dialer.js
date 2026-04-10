'use strict';

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Make an HTTP/HTTPS request
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @returns {Promise<{statusCode: number, body: string, headers: Object}>}
 */
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const transport = parsed.protocol === 'https:' ? https : http;

    const reqOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = transport.request(reqOptions, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: Buffer.concat(chunks).toString('utf-8'),
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeout || 30000, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Detect whether Oracle Toolkit is available locally
 * @param {string} [localPath] - Path to check for local Oracle Toolkit
 * @returns {boolean} True if local Oracle Toolkit is detected
 */
function detectLocalOracle(localPath) {
  const checkPaths = [
    localPath,
    process.env.ORACLE_TOOLKIT_PATH,
    path.join(process.cwd(), 'remembrance-oracle-toolkit'),
    path.join(process.cwd(), '..', 'remembrance-oracle-toolkit'),
  ].filter(Boolean);

  for (const p of checkPaths) {
    try {
      if (fs.existsSync(path.join(p, 'package.json'))) {
        return true;
      }
    } catch {
      // path doesn't exist, continue
    }
  }
  return false;
}

/**
 * Resolve the Oracle Toolkit local path
 * @param {string} [configPath] - Optional path override
 * @returns {string|null} Resolved local path or null
 */
function resolveLocalPath(configPath) {
  const checkPaths = [
    configPath,
    process.env.ORACLE_TOOLKIT_PATH,
    path.join(process.cwd(), 'remembrance-oracle-toolkit'),
    path.join(process.cwd(), '..', 'remembrance-oracle-toolkit'),
  ].filter(Boolean);

  for (const p of checkPaths) {
    try {
      if (fs.existsSync(path.join(p, 'package.json'))) {
        return p;
      }
    } catch {
      // continue
    }
  }
  return null;
}

/**
 * Detect the mode: local or remote
 * @param {Object} [config={}] - Configuration
 * @returns {'local'|'remote'} Detected mode
 */
function detectMode(config = {}) {
  if (config.mode) return config.mode;
  if (config.remoteUrl || process.env.ORACLE_TOOLKIT_URL) return 'remote';
  if (detectLocalOracle(config.localPath)) return 'local';
  return 'remote';
}

/**
 * Get the remote URL for Oracle Toolkit API
 * @param {Object} [config={}] - Configuration
 * @returns {string} Remote URL
 */
function getRemoteUrl(config = {}) {
  return config.remoteUrl
    || process.env.ORACLE_TOOLKIT_URL
    || 'http://localhost:3000';
}

/**
 * Make a request to the Oracle Toolkit (remote mode)
 * @param {string} endpoint - API endpoint path
 * @param {Object} [options={}] - Request options
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Parsed response
 */
async function remoteRequest(endpoint, options = {}, config = {}) {
  const baseUrl = getRemoteUrl(config);
  const url = `${baseUrl}${endpoint}`;
  const token = config.token || process.env.ORACLE_TOOLKIT_TOKEN || '';

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };

  const body = options.body ? JSON.stringify(options.body) : undefined;
  if (body) {
    headers['Content-Length'] = Buffer.byteLength(body);
  }

  const result = await httpRequest(url, {
    method: options.method || (options.body ? 'POST' : 'GET'),
    headers,
    body,
  });

  try {
    return JSON.parse(result.body);
  } catch {
    return { raw: result.body, statusCode: result.statusCode };
  }
}

/**
 * Load a local Oracle Toolkit module
 * @param {Object} [config={}] - Configuration
 * @returns {Object|null} The loaded module or null
 */
function loadLocalOracle(config = {}) {
  const localPath = resolveLocalPath(config.localPath);
  if (!localPath) return null;

  try {
    return require(localPath);
  } catch {
    return null;
  }
}

/**
 * Search the Oracle for patterns, memories, or knowledge
 * @param {string} query - Search query
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Search results
 */
async function search(query, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const oracle = loadLocalOracle(config);
    if (oracle && typeof oracle.search === 'function') {
      return oracle.search(query);
    }
  }

  return remoteRequest('/api/search', {
    method: 'POST',
    body: { query, options: config.searchOptions || {} },
  }, config);
}

/**
 * Resolve a reference or identifier in the Oracle
 * @param {string} reference - Reference to resolve
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Resolved result
 */
async function resolve(reference, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const oracle = loadLocalOracle(config);
    if (oracle && typeof oracle.resolve === 'function') {
      return oracle.resolve(reference);
    }
  }

  return remoteRequest('/api/resolve', {
    method: 'POST',
    body: { reference },
  }, config);
}

/**
 * Submit data to the Oracle
 * @param {Object} data - Data to submit
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Submission result
 */
async function submit(data, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const oracle = loadLocalOracle(config);
    if (oracle && typeof oracle.submit === 'function') {
      return oracle.submit(data);
    }
  }

  return remoteRequest('/api/submit', {
    method: 'POST',
    body: { data },
  }, config);
}

/**
 * Register a new pattern, entity, or integration with the Oracle
 * @param {Object} registration - Registration data
 * @param {string} registration.type - Type of registration
 * @param {string} registration.name - Name to register
 * @param {Object} [registration.metadata] - Additional metadata
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Registration result
 */
async function register(registration, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const oracle = loadLocalOracle(config);
    if (oracle && typeof oracle.register === 'function') {
      return oracle.register(registration);
    }
  }

  return remoteRequest('/api/register', {
    method: 'POST',
    body: registration,
  }, config);
}

/**
 * Cascade a signal through the Oracle network
 * @param {Object} signal - Signal to cascade
 * @param {string} signal.type - Signal type
 * @param {*} signal.payload - Signal payload
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Cascade result
 */
async function cascade(signal, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const oracle = loadLocalOracle(config);
    if (oracle && typeof oracle.cascade === 'function') {
      return oracle.cascade(signal);
    }
  }

  return remoteRequest('/api/cascade', {
    method: 'POST',
    body: signal,
  }, config);
}

module.exports = {
  search,
  resolve,
  submit,
  register,
  cascade,
  detectMode,
  detectLocalOracle,
  resolveLocalPath,
  getRemoteUrl,
  remoteRequest,
  loadLocalOracle,
  httpRequest,
};
