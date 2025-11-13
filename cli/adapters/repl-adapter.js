// REPL adapter: create a dispatcher to route parsed input to unified commands
// This is scaffolding for future integration. Not wired by default.

function createReplDispatcher(commands, _options = {}) {
  const map = new Map();
  for (const c of commands) map.set(c.name, c);

  return async function dispatch(cmdName, args = {}, context = {}) {
    const def = map.get(cmdName);
    if (!def) return false; // not handled
    if (def.handleREPL) {
      await def.handleREPL(args, { adapter: 'repl', ...context });
    } else if (def.execute) {
      await def.execute(args, { adapter: 'repl', ...context });
    }
    return true;
  };
}

module.exports = { createReplDispatcher };