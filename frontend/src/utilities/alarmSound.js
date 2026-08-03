/**
 * Critical Alarm Sound — Web Audio API Implementation
 * ─────────────────────────────────────────────────────────────────
 * Uses AudioContext + OscillatorNode instead of HTMLAudioElement + blob WAVs.
 *
 * WHY: HTMLAudioElement autoplay is unreliable — browsers can re-block it
 * even after a "warm-up" gesture unlock, causing repeated NotAllowedError.
 *
 * AudioContext.resume() called once on the first user gesture permanently
 * unlocks audio for the whole session. Oscillators play instantly on demand
 * with no autoplay restrictions, and can be stopped mid-beep immediately.
 *
 * STRATEGY:
 *  1. On first click/keydown/touch → AudioContext.resume() if suspended.
 *  2. startAlarm() / startWarningAlarm() schedule oscillators via the context.
 *  3. stopAlarm() cancels intervals, pending timeouts, AND running oscillators
 *     instantly — no trailing beeps.
 */

// ─── AudioContext Singleton ────────────────────────────────────────────────

let audioContext = null;

function getAudioContext() {
  return audioContext; // may be null if no user gesture has occurred yet
}

// ─── Unlock on first user interaction ─────────────────────────────────────

/**
 * Resume (or create) the AudioContext inside a real user gesture.
 * Creating it here guarantees the browser won't block it.
 */
function unlockAudio() {
  try {
    if (!audioContext) {
      // Create it here, inside the gesture handler — this is the only safe place
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(e => console.warn('[AlarmSound] resume() failed:', e));
    }
  } catch (e) {
    console.warn('[AlarmSound] unlockAudio error:', e);
  }
}

if (typeof document !== 'undefined') {
  // capture:true ensures we catch gestures even on elements that stop propagation.
  // NOT using once:true — re-lock can happen (e.g. page hidden/shown), so we
  // keep trying to resume on every gesture.
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { passive: true, capture: true });
  });
}

// ─── Beep Playback ─────────────────────────────────────────────────────────

/** Tracks all currently playing oscillator nodes so stopAlarm() can cut them instantly. */
let activeOscillators = [];

/**
 * Play a single beep tone using an OscillatorNode with an ADSR-style envelope.
 *
 * @param {number} frequency - Hz (e.g. 880 for critical, 620 for warning)
 * @param {number} duration  - seconds (e.g. 0.18)
 * @param {number} volume    - 0–1 gain (e.g. 0.85)
 */
function playBeep(frequency, duration, volume = 0.85) {
  try {
    const ctx = getAudioContext();
    // No context yet (user hasn't clicked anything) or still suspended — skip silently.
    // The next alarm cycle will retry once the context is unlocked.
    if (!ctx || ctx.state !== 'running') return;

    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // ADSR-style volume envelope: 8ms attack → sustain → 60ms decay
    const now    = ctx.currentTime;
    const attack = 0.008; // 8 ms
    const decay  = 0.06;  // 60 ms
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.setValueAtTime(volume, now + duration - decay);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    // Track for immediate cancellation
    const entry = { oscillator, gainNode };
    activeOscillators.push(entry);
    oscillator.onended = () => {
      activeOscillators = activeOscillators.filter(o => o !== entry);
    };
  } catch (e) {
    console.warn('[AlarmSound] playBeep error:', e);
  }
}

// ─── Alarm patterns ────────────────────────────────────────────────────────

let alarmInterval      = null;
let pendingBeepTimeouts = []; // track in-flight pattern timeouts for cancellation

function playCriticalPattern() {
  // Three beeps: immediate, +250 ms, +500 ms  (880 Hz, 0.18 s)
  playBeep(880, 0.18, 0.85);
  pendingBeepTimeouts.push(setTimeout(() => playBeep(880, 0.18, 0.85), 250));
  pendingBeepTimeouts.push(setTimeout(() => playBeep(880, 0.18, 0.85), 500));
}

function playWarningPattern() {
  // Two beeps: immediate, +350 ms  (620 Hz, 0.22 s)
  playBeep(620, 0.22, 0.65);
  pendingBeepTimeouts.push(setTimeout(() => playBeep(620, 0.22, 0.65), 350));
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Start repeating critical alarm (every 2 s).
 */
export function startAlarm() {
  stopAlarm();
  playCriticalPattern();
  alarmInterval = setInterval(playCriticalPattern, 2000);
}

/**
 * Start repeating warning alarm (every 4 s).
 */
export function startWarningAlarm() {
  stopAlarm();
  playWarningPattern();
  alarmInterval = setInterval(playWarningPattern, 4000);
}

/**
 * Stop any active alarm immediately.
 *
 * Three-layer stop:
 *  1. Clear the repeating setInterval so no new patterns start.
 *  2. Cancel pending setTimeout beeps (trailing beeps in the current pattern).
 *  3. Stop all currently running OscillatorNodes so sound cuts out instantly.
 */
export function stopAlarm() {
  // 1. Stop the repeating interval
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }

  // 2. Cancel queued pattern beeps (the 250ms / 500ms / 350ms delayed ones)
  pendingBeepTimeouts.forEach(id => clearTimeout(id));
  pendingBeepTimeouts = [];

  // 3. Immediately silence all active oscillators
  const ctx = audioContext; // may be null if audio was never started
  activeOscillators.forEach(({ oscillator, gainNode }) => {
    try {
      if (ctx) {
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
      }
      oscillator.stop();
    } catch (_) {
      // oscillator may already have ended — ignore
    }
  });
  activeOscillators = [];
}
