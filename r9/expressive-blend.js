/**
 * R9-02: tiny, bounded additive motion, computed once per animation frame.
 * No joints from the LLM; existing PH-04 pose guards and FBX retain ownership.
 * The renderer may apply this ONLY after R8, and never during manual/demo.
 * Angles are radians and all additions are intentionally below 0.10 rad.
 */
const profiles = Object.freeze({
  none:      { head: [0, 0, 0], arms: [0, 0, 0], hands: [0, 0] },
  explain:   { head: [0.008, 0.012, 0], arms: [0.045, -0.065, 0.030], hands: [0.018, -0.018] },
  affirm:    { head: [0.040, 0, 0.004], arms: [0, 0, 0], hands: [0, 0] },
  deny:      { head: [0, 0.045, 0], arms: [0, 0, 0], hands: [0, 0] },
  greet:     { head: [0, 0.012, 0.012], arms: [0, -0.075, 0.050], hands: [0, 0.030] },
  comfort:   { head: [0.020, 0, 0.008], arms: [-0.016, 0.012, 0], hands: [0.008, 0] },
  celebrate: { head: [-0.015, 0, 0.006], arms: [0.065, -0.065, 0.025], hands: [0.015, -0.015] },
  think:     { head: [-0.020, -0.014, 0.014], arms: [0.015, -0.010, 0], hands: [0, 0] },
});
const presetFor = Object.freeze({
  happy: 'joy', concern: 'sorrow', curious: 'fun', surprised: 'fun',
  calm: 'joy', focused: 'fun', neutral: null,
});
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const bounded = (v, max) => clamp(Number.isFinite(v) ? v : 0, -max, max);
const empty = () => ({
  weight: 0, head: { pitch: 0, yaw: 0, roll: 0 }, body: {},
  expression: null, kind: null,
});

/** Requires a previously validated R9 cue. Returns a safe, purely additive pose. */
export class R9ExpressiveBlend {
  constructor() { this.reset(); }
  reset() { this.weight = 0; this.elapsed = 0; this.last = null; }
  step(dt, cue = null) {
    dt = clamp(Number.isFinite(dt) ? dt : 0, 0, 0.05);
    this.elapsed += dt;
    const target = cue ? 1 : 0;
    const rate = cue ? 6.0 : 10.0;
    this.weight += (target - this.weight) * (1 - Math.exp(-rate * dt));
    if (cue) this.last = cue;
    if (!this.last || this.weight < 0.001) {
      if (!cue) this.last = null;
      return empty();
    }
    const active = this.last;
    const profile = profiles[active.gesture] ?? profiles.none;
    const amount = clamp(active.intensity, 0, 1) * this.weight;
    const pulse = Math.sin(this.elapsed * 3.4);
    const nod = active.gesture === 'affirm' ? pulse : 1;
    const turn = active.gesture === 'deny' ? pulse : 1;
    const posture = active.posture === 'attentive' ? 0.008
      : active.posture === 'relaxed' ? -0.006 : 0;
    const head = {
      pitch: bounded(profile.head[0] * amount * nod, 0.045),
      yaw: bounded(profile.head[1] * amount * turn, 0.050),
      roll: bounded(profile.head[2] * amount, 0.025),
    };
    const body = {
      leftUpperArmZ: bounded(profile.arms[0] * amount, 0.055),
      rightUpperArmZ: bounded(profile.arms[1] * amount, 0.055),
      rightLowerArmX: bounded(profile.arms[2] * amount, 0.04),
      leftHandX: bounded(profile.hands[0] * amount, 0.03),
      rightHandX: bounded(profile.hands[1] * amount, 0.03),
      chestX: bounded(posture * amount, 0.012),
    };
    const name = presetFor[active.emotion] ?? null;
    const expression = name ? Object.freeze({
      name, weight: clamp(amount * 0.22, 0, 0.22),
    }) : null;
    return { weight: this.weight, head, body, expression,
      kind: active.gesture === 'none' ? null : active.gesture };
  }
}
