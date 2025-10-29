// In-memory control state for classroom control mode (process-local)
// All times are treated as UTC ISO strings

const ControlState = {
  active: false,
  mode: null, // 'time' | 'animate' | 'scene'
  displayTime: null, // ISO string
  animate: null, // { from: ISO, to: ISO, speed: number, startedAtMs: number }
  preset: null,
  bodies: null,
};

function reset() {
  ControlState.active = false;
  ControlState.mode = null;
  ControlState.displayTime = null;
  ControlState.animate = null;
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
    preset: ControlState.preset,
    bodies: ControlState.bodies,
  };
}

function effectiveDate(now = new Date()) {
  if (!ControlState.active) return now;
  if (ControlState.mode === 'time' && ControlState.displayTime) return new Date(ControlState.displayTime);
  if (ControlState.mode === 'animate' && ControlState.animate) {
    const a = ControlState.animate;
    const fromMs = new Date(a.from).getTime();
    const toMs = new Date(a.to).getTime();
    const elapsed = (Date.now() - a.startedAtMs) * (a.speed || 1);
    const pos = Math.min(toMs, Math.max(fromMs, fromMs + elapsed));
    return new Date(pos);
  }
  // scene mode does not affect time
  return now;
}

module.exports = {
  ControlState,
  reset,
  setTime,
  setAnimate,
  setScene,
  stop,
  status,
  effectiveDate,
};