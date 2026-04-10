'use strict';

const ciDialer = require('./dialers/ci-dialer');
const codeHostDialer = require('./dialers/code-host-dialer');
const notificationDialer = require('./dialers/notification-dialer');
const llmDialer = require('./dialers/llm-dialer');
const oracleDialer = require('./dialers/oracle-dialer');
const voidDialer = require('./dialers/void-dialer');

/**
 * @typedef {Object} DialerEntry
 * @property {string} name - Dialer name
 * @property {string} category - Dialer category
 * @property {Object} module - The dialer module
 * @property {Function} detect - Detection function
 */

/**
 * All registered dialers
 * @type {DialerEntry[]}
 */
const dialers = [
  {
    name: 'ci',
    category: 'integration',
    module: ciDialer,
    detect: () => ciDialer.detectCI(),
  },
  {
    name: 'code-host',
    category: 'integration',
    module: codeHostDialer,
    detect: () => codeHostDialer.detectCodeHost(),
  },
  {
    name: 'notification',
    category: 'communication',
    module: notificationDialer,
    detect: () => notificationDialer.detectPlatform(),
  },
  {
    name: 'llm',
    category: 'ai',
    module: llmDialer,
    detect: () => llmDialer.detectProvider(),
  },
  {
    name: 'oracle',
    category: 'remembrance',
    module: oracleDialer,
    detect: () => oracleDialer.detectMode(),
  },
  {
    name: 'void',
    category: 'remembrance',
    module: voidDialer,
    detect: () => voidDialer.detectMode(),
  },
];

/**
 * Get a dialer by name
 * @param {string} name - Dialer name
 * @returns {DialerEntry|undefined} The dialer entry or undefined
 */
function getDialer(name) {
  return dialers.find((d) => d.name === name);
}

/**
 * Get all dialers in a category
 * @param {string} category - Category to filter by
 * @returns {DialerEntry[]} Matching dialers
 */
function getDialersByCategory(category) {
  return dialers.filter((d) => d.category === category);
}

/**
 * List all registered dialer names
 * @returns {string[]} Array of dialer names
 */
function listDialers() {
  return dialers.map((d) => d.name);
}

/**
 * Discover all available integrations based on environment
 * @returns {Object} Map of dialer name to detected provider/mode
 */
function discoverAvailable() {
  const available = {};

  for (const dialer of dialers) {
    try {
      const detected = dialer.detect();
      if (detected) {
        available[dialer.name] = {
          category: dialer.category,
          detected,
        };
      }
    } catch {
      // Detection failed, skip this dialer
    }
  }

  return available;
}

/**
 * Get a summary of the registry state
 * @returns {Object} Registry summary
 */
function summary() {
  const available = discoverAvailable();
  return {
    total: dialers.length,
    available: Object.keys(available).length,
    dialers: dialers.map((d) => ({
      name: d.name,
      category: d.category,
      detected: available[d.name] ? available[d.name].detected : null,
    })),
  };
}

module.exports = {
  dialers,
  getDialer,
  getDialersByCategory,
  listDialers,
  discoverAvailable,
  summary,
};
