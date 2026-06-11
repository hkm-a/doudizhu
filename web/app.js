// Doudizhu Web App - UI Logic

const game = new DoudizhuGame();
let aiTimer = null;

function newRound() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    game.newRound(Date.now() % 10000);
    clearLog();
    document.getElementById('result-banner').style.display = 'none';
    Sound.deal();
    refreshUI();
}

let lastTurnSeat = -1;
let lastPhase = -1;
function refreshUI() {
    updateStatus();
    updateHandInfo();
    updateHandSummary();
    updateScoreBar();
    updateActionButtons();
    renderPlayerHand();
    renderBottomCards();
    renderPlayDisplay();
    renderAiPanels();
    updateTimerBar();
    if (lastPhase !== game.phase) {
        if (game.phase === Phase.PLAY && lastPhase === Phase.BIDDING) Sound.landlord();
        lastPhase = game.phase;
    }
    if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN && lastTurnSeat !== Seat.HUMAN) {
        Sound.turn();
    }
    lastTurnSeat = game.currentSeat;
    scheduleIfNeeded();
}

function scheduleIfNeeded() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    if (game.phase === Phase.BIDDING && game.currentSeat !== Seat.HUMAN) {
        aiTimer = setTimeout(aiBid, aiSpeed + 100);
    } else if (game.phase === Phase.PLAY && game.currentSeat !== Seat.HUMAN) {
        aiTimer = setTimeout(aiPlay, aiSpeed);
    }
}

function aiBid() {
    aiTimer = null;
    const seat = game.currentSeat;
    const score = game.evaluateHand(seat);
    let ok;
    if (score >= 8 && game.highestBid < 3) ok = game.callBid(seat, 3);
    else if (score >= 5 && game.highestBid < 2) ok = game.callBid(seat, 2);
    else if (score >= 3 && game.highestBid < 1) ok = game.callBid(seat, 1);
    else ok = game.passBid(seat);
    addLogEntry(seat, ok ? `${game.highestBid}分` : '不出', !ok);
    Sound.speak(ok ? game.highestBid + '分' : '不叫');
    refreshUI();
}

function aiPlay() {
    aiTimer = null;
    const seat = game.currentSeat;
    const prevTrickOwner = game.activeTrick.owner_seat;
    const prevTrickPr = game.activeTrick.primary_rank;
    const prevTrickCount = game.activeTrick.count;
    game.processAiTurns(1);
    const at = game.activeTrick;
    const trickChanged = at.owner_seat !== prevTrickOwner || at.primary_rank !== prevTrickPr || at.count !== prevTrickCount;
    if (trickChanged && at.cards) {
        addLogEntry(seat, `${at.pattern_name} (${at.cards.map(c => RANK_SYMBOLS[c.rank] + SUIT_SYMBOLS[c.suit]).join(' ')})`);
        if (at.pattern === 'Bomb') { Sound.bomb(); document.getElementById('game-container').classList.add('bomb-flash'); setTimeout(() => document.getElementById('game-container').classList.remove('bomb-flash'), 300); }
        else if (at.pattern === 'Rocket') { Sound.rocket(); document.getElementById('game-container').classList.add('rocket-flash'); setTimeout(() => document.getElementById('game-container').classList.remove('rocket-flash'), 500); }
        else Sound.card(at.cards.length);
        speakPlay(at.cards, at.pattern_name);
    } else if (at.owner_seat !== seat) {
        addLogEntry(seat, '不出', true);
        Sound.speak('不出');
    }
    refreshUI();
    if (game.phase === Phase.RESULT) showResult();
}

function humanBid(points) {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    Sound.bid();
    Sound.speak(points + '分');
    game.callBid(0, points);
    addLogEntry(0, `${points}分`);
    refreshUI();
}

function humanPass() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    Sound.pass();
    Sound.speak('不叫');
    game.passBid(0);
    addLogEntry(0, '不出', true);
    refreshUI();
}

function speakPlay(cards, pattern) {
    if (!cards || cards.length === 0) return;
    const RANK_CN = { 3:'三', 4:'四', 5:'五', 6:'六', 7:'七', 8:'八', 9:'九', 10:'十', 11:'J', 12:'Q', 13:'K', 14:'A', 15:'二' };
    const SUIT_CN = { 0:'♠', 1:'♥', 2:'♦', 3:'♣' };
    const sorted = [...cards].sort((a, b) => a.rank - b.rank);
    const cardNames = sorted.map(c => {
        if (c.is_joker) return c.rank === Rank.JOKER_BIG ? '大王' : '小王';
        return RANK_CN[c.rank] + SUIT_CN[c.suit];
    });
    const desc = cardNames.join('');
    let text = pattern + ' ' + desc;
    Sound.speak(text);
}

function playCards() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    const playCardsData = game._getSelectedCardDicts();
    const classified = playCardsData.length > 0 ? game.classifyCards(playCardsData) : null;
    const ok = game.playSelected();
    refreshUI();
    if (ok) {
        if (classified) {
            addLogEntry(0, `${classified.pattern_name} (${classified.count}张)`);
            if (classified.pattern === 'Bomb') { Sound.bomb(); document.getElementById('game-container').classList.add('bomb-flash'); setTimeout(() => document.getElementById('game-container').classList.remove('bomb-flash'), 300); }
            else if (classified.pattern === 'Rocket') { Sound.rocket(); document.getElementById('game-container').classList.add('rocket-flash'); setTimeout(() => document.getElementById('game-container').classList.remove('rocket-flash'), 500); }
            else Sound.card(classified.count);
            speakPlay(playCardsData, classified.pattern_name);
        }
        if (game.phase === Phase.RESULT) showResult();
    }
    if (!ok && game.selectedCards.length > 0) {
        Sound.error();
        document.getElementById('status-text').textContent += '\n❌ 无效出牌，请检查牌型或点提示';
    }
}

function humanPassTurn() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    Sound.pass();
    Sound.speak('不出');
    game.passTurn();
    addLogEntry(0, '不出', true);
    refreshUI();
}

function updateStatus() {
    const el = document.getElementById('status-text');
    let text = '';
    if (game.phase === Phase.BIDDING) text = '[地主待定]';
    else if (game.phase === Phase.PLAY) {
        if (game.currentSeat === Seat.HUMAN) text = game.initiativeSeat === Seat.HUMAN ? '[你的回合 - 先出]' : '[你的回合 - 跟牌或不出]';
        else text = `[${SEAT_NAMES[game.currentSeat]}出牌中...]`;
    } else if (game.phase === Phase.RESULT) text = '[牌局结束]';
    if (game.landlordSeat >= 0) {
        text += `\n地主: ${SEAT_NAMES[game.landlordSeat]}`;
        text += `\n你的角色: ${game.roles[Seat.HUMAN] || '农民'}`;
    }
    text += `\n手牌: ${game.hands[Seat.HUMAN].length}张`;
    if (Object.keys(game.activeTrick).length > 0) text += `\n当前牌: ${game.getTrickDisplay()}`;
    el.textContent = text;
}

function updateHandInfo() {
    document.getElementById('hand-info').textContent = `手牌: ${game.hands[Seat.HUMAN].length}张`;
}

function updateHandSummary() {
    document.getElementById('hand-summary').textContent = game.getHandSummary();
}

function updateScoreBar() {
    document.getElementById('score-text').textContent = `Score: ${game.multiplier}`;
    document.getElementById('hand-number').textContent = `Hand #${game.handNumber}`;
}

function updateTimerBar() {
    const bar = document.getElementById('timer-bar');
    if (!bar) return;
    const maxTime = game.phase === Phase.BIDDING ? 15 : 30;
    const pct = game.timerActive ? Math.max(0, (game.timerRemaining / maxTime) * 100) : 100;
    bar.style.width = pct + '%';
    bar.style.background = pct > 50 ? '#4a8' : pct > 20 ? '#ca3' : '#c44';
}

function updateActionButtons() {
    const inBidding = game.phase === Phase.BIDDING;
    const inPlay = game.phase === Phase.PLAY;
    const humanTurn = game.currentSeat === Seat.HUMAN;
    document.getElementById('btn-call1').disabled = !(inBidding && humanTurn);
    document.getElementById('btn-call2').disabled = !(inBidding && humanTurn);
    document.getElementById('btn-call3').disabled = !(inBidding && humanTurn);
    document.getElementById('btn-decline').disabled = !(inBidding && humanTurn);
    document.getElementById('btn-play').disabled = !(inPlay && humanTurn);
    document.getElementById('btn-pass').disabled = !(inPlay && humanTurn && game.initiativeSeat !== Seat.HUMAN);
    document.getElementById('btn-hint').disabled = !(inPlay && humanTurn);
}

function renderPlayerHand() {
    const container = document.getElementById('player-hand');
    container.innerHTML = '';
    if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN) container.classList.add('your-turn');
    else container.classList.remove('your-turn');
    const cards = [...game.hands[Seat.HUMAN]].sort((a, b) => {
        if (sortMode === 'suit') return a.suit !== b.suit ? a.suit - b.suit : a.rank - b.rank;
        return a.rank !== b.rank ? a.rank - b.rank : a.suit - b.suit;
    });
    const isNewDeal = game.phase === Phase.BIDDING && container.dataset.dealt !== String(game.handNumber);
    if (isNewDeal) container.dataset.dealt = String(game.handNumber);
    cards.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card face-up';
        div.dataset.cardId = card.id;
        if (isNewDeal) { div.classList.add('deal-anim'); div.style.animationDelay = (i * 40) + 'ms'; }
        if (game.selectedCards.includes(card.id)) div.classList.add('selected');
        const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
        const isJoker = card.is_joker;
        if (isJoker) div.classList.add(card.rank === Rank.JOKER_BIG ? 'joker-red' : 'joker-black');
        else div.classList.add(isRed ? 'red' : 'black');
        const rankText = isJoker ? (card.rank === Rank.JOKER_BIG ? '大' : '小') : RANK_SYMBOLS[card.rank];
        const suitText = isJoker ? (card.rank === Rank.JOKER_BIG ? '王' : '王') : SUIT_SYMBOLS[card.suit];
        div.innerHTML = makeCardHTML(rankText, suitText, isJoker, isRed);
        container.appendChild(div);
    });
    initCardInteractions(container);
}

function makeCardHTML(rank, suit, isJoker, isRed) {
    if (isJoker) {
        const isBig = rank === '大';
        const cls = isBig ? 'joker-big' : 'joker-small';
        return `<div class="joker-layout ${cls}"><span class="joker-side-l">JOKER</span><span class="joker-emoji">${isBig ? '🃏' : '🂠'}</span><span class="joker-side-r">JOKER</span></div>`;
    }
    const cornerClass = isRed ? 'card-corner red' : 'card-corner black';
    return `<div class="${cornerClass} tl"><span class="cr">${rank}</span><span class="cs">${suit}</span></div><div class="card-center">${suit}</div><div class="${cornerClass} br"><span class="cr">${rank}</span><span class="cs">${suit}</span></div>`;
}

function initCardInteractions(container) {
    container.onmousedown = (e) => {
        const card = e.target.closest('.card');
        if (game.phase !== Phase.PLAY || game.currentSeat !== Seat.HUMAN) return;
        if (card) {
            const cid = parseInt(card.dataset.cardId);
            const wasSelected = game.selectedCards.includes(cid);
            game.toggleSelection(cid);
            wasSelected ? Sound.deselect() : Sound.select();
            refreshUI();
        } else {
            game.selectedCards = [];
            refreshUI();
        }
    };
}

function renderBottomCards() {
    const container = document.getElementById('bottom-cards-display');
    container.innerHTML = '';
    game.bottomCards.forEach(card => {
        const div = document.createElement('div');
        div.className = 'card small';
        if (game.phase === Phase.PLAY || game.phase === Phase.RESULT) {
            div.classList.add('face-up');
            const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
            const isJoker = card.is_joker;
            if (isJoker) div.classList.add(card.rank === Rank.JOKER_BIG ? 'joker-red' : 'joker-black');
            else div.classList.add(isRed ? 'red' : 'black');
            const rankText = isJoker ? (card.rank === Rank.JOKER_BIG ? '大' : '小') : RANK_SYMBOLS[card.rank];
            const suitText = isJoker ? '' : SUIT_SYMBOLS[card.suit];
            div.innerHTML = makeCardHTML(rankText, suitText, isJoker, isRed);
        } else {
            div.classList.add('face-down');
        }
        container.appendChild(div);
    });
}

function renderPlayDisplay() {
    const display = document.getElementById('play-display');
    const label = document.getElementById('play-label');
    const at = game.activeTrick;
    const ownerSeat = at && at.owner_seat !== undefined ? at.owner_seat : -1;
    const cardCount = at && at.cards ? at.cards.length : 0;
    const trickKey = ownerSeat + ':' + cardCount + ':' + (at ? at.primary_rank : '');
    const prevKey = display.dataset.key || '';
    const isNew = trickKey !== prevKey;
    display.dataset.key = trickKey;

    if (isNew && at && Object.keys(at).length > 0 && ownerSeat >= 0) {
        label.textContent = `${SEAT_NAMES[ownerSeat]}出牌: ${at.pattern_name || ''}`;
        display.innerHTML = '';
        (at.cards || []).forEach((card, i) => {
            const div = document.createElement('div');
            div.className = 'card face-up play-appear';
            div.style.animationDelay = (i * 30) + 'ms';
            const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
            const isJoker = card.is_joker;
            div.classList.add(isRed ? 'red' : 'black');
            const rankText = isJoker ? (card.rank === Rank.JOKER_BIG ? '大' : '小') : RANK_SYMBOLS[card.rank];
            const suitText = isJoker ? '王' : SUIT_SYMBOLS[card.suit];
            div.innerHTML = makeCardHTML(rankText, suitText, isJoker, isRed);
            display.appendChild(div);
        });
        if (display._fadeTimer) clearTimeout(display._fadeTimer);
        display._fadeTimer = setTimeout(() => {
            display.style.animation = 'playFadeOut 0.4s ease-in forwards';
            setTimeout(() => { display.innerHTML = ''; display.style.animation = ''; }, 400);
        }, 1200);
    } else if (!at || Object.keys(at).length === 0) {
        display.innerHTML = '';
        label.textContent = '';
    }
}

let dragState = null;
function initDragSelect() {}

function renderAiPanels() {
    ['ai-left', 'ai-right'].forEach((name, i) => {
        const seat = i + 1;
        const isLandlord = game.landlordSeat === seat;
        document.getElementById(`${name}-role`).textContent = isLandlord ? '👑 地主' : (game.roles[seat] || '待定');
        document.getElementById(`${name}-count`).textContent = `${game.hands[seat].length}张`;
        document.getElementById(`${name}-panel`).classList.toggle('landlord-panel', isLandlord);
    });
}

function showHint() {
    const hint = game.getHint();
    if (hint) {
        Sound.hint();
        game.selectedCards = hint.map(c => c.id);
        refreshUI();
    }
}

function showResult() {
    const banner = document.getElementById('result-banner');
    const text = document.getElementById('result-text');
    const humanWon = (game.winnerSide === 'landlord' && game.landlordSeat === Seat.HUMAN) ||
                     (game.winnerSide === 'farmers' && game.landlordSeat !== Seat.HUMAN);
    if (humanWon) Sound.win(); else Sound.lose();

    const history = JSON.parse(localStorage.getItem('doudizhu_history') || '[]');
    history.push({ seed: game.seed, winner: game.winnerSide, landlord: game.landlordSeat, multiplier: game.multiplier, spring: game.springBonus, humanWon, ts: Date.now() });
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem('doudizhu_history', JSON.stringify(history));

    let resultText = `${game.winnerSide === 'landlord' ? '地主' : '农民'}胜! 倍数: x${game.multiplier}`;
    if (game.springBonus) resultText += game.springType === 'spring' ? ' 🌸春天!' : ' ❄️反春天!';
    text.textContent = resultText;
    text.style.color = humanWon ? '#4ade80' : '#f87171';

    const stats = document.getElementById('result-stats');
    const total = history.length;
    const wins = history.filter(h => h.humanWon).length;
    const losses = total - wins;
    const springs = history.filter(h => h.spring).length;
    stats.innerHTML = `<div class="stats-row"><span>总场次: ${total}</span><span>胜: ${wins}</span><span>负: ${losses}</span><span>春天: ${springs}</span></div><div class="stats-row"><span>胜率: ${total > 0 ? Math.round(wins / total * 100) : 0}%</span></div>`;

    banner.style.display = 'block';
    banner.classList.remove('confetti');
    void banner.offsetWidth;
    banner.classList.add('confetti');
}

function toggleHelp() { alert('斗地主规则:\n\n1. 三人游戏，一人为地主，两人为农民\n2. 地主获得底牌，先出完牌获胜\n3. 牌型：单张、对子、三条、炸弹、火箭等\n4. 炸弹可压制普通牌型，火箭最大\n5. 农民合作对抗地主'); }
function toggleMute() { const m = Sound.toggleMute(); document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊'; }

let playLogOpen = false;
function togglePlayLog() {
    playLogOpen = !playLogOpen;
    document.getElementById('play-log').classList.toggle('open', playLogOpen);
    document.getElementById('play-log-label').textContent = playLogOpen ? '出牌记录 ▴' : '出牌记录 ▾';
}
function addLogEntry(seat, text, isPass) {
    const log = document.getElementById('play-log');
    const div = document.createElement('div');
    div.className = 'log-entry' + (isPass ? ' pass' : '');
    div.textContent = `${SEAT_NAMES[seat]}: ${text}`;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    while (log.children.length > 30) log.removeChild(log.firstChild);
}
let sortMode = 'rank';
let aiSpeed = 500;
let aiDifficulty = 'normal';

function loadSettings() {
    const saved = JSON.parse(localStorage.getItem('doudizhu_settings') || '{}');
    if (saved.speed) { aiSpeed = saved.speed; document.getElementById('setting-speed').value = saved.speed; }
    if (saved.difficulty) { aiDifficulty = saved.difficulty; document.getElementById('setting-difficulty').value = saved.difficulty; }
}
function applySettings() {
    aiSpeed = parseInt(document.getElementById('setting-speed').value);
    aiDifficulty = document.getElementById('setting-difficulty').value;
    game.aiDifficulty = aiDifficulty;
    localStorage.setItem('doudizhu_settings', JSON.stringify({ speed: aiSpeed, difficulty: aiDifficulty }));
}
function openSettings() { document.getElementById('settings-panel').style.display = 'flex'; }
function closeSettings() { document.getElementById('settings-panel').style.display = 'none'; }
function toggleSort() {
    sortMode = sortMode === 'rank' ? 'suit' : 'rank';
    document.getElementById('btn-sort').textContent = sortMode === 'rank' ? '排序' : '花色';
    refreshUI();
}
function clearLog() { document.getElementById('play-log').innerHTML = ''; }
function toggleSettings() { alert('设置功能开发中...'); }

// Start game
newRound();
loadSettings();

document.addEventListener('click', () => { if (typeof Sound !== 'undefined') Sound.card(); }, { once: true });

let lastFrameTime = 0;
function gameLoop(timestamp) {
    if (lastFrameTime === 0) lastFrameTime = timestamp;
    const dt = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;
    if (game.timerActive && game.timerRemaining > 0) {
        const prev = game.timerRemaining;
        game.timerRemaining -= dt * 1000;
        if (game.timerRemaining <= 5000 && prev > 5000) Sound.tick();
        if (game.timerRemaining <= 3000 && Math.floor(game.timerRemaining / 1000) < Math.floor(prev / 1000)) Sound.tick();
        if (game.timerRemaining <= 0) {
            game.timerRemaining = 0;
            game.timerActive = false;
            if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN) {
                if (game.initiativeSeat === Seat.HUMAN) {
                    const smallest = game._findSmallestSingle();
                    if (smallest.length > 0) {
                        game.selectedCards = smallest.map(c => c.id);
                        game.playSelected();
                    }
                } else {
                    game.passTurn();
                }
                refreshUI();
            } else if (game.phase === Phase.BIDDING && game.currentSeat === Seat.HUMAN) {
                game.passBid(0);
                refreshUI();
            }
        }
        updateTimerBar();
    }
    requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const key = e.key;
    if (key === ' ' || key === 'Enter') {
        e.preventDefault();
        if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN) playCards();
    } else if (key === 'Escape') {
        game.selectedCards = [];
        refreshUI();
    } else if (key === 'h' || key === 'H') {
        if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN) showHint();
    } else if (key === 's' || key === 'S') {
        toggleSort();
    } else if (key === 'm' || key === 'M') {
        toggleMute();
    } else if (game.phase === Phase.BIDDING && game.currentSeat === Seat.HUMAN) {
        if (key === '1') humanBid(1);
        else if (key === '2') humanBid(2);
        else if (key === '3') humanBid(3);
        else if (key === 'p' || key === 'P') humanPass();
    } else if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN) {
        if (key === 'p' || key === 'P') humanPassTurn();
    }
});
