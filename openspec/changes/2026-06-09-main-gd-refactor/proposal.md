# 提案: main.gd 重构

## 问题

`src/main.gd` 当前 1776 行，违反单一职责原则。包含：
- UI 构建 (~400 行)
- 响应式布局 (~250 行)
- 状态刷新 (~250 行)
- 按钮回调 (~200 行)
- 键盘快捷键 (~100 行)
- 调试/模拟方法 (~400 行)
- 动画辅助 (~50 行)

所有方法共享私有成员变量 (`layout_scale`, `hand_area`, `status_label` 等)，任何拆分需要传递大量参数。

## 目标

将 `main.gd` 从 1776 行拆分为 5 个 `RefCounted` 模块，每个模块 300-400 行：

| 模块 | 文件 | 职责 |
|------|------|------|
| Layout | `src/main_ui_layout.gd` | `_layout_ui` 及所有布局计算 |
| Refresh | `src/main_ui_refresh.gd` | `_refresh` 及所有 `_refresh_*` 方法 |
| Builder | `src/main_ui_builder.gd` | `_build_ui` 及所有 `_card_*`, `_box_style` 等辅助 |
| Callbacks | `src/main_ui_callbacks.gd` | `_on_*_pressed` 按钮回调 |
| Debug | `src/main_ui_debug.gd` | 所有 `debug_*` 和 `simulate_*` 方法 |

## 范围边界

**包含：**
- 提取 5 个模块文件
- `main.gd` 改为委托调用
- 保留所有 `debug_*` 和 `simulate_*` 公开签名
- 保留所有动画逻辑（`_animate_cards_to_table`）

**不包含：**
- 行为变更 — 游戏逻辑、规则、AI 不修改
- 新特性
- 场景文件修改

## 非目标
- 不修改 `DoudizhuGame` 核心逻辑
- 不修改 ECS 系统
- 不修改 `AudioController` 或 `ScoreState`

## 关键约束

1. **零行为变更** — 所有 e2e 测试必须通过
2. **public API 不变** — `debug_*` 和 `simulate_*` 签名不变
3. **模块无继承** — 所有模块 `extends RefCounted`，纯静态工具
4. **参数传递** — 布局/刷新方法接收 Control 引用作为参数
5. **委托模式** — `main.gd` 持有一个模块实例，所有 UI 调用走委托
