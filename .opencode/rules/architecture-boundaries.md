---
description: 架构边界约定 — 模块职责分离、AI 隔离、牌型规则独立
---

## 架构边界

- `server/api/game/rule.py` — 牌型规则，不依赖房间/玩家状态
- `server/api/game/room.py` — 房间状态机，不直接调用 AI
- `server/api/game/player.py` — 玩家状态，不包含业务逻辑
- `server/ai/` — AI 策略层，不污染 WebSocket 协议或前端 UI
- AI 策略通过 `AiPolicy` 协议接口注入（见 `policy.py`）
- 新增机器人行为通过 `AiPolicy` 接口实现，不修改 RobotPlayer
