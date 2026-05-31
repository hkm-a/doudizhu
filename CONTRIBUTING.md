# Contributing

感谢你愿意参与这个斗地主桌面端融合工程。这个仓库的目标是把 `svzdev/doudizhu` 的可玩基础、DouZero AI 能力和 Tauri 桌面发布体验融合成一个稳定、可贡献、可长期演进的项目。

## 当前优先级

1. 桌面端一键运行：减少对手动 MySQL、Python 环境和端口配置的依赖。
2. DouZero 适配：完成 svzdev 牌局状态到 DouZero `InfoSet` 的转换，以及 DouZero 动作到具体牌 id 的回映射。
3. 可验证质量：补充后端状态机、AI 策略、前端牌桌交互和桌面启动链路测试。
4. 开源清晰度：持续澄清许可证、来源、贡献边界和发布说明。

## 本地开发

后端：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
npm run verify:backend
```

前端：

```bash
cd client
npm install
cd ..
npm run verify:web
```

桌面端：

```bash
npm install
npm run verify:desktop
npm run tauri:dev
```

## 提交前检查

请尽量在提交前运行：

```bash
npm run verify
```

如果某项因为本机环境缺失无法运行，请在 PR 中说明。

## Pull Request 要求

- 用清楚的标题说明用户可见变化或维护收益。
- 关联相关 issue，或在描述里说明动机。
- 写明你运行过的验证命令。
- 避免把 `node_modules/`、`src-tauri/target/`、`.venv/`、日志、数据库文件或模型权重提交进仓库。
- 涉及 AI 策略、房间状态机、数据库 schema 或桌面启动链路的改动，需要补充或更新测试。

## 许可证注意

当前仓库包含未声明许可证的上游游戏基础代码。贡献前请阅读 [LICENSE.md](LICENSE.md) 和 [NOTICE.md](NOTICE.md)。除非后续完成许可澄清或代码替换，不要在 PR 中假设整个仓库可以按某个开源许可证二次授权。
