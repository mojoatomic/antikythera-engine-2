// CLI adapter: registers unified commands to Commander
// Usage: const { registerCLICommands } = require('./adapters/cli-adapter');
//        registerCLICommands(program, commands)

function applyOptions(cmd, options = []) {
  for (const o of options) {
    if (!o || !o.flag) continue;
    if (Object.prototype.hasOwnProperty.call(o, 'default')) {
      cmd.option(o.flag, o.description || '', o.default);
    } else {
      cmd.option(o.flag, o.description || '');
    }
  }
}

function registerCLICommands(program, commands = []) {
  const registered = [];
  for (const def of commands) {
    const cmd = program.command(def.name).description(def.description || '');
    // Positional arguments
    if (Array.isArray(def.arguments)) {
      for (const a of def.arguments) {
        const name = typeof a === 'string' ? a : a.name;
        const required = typeof a === 'string' ? true : (a.required !== false);
        const desc = typeof a === 'string' ? '' : (a.description || '');
        cmd.argument(required ? `<${name}>` : `[${name}]`, desc);
      }
    }
    applyOptions(cmd, def.options);
    cmd.action((...invokeArgs) => {
      const cmdObj = invokeArgs[invokeArgs.length - 1] || {};
      const opts = (cmdObj && typeof cmdObj.opts === 'function') ? cmdObj.opts() : cmdObj;
      const positionals = invokeArgs.slice(0, invokeArgs.length - 1);
      const argMap = {};
      if (Array.isArray(def.arguments)) {
        def.arguments.forEach((a, i) => {
          const n = typeof a === 'string' ? a : a.name;
          argMap[n] = positionals[i];
        });
      }
      const finalArgs = { ...argMap, ...opts };
      return Promise.resolve(
        def.handleCLI ? def.handleCLI(finalArgs, { adapter: 'cli' }) : def.execute(finalArgs, { adapter: 'cli' })
      );
    });
    registered.push(cmd);
  }
  return registered;
}

module.exports = { registerCLICommands };