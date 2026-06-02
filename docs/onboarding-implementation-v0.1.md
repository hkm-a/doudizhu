# 斗地主新手引导实施规格 v0.1

> 实施层：把 `onboarding-flow-gdd-v0.1.md` 的 8 个时间节点落到代码。
> 优先级按支柱对照：3 秒读局 + 每个决策有反馈 是必做；其他是 [待 UI 实施]。

## 版本

| 版本 | 日期 | 摘要 |
|------|------|------|
| v0.1 | 2026-06-02 | 首版。基于 onboarding-flow-gdd-v0.1.md。 |

## 实施范围

| 节点 | 时间 | 后端状态 | 前端状态 | 实施 |
|------|------|----------|----------|------|
| T+0s  HUD 首屏 | 进对局 | ✅ Room.sync_data 已含必要字段 | ⚠️ 视觉密度未审 | 设计稿（待） |
| T+5s  叫分按钮 | 抢地主阶段 | ✅ RSP_CALL_SCORE 推送 | ✅ score_0..3 按钮 | 已实装 |
| T+8s  玩家叫 0 | 玩家叫分 | ✅ audio m/f_score_0.mp3 | ✅ 按钮 | 已实装 |
| T+15s 机器人 1.5s 延迟 | AI 决策 | ✅ simple.py:71 | ✅ 显式 sleep | 已实装 |
| T+30s 地主切换 | 抢地主结束 | ✅ RSP_CALL_SCORE end | ⚠️ 视觉 | 部分 |
| T+45s 第一次出牌 | 出牌 | ✅ RSP_SHOT_POKER | ⚠️ 选牌高亮 | 部分 |
| T+60s "不出"按钮 | pass | ✅ RSP_SHOT_POKER=[] | ⚠️ 按钮文本 | 部分 |
| T+5min 结算 | GAME_OVER | ✅ RSP_GAME_OVER | ✅ end_win/lose | 已实装 |

## 实施层交付清单

### 已实装（无需本次做）

- **T+5s/T+8s/T+15s 叫分链**（GDD v0.1 C.1 机制规格 + 当前 game.mjs 抢地主按钮）
- **T+5min 结算链**（GAME_OVER 协议 + end_win/lose.mp3 + game.mjs 弹窗）

### 本次实施（v0.1 起步）

1. **服务器端 first-game hint** — `Room` 加 `first_session` 标记 + RSP_JOIN_ROOM 加 `first_session: bool` 字段
2. **T+0s HUD 信息密度审计接口** — `Room.sync_data` 加 `onboarding_hints: dict` 字段（前端按需展示）
3. **T+45s 出牌选牌高亮**（Phaser）— 玩家手牌点击 → 高亮 + 牌型合法时按钮变可点（实施见 v0.2）
4. **T+60s "不出"按钮**（Phaser）— 加 "不出" 按钮在出牌区（实施见 v0.2）

### 留作 v0.2 实施

- T+30s 地主切换视觉（头像高亮 + 灯光）
- T+45s 选牌高亮（Phaser 鼠标悬停）
- T+60s "不出"按钮（Phaser）
- 启动页 → 首局的新手引导 overlay（首局专属 UI）
- 启动页 UI 视觉审计（high-fidelity 设计稿合入主线）
- 键盘快捷键覆盖率（支柱 4）

## 服务器端 first-game hint 实施

### Room 字段

```python
# GDD v0.2 onboarding 实施层
self.first_session: bool = True  # 默认首局；restart() 后设 False
```

### 同步数据

```python
def sync_data(self):
    return {
        ...
        # GDD v0.2 onboarding 实施层
        'first_session': self.first_session,
        'onboarding_hints': {
            'call_score_available': True,         # 抢地主按钮可点
            'shot_highlight_hint': True,         # 出牌选牌提示
            'pass_button_hint': True,            # 不出按钮提示
        },
    }
```

### restart 重置

```python
def restart(self):
    ...
    self.first_session = False  # 后续局不再是首局
```

### 协议字段说明（net.mjs）

```js
/**
 * RSP_JOIN_ROOM 中 room 字段增:
 *   "first_session": bool (true if first game of the room)
 *   "onboarding_hints": {
 *     "call_score_available": bool,
 *     "shot_highlight_hint": bool,
 *     "pass_button_hint": bool,
 *   }
 */
```

## 前端实施（v0.2 起步）

按 `onboarding-flow-gdd-v0.1.md` 时间节点，Phaser 端要做的：

```js
// 1. 启动后检查 first_session
observer.subscribe('room', function (room) {
    if (room.first_session) {
        // 显示首局引导 overlay（T+0s - T+5s）
        showOnboardingTip('欢迎！30 秒学会：叫分 / 出牌 / 不出');
    }
});

// 2. T+5s - 抢地主阶段：显示"叫 / 不叫"提示
// 3. T+45s - 出牌阶段：选牌高亮 + 牌型合法校验
// 4. T+60s - "不出"按钮 hover 提示
```

## 推进顺序

1. ✅ 启动页 + 引导 GDD 文档（v0.1）
2. ✅ 服务器端 first_session / onboarding_hints（v0.1 实施）
3. ⏳ 前端引导 overlay（v0.2 实施）
4. ⏳ 出牌选牌高亮（v0.2 实施）
5. ⏳ "不出"按钮（v0.2 实施）
6. ⏳ 实测 + 调优（录屏 5 局完整对局）

## 变更日志

- **v0.1 (2026-06-02)**: 首版。8 节点对照表 + 4 项 v0.1 必做 + 6 项 v0.2 候选。
