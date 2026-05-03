// Plugin Registry — same shape across every MCP server in the ecosystem.
'use strict';

const registry = new Map();

function register(name, plugin) {
  if (typeof name !== 'string' || !name) {
    throw new Error('registry: name must be a non-empty string');
  }
  if (registry.has(name)) {
    throw new Error('registry: already registered: ' + name);
  }
  if (!plugin || typeof plugin.handler !== 'function') {
    throw new Error('registry: plugin must have a handler function');
  }
  registry.set(name, plugin);
}

function get(name) { return registry.get(name) || null; }
function list() { return Array.from(registry.keys()); }

module.exports = { register, get, list };
