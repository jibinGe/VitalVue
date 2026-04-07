/**
 * Critical Alarm Sound — uses Web Audio API (no packages required)
 * Plays a repeating medical-style beep pattern until stopped.
 */

let audioContext = null;
let alarmInterval = null;
let isAudioInitialized = false;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

// Initialize audio context on first user interaction to bypass autoplay policies
function initAudioOnInteraction() {
  if (isAudioInitialized) return;
  const ctx = getAudioContext();
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  isAudioInitialized = true;
  
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('keydown', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', initAudioOnInteraction);
  document.addEventListener('keydown', initAudioOnInteraction);
  document.addEventListener('touchstart', initAudioOnInteraction);
}

/**
 * Plays a single sharp medical beep tone.
 * @param {number} frequency - Hz of the tone
 * @param {number} duration  - Duration in seconds
 * @param {number} volume    - Gain 0–1
 * @param {string} type      - Oscillator type ('sine', 'triangle', 'square', 'sawtooth')
 */
function playBeep(frequency = 800, duration = 0.15, volume = 0.8, type = "triangle") {
  // Prevent context creation/warnings before user interaction
  if (!isAudioInitialized) return;

  try {
    const ctx = getAudioContext();

    // Try to resume if it was somehow suspended
    if (ctx.state === "suspended") ctx.resume().catch(() => {});

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Sharp attack, quick linear decay — medical monitor style
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.01);
    // Linear ramp is safer than exponential across different browsers
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration + 0.05);

    // Memory optimization: clean up audio nodes after playback completes
    setTimeout(() => {
        try {
            oscillator.disconnect();
            gainNode.disconnect();
        } catch (e) {}
    }, (duration + 0.1) * 1000);
  } catch (e) {
    console.warn("Alarm sound error:", e);
  }
}

/**
 * Plays a standard medical triple-beep burst pattern
 */
function playAlarmPattern() {
  playBeep(800, 0.15, 0.8, "triangle");
  setTimeout(() => playBeep(800, 0.15, 0.8, "triangle"), 200);
  setTimeout(() => playBeep(800, 0.15, 0.8, "triangle"), 400);
}

/**
 * Start the repeating critical alarm sound (every 2 seconds).
 */
export function startAlarm() {
  stopAlarm(); // clear any existing interval first
  playAlarmPattern(); // play immediately
  alarmInterval = setInterval(playAlarmPattern, 2000);
}

/**
 * Stop the repeating alarm sound.
 */
export function stopAlarm() {
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
}
