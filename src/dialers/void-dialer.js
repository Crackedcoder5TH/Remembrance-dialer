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
 * Detect whether Void Data Compressor is available locally
 * @param {string} [localPath] - Path to check
 * @returns {boolean} True if local Void is detected
 */
function detectLocalVoid(localPath) {
  const checkPaths = [
    localPath,
    process.env.VOID_COMPRESSOR_PATH,
    path.join(process.cwd(), 'void-data-compressor'),
    path.join(process.cwd(), '..', 'void-data-compressor'),
  ].filter(Boolean);

  for (const p of checkPaths) {
    try {
      if (fs.existsSync(path.join(p, 'package.json'))) {
        return true;
      }
    } catch {
      // continue
    }
  }
  return false;
}

/**
 * Resolve the Void Data Compressor local path
 * @param {string} [configPath] - Optional path override
 * @returns {string|null} Resolved local path or null
 */
function resolveLocalPath(configPath) {
  const checkPaths = [
    configPath,
    process.env.VOID_COMPRESSOR_PATH,
    path.join(process.cwd(), 'void-data-compressor'),
    path.join(process.cwd(), '..', 'void-data-compressor'),
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
  if (config.remoteUrl || process.env.VOID_COMPRESSOR_URL) return 'remote';
  if (detectLocalVoid(config.localPath)) return 'local';
  return 'remote';
}

/**
 * Get the remote URL for Void Data Compressor API
 * @param {Object} [config={}] - Configuration
 * @returns {string} Remote URL
 */
function getRemoteUrl(config = {}) {
  return config.remoteUrl
    || process.env.VOID_COMPRESSOR_URL
    || 'http://localhost:3001';
}

/**
 * Make a request to the Void Data Compressor (remote mode)
 * @param {string} endpoint - API endpoint path
 * @param {Object} [options={}] - Request options
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Parsed response
 */
async function remoteRequest(endpoint, options = {}, config = {}) {
  const baseUrl = getRemoteUrl(config);
  const url = `${baseUrl}${endpoint}`;
  const token = config.token || process.env.VOID_COMPRESSOR_TOKEN || '';

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
 * Load a local Void Data Compressor module
 * @param {Object} [config={}] - Configuration
 * @returns {Object|null} The loaded module or null
 */
function loadLocalVoid(config = {}) {
  const localPath = resolveLocalPath(config.localPath);
  if (!localPath) return null;

  try {
    return require(localPath);
  } catch {
    return null;
  }
}

/**
 * Cascade data through the Void compressor
 * @param {Object} data - Data to cascade
 * @param {string} data.type - Cascade type
 * @param {*} data.payload - Data payload
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Cascade result
 */
async function cascade(data, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const voidModule = loadLocalVoid(config);
    if (voidModule && typeof voidModule.cascade === 'function') {
      return voidModule.cascade(data);
    }
  }

  return remoteRequest('/api/cascade', {
    method: 'POST',
    body: data,
  }, config);
}

/**
 * Check coherence of data through the Void compressor
 * @param {Object} data - Data to check coherence for
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Coherence result
 */
async function coherence(data, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const voidModule = loadLocalVoid(config);
    if (voidModule && typeof voidModule.coherence === 'function') {
      return voidModule.coherence(data);
    }
  }

  return remoteRequest('/api/coherence', {
    method: 'POST',
    body: data,
  }, config);
}

/**
 * Compress data through the Void compressor
 * @param {*} data - Data to compress
 * @param {Object} [options={}] - Compression options
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Compression result
 */
async function compress(data, options = {}, config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const voidModule = loadLocalVoid(config);
    if (voidModule && typeof voidModule.compress === 'function') {
      return voidModule.compress(data, options);
    }
  }

  return remoteRequest('/api/compress', {
    method: 'POST',
    body: { data, options },
  }, config);
}

/**
 * Get the status of the Void Data Compressor
 * @param {Object} [config={}] - Configuration
 * @returns {Promise<Object>} Status result
 */
async function status(config = {}) {
  const mode = detectMode(config);

  if (mode === 'local') {
    const voidModule = loadLocalVoid(config);
    if (voidModule && typeof voidModule.status === 'function') {
      return voidModule.status();
    }
    return { mode: 'local', status: 'available' };
  }

  return remoteRequest('/api/status', { method: 'GET' }, config);
}

module.exports = {
  cascade,
  coherence,
  compress,
  status,
  detectMode,
  detectLocalVoid,
  resolveLocalPath,
  getRemoteUrl,
  remoteRequest,
  loadLocalVoid,
  httpRequest,
};
