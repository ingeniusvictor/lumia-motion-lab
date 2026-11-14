/**
 * LUMIA Motion R9-00 — bounded expressive INTENT contract (not a bone driver).
 *
 * The LLM never supplies rotation angles, bone names, file paths or commands.
 * This pure module does not access Ollama, VRM, TTS, microphone or persistence.
 * Existing Motion R8 remains the sole source of pose/clip ownership.
 */
const EMOTIONS = Object.freeze(['neutral', 'focused', 'happy', 'concern', 'curious', 'calm', 'surprised']);
const GESTURES = Object.freeze(['none', 'explain', 'affirm', 'deny', 'greet', 'comfort', 'celebrate', 'think']);
const GAZES = Object.freeze(['user', 'cursor', 'away']);
const POSTURES = Object.freeze(['neutral', 'attentive', 'relaxed']);
export const R9_MOTION_JSON_SCHEMA = Object.freeze({
  type: 'object',
  additionalProperties: false,
  required: ['version', 'emotion', 'intensity', 'gesture', 'gaze', 'posture', 'duration_ms'],
  properties: {
    version: { type: 'integer', const: 1 },
    emotion: { type: 'string', enum: [...EMOTIONS] },
    intensity: { type: 'number', minimum: 0, maximum: 1 },
    gesture: { type: 'string', enum: [...GESTURES] },
    gaze: { type: 'string', enum: [...GAZES] },
    posture: { type: 'string', enum: [...POSTURES] },
    duration_ms: { type: 'integer', minimum: 250, maximum: 4000 },
  },
});
const SAFE_DEFAULT = Object.freeze({
  version: 1, emotion: 'neutral', intensity: 0,
  gesture: 'none', gaze: 'user', posture: 'neutral', duration_ms: 750,
});
const allowed = (list, value) => typeof value === 'string' && list.includes(value);
const bounded = (n, min, max) => typeof n === 'number' && Number.isFinite(n)
  ? Math.min(max, Math.max(min, n)) : null;
const identity = (x) => (typeof x === 'string' || typeof x === 'number')
  && String(x).length > 0 && String(x).length <= 128 ? String(x) : null;

/** Strictly reject bad enum values, missing required fields or out-of-range numbers. */
export function parseR9MotionIntent(raw) {
  let obj = raw;
  if (typeof raw === 'string') {
    if (raw.length > 2048) return null;
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (obj === null || Array.isArray(obj) || typeof obj !== 'object') return null;
  const keys = Object.keys(R9_MOTION_JSON_SCHEMA.properties);
  if (Object.keys(obj).some((key) => !keys.includes(key))) return null;
  if (obj.version !== 1 || !allowed(EMOTIONS, obj.emotion)
      || !allowed(GESTURES, obj.gesture)
      || !allowed(GAZES, obj.gaze)
      || !allowed(POSTURES, obj.posture)) return null;
  const intensity = bounded(obj.intensity, 0, 1);
  const duration = bounded(obj.duration_ms, 250, 4000);
  if (intensity === null || duration === null || !Number.isInteger(obj.duration_ms)
      || obj.intensity !== intensity || obj.duration_ms !== duration) return null;
  return Object.freeze({
    version: 1, emotion: obj.emotion, intensity,
    gesture: obj.gesture, gaze: obj.gaze, posture: obj.posture,
    duration_ms: duration,
  });
}

/**
 * A cue waits for the REAL first audio start (Kokoro onplaying), not for model
 * text generation. It expires, is tied to the accepted turn/session, and gives
 * way to manual clips, guided demos and interruption. No frame-level LLM call.
 */
export class R9IntentController {
  constructor() { this.reset(); }
  reset() { this.pending = null; this.active = null; }
  queue(raw, { sessionId, turnId, now } = {}) {
    const cue = parseR9MotionIntent(raw);
    const session = identity(sessionId);
    const turn = identity(turnId);
    if (!cue || !session || !turn || !Number.isFinite(now)) return false;
    this.pending = Object.freeze({ cue, session, turn, queuedAt: now });
    this.active = null;
    return true;
  }
  onFirstAudio({ sessionId, turnId, now } = {}) {
    const item = this.pending;
    if (!item || !Number.isFinite(now)
      || item.session !== identity(sessionId) || item.turn !== identity(turnId)
      || now < item.queuedAt || now - item.queuedAt > 15000) return false;
    this.active = Object.freeze({ ...item, startedAt: now, expiresAt: now + item.cue.duration_ms });
    this.pending = null;
    return true;
  }
  snapshot({ sessionId, turnId, now, audible = false,
    manualClip = false, guidedDemo = false, dancing = false, interrupted = false } = {}) {
    if (interrupted) { this.reset(); return null; }
    const item = this.active;
    if (!item || !Number.isFinite(now) || now < item.startedAt || now >= item.expiresAt
      || item.session !== identity(sessionId) || item.turn !== identity(turnId)) return null;
    if (!audible || manualClip || guidedDemo || dancing) return null;
    return item.cue;
  }
  get idle() { return !this.pending && !this.active; }
}
export { SAFE_DEFAULT as R9_NEUTRAL_CUE };
