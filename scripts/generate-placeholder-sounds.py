"""Generate 9 placeholder sound effects (WAV) for GDD v0.2 缺失音效.

Pure stdlib (wave + math + struct) — no numpy / lameenc / ffmpeg required.

The 9 sounds cover the actions missing in GDD v0.1 G.章节 资源映射表:
  S1  bomb           200Hz -> 100Hz  sweep, 1.0s
  S2  rocket         500Hz -> 1500Hz -> 200Hz  rise+boom, 1.2s
  S3  spring         800Hz + 200Hz bell, 0.8s
  S4  antispring     200Hz bell + 100Hz bass, 0.8s
  S5  trustee        400Hz -> 600Hz, 0.6s
  S6  pass           300Hz short + decay, 0.4s
  S7  shot           500Hz short + overtone, 0.5s
  S8  countdown      600Hz x 3 ticks, 0.3s each
  S9  double         700Hz -> 1000Hz rise, 0.8s

Each file is suffixed ``_placeholder.wav`` to make it obvious it is NOT a
real sound asset. GDD v0.2 I.2 marks these for replacement by licensed audio.

Outputs to:
  - server/static/audio/   (runtime, served by Tornado)
  - client/build/static/audio/  (Tauri bundle)
  - src-tauri/.../server/static/audio/  (desktop pack)
"""
from __future__ import annotations

import math
import os
import struct
import sys
import wave
from typing import Callable, List, Tuple


SAMPLE_RATE = 44100
AMPLITUDE = 0.35  # leave headroom; placeholder volume only


# --- Synthesis primitives ----------------------------------------------------


def _envelope(t: float, duration: float, attack: float = 0.02, release: float = 0.05) -> float:
    """Linear attack/release envelope. Returns 0..1 gain at time t."""
    if t < 0 or t > duration:
        return 0.0
    if t < attack:
        return t / attack
    if t > duration - release:
        return max(0.0, (duration - t) / release)
    return 1.0


def _sine(freq: float, t: float) -> float:
    return math.sin(2.0 * math.pi * freq * t)


def _sweep(f0: float, f1: float, t: float, total: float) -> float:
    """Linear frequency sweep from f0 at t=0 to f1 at t=total."""
    f = f0 + (f1 - f0) * (t / total)
    return math.sin(2.0 * math.pi * f * t)


def _tick(freq: float, t: float, total: float) -> float:
    """A short tone with quick attack and exponential decay."""
    env = math.exp(-6.0 * t / total)
    return _sine(freq, t) * env


# --- Per-sound renderers (return list of int16 samples) -----------------------


def _render_bomb() -> List[int]:
    duration = 1.0
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.02, release=0.20)
        s = _sweep(200.0, 100.0, t, duration) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_rocket() -> List[int]:
    duration = 1.2
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        if t < duration * 0.6:
            # Rise: 500 -> 1500 Hz
            s = _sweep(500.0, 1500.0, t, duration * 0.6) * _envelope(t, duration, attack=0.05)
        else:
            # Boom: 1500 -> 200 Hz, decaying
            t2 = t - duration * 0.6
            boom_dur = duration * 0.4
            env = _envelope(t2, boom_dur, attack=0.0, release=boom_dur * 0.9)
            s = _sweep(1500.0, 200.0, t2, boom_dur) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_spring() -> List[int]:
    duration = 0.8
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.05, release=0.10)
        s = (_sine(800.0, t) * 0.6 + _sine(200.0, t) * 0.4) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_antispring() -> List[int]:
    duration = 0.8
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.05, release=0.10)
        s = (_sine(200.0, t) * 0.5 + _sine(100.0, t) * 0.5) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_trustee() -> List[int]:
    duration = 0.6
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.05, release=0.05)
        s = _sweep(400.0, 600.0, t, duration) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_pass() -> List[int]:
    duration = 0.4
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.01, release=0.30)
        s = _sine(300.0, t) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_shot() -> List[int]:
    duration = 0.5
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.005, release=0.30)
        # Fundamental + 1200Hz overtone
        s = (_sine(500.0, t) * 0.7 + _sine(1200.0, t) * 0.3) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


def _render_countdown() -> List[int]:
    """Three short ticks at 0/0.3/0.6 seconds."""
    duration = 0.9
    n = int(SAMPLE_RATE * duration)
    out = [0] * n
    for tick_idx, start in enumerate([0.0, 0.3, 0.6]):
        tick_dur = 0.18
        for i in range(int(SAMPLE_RATE * tick_dur)):
            t = i / SAMPLE_RATE
            pos = int((start + t) * SAMPLE_RATE)
            if pos >= n:
                break
            env = _envelope(t, tick_dur, attack=0.005, release=0.05)
            s = _tick(600.0, t, tick_dur) * env
            out[pos] += int(s * AMPLITUDE * 32767)
    return out


def _render_double() -> List[int]:
    duration = 0.8
    n = int(SAMPLE_RATE * duration)
    out = []
    for i in range(n):
        t = i / SAMPLE_RATE
        env = _envelope(t, duration, attack=0.03, release=0.10)
        s = _sweep(700.0, 1000.0, t, duration) * env
        out.append(int(s * AMPLITUDE * 32767))
    return out


# --- WAV writer --------------------------------------------------------------


def _write_wav(path: str, samples: List[int]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, 'wb') as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)  # 16-bit
        wav.setframerate(SAMPLE_RATE)
        # Clamp to int16 range before packing
        frames = b''.join(struct.pack('<h', max(-32768, min(32767, s))) for s in samples)
        wav.writeframes(frames)


# --- Top-level orchestration --------------------------------------------------


SOUNDS: List[Tuple[str, Callable[[], List[int]]]] = [
    ('bomb_placeholder', _render_bomb),
    ('rocket_placeholder', _render_rocket),
    ('spring_placeholder', _render_spring),
    ('antispring_placeholder', _render_antispring),
    ('trustee_placeholder', _render_trustee),
    ('pass_placeholder', _render_pass),
    ('shot_placeholder', _render_shot),
    ('countdown_placeholder', _render_countdown),
    ('double_placeholder', _render_double),
]


def _output_paths(repo_root: str, name: str) -> List[str]:
    """Return all destination paths for a placeholder WAV."""
    fname = f'{name}.wav'
    return [
        os.path.join(repo_root, 'server', 'static', 'audio', fname),
        os.path.join(repo_root, 'client', 'build', 'static', 'audio', fname),
        os.path.join(repo_root, 'src-tauri', 'target', 'release', 'server', 'static', 'audio', fname),
        os.path.join(repo_root, 'src-tauri', 'target', 'release', 'bundle', 'deb', 'doudizhu_0.1.0_amd64', 'data', 'usr', 'lib', 'doudizhu', 'server', 'static', 'audio', fname),
    ]


def main() -> int:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    written: List[Tuple[str, int]] = []
    for name, renderer in SOUNDS:
        samples = renderer()
        for path in _output_paths(repo_root, name):
            _write_wav(path, samples)
            written.append((path, len(samples)))
    print(f'placeholder-sounds: wrote {len(written)} files (9 sounds x {len(_output_paths("", ""))} destinations)')
    for path, n in written[: len(SOUNDS)]:
        size = os.path.getsize(path)
        print(f'  {os.path.basename(path):40s}  {n:>6d} samples  {size:>6d} bytes  {path}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
