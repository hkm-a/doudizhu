# Roadmap

这个路线图面向“值得长期关注和贡献”的开源项目质量，而不是一次性 demo。

## 0.1 Public Baseline

- [x] 用 `svzdev/doudizhu` 重建基础工程。
- [x] 增加 Tauri 2 桌面壳。
- [x] 抽出 AI 策略边界，保留规则 AI fallback。
- [x] 建立 CI 基础门禁。
- [x] 补齐公开社区入口和许可状态说明。

## 0.2 Playable Desktop Alpha

- [ ] 桌面端自动检测 Python 依赖和 MySQL 连接，并给出可操作错误。
- [ ] 提供开发者一键初始化脚本。
- [ ] 清理旧前端链接、文案和资源边界。
- [ ] 增加桌面启动链路 smoke test。
- [ ] 发布可安装的 Linux alpha 包和 release notes。

## 0.3 AI Integration Alpha

- [ ] 实现 svzdev 牌 id 到 DouZero rank 表示的转换。
- [ ] 实现房间状态到 DouZero `InfoSet` 的转换。
- [ ] 实现 DouZero 动作到具体牌 id 的回映射。
- [ ] 增加固定牌局回放测试。
- [ ] 增加 AI 对局日志，便于比较规则 AI 与 DouZero。

## 0.4 Contributor-Ready Refactor

- [ ] 分离服务端状态机、协议、规则和持久化边界。
- [ ] 为房间、玩家、牌型、计时器、记录写入补充单元测试。
- [ ] 为前端牌桌关键交互补充可复现测试。
- [ ] 明确许可证路径：获得上游授权或替换未授权代码与资产。

## 1.0 Release Candidate

- [ ] 桌面端内置或管理运行时依赖。
- [ ] 提供数据库初始化和迁移生命周期。
- [ ] 具备 Windows、macOS、Linux 发布矩阵。
- [ ] 完成安全检查、发布清单和回滚说明。
- [ ] 完成完整许可证和第三方 notices。
