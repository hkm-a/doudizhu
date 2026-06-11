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
        gain.gain.linearRampToValueAtTime(volume, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {}
}

function playNoise(duration, volume = 0.08, delay = 0) {
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

const Sound = {
    deal() {
        playNoise(0.04, 0.05);
        playTone(1200, 0.03, 'sine', 0.04, 0.02);
    },
    card() {
        playTone(300, 0.06, 'triangle', 0.1);
        playNoise(0.03, 0.04);
    },
    pass() {
        playTone(400, 0.1, 'sine', 0.05);
        playTone(300, 0.15, 'sine', 0.03, 0.05);
    },
    bid() {
        playTone(660, 0.08, 'sine', 0.08);
        playTone(880, 0.12, 'sine', 0.06, 0.06);
    },
    bomb() {
        playTone(60, 0.5, 'sawtooth', 0.18);
        playTone(45, 0.4, 'square', 0.12, 0.05);
        playNoise(0.35, 0.15);
        playTone(90, 0.3, 'triangle', 0.1, 0.1);
    },
    rocket() {
        const ctx = getAudioCtx();
        if (muted || !ctx) return;
        try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.6);
            gain.gain.setValueAtTime(0.12, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.7);
            playNoise(0.2, 0.08, 0.3);
        } catch (e) {}
    },
    win() {
        [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 0.25, 'sine', 0.1, i * 0.12));
        playTone(1047, 0.5, 'triangle', 0.06, 0.5);
    },
    lose() {
        [440, 392, 349, 311, 262].forEach((f, i) => playTone(f, 0.3, 'sine', 0.08, i * 0.18));
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
