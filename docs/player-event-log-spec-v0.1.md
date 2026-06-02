# 斗地主玩家行为日志规格书 v0.1

> 玩家做了什么 / 卡在哪 / 为什么回来。
> 跟 AI 决策日志结构对称、同一时间轴、配套 replay。
> 所有阈值标 `[待测试]`。

## 版本

| 版本 | 日期 | 摘要 |
|------|------|------|
| v0.1 | 2026-06-02 | 首版。基于 gdd-v0.1.md + onboarding-flow-gdd-v0.1.md。 |

## 目的

回答三个核心问题：

1. **玩家做了什么？** —— 决策时间 / 决策路径 / 操作错误 / 托管触发
2. **玩家卡在哪？** —— 决策延迟 / 牌型选错 / 超时 / 弃坑
3. **玩家为什么回来？** —— 间隔 / 桌数 / 对局类型 / 关键事件

## 设计原则

1. **跟 AI 决策日志结构对称**（同 `decision_log` 模块写入）
2. **同一时间轴**（同一 room 同一 timestamp，便于玩家/AI 一一对照）
3. **前端埋点 + 后端校验**（前端记录"玩家点了什么"，后端记录"服务器认为玩家做了什么"）
4. **可重放**（日志 → replay smoke 还原整局）
5. **隐私优先**（不记录玩家姓名/IP/设备 ID，只记录 player_id + session_id）

---

## 字段定义

```python
@dataclass(frozen=True)
class PlayerEvent:
    timestamp_ms: int          # 毫秒时间戳，与 AI 决策日志对齐
    player_id: int             # 玩家 uid（已有）
    room_id: int               # 房间 id（已有）
    session_id: str            # 一次完整对局 = 一次 session，UUID
    event_type: str            # 见下方"事件类型清单"
    payload: dict              # 事件相关数据
    duration_ms: Optional[int] # 玩家从看到轮到自己的时刻 → 决策完毕 的耗时
    result: str                # 'success' | 'fail' | 'timeout' | 'cancel'
    reason: Optional[str]      # 错误/取消原因
```

## 事件类型清单

### E1. 决策类（前端的"玩家按了什么"）

| event_type | payload | result 含义 | reason 含义 |
|------------|---------|-------------|-------------|
| `rob_decision` | `{rob: int}` 0-3 | success/fail | invalid_score / timeout |
| `shot_decision` | `{pokers: [int], type: str}` | success/fail | invalid_type / invalid_target / timeout |
| `pass_decision` | `{}` | success/fail | not_allowed_first_move / timeout |
| `double_decision` | `{multiple: int}` | success/fail | [v0.2 实施] |
| `trustee_toggle` | `{enabled: bool}` | success | manual_toggle / auto_triggered |

### E2. 操作类（玩家和 UI 互动）

| event_type | payload | result 含义 | reason 含义 |
|------------|---------|-------------|-------------|
| `card_select` | `{card_ids: [int]}` | success | invalid_card |
| `card_deselect` | `{card_ids: [int]}` | success | — |
| `hint_request` | `{context: 'follow' \| 'first'}` | success/fail | no_legal_move |
| `sort_request` | `{by: 'rank' \| 'suit'}` | success | — |
| `settings_change` | `{key: str, value: any}` | success | — |

### E3. 错误类（玩家做错事 / 系统拒绝）

| event_type | payload | result 含义 | reason 含义 |
|------------|---------|-------------|-------------|
| `server_reject` | `{action: str, server_msg: str}` | fail | invalid_type / timeout / not_your_turn |
| `disconnect` | `{duration_ms: int}` | timeout | network_lost / app_closed |
| `reconnect` | `{duration_ms: int}` | success | — |

### E4. 会话类（一次完整对局 = 一次 session）

| event_type | payload | result 含义 | reason 含义 |
|------------|---------|-------------|-------------|
| `session_start` | `{room_config: dict}` | success | — |
| `session_end` | `{winner: 'landlord' \| 'farmers', role: 'landlord' \| 'farmer_up' \| 'farmer_down', score_delta: int, duration_ms: int, hand_count: int}` | success | abandoned / network / normal |
| `session_abandon` | `{at_hand: int, duration_ms: int}` | cancel | self_quit / app_closed |
| `ready_request` | `{ready: bool}` | success | — |

### E5. 留存类（玩家为什么回来）

| event_type | payload | result 含义 | reason 含义 |
|------------|---------|------------|-------------|
| `app_open` | `{source: 'desktop' \| 'web' \| 'shortcut'}` | success | — |
| `app_close` | `{session_duration_ms: int}` | success | normal / crash |
| `room_create` | `{config: dict}` | success | — |
| `room_join` | `{room_id: int, players: int}` | success | — |
| `room_leave` | `{at_hand: int}` | cancel | self / kicked |

---

## 跟 AI 决策日志的对应

| 玩家事件 | 对应 AI 决策事件 | 同一时间轴 |
|----------|------------------|------------|
| `rob_decision` | `decision_event('rule'\|'douzero', 'rob', ...)` | 同一 timestamp |
| `shot_decision` | `decision_event('rule'\|'douzero', 'shot', ...)` | 同一 timestamp |
| `pass_decision` | `decision_event(..., decision=[])` | 同一 timestamp |
| `session_end` | 最后一次 shot 事件 | 同一 session_id |

**关键洞察**：玩家"按了什么"和 AI "决定什么"在**同一回合**内会先后发生两次（玩家先、AI 后，或 AI 先、玩家后）。**日志要能区分"哪个是玩家决策、哪个是 AI 决策"**：
- 玩家事件用 `player_id` 标识
- AI 决策事件用 `player_id` + `policy` 字段（rule / douzero）
- 同一 `room_id + timestamp` 可以 join 玩家事件和 AI 事件

---

## 跟 replay 的对应

`server/ai/replay.py` 已实装固定牌局回放。**v0.1 行为日志 + 现有 replay 联动**：

1. **录播模式**（replay）：固定牌局 + AI 决策 → 已有
2. **回放玩家决策**（player_replay）：固定牌局 + 玩家决策 → **新工作**
3. **A/B 测试**（ab_test）：同一牌局，规则 AI vs DouZero → 已有日志基础
4. **玩家"教学"**（tutorial）：用历史玩家决策作为 AI 默认 → **未来工作**

**player_replay 实施路径**：
- 输入：session_id
- 输出：玩家决策时间轴 + AI 决策时间轴 + 关键事件标注
- 用途：新局后的"上一局回放"，让玩家"我刚才 X 一下可能赢"（支柱 5 落地）

---

## 阈值与告警（[待测试] 全部）

| 阈值 | 当前假设 | 用途 | 触发 |
|------|----------|------|------|
| 决策延迟告警 | > 30 秒 | 卡壳 | 单个决策 |
| 决策延迟告警 | > 60 秒 | 弃坑风险 | 单个决策 |
| 错误率告警 | > 30% | 不会玩 | 单局 |
| 超时率告警 | > 20% | UI 没看懂 | 单局 |
| 托管触发率 | > 50% | 玩家掉线或弃坑 | 单局 |
| 弃坑率（session_abandon）| > 30% | 留存危机 | 周维度 |
| 日活连续下降 | > 20% | 留存危机 | 周维度 |
| 首局时长 | < 60 秒 | 引导失败 | 单局 |
| 首局时长 | > 10 分钟 | 引导失败（卡住）| 单局 |

---

## 隐私与性能

- **隐私**：
  - 不记录玩家姓名 / IP / 设备 ID
  - 玩家 ID 用 uid 数字标识（已有）
  - 日志保留期 [待测试]（建议 90 天，超过后归档或删除）
- **性能**：
  - 决策类事件频率 < 1 Hz（无性能压力）
  - 错误类事件频率 < 0.1 Hz
  - 会话类事件频率 < 0.001 Hz
  - **总写入量**：每局约 30-50 个事件（17 次出牌 + 抢地主 + 结算 + 操作）→ 一局 ~5KB JSONL
  - 1000 局/天 = 5MB/天 = 1.5GB/年 → **可接受**

---

## 实施路径

### v0.1 必做（与本文档同步）

- [ ] 创建 `server/api/player_event.py` 模块
- [ ] 字段定义 dataclass（参考 AI 决策日志）
- [ ] 事件类型 5 类 20 个事件
- [ ] `PLAYER_EVENT_LOG_PATH` 环境变量（跟 `AI_DECISION_LOG_PATH` 对齐）
- [ ] JSONL 输出格式
- [ ] 跟 `decision_log` 共享 `session_id` 字段
- [ ] `scripts/player-event-summary.py`（跟 `scripts/ai-decision-summary.py` 对齐）
- [ ] `npm run player:summary` 命令
- [ ] `npm run player:report` HTML 报告

### v0.2 必做

- [ ] replay 联动（player_replay 模式）
- [ ] 阈值告警（v0.1 标记的 9 个阈值）
- [ ] 留存分析（app_open / app_close / room_create 维度）
- [ ] 与 decision_log 的 SQL/JSON join 工具

### v0.3 可选

- [ ] 玩家"教学"（用历史玩家决策作为 AI 默认）
- [ ] 段位 / 积分 / 赛季 数据建模
- [ ] A/B 测试框架

---

## 推进顺序

1. ✅ 设计支柱 v0.1
2. ✅ GDD v0.1
3. ✅ 体验链诊断 v0.1
4. ✅ 新手引导 GDD v0.1
5. ✅ 玩家行为日志规格书 v0.1（本文档）
6. ⏳ GDD v0.2 —— 补 D 牌型规则 / E 计分 / F AI 行为契约 + 加倍 / 长期循环 / 9 个缺失音效 / 行为日志实施

## 变更日志

- **v0.1 (2026-06-02)**: 首版。5 类 20 个事件 + 跟 AI 决策日志对称 + 跟 replay 联动 + 9 个 [待测试] 阈值 + 实施路径 v0.1/v0.2/v0.3。
