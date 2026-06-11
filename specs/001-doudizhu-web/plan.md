# Implementation Plan: 斗地主网页版 (Doudizhu Web)

**Branch**: `001-doudizhu-web` | **Date**: 2026-06-11 | **Spec**: `specs/001-doudizhu-web/spec.md`

## Summary

实现完整的单机斗地主网页游戏，纯 HTML/CSS/JS 无依赖，包含完整规则引擎、AI 对手、响应式 UI、音效系统。

## Technical Context

**Language/Version**: JavaScript ES6+（浏览器原生）

**Primary Dependencies**: 无第三方依赖

**Storage**: localStorage（历史记录 + 用户设置）

**Testing**: Node.js 模拟测试（20 局完整游戏）+ 手动浏览器验证

**Target Platform**: 桌面/平板/手机浏览器（Chrome 90+, Firefox 90+, Safari 15+）

**Project Type**: 单页 Web 应用（SPA）

**Performance Goals**: 首屏 < 500ms，动画 ≥ 30fps

**Constraints**: 零依赖、无构建步骤、单文件不超过 1200 行

## Constitution Check

✅ 规则至上：所有牌型识别已通过 JQKA2、连对 4+ 连、飞机带牌测试
✅ 零依赖：纯 HTML/CSS/JS，可直接浏览器打开
✅ 引擎/UI 分离：game.js 可 Node.js 独立运行
✅ AI 可配置：三档难度 + 三档速度
✅ 响应式：clamp() 流式尺寸 + 3 个媒体查询断点

## Project Structure

```text
web/
├── game.js       # 游戏引擎（~1009行）
│   ├── DoudizhuGame 类
│   ├── 牌型识别 classifyCards()
│   ├── 合法出牌 findLegalPlays()
│   ├── AI 策略 _aiSelectPlay()
│   ├── 牌型比较 canBeat()
│   └── 卡牌追踪 playedCards/playedRanks
│
├── app.js        # UI 控制层（~430行）
│   ├── refreshUI() 统一渲染
│   ├── renderPlayerHand() 扇形手牌
│   ├── renderPlayDisplay() 出牌展示
│   ├── speakPlay() 语音播报
│   ├── AI 调度 scheduleIfNeeded()
│   └── 设置/历史/日志
│
├── audio.js      # 音效合成（~103行）
│   ├── Web Audio API 合成
│   ├── SpeechSynthesis 语音
│   └── Sound 对象（card/bomb/rocket/win/lose）
│
├── index.html    # 页面结构（~100行）
├── style.css     # 样式（~170行）
└── audio.js      # 音效
```

**Structure Decision**: 单页应用，5 个文件直接加载，无构建步骤

## Implementation History

| 迭代 | 日期 | 主要改动 |
|------|------|---------|
| v1 | 2026-06-10 | 基础游戏引擎 + UI |
| v2 | 2026-06-10 | 规则补全 + AI 升级 |
| v3 | 2026-06-11 | AI 智能 + 移动端 + 计时器 |
| v4 | 2026-06-11 | 动画 + 音效 + 历史 + 排序 |
| v5 | 2026-06-11 | 牌型修复 + 设置 + 扑克牌样式 |
| v6 | 2026-06-11 | UI 大改版（扇形手牌、Joker 样式、语音播报） |

## Architecture Decisions

### 游戏引擎 (game.js)
- **单类架构**：`DoudizhuGame` 包含所有游戏状态和逻辑
- **确定性 RNG**：使用种子随机数，支持回放
- **事件无耦合**：引擎不触发 DOM 事件，通过属性变化让 UI 层检测
- **AI 策略模式**：`_aiSelectPlay` 根据 `aiDifficulty` 和角色选择策略

### UI 控制层 (app.js)
- **单向数据流**：游戏状态 → `refreshUI()` → DOM 更新
- **setTimeout 链式调度**：AI 行动通过 `scheduleIfNeeded()` 串联
- **requestAnimationFrame 游戏循环**：仅用于计时器倒计时

### 音效系统 (audio.js)
- **惰性初始化**：AudioContext 在首次用户交互时创建
- **SpeechSynthesis 语音**：中文语音播报出牌内容
- **全局静音**：muted 变量控制所有音效

## Future Enhancement Areas

1. **多人对战**：WebSocket 实时对战
2. **回放系统**：保存并回放历史牌局
3. **AI 升级**：Monte Carlo 树搜索、card counting 优化
4. **PWA 支持**：Service Worker 离线缓存
5. **多语言**：i18n 支持中英文切换
