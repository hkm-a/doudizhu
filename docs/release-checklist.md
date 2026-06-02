# Release Checklist

## Pre-Release

### Code Quality
- [ ] `npm run verify` — 全部 4 项检查通过（backend, web, desktop, config）
- [ ] 后端测试：`PYTHONPATH=server python3 -m pytest tests/backend/ -v` 全部通过
- [ ] Rust 测试：`cd src-tauri && cargo test`
- [ ] CI 流水线绿色通过

### Database
- [ ] `npm run dev:migrate:check` — 迁移无冲突
- [ ] 所有迁移已应用：`npm run dev:migrate`
- [ ] 回滚测试：`alembic downgrade -1` 后 `alembic upgrade head` 正常

### Desktop (Tauri)
- [ ] `cargo build` 无 warning
- [ ] 预检脚本可运行：`python3 scripts/backend-preflight.py`
- [ ] venv 自动创建验证（清理 .venv 后启动桌面）
- [ ] pip install 自动安装验证

### Security
- [ ] `.env` 中无硬编码密钥提交
- [ ] SECRET_KEY 在生产环境已更换
- [ ] CSP 已配置（非 null）
- [ ] 无敏感信息泄露到客户端日志
- [ ] WebSocket 输入验证到位
- [ ] SQL 注入防护（参数化查询）
- [ ] XSS 防护（模板转义）

### Licensing
- [ ] NOTICE.md 中所有依赖许可状态已更新
- [ ] 上游资产版权状态已记录
- [ ] LICENSE.md 准确反映项目状态

## Release Process

### Version Bump
- [ ] `package.json` 版本号已更新
- [ ] `src-tauri/Cargo.toml` 版本号已更新
- [ ] `src-tauri/tauri.conf.json` 版本号已更新
- [ ] 对应版本 tag 已创建（`git tag -a vX.Y.Z -m "..."`）

### Build
- [ ] Linux .deb 构建成功：`npm run tauri:build`
- [ ] Linux AppImage 构建成功（验证目标）
- [ ] Windows .msi/.exe 构建成功（交叉编译或 CI）
- [ ] macOS .dmg 构建成功（交叉编译或 CI）
- [ ] 构建 artifact 校验和已生成

### Release Notes
- [ ] `docs/releases/vX.Y.Z.md` 已编写
- [ ] GitHub Release 已创建（含 artifact 和 checksum）
- [ ] 更新日志已汇总到 README 或 CHANGELOG

## Post-Release

### Verification
- [ ] 从 release artifact 安装后 smoke test 通过
- [ ] 全新环境初始化测试（clean venv + first start）
- [ ] 数据库迁移在全新数据库上正常执行
- [ ] AI 模式可选且可降级（规则 AI fallback）

### Rollback
- [ ] 数据库回滚步骤已记录
- [ ] 上一版本构建 artifact 可获取
- [ ] 回滚后 smoke test 通过

## Rollback Instructions

### Database
```bash
# 降级到上一版本
alembic downgrade -1

# 或降级到指定版本
alembic downgrade <revision>
```

### Desktop
1. 卸载当前版本
2. 安装上一版本的 .deb/.msi/.dmg
3. 确认 .env 或数据库连接配置兼容
4. 运行 `npm run dev:migrate` 确保数据库版本匹配
