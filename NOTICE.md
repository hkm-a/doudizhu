# Notices

This project is a fusion effort for a desktop Dou Dizhu (斗地主) game.

## Upstream Projects

### svzdev/doudizhu (Game Foundation)
- Source: https://github.com/svzdev/doudizhu
- License: Undeclared (README displays MIT badge, no LICENSE file)
- Used as: source of derived game logic (server/api/game/, server/models/, client/)

### kwai/DouZero (AI Strategy)
- Source: https://github.com/kwai/DouZero
- License: Apache License 2.0
- Used as: optional AI decision engine adapter (server/ai/)

## Python Dependencies

| Dependency | License |
|-----------|---------|
| tornado | Apache 2.0 |
| aiomysql | MIT |
| alembic | MIT |
| orjson | MPL-2.0 AND (Apache-2.0 OR MIT) |
| SQLAlchemy | MIT |
| PyJWT | MIT |
| typing_extensions | PSF-2.0 |
| uvloop | MIT |
| douzero (optional) | Apache 2.0 |

Note: `orjson` is MPL-2.0 (weak copyleft — file-level). No modifications have been made to orjson source files. This is compatible with permissive-licensed projects as long as modified MPL files are disclosed.

## JavaScript Dependencies

| Dependency | License |
|-----------|---------|
| phaser | MIT |
| react | MIT |
| react-dom | MIT |
| react-scripts | MIT |
| redux | MIT |
| redux-subscriber | MIT |
| @playwright/test (dev) | Apache 2.0 |
| @types/react (dev) | MIT |
| @types/react-dom (dev) | MIT |
| typescript (dev) | Apache 2.0 |
| @tauri-apps/cli (root, dev) | Apache-2.0 OR MIT |

## Rust Dependencies

| Dependency | License |
|-----------|---------|
| tauri | MIT OR Apache-2.0 |
| serde | MIT OR Apache-2.0 |
| serde_json | MIT OR Apache-2.0 |
| tauri-build (build) | MIT OR Apache-2.0 |

All transitive Rust dependencies (435 crates) are permissively licensed (MIT / Apache 2.0 / BSD).

## Bundled Assets

### Image Assets
- Inherited from svzdev/doudizhu (no declared license):
  - `client/public/assets/bg.png`, `client/public/assets/poker.png`, `client/public/assets/logo.png`, `client/public/assets/ui-0.png`, `client/public/assets/preload.png`
  - `client/public/assets/btn/` (button sprites)
  - `server/static/i/` (server-side UI assets)
- License status follows the upstream-license caveat described in [LICENSE.md](LICENSE.md).

### Audio Assets
- **Inherited from svzdev/doudizhu** (no declared license): `bg_room.mp3`, `bg_game.ogg`, `deal.mp3`, `end_lose.mp3`, `end_win.mp3`, `f_score_*.mp3`, `m_score_*.mp3`
- **Generated placeholders** (GDD v0.2, newly authored): `*_placeholder.wav` files in `server/static/audio/` — generated via `scripts/generate-placeholder-sounds.py`. These are original works and can be licensed freely.

### Game Logic (server/static/js/)
- `phaser.min.js` / `phaser-input.js` / `phaser-input.min.js` — third-party libraries (Phaser: MIT, phaser-input: MIT)
- `generator.mjs`, `rule.mjs` — inherited from svzdev/doudizhu
- `boot.mjs`, `game.mjs`, `net.mjs`, `player.mjs` — derived from svzdev/doudizhu with modifications

### Asset Audit Summary (2026-06-03)

| Category | Status | Action Needed Before 1.0 |
|----------|--------|--------------------------|
| Inherited images | No clear license | Replace with original art or obtain upstream license |
| Inherited audio | No clear license | Replace with original audio or obtain upstream license |
| Placeholder audio | Newly authored (clean) | None — ready for 1.0 |
| Third-party JS libs | MIT (clean) | None |
| Game logic JS | Derivative | Replace or get upstream license |

## Future Work

Before a broad public release, the project should either obtain a clear license for the inherited game foundation or replace the affected code and assets with newly authored or clearly licensed alternatives.
