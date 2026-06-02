# 斗地主桌面端融合工程

[![CI](https://github.com/hkm-a/doudizhu/actions/workflows/ci.yml/badge.svg)](https://github.com/hkm-a/doudizhu/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-desktop%20prototype-blue)](https://github.com/hkm-a/doudizhu)
[![AI](https://img.shields.io/badge/AI-DouZero%20adapter%20alpha-0f766e)](docs/architecture.md)

一个面向桌面端发布的斗地主融合工程：以 [svzdev/doudizhu](https://github.com/svzdev/doudizhu) 为游戏基础，接入 [kwai/DouZero](https://github.com/kwai/DouZero) 的 AI 策略边界，并用 Tauri 打包成本地应用。目标不是只做一个能跑的 fork，而是逐步打磨成可复现、可贡献、可发布的开源桌面斗地主项目。

## 为什么值得关注

- 桌面优先：第一版以 Tauri 桌面端为发布形态，不再维护旧项目外壳。
- AI 可替换：机器人逻辑已抽成策略边界，规则 AI 稳定 fallback，DouZero 适配按模块推进。
- 可验证：CI 覆盖后端编译和烟测、前端构建、桌面 Rust 测试。
- 可贡献：社区文件、issue 模板、路线图和许可状态说明已纳入仓库。

## 项目状态

| 方向 | 状态 |
| --- | --- |
| WebSocket 斗地主基础流程 | 可运行，已纳入后端烟测 |
| 桌面端封装 | Tauri 2 原型，可自动尝试拉起本机后端 |
| 规则机器人 | 默认启用，作为稳定 fallback |
| DouZero AI | 依赖、模型目录校验、牌面映射和 `InfoSet` 适配已接入 |
| 一键安装体验 | 待完善，当前仍依赖本机 MySQL 和 Python 依赖 |

更细的工程路线见 [docs/roadmap.md](docs/roadmap.md)。

## 当前基础

- 后端：Python + Tornado + MySQL
- 前端：React 17 + Phaser
- 桌面端：Tauri 2 + Rust
- 实时通信：WebSocket `/ws`
- 健康检查：HTTP `/healthz`
- 游戏逻辑：房间、准备、发牌、抢地主、出牌、结算
- 机器人：默认使用 svzdev 原启发式策略，已预留 DouZero 策略适配层

## AI 融合策略

机器人入口在 `server/api/game/components/simple.py`，现在通过 `server/ai/policy.py` 统一选择策略：

- `RuleBasedPolicy`：保留原项目的规则启发式，作为稳定 fallback。
- `DouZeroPolicy`：负责 DouZero 依赖、模型目录、牌局 `InfoSet` 编码和模型动作回映射。

开启 DouZero 需要安装依赖并配置模型目录：

```bash
export DOUZERO_ENABLED=1
export DOUZERO_MODEL_DIR=/absolute/path/to/douzero/baselines/douzero_ADP
```

模型目录应包含：

- `landlord.ckpt`
- `landlord_up.ckpt`
- `landlord_down.ckpt`

当前 `DouZeroPolicy` 会验证依赖和模型文件，构建 DouZero 风格的 `InfoSet`，生成合法动作并把 rank 动作映射回具体手牌；模型推理、合法动作生成或动作回映射失败时会自动回退到规则 AI，保证游戏仍可运行。

需要比较规则 AI 与 DouZero 行为时，可以开启 JSONL 决策日志：

```bash
export AI_DECISION_LOG_PATH=logs/ai-decisions.jsonl
```

日志默认关闭；开启后会记录机器人抢地主/出牌策略、手牌、房间状态、最终决策、DouZero rank 动作和 fallback 原因，便于复盘和构建固定牌局回放。

汇总日志：

```bash
npm run ai:summary -- logs/ai-decisions.jsonl
PYTHONPATH=server python3 scripts/ai-decision-summary.py logs/ai-decisions.jsonl --text
```

生成可打开的 HTML 决策报告：

```bash
npm run ai:report -- logs/ai-decisions.jsonl --output reports/ai-decisions.html
PYTHONPATH=server python3 scripts/ai-decision-summary.py logs/ai-decisions.jsonl --html --output reports/ai-decisions.html
```

HTML 报告会展示记录数、异常行、回退次数、不出次数、平均出牌张数，以及策略、模式和 fallback 原因分布，可作为本地调试或发布前 AI 行为复盘附件。

固定牌局回放 smoke 可以验证策略输出、服务端牌型规则和出牌状态推进是否闭环：

```bash
PYTHONPATH=server python3 scripts/ai-replay-smoke.py
```

如果已经安装 DouZero 依赖并配置好 checkpoint，可以运行严格的 DouZero 固定牌局回放。未配置模型时默认输出 `skipped` 并退出 0；在 CI 或发布前需要强制验证时加 `--require`：

```bash
DOUZERO_ENABLED=1 DOUZERO_MODEL_DIR=/absolute/path/to/douzero/baselines/douzero_ADP \
  PYTHONPATH=server python3 scripts/ai-douzero-replay-smoke.py --require
```

## 快速体验

```bash
git clone https://github.com/hkm-a/doudizhu.git
cd doudizhu
npm run dev:setup
npm run dev:doctor
npm run dev:db
npm run dev:server
```

然后打开：

```text
http://127.0.0.1:8081
```

## 本地开发

准备数据库：

```bash
npm run dev:db
```

准备本地配置：

```bash
npm run dev:setup
```

`dev:setup` 会创建 `.env`、安装根目录和前端 npm 依赖、创建 `.venv` 并安装 `requirements.txt`。它是幂等的，已有内容会跳过；只想查看会做什么可以运行：

```bash
node scripts/setup-dev.mjs --dry-run
node scripts/setup-dev.mjs --skip-install
```

默认配置使用 `ddz` / `ddz` 连接本机 MySQL，并监听 `8081` 端口。需要改数据库、端口、DouZero 模型目录或 WeChat 参数时，编辑 `.env` 即可。

如果本地启动不顺，先运行诊断：

```bash
npm run dev:doctor
```

诊断会检查 Node/npm、Python、前后端依赖、`.env`、后端 Python 包和 MySQL TCP 可达性。也可以只跑后端预检：

```bash
python3 scripts/backend-preflight.py
python3 scripts/backend-preflight.py --skip-network --json
```

如果不使用 Docker，可以手动创建 MySQL 数据库和用户后导入 schema：

```bash
mysql --user=root -p < schema.sql
```

手动安装后端依赖：

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

如果要启用 DouZero，再安装 AI 依赖：

```bash
pip install -r requirements-ai.txt
```

启动后端：

```bash
npm run dev:server
```

管理员可以查看或切换机器人补位开关。接口需要管理员登录态，当前本地默认以 `uid=1` 作为管理员：

```bash
curl http://127.0.0.1:8081/admin
curl -X POST http://127.0.0.1:8081/admin \
  -H 'Content-Type: application/json' \
  -d '{"allow_robot": false}'
```

前端开发：

```bash
npm --prefix client install
npm run dev:web
```

也可以先使用后端静态页面访问：

```text
http://127.0.0.1:8081
```

## 桌面端

当前 Tauri 桌面端会先显示内置启动页，再进入 `http://127.0.0.1:8081/`。启动时如果该端口没有服务，桌面端会先展示 Python 后端依赖和 MySQL TCP 预检结果，再尝试使用系统 `python3` 自动拉起 `server/app.py`；如果端口已有服务，则直接复用现有后端。后端启动失败时，启动页会保留错误信息和重试按钮，方便在启动 MySQL、安装 Python 依赖或释放端口后直接重试。

仍需提前准备：

- MySQL 运行在 `127.0.0.1:3306`
- 数据库 `ddz` 已按 `schema.sql` 初始化
- 数据库用户 `ddz` / `ddz` 可连接
- 系统 Python 已安装 `requirements.txt` 中的依赖

安装桌面依赖：

```bash
npm install
```

手动启动后端：

```bash
npm run desktop:server
```

开发运行桌面端：

```bash
npm run tauri:dev
```

桌面端启动参数可用环境变量覆盖：

```bash
DOUDIZHU_BACKEND_PORT=8082 npm run tauri:dev
DOUDIZHU_BACKEND_URL=http://127.0.0.1:8082/ npm run tauri:dev
DOUDIZHU_DATABASE_URI=mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz npm run tauri:dev
```

可用变量包括：

- `DOUDIZHU_BACKEND_PORT`：自动拉起后端时写入 `PORT`，默认 `8081`。
- `DOUDIZHU_BACKEND_URL`：桌面端进入游戏时打开的地址，默认按端口生成；如果地址里包含端口，桌面端会自动用于健康检查和后端启动端口。
- `DOUDIZHU_BACKEND_HOST`：健康检查连接地址，默认从 `DOUDIZHU_BACKEND_URL` 推导，或使用 `127.0.0.1:<port>`。
- `DOUDIZHU_BACKEND_HEALTH_PATH`：健康检查路径，默认 `/healthz`。
- `DOUDIZHU_DATABASE_URI`：自动拉起后端时写入 `DATABASE_URI`。

构建 Ubuntu/Debian 安装包：

```bash
npm run tauri:build
```

构建产物位置：

```text
src-tauri/target/release/bundle/deb/doudizhu_0.1.0_amd64.deb
```

构建后的安装包会包含 `server/`、`requirements.txt` 和 `schema.sql` 作为资源文件。后续还需要继续把 Python 运行时、依赖安装和数据库初始化做成完整的桌面端生命周期。

Linux alpha 打包也可以通过 GitHub Actions 手动 workflow `Linux Alpha Package` 生成 artifact；发布说明草案见 [docs/releases/v0.2.0-alpha.md](docs/releases/v0.2.0-alpha.md)。

## 质量门禁

提交前可以运行统一验证命令：

```bash
npm run verify
```

它会依次执行后端编译、后端 smoke、后端单元测试、前端测试、前端构建、桌面 Rust 测试、本地开发配置检查、公开发布元数据检查和 Git 空白检查。也可以按模块运行：

```bash
npm run verify:backend
npm run verify:web
npm run verify:desktop
npm run verify:config
npm run verify:release
npm run verify:format
```

桌面启动页和预检资源链路也可以单独 smoke：

```bash
npm run desktop:smoke
```

构建 Linux `.deb` 后可以验证安装包是否包含桌面二进制、后端资源、预检脚本和 AI 适配模块：

```bash
npm run desktop:artifact-smoke
npm run desktop:artifact-manifest
npm run desktop:release-bundle
npm run desktop:release-check
```

## 后续路线

1. 在发布环境中接入真实 checkpoint，定期运行严格 DouZero 固定牌局回放。
2. 基于 AI 决策日志补充可视化，方便比较启发式 AI 与 DouZero 出牌。
3. 整理前端资源和 Phaser 牌桌体验。
4. 完善桌面端封装：打包 Python 运行时、依赖安装和数据库初始化流程。

## 贡献与安全

- 贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。
- 支持入口见 [SUPPORT.md](SUPPORT.md)。

## 许可状态

当前仓库包含来自 `svzdev/doudizhu` 的代码基础；截至本次核验，上游仓库未声明许可证。`kwai/DouZero` 使用 Apache-2.0。完整说明见 [LICENSE.md](LICENSE.md) 和 [NOTICE.md](NOTICE.md)。在许可状态澄清或替换相关代码前，请不要假设整个仓库已按某个开源许可证重新授权。
