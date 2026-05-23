/**
 * Critical Alarm Sound
 * ─────────────────────────────────────────────────────────────────
 * Uses HTMLAudioElement + programmatically generated WAV blobs.
 * This is MORE reliable than the Web Audio API for autoplay because
 * an <audio> element can be pre-unlocked on the first user gesture,
 * then played programmatically at any later time — even from SSE callbacks.
 *
 * STRATEGY:
 *  1. On first click/keydown/touch → call audio.play().then(audio.pause())
 *     This "licenses" the element for future programmatic play.
 *  2. When startAlarm() fires, just call audio.play() — already unlocked.
 */

// ─── WAV Generation ────────────────────────────────────────────────────────

/**
 * Writes a standard 4-byte string to a DataView at the given offset.
 */
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Generates a WAV blob for a beep with an ADSR-style fade-in/out envelope.
 *
 * @param {number} frequency  - Hz (e.g. 880)
 * @param {number} duration   - seconds (e.g. 0.2)
 * @param {number} volume     - 0–1
 * @param {number} sampleRate - samples/sec (default 44100)
 * @returns {Blob}
 */
function generateBeepWav(frequency, duration, volume = 0.85, sampleRate = 44100) {
  const numSamples = Math.floor(sampleRate * duration);
  const dataBytes  = numSamples * 2; // 16-bit mono → 2 bytes per sample
  const buffer     = new ArrayBuffer(44 + dataBytes);
  const view       = new DataView(buffer);

  // ── RIFF header ──────────────────────────────────────────────────
  writeString(view, 0,  'RIFF');
  view.setUint32(4,  36 + dataBytes, true);   // chunk size
  writeString(view, 8,  'WAVE');

  // ── fmt sub-chunk ────────────────────────────────────────────────
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);              // sub-chunk size (PCM)
  view.setUint16(20,  1, true);              // audio format: PCM
  view.setUint16(22,  1, true);              // channels: mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);  // byte rate
  view.setUint16(32,  2, true);              // block align
  view.setUint16(34, 16, true);              // bits per sample

  // ── data sub-chunk ───────────────────────────────────────────────
  writeString(view, 36, 'data');
  view.setUint32(40, dataBytes, true);

  // ── PCM samples — sine wave with soft attack / decay envelope ────
  const attackSamples = Math.floor(sampleRate * 0.008); // 8 ms attack
  const decaySamples  = Math.floor(sampleRate * 0.06);  // 60 ms decay

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let env = 1;
    if (i < attackSamples) {
      env = i / attackSamples;
    } else if (i >= numSamples - decaySamples) {
      env = (numSamples - i) / decaySamples;
    }
    const sample = Math.sin(2 * Math.PI * frequency * t) * env * volume * 32767;
    view.setInt16(44 + i * 2, Math.round(sample), true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Creates an ObjectURL audio element from a generated WAV blob.
 * @param {number} frequency
 * @param {number} duration
 * @param {number} volume
 */
function createBeepAudio(frequency, duration, volume) {
  const blob = generateBeepWav(frequency, duration, volume);
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = 'auto';
  return audio;
}

// ─── Pre-built audio elements ──────────────────────────────────────────────

// Critical alarm beep  — 880 Hz, 0.18 s
const criticalBeep  = createBeepAudio(880, 0.18, 0.85);
// Warning alarm beep  — 620 Hz, 0.22 s
const warningBeep   = createBeepAudio(620, 0.22, 0.65);

let alarmInterval = null;

// ─── Unlock on first user interaction ─────────────────────────────────────

/**
 * "Warm-up" an audio element: play it silently and pause immediately.
 * This satisfies the browser's autoplay requirement and allows
 * future play() calls even outside a user-gesture handler.
 */
function warmUpAudio(audioEl) {
  audioEl.volume = 0;
  const p = audioEl.play();
  if (p && typeof p.then === 'function') {
    p.then(() => {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.volume = 1;
    }).catch(() => {
      audioEl.volume = 1;
    });
  } else {
    audioEl.pause();
    audioEl.currentTime = 0;
    audioEl.volume = 1;
  }
}

let warmedUp = false;

function unlockAudio() {
  if (warmedUp) return;
  warmedUp = true;
  warmUpAudio(criticalBeep);
  warmUpAudio(warningBeep);
}

if (typeof document !== 'undefined') {
  // Keep listeners so the audio stays unlocked after page inactivity
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { passive: true, once: true });
  });
}

// ─── Playback helpers ──────────────────────────────────────────────────────

function playBeepElement(audioEl) {
  try {
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === 'function') {
      p.catch(err => console.warn('[AlarmSound] play() blocked:', err));
    }
  } catch (e) {
    console.warn('[AlarmSound] playBeepElement error:', e);
  }
}

// ─── Alarm patterns ────────────────────────────────────────────────────────

function playCriticalPattern() {
  // Three beeps: immediate, +250 ms, +500 ms
  playBeepElement(criticalBeep);
  setTimeout(() => playBeepElement(criticalBeep), 250);
  setTimeout(() => playBeepElement(criticalBeep), 500);
}

function playWarningPattern() {
  // Two beeps: immediate, +350 ms
  playBeepElement(warningBeep);
  setTimeout(() => playBeepElement(warningBeep), 350);
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
 * Stop any active alarm.
 */
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
