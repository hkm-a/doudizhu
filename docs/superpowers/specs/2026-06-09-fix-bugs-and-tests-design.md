---
comet_change: fix-critical-bugs-and-test-gaps
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-09-fix-critical-bugs-and-test-gaps
status: final
---

# Design Doc: Fix Critical Bugs and Test Gaps

## 1. 变更概述

修复 Doudizhu 游戏的 4 个 Critical 问题、11 个 Major 问题和 11 个 Minor 问题。纯修复变更，不引入新功能。

## 2. 技术方案

### 2.1 修复 Timer 不工作 (CRITICAL)

**问题：** `main.gd:1582` 的 `_process_turn_timer` 方法期望被 `_process(delta)` 调用，但 `_process` 方法不存在，导致定时器永远不会执行。

**修复方案：**
```gdscript
# 在 main.gd 中添加 _process 方法
func _process(delta: float) -> void:
    _process_turn_timer(delta)
```

**文件：** `src/main.gd` — 添加约 3 行代码

### 2.2 修复 Landlord 选择逻辑 (CRITICAL)

**问题：** 玩家点击 "Do Not Call" 后，当前逻辑直接选择第一个 AI 为 landlord，而不是继续检查其他 AI。

**修复方案：**
- 检查 `main.gd` 中的 landlord 选择逻辑
- 确保 "Do Not Call" 后遍历所有 AI  seat，只有当所有玩家和 AI 都拒绝时才随机选择 landlord
- 修改后补充单元测试

**文件：** `src/main.gd` + `test/test_landlord_selection.gd`（新建）

### 2.3 清理死代码 (CRITICAL/MAJOR)

**问题：** `C_AIDifficulty` 组件从未被实例化，且 `is_card_likely_remaining()` 方法逻辑有 bug（使用 seat IDs 而非真实 card IDs）。`S_RoundFlow` 是只有 7 行的占位符。

**修复方案：**
- 删除 `src/components/c_ai_difficulty.gd` — 未被使用
- 删除 `src/systems/s_round_flow.gd` — 占位符无实际功能
- 从 `STRUCTURE.md` 中移除相关条目
- 从 `openspec/specs/doudizhu/spec.md` 中更新 ECS 组件列表

**文件：** 删除 2 个文件 + 更新 2 个文档

### 2.4 修复 Localization 不一致 (CRITICAL)

**问题：** `localization_utils.gd:_defaults()` 中的 fallback 字符串与 `en.tres` 文件的字符串有差异。

**修复方案：**
- 同步 `_defaults()` fallback 字典中的 `"message.win"` 等字符串
- 与 `locales/en.tres` 中的实际字符串保持一致

**文件：** `src/utils/localization_utils.gd` — 修改约 3-5 处字符串

### 2.5 补充单元测试 (MAJOR)

**新增测试文件：**

| 测试文件 | 测试内容 |
|----------|----------|
| `test/test_doudizhu_game_core.gd` | `play_selected()`, `pass_turn()`, `resolve_landlord()`, `_shuffle()` |
| `test/test_landlord_selection.gd` | 玩家拒绝后 AI 检查逻辑 |
| `test/test_save_load_utils.gd` | 扩展现有测试，覆盖更多场景 |
| `test/test_localization_utils.gd` | 扩展现有测试，验证 fallback 一致性 |

**修改现有测试文件：**
- `test/test_joker_comparison.gd` — 添加 `class_name` 和 `extends GdUnitTestSuite`
- `test/test_joker_comparison.gd` — 移除 `print()` 调试语句

### 2.6 文档更新 (MINOR)

| 文件 | 修改内容 |
|------|----------|
| `SCENES.md` | 标题从 v0.8.0 改为 v0.9.1 |
| `STYLE.md` | 标题从 v0.8.0 改为 v0.9.1 |
| `ASSETS.md` | 标题从 v0.7.0 改为 v0.9.1 |
| `MEMORY.md` | 移除过时的资产缺失注释 |
| `STRUCTURE.md` | 移除已删除的组件和系统条目 |
| `openspec/specs/doudizhu/spec.md` | 更新 ECS 组件列表 |

## 3. 关键权衡

| 权衡 | 选择 | 理由 |
|------|------|------|
| 是否删除 C_AIDifficulty | 是 | 未使用 + 有 bug = 有害代码 |
| 是否重构 main.gd | 否 | 超出本次范围，单独变更 |
| 测试策略 | TDD | 每个新测试先写 failing test，再写实现 |

## 4. 风险

| 风险 | 影响 | 缓解 |
|------|------|------|
| Timer 修复可能影响动画时序 | 中 | 只在 AI turn 和 player turn 期间启用 timer |
| Landlord 逻辑修改可能影响现有 e2e 测试 | 高 | 运行所有 e2e 测试确认无回归 |
| 删除死代码可能遗漏间接引用 | 低 | grep 搜索确认无引用 |

## 5. Spec Patches

以下是对 `openspec/specs/doudizhu/spec.md` 的 delta spec 补丁：

### ECS 组件更新
- **REMOVED:** `C_AIDifficulty` 组件 — 从未被实例化，已从代码库删除
- **REMOVED:** `S_RoundFlow` 系统 — 占位符无实际功能，已删除
