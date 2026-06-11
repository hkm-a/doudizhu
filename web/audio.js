// Doudizhu Sound Effects - Web Audio API Synthesis (no external files)

let audioCtx = null;
let muted = false;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playTone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
    if (muted) return;
    try {
        const ctx = getAudioCtx();
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {}
}

function playNoise(duration, volume = 0.06, delay = 0) {
    if (muted) return;
    try {
        const ctx = getAudioCtx();
        const t = ctx.currentTime + delay;
        const bufferSize = Math.floor(ctx.sampleRate * duration);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(gain);
        gain.connect(ctx.destination);
        src.start(t);
    } catch (e) {}
}

function playSweep(startFreq, endFreq, duration, type = 'sawtooth', volume = 0.1, delay = 0) {
    if (muted) return;
    try {
        const ctx = getAudioCtx();
        const t = ctx.currentTime + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {}
}

const Sound = {
    deal() {
        for (let i = 0; i < 3; i++) {
            playNoise(0.03, 0.04, i * 0.06);
            playTone(800 + i * 200, 0.04, 'triangle', 0.03, i * 0.06);
        }
    },

    select() {
        playTone(1200, 0.04, 'sine', 0.06);
    },

    deselect() {
        playTone(800, 0.03, 'sine', 0.04);
    },

    card(count) {
        if (count <= 1) {
            playTone(350, 0.05, 'triangle', 0.08);
            playNoise(0.025, 0.04);
        } else if (count === 2) {
            playTone(350, 0.04, 'triangle', 0.08);
            playTone(450, 0.04, 'triangle', 0.07, 0.02);
            playNoise(0.03, 0.04);
        } else if (count <= 4) {
            for (let i = 0; i < Math.min(count, 4); i++) {
                playTone(300 + i * 80, 0.03, 'triangle', 0.06, i * 0.02);
            }
            playNoise(0.04, 0.05);
        } else {
            for (let i = 0; i < 4; i++) {
                playTone(300 + i * 60, 0.025, 'square', 0.04, i * 0.015);
            }
            playNoise(0.05, 0.06);
        }
    },

    pass() {
        playTone(500, 0.08, 'sine', 0.04);
        playTone(350, 0.12, 'sine', 0.03, 0.04);
    },

    bid() {
        playTone(660, 0.08, 'sine', 0.07);
        playTone(880, 0.1, 'sine', 0.06, 0.06);
    },

    bomb() {
        playTone(45, 0.6, 'sawtooth', 0.15);
        playTone(55, 0.5, 'square', 0.12, 0.02);
        playNoise(0.4, 0.18);
        playTone(80, 0.4, 'triangle', 0.1, 0.05);
        playTone(35, 0.3, 'sawtooth', 0.08, 0.1);
        playNoise(0.2, 0.1, 0.15);
    },

    rocket() {
        playSweep(100, 3000, 0.6, 'sawtooth', 0.12);
        playSweep(80, 2800, 0.65, 'square', 0.06, 0.02);
        playNoise(0.15, 0.06, 0.25);
        playTone(3000, 0.2, 'sine', 0.08, 0.55);
        playNoise(0.1, 0.08, 0.55);
    },

    turn() {
        playTone(880, 0.06, 'sine', 0.05);
        playTone(1100, 0.08, 'sine', 0.04, 0.04);
    },

    tick() {
        playTone(2000, 0.02, 'sine', 0.03);
    },

    error() {
        playTone(200, 0.15, 'square', 0.08);
        playTone(150, 0.2, 'square', 0.06, 0.05);
    },

    hint() {
        playTone(1000, 0.05, 'sine', 0.04);
        playTone(1200, 0.06, 'sine', 0.03, 0.03);
    },

    landlord() {
        [523, 659, 784].forEach((f, i) => playTone(f, 0.2, 'triangle', 0.08, i * 0.1));
        playTone(1047, 0.4, 'triangle', 0.06, 0.3);
    },

    win() {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => playTone(f, 0.2, 'sine', 0.08, i * 0.1));
        playTone(1047, 0.6, 'triangle', 0.05, 0.6);
        playTone(1319, 0.5, 'sine', 0.04, 0.65);
    },

    lose() {
        [440, 392, 349, 311, 262, 220].forEach((f, i) => playTone(f, 0.25, 'sine', 0.06, i * 0.15));
        playTone(180, 0.8, 'triangle', 0.04, 0.8);
    },

    speak(text) {
        if (muted) return;
        try {
            if (!window.speechSynthesis) return;
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN';
            u.rate = 1.1;
            u.pitch = 1.0;
            u.volume = 0.8;
            const voices = speechSynthesis.getVoices();
            const zhVoice = voices.find(v => v.lang.startsWith('zh'));
            if (zhVoice) u.voice = zhVoice;
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
        } catch (e) {}
    },

    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; }
};

if (typeof module !== 'undefined') module.exports = Sound;
