# 设计: Airplane with wings / Four-with-two

## 架构决策

### 新增分类

在 `CardRules.classify(cards)` 中新增：

1. **airplane_with_wings** — 结构：[triplet, triplet, ...] + 附带牌
   - 最少 2 个连续 triplets
   - 每个 triplet 附 1 张单牌或 1 对
   - 附带牌数量 = triplet 数量 * 1（单牌）或 triplet 数量 * 2（对）

2. **four_with_two** — 结构：[quadruplet] + 附带牌
   - 4 张相同牌
   - 附带 2 张单牌或 1 对

### 比较规则

- airplane with wings 内部比较：按最高 triplet 的 rank
- four_with_two 内部比较：按 quadruplet 的 rank
- airplane with wings 只能被更高级别的 airplane with wings 或 bomb/joker bomb 击败
- four_with_two 只能被更高级别的 four_with_two、更高级别 airplane with wings 或 bomb/joker bomb 击败

## 数据流

```
CardRules.classify(cards)
  → 检查是否符合 airplane_with_wings 结构
  → 检查是否符合 four_with_two 结构
  → 返回组合类型 + 关键 rank + 附带信息

CardRules.can_beat(play, trick)
  → 检查类型是否兼容
  → 比较关键 rank
```

## 实现步骤

1. 扩展 `CardRules.classify` 识别新组合
2. 扩展 `CardRules.can_beat` 支持新组合比较
3. 扩展 `DoudizhuGame.hint()` 返回新组合候选
4. 扩展 AI 决策支持新组合
5. 添加 unit tests
6. 添加 e2e 测试
