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

Static game assets and audio were inherited from svzdev/doudizhu. Their license status follows the same upstream-license caveat described in [LICENSE.md](LICENSE.md).

## Future Work

Before a broad public release, the project should either obtain a clear license for the inherited game foundation or replace the affected code and assets with newly authored or clearly licensed alternatives.
