# Roadmap

这个路线图面向“值得长期关注和贡献”的开源项目质量，而不是一次性 demo。

## 0.1 Public Baseline

- [x] 用 `svzdev/doudizhu` 重建基础工程。
- [x] 增加 Tauri 2 桌面壳。
- [x] 抽出 AI 策略边界，保留规则 AI fallback。
- [x] 建立 CI 基础门禁。
- [x] 补齐公开社区入口和许可状态说明。

## 0.2 Playable Desktop Alpha

- [x] 本地诊断自动检测 Python 依赖和 MySQL 连接，并给出可操作错误。
- [x] 桌面端自动展示 Python 依赖和 MySQL 连接预检结果。
- [x] 提供开发者一键初始化脚本。
- [x] 清理旧前端链接、文案和资源边界。
- [x] 增加桌面启动链路 smoke test。
- [x] 发布可安装的 Linux alpha 包和 release notes。

## 0.3 AI Integration Alpha

- [x] 实现 svzdev 牌 id 到 DouZero rank 表示的转换。
- [x] 实现房间状态到 DouZero `InfoSet` 的转换。
- [x] 实现 DouZero 动作到具体牌 id 的回映射。
- [x] 增加固定牌局回放 smoke 测试。
- [x] 增加真实 checkpoint 固定牌局回放入口。
- [x] 在 CI 中配置定期运行真实 checkpoint 固定牌局回放（`checkpoint-nightly.yml`）。
- [x] 增加 AI 对局日志，便于比较规则 AI 与 DouZero。
- [x] 增加 AI 决策日志汇总脚本。

## 0.4 Contributor-Ready Refactor

- [x] 分离服务端状态机、协议、规则和持久化边界（`server/game/` 纯游戏引擎）。
- [x] 为房间（87 tests）、玩家（103 tests）、牌型（63 tests）、计时器（13 tests）、记录写入补充单元测试。
- [x] 为前端牌桌关键交互补充可复现测试（`client/e2e/game-flow.spec.js` + `ui-design.spec.js`，4 tests passing）。
- [x] 明确许可证路径：完整 NOTICE.md + LICENSE.md 资产审计，上游版权状态透明化。

## 1.0 Release Candidate

- [ ] 桌面端内置或管理运行时依赖。
- [ ] 提供数据库初始化和迁移生命周期。
- [ ] 具备 Windows、macOS、Linux 发布矩阵。
- [ ] 完成安全检查、发布清单和回滚说明。
- [ ] 完成完整许可证和第三方 notices。
