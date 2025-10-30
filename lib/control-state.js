// In-memory control state for classroom control mode (process-local)
// All times are treated as UTC ISO strings

const ControlState = {
  active: false,
  mode: null, // 'time' | 'animate' | 'scene'
  displayTime: null, // ISO string
  animate: null, // { from: ISO, to: ISO, speed: number, startedAtMs: number }
  location: null, // { latitude, longitude, elevation?, timezone, name? }
  preset: null,
  bodies: null,
};

const FAR_FUTURE_ISO = '9999-12-31T23:59:59.999Z';
const FAR_FUTURE_MS = new Date(FAR_FUTURE_ISO).getTime();

function reset() {
  ControlState.active = false;
  ControlState.mode = null;
  ControlState.displayTime = null;
  ControlState.animate = null;
  ControlState.location = null;
  ControlState.preset = null;
  ControlState.bodies = null;
}

function setTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error('Invalid ISO time');
  ControlState.active = true;
  ControlState.mode = 'time';
  ControlState.displayTime = d.toISOString();
  ControlState.animate = null;
}

function setAnimate(fromIso, toIso, speed) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new Error('Invalid ISO range');
  const span = to.getTime() - from.getTime();
  if (!(span > 0)) throw new Error('Animation range must have to > from');
  const s = Number(speed);
  const spd = Number.isFinite(s) && s > 0 ? s : 1;
  ControlState.active = true;
  ControlState.mode = 'animate';
  ControlState.displayTime = null;
  ControlState.animate = {
    from: from.toISOString(),
    to: to.toISOString(),
    speed: spd,
    startedAtMs: Date.now(),
  };
}

function setScene(preset, bodies) {
  ControlState.active = true;
  ControlState.mode = 'scene';
  ControlState.preset = String(preset || '').trim() || null;
  ControlState.bodies = Array.isArray(bodies) ? bodies : (typeof bodies === 'string' ? bodies.split(',').map(s => s.trim()).filter(Boolean) : null);
}

function run(speed) {
  const s = Number(speed);
  const spd = Number.isFinite(s) && s > 0 ? s : 1;
  const base = effectiveDate(new Date());
  ControlState.active = true;
  ControlState.mode = 'animate';
  ControlState.displayTime = null;
  ControlState.animate = {
    from: new Date(base).toISOString(),
    to: FAR_FUTURE_ISO,
    speed: spd,
    startedAtMs: Date.now(),
  };
}

function pause() {
  // Freeze at current effective time
  const nowEff = effectiveDate(new Date());
  ControlState.active = true;
  ControlState.mode = 'time';
  ControlState.displayTime = new Date(nowEff).toISOString();
  ControlState.animate = null;
}

function stop() {
  reset();
}

function status() {
  return {
    active: ControlState.active,
    mode: ControlState.mode,
    displayTime: ControlState.displayTime,
    animating: ControlState.mode === 'animate' ? true : false,
    animate: ControlState.animate,
    location: ControlState.location,
    preset: ControlState.preset,
    bodies: ControlState.bodies,
  };
}

function effectiveDate(now = new Date()) {
  let result = now;
  if (ControlState.active) {
    if (ControlState.mode === 'time' && ControlState.displayTime) {
      result = new Date(ControlState.displayTime);
    } else if (ControlState.mode === 'animate' && ControlState.animate) {
      const a = ControlState.animate;
      const fromMs = new Date(a.from).getTime();
      const toMs = isFinite(new Date(a.to).getTime()) ? new Date(a.to).getTime() : FAR_FUTURE_MS;
      const elapsed = (Date.now() - a.startedAtMs) * (a.speed || 1);
      const pos = Math.min(toMs, Math.max(fromMs, fromMs + elapsed));
      result = new Date(pos);
    } else {
      // scene mode does not affect time beyond activation
      result = now;
    }
  }
  return result;
}

function setLocation(loc) {
  // Assume validation at API layer
  ControlState.location = loc ? { ...loc } : null;
  ControlState.active = true; // activating control session when location is set
}

function getLocation() {
  return ControlState.location ? { ...ControlState.location } : null;
}

module.exports = {
  ControlState,
  reset,
  setTime,
  setAnimate,
  setScene,
  run,
  pause,
  stop,
  status,
  effectiveDate,
  setLocation,
  getLocation,
};
