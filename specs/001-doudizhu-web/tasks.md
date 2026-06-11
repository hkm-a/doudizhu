# Tasks: 斗地主网页版 (Doudizhu Web)

**Input**: Design documents from `/specs/001-doudizhu-web/`

**Prerequisites**: spec.md ✅, plan.md ✅, data-model.md ✅

---

## Phase 1: Setup ✅ Complete

- [x] T001 创建项目结构 `web/` 目录，5 个文件
- [x] T002 初始化 HTML 页面结构 `web/index.html`
- [x] T003 [P] 配置 CSS 基础样式 `web/style.css`

---

## Phase 2: Foundational — 游戏引擎 ✅ Complete

**⚠️ 此阶段阻塞所有用户故事**

- [x] T004 实现 `DoudizhuGame` 类基础框架（发牌、叫分、出牌流程）
- [x] T005 实现 54 张牌创建和洗牌（种子 RNG）
- [x] T006 实现叫分逻辑（1-3 分、pass、超时自动 pass）
- [x] T007 实现地主确定 + 底牌分配 + 角色分配
- [x] T008 实现 `canBeat` 牌型比较引擎
- [x] T009 实现 `findLegalPlays` 合法出牌生成器

**Checkpoint**: 基础引擎可运行，支持发牌→叫分→出牌→胜负判定

---

## Phase 3: US1 — 完整斗地主游戏流程 (P1) ✅ Complete

**Goal**: 玩家可完成一局完整斗地主游戏

### 牌型识别

- [x] T010 [US1] 实现 Single、Pair、Triple 基础牌型
- [x] T011 [US1] 实现 Triple+1、Triple+2 带牌牌型
- [x] T012 [US1] 实现 Bomb（炸弹）、Rocket（火箭）
- [x] T013 [US1] 实现 Straight（顺子）+ _isStraight rank≤14 检查
- [x] T014 [US1] 实现 Consecutive Pairs（连对）支持 3+ 连
- [x] T015 [US1] 实现 Airplane 裸机 + Airplane+Singles + Airplane+Pairs
- [x] T016 [US1] 修复 JQKA2 非法牌型（rank 15 排除出顺子/连对/飞机）
- [x] T017 [US1] 修复连对只生成 3 连（改为 3+ 连）
- [x] T018 [US1] 修复顺子生成不完整（支持所有长度 5-N）

### 游戏规则

- [x] T019 [US1] 实现春天/反春天检测 + 3 倍加成
- [x] T020 [US1] 修复火箭倍数叠加（`=4` → `*=2`）
- [x] T021 [US1] 实现炸弹倍数叠加（`*=2`）
- [x] T022 [US1] 修复主动权切换后 canBeat 检查（`initiativeSeat !== HUMAN` 才检查）

### UI 控制层

- [x] T023 [US1] 实现 `refreshUI()` 统一渲染管线
- [x] T024 [US1] 实现手牌渲染 + 选中/取消选中
- [x] T025 [US1] 实现出牌/不出/提示按钮逻辑
- [x] T026 [US1] 实现叫分按钮逻辑
- [x] T027 [US1] 实现胜负结果 banner 显示

**Checkpoint**: 玩家可完成完整游戏流程

---

## Phase 4: US2 — AI 对手智能对战 (P1) ✅ Complete

**Goal**: AI 能根据角色采取不同策略

### AI 核心

- [x] T028 [US2] 实现 `_aiStep` 基础 AI 行动逻辑
- [x] T029 [US2] 实现 `_aiSelectPlay` 基础出牌选择
- [x] T030 [US2] 实现角色感知：地主出小牌，农民配合
- [x] T031 [US2] 实现农民让牌逻辑（搭档 rank≥A 时 pass）
- [x] T032 [US2] 实现 `evaluateHand` 手牌评分系统
- [x] T033 [US2] AI 叫分基于手牌评分（≥8→3分，≥5→2分，≥3→1分）
- [x] T034 [US2] 实现 `aiDifficulty` 配置：easy/normal/hard
- [x] T035 [US2] 实现炸弹使用阈值：landlord≤5, farmer≤4, hard模式更积极
- [x] T036 [US2] 修复 sortFn tiebug `a-a` → `a-b`
- [x] T037 [US2] 修复 `_findRankCount` 返回最低 rank 而非第一个

### 卡牌追踪

- [x] T038 [US2] 实现 `playedCards[]` 和 `playedRanks{}` 追踪
- [x] T039 [US2] 实现 `getRemainingCount(rank)` 辅助方法

**Checkpoint**: 20 局模拟测试 100% 完成，AI 有角色差异化行为

---

## Phase 5: US3 — 扑克牌视觉体验 (P1) ✅ Complete

**Goal**: 牌面接近真实扑克，出牌有动效

### 卡牌样式

- [x] T040 [US3] 实现白色渐变底 + 阴影的牌面基础样式
- [x] T041 [US3] 实现左上角点数+花色，中间大花色，右下角倒置
- [x] T042 [US3] 实现红/黑颜色区分
- [x] T043 [US3] 实现大小王 Joker 样式（皇冠+JOKER 文字+左右侧竖写）
- [x] T044 [US3] 实现牌背菱形纹理 + ♠ 装饰
- [x] T045 [US3] 实现底牌小尺寸渲染

### 手牌布局

- [x] T046 [US3] 实现扇形半堆叠排列（margin-left: -24px）
- [x] T047 [US3] 实现响应式尺寸（72→58→46px 三档）
- [x] T048 [US3] 实现横屏溢出横向滚动

### 动效

- [x] T049 [US3] 实现发牌飞入动画（dealFan）
- [x] T050 [US3] 实现出牌弹入+淡出（playAppear + playFadeOut）
- [x] T051 [US3] 实现选中弹跳动画（cardBounce）
- [x] T052 [US3] 实现出牌区 1.2 秒自动消失

**Checkpoint**: 牌面真实，动效流畅，手机适配

---

## Phase 6: US4 — 音效与语音播报 (P2) ✅ Complete

**Goal**: 出牌有音效和语音播报

- [x] T053 [US4] 实现 `audio.js` Web Audio API 合成框架
- [x] T054 [US4] 实现发牌音效（短噪波）
- [x] T055 [US4] 实现出牌音效（三角波+噪波）
- [x] T056 [US4] 实现炸弹音效（低频锯齿波+噪波）
- [x] T057 [US4] 实现火箭音效（频率扫描上升）
- [x] T058 [US4] 实现胜利/失败音效（和弦进行）
- [x] T059 [US4] 实现 SpeechSynthesis 中文语音播报
- [x] T060 [US4] 实现 `speakPlay()` 播报具体牌型+牌面（如"顺子 三四五六七"）
- [x] T061 [US4] 实现静音按钮 + localStorage 持久化
- [x] T062 [US4] 实现 AudioContext 惰性初始化（首次点击触发）

**Checkpoint**: 所有出牌有音效+语音，静音可切换

---

## Phase 7: US5 — 游戏设置与持久化 (P2) ✅ Complete

**Goal**: AI 可配置，历史可查看

### 设置面板

- [x] T063 [US5] 实现设置面板 HTML + CSS 覆盖层
- [x] T064 [US5] 实现 AI 速度配置（200/500/800ms）
- [x] T065 [US5] 实现 AI 难度配置（easy/normal/hard）
- [x] T066 [US5] 实现 localStorage 设置读写

### 历史记录

- [x] T067 [US5] 实现游戏结束时保存到 localStorage（最近 50 局）
- [x] T068 [US5] 实现出牌记录面板（可折叠，最多 30 条）
- [x] T069 [US5] 实现 `addLogEntry` 出牌/不出日志

### 排序

- [x] T070 [US5] 实现牌序/花色排序切换按钮

**Checkpoint**: 设置可保存，历史可查看，排序可切换

---

## Phase 8: US6 — 移动端适配 (P2) ✅ Complete

**Goal**: 手机浏览器可正常游玩

- [x] T071 [US6] 实现 `clamp()` 流式卡牌尺寸
- [x] T072 [US6] 实现 768px 断点（平板适配）
- [x] T073 [US6] 实现 480px 断点（手机适配）
- [x] T074 [US6] 实现触摸友好的按钮尺寸（min-height: 38px）
- [x] T075 [US6] 实现计时器倒计时条（绿→黄→红）
- [x] T076 [US6] 实现 `requestAnimationFrame` 游戏循环
- [x] T077 [US6] 实现超时自动出牌/自动 pass

**Checkpoint**: 手机 375px 宽度可正常游玩

---

## Phase 9: Polish — 大部分完成

### 已完成

- [x] T078 [P] `_resultsStraights` 多段 run 支持 ✅ 已验证
- [x] T079 [P] `_resultsConsecPairs` 多段 run 支持 ✅ 已验证
- [x] T080 AI 出牌时出牌区显示 ✅ `renderPlayDisplay` 已支持
- [x] T081 叫分阶段语音播报 ✅ `Sound.speak(points+'分')` / `Sound.speak('不叫')`
- [x] T082 [US5] 游戏结束时显示历史统计面板 ✅ 胜/负/春天/胜率
- [x] T083 [P] favicon + meta 标签 ✅ SVG favicon + theme-color + viewport
- [x] T084 [P] 键盘快捷键 ✅ Space/Enter=出牌, Escape=取消, H=提示, S=排序, M=静音, P=不出, 1/2/3=叫分
- [x] T085 game.js 行数审计 ✅ 1022 行 < 1200 上限
- [x] T086 JSDoc 注释 ✅ 7 个关键公共方法已添加
- [x] T087 quickstart 测试验证 ✅ 20/20 局 100% 通过

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: 无依赖 → ✅ 已完成
- **Phase 2 (Foundational)**: 依赖 Phase 1 → ✅ 已完成
- **Phase 3-8 (User Stories)**: 依赖 Phase 2 → ✅ 已全部完成
- **Phase 9 (Polish)**: 依赖所有 User Stories → ⬅️ **当前**

### 当前状态

所有 6 个用户故事（US1-US6）已实现。Phase 9 的 10 个 Polish 任务是可选优化项。

### 推荐执行顺序

1. T078 + T079（牌型生成器完善）— 影响出牌准确性
2. T080（AI 出牌显示）— 提升视觉反馈
3. T081（叫分语音）— 提升音效完整性
4. T082-T087（其他优化）— 按优先级执行

---

## Notes

- [P] = 可并行执行（不同文件，无依赖）
- [US1]-[US6] = 用户故事标签
- 所有 Phase 1-8 任务已完成（标记 [x]）
- Phase 9 为可选优化，按需执行
- Node.js 验证命令：`node -e "const G=require('./web/game.js'); ..."`
