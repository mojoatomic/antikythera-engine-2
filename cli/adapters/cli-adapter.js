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
    // Allow option-like values (e.g., negative coordinates) for control without treating them as unknown options
    if (def.name === 'control') {
      cmd.allowUnknownOption(true);
    }
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
      let positionals = invokeArgs.slice(0, invokeArgs.length - 1);
      const argMap = {};
      if (Array.isArray(def.arguments)) {
        def.arguments.forEach((a, i) => {
          const n = typeof a === 'string' ? a : a.name;
          argMap[n] = positionals[i];
        });
      }
      // Special-case control so that optional value can safely start with '-' (e.g., negative latitude)
      if (def.name === 'control') {
        const rawArgs = Array.isArray(cmdObj.args) ? cmdObj.args : [];
        // Ensure action is populated from raw args if not already mapped
        if (argMap.action == null && rawArgs.length > 0) {
          argMap.action = rawArgs[0];
        }
        // If value was not bound by Commander (e.g., looks like an option), recover it from raw args
        if (argMap.value == null && rawArgs.length > 1) {
          argMap.value = rawArgs[1];
        }
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