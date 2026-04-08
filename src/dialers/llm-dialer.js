'use strict';

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

/**
 * @typedef {Object} LLMResponse
 * @property {string} response - The model's response text
 * @property {Object} meta - Metadata about the request
 * @property {string} meta.provider - Provider name
 * @property {string} meta.model - Model used
 * @property {number} meta.latencyMs - Request latency in milliseconds
 * @property {Object} [meta.usage] - Token usage if available
 */

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
      method: options.method || 'POST',
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
    req.setTimeout(options.timeout || 120000, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Build the request body for a given provider
 * @param {string} provider - Provider name
 * @param {string} prompt - The prompt text
 * @param {Object} options - Provider-specific options
 * @returns {Object} Request body
 */
function buildRequestBody(provider, prompt, options = {}) {
  const model = options.model;
  const maxTokens = options.maxTokens || 4096;
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const systemPrompt = options.system || '';

  switch (provider) {
    case 'claude': {
      const body = {
        model: model || 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        temperature,
        messages: [{ role: 'user', content: prompt }],
      };
      if (systemPrompt) body.system = systemPrompt;
      return body;
    }
    case 'openai': {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      return {
        model: model || 'gpt-4o',
        messages,
        max_tokens: maxTokens,
        temperature,
      };
    }
    case 'gemini': {
      return {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      };
    }
    case 'grok': {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      return {
        model: model || 'grok-2',
        messages,
        max_tokens: maxTokens,
        temperature,
      };
    }
    case 'deepseek': {
      const messages = [];
      if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
      messages.push({ role: 'user', content: prompt });
      return {
        model: model || 'deepseek-chat',
        messages,
        max_tokens: maxTokens,
        temperature,
      };
    }
    case 'ollama': {
      return {
        model: model || 'llama3',
        prompt,
        options: {
          num_predict: maxTokens,
          temperature,
        },
        system: systemPrompt || undefined,
      };
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Parse the response from a given provider
 * @param {string} provider - Provider name
 * @param {Object} parsed - Parsed JSON response
 * @returns {{ text: string, usage: Object|null }}
 */
function parseResponse(provider, parsed) {
  switch (provider) {
    case 'claude':
      return {
        text: (parsed.content && parsed.content[0] && parsed.content[0].text) || '',
        usage: parsed.usage || null,
      };
    case 'openai':
    case 'grok':
    case 'deepseek':
      return {
        text: (parsed.choices && parsed.choices[0] && parsed.choices[0].message && parsed.choices[0].message.content) || '',
        usage: parsed.usage || null,
      };
    case 'gemini':
      return {
        text: (parsed.candidates && parsed.candidates[0] && parsed.candidates[0].content
          && parsed.candidates[0].content.parts && parsed.candidates[0].content.parts[0]
          && parsed.candidates[0].content.parts[0].text) || '',
        usage: parsed.usageMetadata || null,
      };
    case 'ollama':
      return {
        text: parsed.response || '',
        usage: null,
      };
    default:
      return { text: '', usage: null };
  }
}

/**
 * Get API URL and headers for a provider
 * @param {string} provider - Provider name
 * @param {Object} options - Options with optional apiUrl, token, model
 * @returns {{ url: string, headers: Object }}
 */
function resolveEndpoint(provider, options = {}) {
  switch (provider) {
    case 'claude': {
      const apiKey = options.token || process.env.ANTHROPIC_API_KEY || '';
      return {
        url: options.apiUrl || 'https://api.anthropic.com/v1/messages',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
      };
    }
    case 'openai': {
      const apiKey = options.token || process.env.OPENAI_API_KEY || '';
      return {
        url: options.apiUrl || 'https://api.openai.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      };
    }
    case 'gemini': {
      const apiKey = options.token || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
      const model = options.model || 'gemini-pro';
      return {
        url: options.apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }
    case 'grok': {
      const apiKey = options.token || process.env.XAI_API_KEY || process.env.GROK_API_KEY || '';
      return {
        url: options.apiUrl || 'https://api.x.ai/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      };
    }
    case 'deepseek': {
      const apiKey = options.token || process.env.DEEPSEEK_API_KEY || '';
      return {
        url: options.apiUrl || 'https://api.deepseek.com/v1/chat/completions',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      };
    }
    case 'ollama': {
      return {
        url: options.apiUrl || process.env.OLLAMA_HOST || 'http://localhost:11434/api/generate',
        headers: {
          'Content-Type': 'application/json',
        },
      };
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}

/**
 * Detect which LLM provider is available based on env vars
 * @returns {string|null} Detected provider or null
 */
function detectProvider() {
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.XAI_API_KEY || process.env.GROK_API_KEY) return 'grok';
  if (process.env.DEEPSEEK_API_KEY) return 'deepseek';
  if (process.env.OLLAMA_HOST) return 'ollama';
  return null;
}

/**
 * Send a prompt to Claude
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendClaude(prompt, options = {}) {
  return sendToProvider('claude', prompt, options);
}

/**
 * Send a prompt to OpenAI
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendOpenAI(prompt, options = {}) {
  return sendToProvider('openai', prompt, options);
}

/**
 * Send a prompt to Gemini
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendGemini(prompt, options = {}) {
  return sendToProvider('gemini', prompt, options);
}

/**
 * Send a prompt to Grok
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendGrok(prompt, options = {}) {
  return sendToProvider('grok', prompt, options);
}

/**
 * Send a prompt to DeepSeek
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendDeepSeek(prompt, options = {}) {
  return sendToProvider('deepseek', prompt, options);
}

/**
 * Send a prompt to Ollama
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options
 * @returns {Promise<LLMResponse>}
 */
async function sendOllama(prompt, options = {}) {
  return sendToProvider('ollama', prompt, options);
}

/**
 * Send a prompt to a specific provider
 * @param {string} provider - Provider name
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Provider options
 * @returns {Promise<LLMResponse>}
 */
async function sendToProvider(provider, prompt, options = {}) {
  const { url, headers } = resolveEndpoint(provider, options);
  const requestBody = buildRequestBody(provider, prompt, options);
  const body = JSON.stringify(requestBody);

  headers['Content-Length'] = Buffer.byteLength(body);

  const startTime = Date.now();
  const result = await httpRequest(url, { method: 'POST', headers, body, timeout: options.timeout });
  const latencyMs = Date.now() - startTime;

  let parsed;
  try {
    parsed = JSON.parse(result.body);
  } catch {
    throw new Error(`Failed to parse ${provider} response: ${result.body.substring(0, 200)}`);
  }

  if (result.statusCode >= 400) {
    throw new Error(`${provider} API error (${result.statusCode}): ${JSON.stringify(parsed)}`);
  }

  const { text, usage } = parseResponse(provider, parsed);

  return {
    response: text,
    meta: {
      provider,
      model: options.model || requestBody.model || 'default',
      latencyMs,
      usage,
    },
  };
}

/**
 * Send a prompt, auto-detecting the provider
 * @param {string} prompt - The prompt text
 * @param {Object} [options={}] - Options with optional `provider` field
 * @returns {Promise<LLMResponse>}
 */
async function send(prompt, options = {}) {
  const provider = options.provider || detectProvider();
  if (!provider) {
    throw new Error('No LLM provider detected. Set an API key env var or specify options.provider.');
  }
  return sendToProvider(provider, prompt, options);
}

module.exports = {
  send,
  sendClaude,
  sendOpenAI,
  sendGemini,
  sendGrok,
  sendDeepSeek,
  sendOllama,
  sendToProvider,
  detectProvider,
  resolveEndpoint,
  buildRequestBody,
  parseResponse,
  httpRequest,
};
