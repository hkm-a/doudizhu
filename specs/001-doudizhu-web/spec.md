# Feature Specification: 斗地主网页版 (Doudizhu Web)

**Feature Branch**: `001-doudizhu-web`

**Created**: 2026-06-11

**Status**: Active

**Input**: 用户需求："刨除godot版本，只要网页版" — 创建一个完整的单机斗地主网页游戏

## User Scenarios & Testing

### User Story 1 - 完整斗地主游戏流程 (Priority: P1)

玩家打开网页即可开始一局完整的斗地主游戏。系统自动发牌、叫地主、出牌、判定胜负，全程 AI 对手自动行动。

**Why this priority**: 这是游戏的核心功能，没有它就没有产品价值。

**Independent Test**: 打开 `http://localhost:8080`，完成一局完整游戏（叫分→出牌→胜负），验证所有牌型识别正确。

**Acceptance Scenarios**:

1. **Given** 游戏已加载，**When** 玩家点击"3分"叫地主，**Then** 玩家成为地主获得 20 张牌，底牌翻开
2. **Given** 轮到玩家出牌，**When** 玩家选中合法牌型并点击"出牌"，**Then** 牌从手牌移除，出牌区显示牌型名称
3. **Given** 轮到玩家跟牌，**When** 玩家选中的牌无法压过当前牌型，**Then** 出牌按钮点击后显示错误提示
4. **Given** 一方出完所有牌，**When** 系统判定胜负，**Then** 显示胜负结果、倍数、春天/反春天标记

---

### User Story 2 - AI 对手智能对战 (Priority: P1)

AI 对手能根据角色（地主/农民）采取不同策略，农民 AI 之间能配合对抗地主。

**Why this priority**: 没有 AI 对手，单机游戏无法进行。

**Independent Test**: 运行 20 局模拟测试，验证 AI 能完成整局游戏，农民 AI 有配合行为。

**Acceptance Scenarios**:

1. **Given** AI 是农民角色，**When** 搭档出的牌足够大（rank ≥ A），**Then** AI 选择不出让搭档赢
2. **Given** AI 是地主，**When** 手中有炸弹且对手剩余牌 ≤ 5，**Then** AI 使用炸弹压制
3. **Given** AI 需要叫分，**When** 手牌评分 ≥ 8，**Then** AI 叫 3 分

---

### User Story 3 - 扑克牌视觉体验 (Priority: P1)

玩家看到的牌面接近真实扑克牌样式，手牌扇形排列，出牌有动效。

**Why this priority**: 视觉体验直接影响游戏沉浸感。

**Independent Test**: 对比真实扑克牌照片和游戏牌面，验证布局、颜色、花色显示正确。

**Acceptance Scenarios**:

1. **Given** 手牌区域，**When** 牌数 > 10，**Then** 牌以扇形重叠排列，不溢出屏幕
2. **Given** 出牌时，**When** AI 或玩家打出牌，**Then** 牌在中央区域弹入显示，1.2 秒后自动淡出
3. **Given** 发牌时，**When** 新一局开始，**Then** 手牌从下方逐张飞入，有延迟效果

---

### User Story 4 - 音效与语音播报 (Priority: P2)

每次出牌有音效和语音播报具体牌型和牌面。

**Why this priority**: 音效增强游戏反馈感，但不影响核心玩法。

**Independent Test**: 出牌后听音效和语音，验证"顺子 三四五六七"等具体播报。

**Acceptance Scenarios**:

1. **Given** 玩家打出炸弹，**When** 出牌成功，**Then** 播放爆炸音效 + 语音"炸弹 JJJJ"
2. **Given** AI 不出，**When** AI pass，**Then** 播放"不出"语音
3. **Given** 用户点击静音按钮，**When** 切换静音，**Then** 所有音效和语音停止

---

### User Story 5 - 游戏设置与持久化 (Priority: P2)

玩家可调整 AI 速度和难度，历史战绩保存到 localStorage。

**Why this priority**: 提升可玩性和用户粘性。

**Independent Test**: 修改设置后重开页面，验证设置保留；游戏结束后查看历史记录。

**Acceptance Scenarios**:

1. **Given** 设置面板打开，**When** 选择 AI 快速 + 困难，**Then** AI 出牌间隔缩短，炸弹使用更积极
2. **Given** 一局游戏结束，**When** 页面刷新，**Then** 历史记录保留最后 50 局

---

### User Story 6 - 移动端适配 (Priority: P2)

游戏在手机浏览器中可正常游玩，牌面和按钮自适应屏幕。

**Why this priority**: 扩大用户群体。

**Independent Test**: Chrome DevTools 模拟 375px 宽度，验证所有元素可见可操作。

**Acceptance Scenarios**:

1. **Given** 手机浏览器访问，**When** 页面加载，**Then** 牌面缩小到 46×66px，按钮最小高度 34px
2. **Given** 手牌超过屏幕宽度，**When** 左右滑动，**Then** 手牌区域可横向滚动

---

### Edge Cases

- 所有玩家都不叫地主 → 默认第一个叫分的玩家成为地主
- 一局中多次炸弹/火箭 → 倍数持续叠加
- 玩家超时未操作 → 自动出最小单张或 pass
- 手牌仅剩 2 和王 → `_allPatterns` 必须允许这些牌作为单张出牌

## Requirements

### Functional Requirements

- **FR-001**: 系统 MUST 支持完整 54 张牌发牌（3×17 + 3 底牌）
- **FR-002**: 系统 MUST 实现所有标准斗地主牌型识别：单张、对子、三条、三带一、三带二、顺子、连对、飞机（裸/带单/带对）、炸弹、火箭
- **FR-003**: 系统 MUST 在 `canBeat` 中正确处理：同牌型比较、炸弹压制非炸弹、火箭压制一切
- **FR-004**: 系统 MUST 不允许顺子/连对/飞机包含 2 和王（rank ≤ 14）
- **FR-005**: 系统 MUST 实现春天/反春天检测并应用 3 倍加成
- **FR-006**: 系统 MUST 实现炸弹×2、火箭×2 的倍数叠加
- **FR-007**: AI MUST 根据角色（地主/农民）采用不同出牌策略
- **FR-008**: AI MUST 在农民角色时配合搭档（让牌给高 rank 的搭档）
- **FR-009**: 系统 MUST 支持 AI 速度（200/500/800ms）和难度（简单/普通/困难）配置
- **FR-010**: 系统 MUST 使用 Web Audio API 合成音效，SpeechSynthesis API 语音播报
- **FR-011**: 系统 MUST 在 localStorage 中保存最后 50 局历史和用户设置
- **FR-012**: 系统 MUST 支持响应式布局，适配桌面/平板/手机

### Key Entities

- **Card**（牌）: rank(3-17), suit(0-3), is_joker, id。rank 15=2, 16=小王, 17=大王
- **Game**（游戏）: phase, hands[3], bottomCards, landlordSeat, activeTrick, multiplier, currentSeat
- **Play**（出牌）: pattern, primary_rank, count, cards[], structural_length
- **AI**（人工智能）: role-aware 策略，card counting，partner cooperation

## Success Criteria

### Measurable Outcomes

- **SC-001**: 20 局模拟测试 100% 完成（无死循环）
- **SC-002**: JQKA2 等非法牌型被正确拒绝
- **SC-003**: 33-44-55-66（4连对）和 33-44-55-66-77（5连对）正确识别
- **SC-004**: AI 叫分基于手牌评分（score ≥ 8 叫 3 分）
- **SC-005**: 农民 AI 在搭档出 A 以上大牌时选择让牌

## Assumptions

- 纯前端实现，无需后端服务
- 仅支持单机模式（本地 AI 对战）
- 所有游戏状态在内存中，刷新页面重新开始
- 浏览器需支持 Web Audio API 和 SpeechSynthesis API
- 目标浏览器：Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
