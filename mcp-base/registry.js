// @remembrance/mcp-base — Plugin Registry
//
// Pulled from `oracle resolve "MCP server JSON-RPC..."` — the toolkit
// returned PULL on `arch:plugin-registry` at coherency 1.000. Used as
// the tool-name -> handler dispatch table in every Remembrance MCP
// server.
'use strict';

function createRegistry() {
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

  return {
    register,
    get: (name) => registry.get(name) || null,
    list: () => Array.from(registry.keys()),
    entries: () => Array.from(registry.entries()),
  };
}

module.exports = { createRegistry };
