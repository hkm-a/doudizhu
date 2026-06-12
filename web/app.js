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
        addLogEntry(seat, at.pattern_name + ' (' + at.cards.map(function(c) { return RANK_SYMBOLS[c.rank] + SUIT_SYMBOLS[c.suit]; }).join(' ') + ')');
        playSoundForPattern(at.pattern, at.cards.length);
    } else if (at.owner_seat !== seat) {
        addLogEntry(seat, '不出', true);
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
    var RANK_CN = { 3:'三', 4:'四', 5:'五', 6:'六', 7:'七', 8:'八', 9:'九', 10:'十', 11:'J', 12:'Q', 13:'K', 14:'A', 15:'二' };
    var simplePatterns = { 'Single': true, 'Pair': true, 'Triple': true, 'Bomb': true, 'Rocket': true };
    if (cards.length === 1 && cards[0].is_joker) {
        Sound.speak(cards[0].rank === Rank.JOKER_BIG ? '大王' : '小王');
        return;
    }
    if (simplePatterns[pattern]) {
        var sorted = cards.slice().sort(function(a, b) { return a.rank - b.rank; });
        var names = sorted.map(function(c) {
            if (c.is_joker) return c.rank === Rank.JOKER_BIG ? '大王' : '小王';
            return RANK_CN[c.rank];
        });
        if (pattern === 'Single') Sound.speak(names.join(''));
        else if (pattern === 'Pair') Sound.speak('对' + names[0]);
        else if (pattern === 'Triple') Sound.speak('三条' + names[0]);
        else if (pattern === 'Bomb') Sound.speak('炸弹' + names[0]);
        else if (pattern === 'Rocket') Sound.speak('火箭');
    } else {
        Sound.speak(pattern);
    }
}

function playSoundForPattern(pattern, count) {
    if (pattern === 'Bomb') { Sound.bomb(); document.getElementById('game-container').classList.add('bomb-flash'); setTimeout(function() { document.getElementById('game-container').classList.remove('bomb-flash'); }, 300); }
    else if (pattern === 'Rocket') { Sound.rocket(); document.getElementById('game-container').classList.add('rocket-flash'); setTimeout(function() { document.getElementById('game-container').classList.remove('rocket-flash'); }, 500); }
    else if (pattern === 'Straight' || pattern === 'Consecutive Pairs') Sound.straight();
    else if (pattern === 'Airplane') Sound.airplane();
    else Sound.card(count);
}

function playCards() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    var playCardsData = game._getSelectedCardDicts();
    var classified = playCardsData.length > 0 ? game.classifyCards(playCardsData) : null;
    var ok = game.playSelected();
    refreshUI();
    if (ok) {
        if (classified) {
            addLogEntry(0, classified.pattern_name + ' (' + classified.count + '张)');
            playSoundForPattern(classified.pattern, classified.count);
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
        const color = isBig ? 'red' : 'black';
        return `<div class="joker-corner ${color} tl"><span>J</span><span>O</span><span>K</span><span>E</span><span>R</span></div><div class="joker-center"><div class="joker-star">${isBig ? '★' : '☆'}</div><div class="joker-word">${isBig ? 'JOKER' : 'joker'}</div></div><div class="joker-corner ${color} br"><span>R</span><span>E</span><span>K</span><span>O</span><span>J</span></div>`;
    }
    const cornerClass = isRed ? 'card-corner red' : 'card-corner black';
    return `<div class="${cornerClass} tl"><span class="cr">${rank}</span><span class="cs">${suit}</span></div><div class="card-center">${suit}</div><div class="${cornerClass} br"><span class="cr">${rank}</span><span class="cs">${suit}</span></div>`;
}

var dragInfo = null;
function initCardInteractions(container) {
    function getXY(e) {
        if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        return { x: e.clientX, y: e.clientY };
    }
    function onStart(e) {
        if (game.phase !== Phase.PLAY || game.currentSeat !== Seat.HUMAN) return;
        var card = e.target.closest('.card');
        if (card) {
            e.preventDefault();
            var p = getXY(e);
            dragInfo = { sx: p.x, sy: p.y, cid: parseInt(card.dataset.cardId), drag: false };
        } else if (!e.target.closest('.action-btn') && !e.target.closest('#settings-panel') && !e.target.closest('#result-banner')) {
            game.selectedCards = [];
            Sound.deselect();
            refreshUI();
        }
    }
    function onMove(e) {
        if (!dragInfo) return;
        e.preventDefault();
        var p = getXY(e);
        if (!dragInfo.drag && (Math.abs(p.x - dragInfo.sx) > 8 || Math.abs(p.y - dragInfo.sy) > 8)) {
            dragInfo.drag = true;
            if (game.selectedCards.indexOf(dragInfo.cid) === -1) game.selectedCards.push(dragInfo.cid);
        }
        if (dragInfo.drag) {
            var cards = container.querySelectorAll('.card');
            var sl = Math.min(dragInfo.sx, p.x), sr = Math.max(dragInfo.sx, p.x);
            var st = Math.min(dragInfo.sy, p.y), sb = Math.max(dragInfo.sy, p.y);
            for (var i = 0; i < cards.length; i++) {
                var c = cards[i], r = c.getBoundingClientRect();
                var hit = !(r.right < sl || r.left > sr || r.bottom < st || r.top > sb);
                var cid = parseInt(c.dataset.cardId);
                var idx = game.selectedCards.indexOf(cid);
                if (hit && idx === -1) game.selectedCards.push(cid);
                else if (!hit && idx !== -1) game.selectedCards.splice(idx, 1);
                c.classList.toggle('selected', game.selectedCards.indexOf(cid) !== -1);
            }
        }
    }
    function onEnd() {
        if (!dragInfo) return;
        if (!dragInfo.drag) {
            game.toggleSelection(dragInfo.cid);
            var was = game.selectedCards.indexOf(dragInfo.cid) !== -1;
            was ? Sound.deselect() : Sound.select();
            refreshUI();
        } else {
            refreshUI();
        }
        dragInfo = null;
    }
    container.addEventListener('mousedown', onStart);
    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseup', onEnd);
    container.addEventListener('mouseleave', function() { dragInfo = null; });
    container.addEventListener('touchstart', onStart, { passive: false });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd);
    container.addEventListener('touchcancel', function() { dragInfo = null; });
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
        setTimeout(() => spawnPlayParticles(display, at.pattern), 100);
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
    if (humanWon) { setTimeout(spawnWinConfetti, 300); } else { setTimeout(spawnLoseParticles, 300); }

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
                    const smallest = game._findSmallestSingle(Seat.HUMAN);
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

// ========== Particle System ==========
function spawnParticles(x, y, count, colors, opts) {
    const container = document.getElementById('game-container');
    const o = Object.assign({ minSize: 4, maxSize: 8, minDist: 40, maxDist: 120, gravity: 0, fadeDuration: 600, shapes: ['circle'] }, opts || {});
    for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const size = o.minSize + Math.random() * (o.maxSize - o.minSize);
        const angle = Math.random() * Math.PI * 2;
        const dist = o.minDist + Math.random() * (o.maxDist - o.minDist);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist - (o.gravity > 0 ? 30 : 0);
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = o.shapes[Math.floor(Math.random() * o.shapes.length)];
        const br = shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0';
        p.style.cssText = 'left:' + x + 'px;top:' + y + 'px;width:' + size + 'px;height:' + size + 'px;background:' + color + ';border-radius:' + br + ';position:fixed;z-index:100;pointer-events:none;opacity:1;transition:all ' + o.fadeDuration + 'ms cubic-bezier(.25,.46,.45,.94);';
        container.appendChild(p);
        requestAnimationFrame(function() {
            p.style.transform = 'translate(' + dx + 'px,' + (dy + o.gravity * 2) + 'px) scale(0)';
            p.style.opacity = '0';
        });
        setTimeout(function() { p.remove(); }, o.fadeDuration + 50);
    }
}

function spawnPlayParticles(el, pattern) {
    var rect = el.getBoundingClientRect();
    var cx = rect.left + rect.width / 2;
    var cy = rect.top + rect.height / 2;
    if (pattern === 'Bomb') {
        spawnParticles(cx, cy, 30, ['#ff4444', '#ff8800', '#ffcc00', '#ff6600', '#ffffff'], { minSize: 3, maxSize: 10, maxDist: 180, gravity: 1, fadeDuration: 800, shapes: ['circle', 'square'] });
    } else if (pattern === 'Rocket') {
        spawnParticles(cx, cy, 25, ['#ff00ff', '#ff44ff', '#ff88ff', '#ffff00', '#ffffff'], { minSize: 2, maxSize: 6, maxDist: 200, gravity: -0.5, fadeDuration: 700, shapes: ['circle'] });
        for (var i = 0; i < 8; i++) {
            (function(idx) { setTimeout(function() { spawnParticles(cx, cy - idx * 15, 3, ['#ff44ff', '#ffffff'], { minSize: 2, maxSize: 4, maxDist: 20, fadeDuration: 400 }); }, idx * 60); })(i);
        }
    } else {
        spawnParticles(cx, cy, 8, ['#f0d060', '#e8b830', '#ffffff'], { minSize: 2, maxSize: 5, maxDist: 60, fadeDuration: 400 });
    }
}

function spawnWinConfetti() {
    var colors = ['#ff4444', '#44ff44', '#4444ff', '#ffff44', '#ff44ff', '#44ffff', '#ff8800', '#ffffff'];
    for (var i = 0; i < 60; i++) {
        (function(idx) { setTimeout(function() {
            var x = Math.random() * window.innerWidth;
            spawnParticles(x, -10, 3, colors, { minSize: 4, maxSize: 8, maxDist: 0, minDist: 0, gravity: 2, fadeDuration: 2000, shapes: ['circle', 'square'] });
        }, idx * 30); })(i);
    }
}

function spawnLoseParticles() {
    for (var i = 0; i < 20; i++) {
        (function(idx) { setTimeout(function() {
            var x = Math.random() * window.innerWidth;
            spawnParticles(x, -10, 2, ['#666', '#888', '#555'], { minSize: 3, maxSize: 6, maxDist: 0, minDist: 0, gravity: 1.5, fadeDuration: 1500, shapes: ['circle'] });
        }, idx * 50); })(i);
    }
}
