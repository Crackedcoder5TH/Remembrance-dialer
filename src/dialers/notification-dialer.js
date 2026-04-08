'use strict';

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

/**
 * Make an HTTP/HTTPS request with zero dependencies
 * @param {string} url - Target URL
 * @param {Object} options - Request options
 * @param {string} options.method - HTTP method
 * @param {Object} [options.headers] - Request headers
 * @param {string|Buffer} [options.body] - Request body
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
    req.setTimeout(30000, () => {
      req.destroy(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * Format a message as Slack Block Kit payload
 * @param {string} message - The message text
 * @param {Object} [config={}] - Additional Slack config
 * @returns {Object} Slack-formatted payload
 */
function formatSlackMessage(message, config = {}) {
  const payload = {
    channel: config.channel || '',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
    ],
  };

  if (config.title) {
    payload.blocks.unshift({
      type: 'header',
      text: {
        type: 'plain_text',
        text: config.title,
        emoji: true,
      },
    });
  }

  if (config.footer) {
    payload.blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: config.footer,
        },
      ],
    });
  }

  return payload;
}

/**
 * Format a message as Discord embed payload
 * @param {string} message - The message text
 * @param {Object} [config={}] - Additional Discord config
 * @returns {Object} Discord-formatted payload
 */
function formatDiscordMessage(message, config = {}) {
  return {
    content: config.content || '',
    embeds: [
      {
        title: config.title || 'Notification',
        description: message,
        color: config.color || 5814783,
        timestamp: new Date().toISOString(),
        footer: config.footer ? { text: config.footer } : undefined,
        fields: config.fields || [],
      },
    ],
  };
}

/**
 * Format a message as Microsoft Teams Adaptive Card
 * @param {string} message - The message text
 * @param {Object} [config={}] - Additional Teams config
 * @returns {Object} Teams-formatted payload
 */
function formatTeamsMessage(message, config = {}) {
  return {
    type: 'message',
    attachments: [
      {
        contentType: 'application/vnd.microsoft.card.adaptive',
        content: {
          type: 'AdaptiveCard',
          version: '1.4',
          body: [
            ...(config.title ? [{
              type: 'TextBlock',
              size: 'Large',
              weight: 'Bolder',
              text: config.title,
            }] : []),
            {
              type: 'TextBlock',
              text: message,
              wrap: true,
            },
            ...(config.footer ? [{
              type: 'TextBlock',
              text: config.footer,
              size: 'Small',
              isSubtle: true,
            }] : []),
          ],
        },
      },
    ],
  };
}

/**
 * Format a message as a simple email-like payload
 * @param {string} message - The message text
 * @param {Object} [config={}] - Additional email config
 * @returns {Object} Email-formatted payload
 */
function formatEmailMessage(message, config = {}) {
  return {
    to: config.to || '',
    from: config.from || 'remembrance-dialer@localhost',
    subject: config.subject || config.title || 'Remembrance Notification',
    body: message,
    html: config.html || `<div><p>${message}</p></div>`,
    headers: config.headers || {},
  };
}

/**
 * Send a notification to Slack
 * @param {string} message - Message text
 * @param {Object} [config={}] - Slack configuration
 * @param {string} config.webhookUrl - Slack webhook URL
 * @param {string} [config.token] - Slack API token (alternative to webhook)
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function sendSlack(message, config = {}) {
  const webhookUrl = config.webhookUrl || process.env.SLACK_WEBHOOK_URL || '';
  if (!webhookUrl) {
    throw new Error('Slack webhook URL is required (config.webhookUrl or SLACK_WEBHOOK_URL env var)');
  }

  const payload = formatSlackMessage(message, config);
  const body = JSON.stringify(payload);

  return httpRequest(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
  });
}

/**
 * Send a notification to Discord
 * @param {string} message - Message text
 * @param {Object} [config={}] - Discord configuration
 * @param {string} config.webhookUrl - Discord webhook URL
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function sendDiscord(message, config = {}) {
  const webhookUrl = config.webhookUrl || process.env.DISCORD_WEBHOOK_URL || '';
  if (!webhookUrl) {
    throw new Error('Discord webhook URL is required (config.webhookUrl or DISCORD_WEBHOOK_URL env var)');
  }

  const payload = formatDiscordMessage(message, config);
  const body = JSON.stringify(payload);

  return httpRequest(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
  });
}

/**
 * Send a notification to Microsoft Teams
 * @param {string} message - Message text
 * @param {Object} [config={}] - Teams configuration
 * @param {string} config.webhookUrl - Teams webhook URL
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function sendTeams(message, config = {}) {
  const webhookUrl = config.webhookUrl || process.env.TEAMS_WEBHOOK_URL || '';
  if (!webhookUrl) {
    throw new Error('Teams webhook URL is required (config.webhookUrl or TEAMS_WEBHOOK_URL env var)');
  }

  const payload = formatTeamsMessage(message, config);
  const body = JSON.stringify(payload);

  return httpRequest(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    body,
  });
}

/**
 * Send a notification via Email (SMTP relay or API endpoint)
 * @param {string} message - Message text
 * @param {Object} [config={}] - Email configuration
 * @param {string} config.apiUrl - Email API endpoint URL
 * @param {string} [config.apiKey] - Email API key
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function sendEmail(message, config = {}) {
  const apiUrl = config.apiUrl || process.env.EMAIL_API_URL || '';
  if (!apiUrl) {
    throw new Error('Email API URL is required (config.apiUrl or EMAIL_API_URL env var)');
  }

  const apiKey = config.apiKey || process.env.EMAIL_API_KEY || '';
  const payload = formatEmailMessage(message, config);
  const body = JSON.stringify(payload);

  const headers = {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  return httpRequest(apiUrl, {
    method: 'POST',
    headers,
    body,
  });
}

/**
 * Send a notification to the specified platform
 * @param {string} message - Message text
 * @param {Object} [config={}] - Configuration with `platform` field
 * @returns {Promise<{statusCode: number, body: string}>}
 */
async function send(message, config = {}) {
  const platform = config.platform || detectPlatform();

  switch (platform) {
    case 'slack':
      return sendSlack(message, config);
    case 'discord':
      return sendDiscord(message, config);
    case 'teams':
      return sendTeams(message, config);
    case 'email':
      return sendEmail(message, config);
    default:
      throw new Error(`Unknown notification platform: ${platform}`);
  }
}

/**
 * Detect available notification platform from env vars
 * @returns {string|null} Detected platform or null
 */
function detectPlatform() {
  if (process.env.SLACK_WEBHOOK_URL) return 'slack';
  if (process.env.DISCORD_WEBHOOK_URL) return 'discord';
  if (process.env.TEAMS_WEBHOOK_URL) return 'teams';
  if (process.env.EMAIL_API_URL) return 'email';
  return null;
}

module.exports = {
  send,
  sendSlack,
  sendDiscord,
  sendTeams,
  sendEmail,
  formatSlackMessage,
  formatDiscordMessage,
  formatTeamsMessage,
  formatEmailMessage,
  detectPlatform,
  httpRequest,
};
