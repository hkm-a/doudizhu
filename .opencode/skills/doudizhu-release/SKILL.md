---
name: doudizhu-release
description: 斗地主发布流程 — 版本号管理、Release Notes、Tauri 构建、SHA256 校验、artifact manifest。Use when running desktop:release-* scripts or preparing a release.
---

# 斗地主发布流程

## 版本号规范

```
v0.Y.Z[-alpha]
```

- `v0.2.0-alpha` — 当前开发基线
- 版本号在 `src-tauri/tauri.conf.json` 和 `client/package.json` 中管理

## 发布前检查

```bash
npm run verify:config        # 配置完整性
npm run verify:release       # 发布元数据检查
npm run desktop:artifact-smoke  # 构建产物 smoke
```

## 构建流程

```bash
# 清理 → 构建 → 打包
npm run clean:python-cache
npx tauri build

# 产物检查
npm run desktop:artifact-smoke
npm run desktop:artifact-manifest
npm run desktop:release-bundle -- vX.Y.Z
npm run desktop:release-check -- vX.Y.Z
```

## 发布产物结构

```
dist/linux-alpha/vX.Y.Z/
├── doudizhu_0.1.0_amd64.deb      # Debian 包
├── doudizhu_0.1.0_amd64.deb.manifest.json  # 元数据清单
├── vX.Y.Z.md                     # Release Notes
└── SHA256SUMS                    # 完整性校验
```

## CI 发布流水线

`.github/workflows/release-linux-alpha.yml`：
1. Install Tauri 系统依赖
2. `npm ci`
3. `npm run verify:desktop`
4. `npm run tauri:build`
5. 产物 smoke + manifest + bundle + checksum

## Release Notes 模板

位于 `docs/releases/vX.Y.Z.md`，需包含：
- Changes since last release
- Known Limitations
- `npm run verify` 验证结果
- manifest.json 校验
