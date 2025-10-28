
function parseRelative(input, base) {
  const m = input.match(/^([+-])(\d+)([smhdwy])$/i);
  if (!m) return null;
  const sign = m[1] === '+' ? 1 : -1;
  const n = parseInt(m[2], 10);
  const unit = m[3].toLowerCase();
  const msPer = { s: 1e3, m: 6e4, h: 3.6e6, d: 8.64e7, w: 6.048e8, y: 3.15576e10 };
  const delta = (msPer[unit] || 0) * n * sign;
  if (!delta) return null;
  return new Date(base.getTime() + delta);
}

function parseNatural(input, base) {
  const low = input.toLowerCase().trim();
  const now = base || new Date();
  // today HH:mm
  let m = low.match(/^today\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
    const d = new Date(now);
    d.setHours(h, min, 0, 0);
    return d;
  }
  // tomorrow [HH:mm|noon]
  m = low.match(/^tomorrow(?:\s+(\d{1,2}):(\d{2})|\s+noon)?$/);
  if (m) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    if (m[1]) d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    else if (low.includes('noon')) d.setHours(12, 0, 0, 0);
    else d.setHours(0, 0, 0, 0);
    return d;
  }
  // tonight HH:mm → today at time (if past, keep today)
  m = low.match(/^tonight\s+(\d{1,2}):(\d{2})$/);
  if (m) {
    const d = new Date(now);
    d.setHours(parseInt(m[1], 10), parseInt(m[2], 10), 0, 0);
    return d;
  }
  return null;
}

function isISO(str) {
  // Quick ISO check
  return /\d{4}-\d{2}-\d{2}/.test(str);
}

function parseDateInput(input, context) {
  const base = new Date();

  // ISO first (let Date parse with timezone/UTC if present)
  if (isISO(input)) {
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      return { date: d, echo: echoParsedDate(d, context) };
    }
  }

  // Relative
  const rel = parseRelative(input, base);
  if (rel) return { date: rel, echo: echoParsedDate(rel, context, input) };

  // Natural minimal
  const nat = parseNatural(input, base);
  if (nat) return { date: nat, echo: echoParsedDate(nat, context, input) };

  // Invalid
  throw new Error('Invalid date. Use ISO (YYYY-MM-DDTHH:mm:ssZ) or relative (+2h, -30m).');
}

function echoParsedDate(d, context) {
  try {
    // We only echo UTC here; local side is the system tz or context tz label
    const tzLabel = (context && context.tz && context.tz !== 'auto') ? context.tz : Intl.DateTimeFormat().resolvedOptions().timeZone;
    const local = d.toLocaleString('en-US', { timeZone: tzLabel, hour12: false }).replace(',', '');
    const utc = d.toISOString();
    return `Parsed: ${local} ${tzLabel} → ${utc}`;
  } catch (_) {
    return d.toISOString();
  }
}

module.exports = { parseDateInput, echoParsedDate };