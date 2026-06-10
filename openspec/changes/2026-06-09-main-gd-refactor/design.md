# 设计: main.gd 重构

## 架构决策

### 1. 委托模式（推荐）
- `main.gd` 持有 5 个 `RefCounted` 实例
- 所有 UI 操作委托给模块实例
- `main.gd` 保留对 `game`, `score_state`, `audio_controller` 的引用
- 模块通过参数接收 UI 控件引用

**优点：** 最小侵入性，`main.gd` 保持协调者角色
**缺点：** 模块间无共享状态，需要通过参数或返回值传递

### 2. 单例模式（备选，不推荐）
- 模块使用 `class_name` 作为全局单例
- 通过 `get_node("/root/Main")` 获取 `Main` 引用

**缺点：** 测试困难，模块间隐式依赖

### 决策：采用方案 1（委托模式）

## 模块职责

### UILayout (`main_ui_layout.gd`)
```
接收: 所有 Control 引用, layout_scale, viewport_size
输出: 无（直接修改 Control 属性）
方法: _layout_ui(main, params...)
```

### UIRefresh (`main_ui_refresh.gd`)
```
接收: game, score_state, audio_controller, 所有 Label/Panel 引用
输出: 无（直接修改 UI 状态）
方法: _refresh(main, params...)
```

### UIBuilder (`main_ui_builder.gd`)
```
接收: 无（纯工具方法）
输出: Control 实例（Button, Panel, ColorRect 等）
方法: _build_ui(main), _card_style(card, selected), _box_style(...)
```

### UICallbacks (`main_ui_callbacks.gd`)
```
接收: game, score_state, audio_controller
输出: 无（直接修改游戏状态）
方法: _on_play_pressed(), _on_pass_pressed(), _handle_shortcut()
```

### UIDebug (`main_ui_debug.gd`)
```
接收: game, score_state, 各种状态引用
输出: 各种 debug 返回值
方法: debug_*(), simulate_*()
```

## 数据流

```
main.gd (Coordinator)
  ├── UILayout    → 修改 Control 属性
  ├── UIRefresh   → 修改 game 状态 → 刷新 UI
  ├── UIBuilder   → 创建 Control 实例 → 添加到 scene tree
  ├── UICallbacks → 修改 game/score_state → 调用 UIRefresh
  └── UIDebug     → 暴露游戏状态给 e2e
```

## 迁移策略（增量）

按耦合度从低到高逐个迁移：

1. **Phase 1: Layout** — 最低风险，纯布局数学，无游戏状态
2. **Phase 2: Refresh** — 中等风险，有 game 状态访问
3. **Phase 3: Builder** — 较高风险，大量助手方法
4. **Phase 4: Callbacks** — 中等风险，按钮事件处理
5. **Phase 5: Debug** — 中等风险，所有 `debug_`/`simulate_` 方法
6. **Phase 6: Cleanup** — 验证 `main.gd` < 500 行，e2e 通过

## 风险评估

| 风险 | 等级 | 缓解 |
|------|------|------|
| 行为变更 | 高 | 每次迁移后立即运行 headless build |
| e2e 测试破坏 | 高 | 保留所有 `debug_*`/`simulate_*` 签名 |
| 模块间循环依赖 | 中 | 所有模块 `extends RefCounted`，无继承链 |
| 参数过多 | 低 | 使用 Dictionary 参数打包 |
