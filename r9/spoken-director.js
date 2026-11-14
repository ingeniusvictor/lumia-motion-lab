/**
 * R9-01: conservative, deterministic intent cues from the phrase that
 * Kokoro is actually playing. No second LLM, inference, recording or memory.
 * Labels describe an expressive PERFORMANCE, not a person's actual feelings.
 */
import { parseR9MotionIntent } from './intent-contract.js';

const rules = Object.freeze([
  { match: /\b(?:felicidades|felicitaciones|enhorabuena|lo conseguimos|que alegria|fantastico|maravilloso)\b/u,
    gesture: 'celebrate', emotion: 'happy', intensity: 0.65 },
  { match: /\b(?:lo siento|lamento|entiendo como te sientes|es comprensible|puedes contar conmigo)\b/u,
    gesture: 'comfort', emotion: 'concern', intensity: 0.42 },
  { match: /\b(?:vaya sorpresa|que sorpresa|increible|sorprendente)\b/u,
    gesture: 'none', emotion: 'surprised', intensity: 0.38 },
  { match: /\b(?:no estoy de acuerdo|no es correcto|no puedo|en absoluto|de ninguna manera)\b/u,
    gesture: 'deny', emotion: 'focused', intensity: 0.35 },
  { match: /\b(?:si claro|exacto|exactamente|por supuesto|efectivamente|tienes razon|de acuerdo)\b/u,
    gesture: 'affirm', emotion: 'calm', intensity: 0.34 },
  { match: /^(?:hola|buenos dias|buenas tardes|buenas noches|bienvenid[oa])\b/u,
    gesture: 'greet', emotion: 'happy', intensity: 0.40 },
  { match: /\b(?:primero|segundo|por ejemplo|esto significa|en primer lugar|es decir|te explico|para ello|en resumen)\b/u,
    gesture: 'explain', emotion: 'focused', intensity: 0.50 },
  { match: /\b(?:dejame pensar|veamos|analicemos|consideremos)\b/u,
    gesture: 'think', emotion: 'curious', intensity: 0.30 },
]);

const normalize = (text) => String(text ?? '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

export function inferR9CueFromSpokenPhrase(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 700) return null;
  const phrase = normalize(text);
  if (phrase.length < 3) return null;
  const selected = rules.find((rule) => rule.match.test(phrase));
  if (!selected) return null; // Allow existing R8 semantics to handle it.
  return parseR9MotionIntent({
    version: 1, emotion: selected.emotion, gesture: selected.gesture,
    intensity: selected.intensity, gaze: 'user', posture: 'attentive',
    duration_ms: 1800,
  });
}
