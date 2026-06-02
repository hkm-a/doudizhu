# 融合架构说明

## 来源

- 游戏基础：`svzdev/doudizhu`，Python Tornado 后端、React + Phaser 前端。
- AI 基础：`kwai/DouZero`，Apache-2.0，提供斗地主深度强化学习模型和评测代码。

## 模块边界

```mermaid
flowchart LR
    UI["React + Phaser 客户端"] --> WS["WebSocket /ws"]
    WS --> Room["Room / Player 状态机"]
    Room --> Rule["svzdev rule.py 牌型规则"]
    Room --> Robot["RobotPlayer"]
    Robot --> Policy["server.ai.policy"]
    Policy --> RuleAI["RuleBasedPolicy"]
    Policy --> DouZero["DouZeroPolicy"]
    DouZero --> Model["DouZero checkpoints"]
```

## 为什么先用策略适配层

DouZero 与 svzdev 的牌表示不同：

- svzdev 使用 1..54 的具体牌 id。
- DouZero 使用 rank 级别的环境牌值，如 `3..14, 17, 20, 30`。

二者还需要对齐地主位置、上下家位置、历史出牌、已出牌、底牌等状态。把这些放进 `server/ai/policy.py`，可以避免房间状态机、WebSocket 协议、前端 UI 被 AI 细节污染。

## 当前完成

- 保留 svzdev 原启发式机器人为 `RuleBasedPolicy`。
- 新增 `DouZeroPolicy`，负责检查 `DOUZERO_ENABLED`、`DOUZERO_MODEL_DIR`、模型文件和 Python 依赖。
- 新增 `server.ai.cards`，负责 svz 具体牌 id 与 DouZero rank/action 的双向转换。
- 新增 `server.ai.infoset`，负责把当前房间快照转换为 DouZero `InfoSet` 字段。
- 新增 `server.ai.decision_log`，可通过 `AI_DECISION_LOG_PATH` 输出 JSONL 决策日志。
- 新增 `server.ai.decision_summary` 和 `scripts/ai-decision-summary.py`，用于汇总 AI 决策日志。
- 新增 AI 决策日志 HTML 报告，可视化策略、模式、fallback 原因和关键计数分布。
- 新增 `server.ai.replay` 和 `scripts/ai-replay-smoke.py`，提供固定牌局回放 smoke。
- 新增 `scripts/ai-douzero-replay-smoke.py`，用于有 checkpoint 环境下的严格 DouZero 回放验证。
- 新增 `scripts/backend-preflight.py`，用于检查后端 Python 依赖和 MySQL TCP 可达性。
- `RobotPlayer` 已改为通过策略接口出牌和抢地主。

## 待完成

- 在发布环境中定期运行真实 checkpoint 回放，并把结果纳入 release checklist。
- 桌面端打包时处理 Python 服务、模型文件和前端静态资源的生命周期。
