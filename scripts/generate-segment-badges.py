"""GDD v0.2 H.6 段位 badge 占位 SVG 生成器。

为 7 段位生成简单占位 SVG（圆 + 段位首字母 + 颜色），覆盖 4 个目标位置。
明确标记 *_placeholder.svg —— 真实设计资产留给设计师。

输出：
  server/static/i/segment/{segment}_placeholder.svg
  client/build/static/i/segment/{segment}_placeholder.svg
  src-tauri/target/release/server/static/i/segment/{segment}_placeholder.svg
  src-tauri/target/release/bundle/deb/.../usr/lib/doudizhu/server/static/i/segment/{segment}_placeholder.svg
"""
from __future__ import annotations

import os
import sys
from typing import List, Tuple


# 段位 → (颜色, 缩写) 映射
SEGMENTS: List[Tuple[str, str, str]] = [
    ('bronze',     '#A97142', 'B'),
    ('silver',     '#C0C0C0', 'S'),
    ('gold',       '#FFD700', 'G'),
    ('platinum',   '#E5E4E2', 'P'),
    ('diamond',    '#B9F2FF', 'D'),
    ('master',     '#FF6347', 'M'),
    ('king',       '#8A2BE2', 'K'),
]


def _render_svg(segment: str, color: str, letter: str) -> str:
    """生成 80x80 SVG：圆 + 缩写。"""
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">
  <circle cx="40" cy="40" r="36" fill="{color}" stroke="#1a1a1a" stroke-width="2"/>
  <text x="40" y="50" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="bold" fill="#1a1a1a">{letter}</text>
  <text x="40" y="76" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#1a1a1a">{segment.upper()}_PLACEHOLDER</text>
</svg>'''


def _output_paths(repo_root: str, name: str) -> List[str]:
    return [
        os.path.join(repo_root, 'server', 'static', 'i', 'segment', f'{name}.svg'),
        os.path.join(repo_root, 'client', 'build', 'static', 'i', 'segment', f'{name}.svg'),
        os.path.join(repo_root, 'src-tauri', 'target', 'release', 'server', 'static', 'i', 'segment', f'{name}.svg'),
        os.path.join(repo_root, 'src-tauri', 'target', 'release', 'bundle', 'deb', 'doudizhu_0.1.0_amd64', 'data', 'usr', 'lib', 'doudizhu', 'server', 'static', 'i', 'segment', f'{name}.svg'),
    ]


def main() -> int:
    repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    written = 0
    for segment, color, letter in SEGMENTS:
        svg = _render_svg(segment, color, letter)
        for path in _output_paths(repo_root, f'{segment}_placeholder'):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'w', encoding='utf-8') as f:
                f.write(svg)
            written += 1
    print(f'segment-badges: wrote {written} placeholder SVGs (7 segments × 4 destinations)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
