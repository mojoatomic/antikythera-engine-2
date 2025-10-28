const readline = require('readline');
const os = require('os');
const chalk = require('chalk');
const asciichart = require('asciichart');
const { getData, getFromAPI, getFromEngine, getDisplayFromAPI } = require('../sources');
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
    // Pipeline support: detect '|' and delegate
    if (input.includes('|')) {
      return this.handlePipeline(input);
    }
    const tokens = input.split(/\s+/);
    const cmd = tokens[0].toLowerCase();

    // Pause/Resume for watch
    if (cmd === 'pause') return this.handlePause();
    if (cmd === 'resume') return this.handleResume();

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

    // next <thing>
    if (cmd === 'next') return this.handleNext(tokens.slice(1));
    // find next <event>
    if (cmd === 'find') return this.handleFind(tokens.slice(1));

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

    // compare / watch / plot
    if (cmd === 'compare') return this.handleCompare(tokens.slice(1));
    if (cmd === 'watch') return this.handleWatch(tokens.slice(1));
    if (cmd === 'plot') return this.handlePlot(tokens.slice(1));
    if (cmd === 'sample') return this.handleSample(tokens.slice(1));

    // all / now short-hands
    if (cmd === 'all' || (cmd === 'now' && tokens.length === 1)) return this.showAllPositions(tokens[1]);

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
    const opts = { local: this.context.source === 'local', remote: this.context.source === 'api', observer: this.context.location || null };
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

  async showAllPositions(filter = null) {
    const data = await this.dataFor(this._currentDate());
    console.log(chalk.cyan.bold('\n=== ALL BODIES ==='));
    console.log(chalk.gray(`Date: ${data.date}\n`));

    const passes = (body, d) => {
      if (!filter) return true;
      const f = String(filter).toLowerCase();
      if (f === 'visible') return typeof d.altitude === 'number' && d.altitude > 0;
      if (f === 'retrograde') {
        if (typeof d.velocity === 'number') return d.velocity < 0;
        return false;
      }
      if (f === 'rising') {
        try {
          // crude check (placeholder): treat "rising" as having altitude field present
          return d.altitude !== undefined;
        } catch (_) { return false; }
      }
      return true;
    };

    // Sun/Moon
    for (const body of ['sun', 'moon']) {
      const d = data[body];
      if (!passes(body, d)) continue;
      console.log(chalk.yellow(body.toUpperCase().padEnd(8)) +
        `Lon: ${chalk.bold(d.longitude?.toFixed ? d.longitude.toFixed(3) : d.longitude)}° ` +
        (typeof d.latitude === 'number' ? `Lat: ${d.latitude.toFixed(3)}° ` : '') +
        (typeof d.altitude === 'number' ? `Alt: ${d.altitude.toFixed(1)}°` : ''));
    }
    // Planets
    for (const body of ['mercury', 'venus', 'mars', 'jupiter', 'saturn']) {
      const d = data.planets[body];
      if (!passes(body, d)) continue;
      console.log(chalk.yellow(body.toUpperCase().padEnd(8)) +
        `Lon: ${chalk.bold(d.longitude?.toFixed ? d.longitude.toFixed(3) : d.longitude)}° ` +
        (typeof d.latitude === 'number' ? `Lat: ${d.latitude.toFixed(3)}° ` : '') +
        (typeof d.altitude === 'number' ? `Alt: ${d.altitude.toFixed(1)}°` : ''));
    }
    console.log();
  }

  // Build rows for 'all' command
  async buildAllRows(date) {
    const data = await this.dataFor(date || this._currentDate());
    const rows = [];
    const push = (name, d) => {
      if (!d) return;
      rows.push({
        name: name.toUpperCase(),
        longitude: d.longitude,
        latitude: d.latitude,
        altitude: d.altitude,
        azimuth: d.azimuth,
        velocity: d.velocity,
        isRetrograde: d.isRetrograde
      });
    };
    push('sun', data.sun);
    push('moon', data.moon);
    for (const p of ['mercury','venus','mars','jupiter','saturn']) push(p, data.planets[p]);
    return { date: data.date, rows };
  }

  // Parse and execute pipeline starting with 'all'
  async handlePipeline(input) {
    const stages = input.split('|').map(s => s.trim()).filter(Boolean);
    if (!stages.length || !/^all\b/i.test(stages[0])) {
      console.log(chalk.red('Pipelines must start with: all'));
      return;
    }

    // Base data
    const { rows, date } = await this.buildAllRows(this._currentDate());
    let out = rows.slice();

    // Helpers
    const fieldAlias = (k) => ({ lon:'longitude', long:'longitude', longitude:'longitude',
                                 lat:'latitude', latitude:'latitude',
                                 alt:'altitude', altitude:'altitude',
                                 az:'azimuth', azimuth:'azimuth',
                                 vel:'velocity', velocity:'velocity',
                                 name:'name' }[k] || k);
    const parseVal = (s) => {
      const str = String(s).trim();
      if (/^[-+]?(?:\d+\.?\d*|\.\d+)$/.test(str)) return Number(str);
      if (/^(true|false)$/i.test(str)) return /^true$/i.test(str);
      return str;
    };
    const cmp = (op, a, b) => {
      if (typeof a === 'number' && typeof b === 'number') {
        if (op === '>') return a > b;
        if (op === '>=') return a >= b;
        if (op === '<') return a < b;
        if (op === '<=') return a <= b;
        if (op === '==') return a === b;
        if (op === '!=') return a !== b;
      } else {
        const as = String(a).toLowerCase();
        const bs = String(b).toLowerCase();
        if (op === '==') return as === bs;
        if (op === '!=') return as !== bs;
      }
      return false;
    };

    let forceJson = false;

    // Apply each stage
    for (let i = 1; i < stages.length; i++) {
      const s = stages[i];
      const parts = s.split(/\s+/);
      const cmd = parts[0].toLowerCase();

      if (cmd === 'visible') {
        out = out.filter(r => typeof r.altitude === 'number' && r.altitude > 0);
        continue;
      }
      if (cmd === 'retrograde') {
        out = out.filter(r => typeof r.velocity === 'number' && r.velocity < 0);
        continue;
      }
      if (cmd === 'rising') {
        // Cheap placeholder: require altitude present (implies computed); real rising requires derivative
        out = out.filter(r => r.altitude !== undefined);
        continue;
      }
      if (cmd === 'grep' && parts[1]) {
        const pat = parts.slice(1).join(' ').toLowerCase();
        out = out.filter(r => r.name.toLowerCase().includes(pat));
        continue;
      }
      if (cmd === 'sort' && parts[1]) {
        const key = fieldAlias(parts[1].toLowerCase());
        const desc = (parts[2] || '').toLowerCase() === 'desc';
        out.sort((a,b) => {
          const av = a[key]; const bv = b[key];
          const an = (typeof av === 'number') ? av : -Infinity;
          const bn = (typeof bv === 'number') ? bv : -Infinity;
          return desc ? (bn - an) : (an - bn);
        });
        continue;
      }
      if (cmd === 'limit' && parts[1]) {
        const n = Math.max(0, parseInt(parts[1], 10) || 0);
        out = out.slice(0, n);
        continue;
      }
      if (cmd === 'fields' && parts[1]) {
        const list = parts.slice(1).join(' ').split(/[\s,]+/).map(x => fieldAlias(x.toLowerCase())).filter(Boolean);
        const uniq = Array.from(new Set(['name', ...list]));
        out = out.map(r => {
          const o = {}; uniq.forEach(k => { if (k in r) o[k] = r[k]; }); return o;
        });
        continue;
      }
      if (cmd === 'where' && parts.length >= 4) {
        const key = fieldAlias(parts[1].toLowerCase());
        const op = parts[2];
        const rhs = parseVal(parts.slice(3).join(' '));
        out = out.filter(r => {
          const lhs = r[key];
          if (lhs === undefined || lhs === null) return false;
          const lv = (typeof lhs === 'number') ? lhs : String(lhs);
          return cmp(op, lv, rhs);
        });
        continue;
      }
      if (cmd === 'json') {
        forceJson = true;
        continue;
      }
      console.log(chalk.yellow(`Unknown stage: ${s}`));
    }

    if (forceJson || this.context.format === 'json') {
      process.stdout.write(JSON.stringify({ date, rows: out }, null, 2) + os.EOL);
      return;
    }

    console.log(chalk.cyan.bold('\n=== ALL BODIES (filtered) ==='));
    console.log(chalk.gray(`Date: ${date}\n`));
    for (const r of out) {
      const parts = [];
      if (typeof r.longitude === 'number') parts.push(`Lon: ${chalk.bold(r.longitude.toFixed(3))}°`);
      if (typeof r.latitude === 'number') parts.push(`Lat: ${r.latitude.toFixed(3)}°`);
      if (typeof r.altitude === 'number') parts.push(`Alt: ${r.altitude.toFixed(1)}°`);
      if (typeof r.velocity === 'number') parts.push(`Vel: ${r.velocity.toFixed(3)}°/d`);
      console.log(chalk.yellow(String(r.name).padEnd(8)) + parts.join(' '));
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
    // Collect bodies until a known flag
    const bodies = [];
    for (const a of args) {
      const low = String(a || '').toLowerCase();
      if (['interval','compare','--compare'].includes(low)) break;
      if (VALID_BODIES.includes(low)) bodies.push(low);
    }
    const list = bodies.length ? bodies : [this.context.lastBody || 'moon'];
    // Validate
    for (const b of list) {
      if (!VALID_BODIES.includes(b)) {
        console.log(chalk.red(`Invalid body: ${b}`));
        return;
      }
    }
    let interval = 1000;
    const idx = args.findIndex(a => a.toLowerCase() === 'interval');
    if (idx >= 0 && args[idx + 1]) interval = Number(args[idx + 1]) || interval;
    if (interval < 250) {
      console.log(chalk.gray('Interval too low; clamping to 250ms'));
      interval = 250;
    }
    const doCompare = args.some(a => a.toLowerCase() === 'compare' || a.toLowerCase() === '--compare');

    console.log(chalk.cyan.bold(`\nWatching ${list.map(b => b.toUpperCase()).join(', ')} (Ctrl+C to stop)${doCompare ? ' [compare]' : ''}\n`));

    // Clear any existing watch first
    if (this.activeWatch && this.activeWatch.timer) {
      clearInterval(this.activeWatch.timer);
      this.activeWatch = null;
    }

    const prevMap = new Map();
    let warnedApi = false;
    const update = async () => {
      try {
        // Clear current prompt line to avoid collision
        if (this.rl && this.rl.output && this.rl.output.clearLine) {
          this.rl.output.clearLine(0);
          this.rl.output.cursorTo(0);
        } else {
          process.stdout.write('\x1B[2K\r');
        }
        const now = new Date();
        const nowIso = now.toISOString();

        if (doCompare) {
          try {
            const [engData, apiData] = await Promise.all([
              getFromEngine(now, this.context.location || null),
              getFromAPI(now, { observer: this.context.location || null }).catch(() => null)
            ]);
            if (!apiData) {
              if (!warnedApi) {
                console.log(chalk.red('✗ API unavailable (timeout or error)'));
                warnedApi = true;
              }
              // Fallback to non-compare print using engine
              const lines = [];
              for (const b of list) {
                const dd = (b === 'sun' || b === 'moon') ? engData[b] : engData.planets[b];
                const prev = prevMap.get(b);
                const lon = dd.longitude;
                const delta = (prev == null) ? null : (lon - prev);
                prevMap.set(b, lon);
                if (this.context.format === 'json') {
                  lines.push({ body: b, engine: { longitude: lon } });
                } else if (this.context.format === 'compact') {
                  const arrow = (delta == null) ? '→' : (delta > 0 ? '↑' : (delta < 0 ? '↓' : '→'));
                  const deltaStr = (delta == null) ? '' : ` ${arrow} ${(delta).toFixed(6)}°`;
                  lines.push(`${b.toUpperCase()} ${lon.toFixed(6)}°${deltaStr}`);
                } else {
                  const deltaStr = (delta == null) ? '' : ` (Δ ${(delta).toFixed(6)}°)`;
                  lines.push(`${chalk.cyan(b.toUpperCase())}: ${chalk.bold(lon.toFixed(6))}°${chalk.gray(deltaStr)}`);
                }
              }
              if (this.context.format === 'json') process.stdout.write(JSON.stringify({ time: nowIso, list: lines }) + os.EOL);
              else console.log(`${chalk.gray(nowIso)} ${lines.join('  |  ')}`);
              return;
            }
            // Compare available
            const lines = [];
            for (const b of list) {
              const eng = (b === 'sun' || b === 'moon') ? engData[b] : engData.planets[b];
              const api = (b === 'sun' || b === 'moon') ? apiData[b] : apiData.planets[b];
              const lonDiff = (typeof eng.longitude === 'number' && typeof api.longitude === 'number') ? (api.longitude - eng.longitude) : null;
              const tol = this.context.compareToleranceDeg || 0.001;
              const ok = (typeof lonDiff === 'number') ? Math.abs(lonDiff) < tol : false;
              if (this.context.format === 'json') {
                lines.push({ body: b, engine: { longitude: eng.longitude }, api: { longitude: api.longitude }, diff: { longitude: lonDiff }, ok });
              } else {
                const sign = lonDiff == null ? '' : (lonDiff > 0 ? '+' : '');
                const diffStr = lonDiff == null ? '' : ` Δ ${sign}${lonDiff.toFixed(6)}°`;
                const status = ok ? chalk.green('✓') : chalk.red('✗');
                lines.push(`${b.toUpperCase()} eng ${eng.longitude.toFixed(6)}° | api ${api.longitude.toFixed(6)}°${diffStr} ${status}`);
              }
            }
            if (this.context.format === 'json') process.stdout.write(JSON.stringify({ time: nowIso, list: lines }) + os.EOL);
            else console.log(`${chalk.gray(nowIso)} ${lines.join('  ||  ')}`);
            return;
          } catch (e) {
            console.error(chalk.red('Compare error:'), e.message);
            return;
          }
        }

        // Non-compare path
        const data = await this.dataFor(now);
        const lines = [];
        for (const b of list) {
          const d = (b === 'sun' || b === 'moon') ? data[b] : data.planets[b];
          const prev = prevMap.get(b);
          const lon = d.longitude;
          const delta = (prev == null) ? null : (lon - prev);
          prevMap.set(b, lon);
          if (this.context.format === 'json') {
            lines.push({ body: b, longitude: lon, delta });
          } else if (this.context.format === 'compact') {
            const arrow = (delta == null) ? '→' : (delta > 0 ? '↑' : (delta < 0 ? '↓' : '→'));
            const deltaStr = (delta == null) ? '' : ` ${arrow} ${(delta).toFixed(6)}°`;
            lines.push(`${b.toUpperCase()} ${lon.toFixed(6)}°${deltaStr}`);
          } else {
            const deltaStr = (delta == null) ? '' : ` (Δ ${(delta).toFixed(6)}°)`;
            lines.push(`${chalk.cyan(b.toUpperCase())}: ${chalk.bold(lon.toFixed(6))}°${chalk.gray(deltaStr)}`);
          }
        }
        if (this.context.format === 'json') process.stdout.write(JSON.stringify({ time: nowIso, list: lines }) + os.EOL);
        else console.log(`${chalk.gray(nowIso)} ${lines.join('  |  ')}`);
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
    this.activeWatch = { timer, bodies: list, interval, compare: doCompare, paused: false };
  }

  handlePause() {
    if (this.activeWatch && this.activeWatch.timer) {
      clearInterval(this.activeWatch.timer);
      this.activeWatch.paused = true;
      this.activeWatch.timer = null;
      console.log(chalk.gray('Watch paused.'));
    } else {
      console.log(chalk.gray('No active watch.'));
    }
  }

  handleResume() {
    if (this.activeWatch && this.activeWatch.paused) {
      const { bodies, interval, compare } = this.activeWatch;
      // Reconstruct args to reuse handleWatch
      const args = [...bodies, 'interval', String(interval), ...(compare ? ['compare'] : [])];
      return this.handleWatch(args);
    }
    console.log(chalk.gray('Nothing to resume.'));
  }

  async handlePlot(args) {
    // Examples:
    // - plot mars 90d
    // - plot moon.illumination 30d
    // - plot mars,jupiter 60d
    // - plot visibility sun 1d
    // - plot speed mars,jupiter 30d
    const width = (process.stdout && process.stdout.columns) ? Math.max(20, process.stdout.columns - 10) : 70;

    // Determine range token (last token like 30d/12h/2w). Default 30d
    // Allow optional trailing 'csv' flag
    let tokens = args.map(a => String(a || '').toLowerCase());
    let forceCsv = false;
    if (tokens.includes('csv')) {
      forceCsv = true;
      tokens = tokens.filter(t => t !== 'csv');
    }

    const last = (tokens[tokens.length - 1] || '').toLowerCase();
    const rm = last.match(/^(\d+)([dhw])$/);
    const rangeStr = rm ? last : '30d';
    const specTokens = rm ? tokens.slice(0, -1) : tokens.slice(0);
    const spec = specTokens.join(' ').trim().toLowerCase();

    const mm = rangeStr.match(/^(\d+)([dhw])$/);
    if (!mm || (!spec || !spec.length)) {
      console.log(chalk.red('Usage: plot <body[,body...]> <N[d|h|w]> | plot moon.illumination <N..> | plot visibility sun <N..> | plot speed <body[,..]> <N..>'));
      return;
    }
    const count = parseInt(mm[1], 10);
    const unit = mm[2];

    const start = this._currentDate();
    const msPer = { d: 86400e3, h: 3600e3, w: 7 * 86400e3 };
    const stepMs = msPer[unit] || 86400e3;
    const samples = Math.max(5, Math.min(300, count));

    // Build series definitions
    const expandBodies = (list) => {
      if (!list || !list.length) return [];
      const parts = list.split(',').map(s => s.trim()).filter(Boolean);
      return parts.flatMap(p => (p === 'planets') ? ['mercury','venus','mars','jupiter','saturn'] : [p]);
    };

    const seriesDefs = [];
    if (spec.startsWith('visibility ')) {
      const target = spec.split(/\s+/)[1] || 'sun';
      seriesDefs.push({ type: 'visibility', target });
    } else if (spec.startsWith('speed ')) {
      const list = spec.slice('speed '.length);
      const bodies = expandBodies(list);
      bodies.forEach(b => seriesDefs.push({ type: 'speed', target: b }));
    } else if (spec.includes('illum')) {
      seriesDefs.push({ type: 'illumination', target: 'moon' });
    } else {
      const bodies = expandBodies(spec);
      bodies.forEach(b => seriesDefs.push({ type: 'longitude', target: b }));
    }

    if (!seriesDefs.length) {
      console.log(chalk.red('No series to plot'));
      return;
    }

    // Helper to unwrap angles for continuity
    const unwrap = (arr) => {
      if (!arr.length) return arr;
      const out = [arr[0]];
      for (let i = 1; i < arr.length; i++) {
        let delta = arr[i] - arr[i - 1];
        if (delta > 180) delta -= 360;
        else if (delta < -180) delta += 360;
        out.push(out[i - 1] + delta);
      }
      return out;
    };

    const times = [];
    const allValues = seriesDefs.map(() => []);

    for (let i = 0; i < samples; i++) {
      const t = new Date(start.getTime() + i * stepMs);
      times.push(t.toISOString());
      const data = await this.dataFor(t);

      for (let s = 0; s < seriesDefs.length; s++) {
        const def = seriesDefs[s];
        if (def.type === 'illumination') {
          allValues[s].push((data.moon?.illumination || 0) * 100);
        } else if (def.type === 'visibility') {
          if (def.target === 'sun') allValues[s].push(data.sun?.altitude || 0);
          else {
            const d = (def.target === 'moon' || def.target === 'sun') ? data[def.target] : data.planets[def.target];
            allValues[s].push(d?.altitude ?? 0);
          }
        } else if (def.type === 'speed') {
          const d = (def.target === 'moon' || def.target === 'sun') ? data[def.target] : data.planets[def.target];
          allValues[s].push(d?.velocity ?? 0);
        } else if (def.type === 'longitude') {
          const d = (def.target === 'moon' || def.target === 'sun') ? data[def.target] : data.planets[def.target];
          allValues[s].push(d?.longitude ?? 0);
        }
      }
    }

    // Unwrap longitudes only
    for (let s = 0; s < seriesDefs.length; s++) {
      if (seriesDefs[s].type === 'longitude') {
        allValues[s] = unwrap(allValues[s]);
      }
    }

    // CSV output (explicit) or JSON (format=json)
    if (forceCsv) {
      const headers = ['time', ...seriesDefs.map(d => {
        if (d.type === 'longitude') return `${d.target.toUpperCase()}_lon`;
        if (d.type === 'visibility') return `${d.target.toUpperCase()}_alt`;
        if (d.type === 'illumination') return 'MOON_illum_%';
        if (d.type === 'speed') return `${d.target.toUpperCase()}_vel`;
        return 'series';
      })];
      const rows = [];
      for (let i = 0; i < times.length; i++) {
        const row = [times[i]];
        for (let s = 0; s < seriesDefs.length; s++) row.push(allValues[s][i]);
        rows.push(row.join(','));
      }
      console.log([headers.join(','), ...rows].join(os.EOL));
      return;
    }
    if (this.context.format === 'json') {
      const out = {
        start: start.toISOString(),
        stepMs,
        series: seriesDefs.map((def, idx) => ({ def, values: allValues[idx] })),
        times
      };
      process.stdout.write(JSON.stringify(out, null, 2) + os.EOL);
      return;
    }

    // Colors for multiple series
    const colors = [asciichart.blue, asciichart.red, asciichart.green, asciichart.yellow, asciichart.cyan, asciichart.magenta];
    const config = { height: 12, width, colors: seriesDefs.map((_, i) => colors[i % colors.length]) };

    const header = seriesDefs.map(d => {
      if (d.type === 'longitude') return d.target.toUpperCase();
      if (d.type === 'visibility') return `VIS(${d.target.toUpperCase()})`;
      if (d.type === 'illumination') return 'MOON.ILLUM';
      if (d.type === 'speed') return `SPEED(${d.target.toUpperCase()})`;
      return 'SERIES';
    }).join(' | ');

    console.log('\n' + chalk.cyan(header));
    console.log(asciichart.plot(allValues.length === 1 ? allValues[0] : allValues, config));

    // X-axis ticks and labels
    const axisWidth = config.width;
    const tickCount = Math.max(3, Math.min(6, Math.floor(axisWidth / 20)));
    const positions = [];
    for (let i = 0; i < tickCount; i++) positions.push(Math.round((axisWidth - 1) * (i / (tickCount - 1))));
    // Axis line with ticks
    let axis = ''.padEnd(axisWidth, ' ');
    axis = axis.split('');
    positions.forEach(p => { axis[p] = '|'; });
    console.log(chalk.gray(axis.join('')));
    // Labels line
    let labels = ''.padEnd(axisWidth, ' ').split('');
    for (let i = 0; i < positions.length; i++) {
      const idx = Math.round((times.length - 1) * (i / (positions.length - 1)));
      const lbl = times[idx].replace('T', ' ').slice(5, 16); // MM-DD HH:MM
      const startCol = Math.max(0, Math.min(axisWidth - lbl.length, positions[i] - Math.floor(lbl.length / 2)));
      for (let k = 0; k < lbl.length; k++) labels[startCol + k] = lbl[k];
    }
    console.log(chalk.gray(labels.join('')));

    // Start/end markers for redundancy
    const first = times[0].replace('T', ' ').slice(0, 16);
    const lastTime = times[times.length - 1].replace('T', ' ').slice(0, 16);
    console.log(chalk.gray(`${first}  ...  ${lastTime}`) + '\n');
  }

  async handleNext(args) {
    const what = (args[0] || '').toLowerCase();
    const now = this._currentDate();
    try {
      const data = await getDisplayFromAPI(now, this.context.location || null);
      if (what === 'opposition') {
        const body = (args[1] || this.context.lastBody || 'mars').toLowerCase();
        const opp = data.next_opposition;
        if (opp && (!body || (opp.planet || '').toLowerCase().includes(body))) {
          console.log(chalk.cyan.bold('\nNEXT OPPOSITION'));
          console.log(`planet:      ${chalk.yellow(opp.planet || body)}`);
          console.log(`date (UTC):  ${chalk.yellow(opp.date)}`);
          try {
            const tz = (this.context && this.context.tz && this.context.tz !== 'auto') ? this.context.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
            const local = new Date(opp.date).toLocaleString('en-US', { timeZone: tz, hour12: false }).replace(',', '');
            console.log(`local (${tz}): ${chalk.yellow(local)}`);
          } catch (_) {}
          if (typeof opp.daysUntil === 'number') console.log(`in:          ${chalk.yellow(opp.daysUntil.toFixed(1))} days`);
          console.log();
          return;
        }
        console.log(chalk.red('No next opposition data in API response'));
        return;
      }
      if (what === 'eclipse') {
        // Prefer structured object; fallback to display text
        const next = data.next_eclipse || null;
        console.log(chalk.cyan.bold('\nNEXT ECLIPSE'));
        if (next && typeof next === 'object') {
          const type = (next.type || '').toString();
          const kind = (next.kind || (next.local && next.local.kind) || '').toString();
          if (type) console.log(`type:        ${chalk.yellow(type)}`);
          if (kind) console.log(`kind:        ${chalk.yellow(kind)}`);
          if (next.date) {
            const utc = new Date(next.date).toISOString();
            console.log(`date (UTC):  ${chalk.yellow(utc)}`);
            // local echo using context tz
            try {
              const tz = (this.context && this.context.tz && this.context.tz !== 'auto') ? this.context.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
              const local = new Date(next.date).toLocaleString('en-US', { timeZone: tz, hour12: false }).replace(',', '');
              console.log(`local (${tz}): ${chalk.yellow(local)}`);
            } catch (_) {}
          }
          if (typeof next.daysUntil === 'number') console.log(`in:          ${chalk.yellow(next.daysUntil.toFixed(1))} days`);
          if (next.local && typeof next.local.obscuration === 'number') {
            console.log(`obscuration: ${chalk.yellow((next.local.obscuration * 100).toFixed(1))}% (local)`);
          } else if (next.details && typeof next.details.obscuration === 'number') {
            console.log(`obscuration: ${chalk.yellow((next.details.obscuration * 100).toFixed(1))}%`);
          }
        } else if (data.digital?.displays?.oled_main?.line1) {
          console.log(data.digital.displays.oled_main.line1);
        } else {
          console.log(chalk.red('No next eclipse data in API response'));
        }
        console.log();
        return;
      }
      console.log(chalk.red('Usage: next eclipse | next opposition [planet]'));
    } catch (_err) {
      console.log(chalk.red('✗ API unavailable (timeout or error)'));
      console.log(chalk.gray('  Try: set source local or start server: npm start'));
    }
  }

  async handleFind(args) {
    // Usage: find next conjunction [A] [B]
    const sub = (args[0] || '').toLowerCase();
    const what = (args[1] || '').toLowerCase();

    if (sub !== 'next') {
      console.log(chalk.red('Usage: find next <conjunction|equinox|solstice> [...]'));
      return;
    }

    if (what === 'conjunction') {
      const valid = ['sun','moon','mercury','venus','mars','jupiter','saturn'];
      // Flexible parsing:
      // - find next conjunction A B
      // - find next conjunction A with B
      // - find next conjunction with B A
      // - find next conjunction A  (defaults B=sun)
      const tail = args.slice(2).map(s => (s || '').toLowerCase()).filter(Boolean);
      let bodyA = 'moon';
      let bodyB = 'sun';
      const idxWith = tail.indexOf('with');
      if (idxWith === 0) {
        // with B A  -> treat as A with B (sun-first common case)
        const b = tail[1];
        const a = tail[2];
        if (a) { bodyA = a; bodyB = b || 'sun'; }
        else if (b) { bodyA = b; bodyB = 'sun'; }
      } else if (idxWith > 0) {
        // A with B
        bodyA = tail[0] || 'moon';
        bodyB = tail[idxWith + 1] || 'sun';
      } else if (tail.length === 1) {
        bodyA = tail[0]; bodyB = 'sun';
      } else if (tail.length >= 2) {
        bodyA = tail[0]; bodyB = tail[1];
      }

      if (!valid.includes(bodyA) || !valid.includes(bodyB)) {
        console.log(chalk.red('Invalid bodies. Valid: sun, moon, mercury, venus, mars, jupiter, saturn'));
        return;
      }
      try {
        const now = this._currentDate();
        const { getNextConjunction } = require('../sources');
        const res = await getNextConjunction(now, bodyA, bodyB);
        if (res && !res.error) {
          console.log(chalk.cyan.bold('\nNEXT CONJUNCTION'));
          console.log(`bodies:      ${chalk.yellow(res.bodies.join(' & '))}`);
          console.log(`date (UTC):  ${chalk.yellow(res.date)}`);
          try {
            const tz = (this.context && this.context.tz && this.context.tz !== 'auto') ? this.context.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
            const local = new Date(res.date).toLocaleString('en-US', { timeZone: tz, hour12: false }).replace(',', '');
            console.log(`local (${tz}): ${chalk.yellow(local)}`);
          } catch (_) {}
          if (typeof res.daysUntil === 'number') console.log(`in:          ${chalk.yellow(res.daysUntil.toFixed(1))} days`);
          console.log();
        } else {
          console.log(chalk.red(res.error || 'No conjunction found'));
        }
      } catch (err) {
        console.log(chalk.red('Error finding conjunction:'), err.message);
      }
      return;
    }

    if (what === 'equinox' || what === 'solstice') {
      try {
        const now = this._currentDate();
        const { getNextEquinox, getNextSolstice } = require('../sources');
        const res = what === 'equinox' ? await getNextEquinox(now) : await getNextSolstice(now);
        if (res && !res.error) {
          console.log(chalk.cyan.bold(`\nNEXT ${what.toUpperCase()}`));
          console.log(`type:        ${chalk.yellow(res.type)}`);
          console.log(`date (UTC):  ${chalk.yellow(res.date)}`);
          try {
            const tz = (this.context && this.context.tz && this.context.tz !== 'auto') ? this.context.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
            const local = new Date(res.date).toLocaleString('en-US', { timeZone: tz, hour12: false }).replace(',', '');
            console.log(`local (${tz}): ${chalk.yellow(local)}`);
          } catch (_) {}
          if (typeof res.daysUntil === 'number') console.log(`in:          ${chalk.yellow(res.daysUntil.toFixed(1))} days`);
          console.log();
        } else {
          console.log(chalk.red(res.error || `No ${what} found`));
        }
      } catch (err) {
        console.log(chalk.red(`Error finding ${what}:`), err.message);
      }
      return;
    }

    console.log(chalk.red('Usage: find next conjunction [A] [B] | find next equinox | find next solstice'));
  }

  // Sample range: sample <body> from <date> to <date> every <step> [json|csv]
  async handleSample(args) {
    const body = (args[0] || this.context.lastBody || 'moon').toLowerCase();
    if (!VALID_BODIES.includes(body)) {
      console.log(chalk.red('Usage: sample <body> from <date> to <date> every <step> [json|csv]'));
      return;
    }
    const tokens = args.slice(1);
    const idxFrom = tokens.indexOf('from');
    const idxTo = tokens.indexOf('to');
    const idxEvery = tokens.indexOf('every');
    if (idxFrom < 0 || idxTo < 0 || idxEvery < 0 || !(idxFrom < idxTo && idxTo < idxEvery)) {
      console.log(chalk.red('Usage: sample <body> from <date> to <date> every <step> [json|csv]'));
      return;
    }
    const fromStr = tokens.slice(idxFrom + 1, idxTo).join(' ');
    const toStr = tokens.slice(idxTo + 1, idxEvery).join(' ');
    const stepStr = tokens[idxEvery + 1] || '';
    const fmtOverride = (tokens[idxEvery + 2] || '').toLowerCase();
    const stepM = stepStr.match(/^(\d+)([smhdw])$/);
    if (!stepM) {
      console.log(chalk.red('every <step> must be like 15m, 2h, 1d, 1w'));
      return;
    }
    const n = parseInt(stepM[1], 10);
    const unit = stepM[2];
    const msPer = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7, w: 6.048e8 };
    const stepMs = (msPer[unit] || 0) * n;
    if (!stepMs) return console.log(chalk.red('Invalid step'));

    // Parse dates
    let fromDate;
    if (fromStr.toLowerCase() === 'now') fromDate = new Date();
    else fromDate = parseDateInput(fromStr, this.context).date;
    let toDate;
    if (/^[+-]\d+[smhdwy]$/.test(toStr)) {
      toDate = addRelativeToDate(toStr, fromDate);
    } else if (toStr.toLowerCase() === 'now') {
      toDate = new Date();
    } else {
      toDate = parseDateInput(toStr, this.context).date;
    }
    if (!(fromDate instanceof Date) || !(toDate instanceof Date) || isNaN(fromDate) || isNaN(toDate)) {
      console.log(chalk.red('Invalid from/to dates'));
      return;
    }
    if (toDate <= fromDate) {
      console.log(chalk.red('to must be after from'));
      return;
    }
    const estCount = Math.ceil((toDate - fromDate) / stepMs) + 1;
    if (estCount > 2000) {
      console.log(chalk.red('Too many samples; reduce range or increase step (max ~2000)'));
      return;
    }

    const rows = [];
    for (let t = fromDate.getTime(); t <= toDate.getTime(); t += stepMs) {
      const d = await this.dataFor(new Date(t));
      const sel = (body === 'sun' || body === 'moon') ? d[body] : d.planets[body];
      rows.push({
        time: new Date(t).toISOString(),
        longitude: sel.longitude,
        latitude: sel.latitude,
        altitude: sel.altitude,
        azimuth: sel.azimuth,
        velocity: sel.velocity
      });
    }

    const outFmt = ['json','csv'].includes(fmtOverride) ? fmtOverride : 'json';
    if (outFmt === 'json') {
      process.stdout.write(JSON.stringify({ body, from: fromDate.toISOString(), to: toDate.toISOString(), stepMs, rows }, null, 2) + os.EOL);
    } else {
      const header = 'time,longitude,latitude,altitude,azimuth,velocity';
      const lines = rows.map(r => [r.time, r.longitude, r.latitude, r.altitude, r.azimuth, r.velocity].join(','));
      console.log([header, ...lines].join(os.EOL));
    }
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
      case 'location': {
        // set location <lat,lon[,elev]>
        const m = val.replace(/\s+/g,'').match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(-?\d+(?:\.\d+)?))?$/);
        if (!m) return console.log(chalk.red('Usage: set location <lat,lon[,elev]>'));
        const lat = parseFloat(m[1]);
        const lon = parseFloat(m[2]);
        const elev = m[3] ? parseFloat(m[3]) : 0;
        if (!isFinite(lat) || !isFinite(lon)) return console.log(chalk.red('Invalid lat/lon'));
        this.context.location = { latitude: lat, longitude: lon, elevation: elev, source: 'manual' };
        console.log(chalk.green(`location=${lat},${lon}${elev?','+elev:''}`));
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
    if (c.location) console.log(`location: ${chalk.yellow(`${c.location.latitude},${c.location.longitude}${c.location.elevation?','+c.location.elevation:''}`)}`);
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
    console.log('  watch <body> [interval N] [compare]');
    console.log('  next eclipse          show next eclipse (API)');
    console.log('  next opposition [p]   show next opposition (API)');
    console.log('  find next conjunction [A] [B]   geocentric ecliptic conjunction');
    console.log('                         [A] with [B] (defaults to with sun)');
    console.log('  find next equinox|solstice      seasonal events (UTC/local)');
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
        return [startWith(['format','source','tz','intent','tolerance','location']), last];
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
        if (key === 'location') {
          const hint = ['<lat,lon>', '<lat,lon,elev>'];
          return [after ? hint : startWith(hint), last];
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

    // After 'all |' suggest pipeline stages
    if (raw.includes('|')) {
      const before = raw.split('|')[0].trim();
      if (/^all\b/i.test(before)) {
        const after = raw.endsWith(' ');
        const stages = ['visible','retrograde','rising','where','sort','limit','fields','grep','json'];
        return [after ? stages : startWith(stages), last];
      }
    }

    const base = [
      ...VALID_BODIES,
      'all','now','watch','compare','plot','next','goto','reset','help','exit','quit','.exit','context','history','clear','set','format','source','tz','intent','tolerance'
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
