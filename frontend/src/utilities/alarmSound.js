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
 * Returns a promise that resolves when warm-up is done (or immediately if it fails).
 */
function warmUpAudio(audioEl) {
  return new Promise((resolve) => {
    audioEl.volume = 0;
    const p = audioEl.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.volume = 1;
        resolve(true);
      }).catch(() => {
        audioEl.volume = 1;
        resolve(false);
      });
    } else {
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.volume = 1;
      resolve(true);
    }
  });
}

let warmedUp = false;

function unlockAudio() {
  if (warmedUp) return;
  warmedUp = true;
  warmUpAudio(criticalBeep);
  warmUpAudio(warningBeep);
}

if (typeof document !== 'undefined') {
  // Use capture:true so we catch the gesture even on elements that stop propagation
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { passive: true, capture: true, once: true });
  });
}

// ─── Playback helpers ──────────────────────────────────────────────────────

/**
 * Play an audio element. If the browser blocks autoplay (tab not focused,
 * no prior user gesture), attempt a silent warm-up first and then replay
 * after a short delay — this handles the cross-device dismiss scenario where
 * the second device may never have had a user gesture before the alarm fires.
 */
function playBeepElement(audioEl) {
  try {
    audioEl.currentTime = 0;
    const p = audioEl.play();
    if (p && typeof p.catch === 'function') {
      p.catch(err => {
        console.warn('[AlarmSound] play() blocked, attempting warm-up retry:', err.name);
        // Attempt a silent warm-up then retry. This covers the case where
        // cross-device dismiss fired before the user ever interacted with this tab.
        warmUpAudio(audioEl).then((unlocked) => {
          if (unlocked) {
            audioEl.currentTime = 0;
            audioEl.play().catch(e => console.warn('[AlarmSound] retry play() still blocked:', e));
          }
        });
      });
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
 * Re-warms audio elements before starting in case the tab lost
 * its autoplay permission (e.g. after a cross-device dismiss).
 */
export function startAlarm() {
  stopAlarm();
  // Re-warm both elements to handle cross-device dismiss scenario:
  // Device 2 may have had its modal dismissed before any user gesture occurred.
  if (!warmedUp) {
    Promise.all([warmUpAudio(criticalBeep), warmUpAudio(warningBeep)]).then(() => {
      playCriticalPattern();
      alarmInterval = setInterval(playCriticalPattern, 2000);
    });
  } else {
    playCriticalPattern();
    alarmInterval = setInterval(playCriticalPattern, 2000);
  }
}

/**
 * Start repeating warning alarm (every 4 s).
 * Re-warms audio elements before starting in case the tab lost
 * its autoplay permission (e.g. after a cross-device dismiss).
 */
export function startWarningAlarm() {
  stopAlarm();
  if (!warmedUp) {
    Promise.all([warmUpAudio(criticalBeep), warmUpAudio(warningBeep)]).then(() => {
      playWarningPattern();
      alarmInterval = setInterval(playWarningPattern, 4000);
    });
  } else {
    playWarningPattern();
    alarmInterval = setInterval(playWarningPattern, 4000);
  }
}

/**
 * Stop any active alarm and reset audio element positions.
 * Resetting currentTime ensures the next play() starts cleanly.
 */
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  // Reset audio positions so next play() starts from the beginning
  try { criticalBeep.currentTime = 0; } catch (_) {}
  try { warningBeep.currentTime = 0; } catch (_) {}
}
