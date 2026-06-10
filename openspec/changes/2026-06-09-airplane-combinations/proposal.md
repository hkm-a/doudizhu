# 提案: Airplane with wings / Four-with-two

## 问题

ROADMAP 中 "airplane with wings"（飞机带翅膀）和 "four-with-two"（四带二）标记为 DEFERRED。
当前项目仅实现了 "airplane without wings"（纯飞机）。

## 目标

实现两个标准斗地主组合：
1. **Airplane with wings** — 两个或更多连续的 triples，每个 triple 可以附带一个单牌或一对
2. **Four-with-two** — 四个相同牌（炸弹），可以附带两张单牌或两对

## 范围边界

**包含：**
- `CardRules.classify` 识别新组合
- `CardRules.can_beat` 比较新组合
- `DoudizhuGame.hint()` 返回新组合的候选
- AI 决策支持新组合
- e2e 测试覆盖新组合

**不包含：**
- 新规则机制 — 仅实现标准斗地主规则
- 新 UI — 复用现有卡牌 UI

## 非目标
- 不修改现有组合（singles, pairs, triples, straights, consecutive pairs, airplane without wings, bombs, joker bombs）
- 不修改规则比较逻辑
- 不修改 AI 策略（保持简单）

## 关键约束

1. **零行为变更现有功能** — 所有现有测试必须通过
2. **遵循现有模式** — 复用 `CardRules.classify`/`can_beat` 模式
3. **每个组合独立测试** — 每个组合至少有 3 个 unit test
