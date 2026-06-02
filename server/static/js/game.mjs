import {Poker, Rule} from '/static/js/rule.mjs'
import {Player, createPlay} from '/static/js/player.mjs'
import {Protocol, Socket} from '/static/js/net.mjs'

const GAME_OVER_RESTART_DELAY = 2000;

function getGameOverResult(isLandlordWinner) {
    if (isLandlordWinner) {
        return {
            title: '地主赢',
            detail: '地主守住牌桌',
            sound: 'music_win',
        };
    }
    return {
        title: '农民赢',
        detail: '农民合力获胜',
        sound: 'music_lose',
    };
}

class Observer {

    constructor() {
        this.state = {};
        this.subscribers = {};
    }

    get(key) {
        return this.state[key];
    }

    set(key, val) {
        const keys = key.split('.');
        if (keys.length === 1) {
            this.state[key] = val;
        } else {
            this.state[keys[0]][keys[1]] = val;
            key = keys[0];
        }
        const newVal = this.state[key];
        const subscribers = this.subscribers;
        if (subscribers.hasOwnProperty(key)) {
            subscribers[key].forEach(function (cb) {
                if (cb) cb(newVal);
            });
        }
    }

    subscribe(key, cb) {
        const subscribers = this.subscribers;
        if (subscribers.hasOwnProperty(key)) {
            subscribers[key].push(cb);
        } else {
            subscribers[key] = [cb];
        }
    }

    unsubscribe(key, cb) {
        const subscribers = this.subscribers;
        if (subscribers.hasOwnProperty(key)) {
            const index = subscribers[key].indexOf(cb);
            if (index > -1) {
                subscribers[key].splice(index, 1);
            }
        }
    }
}

const observer = new Observer();

export class Game {
    constructor(game) {
        this.players = [];

        this.tablePoker = [];
        this.tablePokerPic = {};

        this.lastShotPlayer = null;

        this.whoseTurn = 0;

        this.reconnectTimer = null;
        this.reconnectDelay = 1000;
        this.connectionText = null;
    }

    init(baseScore) {
        observer.set('baseScore', baseScore);
    }

    create() {
        Rule.RuleList = this.cache.getJSON('rule');
        this.stage.backgroundColor = '#182d3b';

        this.players.push(createPlay(0, this));
        this.players.push(createPlay(1, this));
        this.players.push(createPlay(2, this));
        this.players[0].updateInfo(window.playerInfo.uid, window.playerInfo.name);
        const protocol = location.protocol.startsWith("https") ? "wss://" : "ws://";
        this.socket = new Socket(protocol + location.host + "/ws");

        const width = this.game.world.width;
        const height = this.game.world.height;

        const titleBar = this.game.add.text(width / 2, 0, `房间号:${0} 底分: 0 倍数: 0`, {
            font: "22px",
            fill: "#fff",
            align: "center"
        });
        titleBar.anchor.set(0.5, 0);
        observer.subscribe('room', function (room) {
            titleBar.text = `房间号:${room.id} 底分: ${room.origin} 倍数: ${room.multiple}`;
        });

        this.connectionText = this.game.add.text(width / 2, 32, '', {
            font: "18px",
            fill: "#ffd86b",
            align: "center"
        });
        this.connectionText.anchor.set(0.5, 0);
        this.connectionText.visible = false;
        this.connectSocket();

        // 创建准备按钮
        const that = this;
        const countdown = this.game.add.text(width / 2, height / 2, '10', {
            font: "80px",
            fill: "#fff",
            align: "center"
        });
        countdown.anchor.set(0.5);
        countdown.visible = false;
        observer.subscribe('countdown', function (timer) {
            countdown.visible = timer >= 0;
            if (timer >= 0) {
                countdown.text = timer;
                that.game.time.events.add(1000, function () {
                    observer.set('countdown', observer.get('countdown') - 1);
                }, that);
            }
        });

        const ready = this.game.make.button(width / 2, height * 0.6, "btn", function () {
            this.send_message([Protocol.REQ_READY, {"ready": 1}]);
            observer.set('countdown', 10);
        }, this, 'ready.png', 'ready.png', 'ready.png');
        ready.anchor.set(0.5, 0);
        this.game.world.add(ready);

        observer.subscribe('ready', function (is_ready) {
            ready.visible = !is_ready;
        });

        // 创建抢地主按钮
        const group = this.game.add.group();
        let pass = this.game.make.button(width * 0.4, height * 0.6, "btn", function () {
            this.game.add.audio('f_score_0').play();
            this.send_message([Protocol.REQ_CALL_SCORE, {"rob": 0}]);
        }, this, 'score_0.png', 'score_0.png', 'score_0.png');
        pass.anchor.set(0.5, 0);
        group.add(pass);

        const rob = this.game.make.button(width * 0.6, height * 0.6, "btn", function () {
            this.game.add.audio('f_score_1').play();
            this.send_message([Protocol.REQ_CALL_SCORE, {"rob": 1}]);
        }, this, 'score_1.png', 'score_1.png', 'score_1.png');
        rob.anchor.set(0.5, 0);
        group.add(rob);
        group.visible = false;

        observer.subscribe('rob', function (is_rob) {
            group.visible = is_rob;
            observer.set('countdown', -1);
        });

        // GDD v0.2 G 章节：加倍阶段按钮 + HUD 状态
        const doubleGroup = this.game.add.group();
        const widthHalf = width;
        const heightHalf = height;
        const noDouble = this.game.add.text(widthHalf * 0.4, heightHalf * 0.6, '不加倍', {
            font: '32px', fill: '#ffaa55', align: 'center',
            backgroundColor: '#222', padding: {x: 18, y: 10},
        });
        noDouble.anchor.set(0.5, 0);
        noDouble.inputEnabled = true;
        noDouble.events.onInputDown.add(function () {
            this.send_message([Protocol.REQ_DOUBLE, {'double': 0}]);
            try { this.game.add.audio('pass_placeholder').play(); } catch (e) {}
            doubleGroup.visible = false;
        }, this);
        doubleGroup.add(noDouble);

        const yesDouble = this.game.add.text(widthHalf * 0.6, heightHalf * 0.6, '加倍', {
            font: '32px', fill: '#ffeb70', align: 'center',
            backgroundColor: '#553', padding: {x: 18, y: 10},
        });
        yesDouble.anchor.set(0.5, 0);
        yesDouble.inputEnabled = true;
        yesDouble.events.onInputDown.add(function () {
            this.send_message([Protocol.REQ_DOUBLE, {'double': 1}]);
            try { this.game.add.audio('double_placeholder').play(); } catch (e) {}
            doubleGroup.visible = false;
        }, this);
        doubleGroup.add(yesDouble);
        doubleGroup.visible = false;
        this.doubleGroup = doubleGroup;
        this.doubleTurnUid = -1;

        // GDD v0.2 G 章节：加倍阶段 HUD 状态
        this.doubleHud = this.game.add.text(width / 2, 64, '', {
            font: '20px', fill: '#ffd86b', align: 'center',
        });
        this.doubleHud.anchor.set(0.5, 0);
        this.doubleHud.visible = false;

        // GDD v0.2 H.3：段位 HUD（顶部右侧，显示当前玩家段位）
        this.segmentHud = this.game.add.text(width - 16, 8, 'GOLD · 0 分', {
            font: '18px', fill: '#94d9c3', align: 'right',
            backgroundColor: 'rgba(23, 35, 31, 0.86)', padding: {x: 8, y: 4},
        });
        this.segmentHud.anchor.set(1, 0);
        // GDD v0.2 H.7：段位 badge sprite（左侧紧贴段位 HUD）
        this.segmentBadge = this.game.add.image(width - 16 - 200, 8, 'segment-gold');
        this.segmentBadge.anchor.set(1, 0);
        this.segmentBadge.scale.set(0.4, 0.4);  // 80x80 → 32x32
        this._currentSegment = 'gold';
        observer.subscribe('segment', function (info) {
            if (info && info.label) {
                that.segmentHud.text = info.label;
            }
            if (info && info.segment && info.segment !== that._currentSegment) {
                that._currentSegment = info.segment;
                that.segmentBadge.loadTexture('segment-' + info.segment);
            }
        });

        observer.subscribe('double', function (info) {
            doubleGroup.visible = info && info.turn_uid === window.playerInfo.uid;
            if (info && info.turn_uid === window.playerInfo.uid) {
                observer.set('countdown', -1);
            }
        });
    }

    onopen() {
        console.log('socket onopen');
        this.reconnectDelay = 1000;
        this.setConnectionText('');
        this.socket.send([Protocol.REQ_ROOM_LIST, {}]);
        this.socket.send([Protocol.REQ_JOIN_ROOM, {"room": -1, "level": observer.get('baseScore')}]);
    }

    onerror() {
        console.log('socket onerror, schedule reconnect.');
        this.scheduleReconnect();
    }

    connectSocket() {
        this.setConnectionText('正在连接牌桌...');
        this.socket.connect(this.onopen.bind(this), this.onmessage.bind(this), this.onerror.bind(this));
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        const delay = this.reconnectDelay;
        this.setConnectionText(`连接已断开，${Math.ceil(delay / 1000)} 秒后重连...`);
        this.reconnectTimer = this.game.time.events.add(delay, function () {
            this.reconnectTimer = null;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
            this.connectSocket();
        }, this);
    }

    setConnectionText(message) {
        if (!this.connectionText) {
            return;
        }

        this.connectionText.text = message;
        this.connectionText.visible = Boolean(message);
    }

    send_message(request) {
        this.socket.send(request);
    }

    onmessage(message) {
        const code = message[0], packet = message[1];
        switch (code) {
            case Protocol.RSP_ROOM_LIST:
                console.log(code, packet);
                break;
            case Protocol.RSP_JOIN_ROOM:
                observer.set('room', packet['room']);
                const syncInfo = packet['players'];
                for (let i = 0; i < syncInfo.length; i++) {
                    if (syncInfo[i].uid === this.players[0].uid) {
                        let info_1 = syncInfo[(i + 1) % 3];
                        let info_2 = syncInfo[(i + 2) % 3];
                        this.players[1].updateInfo(info_1.uid, info_1.name);
                        this.players[2].updateInfo(info_2.uid, info_2.name);
                        this.players[0].setReady(syncInfo[i].ready);
                        this.players[1].setReady(info_1.ready);
                        this.players[2].setReady(info_2.ready);
                        observer.set('ready', Boolean(syncInfo[i].ready));
                        break;
                    }
                }
                break;
            case Protocol.RSP_READY:
                const readySeat = this.uidToSeat(packet['uid']);
                if (readySeat >= 0) {
                    this.players[readySeat].setReady(packet['ready']);
                }
                if (readySeat === 0) {
                    observer.set('ready', Boolean(packet['ready']));
                }
                break;
            case Protocol.RSP_DEAL_POKER: {
                const playerId = packet['uid'];
                const pokers = packet['pokers'];
                this.players.forEach(function (player) {
                    player.setReady(false);
                });
                this.dealPoker(pokers);
                this.whoseTurn = this.uidToSeat(playerId);
                this.startCallScore();
                break;
            }
            case Protocol.RSP_CALL_SCORE: {
                const playerId = packet['uid'];
                const rob = packet['rob'];
                const landlord = packet['landlord'];
                this.whoseTurn = this.uidToSeat(playerId);

                const hanzi = ['不抢', "抢地主"];
                this.players[this.whoseTurn].say(hanzi[rob]);

                observer.set('rob', false);
                if (landlord === -1) {
                    this.whoseTurn = (this.whoseTurn + 1) % 3;
                    this.startCallScore();
                } else {
                    this.whoseTurn = this.uidToSeat(landlord);
                    this.tablePoker[0] = packet['pokers'][0];
                    this.tablePoker[1] = packet['pokers'][1];
                    this.tablePoker[2] = packet['pokers'][2];
                    this.players[this.whoseTurn].setLandlord();
                    this.showLastThreePoker();
                    // GDD v0.2 G 章节：抢地主结束 → 进 DOUBLE 阶段
                    const room = observer.get('room') || {};
                    this.startDoublePhase(room);
                }
                observer.set('room.multiple', packet['multiple']);
                break;
            }
            case Protocol.RSP_DOUBLE: {
                // GDD v0.2 G 章节：加倍决策广播
                const room = observer.get('room') || {};
                if (packet['phase'] === 'end') {
                    observer.set('double', null);
                    if (this.doubleHud) {
                        this.doubleHud.text = '';
                        this.doubleHud.visible = false;
                    }
                    if (this.doubleGroup) this.doubleGroup.visible = false;
                    try { this.game.add.audio('shot').play(); } catch (e) {}
                } else {
                    // continue: another player is choosing; turn_uid is who
                    const turnUid = (room.double_turn_uid != null) ? room.double_turn_uid : -1;
                    observer.set('double', {turn_uid: turnUid, decisions: room.double_decisions || {}});
                    if (this.doubleHud) {
                        const decisions = room.double_decisions || {};
                        const summary = Object.keys(decisions).map(function (uid) {
                            return uid + ':' + (decisions[uid] ? '加倍' : '不加倍');
                        }).join('  ');
                        this.doubleHud.text = `加倍阶段  ${summary}  → 当前: ${turnUid}`;
                        this.doubleHud.visible = true;
                    }
                    try { this.game.add.audio('shot').play(); } catch (e) {}
                }
                observer.set('room.multiple', packet['multiple']);
                break;
            }
            case Protocol.RSP_SEGMENT_CHANGE: {
                // GDD v0.2 H.3：段位变更单播
                if (packet['uid'] === window.playerInfo.uid) {
                    const label = `${packet['new_segment'].toUpperCase()} · ${packet['new_points']} 分`;
                    this.updateSegmentHud(label);
                    // GDD v0.2 H.7：同时更新段位 badge sprite
                    if (this.segmentBadge) {
                        this.segmentBadge.loadTexture('segment-' + packet['new_segment']);
                    }
                    // GDD v0.2 H.5：弹段位变更 overlay（晋升 / 降级）
                    const oldLabel = `${packet['old_segment'].toUpperCase()} · ${packet['old_points']} 分`;
                    this.showSegmentChangeOverlay(packet['promoted'], packet['demoted'], oldLabel, label);
                    // 段位变更音效（用现有 shot 作为占位）
                    try { this.game.add.audio('shot').play(); } catch (e) {}
                }
                break;
            }
            case Protocol.RSP_SHOT_POKER:
                this.handleShotPoker(packet);
                observer.set('room.multiple', packet['multiple']);
                break;
            case Protocol.RSP_GAME_OVER: {
                const winner = packet['winner'];
                const that = this;
                packet['players'].forEach(function (player) {
                    const seat = that.uidToSeat(player['uid']);
                    if (seat > 0) {
                        that.players[seat].replacePoker(player['pokers'], 0);
                        that.players[seat].reDealPoker();
                    }
                });

                this.whoseTurn = this.uidToSeat(winner);
                this.showGameOverResult(this.whoseTurn);

                // GDD v0.2 H.3：游戏结束后更新本地段位 HUD（如果有 player[].segment 字段）
                packet['players'].forEach(function (player) {
                    if (player['uid'] === window.playerInfo.uid && player['segment']) {
                        const seg = player['segment'];
                        const pts = player['segment_points'] != null ? player['segment_points'] : 0;
                        const label = `${seg.toUpperCase()} · ${pts} 分`;
                        that.updateSegmentHud(label);
                    }
                });

                function gameOver() {
                    observer.set('ready', false);
                    that.players.forEach(function (player) {
                        player.setReady(false);
                    });
                    this.cleanWorld();
                    if (this.gameOverLayer) {
                        this.gameOverLayer.destroy();
                        this.gameOverLayer = null;
                    }
                }

                this.game.time.events.add(GAME_OVER_RESTART_DELAY, gameOver, this);
                break;
            }
            // case Protocol.RSP_CHEAT:
            //     let seat = this.uidToSeat(packet[1]);
            //     this.players[seat].replacePoker(packet[2], 0);
            //     this.players[seat].reDealPoker();
            //     break;
            default:
                console.log("UNKNOWN PACKET:", packet)
        }
    }

    showGameOverResult(winnerSeat) {
        const winner = this.players[winnerSeat];
        const result = getGameOverResult(winner && winner.isLandlord);
        const width = this.game.world.width;
        const height = this.game.world.height;

        if (this.gameOverLayer) {
            this.gameOverLayer.destroy();
        }

        const layer = this.game.add.group();
        const backdrop = this.game.add.graphics(0, 0);
        backdrop.beginFill(0x08130f, 0.78);
        backdrop.drawRect(0, 0, width, height);
        backdrop.endFill();
        layer.add(backdrop);

        const panel = this.game.add.graphics(0, 0);
        panel.beginFill(0x17231f, 0.96);
        panel.lineStyle(2, 0xe3c15d, 0.84);
        panel.drawRoundedRect(36, height / 2 - 105, width - 72, 210, 8);
        panel.endFill();
        layer.add(panel);

        const title = this.game.add.text(width / 2, height / 2 - 48, result.title, {
            font: "44px Arial",
            fontWeight: "bold",
            fill: "#fff8e7",
            align: "center"
        });
        title.anchor.set(0.5);
        layer.add(title);

        const detail = this.game.add.text(width / 2, height / 2 + 18, result.detail, {
            font: "22px Arial",
            fill: "#94d9c3",
            align: "center"
        });
        detail.anchor.set(0.5);
        layer.add(detail);

        const next = this.game.add.text(width / 2, height / 2 + 68, '即将开始下一局', {
            font: "18px Arial",
            fill: "#f1d885",
            align: "center"
        });
        next.anchor.set(0.5);
        layer.add(next);

        this.gameOverLayer = layer;
        if (this.game.sound && this.game.sound.play) {
            this.game.sound.play(result.sound);
        }
    }

    cleanWorld() {
        this.players.forEach(function (player) {
            player.cleanPokers();
            // player.uiLeftPoker.kill();
            player.isLandlord = false;
            player.uiHead.frameName = 'icon_farmer.png';
        });
        for (let i = 0; i < this.tablePoker.length; i++) {
            let p = this.tablePokerPic[this.tablePoker[i]];
            p.destroy();
        }
    }

    restart() {
        this.players = [];

        this.tablePoker = [];
        this.tablePokerPic = {};

        this.lastShotPlayer = null;

        this.whoseTurn = 0;

        this.stage.backgroundColor = '#182d3b';
        this.players.push(createPlay(0, this));
        this.players.push(createPlay(1, this));
        this.players.push(createPlay(2, this));
        for (let i = 0; i < 3; i++) {
            //this.players[i].uiHead.kill();
        }
    }

    update() {
    }

    uidToSeat(uid) {
        for (let i = 0; i < 3; i++) {
            if (uid === this.players[i].uid)
                return i;
        }
        console.log('ERROR uidToSeat:' + uid);
        return -1;
    }

    dealPoker(pokers) {
        // 添加一张底牌
        let p = new Poker(this, 55, 55);
        this.tablePokerPic[55] = p;
        this.game.world.add(p);

        for (let i = 0; i < 17; i++) {
            this.players[2].pokerInHand.push(55);
            this.players[1].pokerInHand.push(55);
            this.players[0].pokerInHand.push(pokers.pop());
        }

        this.players[0].dealPoker();
        this.players[1].dealPoker();
        this.players[2].dealPoker();
    }

    showLastThreePoker() {
        // 删除底牌
        this.tablePokerPic[55].destroy();
        delete this.tablePokerPic[55];

        for (let i = 0; i < 3; i++) {
            let pokerId = this.tablePoker[i];
            let p = new Poker(this, pokerId, pokerId);
            this.tablePokerPic[pokerId] = p;
            this.game.world.add(p);
            this.game.add.tween(p).to({x: this.game.world.width / 2 + (i - 1) * 60}, 600, Phaser.Easing.Default, true);
        }
        this.game.time.events.add(1500, this.dealLastThreePoker, this);
    }

    dealLastThreePoker() {
        let turnPlayer = this.players[this.whoseTurn];

        for (let i = 0; i < 3; i++) {
            let pid = this.tablePoker[i];
            let poker = this.tablePokerPic[pid]
            turnPlayer.pokerInHand.push(pid);
            turnPlayer.pushAPoker(poker);
        }
        turnPlayer.sortPoker();
        if (this.whoseTurn === 0) {
            turnPlayer.arrangePoker();
            const that = this;
            for (let i = 0; i < 3; i++) {
                let pid = this.tablePoker[i];
                let p = this.tablePokerPic[pid];
                let tween = this.game.add.tween(p).to({y: this.game.world.height - Poker.PH * 0.8}, 400, Phaser.Easing.Default, true);

                function adjust(p) {
                    that.game.add.tween(p).to({y: that.game.world.height - Poker.PH / 2}, 400, Phaser.Easing.Default, true, 400);
                }

                tween.onComplete.add(adjust, this, p);
            }
        } else {
            let first = turnPlayer.findAPoker(55);
            for (let i = 0; i < 3; i++) {
                let pid = this.tablePoker[i];
                let p = this.tablePokerPic[pid];
                p.frame = 55 - 1;
                this.game.add.tween(p).to({x: first.x, y: first.y}, 200, Phaser.Easing.Default, true);
            }
        }

        this.tablePoker = [];
        this.lastShotPlayer = turnPlayer;
        if (this.whoseTurn === 0) {
            this.startPlay();
        }
    }

    handleShotPoker(packet) {
        this.whoseTurn = this.uidToSeat(packet['uid']);
        let turnPlayer = this.players[this.whoseTurn];
        let pokers = packet['pokers'];
        if (pokers.length === 0) {
            this.players[this.whoseTurn].say("不出");
        } else {
            let pokersPic = {};
            pokers.sort(Poker.comparePoker);
            let count = pokers.length;
            let gap = Math.min((this.game.world.width - Poker.PW * 2) / count, Poker.PW * 0.36);
            for (let i = 0; i < count; i++) {
                let p = turnPlayer.findAPoker(pokers[i]);
                p.id = pokers[i];
                p.frame = pokers[i] - 1;
                p.bringToTop();
                this.game.add.tween(p).to({
                    x: this.game.world.width / 2 + (i - count / 2) * gap,
                    y: this.game.world.height * 0.4
                }, 500, Phaser.Easing.Default, true);

                turnPlayer.removeAPoker(pokers[i]);
                pokersPic[p.id] = p;
            }

            for (let i = 0; i < this.tablePoker.length; i++) {
                let p = this.tablePokerPic[this.tablePoker[i]];
                // p.kill();
                p.destroy();
            }
            this.tablePoker = pokers;
            this.tablePokerPic = pokersPic;
            this.lastShotPlayer = turnPlayer;
            turnPlayer.arrangePoker();
        }
        if (turnPlayer.pokerInHand.length > 0) {
            this.whoseTurn = (this.whoseTurn + 1) % 3;
            if (this.whoseTurn === 0) {
                this.game.time.events.add(1000, this.startPlay, this);
            }
        }
    }

    startCallScore() {
        if (this.whoseTurn === 0) {
            observer.set('rob', true);
        }

    }

    startDoublePhase(room) {
        // GDD v0.2 G 章节：抢地主结束 → 进 DOUBLE 阶段
        // 服务器会先发一个 RSP_DOUBLE continue 广播驱动按钮，这里只触发 HUD 兜底
        const turnUid = (room && room.double_turn_uid != null) ? room.double_turn_uid : -1;
        observer.set('double', {turn_uid: turnUid, decisions: {}});
        if (this.doubleHud) {
            this.doubleHud.text = `加倍阶段  → 当前决策: ${turnUid}`;
            this.doubleHud.visible = true;
        }
    }

    updateSegmentHud(label) {
        // GDD v0.2 H.5：游戏结束后由 RSP_GAME_OVER 调用，更新段位 HUD
        if (this.segmentHud) {
            this.segmentHud.text = label;
        }
    }

    showSegmentChangeOverlay(promoted, demoted, oldLabel, newLabel) {
        // GDD v0.2 H.5：段位变更时弹大字 overlay（中央 + 3 秒消失 + 渐入渐出）
        const that = this;
        const width = this.game.world.width;
        const height = this.game.world.height;
        const text = promoted
            ? '🎉 段位晋升！' + oldLabel + ' → ' + newLabel
            : (demoted ? '⚠️ 段位降级 ' + oldLabel + ' → ' + newLabel : '');
        if (!text) return;
        const overlay = this.game.add.text(width / 2, height / 2, text, {
            font: 'bold 40px', fill: promoted ? '#f1d885' : '#ff9770', align: 'center',
            backgroundColor: 'rgba(23, 35, 31, 0.94)', padding: {x: 24, y: 16},
            wordWrap: true, wordWrapWidth: width * 0.8,
        });
        overlay.anchor.set(0.5);
        overlay.alpha = 0;
        // 渐入
        const tweenIn = this.game.add.tween(overlay).to({alpha: 1}, 400, Phaser.Easing.Quadratic.Out, true);
        tweenIn.onComplete.add(function () {
            // 2.5 秒后渐出
            that.game.time.events.add(2500, function () {
                const tweenOut = that.game.add.tween(overlay).to({alpha: 0}, 400, Phaser.Easing.Quadratic.In, true);
                tweenOut.onComplete.add(function () { overlay.destroy(); });
            });
        });
    }

    startPlay() {
        if (this.isLastShotPlayer()) {
            this.players[0].playPoker([]);
        } else {
            this.players[0].playPoker(this.tablePoker);
        }
    }

    finishPlay(pokers) {
        this.send_message([Protocol.REQ_SHOT_POKER, {"pokers": pokers}]);
    }

    isLastShotPlayer() {
        return this.players[this.whoseTurn] === this.lastShotPlayer;
    }

    quitGame() {
        this.state.start('MainMenu');
    }
}
