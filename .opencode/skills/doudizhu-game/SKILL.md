---
name: doudizhu-game
description: 斗地主牌型规则、状态机模式、AI 策略适配。Use when working with server/api/game/ or server/ai/ — card rules, room/player state machines, AI policy.
---

# 斗地主游戏逻辑模式

## 牌 ID 映射

svzdev 使用 1-54 的牌 ID：
- 花色：♠(0-12) ♥(13-25) ♣(26-38) ♦(39-51)
- 点数值：`A=0, 2=1, 3=2, 4=3, 5=4, 6=5, 7=6, 8=7, 9=8, 0=9, J=10, Q=11, K=12`
- 小王 = 53，大王 = 54

排序字符映射：`34567890JQKA2wW`

## 牌型规则

定义在 `server/static/rule.json` 中，通过 `Rule` 类加载。牌型包括：
- `rocket` — 王炸（小王+大王）
- `bomb` — 炸弹
- `single/pair/trio` — 单张/对子/三张
- `trio_single/trio_pair` — 三带一/三带二
- `seq_single5~12` — 单顺（5-12 张）
- `seq_pair3~10` — 双顺
- `seq_trio2~6` — 三顺（飞机不带）
- `seq_trio_pair2~4` / `seq_trio_single2~5` — 飞机带对/带单
- `bomb_single/bomb_pair` — 四带一/四带二

## 状态机

- `server/api/game/room.py` — 房间状态机：等待→发牌→抢地主→加倍→出牌→结束
- `server/api/game/player.py` — 玩家状态管理

## AI 策略适配

`server/ai/policy.py` 定义了 `AiPolicy` 协议：

```python
class AiPolicy:
    def choose_rob(self, player) -> int: ...
    def choose_shot(self, player, room) -> List[int]: ...
    def choose_double(self, player, room, personality) -> int: ...
```

两个实现：
- `RuleBasedPolicy` — 基于规则启发式（无依赖）
- `DouZeroPolicy` — 基于 DouZero 深度学习模型

DouZero 与 svzdev 的牌值转换在 `server/ai/cards.py` 中：
- `svz_to_douzero(pokers: List[int]) -> List[int]` — 转换到 DouZero 环境牌值
- `douzero_to_svz(actions: List[int], hand: List[int]) -> List[int]` — 动作回映射到 svz ID

## 修改原则

1. 牌型规则放 `rule.py`，不污染状态机
2. AI 细节放 `server/ai/`，不污染房间状态机和前端协议
3. 新增机器人行为通过 `AiPolicy` 接口实现
