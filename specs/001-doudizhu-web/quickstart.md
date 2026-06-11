# Quickstart: 斗地主网页版

## 启动方式

### 方式 1：直接打开（推荐）
```
直接用浏览器打开 web/index.html
```

### 方式 2：本地服务器
```bash
cd doudizhu
python -m http.server 8080 --directory web
# 浏览器打开 http://localhost:8080
```

## 游戏操作

### 叫地主阶段
- 点击「1分」「2分」「3分」叫分
- 点击「不出」放弃叫分
- 超时自动放弃

### 出牌阶段
- **点击手牌** 选中/取消选中
- **点击「出牌」** 打出选中的合法牌型
- **点击「不出」** 跳过回合（仅跟牌时可用）
- **点击「提示」** 自动选中最小合法牌型
- 点击**空白区域**取消所有选中

### 设置
- 点击「设置」调整 AI 速度和难度
- 点击🔊 切换静音
- 点击「排序」切换牌序/花色排序

## Node.js 测试
```bash
node -e "
const G = require('./web/game.js');
const g = new G();
g.newRound(42);
g.callBid(0, 3);
while (g.phase === 2 && g.currentSeat !== 0) {
  g.highestBid < 3 ? g.callBid(g.currentSeat, g.highestBid + 1) : g.passBid(g.currentSeat);
}
let r = 0;
while (g.phase === 3 && r < 500) {
  if (g.currentSeat === 0) {
    const p = g.getLegalPlays();
    p.length > 0 ? (g.selectedCards = p[0].cards.map(c => c.id), g.playSelected()) : g.passTurn();
  } else g.processAiTurns(1);
  r++;
}
console.log('Phase:', g.phase, 'Hands:', g.hands.map(h => h.length).join(','));
"
```

## 文件结构
```
web/
├── game.js      游戏引擎
├── app.js       UI 控制
├── audio.js     音效合成
├── index.html   页面
└── style.css    样式
```
