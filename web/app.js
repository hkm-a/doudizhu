// Doudizhu Web App - UI Logic

const game = new DoudizhuGame();
let aiTimer = null;
let dragInfo = null;

function newRound() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    game.newRound(Date.now() % 10000);
    clearLog();
    counterOpen = false;
    document.getElementById('counter-panel').style.display = 'none';
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
    var playZone = document.getElementById('play-zone');
    if (playZone) {
        playZone.classList.toggle('active', game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN);
    }
    if (lastPhase !== game.phase) {
        if (game.phase === Phase.PLAY && lastPhase === Phase.BIDDING) Sound.landlord();
        lastPhase = game.phase;
    }
    if (game.phase === Phase.PLAY && game.currentSeat === Seat.HUMAN && lastTurnSeat !== Seat.HUMAN) {
        Sound.turn();
    }
    lastTurnSeat = game.currentSeat;
    if (counterOpen) renderCounter();
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
    let called = false;
    if (score >= 8 && game.highestBid < 3) called = game.callBid(seat, 3);
    else if (score >= 5 && game.highestBid < 2) called = game.callBid(seat, 2);
    else if (score >= 3 && game.highestBid < 1) called = game.callBid(seat, 1);
    else game.passBid(seat);
    addLogEntry(seat, called ? game.highestBid + '分' : '不出', !called);
    Sound.speak(called ? game.highestBid + '分' : '不叫');
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
        var logText = at.pattern === 'Single' ? at.cards.map(function(c) { return RANK_SYMBOLS[c.rank] + SUIT_SYMBOLS[c.suit]; }).join(' ') : at.pattern_name + ' (' + at.cards.map(function(c) { return RANK_SYMBOLS[c.rank] + SUIT_SYMBOLS[c.suit]; }).join(' ') + ')';
        addLogEntry(seat, logText);
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
    var simplePatterns = { '单张': true, '对子': true, '三条': true, '炸弹': true, '火箭': true };
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
        if (pattern === '单张') Sound.speak(names.join(''));
        else if (pattern === '对子') Sound.speak('对' + names[0]);
        else if (pattern === '三条') Sound.speak('三条' + names[0]);
        else if (pattern === '炸弹') Sound.speak('炸弹' + names[0]);
        else if (pattern === '火箭') Sound.speak('火箭');
    } else {
        Sound.speak(pattern);
    }
}

function playSoundForPattern(pattern, count) {
    var gameContainer = document.getElementById('game-container');
    var bombEl = document.getElementById('bomb-effect');
    var planeEl = document.getElementById('airplane-effect');

    if (pattern === 'Bomb') {
        Sound.bomb();
        Sound.speak('炸弹');
        gameContainer.classList.remove('bomb-flash');
        void gameContainer.offsetWidth;
        gameContainer.classList.add('bomb-flash');
        bombEl.classList.remove('active');
        void bombEl.offsetWidth;
        bombEl.classList.add('active');
        setTimeout(function() { gameContainer.classList.remove('bomb-flash'); bombEl.classList.remove('active'); }, 800);
    } else if (pattern === 'Rocket') {
        Sound.rocket();
        Sound.speak('火箭');
        gameContainer.classList.remove('rocket-flash');
        void gameContainer.offsetWidth;
        gameContainer.classList.add('rocket-flash');
        bombEl.classList.remove('active');
        void bombEl.offsetWidth;
        bombEl.classList.add('active');
        setTimeout(function() { gameContainer.classList.remove('rocket-flash'); bombEl.classList.remove('active'); }, 1200);
    } else if (pattern === '飞机' || pattern === '飞机带单' || pattern === '飞机带对') {
        Sound.airplane();
        Sound.speak(pattern);
        planeEl.classList.remove('active');
        void planeEl.offsetWidth;
        planeEl.classList.add('active');
        setTimeout(function() { planeEl.classList.remove('active'); }, 1600);
    } else if (pattern === '顺子' || pattern === '连对') {
        Sound.straight();
        Sound.speak(pattern);
    } else {
        Sound.card(count);
        Sound.speak(pattern);
    }
}

function playCards() {
    if (aiTimer) { clearTimeout(aiTimer); aiTimer = null; }
    var playCardsData = game._getSelectedCardDicts();
    var classified = playCardsData.length > 0 ? game.classifyCards(playCardsData) : null;
    var ok = game.playSelected();
    refreshUI();
    if (ok) {
        if (classified) {
            var logText = classified.pattern === 'Single' ? playCardsData.map(function(c) { return RANK_SYMBOLS[c.rank] + SUIT_SYMBOLS[c.suit]; }).join(' ') : classified.pattern_name + ' (' + classified.count + '张)';
            addLogEntry(0, logText);
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

let lastMultiplier = 1;
function updateScoreBar() {
    const scoreEl = document.getElementById('score-text');
    const newMult = game.multiplier;
    scoreEl.textContent = 'Score: ' + newMult;
    if (newMult > lastMultiplier) {
        scoreEl.classList.remove('mult-bounce');
        void scoreEl.offsetWidth;
        scoreEl.classList.add('mult-bounce');
    }
    lastMultiplier = newMult;
    document.getElementById('hand-number').textContent = 'Hand #' + game.handNumber;
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
    document.getElementById('btn-call1').style.display = inBidding ? '' : 'none';
    document.getElementById('btn-call2').style.display = inBidding ? '' : 'none';
    document.getElementById('btn-call3').style.display = inBidding ? '' : 'none';
    document.getElementById('btn-decline').style.display = inBidding ? '' : 'none';
    document.getElementById('btn-play').disabled = !(inPlay && humanTurn);
    document.getElementById('btn-pass').disabled = !(inPlay && humanTurn && game.initiativeSeat !== Seat.HUMAN);
    document.getElementById('btn-hint').disabled = !(inPlay && humanTurn);
    document.getElementById('btn-pass').style.display = inPlay ? '' : 'none';
    document.getElementById('btn-hint').style.display = inPlay ? '' : 'none';
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
        div.innerHTML = makeCardHTML(card.rank, card.suit, isJoker, isRed);
        container.appendChild(div);
    });
}

var cardInteractionBound = false;
function initCardInteractionsOnce() {
    if (cardInteractionBound) return;
    cardInteractionBound = true;
    var container = document.getElementById('player-hand');
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
        } else if (!e.target.closest('.action-btn') && !e.target.closest('#settings-panel') && !e.target.closest('#result-banner') && !e.target.closest('#counter-panel')) {
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
            was ? Sound.select() : Sound.deselect();
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

var SVG_SUIT = {
    0: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 2L9 9H2l6 5-2 7 6-4 6 4-2-7 6-5h-7z" fill="currentColor"/></svg>',
    1: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 3C12 3 4 10 4 15a8 8 0 0016 0c0-5-8-12-8-12z" fill="currentColor"/></svg>',
    2: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 3L3 12l9 9 9-9z" fill="currentColor"/></svg>',
    3: '<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M12 2C8 2 4 6 4 10c0 5 8 12 8 12s8-7 8-12c0-4-4-8-8-8zm0 3a3 3 0 110 6 3 3 0 010-6z" fill="currentColor"/></svg>'
};

function makeCardHTML(rank, suit, isJoker, isRed) {
    if (isJoker) {
        var isBig = rank === Rank.JOKER_BIG;
        var color = isBig ? 'red' : 'black';
        return '<div class="joker-corner ' + color + ' tl"><span>J</span><span>O</span><span>K</span><span>E</span><span>R</span></div><div class="joker-center"><div class="joker-star">' + (isBig ? '★' : '☆') + '</div><div class="joker-word">' + (isBig ? 'JOKER' : 'joker') + '</div></div><div class="joker-corner ' + color + ' br"><span>J</span><span>O</span><span>K</span><span>E</span><span>R</span></div>';
    }
    var suitSvg = SVG_SUIT[suit] || '';
    var rankLabel = RANK_SYMBOLS[rank] || rank;
    var cornerClass = isRed ? 'card-corner red' : 'card-corner black';
    return '<div class="' + cornerClass + ' tl"><span class="cr">' + rankLabel + '</span><span class="cs">' + suitSvg + '</span></div><div class="card-center">' + suitSvg + '</div><div class="' + cornerClass + ' br"><span class="cr">' + rankLabel + '</span><span class="cs">' + suitSvg + '</span></div>';
}

function renderBottomCards() {
    const container = document.getElementById('bottom-cards-display');
    const wasFaceDown = container.querySelector('.face-down') !== null;
    container.innerHTML = '';
    game.bottomCards.forEach((card, i) => {
        const div = document.createElement('div');
        div.className = 'card small';
        if (game.phase === Phase.PLAY || game.phase === Phase.RESULT) {
            if (wasFaceDown) {
                div.classList.add('face-down');
                setTimeout(function() {
                    div.classList.remove('face-down');
                    div.classList.add('face-up');
                    div.classList.add('flip-anim');
                    div.style.animationDelay = (i * 150) + 'ms';
                    const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
                    const isJk = card.is_joker;
                    if (isJk) div.classList.add(card.rank === Rank.JOKER_BIG ? 'joker-red' : 'joker-black');
                    else div.classList.add(isRed ? 'red' : 'black');
                    div.innerHTML = makeCardHTML(card.rank, card.suit, isJk, isRed);
                }, 300 + i * 150);
            } else {
                div.classList.add('face-up');
                const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
                const isJk = card.is_joker;
                if (isJk) div.classList.add(card.rank === Rank.JOKER_BIG ? 'joker-red' : 'joker-black');
                else div.classList.add(isRed ? 'red' : 'black');
                div.innerHTML = makeCardHTML(card.rank, card.suit, isJk, isRed);
            }
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
        label.textContent = SEAT_NAMES[ownerSeat] + '出牌' + (at.pattern === 'Single' ? ': ' + RANK_SYMBOLS[at.cards[0].rank] : ': ' + (at.pattern_name || ''));
        display.innerHTML = '';
        (at.cards || []).forEach((card, i) => {
            const div = document.createElement('div');
            div.className = 'card face-up play-appear';
            div.style.animationDelay = (i * 30) + 'ms';
            const isRed = card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS;
            const isJoker = card.is_joker;
            if (isJoker) div.classList.add(card.rank === Rank.JOKER_BIG ? 'joker-red' : 'joker-black');
            else div.classList.add(isRed ? 'red' : 'black');
            div.innerHTML = makeCardHTML(card.rank, card.suit, isJoker, isRed);
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

var counterOpen = false;
function toggleCounter() {
    counterOpen = !counterOpen;
    document.getElementById('counter-panel').style.display = counterOpen ? 'block' : 'none';
    if (counterOpen) renderCounter();
}
function renderCounter() {
    var grid = document.getElementById('counter-grid');
    grid.innerHTML = '';
    var RANK_NAMES = { 3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9', 10:'10', 11:'J', 12:'Q', 13:'K', 14:'A', 15:'2' };
    var ranks = [3,4,5,6,7,8,9,10,11,12,13,14,15];
    ranks.forEach(function(rank) {
        var remaining = game.getRemainingCount(rank);
        var item = document.createElement('div');
        item.className = 'counter-item' + (remaining === 0 ? ' done' : '');
        item.innerHTML = '<div class="c-rank">' + RANK_NAMES[rank] + '</div><div class="c-count">' + remaining + '</div>';
        grid.appendChild(item);
    });
    var jokers = [
        { name: '小王', remaining: game.getRemainingCount(Rank.JOKER_SMALL) },
        { name: '大王', remaining: game.getRemainingCount(Rank.JOKER_BIG) }
    ];
    jokers.forEach(function(j) {
        var item = document.createElement('div');
        item.className = 'counter-item' + (j.remaining === 0 ? ' done' : '');
        item.innerHTML = '<div class="c-rank">' + j.name + '</div><div class="c-count">' + j.remaining + '</div>';
        grid.appendChild(item);
    });
}

function renderAiPanels() {
    ['ai-left', 'ai-right'].forEach((name, i) => {
        const seat = i + 1;
        const isLandlord = game.landlordSeat === seat;
        const isActive = game.currentSeat === seat && game.phase === Phase.PLAY;
        document.getElementById(`${name}-role`).textContent = isLandlord ? '👑 地主' : (game.roles[seat] || '待定');
        document.getElementById(`${name}-count`).textContent = `${game.hands[seat].length}张`;
        document.getElementById(`${name}-panel`).classList.toggle('landlord-panel', isLandlord);
        document.getElementById(`${name}-panel`).classList.toggle('active-turn', isActive);
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
    var banner = document.getElementById('result-banner');
    var text = document.getElementById('result-text');
    var humanWon = (game.winnerSide === 'landlord' && game.landlordSeat === Seat.HUMAN) ||
                     (game.winnerSide === 'farmers' && game.landlordSeat !== Seat.HUMAN);
    if (humanWon) Sound.win(); else Sound.lose();

    var history = JSON.parse(localStorage.getItem('doudizhu_history') || '[]');
    history.push({ seed: game.seed, winner: game.winnerSide, landlord: game.landlordSeat, multiplier: game.multiplier, spring: game.springBonus, humanWon: humanWon, ts: Date.now() });
    if (history.length > 50) history.splice(0, history.length - 50);
    localStorage.setItem('doudizhu_history', JSON.stringify(history));

    var resultText = game.winnerSide === 'landlord' ? '地主' : '农民';
    resultText += '胜! 倍数: x' + game.multiplier;
    if (game.springBonus) resultText += game.springType === 'spring' ? ' 🌸春天!' : ' ❄️反春天!';
    text.textContent = resultText;
    text.style.color = humanWon ? '#4ade80' : '#f87171';

    var stats = document.getElementById('result-stats');
    var total = history.length;
    var wins = history.filter(function(h) { return h.humanWon; }).length;
    var losses = total - wins;
    var springs = history.filter(function(h) { return h.spring; }).length;
    var winRate = total > 0 ? Math.round(wins / total * 100) : 0;
    stats.innerHTML = '<div class="stats-row"><span>总场次: ' + total + '</span><span>胜: ' + wins + '</span><span>负: ' + losses + '</span><span>春天: ' + springs + '</span></div><div class="stats-row"><span>胜率: ' + winRate + '%</span></div>';

    banner.style.display = 'block';
    banner.classList.remove('confetti');
    void banner.offsetWidth;
    banner.classList.add('confetti');
}

function toggleHelp() { alert('斗地主规则:\n\n1. 三人游戏，一人为地主，两人为农民\n2. 地主获得底牌，先出完牌获胜\n3. 牌型：单张、对子、三条、炸弹、火箭等\n4. 炸弹可压制普通牌型，火箭最大\n5. 农民合作对抗地主'); }
function toggleMute() { const m = Sound.toggleMute(); document.getElementById('btn-mute').textContent = m ? '🔇' : '🔊'; }
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function() {});
    } else {
        document.exitFullscreen();
    }
}

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
    if (saved.difficulty) { aiDifficulty = saved.difficulty; document.getElementById('setting-difficulty').value = saved.difficulty; game.aiDifficulty = aiDifficulty; }
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

function closeTutorial() {
    document.getElementById('tutorial-overlay').style.display = 'none';
    localStorage.setItem('doudizhu_tutorial_done', '1');
}
function checkTutorial() {
    if (!localStorage.getItem('doudizhu_tutorial_done')) {
        document.getElementById('tutorial-overlay').style.display = 'flex';
    }
}

// Start game
newRound();
checkTutorial();
initCardInteractionsOnce();
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
                        Sound.error();
                        addLogEntry(0, '超时自动出牌', true);
                    }
                } else {
                    game.passTurn();
                    Sound.pass();
                    addLogEntry(0, '不出', true);
                }
                refreshUI();
            } else if (game.phase === Phase.BIDDING && game.currentSeat === Seat.HUMAN) {
                game.passBid(0);
                Sound.pass();
                addLogEntry(0, '不出', true);
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
    var container = document.getElementById('game-container');
    var o = { minSize: 4, maxSize: 8, minDist: 40, maxDist: 120, gravity: 0, fadeDuration: 600, shapes: ['circle'] };
    if (opts) { for (var k in opts) o[k] = opts[k]; }
    for (var i = 0; i < count; i++) {
        var p = document.createElement('div');
        p.className = 'particle';
        var size = o.minSize + Math.random() * (o.maxSize - o.minSize);
        var angle = Math.random() * Math.PI * 2;
        var dist = o.minDist + Math.random() * (o.maxDist - o.minDist);
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist - (o.gravity > 0 ? 30 : 0);
        var color = colors[Math.floor(Math.random() * colors.length)];
        var shape = o.shapes[Math.floor(Math.random() * o.shapes.length)];
        var br = shape === 'circle' ? '50%' : shape === 'square' ? '2px' : '0';
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
        spawnParticles(cx, cy, 40, ['#ff4444', '#ff8800', '#ffcc00', '#ff6600', '#ffffff'], { minSize: 3, maxSize: 12, maxDist: 200, gravity: 1.5, fadeDuration: 900, shapes: ['circle', 'square'] });
        for (var i = 0; i < 12; i++) {
            (function(idx) { setTimeout(function() { spawnParticles(cx, cy, 2, ['#ff4444', '#ff8800'], { minSize: 2, maxSize: 5, maxDist: 100 + idx * 15, fadeDuration: 500 }); }, idx * 30); })(i);
        }
    } else if (pattern === 'Rocket') {
        spawnParticles(cx, cy, 30, ['#ff00ff', '#ff44ff', '#ff88ff', '#ffff00', '#ffffff'], { minSize: 2, maxSize: 8, maxDist: 250, gravity: -0.8, fadeDuration: 800, shapes: ['circle'] });
        for (var i = 0; i < 10; i++) {
            (function(idx) { setTimeout(function() { spawnParticles(cx + (Math.random() - 0.5) * 20, cy - idx * 20, 3, ['#ff44ff', '#ffffff'], { minSize: 2, maxSize: 5, maxDist: 25, fadeDuration: 400 }); }, idx * 50); })(i);
        }
    } else {
        spawnParticles(cx, cy, 10, ['#f0d060', '#e8b830', '#ffffff'], { minSize: 2, maxSize: 6, maxDist: 70, fadeDuration: 450 });
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
