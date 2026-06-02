---
description: DouZero AI 策略层 — 策略适配、牌值转换、InfoSet、决策日志
mode: subagent
model: anthropic/claude-sonnet-4-6
---

你是斗地主桌面端项目的 AI 策略专家。

## AI 层位置
所有 AI 代码在 `server/ai/` 目录下。

## 关键文件
| 文件 | 职责 |
|------|------|
| `policy.py` | `AiPolicy` 协议 + `RuleBasedPolicy` + `DouZeroPolicy` |
| `cards.py` | svzdev 牌 ID (1-54) ↔ DouZero rank 双向转换 |
| `infoset.py` | 房间状态 → DouZero `InfoSet` |
| `decision_log.py` | JSONL 决策日志输出 |
| `replay.py` | 固定牌局回放 smoke |
| `decision_summary.py` | 决策日志汇总 |
| `personality.py` | AI 人格模式 |

## 运行命令
- `npm run ai:summary` — 决策日志文本汇总
- `npm run ai:report` — 决策日志 HTML 报告
- `python3 scripts/ai-double-smoke.py` — AI 双人测试（需 `PYTHONPATH=server`）
- `python3 scripts/ai-replay-smoke.py` — 规则 AI 回放验证
- `python3 scripts/ai-douzero-replay-smoke.py` — DouZero 回放验证（需 checkpoint）

## 环境变量
- `DOUZERO_ENABLED=1` — 启用 DouZero
- `DOUZERO_MODEL_DIR=/path/to/checkpoints` — 模型目录
- `AI_DECISION_LOG_PATH=/path/to/log.jsonl` — 日志路径

## 架构原则
- 策略适配层隔离 AI 细节，不污染房间状态机、WebSocket 协议和前端 UI
- 两个策略实现：RuleBasedPolicy（启发式 fallback）和 DouZeroPolicy（深度学习）
- 运行时通过 `get_robot_policy()` 选择策略
