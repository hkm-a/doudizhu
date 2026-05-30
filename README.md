# 斗地主桌面端融合工程

这个仓库以 [svzdev/doudizhu](https://github.com/svzdev/doudizhu) 为游戏基础，后续接入 [kwai/DouZero](https://github.com/kwai/DouZero) 作为强 AI。当前发布形态使用 Tauri 封装桌面端，桌面应用会加载并尝试自动拉起本机 Tornado 服务。

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

## 本地开发

准备数据库：

```bash
mysql --user=root -p < schema.sql
```

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
PYTHONPATH=. DATABASE_URI=mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz PORT=8081 python3 app.py
```

前端开发：

```bash
cd client
npm install
npm start
```

也可以先使用后端静态页面访问：

```text
http://127.0.0.1:8080
```

## 桌面端

当前 Tauri 桌面端会先显示内置启动页，再进入 `http://127.0.0.1:8081/`。启动时如果该端口没有服务，桌面端会尝试使用系统 `python3` 自动拉起 `server/app.py`；如果端口已有服务，则直接复用现有后端。后端启动失败时，启动页会保留错误信息，方便定位 MySQL、Python 依赖或端口占用问题。

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
