function getUtcOffsetMinutes(date, timeZone) {
  try {
    if (!timeZone) return null;
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'shortOffset'
    });
    const parts = fmt.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (!tzPart || !tzPart.value) return null;
    // tzPart like 'GMT-5' or 'UTC+1'
    const m = tzPart.value.match(/([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return 0; // treat 'GMT' as 0
    const sign = m[1] === '-' ? -1 : 1;
    const hours = parseInt(m[2] || '0', 10);
    const mins = parseInt(m[3] || '0', 10);
    return sign * (hours * 60 + mins);
  } catch (_) {
    return null;
  }
}

module.exports = { getUtcOffsetMinutes };