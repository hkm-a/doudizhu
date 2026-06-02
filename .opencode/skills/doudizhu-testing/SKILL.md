---
name: doudizhu-testing
description: 斗地主后端测试模式 — unittest 发现、smoke test 模式、mock 技巧、覆盖要求。Use when writing or fixing tests in tests/backend/ or scripts/*-smoke.py.
---

# 斗地主测试模式

## 测试类型

### 1. 单元测试 (unittest)

后端测试位于 `tests/backend/`，使用标准库 `unittest`：

```bash
PYTHONPATH=server python3 -m unittest discover -s tests/backend -p test_*.py
```

关键测试文件：
- `test_rule.py` — 牌型识别、比较、出牌策略
- `test_room.py` — 房间状态机（613 行，覆盖完整游戏流程）
- `test_player.py` — 玩家状态管理
- `test_robot_player.py` — 机器人自动行为
- `test_ai_*.py` — AI 策略层各组件

### 2. Smoke Test (脚本)

位于 `scripts/`，作为集成验证：
- `scripts/backend-smoke.py` — 后端基本编译检查
- `scripts/ai-replay-smoke.py` — 规则 AI 固定牌局回放
- `scripts/ai-douzero-replay-smoke.py` — DouZero 回放（需模型）
- `scripts/ai-double-smoke.py` — AI 双人对战
- `scripts/double-room-smoke.py` — 双人房间流程
- `scripts/segment-smoke.py` — 段位系统
- `scripts/player-event-smoke.py` — 玩家事件

### 3. E2E 测试 (Playwright)

位于 `client/e2e/`，通过 Playwright 测试前端。

## 测试模式

### Room 测试 (test_room.py)

使用 `PlayerStub` + `TimerStub` 替代真实玩家和计时器：

```python
class PlayerStub:
    def __init__(self, uid, seat, landlord=0):
        self.uid = uid
        self.seat = seat
        self.hand_pokers = []
        self.messages = []  # 捕获 write_message 调用

    def write_message(self, packet):
        self.messages.append(packet)
```

通过 `Mock` 和 `patch` 模拟依赖：

```python
from unittest.mock import Mock, patch

room = Room(room_id=1, level=3)
room.timer = Mock()  # 替换真实 Timer
```

### Smoke 测试模式

统一结构：setup → act → assert → cleanup。使用 `PYTHONPATH=server` 运行。

## 覆盖原则

- 新逻辑必须配套 smoke test 或单元测试
- `test_room.py` 是状态机变更的主要测试入口
- AI 策略变更通过 `test_ai_replay.py` 的固定牌局验证
