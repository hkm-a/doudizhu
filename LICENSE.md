# License Status

This repository does not currently have a single project-wide open-source license.

## Source Components

- The game foundation is derived from [`svzdev/doudizhu`](https://github.com/svzdev/doudizhu). The upstream README displays an MIT badge, but no LICENSE file exists in that repository. Without a formal license file, default copyright applies (all rights reserved) per GitHub's Terms of Service.
- The AI integration target is [`kwai/DouZero`](https://github.com/kwai/DouZero), which declares Apache License 2.0.
- New integration code, documentation, CI, and desktop packaging in this repository are intended to be clarified under a permissive license after the upstream game-code license status is resolved or the affected code is replaced.

## Practical Meaning

Do not assume that the entire repository is licensed for redistribution, commercial use, or sublicensing until this file is replaced by a complete project-wide license.

Contributors should only submit code they have the right to contribute, and should not add third-party assets, model files, generated code, or copied source without a clear compatible license.

## Audit (2026-06-02)

All third-party package dependencies were audited and are permissively licensed (MIT / Apache 2.0 / BSD). One exception: `orjson` (Python, MPL-2.0 — weak copyleft, no modifications made). See [NOTICE.md](NOTICE.md) for full dependency license details.
