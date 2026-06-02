# Support

## 获取帮助

- 运行或构建问题：优先开 GitHub issue，并选择 bug 模板。
- 功能建议：使用 feature request 模板描述使用场景。
- 安全问题：按 [SECURITY.md](SECURITY.md) 私下报告。

## 提交问题前

请先准备这些信息：

- 操作系统和版本。
- Python、Node、npm、Rust 和 MySQL 版本。
- 运行的命令和完整错误信息。
- 是否使用桌面端、后端静态页面或 React 开发服务器。
- 是否开启 `DOUZERO_ENABLED`。

## 当前已知限制

- 桌面端还没有内置 Python 运行时、依赖安装和 MySQL 初始化流程。
- DouZero 当前已有策略边界、牌面映射、`InfoSet` 适配、动作回映射和固定牌局回放入口；真实 checkpoint 定期验证仍待接入发布环境。
- 上游 `svzdev/doudizhu` 未声明许可证，完整许可状态见 [LICENSE.md](LICENSE.md)。
