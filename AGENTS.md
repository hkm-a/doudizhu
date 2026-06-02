# 斗地主桌面端融合工程 — 项目指南

## 项目简介
斗地主桌面端融合工程，整合 svzdev/doudizhu（游戏引擎）和 kwai/DouZero（AI 策略），通过 Tauri 2 打包为桌面应用。

## 快速命令

| 命令 | 说明 |
|------|------|
| `npm run dev:setup` | 一键初始化开发环境 |
| `npm run dev:doctor` | 环境诊断 |
| `npm run dev:db` | 启动 MySQL (Docker) |
| `npm run dev:server` | 启动 Python 后端 |
| `npm run dev:web` | 启动 React 前端 |
| `npm run tauri dev` | 启动桌面应用 |
| `npm run verify` | 完整验证流水线 |

## 目录结构

```
├── client/          # React + Phaser 前端
├── server/          # Python Tornado 后端
│   ├── api/game/    # 游戏核心（房间、玩家、牌型、WebSocket）
│   ├── ai/          # AI 策略层（DouZero + RuleBased）
│   ├── models/      # SQLAlchemy 模型
│   └── alembic/     # 数据库迁移
├── src-tauri/       # Tauri 2 Rust 桌面壳
├── scripts/         # DevOps 工具脚本
├── docs/            # 设计文档和路线图
└── tests/backend/   # Python 后端测试
```

## 开发约定

### Python 后端
- PYTHONPATH 必须包含 `server` 目录
- 使用类型注解，异步优先
- 游戏核心逻辑（牌型、房间、玩家）保持独立，不依赖 AI

### 前端
- Phaser Canvas 处理牌桌渲染
- React 处理 UI 交互（登录、菜单等）
- WebSocket 用于实时通信

### 桌面壳
- Tauri 自动管理 Python 后端进程生命周期
- 启动时运行预检（Python 依赖 + MySQL）

## 验证
- `npm run verify` 执行所有检查
- CI 包含：后端编译/测试、前端构建、Rust 测试
- 新增逻辑应补充对应的 smoke test 或单元测试
