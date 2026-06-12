// Doudizhu Sound Effects - Web Audio API Synthesis
// TTS策略: 简单牌型读牌面, 复杂牌型只读名称

let audioCtx = null;
let muted = false;
let masterGain = null;

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.7;
        masterGain.connect(audioCtx.destination);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playTone(freq, duration, type, volume, delay) {
    if (muted) return;
    type = type || 'sine'; volume = volume || 0.1; delay = delay || 0;
    try {
        var ctx = getAudioCtx();
        var t = ctx.currentTime + delay;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(volume, t + 0.005);
        gain.gain.setValueAtTime(volume, t + duration * 0.7);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {}
}

function playNoise(duration, volume, delay) {
    if (muted) return;
    volume = volume || 0.05; delay = delay || 0;
    try {
        var ctx = getAudioCtx();
        var t = ctx.currentTime + delay;
        var bufferSize = Math.floor(ctx.sampleRate * duration);
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(gain);
        gain.connect(masterGain);
        src.start(t);
    } catch (e) {}
}

function playFilteredNoise(duration, cutoff, volume, delay) {
    if (muted) return;
    volume = volume || 0.05; delay = delay || 0;
    try {
        var ctx = getAudioCtx();
        var t = ctx.currentTime + delay;
        var bufferSize = Math.floor(ctx.sampleRate * duration);
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        var src = ctx.createBufferSource();
        src.buffer = buffer;
        var filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = cutoff;
        var gain = ctx.createGain();
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        src.start(t);
    } catch (e) {}
}

function playSweep(startFreq, endFreq, duration, type, volume, delay) {
    if (muted) return;
    type = type || 'sawtooth'; volume = volume || 0.08; delay = delay || 0;
    try {
        var ctx = getAudioCtx();
        var t = ctx.currentTime + delay;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(t);
        osc.stop(t + duration);
    } catch (e) {}
}

var Sound = {
    deal: function() {
        for (var i = 0; i < 5; i++) {
            playFilteredNoise(0.03, 3000, 0.04, i * 0.04);
            playTone(600 + i * 100, 0.03, 'triangle', 0.03, i * 0.04);
        }
    },

    select: function() {
        playTone(1400, 0.035, 'sine', 0.07);
        playTone(1800, 0.025, 'sine', 0.04, 0.015);
    },

    deselect: function() {
        playTone(900, 0.04, 'sine', 0.05);
        playTone(600, 0.03, 'sine', 0.03, 0.02);
    },

    card: function(count) {
        count = count || 1;
        if (count <= 1) {
            playFilteredNoise(0.04, 4000, 0.07);
            playTone(280, 0.06, 'triangle', 0.06);
        } else if (count === 2) {
            playFilteredNoise(0.03, 4000, 0.06, 0);
            playFilteredNoise(0.03, 4000, 0.06, 0.025);
            playTone(300, 0.04, 'triangle', 0.05);
            playTone(400, 0.04, 'triangle', 0.04, 0.025);
        } else if (count <= 4) {
            for (var i = 0; i < count; i++) {
                playFilteredNoise(0.025, 3500, 0.04, i * 0.02);
                playTone(250 + i * 60, 0.03, 'triangle', 0.04, i * 0.02);
            }
        } else {
            for (var i = 0; i < 5; i++) {
                playFilteredNoise(0.02, 3000, 0.03, i * 0.015);
                playTone(200 + i * 40, 0.025, 'square', 0.03, i * 0.015);
            }
        }
    },

    straight: function() {
        for (var i = 0; i < 5; i++) {
            playTone(400 + i * 100, 0.06, 'triangle', 0.05, i * 0.04);
        }
        playFilteredNoise(0.05, 3500, 0.06, 0.15);
    },

    airplane: function() {
        playTone(300, 0.1, 'triangle', 0.06);
        playTone(400, 0.1, 'triangle', 0.05, 0.08);
        playTone(500, 0.1, 'triangle', 0.05, 0.16);
        playFilteredNoise(0.08, 3000, 0.06, 0.1);
    },

    pass: function() {
        playTone(600, 0.06, 'sine', 0.04);
        playTone(400, 0.1, 'sine', 0.03, 0.03);
    },

    bid: function() {
        playTone(800, 0.08, 'sine', 0.07);
        playTone(1000, 0.1, 'sine', 0.05, 0.06);
    },

    bomb: function() {
        playTone(40, 0.7, 'sawtooth', 0.12);
        playTone(50, 0.6, 'square', 0.10, 0.01);
        playFilteredNoise(0.5, 800, 0.15);
        playTone(70, 0.4, 'triangle', 0.08, 0.08);
        playNoise(0.15, 0.08, 0.2);
        playTone(30, 0.3, 'sawtooth', 0.06, 0.15);
    },

    rocket: function() {
        playSweep(80, 3000, 0.7, 'sawtooth', 0.10);
        playSweep(60, 2500, 0.75, 'square', 0.05, 0.02);
        playFilteredNoise(0.2, 1500, 0.06, 0.3);
        playTone(3200, 0.15, 'sine', 0.07, 0.6);
        playFilteredNoise(0.12, 2000, 0.07, 0.6);
    },

    turn: function() {
        playTone(1000, 0.05, 'sine', 0.05);
        playTone(1200, 0.06, 'sine', 0.04, 0.03);
    },

    tick: function() {
        playTone(2500, 0.015, 'sine', 0.06);
    },

    error: function() {
        playTone(180, 0.12, 'square', 0.08);
        playTone(140, 0.18, 'square', 0.06, 0.04);
    },

    hint: function() {
        playTone(1100, 0.04, 'sine', 0.05);
        playTone(1400, 0.05, 'sine', 0.04, 0.025);
    },

    landlord: function() {
        playTone(523, 0.15, 'triangle', 0.08);
        playTone(659, 0.15, 'triangle', 0.07, 0.1);
        playTone(784, 0.15, 'triangle', 0.07, 0.2);
        playTone(1047, 0.35, 'triangle', 0.06, 0.3);
    },

    win: function() {
        [523, 659, 784, 1047, 1319].forEach(function(f, i) {
            playTone(f, 0.18, 'triangle', 0.07, i * 0.1);
        });
        playTone(1047, 0.5, 'sine', 0.04, 0.5);
        playTone(1319, 0.4, 'sine', 0.03, 0.55);
    },

    lose: function() {
        [440, 392, 349, 311, 262].forEach(function(f, i) {
            playTone(f, 0.22, 'sine', 0.05, i * 0.15);
        });
        playTone(180, 0.7, 'triangle', 0.03, 0.7);
    },

    speak: function(text) {
        if (muted) return;
        try {
            if (!window.speechSynthesis) return;
            var u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN';
            u.rate = 1.0;
            u.pitch = 1.0;
            u.volume = 0.5;
            var voices = speechSynthesis.getVoices();
            var zhVoice = voices.find(function(v) { return v.lang.startsWith('zh'); });
            if (zhVoice) u.voice = zhVoice;
            speechSynthesis.cancel();
            speechSynthesis.speak(u);
        } catch (e) {}
    },

    toggleMute: function() { muted = !muted; return muted; },
    isMuted: function() { return muted; }
};

if (typeof module !== 'undefined') module.exports = Sound;
