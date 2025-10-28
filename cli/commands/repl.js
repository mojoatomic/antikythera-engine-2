const readline = require('readline');
const os = require('os');
const chalk = require('chalk');
const { getData, getFromAPI, getFromEngine } = require('../sources');
const { format } = require('../formatters');
const { loadContext, saveContext, getHistoryPath, loadHistory, saveHistory } = require('../utils/repl-config');
const { parseDateInput, echoParsedDate, addRelativeToDate } = require('../utils/date-parse');

const VALID_BODIES = ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn'];

function isTTY() {
  if (process.env.ANTIKYTHERA_TEST_ALLOW_NON_TTY === '1') return true;
  return process.stdout && process.stdout.isTTY && process.stdin && process.stdin.isTTY;
}

class AntikytheraREPL {
  constructor() {
    this.rl = null;
    this.context = loadContext();
    // Defaults / new flags
    if (this.context.showIntent === undefined) this.context.showIntent = true;
    if (!this.context.compareToleranceDeg) this.context.compareToleranceDeg = 0.001;
    // Watch state
    this.activeWatch = null; // { timer, body, interval }
  }

  start() {
    if (!isTTY()) {
      console.error('REPL requires an interactive TTY');
      process.exit(1);
    }

    console.log(chalk.cyan.bold('\n🌌 Antikythera REPL (type "help" for commands, Ctrl+C to cancel, exit to quit)\n'));

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.yellow('antikythera> '),
      completer: this.completer.bind(this),
      historySize: 1000
    });

    // Load history
    const hist = loadHistory();
    if (hist.length) {
      // readline expects most recent first
      this.rl.history = hist.slice(-1000).reverse();
    }

    // Ctrl+C handling
    let lastSigint = 0;
    this.rl.on('SIGINT', () => {
      // If watch is active: cancel it on first Ctrl+C
      if (this.activeWatch && this.activeWatch.timer) {
        clearInterval(this.activeWatch.timer);
        this.activeWatch = null;
        process.stdout.write(chalk.gray('Watch canceled.\n'));
        this.rl.prompt();
        return;
      }
      const now = Date.now();
      if (now - lastSigint < 600) {
        this.rl.close();
      } else {
        lastSigint = now;
        process.stdout.write(chalk.gray('^C (press again to exit)\n'));
        this.rl.prompt();
      }
    });

    this.rl.on('line', (line) => this.handleLine(line));
    this.rl.on('close', () => this.handleExit());

    this.rl.prompt();
  }

  saveAndPrompt() {
    saveContext(this.context);
    saveHistory(this.rl);
    this.rl.prompt();
  }

  async handleLine(line) {
    const input = (line || '').trim();
    if (!input) return this.rl.prompt();

    try {
      await this.execute(input);
    } catch (err) {
      console.error(chalk.red('Error:'), err.message);
    }

    this.saveAndPrompt();
  }

  async execute(input) {
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Time navigation: relative step like +2h / -30m
    if (/^[+-]\d+(s|m|h|d|w|y)$/i.test(cmd)) {
      const base = this._currentDate();
      const next = addRelativeToDate(cmd, base);
      this.context.lastDate = next;
      console.log(chalk.gray(echoParsedDate(next, this.context)));
      return;
    }

    // Built-ins
    if (['exit', 'quit', '.exit'].includes(cmd)) return this.rl.close();
    if (cmd === 'help' || cmd === '?') return this.showHelp();
    if (cmd === 'clear' || cmd === 'cls') {
      console.clear();
      return;
    }
    if (cmd === 'context' || cmd === 'ctx') return this.showContext();
    if (cmd === 'history') return this.showHistory();

    // goto / reset
    if (cmd === 'goto') {
      const dateStr = tokens.slice(1).join(' ');
      if (!dateStr) {
        console.log(chalk.red('Usage: goto <date> (ISO, relative, or natural)'));
        return;
      }
      if (dateStr.toLowerCase() === 'now') {
        this.context.lastDate = new Date();
        console.log(chalk.gray(echoParsedDate(this.context.lastDate, this.context)));
        return;
      }
      const { date, echo } = parseDateInput(dateStr, this.context);
      this.context.lastDate = date;
      console.log(chalk.gray(echo));
      return;
    }
    if (cmd === 'reset') {
      this.context.lastDate = new Date();
      console.log(chalk.gray(echoParsedDate(this.context.lastDate, this.context)));
      return;
    }

    // set commands
    if (cmd === 'set') return this.handleSet(tokens.slice(1));

    // compare / watch
    if (cmd === 'compare') return this.handleCompare(tokens.slice(1));
    if (cmd === 'watch') return this.handleWatch(tokens.slice(1));

    // all / now short-hands
    if (cmd === 'all' || (cmd === 'now' && tokens.length === 1)) return this.showAllPositions();

    // body queries: <body>, <body> at <date>, <body> now
    if (VALID_BODIES.includes(cmd)) {
      // <body> now
      if (tokens[1] && tokens[1].toLowerCase() === 'now') {
        return this.showPosition(cmd, new Date());
      }
      // <body> at <date>
      if (tokens[1] && tokens[1].toLowerCase() === 'at') {
        const dateStr = tokens.slice(2).join(' ');
        const { date, echo } = parseDateInput(dateStr, this.context);
        this.maybeEchoIntent(`${cmd} at ${echo}`);
        return this.showPosition(cmd, date);
      }
      // <body>
      this.maybeEchoIntent(`${cmd} at now`);
      return this.showPosition(cmd, new Date());
    }

    console.log(chalk.yellow('Unknown command. Type "help".'));
  }

  maybeEchoIntent(text) {
    if (this.context.showIntent && this.context.format !== 'json') {
      console.log(chalk.gray(text));
    }
  }

  async dataFor(date) {
    const opts = { local: this.context.source === 'local', remote: this.context.source === 'api' };
    // Timeout guard for API calls when source=auto
    return await getData(date, opts);
  }

  async showPosition(body, date = null) {
    this.context.lastBody = body;
    const effectiveDate = date || this._currentDate();
    this.context.lastDate = effectiveDate;
    const data = await this.dataFor(effectiveDate);
    const d = (body === 'sun' || body === 'moon') ? data[body] : data.planets[body];

    if (this.context.format === 'compact') {
      const cols = (process.stdout && process.stdout.columns) ? process.stdout.columns : 80;
      const fields = [];
      const to3 = (x) => (typeof x === 'number' && isFinite(x)) ? x.toFixed(3) : String(x);
      if (typeof d.longitude === 'number') fields.push(`lon ${to3(d.longitude)}°`);
      if (typeof d.latitude === 'number') fields.push(`lat ${to3(d.latitude)}°`);
      if (typeof d.altitude === 'number') fields.push(`alt ${to3(d.altitude)}°`);
      if (body === 'moon' && typeof d.illumination === 'number') fields.push(`illum ${(d.illumination*100).toFixed(1)}%`);
      let line = `${body.toUpperCase()}: ` + fields.join('  ');
      if (line.length > cols) {
        // Trim from rightmost fields
        while (line.length > cols && fields.length > 1) {
          fields.pop();
          line = `${body.toUpperCase()}: ` + fields.join('  ');
        }
      }
      console.log(line);
      return;
    }

    const out = format(d, this.context.format);
    // Ensure JSON prints clean
    if (this.context.format === 'json') process.stdout.write(out + os.EOL);
    else console.log(out);
  }

  async showAllPositions() {
    const data = await this.dataFor(this._currentDate());
    console.log(chalk.cyan.bold('\n=== ALL BODIES ==='));
    console.log(chalk.gray(`Date: ${data.date}\n`));
    // Sun/Moon
    for (const body of ['sun', 'moon']) {
      const d = data[body];
      console.log(chalk.yellow(body.toUpperCase().padEnd(8)) +
        `Lon: ${chalk.bold(d.longitude.toFixed(3))}° ` +
        `Lat: ${d.latitude.toFixed(3)}°`);
    }
    // Planets
    for (const body of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
      const d = data.planets[body];
      console.log(chalk.yellow(body.toUpperCase().padEnd(8)) +
        `Lon: ${chalk.bold(d.longitude.toFixed(3))}° ` +
        `Lat: ${d.latitude.toFixed(3)}°`);
    }
    console.log();
  }

  async handleCompare(args) {
    const body = (args[0] || this.context.lastBody || 'moon').toLowerCase();
    if (!VALID_BODIES.includes(body)) {
      console.log(chalk.red(`Invalid body: ${body}`));
      console.log(chalk.gray(`Valid: ${VALID_BODIES.join(', ')}`));
      return;
    }
    const date = (this.context.lastDate instanceof Date)
      ? this.context.lastDate
      : (this.context.lastDate ? new Date(this.context.lastDate) : new Date());

    console.log(chalk.cyan(`Comparing ${body} (API vs Engine)`));
    const [apiData, engineData] = await Promise.all([
      getFromAPI(date).catch(() => null),
      getFromEngine(date)
    ]);

    if (!apiData) {
      console.log(chalk.red('✗ API unavailable (timeout or error)'));
      console.log(chalk.gray('  Try: set source local or start server: npm start'));
      return;
    }
    const api = (body === 'sun' || body === 'moon') ? apiData[body] : apiData.planets[body];
    const eng = (body === 'sun' || body === 'moon') ? engineData[body] : engineData.planets[body];

    const tol = this.context.compareToleranceDeg || 0.001;
    const lonDiff = Math.abs(api.longitude - eng.longitude);
    const latDiff = Math.abs(api.latitude - eng.latitude);
    const ok = lonDiff < tol && latDiff < tol;

    console.log(`${ok ? chalk.green('✓') : chalk.red('✗')} Sources ${ok ? 'match' : 'differ'}`);
    console.log(`  Δ lon: ${lonDiff.toFixed(6)}°  Δ lat: ${latDiff.toFixed(6)}°  (tol ${tol})`);
  }

  async handleWatch(args) {
    const body = (args[0] || this.context.lastBody || 'moon').toLowerCase();
    if (!VALID_BODIES.includes(body)) {
      console.log(chalk.red(`Invalid body: ${body}`));
      return;
    }
    let interval = 1000;
    const idx = args.findIndex(a => a.toLowerCase() === 'interval');
    if (idx >= 0 && args[idx + 1]) interval = Number(args[idx + 1]) || interval;
    if (interval < 250) {
      console.log(chalk.gray('Interval too low; clamping to 250ms'));
      interval = 250;
    }

    console.log(chalk.cyan.bold(`\nWatching ${body.toUpperCase()} (Ctrl+C to stop)\n`));

    // Clear any existing watch first
    if (this.activeWatch && this.activeWatch.timer) {
      clearInterval(this.activeWatch.timer);
      this.activeWatch = null;
    }

    const update = async () => {
      try {
        const data = await this.dataFor(new Date());
        const d = (body === 'sun' || body === 'moon') ? data[body] : data.planets[body];
        const line = `${new Date().toISOString()} ${d.longitude.toFixed(6)}°`;
        console.log(this.context.format === 'json' ? JSON.stringify({ time: new Date().toISOString(), longitude: d.longitude }) : chalk.bold(line));
      } catch (err) {
        console.error(chalk.red('Watch error:'), err.message);
        if (this.activeWatch && this.activeWatch.timer) {
          clearInterval(this.activeWatch.timer);
          this.activeWatch = null;
        }
      }
    };

    await update();
    const timer = setInterval(update, interval);
    this.activeWatch = { timer, body, interval };
  }

  async handleSet(args) {
    const key = (args[0] || '').toLowerCase();
    const val = args.slice(1).join(' ');
    switch (key) {
      case 'format': {
        const ok = ['table', 'json', 'compact'].includes(val);
        if (!ok) return console.log(chalk.red('Invalid format (table|json|compact)'));
        this.context.format = val;
        console.log(chalk.green(`format=${val}`));
        break;
      }
      case 'source': {
        const ok = ['auto', 'local', 'api'].includes(val);
        if (!ok) return console.log(chalk.red('Invalid source (auto|local|api)'));
        this.context.source = val;
        console.log(chalk.green(`source=${val}`));
        break;
      }
      case 'tz': {
        // MVP: accept value and store; parsing uses system tz for now
        this.context.tz = val || 'auto';
        console.log(chalk.green(`tz=${this.context.tz}`));
        break;
      }
      case 'intent': {
        const on = val.toLowerCase();
        if (!['on', 'off', 'true', 'false'].includes(on)) return console.log(chalk.red('Usage: set intent on|off'));
        this.context.showIntent = ['on', 'true'].includes(on);
        console.log(chalk.green(`intent=${this.context.showIntent ? 'on' : 'off'}`));
        break;
      }
      case 'tolerance': {
        const num = Number(val);
        if (!isFinite(num) || num <= 0) return console.log(chalk.red('Usage: set tolerance <positive degrees>'));
        this.context.compareToleranceDeg = num;
        console.log(chalk.green(`tolerance=${num}`));
        break;
      }
      default:
        console.log(chalk.yellow('set keys: format, source, tz, intent, tolerance'));
    }
  }

  showContext() {
    const c = this.context;
    console.log(chalk.cyan.bold('\n=== CONTEXT ==='));
    console.log(`format: ${chalk.yellow(c.format)}`);
    console.log(`source: ${chalk.yellow(c.source)}`);
    console.log(`tz:     ${chalk.yellow(c.tz || 'auto')}`);
    console.log(`intent: ${chalk.yellow(c.showIntent ? 'on' : 'off')}`);
    console.log(`tolΔ:   ${chalk.yellow(c.compareToleranceDeg)}`);
    if (c.lastBody) console.log(`lastBody: ${chalk.yellow(c.lastBody)}`);
    if (c.lastDate) console.log(`lastDate: ${chalk.gray(new Date(c.lastDate).toISOString())}`);
    console.log();
  }

  showHistory() {
    const hp = getHistoryPath();
    const lines = loadHistory();
    console.log(chalk.cyan.bold(`\n=== HISTORY (${lines.length}) ===`));
    lines.slice(-20).forEach((cmd, i) => console.log(chalk.gray(`${i + 1}.`), cmd));
    console.log(chalk.gray(`file: ${hp}`));
    console.log();
  }

  showHelp() {
    console.log(chalk.cyan.bold('\nCommands'));
    console.log('  <body>                show position now');
    console.log('  <body> at <date>      show position at date (ISO | +2h | today 18:00)');
    console.log('  all                   show all bodies (compact)');
    console.log('  compare <body>        api vs engine (Δ with tolerance)');
    console.log('  watch <body> [interval N]');
    console.log('  goto <date>           set context date (ISO | +2h | today 18:00)');
    console.log('  reset                 reset context date to now');
    console.log('  +2h / -30m            step context date by relative amount');
    console.log('  set format <v> | set source <v> | set tz <v> | set intent on|off | set tolerance <deg>');
    console.log('  context | history | help | clear | exit');
    console.log();
  }

  _currentDate() {
    if (this.context && this.context.lastDate) {
      return (this.context.lastDate instanceof Date) ? this.context.lastDate : new Date(this.context.lastDate);
    }
    return new Date();
  }

  completer(line) {
    const raw = line || '';
    const trimmed = raw.trim();
    const parts = trimmed.length ? trimmed.split(/\s+/) : [];
    const last = parts.length ? (parts[parts.length - 1] || '') : '';
    const startWith = (list) => list.filter(s => s.startsWith(last));

    // Contextual after 'set'
    if (parts[0] === 'set') {
      // If only 'set' typed, show all keys
      if (parts.length === 1) {
        return [[ 'format','source','tz','intent','tolerance' ], last];
      }
      // If typing second token and no trailing space, filter by current token
      if (parts.length === 2 && !raw.endsWith(' ')) {
        return [startWith(['format','source','tz','intent','tolerance']), last];
      }
      if (parts.length >= 2) {
        const key = parts[1];
        const after = raw.endsWith(' ');
        if (key === 'format') {
          const opts = ['table','json','compact'];
          return [after ? opts : startWith(opts), last];
        }
        if (key === 'source') {
          const opts = ['auto','local','api'];
          return [after ? opts : startWith(opts), last];
        }
        if (key === 'tz') {
          const sys = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
          const current = (this.context && this.context.tz && this.context.tz !== 'auto') ? this.context.tz : null;
          const optsBase = ['auto', sys, 'UTC', 'America/Chicago', 'America/New_York', 'Europe/London', 'Europe/Paris'];
          const opts = current && !optsBase.includes(current) ? [current, ...optsBase] : optsBase;
          return [after ? opts : startWith(opts), last];
        }
        if (key === 'intent') {
          const opts = ['on','off'];
          return [after ? opts : startWith(opts), last];
        }
        return [[''], last];
      }
    }

    // After compare|watch → bodies
    if (parts[0] === 'compare' || parts[0] === 'watch') {
      const list = VALID_BODIES;
      const after = raw.endsWith(' ');
      return [after ? list : startWith(list), last];
    }

    const base = [
      ...VALID_BODIES,
      'all','now','watch','compare','goto','reset','help','exit','quit','.exit','context','history','clear','set','format','source','tz','intent','tolerance'
    ];
    const hits = base.filter(c => c.startsWith(last));
    return [hits.length ? hits : base, last];
  }

  handleExit() {
    if (this.activeWatch && this.activeWatch.timer) {
      clearInterval(this.activeWatch.timer);
      this.activeWatch = null;
    }
    saveContext(this.context);
    saveHistory(this.rl);
    console.log(chalk.cyan('\nGoodbye! 🌙'));
    process.exit(0);
  }
}

module.exports = function repl() {
  const r = new AntikytheraREPL();
  r.start();
};

// Test helpers
module.exports.__getCompleter = (context = {}) => {
  const r = new AntikytheraREPL();
  r.context = { ...r.context, ...context };
  return r.completer.bind(r);
};
