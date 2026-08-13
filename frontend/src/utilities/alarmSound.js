/**
 * VitalVue Alarm Sound — Web Audio API + Web Speech API
 * ══════════════════════════════════════════════════════
 *
 * ACTIVE ALERT MODES (only ONE plays at a time):
 *   startCriticalVoiceAlert(name, room) → "Patient Critical Alert. Please attend {name}, Room No {room} immediately."
 *   startBandRemovedAlert(name, room)   → "Patient Band Removed. Please attend {name}, Room No {room}."
 *   startBluetoothDisconnectAlert(name, room) → "Patient Outbound. {name}, Room No is {room}."
 *   startWarningAlarm()                 → repeating warning beeps only (no TTS)
 *
 * PATTERN for all voice alerts (identical structure, different text):
 *   Beep Beep → TTS(announcement) × 3 → Beep Beep (final)
 *
 * OVERLAP PREVENTION:
 *   Every start-* function calls stopAll() which:
 *     1. Clears the repeating setInterval
 *     2. Cancels all queued beep setTimeout callbacks
 *     3. Silences every active OscillatorNode immediately
 *     4. Cancels any in-flight speechSynthesis
 *     5. Increments voiceToken → stale async callbacks bail silently
 */

// ═══════════════════════════════════════════════════════════════════════
// AudioContext — created on first user gesture (browser autoplay policy)
// ═══════════════════════════════════════════════════════════════════════

let audioContext = null;

function getAudioContext() { return audioContext; }

function unlockAudio() {
  try {
    if (!audioContext) {
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
  ['click', 'keydown', 'touchstart', 'pointerdown'].forEach(evt =>
    document.addEventListener(evt, unlockAudio, { passive: true, capture: true })
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Low-level oscillator beep
// ═══════════════════════════════════════════════════════════════════════

let oscillatorPool = []; // [{ owner:'alarm'|'voice', oscillator, gainNode }]

function playBeep(owner, frequency, duration, volume = 0.85) {
  try {
    const ctx = getAudioContext();
    if (!ctx || ctx.state !== 'running') return;

    const oscillator = ctx.createOscillator();
    const gainNode   = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    const now = ctx.currentTime;
    const attack = 0.008, decay = 0.06;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + attack);
    gainNode.gain.setValueAtTime(volume, now + duration - decay);
    gainNode.gain.linearRampToValueAtTime(0, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);

    const entry = { owner, oscillator, gainNode };
    oscillatorPool.push(entry);
    oscillator.onended = () => { oscillatorPool = oscillatorPool.filter(o => o !== entry); };
  } catch (e) {
    console.warn('[AlarmSound] playBeep error:', e);
  }
}

function killOscillators(owner) {
  const ctx = audioContext;
  oscillatorPool.filter(o => o.owner === owner).forEach(({ oscillator, gainNode }) => {
    try {
      if (ctx) {
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
      }
      oscillator.stop();
    } catch (_) {}
  });
  oscillatorPool = oscillatorPool.filter(o => o.owner !== owner);
}

// ═══════════════════════════════════════════════════════════════════════
// Warning alarm (beep-only, repeating — for non-device warning alerts)
// ═══════════════════════════════════════════════════════════════════════

let alarmInterval      = null;
let pendingBeepTimeouts = [];

function clearPendingBeeps() {
  pendingBeepTimeouts.forEach(id => clearTimeout(id));
  pendingBeepTimeouts = [];
}

function playWarningPattern() {
  playBeep('alarm', 620, 0.22, 0.65);
  pendingBeepTimeouts.push(setTimeout(() => playBeep('alarm', 620, 0.22, 0.65), 350));
}

// ═══════════════════════════════════════════════════════════════════════
// Master stop — kills everything, invalidates in-flight voice sequences
// ═══════════════════════════════════════════════════════════════════════

let voiceToken   = 0;   // incremented on every stopAll() — stale callbacks bail
let voiceTimeouts = []; // setTimeout IDs used by voice sequences

function stopAll() {
  // 1. Repeating alarm interval
  if (alarmInterval) { clearInterval(alarmInterval); alarmInterval = null; }

  // 2. Queued alarm beep timeouts
  clearPendingBeeps();

  // 3. All oscillators
  killOscillators('alarm');
  killOscillators('voice');

  // 4. Speech synthesis
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }

  // 5. Invalidate in-flight voice sequence callbacks
  voiceToken++;
  voiceTimeouts.forEach(id => clearTimeout(id));
  voiceTimeouts = [];
}

// ═══════════════════════════════════════════════════════════════════════
// Smart voice resolver — picks best available TTS voice once, caches it
// ═══════════════════════════════════════════════════════════════════════

let _cachedVoice = null;

// Priority-ordered list: highest quality at the top
const PREFERRED_VOICE_NAMES = [
  // Chrome neural voices (best — truly human-sounding)
  'Google US English',
  'Google UK English Female',
  'Google UK English Male',
  // Windows 11 Microsoft Natural neural voices
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Microsoft Guy Online (Natural) - English (United States)',
  'Microsoft Aria - English (United States)',
  'Microsoft Jenny - English (United States)',
  // Windows 10 online voices
  'Microsoft Zira Online - English (United States)',
  'Microsoft David Online - English (United States)',
  // macOS premium system voices
  'Samantha', // US English — warm, clear
  'Karen',    // Australian English
  'Moira',    // Irish English
  'Tessa',    // South African English
  'Daniel',   // UK English
  'Serena',   // UK English (premium)
  'Fiona',    // Scottish English
];

function scoreVoice(v) {
  const idx = PREFERRED_VOICE_NAMES.findIndex(n =>
    v.name.toLowerCase().includes(n.toLowerCase())
  );
  if (idx !== -1) return 1000 - idx;
  if (v.lang === 'en-US')       return 50;
  if (v.lang.startsWith('en-')) return 20;
  return 0;
}

function resolveVoice() {
  return new Promise(resolve => {
    if (_cachedVoice) { resolve(_cachedVoice); return; }
    if (!window.speechSynthesis) { resolve(null); return; }

    function pickBest() {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return null;
      const scored = voices.filter(v => v.lang.startsWith('en'))
        .map(v => ({ voice: v, score: scoreVoice(v) }))
        .sort((a, b) => b.score - a.score);
      return scored.length > 0 ? scored[0].voice : voices[0];
    }

    const immediate = pickBest();
    if (immediate) {
      _cachedVoice = immediate;
      console.info('[AlarmSound] Voice selected:', immediate.name, '|', immediate.lang);
      resolve(immediate); return;
    }

    let resolved = false;
    const timeout = setTimeout(() => { if (!resolved) { resolved = true; resolve(null); } }, 3000);
    window.speechSynthesis.addEventListener('voiceschanged', function handler() {
      if (resolved) return;
      const best = pickBest();
      if (best) {
        resolved = true; _cachedVoice = best;
        clearTimeout(timeout);
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        console.info('[AlarmSound] Voice selected (async):', best.name, '|', best.lang);
        resolve(best);
      }
    });
  });
}

// Pre-warm voice loading when module imports
if (typeof window !== 'undefined' && window.speechSynthesis) {
  resolveVoice().catch(() => {});
}

// ═══════════════════════════════════════════════════════════════════════
// Generic voice alert sequence engine
// ═══════════════════════════════════════════════════════════════════════
// Pattern:
//   (Beep Beep → TTS(text)) × cycles → Beep Beep (final closing pair)
//
// All voice alert types share this runner. Only the text differs.

/** Double-beep owned by 'voice' (distinct 780 Hz, PA-announcement style). */
function playVoiceBeepPair() {
  playBeep('voice', 780, 0.22, 0.82);
  const id = setTimeout(() => playBeep('voice', 780, 0.22, 0.82), 310);
  voiceTimeouts.push(id);
}

/**
 * Speak text via TTS. Fires onDone only if voiceToken hasn't changed.
 * Never calls speechSynthesis.cancel() — cancellation is through stopAll().
 */
function speakStep(text, voice, myToken, onDone) {
  if (!window.speechSynthesis) {
    // Fallback: estimate duration and proceed
    const ms = Math.max(2000, text.split(' ').length * 460);
    const id  = setTimeout(() => { if (voiceToken === myToken) onDone(); }, ms);
    voiceTimeouts.push(id);
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  if (voice) utterance.voice = voice;

  // PA-announcement style: deliberate pace, slight authority depth, full volume
  utterance.rate   = 0.82;
  utterance.pitch  = 0.95;
  utterance.volume = 1.0;
  utterance.lang   = voice?.lang || 'en-US';

  utterance.onend   = () => { if (voiceToken === myToken) onDone(); };
  utterance.onerror = () => { if (voiceToken === myToken) onDone(); };

  window.speechSynthesis.speak(utterance);
}

/**
 * Run one cycle of the voice sequence:
 *   Beep Beep (650ms gap) → TTS → (350ms gap) → runCycle(cycle + 1)
 *
 * When all cycles are done, plays the final closing Beep Beep.
 */
function runVoiceSequence(text, voice, myToken, cycle, total) {
  if (voiceToken !== myToken) return; // cancelled

  if (cycle >= total) {
    playVoiceBeepPair(); // final closing beep pair
    return;
  }

  // Step 1: Beep Beep
  playVoiceBeepPair();

  // Step 2: Wait for beeps to settle, then speak
  const talkId = setTimeout(() => {
    if (voiceToken !== myToken) return;
    speakStep(text, voice, myToken, () => {
      // Step 3: Short gap, then next cycle
      const nextId = setTimeout(() => runVoiceSequence(text, voice, myToken, cycle + 1, total), 350);
      voiceTimeouts.push(nextId);
    });
  }, 650);

  voiceTimeouts.push(talkId);
}

/** Helper used by all voice alert start functions. */
async function _startVoiceAlert(text) {
  stopAll();               // stops everything, bumps voiceToken
  const myToken = voiceToken;             // capture AFTER stopAll
  const voice   = await resolveVoice();  // usually instant (cached)
  if (voiceToken !== myToken) return;    // cancelled while awaiting voice
  runVoiceSequence(text, voice, myToken, 0, 3);
}

// ═══════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════

/**
 * CRITICAL VITAL ALERT
 * Beep Beep → "Patient Critical Alert. Please attend {name}, Room No {room} immediately." × 3 → Beep Beep
 */
export function startCriticalVoiceAlert(patientName, room) {
  const name   = (patientName || 'Patient').trim();
  const roomNo = room != null && String(room).trim() !== '' ? String(room).trim() : 'Unknown';
  return _startVoiceAlert(
    `Patient Critical Alert. Please attend ${name}, Room No ${roomNo} immediately.`
  );
}

/**
 * BAND REMOVED ALERT
 * Beep Beep → "Patient Band Removed. Please attend {name}, Room No {room}." × 3 → Beep Beep
 */
export function startBandRemovedAlert(patientName, room) {
  const name   = (patientName || 'Patient').trim();
  const roomNo = room != null && String(room).trim() !== '' ? String(room).trim() : 'Unknown';
  return _startVoiceAlert(
    `Patient Band Removed. Please attend ${name}, Room No ${roomNo}.`
  );
}

/**
 * BLUETOOTH DISCONNECT ALERT
 * Beep Beep → "Patient Outbound. {name}, Room No is {room}." × 3 → Beep Beep
 */
export function startBluetoothDisconnectAlert(patientName, room) {
  const name   = (patientName || 'Patient').trim();
  const roomNo = room != null && String(room).trim() !== '' ? String(room).trim() : 'Unknown';
  return _startVoiceAlert(
    `Patient Outbound. ${name}, Room No is ${roomNo}.`
  );
}

/**
 * WARNING ALARM — repeating double-beep only (no TTS).
 * Used for non-critical / warning-severity alerts.
 */
export function startWarningAlarm() {
  stopAll();
  playWarningPattern();
  alarmInterval = setInterval(playWarningPattern, 4000);
}

/**
 * LEGACY: startAlarm() — kept for backward compat.
 * Falls through to repeating beeps (callers that don't have patient data).
 * Prefer startCriticalVoiceAlert(name, room) when data is available.
 */
export function startAlarm() {
  stopAll();
  // Fallback critical beep pattern (3 beeps, repeating)
  function playCriticalPattern() {
    playBeep('alarm', 880, 0.18, 0.85);
    pendingBeepTimeouts.push(setTimeout(() => playBeep('alarm', 880, 0.18, 0.85), 250));
    pendingBeepTimeouts.push(setTimeout(() => playBeep('alarm', 880, 0.18, 0.85), 500));
  }
  playCriticalPattern();
  alarmInterval = setInterval(playCriticalPattern, 2000);
}

/**
 * Stop ALL active sound immediately (any mode).
 */
export function stopAlarm() {
  stopAll();
}

/**
 * Alias — kept for backward compat.
 */
export function stopBluetoothDisconnectAlert() {
  stopAll();
}
