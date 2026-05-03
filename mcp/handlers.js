// Dialer MCP — handlers
// Direct Node imports of the dialer surfaces.
'use strict';

const dialer = require('..');

async function dialer_notify(args) {
  const { provider = 'auto', message, channel, subject, to } = args;
  if (!message) throw new Error('dialer_notify: message is required');
  const opts = {};
  if (channel) opts.channel = channel;
  if (subject) opts.subject = subject;
  if (to) opts.to = to;

  const notification = dialer.notification;
  switch (provider) {
    case 'slack':   return notification.sendSlack(message, opts);
    case 'discord': return notification.sendDiscord(message, opts);
    case 'teams':   return notification.sendTeams(message, opts);
    case 'email':
      if (!to || !subject) throw new Error('dialer_notify: to and subject required for email');
      return notification.sendEmail({ to, subject, body: message }, opts);
    case 'auto':
    default:
      // notification.send auto-detects platform from env vars
      return notification.send(message, opts);
  }
}

async function dialer_ci_detect(_args) {
  const ci = dialer.ci;
  const detected = ci.detectCI ? ci.detectCI() : null;
  if (!detected || detected === 'none') {
    return { provider: null, inCI: false };
  }
  // ci.dial() returns the parsed env metadata for the detected provider
  const meta = ci.dial ? ci.dial() : {};
  return { provider: detected, inCI: true, ...meta };
}

async function dialer_codehost_status(args) {
  const codeHost = dialer.codeHost;
  const provider = args.provider && args.provider !== 'auto'
    ? args.provider
    : (codeHost.detectCodeHost ? codeHost.detectCodeHost() : null);
  if (!provider) {
    return { provider: null, repo: null, branch: null };
  }
  const repo = codeHost.detectRepo ? codeHost.detectRepo(provider) : null;
  const branch = codeHost.detectBranch ? codeHost.detectBranch(provider) : null;
  return { provider, repo, branch };
}

module.exports = {
  dialer_notify,
  dialer_ci_detect,
  dialer_codehost_status,
};
