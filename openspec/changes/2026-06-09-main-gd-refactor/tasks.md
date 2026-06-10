# 任务: main.gd 重构

## Phase 1: Layout 模块（最低风险）

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 1 | 创建 `src/main_ui_layout.gd` — 提取 `_layout_ui`, `_layout_seat_content`, `_pin_top_left`, `_card_size`, `_get_layout_scale` | 低 | pending |
| 2 | 更新 `main.gd` 调用 `UILayout.layout_ui(...)` | 中 | pending |
| 3 | 运行 headless build 确认编译通过 | 中 | pending |

## Phase 2: Refresh 模块（中等风险）

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 4 | 创建 `src/main_ui_refresh.gd` — 提取 `_refresh`, `_refresh_seat`, `_refresh_bottom_cards`, `_refresh_trick`, `_refresh_hand`, `_refresh_actions`, `_refresh_settings_ui`, `_refresh_result_action_focus` | 中 | pending |
| 5 | 创建 `src/main_ui_refresh.gd` 辅助方法 — `_apply_result_score_once`, `_auto_save_after_result`, `_result_summary_text`, `_play_result_audio_if_needed` | 中 | pending |
| 6 | 更新 `main.gd` 调用 `UIRefresh.refresh(...)` | 中 | pending |
| 7 | 运行 headless build + unit tests | 中 | pending |

## Phase 3: Builder 模块（较高风险）

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 8 | 创建 `src/main_ui_builder.gd` — 提取 `_build_ui` 和所有 UI 创建方法 | 高 | pending |
| 9 | 提取辅助方法 — `_seat_panel`, `_action_button`, `_create_continue_dialog`, `_card_button`, `_card_style`, `_card_color`, `_card_text_color`, `_panel_style`, `_box_style`, `_button_style` | 高 | pending |
| 10 | 更新 `main.gd` 调用 `UIBuilder.build_ui(main)` | 中 | pending |
| 11 | 运行 headless build + unit tests | 中 | pending |

## Phase 4: Callbacks 模块（中等风险）

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 12 | 创建 `src/main_ui_callbacks.gd` — 提取所有 `_on_*_pressed` 方法 | 中 | pending |
| 13 | 提取 `_unhandled_key_input`, `_handle_shortcut`, `_press_visible_button` | 中 | pending |
| 14 | 更新 `main.gd` 委托回调 | 中 | pending |
| 15 | 运行 headless build + unit tests | 中 | pending |

## Phase 5: Debug 模块（中等风险）

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 16 | 创建 `src/main_ui_debug.gd` — 提取所有 `debug_*` 方法 | 中 | pending |
| 17 | 提取所有 `simulate_*` 方法 | 中 | pending |
| 18 | 更新 `main.gd` 委托 debug 调用 | 中 | pending |
| 19 | 运行 headless build + unit tests | 中 | pending |

## Phase 6: 清理和验证

| # | 任务 | 风险 | 状态 |
|---|------|------|------|
| 20 | 验证 `main.gd` < 500 行 | 低 | pending |
| 21 | 运行完整 e2e 测试 | 高 | pending |
| 22 | 最终 headless build | 低 | pending |

## Verify

- [ ] `main.gd` < 500 行
- [ ] 5 个模块文件各 < 450 行
- [ ] 所有 `debug_*` 方法签名不变
- [ ] 所有 `simulate_*` 方法签名不变
- [ ] Headless build 成功
- [ ] 所有 unit tests 通过
- [ ] 所有 e2e tests 通过
- [ ] 无行为变更（e2e playable loop 测试通过）
