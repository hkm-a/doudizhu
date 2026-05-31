# 斗地主桌面端融合工程

[![CI](https://github.com/hkm-a/doudizhu/actions/workflows/ci.yml/badge.svg)](https://github.com/hkm-a/doudizhu/actions/workflows/ci.yml)
[![Status](https://img.shields.io/badge/status-desktop%20prototype-blue)](https://github.com/hkm-a/doudizhu)
[![AI](https://img.shields.io/badge/AI-DouZero%20adapter%20planned-0f766e)](docs/architecture.md)

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
| DouZero AI | 依赖和模型目录校验已接入，牌局 `InfoSet` 适配待完成 |
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
- `DouZeroPolicy`：负责 DouZero 依赖、模型目录和后续牌局状态编码。

开启 DouZero 需要安装依赖并配置模型目录：

```bash
export DOUZERO_ENABLED=1
export DOUZERO_MODEL_DIR=/absolute/path/to/douzero/baselines/douzero_ADP
```

模型目录应包含：

- `landlord.ckpt`
- `landlord_up.ckpt`
- `landlord_down.ckpt`

当前 `DouZeroPolicy` 会验证依赖和模型文件；牌局 `InfoSet` 编码适配尚未完成时会自动回退到规则 AI，保证游戏仍可运行。

## 快速体验

```bash
git clone https://github.com/hkm-a/doudizhu.git
cd doudizhu
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
mysql --user=root -p < schema.sql
cd server
PYTHONPATH=. python3 app.py
```

然后打开：

```text
http://127.0.0.1:8081
```

## 本地开发

准备数据库：

```bash
mysql --user=root -p < schema.sql
```

准备本地配置：

```bash
cp .env.example .env
```

默认配置使用 `ddz` / `ddz` 连接本机 MySQL，并监听 `8081` 端口。需要改数据库、端口、DouZero 模型目录或 WeChat 参数时，编辑 `.env` 即可。

安装后端依赖：

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
cd server
PYTHONPATH=. python3 app.py
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
cd client
npm install
npm start
```

也可以先使用后端静态页面访问：

```text
http://127.0.0.1:8081
```

## 桌面端

当前 Tauri 桌面端会先显示内置启动页，再进入 `http://127.0.0.1:8081/`。启动时如果该端口没有服务，桌面端会尝试使用系统 `python3` 自动拉起 `server/app.py`；如果端口已有服务，则直接复用现有后端。后端启动失败时，启动页会保留错误信息和重试按钮，方便在启动 MySQL、安装 Python 依赖或释放端口后直接重试。

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

## 后续路线

1. 完成 DouZero `InfoSet` 适配，把服务端房间状态转换为 DouZero 可推理状态。
2. 加入 AI 对局日志和回放，方便比较启发式 AI 与 DouZero 出牌。
3. 整理前端资源和 Phaser 牌桌体验。
4. 完善桌面端封装：打包 Python 运行时、依赖安装和数据库初始化流程。

## 贡献与安全

- 贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)。
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。
- 支持入口见 [SUPPORT.md](SUPPORT.md)。

## 许可状态

当前仓库包含来自 `svzdev/doudizhu` 的代码基础；截至本次核验，上游仓库未声明许可证。`kwai/DouZero` 使用 Apache-2.0。完整说明见 [LICENSE.md](LICENSE.md) 和 [NOTICE.md](NOTICE.md)。在许可状态澄清或替换相关代码前，请不要假设整个仓库已按某个开源许可证重新授权。
