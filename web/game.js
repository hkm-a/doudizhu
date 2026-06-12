// Doudizhu Game Engine - Web Version
// Core game logic extracted from game.gd

const SEAT_NAMES = ["Player", "AI Left", "AI Right"];
const SEAT_COUNT = 3;
const CARDS_PER_PLAYER = 17;
const BOTTOM_CARDS_COUNT = 3;
const BID_TIMEOUT = 15000;
const PLAY_TIMEOUT = 30000;

const Phase = { SETUP: 0, DEAL: 1, BIDDING: 2, PLAY: 3, RESULT: 4 };
const Seat = { HUMAN: 0, AI_LEFT: 1, AI_RIGHT: 2 };
const Rank = { THREE: 3, FOUR: 4, FIVE: 5, SIX: 6, SEVEN: 7, EIGHT: 8, NINE: 9, TEN: 10, JACK: 11, QUEEN: 12, KING: 13, ACE: 14, TWO: 15, JOKER_SMALL: 16, JOKER_BIG: 17 };
const Suit = { SPADES: 0, HEARTS: 1, DIAMONDS: 2, CLUBS: 3 };

const RANK_SYMBOLS = {
    [Rank.THREE]: "3", [Rank.FOUR]: "4", [Rank.FIVE]: "5", [Rank.SIX]: "6", [Rank.SEVEN]: "7",
    [Rank.EIGHT]: "8", [Rank.NINE]: "9", [Rank.TEN]: "10", [Rank.JACK]: "J", [Rank.QUEEN]: "Q",
    [Rank.KING]: "K", [Rank.ACE]: "A", [Rank.TWO]: "2", [Rank.JOKER_SMALL]: "SJ", [Rank.JOKER_BIG]: "BJ"
};

const SUIT_SYMBOLS = {
    [Suit.SPADES]: "♠", [Suit.HEARTS]: "♥", [Suit.DIAMONDS]: "♦", [Suit.CLUBS]: "♣"
};

const SUIT_COLORS = {
    [Suit.SPADES]: "#000", [Suit.HEARTS]: "#d00", [Suit.DIAMONDS]: "#d00", [Suit.CLUBS]: "#000"
};

/**
 * 斗地主游戏引擎 - 纯逻辑层，不依赖 DOM
 * 支持完整斗地主规则、AI对手、卡牌追踪
 */
class DoudizhuGame {
    constructor() {
        this.phase = Phase.SETUP;
        this.currentSeat = Seat.HUMAN;
        this.landlordSeat = -1;
        this.hands = [[], [], []];
        this.bottomCards = [];
        this.roles = ["", "", ""];
        this.selectedCards = [];
        this.activeTrick = {};
        this.recentPlays = ["", "", ""];
        this.aiReasons = ["", "", ""];
        this.bidAmount = 0;
        this.bidCounter = 0;
        this.highestBid = 0;
        this.highestBidder = -1;
        this.bidPassed = [false, false, false];
        this.initiativeSeat = -1;
        this.consecutivePasses = 0;
        this.winnerSide = "";
        this.winnerSeat = -1;
        this.handNumber = 0;
        this.multiplier = 1;
        this.timerRemaining = 0;
        this.timerActive = false;
        this.seed = 7;
        this.aiDifficulty = 'normal';
    }

    /** 开始新一局：洗牌、发牌、进入叫分阶段 */
    newRound(roundSeed = 7) {
        this.seed = roundSeed;
        this.handNumber++;
        this.hands = [[], [], []];
        this.bottomCards = [];
        this.roles = ["", "", ""];
        this.selectedCards = [];
        this.activeTrick = {};
        this.recentPlays = ["", "", ""];
        this.aiReasons = ["", "", ""];
        this.bidAmount = 0; this.bidCounter = 0; this.highestBid = 0; this.highestBidder = -1;
        this.bidPassed = [false, false, false];
        this.initiativeSeat = -1; this.consecutivePasses = 0;
        this.winnerSide = ""; this.winnerSeat = -1; this.multiplier = 1;
        this.seatPlayed = [false, false, false]; this.springBonus = false; this.springType = "";
        this.playedCards = []; this.playedRanks = {};

        const deck = this._createFullDeck();
        this._shuffle(deck);

        for (let i = 0; i < CARDS_PER_PLAYER * 3; i++) {
            this.hands[i % 3].push(deck[i]);
        }
        this.bottomCards = deck.slice(CARDS_PER_PLAYER * 3);
        for (let seat = 0; seat < 3; seat++) {
            this.hands[seat].sort((a, b) => a.rank - b.rank);
        }

        this.phase = Phase.BIDDING;
        this.currentSeat = Seat.HUMAN;
        this.timerRemaining = BID_TIMEOUT;
        this.timerActive = true;
    }

    /** 叫分：玩家出价，返回是否成功 */
    callBid(playerSeat, points) {
        if (this.phase !== Phase.BIDDING || this.currentSeat !== playerSeat) return false;
        if (this.bidPassed[playerSeat]) return false;
        if (points < 1 || points > 3) return false;
        if (this.bidCounter > 0 && points <= this.highestBid) return false;

        this.bidAmount = points; this.highestBid = points; this.highestBidder = playerSeat;
        this.bidCounter++;
        if (this._biddingComplete()) {
            this._resolveLandlord();
            return true;
        }
        this._nextBidder();
        return true;
    }

    passBid(playerSeat) {
        if (this.phase !== Phase.BIDDING || this.currentSeat !== playerSeat) return false;
        if (this.bidPassed[playerSeat]) return false;
        this.bidPassed[playerSeat] = true;
        this.bidCounter++;
        if (this._biddingComplete()) {
            this._resolveLandlord();
            return true;
        }
        this._nextBidder();
        return true;
    }

    /** 出牌：打出选中的牌，返回是否成功 */
    playSelected() {
        if (this.phase !== Phase.PLAY || this.currentSeat !== Seat.HUMAN) return false;
        const playCards = this._getSelectedCardDicts();
        if (playCards.length === 0) return false;
        const classified = this.classifyCards(playCards);
        if (classified.pattern === "INVALID") return false;
        if (Object.keys(this.activeTrick).length > 0 && this.initiativeSeat !== Seat.HUMAN) {
            if (!this.canBeat(classified, this.activeTrick)) return false;
        }
        this._executePlay(Seat.HUMAN, playCards, classified);
        return true;
    }

    passTurn() {
        if (this.phase !== Phase.PLAY || this.currentSeat !== Seat.HUMAN) return false;
        if (this.initiativeSeat === Seat.HUMAN) return false;
        this._executePass(Seat.HUMAN);
        return true;
    }

    /** 获取当前玩家的合法出牌列表 */
    getLegalPlays() {
        if (this.phase !== Phase.PLAY) return [];
        const hasInit = this.initiativeSeat === this.currentSeat;
        return this.findLegalPlays(this.hands[this.currentSeat], this.activeTrick, hasInit);
    }

    tickTimer(delta) {
        if (!this.timerActive) return false;
        this.timerRemaining -= delta;
        if (this.timerRemaining <= 0) {
            this.timerRemaining = 0;
            this.timerActive = false;
            if (this.phase === Phase.BIDDING) {
                if (!this.bidPassed[this.currentSeat]) {
                    this.bidPassed[this.currentSeat] = true;
                    this.bidCounter++;
                    if (this._biddingComplete()) {
                        this._resolveLandlord();
                        return true;
                    }
                    this._nextBidder();
                }
                return true;
            } else if (this.phase === Phase.PLAY) {
                if (this.initiativeSeat === this.currentSeat) {
                    const smallest = this._findSmallestSingle(this.currentSeat);
                    if (smallest.length > 0) {
                        const classified = this.classifyCards(smallest);
                        this._executePlay(this.currentSeat, smallest, classified);
                        return true;
                    }
                } else {
                    this._executePass(this.currentSeat);
                    return true;
                }
            }
        }
        return false;
    }

    processAiTurns(maxSteps = 6) {
        let steps = 0;
        while (this.phase === Phase.PLAY && this.currentSeat !== Seat.HUMAN && steps < maxSteps) {
            this._aiStep(this.currentSeat);
            steps++;
        }
        return this.phase === Phase.PLAY && this.currentSeat === Seat.HUMAN;
    }

    getTrickDisplay() {
        if (Object.keys(this.activeTrick).length === 0) return "";
        const cards = this.activeTrick.cards || [];
        return cards.map(c => this._cardLabel(c.id)).join(" ");
    }

    getHandSummary() {
        const rankCounts = this._countRanksInHand(Seat.HUMAN);
        let singles = 0, pairs = 0, triples = 0, bombs = 0;
        for (const rank in rankCounts) {
            const count = rankCounts[rank];
            if (count === 1) singles++;
            else if (count === 2) pairs++;
            else if (count === 3) triples++;
            else if (count >= 4) bombs++;
        }
        return `Hand: ${this.hands[Seat.HUMAN].length} cards | singles ${singles} | pairs ${pairs} | triples ${triples} | bombs ${bombs}`;
    }

    toggleSelection(cardId) {
        const idx = this.selectedCards.indexOf(cardId);
        if (idx >= 0) this.selectedCards.splice(idx, 1);
        else this.selectedCards.push(cardId);
    }

    // ==================== PRIVATE ====================

    _createFullDeck() {
        const deck = [];
        for (let i = 0; i < 54; i++) {
            let rank = (i % 13) + 3;
            let suit = Math.floor(i / 13);
            let isJoker = false;
            let label = "";
            if (i < 52) {
                label = RANK_SYMBOLS[rank] + SUIT_SYMBOLS[suit];
            } else if (i === 52) {
                rank = Rank.JOKER_SMALL; label = "SJ"; isJoker = true;
            } else {
                rank = Rank.JOKER_BIG; label = "BJ"; isJoker = true;
            }
            deck.push({ id: i, rank, suit, is_joker: isJoker, label });
        }
        return deck;
    }

    _shuffle(deck) {
        const rng = this._createRNG(this.seed);
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    _createRNG(seed) {
        let s = seed;
        return function() {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    }

    _nextBidder() {
        if (this._biddingComplete()) return;
        this.currentSeat = (this.currentSeat + 1) % SEAT_COUNT;
        let attempts = 0;
        while (this.bidPassed[this.currentSeat] && attempts < SEAT_COUNT) {
            this.currentSeat = (this.currentSeat + 1) % SEAT_COUNT;
            attempts++;
        }
        if (this.bidCounter >= 3 && this.highestBidder >= 0) {
            if (this.bidCounter >= SEAT_COUNT) {
                this._resolveLandlord();
                return;
            }
        }
        if (this.bidCounter >= 3) {
            if (this.bidPassed[0] && this.bidPassed[1] && this.bidPassed[2]) {
                this._resolveLandlord();
                return;
            }
        }
        this.timerRemaining = BID_TIMEOUT;
        this.timerActive = true;
    }

    _biddingComplete() {
        if (this.bidCounter >= 3 && this.highestBidder >= 0) return true;
        if (this.bidCounter >= 3 && this.bidPassed[0] && this.bidPassed[1] && this.bidPassed[2]) return true;
        return false;
    }

    _resolveLandlord() {
        this.landlordSeat = this.highestBidder >= 0 ? this.highestBidder : Seat.HUMAN;
        this.roles[this.landlordSeat] = "地主";
        this.roles[(this.landlordSeat + 1) % SEAT_COUNT] = "农民";
        this.roles[(this.landlordSeat + 2) % SEAT_COUNT] = "农民";
        this.hands[this.landlordSeat].push(...this.bottomCards);
        this.hands[this.landlordSeat].sort((a, b) => a.rank - b.rank);
        this.phase = Phase.PLAY;
        this.currentSeat = this.landlordSeat;
        this.initiativeSeat = this.landlordSeat;
        this.consecutivePasses = 0;
        this.activeTrick = {};
        this.timerRemaining = PLAY_TIMEOUT;
        this.timerActive = true;
    }

    _executePlay(seat, playCards, classified) {
        for (const card of playCards) {
            this._removeCard(seat, card.id);
            this.playedCards.push(card);
            this.playedRanks[card.rank] = (this.playedRanks[card.rank] || 0) + 1;
        }
        this.activeTrick = { ...classified, cards: playCards };
        this.activeTrick.owner_seat = seat;
        this.recentPlays[seat] = classified.pattern_name;
        this.selectedCards = [];
        this.consecutivePasses = 0;
        this.initiativeSeat = seat;
        this.seatPlayed[seat] = true;
        if (classified.pattern === "Bomb") this.multiplier *= 2;
        else if (classified.pattern === "Rocket") this.multiplier *= 2;
        if (this.hands[seat].length === 0) {
            this.phase = Phase.RESULT;
            this.winnerSeat = seat;
            this.winnerSide = seat === this.landlordSeat ? "landlord" : "farmers";
            const isSpring = this.winnerSide === "landlord" && !this.seatPlayed[1] && !this.seatPlayed[2];
            const isAntiSpring = this.winnerSide === "farmers" && !this.seatPlayed[this.landlordSeat];
            if (isSpring || isAntiSpring) {
                this.springBonus = true;
                this.springType = isSpring ? "spring" : "anti-spring";
                this.multiplier *= 3;
            }
            return;
        }
        this.currentSeat = (seat + 1) % SEAT_COUNT;
        this.timerRemaining = PLAY_TIMEOUT;
        this.timerActive = true;
    }

    _executePass(seat) {
        this.recentPlays[seat] = "Pass";
        this.consecutivePasses++;
        if (this.consecutivePasses >= 2 && Object.keys(this.activeTrick).length > 0) {
            this.currentSeat = this.activeTrick.owner_seat;
            this.initiativeSeat = this.currentSeat;
            this.consecutivePasses = 0;
        } else {
            this.currentSeat = (seat + 1) % SEAT_COUNT;
        }
        this.timerRemaining = PLAY_TIMEOUT;
        this.timerActive = true;
    }

    _aiStep(seat) {
        const hasInit = this.initiativeSeat === seat;
        const legalPlays = this.findLegalPlays(this.hands[seat], this.activeTrick, hasInit);
        if (legalPlays.length === 0) {
            this.aiReasons[seat] = "No legal response";
            this._executePass(seat);
            return;
        }
        const bestPlay = this._aiSelectPlay(legalPlays, seat, hasInit);
        if (bestPlay === null) {
            this.aiReasons[seat] = "Let partner win";
            this._executePass(seat);
            return;
        }
        const classified = this.classifyCards(bestPlay);
        this.aiReasons[seat] = classified.pattern_name;
        this._executePlay(seat, bestPlay, classified);
    }

    _aiSelectPlay(legalPlays, seat, hasInit) {
        const safePlays = [], bombs = [], rocket = [];
        for (const play of legalPlays) {
            if (play.pattern === "Bomb") bombs.push(play);
            else if (play.pattern === "Rocket") rocket.push(play);
            else safePlays.push(play);
        }

        const isLandlord = seat === this.landlordSeat;
        const partner = (seat + 2) % SEAT_COUNT;
        const landlord = this.landlordSeat;
        const opponent = isLandlord ? partner : landlord;
        const landlordCards = this.hands[landlord].length;
        const partnerCards = this.hands[partner].length;
        const myCards = this.hands[seat].length;

        const cheapFirst = (a, b) => a.primary_rank - b.primary_rank;
        const biggestFirst = (a, b) => b.cards.length - a.cards.length || a.primary_rank - b.primary_rank;

        if (hasInit) {
            if (isLandlord) {
                safePlays.sort(cheapFirst);
                if (safePlays.length > 0) return safePlays[0].cards;
            } else {
                if (partnerCards <= 2 && safePlays.length > 0) {
                    safePlays.sort(cheapFirst);
                    return safePlays[0].cards;
                }
                safePlays.sort(biggestFirst);
                if (safePlays.length > 0) return safePlays[0].cards;
            }
        } else {
            const isPartnerLeading = this.initiativeSeat === partner;
            if (!isLandlord && isPartnerLeading) {
                if (myCards <= 2 || landlordCards <= 2) {
                    safePlays.sort(cheapFirst);
                    if (safePlays.length > 0) return safePlays[0].cards;
                }
                const partnerTrick = this.activeTrick;
                const partnerHigh = partnerTrick.primary_rank >= 14;
                if (partnerHigh) return null;
                safePlays.sort(cheapFirst);
                if (safePlays.length > 0) return safePlays[0].cards;
            }

            safePlays.sort(cheapFirst);
            if (safePlays.length > 0) return safePlays[0].cards;

            const bombThreshold = isLandlord ? 5 : 4;
            if (this.aiDifficulty === 'easy') {
                if (safePlays.length > 0) return safePlays[0].cards;
            } else if (this.aiDifficulty === 'hard') {
                if (bombs.length > 0 && landlordCards <= 8) { bombs.sort(cheapFirst); return bombs[0].cards; }
                if (rocket.length > 0 && landlordCards <= 5) return rocket[0].cards;
                safePlays.sort(cheapFirst);
                if (safePlays.length > 0) return safePlays[0].cards;
            } else {
                if (bombs.length > 0 && landlordCards <= bombThreshold) {
                    bombs.sort(cheapFirst);
                    return bombs[0].cards;
                }
                if (rocket.length > 0 && landlordCards <= 3) return rocket[0].cards;
                safePlays.sort(cheapFirst);
                if (safePlays.length > 0) return safePlays[0].cards;
            }
        }

        if (safePlays.length > 0) { safePlays.sort(cheapFirst); return safePlays[0].cards; }
        if (bombs.length > 0) { bombs.sort(cheapFirst); return bombs[0].cards; }
        if (rocket.length > 0) return rocket[0].cards;
        return legalPlays[0].cards;
    }

    /** 手牌评分：用于 AI 叫分决策 */
    evaluateHand(seat) {
        const hand = this.hands[seat];
        let score = 0;
        const rc = {};
        for (const c of hand) rc[c.rank] = (rc[c.rank] || 0) + 1;
        for (const r in rc) {
            const rank = parseInt(r);
            if (rank === Rank.JOKER_BIG) score += 3;
            else if (rank === Rank.JOKER_SMALL) score += 2;
            else if (rank === 15) score += rc[r];
            else if (rc[r] === 4) score += 4;
            else if (rc[r] === 3) score += 1;
        }
        if (hand.some(c => c.rank === Rank.JOKER_BIG) && hand.some(c => c.rank === Rank.JOKER_SMALL)) score += 3;
        const ranks = Object.keys(rc).map(Number).sort((a, b) => a - b);
        for (let i = 0; i < ranks.length - 2; i++) {
            if (ranks[i + 2] - ranks[i] === 2 && rc[ranks[i]] >= 3 && rc[ranks[i + 1]] >= 3 && rc[ranks[i + 2]] >= 3) score += 2;
        }
        return score;
    }

    _findSmallestSingle(seat) {
        for (const card of this.hands[seat]) {
            return [card];
        }
        return [];
    }

    _countRanksInHand(seat) {
        const counts = {};
        for (const card of this.hands[seat]) {
            counts[card.rank] = (counts[card.rank] || 0) + 1;
        }
        return counts;
    }

    getRemainingCount(rank) {
        return 4 - (this.playedRanks[rank] || 0);
    }

    getUnplayedCards(excludeSeat) {
        const played = new Set(this.playedCards.map(c => c.id));
        const all = [];
        for (let s = 0; s < SEAT_COUNT; s++) {
            if (s === excludeSeat) continue;
            for (const c of this.hands[s]) all.push(c);
        }
        return all.filter(c => !played.has(c.id));
    }

    _removeCard(seat, cardId) {
        const idx = this.hands[seat].findIndex(c => c.id === cardId);
        if (idx >= 0) this.hands[seat].splice(idx, 1);
    }

    _getSelectedCardDicts() {
        return this.selectedCards
            .map(id => this.hands[Seat.HUMAN].find(c => c.id === id))
            .filter(c => c);
    }

    _cardLabel(cardId) {
        if (cardId >= 52) return cardId === 52 ? "SJ" : "BJ";
        const r = cardId % 13 + 3;
        const s = Math.floor(cardId / 13);
        return RANK_SYMBOLS[r] + SUIT_SYMBOLS[s];
    }

    // ==================== PATTERN RECOGNITION ====================

    /** 牌型识别：返回 { pattern, primary_rank, count, pattern_name, structural_length } */
    classifyCards(cards) {
        if (!cards || cards.length === 0) return { pattern: "INVALID", primary_rank: -1, count: 0, pattern_name: "无效牌" };
        const count = cards.length;
        const sorted = [...cards].sort((a, b) => a.rank - b.rank);
        const ranks = sorted.map(c => c.rank);
        const rankCounts = {};
        for (const r of ranks) rankCounts[r] = (rankCounts[r] || 0) + 1;
        let maxCount = 0;
        for (const v of Object.values(rankCounts)) if (v > maxCount) maxCount = v;

        if (maxCount === 1 && count === 1) return this._mk("Single", ranks[0], count, "单张");
        if (count === 2 && rankCounts[Rank.JOKER_SMALL] === 1 && rankCounts[Rank.JOKER_BIG] === 1) return this._mk("Rocket", -1, count, "火箭");
        if (maxCount === 4 && count === 4) return this._mk("Bomb", ranks[0], count, "炸弹");

        if (maxCount === 3) {
            const tripleRank = this._findRankCount(rankCounts, 3);
            if (count === 3) return this._mk("Triple", tripleRank, count, "三不带");
            if (count === 4) return this._mk("Triple+1", tripleRank, count, "三带一");
            if (count === 5) {
                const kickerRank = ranks.find(r => r !== tripleRank);
                if (kickerRank !== undefined && rankCounts[kickerRank] === 2) return this._mk("Triple+2", tripleRank, count, "三带二");
            }
            if (count >= 6 && count % 3 === 0) {
                if (this._isConsecutiveMap(rankCounts, count / 3, ranks))
                    return this._mk("Airplane", tripleRank, count, "飞机");
            }
            const airSingles = this._checkAirplaneKickers(rankCounts, ranks, count, 1);
            if (airSingles !== null) return this._mk("Airplane", airSingles, count, "飞机带单");
            const airPairs = this._checkAirplaneKickers(rankCounts, ranks, count, 2);
            if (airPairs !== null) return this._mk("Airplane", airPairs, count, "飞机带对");
        }

        if (maxCount === 2 && count === 2) return this._mk("Pair", ranks[0], count, "对子");
        if (maxCount === 1 && count >= 5) {
            if (this._isStraight(ranks, count)) return this._mk("Straight", ranks[0], count, "顺子");
        }
        if (maxCount === 2 && count >= 6 && count % 2 === 0) {
            const pairCount = count / 2;
            const pairRanks = Object.keys(rankCounts).filter(r => rankCounts[r] >= 2).map(Number).sort((a, b) => a - b);
            if (pairCount >= 3 && this._isConsecutiveMap(rankCounts, pairCount, pairRanks))
                return this._mk("Consecutive Pairs", pairRanks[0], count, "连对");
        }

        return { pattern: "INVALID", primary_rank: -1, count, pattern_name: "无效牌" };
    }

    _mk(pattern, pr, count, name) {
        return { pattern, primary_rank: pr, count, pattern_name: name, structural_length: this._structLen(pattern, count) };
    }

    _structLen(pattern, count) {
        if (pattern === "Straight") return count;
        if (pattern === "Consecutive Pairs") return count / 2;
        if (pattern === "Airplane") return count / 3;
        return 1;
    }

    _findRankCount(m, target) {
        let found = -1;
        for (const k in m) { if (m[k] === target) { const r = parseInt(k); if (found < 0 || r < found) found = r; } }
        return found;
    }

    _isConsecutiveMap(counts, expected, ranks) {
        const unique = [...new Set(ranks)].sort((a, b) => a - b);
        if (unique.length < expected) return false;
        if (unique[unique.length - 1] > 14) return false;
        for (let i = 0; i < unique.length - 1; i++) {
            if (unique[i + 1] - unique[i] !== 1) return false;
        }
        return true;
    }

    _checkAirplaneKickers(rankCounts, ranks, totalCards, kickerSize) {
        const tripleRanks = Object.keys(rankCounts).map(Number).filter(r => rankCounts[r] >= 3 && r <= 14).sort((a, b) => a - b);
        for (let n = 2; n <= tripleRanks.length; n++) {
            if (totalCards !== 3 * n + kickerSize * n) continue;
            for (let i = 0; i <= tripleRanks.length - n; i++) {
                let consecutive = true;
                for (let j = 0; j < n - 1; j++) {
                    if (tripleRanks[i + j + 1] - tripleRanks[i + j] !== 1) { consecutive = false; break; }
                }
                if (!consecutive) continue;
                const remaining = totalCards - 3 * n;
                if (remaining !== kickerSize * n) continue;
                if (kickerSize === 1) {
                    return tripleRanks[i];
                } else {
                    let pairCount = 0;
                    for (const r in rankCounts) {
                        const c = rankCounts[r] - (r >= tripleRanks[i] && r < tripleRanks[i] + n ? 3 : 0);
                        if (c > 0) pairCount += Math.floor(c / 2);
                    }
                    if (pairCount >= n) return tripleRanks[i];
                }
            }
        }
        return null;
    }

    _isStraight(ranks, length) {
        const unique = [...new Set(ranks)].sort((a, b) => a - b);
        if (unique.length < length) return false;
        if (unique[unique.length - 1] > 14) return false;
        for (let i = 0; i < unique.length - 1; i++) {
            if (unique[i + 1] - unique[i] !== 1) return false;
        }
        return true;
    }

    // ==================== COMPARISON ====================

    /** 牌型比较：判断 classified 能否压过 trick */
    canBeat(classified, trick) {
        if (!trick || Object.keys(trick).length === 0) return true;
        const trickPattern = trick.pattern;
        const trickPr = trick.primary_rank;
        const trickCount = trick.count;

        if (classified.pattern === "Bomb" && trickPattern !== "Bomb" && trickPattern !== "Rocket") return true;
        if (classified.pattern === "Rocket") return true;
        if (classified.pattern !== trickPattern) return false;
        if (classified.count !== trickCount) return false;
        return classified.primary_rank > trickPr;
    }

    // ==================== VALIDATOR ====================

    findLegalPlays(hand, trick, hasInit) {
        const results = [];
        if (hasInit || Object.keys(trick).length === 0) {
            results.push(...this._allPatterns(hand));
        } else {
            const trickCount = trick.count;
            const trickPattern = trick.pattern;
            const trickPr = trick.primary_rank;
            results.push(...this._matchingPatterns(hand, trickPattern, trickPr, trickCount));
            results.push(...this._bombsGreater(hand, trickPr));
            if (this._hasRocket(hand)) {
                results.push({ cards: this._findRocket(hand), pattern: "Rocket", primary_rank: 17, pattern_name: "火箭", structural_length: 1 });
            }
        }
        return results;
    }

    _allPatterns(hand) {
        const results = [];
        const rankCounts = {};
        for (const c of hand) rankCounts[c.rank] = (rankCounts[c.rank] || 0) + 1;

        // Singles
        for (const card of hand) {
            results.push({ cards: [card], pattern: "Single", primary_rank: card.rank, pattern_name: "单张", structural_length: 1 });
        }

        // Pairs
        for (const rank in rankCounts) {
            if (rankCounts[rank] >= 2) {
                const pair = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 2) break; if (card.rank == rank) { pair.push(card); cnt++; } }
                results.push({ cards: pair, pattern: "Pair", primary_rank: parseInt(rank), pattern_name: "对子", structural_length: 1 });
            }
        }

        // Triples
        for (const rank in rankCounts) {
            if (rankCounts[rank] >= 3) {
                const triple = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                results.push({ cards: triple, pattern: "Triple", primary_rank: parseInt(rank), pattern_name: "三条", structural_length: 1 });
            }
        }

        // Triple+1
        for (const rank in rankCounts) {
            if (rankCounts[rank] >= 3) {
                const triple = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                for (const card of hand) {
                    if (card.rank != rank) {
                        results.push({ cards: [...triple, card], pattern: "Triple+1", primary_rank: parseInt(rank), pattern_name: "三带一", structural_length: 1 });
                        break;
                    }
                }
            }
        }

        // Triple+2
        for (const rank in rankCounts) {
            if (rankCounts[rank] >= 3) {
                const triple = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                for (const card1 of hand) {
                    if (card1.rank != rank) {
                        for (const card2 of hand) {
                            if (card2.rank != rank && card2.rank === card1.rank) {
                                results.push({ cards: [...triple, card1, card2], pattern: "Triple+2", primary_rank: parseInt(rank), pattern_name: "三带对", structural_length: 1 });
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }

        // Bombs
        for (const rank in rankCounts) {
            if (rankCounts[rank] >= 4 && parseInt(rank) < Rank.JOKER_SMALL) {
                const bomb = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 4) break; if (card.rank == rank) { bomb.push(card); cnt++; } }
                results.push({ cards: bomb, pattern: "Bomb", primary_rank: parseInt(rank), pattern_name: "炸弹", structural_length: 1 });
            }
        }

        // Rocket
        if (this._hasRocket(hand)) {
            results.push({ cards: this._findRocket(hand), pattern: "Rocket", primary_rank: 17, pattern_name: "火箭", structural_length: 1 });
        }

        // Straights, Consecutive Pairs, Airplanes
        this._resultsStraights(hand, results);
        this._resultsConsecPairs(hand, results);
        this._resultsAirplanes(hand, results);

        return results;
    }

    _resultsStraights(hand, results) {
        const rc = {};
        for (const c of hand) if (c.rank <= 14) rc[c.rank] = (rc[c.rank] || 0) + 1;
        const sortedRanks = Object.keys(rc).map(Number).sort((a, b) => a - b);
        if (sortedRanks.length < 5) return;

        const runs = [];
        let runStart = sortedRanks[0], runLen = 1;
        for (let i = 1; i < sortedRanks.length; i++) {
            if (sortedRanks[i] === sortedRanks[i - 1] + 1) runLen++;
            else { if (runLen >= 5) runs.push({ start: runStart, len: runLen }); runStart = sortedRanks[i]; runLen = 1; }
        }
        if (runLen >= 5) runs.push({ start: runStart, len: runLen });

        for (const run of runs) {
            for (let len = 5; len <= run.len; len++) {
                for (let start = run.start; start <= run.start + run.len - len; start++) {
                    const straight = []; let ok = true;
                    for (let offset = 0; offset < len; offset++) {
                        let found = false;
                        for (const card of hand) { if (card.rank === start + offset) { straight.push(card); found = true; break; } }
                        if (!found) { ok = false; break; }
                    }
                    if (ok) results.push({ cards: straight, pattern: "Straight", primary_rank: start, pattern_name: "顺子", structural_length: len });
                }
            }
        }
    }

    _resultsConsecPairs(hand, results) {
        const rc = {};
        for (const c of hand) if (c.rank <= 14 && (rc[c.rank] = (rc[c.rank] || 0) + 1) >= 2) { }
        const validRanks = Object.keys(rc).map(Number).filter(r => rc[r] >= 2 && r <= 14).sort((a, b) => a - b);

        const runs = [];
        let runStart = validRanks[0] || 0, runLen = 0;
        for (let i = 0; i < validRanks.length; i++) {
            if (i === 0) { runStart = validRanks[0]; runLen = 1; }
            else if (validRanks[i] === validRanks[i - 1] + 1) runLen++;
            else { if (runLen >= 3) runs.push({ start: runStart, len: runLen }); runStart = validRanks[i]; runLen = 1; }
        }
        if (runLen >= 3) runs.push({ start: runStart, len: runLen });

        for (const run of runs) {
            for (let pairCount = 3; pairCount <= run.len; pairCount++) {
                for (let start = run.start; start <= run.start + run.len - pairCount; start++) {
                    const pairs = [];
                    for (let offset = 0; offset < pairCount; offset++) {
                        let cnt = 0;
                        for (const card of hand) { if (card.rank === start + offset && cnt < 2) { pairs.push(card); cnt++; } }
                    }
                    if (pairs.length === pairCount * 2) results.push({ cards: pairs, pattern: "Consecutive Pairs", primary_rank: start, pattern_name: "连对", structural_length: pairCount });
                }
            }
        }
    }

    _resultsAirplanes(hand, results) {
        const rc = {};
        for (const c of hand) rc[c.rank] = (rc[c.rank] || 0) + 1;
        const validRanks = Object.keys(rc).map(Number).filter(r => rc[r] >= 3 && r <= 14).sort((a, b) => a - b);
        if (validRanks.length < 2) return;

        const runs = [];
        let runStart = validRanks[0], runLen = 1;
        for (let i = 1; i < validRanks.length; i++) {
            if (validRanks[i] === validRanks[i - 1] + 1) runLen++;
            else { if (runLen >= 2) runs.push({ start: runStart, len: runLen }); runStart = validRanks[i]; runLen = 1; }
        }
        if (runLen >= 2) runs.push({ start: runStart, len: runLen });

        for (const run of runs) {
            for (let s = run.start; s <= run.start + run.len - 2; s++) {
                for (let n = 2; n <= run.start + run.len - s; n++) {
                    const combo = [];
                    for (let offset = 0; offset < n; offset++) {
                        let cnt = 0;
                        for (const card of hand) { if (card.rank === s + offset && cnt < 3) { combo.push(card); cnt++; } }
                    }
                    if (combo.length !== n * 3) continue;
                    results.push({ cards: combo, pattern: "Airplane", primary_rank: s, pattern_name: "飞机", structural_length: n });

                    const usedIds = new Set(combo.map(c => c.id));
                    const kickers = hand.filter(c => !usedIds.has(c.id));
                    if (kickers.length >= n) {
                        results.push({ cards: [...combo, ...kickers.slice(0, n)], pattern: "Airplane", primary_rank: s, pattern_name: "飞机带单", structural_length: n });
                    }
                    const pairRanks = {};
                    for (const c of kickers) pairRanks[c.rank] = (pairRanks[c.rank] || 0) + 1;
                    const pairKickers = [];
                    for (const r in pairRanks) {
                        if (pairRanks[r] >= 2 && pairKickers.length < n * 2) {
                            let cnt = 0;
                            for (const c of kickers) { if (c.rank == r && cnt < 2) { pairKickers.push(c); cnt++; } }
                        }
                    }
                    if (pairKickers.length >= n * 2) {
                        results.push({ cards: [...combo, ...pairKickers.slice(0, n * 2)], pattern: "Airplane", primary_rank: s, pattern_name: "飞机带对", structural_length: n });
                    }
                }
            }
        }
    }

    _matchingPatterns(hand, trickPattern, trickPr, trickCount) {
        const results = [];
        const rc = {};
        for (const c of hand) rc[c.rank] = (rc[c.rank] || 0) + 1;

        switch (trickPattern) {
            case "Single":
                for (const card of hand) {
                    if (card.rank > trickPr)
                        results.push({ cards: [card], pattern: "Single", primary_rank: card.rank, pattern_name: "单张", structural_length: 1 });
                }
                break;
            case "Pair":
                for (const rank in rc) {
                    if (rc[rank] >= 2 && parseInt(rank) > trickPr) {
                        const pair = []; let cnt = 0;
                        for (const card of hand) { if (cnt >= 2) break; if (card.rank == rank) { pair.push(card); cnt++; } }
                        results.push({ cards: pair, pattern: "Pair", primary_rank: parseInt(rank), pattern_name: "对子", structural_length: 1 });
                    }
                }
                break;
            case "Triple":
                for (const rank in rc) {
                    if (rc[rank] >= 3 && parseInt(rank) > trickPr) {
                        const triple = []; let cnt = 0;
                        for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                        results.push({ cards: triple, pattern: "Triple", primary_rank: parseInt(rank), pattern_name: "三条", structural_length: 1 });
                    }
                }
                break;
            case "Triple+1":
                for (const rank in rc) {
                    if (rc[rank] >= 3 && parseInt(rank) > trickPr) {
                        const triple = []; let cnt = 0;
                        for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                        for (const card of hand) {
                            if (card.rank != rank) { results.push({ cards: [...triple, card], pattern: "Triple+1", primary_rank: parseInt(rank), pattern_name: "三带一", structural_length: 1 }); break; }
                        }
                    }
                }
                break;
            case "Triple+2":
                for (const rank in rc) {
                    if (rc[rank] >= 3 && parseInt(rank) > trickPr) {
                        const triple = []; let cnt = 0;
                        for (const card of hand) { if (cnt >= 3) break; if (card.rank == rank) { triple.push(card); cnt++; } }
                        for (const card1 of hand) {
                            if (card1.rank != rank) {
                                for (const card2 of hand) {
                                    if (card2.rank != rank && card2.rank === card1.rank) {
                                        results.push({ cards: [...triple, card1, card2], pattern: "Triple+2", primary_rank: parseInt(rank), count: 5, pattern_name: "三带对", structural_length: 1 });
                                        break;
                                    }
                                }
                                break;
                            }
                        }
                    }
                }
                break;
            case "Straight": {
                const len = trickCount;
                for (const startRank in rc) {
                    if (parseInt(startRank) > trickPr && parseInt(startRank) + len - 1 <= 14) {
                        const straight = []; let ok = true;
                        for (let offset = 0; offset < len; offset++) {
                            let found = false;
                            for (const card of hand) { if (card.rank === parseInt(startRank) + offset) { straight.push(card); found = true; break; } }
                            if (!found) { ok = false; break; }
                        }
                        if (ok && straight.length === len)
                            results.push({ cards: straight, pattern: "Straight", primary_rank: parseInt(startRank), pattern_name: "顺子", structural_length: len });
                    }
                }
                break;
            }
            case "Consecutive Pairs": {
                const pcount = trickCount / 2;
                for (const startRank in rc) {
                    if (parseInt(startRank) > trickPr && parseInt(startRank) + pcount - 1 <= 14) {
                        const consec = []; let ok = true;
                        for (let offset = 0; offset < pcount; offset++) {
                            const pair = [];
                            for (const card of hand) { if (card.rank === parseInt(startRank) + offset && pair.length < 2) pair.push(card); }
                            if (pair.length < 2) { ok = false; break; }
                            consec.push(...pair);
                        }
                        if (ok && consec.length === trickCount)
                            results.push({ cards: consec, pattern: "Consecutive Pairs", primary_rank: parseInt(startRank), pattern_name: "连对", structural_length: pcount });
                    }
                }
                break;
            }
            case "Airplane": {
                const variants = [];
                if (trickCount % 3 === 0 && trickCount / 3 >= 2) variants.push({ triples: trickCount / 3, kicker: 0 });
                if (trickCount % 4 === 0 && trickCount / 4 >= 2) variants.push({ triples: trickCount / 4, kicker: 1 });
                if (trickCount % 5 === 0 && trickCount / 5 >= 2) variants.push({ triples: trickCount / 5, kicker: 2 });
                for (const v of variants) {
                    for (const startRank in rc) {
                        if (parseInt(startRank) > trickPr && parseInt(startRank) + v.triples - 1 <= 14) {
                            const combo = []; let ok = true;
                            for (let offset = 0; offset < v.triples; offset++) {
                                const rank = parseInt(startRank) + offset;
                                if ((rc[rank] || 0) < 3) { ok = false; break; }
                                let cnt = 0;
                                for (const card of hand) { if (card.rank === rank && cnt < 3) { combo.push(card); cnt++; } }
                            }
                            if (!ok) continue;
                            if (v.kicker === 0) {
                                results.push({ cards: combo, pattern: "Airplane", primary_rank: parseInt(startRank), pattern_name: "飞机", structural_length: v.triples });
                            } else {
                                const used = new Set(combo.map(c => c.id));
                                const kickers = hand.filter(c => !used.has(c.id));
                                if (v.kicker === 1 && kickers.length >= v.triples) {
                                    results.push({ cards: [...combo, ...kickers.slice(0, v.triples)], pattern: "Airplane", primary_rank: parseInt(startRank), pattern_name: "飞机带单", structural_length: v.triples });
                                } else if (v.kicker === 2) {
                                    const pairRanks = {};
                                    for (const c of kickers) pairRanks[c.rank] = (pairRanks[c.rank] || 0) + 1;
                                    const pairList = [];
                                    for (const r in pairRanks) { if (pairRanks[r] >= 2) { let cnt = 0; for (const c of kickers) { if (c.rank == r && cnt < 2) { pairList.push(c); cnt++; } } if (pairList.length - (pairList.length % 2) < (v.triples * 2)) {} } }
                                    const pairKickers = [];
                                    for (const r in pairRanks) { if (pairRanks[r] >= 2 && pairKickers.length < v.triples * 2) { let cnt = 0; for (const c of kickers) { if (c.rank == r && cnt < 2) { pairKickers.push(c); cnt++; } } } }
                                    if (pairKickers.length >= v.triples * 2) {
                                        results.push({ cards: [...combo, ...pairKickers.slice(0, v.triples * 2)], pattern: "Airplane", primary_rank: parseInt(startRank), pattern_name: "飞机带对", structural_length: v.triples });
                                    }
                                }
                            }
                        }
                    }
                }
                break;
            }
        }
        return results;
    }

    _bombsGreater(hand, trickPr) {
        const results = [];
        const rc = {};
        for (const c of hand) rc[c.rank] = (rc[c.rank] || 0) + 1;
        for (const rank in rc) {
            if (rc[rank] >= 4 && parseInt(rank) > trickPr && parseInt(rank) < Rank.JOKER_SMALL) {
                const bomb = []; let cnt = 0;
                for (const card of hand) { if (cnt >= 4) break; if (card.rank == rank) { bomb.push(card); cnt++; } }
                results.push({ cards: bomb, pattern: "Bomb", primary_rank: parseInt(rank), pattern_name: "炸弹", structural_length: 1 });
            }
        }
        return results;
    }

    _hasRocket(hand) {
        let hasSmall = false, hasBig = false;
        for (const card of hand) {
            if (card.rank === Rank.JOKER_SMALL) hasSmall = true;
            if (card.rank === Rank.JOKER_BIG) hasBig = true;
        }
        return hasSmall && hasBig;
    }

    _findRocket(hand) {
        const rocket = [];
        for (const card of hand) {
            if (card.rank >= Rank.JOKER_SMALL) { rocket.push(card); if (rocket.length === 2) break; }
        }
        return rocket;
    }

    /** 获取提示：返回最优合法出牌 */
    getHint() {
        const plays = this.getLegalPlays();
        if (plays.length === 0) return null;
        const hasInit = this.initiativeSeat === Seat.HUMAN;
        const bestCards = this._aiSelectPlay(plays, Seat.HUMAN, hasInit);
        return bestCards;
    }
}

if (typeof module !== 'undefined') module.exports = DoudizhuGame;
