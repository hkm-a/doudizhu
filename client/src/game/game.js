import Phaser from "phaser";
import Player from "./player"
import Poker, {Rule} from "./poker"
import {Protocol, Socket} from "./net";
import {
    GAME_OVER_RESTART_DELAY,
    getGameOverMultipleSummary,
    getGameOverResult,
    getGameOverScoreRows,
    getGameOverStatusSummary,
} from "./result";
import {
    formatRoomTitle,
    getRoomStatusLabel,
    getRoomBottomPokers,
    getRoomLastShotLabel,
    getRoomLastShotPokers,
    getRoomPhaseLabel,
    getRoomResumeMode,
    getRoomSyncState,
    getStoredRoomId,
    getStoredPlayerIdentity,
    isWaitingRoom,
    storeCurrentRoomId,
} from "./sync";
import {
    CALL_SCORE_OPTIONS,
    PLAY_OPTIONS,
    getCallScorePrompt,
    getPlaySelectionPrompt,
    getShotActionState,
    getVisiblePlayOptions,
    shouldShowCallScoreActions,
    shouldShowPlayActions,
    togglePokerSelection,
} from "./flow";
import {formatCardTypeLabel, formatPokerRanks} from "./cards";
import {DEFAULT_ROOM_LEVEL, readStoredRoomLevel, storeRoomLevel} from "./roomLevel";
import {
    getControlPosition,
    getHandLayout,
    getHandPokerY,
    getNameTextLayout,
    getPlayerHeadPositions,
    getTableSurfaceLayout,
    getTablePokerPositions,
} from "./layout";
import {
    getCallScoreWord,
    getMessageAction,
    getNextSeat,
    isCallScoreFinished,
} from "./message";
import {GAME_COMMAND_EVENT, emitGameStatus} from "./status";
import {getSuggestedPokers} from "./hint";
import {normalizeServerErrorReason} from "./error";

const CALL_SCORE_BUTTON_FRAMES = {
    0: 'score_0.png',
    1: 'score_1.png',
    2: 'score_2.png',
    3: 'score_3.png',
};

const PLAY_BUTTON_FRAMES = {
    pass: 'pass.png',
    hint: 'hint.png',
    shot: 'shot.png',
};

class GameScene extends Phaser.Scene {

    constructor() {
        super("GameScene");
        this.tablePokerSprites = [];
        this.tablePoker = [];
        this.bottomPokers = [];
        this.lastShotPlayer = null;
        this.lastShotPokers = [];
        this.lastShotLabel = '暂无出牌';
        this.whoseTurn = 0;
        this.reconnectTimer = null;
        this.reconnectDelay = 1000;
        this.connectionText = null;
        this.readyButton = null;
        this.callScoreLayer = null;
        this.callScoreActions = [];
        this.playLayer = null;
        this.playActions = [];
        this.localHand = [];
        this.selectedPokers = [];
        this.currentRoom = null;
        this.currentPhase = '准备中';
        this.handleExternalCommand = this.handleExternalCommand.bind(this);
    }

    create() {
        this.loadRuleList();
        this.players = [new Player(0), new Player(1), new Player(2)];
        this.players.forEach(player => {
            player.game = this;
        });
        this.createTableSurface();
        this.createRoom();
        this.createHead();
        this.createPoker();
        this.createConnectionText();
        this.createReadyButton();
        this.createCallScoreControls();
        this.createPlayControls();
        this.createDoubleControls();
        this.applyStoredPlayerIdentity();
        this.setWhoseTurn(-1);
        this.publishStatus({connection: '连接中', lastAction: '正在连接牌桌'});
        if (typeof window !== 'undefined' && window.addEventListener) {
            window.addEventListener(GAME_COMMAND_EVENT, this.handleExternalCommand);
        }
        this.connectSocket();

        if (this.events && this.events.once) {
            this.events.once('shutdown', () => {
                if (typeof window !== 'undefined' && window.removeEventListener) {
                    window.removeEventListener(GAME_COMMAND_EVENT, this.handleExternalCommand);
                }
                Socket.close();
            });
        }
    }

    handleExternalCommand(event) {
        const detail = event && event.detail ? event.detail : {};
        switch (detail.type) {
            case 'ready':
                this.markReady();
                break;
            case 'call-score':
                if (this.currentPhase !== '叫地主' || this.whoseTurn !== 0) {
                    this.publishStatus({
                        lastAction: '还没轮到你抢地主',
                        actionHint: '还没轮到你抢地主',
                        actionTone: 'waiting',
                    });
                    return;
                }
                this.chooseCallScore(detail.rob ? 1 : 0);
                break;
            case 'play-action':
                this.choosePlayAction(detail.action);
                break;
            case 'double':
                if (this.currentPhase !== '加倍') {
                    this.publishStatus({
                        lastAction: '当前不是加倍阶段',
                        actionHint: '当前不是加倍阶段',
                        actionTone: 'waiting',
                    });
                    return;
                }
                this.chooseDouble(detail.choice ? 1 : 0);
                break;
            default:
                break;
        }
    }

    loadRuleList() {
        if (this.cache && this.cache.json && this.cache.json.get) {
            Rule.RuleList = this.cache.json.get('rule') || {};
        }
    }

    createTableSurface() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        const layout = getTableSurfaceLayout(width, height);

        const background = this.add.image(width / 2, height / 2, 'bg');
        background.setDisplaySize(width, height);
        background.setAlpha(0.48);
        background.setDepth(-20);

        const redWash = this.add.rectangle(width / 2, height / 2, width, height, 0x481b1e, 0.42);
        redWash.setDepth(-19);

        const spotlight = this.add.ellipse(width / 2, height * 0.38, width * 0.84, height * 0.62, 0x12a37f, 0.18);
        spotlight.setDepth(-18);

        const tableShadow = this.add.ellipse(layout.x, layout.y + 22, layout.width + 68, layout.height + 58, 0x050b0a, 0.46);
        tableShadow.setDepth(-13);

        const outerRing = this.add.ellipse(layout.x, layout.y, layout.width + 42, layout.height + 38, 0x6d2824, 0.98);
        outerRing.setStrokeStyle(6, 0xffd56d, 0.86);
        outerRing.setDepth(-12);

        const felt = this.add.ellipse(layout.x, layout.y, layout.width, layout.height, 0x08705a, 0.98);
        felt.setStrokeStyle(4, 0xffe39a, 0.82);
        felt.setDepth(-10);

        const innerFelt = this.add.ellipse(layout.x, layout.y, layout.width - 42, layout.height - 42, 0x0b8a6f, 0.72);
        innerFelt.setStrokeStyle(2, 0x75c9ef, 0.28);
        innerFelt.setDepth(-9);

        const centerMark = this.add.text(layout.x, layout.y + layout.height * 0.08, '欢乐斗地主', {
            fontSize: '30px',
            fontStyle: 'bold',
            color: '#ffd56d',
            align: 'center',
        });
        centerMark.setOrigin(0.5);
        centerMark.setAlpha(0.22);
        centerMark.setDepth(-8);

        const deckMat = this.add.rectangle(layout.x, layout.deckY, 204, 66, 0x341315, 0.74);
        deckMat.setStrokeStyle(3, 0xffd56d, 0.58);
        deckMat.setDepth(-8);

        const deckLabel = this.add.text(layout.x, layout.deckY, '底牌奖池', {
            fontSize: '18px',
            fontStyle: 'bold',
            color: '#ffe7a8',
            align: 'center',
        });
        deckLabel.setOrigin(0.5);
        deckLabel.setDepth(-7);

        [-1, 1].forEach(side => {
            const coin = this.add.ellipse(layout.x + side * 138, layout.deckY, 34, 34, 0xffd56d, 0.92);
            coin.setStrokeStyle(3, 0xb87924, 0.9);
            coin.setDepth(-7);
            const coinText = this.add.text(layout.x + side * 138, layout.deckY - 1, '¥', {
                fontSize: '19px',
                fontStyle: 'bold',
                color: '#7f2024',
                align: 'center',
            });
            coinText.setOrigin(0.5);
            coinText.setDepth(-6);
        });
    }

    createRoom() {
        const layout = getTableSurfaceLayout(this.game.config.width, this.game.config.height);
        const titlePlate = this.add.rectangle(this.game.config.width / 2, layout.titleY + 16, 470, 36, 0x501b1d, 0.72);
        titlePlate.setStrokeStyle(2, 0xffd56d, 0.38);
        titlePlate.setDepth(1);
        const style = {fontSize: "21px", color: "#ffe7a8", align: "center", fontStyle: "bold"};
        let titleBar = this.add.text(this.game.config.width / 2, layout.titleY, formatRoomTitle(null), style);
        titleBar.setOrigin(0.5, 0);
        titleBar.setDepth(2);
        this.titleBar = titleBar;
    }

    createConnectionText() {
        const style = {fontSize: "18px", color: "#75c9ef", align: "center", fontStyle: "bold"};
        this.connectionText = this.add.text(this.game.config.width / 2, 34, '', style);
        this.connectionText.setOrigin(0.5, 0);
        this.connectionText.setVisible(false);
    }

    createReadyButton() {
        const width = 150;
        const height = 50;
        const position = getControlPosition(this.game.config.width, this.game.config.height, 0.62);
        const background = this.add.rectangle(0, 0, width, height, 0xf0a12e, 0.98);
        background.setStrokeStyle(1, 0xffe7a8, 0.42);
        const sprite = this.add.sprite(0, 0, 'ui', 'start.png');
        if (sprite.setDisplaySize) {
            sprite.setDisplaySize(width, height);
        }
        const shine = this.add.rectangle(0, -13, width - 14, 10, 0xffffff, 0.16);
        const label = this.add.text(0, 0, '准备', {
            fontSize: "20px",
            fontStyle: "bold",
            color: "#301409",
            align: "center",
        });
        label.setOrigin(0.5);
        const button = this.add.container(position.x, position.y, [background, sprite, shine, label]);
        button.background = background;
        button.label = label;
        button.sprite = sprite;
        button.setSize(width, height);
        button.setInteractive({useHandCursor: true});
        button.on('pointerup', () => this.markReady());
        this.readyButton = button;
        this.updateReadyButtonState();
    }

    setReadyButtonVisible(isVisible) {
        if (this.readyButton) {
            this.readyButton.setVisible(Boolean(isVisible));
        }
    }

    updateReadyButtonState() {
        if (!this.readyButton) {
            return;
        }

        const isReady = Boolean(this.players && this.players[0] && this.players[0].ready);
        if (this.readyButton.label && this.readyButton.label.setText) {
            this.readyButton.label.setText(isReady ? '取消准备' : '准备');
        }
        if (this.readyButton.label && this.readyButton.label.setColor) {
            this.readyButton.label.setColor(isReady ? '#ffe7a8' : '#301409');
        }
        if (this.readyButton.background && this.readyButton.background.setFillStyle) {
            this.readyButton.background.setFillStyle(isReady ? 0x8f2429 : 0xf0a12e, 0.98);
        }
        if (this.readyButton.background && this.readyButton.background.setStrokeStyle) {
            this.readyButton.background.setStrokeStyle(3, isReady ? 0xffd56d : 0xffe7a8, 0.88);
        }
    }

    markReady() {
        const nextReady = this.players[0].ready ? 0 : 1;
        if (this.send_message([Protocol.REQ_READY, {ready: nextReady}])) {
            this.players[0].setReady(nextReady);
            this.updateReadyButtonState();
            this.setReadyButtonVisible(true);
            this.publishStatus({
                phase: '准备中',
                lastAction: nextReady ? this.players[0].name + ' 已准备' : this.players[0].name + ' 取消准备',
            });
        }
    }

    createCallScoreControls() {
        const position = getControlPosition(this.game.config.width, this.game.config.height, 0.58);
        const promptBack = this.add.rectangle(0, -38, 300, 34, 0x4b2021, 0.84);
        promptBack.setStrokeStyle(2, 0xffd56d, 0.52);
        const prompt = this.add.text(0, -38, '', {
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffe7a8",
            align: "center",
        });
        prompt.setOrigin(0.5);

        const controls = [promptBack, prompt];
        this.callScorePrompt = prompt;
        this.callScoreActions = [];

        CALL_SCORE_OPTIONS.forEach((option, index) => {
            const button = this.createTextButton((index - 0.5) * 96, 10, option.label, () => {
                this.chooseCallScore(option.rob);
            }, CALL_SCORE_BUTTON_FRAMES[option.rob]);
            controls.push(button);
            this.callScoreActions.push(button);
        });

        this.callScoreLayer = this.add.container(position.x, position.y, controls);
        this.callScoreLayer.setDepth(20);
        this.setCallScoreControlsVisible(false);
    }

    createTextButton(x, y, label, onClick, assetFrame = null) {
        const width = assetFrame ? 96 : 86;
        const height = assetFrame ? 48 : 44;
        const background = this.add.rectangle(0, 0, width, height, 0x0b705d, 0.98);
        background.setStrokeStyle(assetFrame ? 1 : 2, 0xffd56d, assetFrame ? 0.34 : 0.9);
        const shine = this.add.rectangle(0, -12, width - 12, 7, 0xffffff, 0.12);
        const children = [background, shine];
        let sprite = null;
        if (assetFrame) {
            sprite = this.add.sprite(0, 0, 'ui', assetFrame);
            if (sprite.setDisplaySize) {
                sprite.setDisplaySize(width, height);
            }
            children.push(sprite);
        } else {
            const coin = this.add.ellipse(-width / 2 + 15, -height / 2 + 14, 16, 16, 0xffd56d, 0.92);
            coin.setStrokeStyle(1, 0xb87924, 0.9);
            children.push(coin);
        }
        const text = this.add.text(0, 0, label, {
            fontSize: "18px",
            fontStyle: "bold",
            color: "#fff7df",
            align: "center",
        });
        text.setOrigin(0.5);
        text.setVisible(!assetFrame);
        children.push(text);
        const button = this.add.container(x, y, children);
        button.background = background;
        button.label = text;
        button.sprite = sprite;
        button.setSize(width, height);
        button.setInteractive({useHandCursor: true});
        button.on('pointerover', () => {
            if (button.enabled === false) {
                return;
            }
            button.setScale(1.04);
            background.setFillStyle(0x0d876c, 0.98);
        });
        button.on('pointerout', () => {
            button.setScale(1);
            if (button.enabled === false) {
                background.setFillStyle(0x4a3d38, 0.72);
                return;
            }
            background.setFillStyle(0x0b705d, 0.98);
        });
        button.on('pointerdown', () => {
            if (button.enabled !== false) {
                button.setScale(0.98);
            }
        });
        button.on('pointerup', onClick);
        return button;
    }

    setTextButtonEnabled(button, isEnabled) {
        if (!button) {
            return;
        }

        const enabled = Boolean(isEnabled);
        button.enabled = enabled;
        button.alpha = enabled ? 1 : 0.48;
        if (button.setAlpha) {
            button.setAlpha(button.alpha);
        }
        if (button.background && button.background.setFillStyle) {
            button.background.setFillStyle(enabled ? 0x0b705d : 0x4a3d38, enabled ? 0.98 : 0.72);
        }
        if (button.background && button.background.setStrokeStyle) {
            button.background.setStrokeStyle(2, enabled ? 0xffd56d : 0x8a817a, enabled ? 0.9 : 0.38);
        }
        if (button.label && button.label.setColor) {
            button.label.setColor(enabled ? '#fff7df' : '#d2c2ac');
        }
        if (button.sprite) {
            if (enabled && button.sprite.clearTint) {
                button.sprite.clearTint();
            } else if (!enabled && button.sprite.setTint) {
                button.sprite.setTint(0x9d8d7a);
            }
        }
    }

    createPlayControls() {
        const position = getControlPosition(this.game.config.width, this.game.config.height, 0.66);
        const promptBack = this.add.rectangle(0, -38, 360, 34, 0x4b2021, 0.84);
        promptBack.setStrokeStyle(2, 0xffd56d, 0.52);
        const prompt = this.add.text(0, -38, '', {
            fontSize: "20px",
            fontStyle: "bold",
            color: "#ffe7a8",
            align: "center",
        });
        prompt.setOrigin(0.5);

        const controls = [promptBack, prompt];
        this.playPrompt = prompt;
        this.playActions = [];

        PLAY_OPTIONS.forEach((option, index) => {
            const offset = index - (PLAY_OPTIONS.length - 1) / 2;
            const button = this.createTextButton(offset * 96, 10, option.label, () => {
                this.choosePlayAction(option.action);
            }, PLAY_BUTTON_FRAMES[option.action]);
            button.action = option.action;
            controls.push(button);
            this.playActions.push(button);
        });

        this.playLayer = this.add.container(position.x, position.y, controls);
        this.playLayer.setDepth(22);
        this.setPlayControlsVisible(false);
    }

    setCallScoreControlsVisible(isVisible) {
        if (this.callScoreLayer) {
            this.callScoreLayer.setVisible(Boolean(isVisible));
        }
    }

    updateCallScoreControls() {
        if (!this.callScoreLayer) {
            return;
        }

        const showActions = shouldShowCallScoreActions(this.whoseTurn);
        this.callScorePrompt.setText(getCallScorePrompt(this.whoseTurn));
        this.callScoreActions.forEach(action => action.setVisible(showActions));
        this.setCallScoreControlsVisible(true);
    }

    chooseCallScore(rob) {
        if (this.send_message([Protocol.REQ_CALL_SCORE, {rob: rob}])) {
            this.setCallScoreControlsVisible(false);
        }
    }

    setPlayControlsVisible(isVisible) {
        if (this.playLayer) {
            this.playLayer.setVisible(Boolean(isVisible));
        }
    }

    createDoubleControls() {
        const width = this.game.config.width;
        const height = this.game.config.height;
        const promptText = this.add.text(width / 2, height * 0.42, '加倍阶段', {
            fontSize: '24px',
            fontStyle: 'bold',
            color: '#ffd86b',
            align: 'center',
        });
        promptText.setOrigin(0.5);
        promptText.setDepth(20);
        promptText.setVisible(false);
        this.doublePrompt = promptText;

        const resultText = this.add.text(width / 2, 64, '', {
            fontSize: '20px',
            color: '#ffd86b',
            align: 'center',
        });
        resultText.setOrigin(0.5, 0);
        resultText.setDepth(20);
        resultText.setVisible(false);
        this.doubleHud = resultText;

        const controls = [];

        const noDoubleText = this.add.text(width * 0.4, height * 0.54, '不加倍', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffaa55',
            align: 'center',
            backgroundColor: '#383838',
            padding: {x: 20, y: 12},
        });
        noDoubleText.setOrigin(0.5);
        noDoubleText.setDepth(20);
        noDoubleText.setInteractive({useHandCursor: true});
        noDoubleText.on('pointerup', () => this.chooseDouble(0));
        controls.push(noDoubleText);

        const yesDoubleText = this.add.text(width * 0.6, height * 0.54, '加倍', {
            fontSize: '28px',
            fontStyle: 'bold',
            color: '#ffeb70',
            align: 'center',
            backgroundColor: '#554422',
            padding: {x: 20, y: 12},
        });
        yesDoubleText.setOrigin(0.5);
        yesDoubleText.setDepth(20);
        yesDoubleText.setInteractive({useHandCursor: true});
        yesDoubleText.on('pointerup', () => this.chooseDouble(1));
        controls.push(yesDoubleText);

        this.doubleControls = controls;
        controls.forEach(c => c.setVisible(false));
    }

    setDoubleControlsVisible(isVisible) {
        if (this.doublePrompt) {
            this.doublePrompt.setVisible(Boolean(isVisible));
        }
        if (this.doubleControls) {
            this.doubleControls.forEach(c => c.setVisible(Boolean(isVisible)));
        }
    }

    startDoublePhase() {
        this.currentPhase = '加倍';
        this.setCallScoreControlsVisible(false);
        this.setPlayControlsVisible(false);
        this.setReadyButtonVisible(false);
        this.setDoubleControlsVisible(true);
        if (this.doubleHud) {
            this.doubleHud.setVisible(true);
            this.doubleHud.setText('加倍阶段');
        }
        this.publishStatus({phase: '加倍', lastAction: '加倍阶段开始'});
    }

    chooseDouble(choice) {
        if (this.send_message([Protocol.REQ_DOUBLE, {double: choice}])) {
            this.setDoubleControlsVisible(false);
            this.players[0].say(choice ? '加倍' : '不加倍');
        }
    }

    updateDoubleControls(room) {
        const turnUid = room && room.double_turn_uid;
        const isLocalTurn = turnUid === this.players[0].uid;
        this.setDoubleControlsVisible(isLocalTurn);
        if (room && this.doubleHud) {
            const decisions = room.double_decisions || {};
            const summary = Object.keys(decisions).map(uid => {
                const name = this.getPlayerNameByUid(Number(uid));
                return name + ':' + (decisions[uid] ? '加倍' : '不加倍');
            }).join('  ');
            this.doubleHud.setText('加倍阶段  ' + summary + (summary ? '  →  ' : '') + '等待操作');
            this.doubleHud.setVisible(true);
        }
    }

    endDoublePhase() {
        this.setDoubleControlsVisible(false);
        if (this.doublePrompt) {
            this.doublePrompt.setVisible(false);
        }
        if (this.doubleHud) {
            this.doubleHud.setVisible(false);
            this.doubleHud.setText('');
        }
        this.players[0].say('');
        this.publishStatus({phase: '出牌中', lastAction: '加倍结束，开始出牌'});
        this.startPlay();
    }

    getPlayerNameByUid(uid) {
        for (let i = 0; i < 3; i++) {
            if (this.players[i] && this.players[i].uid === uid) {
                return this.players[i].name || '玩家' + uid;
            }
        }
        return '玩家' + uid;
    }

    updatePlayControls() {
        if (!this.playLayer) {
            return;
        }

        this.updatePlayPrompt();
        this.updatePlayActionVisibility();
        this.updateShotButtonState();
        this.setPlayControlsVisible(true);
    }

    updatePlayActionVisibility() {
        if (!this.playActions) {
            return;
        }

        const showActions = shouldShowPlayActions(this.whoseTurn);
        const visibleActions = getVisiblePlayOptions(
            !this.isLastShotPlayer(),
            this.selectedPokers ? this.selectedPokers.length : 0,
        ).map(option => option.action);

        this.playActions.forEach(action => {
            action.setVisible(showActions && visibleActions.indexOf(action.action) !== -1);
        });
    }

    updateShotButtonState() {
        const shotButton = this.playActions.find(action => action.action === 'shot');
        if (!shotButton) {
            return;
        }

        const state = getShotActionState(this.selectedPokers.length, this.getSelectedPokerError());
        this.updatePlayPrompt();
        this.updatePlayActionVisibility();
        shotButton.canSubmit = state.enabled;
        shotButton.disabledReason = state.hint;
        this.setTextButtonEnabled(shotButton, state.enabled);
    }

    choosePlayAction(action) {
        if (this.currentPhase !== '出牌中' || this.whoseTurn !== 0) {
            const reason = '还没轮到你出牌';
            if (this.players && this.players[0]) {
                this.players[0].say(reason);
            }
            this.publishStatus({
                lastAction: reason,
                actionHint: reason,
                actionTone: 'waiting',
            });
            return;
        }

        if (action === 'pass') {
            if (this.isLastShotPlayer()) {
                const reason = '本轮需要你先出牌';
                this.players[0].say(reason);
                this.publishStatus({
                    lastAction: reason,
                    actionHint: reason,
                    actionTone: 'blocked',
                });
                return;
            }

            if (this.send_message([Protocol.REQ_SHOT_POKER, {pokers: []}])) {
                this.setPlayControlsVisible(false);
            }
            return;
        }

        if (action === 'hint') {
            this.applyPlayHint();
            return;
        }

        if (action === 'clear') {
            this.clearSelectedPokers();
            return;
        }

        const shotState = getShotActionState(this.selectedPokers.length, this.getSelectedPokerError());
        if (!shotState.enabled || shotState.hint) {
            const reason = shotState.hint || '无法出牌';
            this.players[0].say(reason);
            this.publishStatus({
                lastAction: reason,
                actionHint: reason,
                actionTone: 'blocked',
            });
            return;
        }

        if (this.send_message([Protocol.REQ_SHOT_POKER, {pokers: this.selectedPokers.slice()}])) {
            this.setPlayControlsVisible(false);
        }
    }

    clearSelectedPokers() {
        if (!this.selectedPokers || this.selectedPokers.length === 0) {
            const reason = '没有已选牌';
            if (this.players && this.players[0]) {
                this.players[0].say(reason);
            }
            this.publishStatus({
                lastAction: reason,
                actionHint: this.getActionHint(this.currentPhase),
                actionTone: 'waiting',
            });
            return;
        }

        this.selectedPokers = [];
        this.updateHandSelection();
        this.updateShotButtonState();
        if (this.players && this.players[0]) {
            this.players[0].say('已清空选牌');
        }
        this.publishStatus({
            selectedPokerCount: 0,
            lastAction: '已清空选牌',
        });
    }

    applyPlayHint() {
        const suggestion = getSuggestedPokers(
            this.localHand,
            this.tablePoker,
            this.isLastShotPlayer(),
            this.selectedPokers,
        );
        if (suggestion.length === 0) {
            const canPass = !this.isLastShotPlayer();
            const actionHint = canPass ? '没有可出的牌，可以不出' : '没有可出的牌';
            this.players[0].say('没有可出的牌');
            this.publishStatus({
                lastAction: '没有可出的提示',
                actionHint: actionHint,
                actionTone: canPass ? 'action' : 'blocked',
            });
            return;
        }

        this.selectedPokers = suggestion;
        this.updateHandSelection();
        this.updateShotButtonState();
        this.players[0].say('已选提示牌');
        this.publishStatus({lastAction: '已选出牌提示'});
    }

    updatePlayPrompt() {
        if (!this.playPrompt) {
            return;
        }

        this.playPrompt.setText(getPlaySelectionPrompt(
            this.whoseTurn,
            this.selectedPokers.length,
            this.getSelectedPokerError(),
            !this.isLastShotPlayer(),
        ));
    }

    applyStoredPlayerIdentity() {
        const identity = getStoredPlayerIdentity();
        this.players[0].updateInfo(identity.uid, identity.name);
    }

    getPresentPlayers() {
        return (this.players || []).filter(player => (
            player
            && player.name
            && player.name !== '等待玩家加入'
            && !player.left
        ));
    }

    getTurnLabel() {
        const player = this.players && this.players[this.whoseTurn];
        if (!player || !player.name || player.name === '等待玩家加入') {
            return '等待玩家';
        }
        if (player.left) {
            return player.name + ' 暂离';
        }
        if (this.whoseTurn === 0) {
            return '轮到你';
        }
        return player.name;
    }

    getLandlordLabel() {
        const landlord = (this.players || []).find(player => (
            player
            && player.isLandlord
            && player.name
            && player.name !== '等待玩家加入'
            && !player.left
        ));
        return landlord ? landlord.name : '未确定';
    }

    getLocalRoleLabel() {
        if (this.getLandlordLabel() === '未确定') {
            return '未确定';
        }
        return this.players && this.players[0] && this.players[0].isLandlord ? '地主' : '农民';
    }

    getSeatSummaries() {
        const seatLabels = ['你', '下家', '上家'];
        return seatLabels.map((seatLabel, index) => {
            const player = this.players && this.players[index];
            const localCardCount = index === 0 && this.localHand ? this.localHand.length : null;
            return {
                seat: seatLabel,
                name: player && player.name ? player.name : '等待玩家加入',
                ready: Boolean(player && player.ready),
                landlord: Boolean(player && player.isLandlord),
                left: Boolean(player && player.left),
                turn: this.whoseTurn === index,
                point: player && Number.isFinite(Number(player.point)) ? Number(player.point) : 0,
                cardCount: localCardCount !== null ? localCardCount : (player && player.cardCount ? player.cardCount : 0),
            };
        });
    }

    getActionHint(phase) {
        if (phase === '叫地主') {
            return getCallScorePrompt(this.whoseTurn);
        }
        if (phase === '出牌中') {
            return getPlaySelectionPrompt(
                this.whoseTurn,
                this.selectedPokers ? this.selectedPokers.length : 0,
                this.getSelectedPokerError(),
                !this.isLastShotPlayer(),
            );
        }
        if (phase === '结算') {
            return '查看结算结果';
        }
        return this.players && this.players[0] && this.players[0].ready
            ? '等待其他玩家准备'
            : '点击准备开始对局';
    }

    getActionTone(phase) {
        if (phase === '叫地主') {
            return this.whoseTurn === 0 ? 'action' : 'waiting';
        }
        if (phase === '出牌中') {
            if (this.whoseTurn !== 0) {
                return 'waiting';
            }
            return this.getSelectedPokerError() ? 'blocked' : 'action';
        }
        if (phase === '结算') {
            return 'done';
        }
        return this.players && this.players[0] && this.players[0].ready ? 'waiting' : 'action';
    }

    getSelectedPokerTypeLabel() {
        return this.getPokerTypeLabel(this.selectedPokers);
    }

    getPokerTypeLabel(pokers) {
        const selectedCount = pokers ? pokers.length : 0;
        if (selectedCount === 0) {
            return '';
        }

        try {
            const cardType = Rule.cardsValue(Poker.toCards(pokers))[0];
            return formatCardTypeLabel(cardType, selectedCount);
        } catch (error) {
            return '待判断';
        }
    }

    getLastShotDetails(pokers) {
        const shotPokers = Array.isArray(pokers) ? pokers : [];
        return {
            lastShotPokerLabel: formatPokerRanks(shotPokers),
            lastShotPokerTypeLabel: this.getPokerTypeLabel(shotPokers),
        };
    }

    setLastShotState(label, pokers = []) {
        this.lastShotLabel = label || '暂无出牌';
        this.lastShotPokers = Array.isArray(pokers) ? pokers.slice() : [];
    }

    setBottomState(pokers = []) {
        this.bottomPokers = Array.isArray(pokers) ? pokers.slice().sort(Poker.comparePoker) : [];
    }

    getBottomDetails() {
        return {
            bottomCount: this.bottomPokers ? this.bottomPokers.length : 0,
            bottomPokerLabel: formatPokerRanks(this.bottomPokers),
            bottomPokerTypeLabel: this.getPokerTypeLabel(this.bottomPokers),
        };
    }

    setWhoseTurn(seat) {
        this.whoseTurn = seat;
        if (!this.players) {
            return;
        }
        this.players.forEach((player, index) => {
            if (player && player.setTurnActive) {
                player.setTurnActive(index === seat);
            }
        });
    }

    publishStatus(status = {}) {
        const room = this.currentRoom || {};
        const presentPlayers = this.getPresentPlayers();
        const readyCount = (this.players || []).filter(player => player && player.ready).length;
        const phase = status.phase || this.currentPhase || '准备中';
        const selectedCount = this.selectedPokers ? this.selectedPokers.length : 0;
        const selectedError = this.getSelectedPokerError();
        const isLocalTurn = this.whoseTurn === 0;
        const isPlayingPhase = phase === '出牌中';
        const isDoublePhase = phase === '加倍';
        this.currentPhase = phase;

        emitGameStatus({
            roomLabel: getRoomStatusLabel(room),
            roomLevelLabel: room.label || '未选择',
            roomOrigin: room.origin || 0,
            playerCount: presentPlayers.length,
            readyCount: readyCount,
            multiple: room.multiple || 15,
            turnTimer: room.timer || 0,
            localHandCount: this.localHand ? this.localHand.length : 0,
            selectedPokerCount: selectedCount,
            selectedPokerLabel: formatPokerRanks(this.selectedPokers),
            selectedPokerTypeLabel: this.getSelectedPokerTypeLabel(),
            lastShotLabel: this.lastShotLabel,
            ...this.getLastShotDetails(this.lastShotPokers),
            landlordLabel: this.getLandlordLabel(),
            localRoleLabel: this.getLocalRoleLabel(),
            turnLabel: this.getTurnLabel(),
            ...this.getBottomDetails(),
            seatSummaries: this.getSeatSummaries(),
            actionHint: this.getActionHint(phase),
            actionTone: this.getActionTone(phase),
            canReady: phase === '准备中',
            canCallScore: phase === '叫地主' && isLocalTurn,
            canDouble: isDoublePhase && isLocalTurn,
            canPass: isPlayingPhase && isLocalTurn && !this.isLastShotPlayer(),
            canHint: isPlayingPhase && isLocalTurn,
            canShot: isPlayingPhase && isLocalTurn && selectedCount > 0 && !selectedError,
            ...status,
        });
    }

    updateRoomMultiple(multiple) {
        if (multiple === undefined || multiple === null) {
            return;
        }

        this.currentRoom = {
            ...(this.currentRoom || {}),
            multiple: multiple,
        };
        if (this.titleBar) {
            this.titleBar.setText(formatRoomTitle(this.currentRoom));
        }
    }

    updateRoomTimer(timer) {
        if (timer === undefined || timer === null) {
            return;
        }

        this.currentRoom = {
            ...(this.currentRoom || {}),
            timer: timer,
        };
    }

    restoreLastShotFromSync(room) {
        const lastShotSeat = this.uidToSeat(room && room.last_shot_uid);
        this.lastShotPlayer = lastShotSeat === -1 ? null : this.players[lastShotSeat];
        const lastShotPokers = getRoomLastShotPokers(room).slice().sort(Poker.comparePoker);
        this.tablePoker = lastShotPokers;
        this.showTablePokers(lastShotPokers);
        this.setLastShotState(getRoomLastShotLabel(room, this.players), lastShotPokers);
    }

    restoreBottomPokersFromSync(room) {
        this.setBottomState(getRoomBottomPokers(room));
    }

    createHead() {
        const coords = getPlayerHeadPositions(this.game.config.width, this.game.config.height);

        coords.forEach((coord, index) => {
            const profileBack = this.add.ellipse(coord.x, coord.y - 28, 78, 94, 0x4b2021, 0.8);
            profileBack.setStrokeStyle(3, 0xffd56d, 0.34);
            profileBack.setDepth(4);

            let head = this.add.sprite(coord.x, coord.y, 'ui', 'icon_default.png');
            head.setOrigin(0.5, 1);
            head.setDepth(6);

            const style = {font: "22px", color: "#fff7df", align: "center", backgroundColor: "rgba(75, 32, 33, 0.78)"};
            let sayUI = this.add.text(head.x + head.width/2 + 10, head.y - head.height/2, '', style);
            sayUI.setVisible(false);
            sayUI.setDepth(20);

            const nameStyle = {font: "18px", color: "#ffe7a8", align: "center", fontStyle: "bold"};
            const nameLayout = getNameTextLayout(head, coord.nameSide);
            let nameUI = this.add.text(nameLayout.x, nameLayout.y, '等待玩家加入', nameStyle);
            nameUI.setOrigin(nameLayout.originX, 0);
            nameUI.setDepth(8);

            const readyStyle = {font: "18px", color: "#ffd56d", align: "center", fontStyle: "bold"};
            let readyUI = this.add.text(head.x, head.y + 8, '', readyStyle);
            readyUI.setOrigin(0.5, 0);
            readyUI.setVisible(false);
            readyUI.setDepth(8);

            const cardCountStyle = {font: "18px", color: "#fff7df", align: "center", fontStyle: "bold"};
            let cardCountUI = this.add.text(head.x, head.y + 34, '', cardCountStyle);
            cardCountUI.setOrigin(0.5, 0);
            cardCountUI.setVisible(false);
            cardCountUI.setDepth(8);

            this.players[index].attachProfileUI({
                game: this,
                head: head,
                nameText: nameUI,
                readyText: readyUI,
                cardCountText: cardCountUI,
                sayText: sayUI,
            });
        });
        // this.players[0].updateInfo(playerInfo.uid, playerInfo.username);
    }

    createPoker() {
        let pokers = [];
        const cx = this.game.config.width * 0.5, cy = this.game.config.height * 0.4;
        for (let i = 1; i <= 54; i++) {
            let poker = new Poker(this, cx, cy, 'poker', 54);
            this.add.existing(poker);
            pokers.push(poker);
        }
        this.deckPokers = pokers;
        this.resetDeckPokers();
    }

    resetDeckPokers() {
        if (!this.deckPokers) {
            return;
        }

        this.deckPokers.forEach(poker => {
            if (poker.off) {
                poker.off('pointerup');
            }
            if (poker.disableInteractive) {
                poker.disableInteractive();
            }
            poker.setFrame(54);
            if (poker.clearTint) {
                poker.clearTint();
            }
            if (poker.setScale) {
                poker.setScale(1);
            }
            poker.setVisible(false);
        });
        this.localHand = [];
        this.selectedPokers = [];
    }

    showDeckPokers(pokerFrames) {
        if (!this.deckPokers) {
            return;
        }

        this.localHand = pokerFrames.slice().sort(Poker.comparePoker);
        this.players[0].pokerInHand = this.localHand.slice();
        this.players[0].setCardCount(this.localHand.length);
        this.selectedPokers = [];
        const layout = getHandLayout(this.game.config.width, this.game.config.height, this.localHand.length);

        for (let i = 0; i < this.deckPokers.length; i++) {
            const poker = this.deckPokers[i];
            if (poker.off) {
                poker.off('pointerup');
            }

            if (i < this.localHand.length) {
                const pokerId = this.localHand[i];
                const position = layout.positions[i];
                poker.id = pokerId;
                poker.setFrame(pokerId);
                poker.setPosition(position.x, position.y);
                if (poker.clearTint) {
                    poker.clearTint();
                }
                if (poker.setScale) {
                    poker.setScale(1);
                }
                poker.setDepth(30 + i);
                poker.setVisible(true);
                poker.setInteractive({useHandCursor: true});
                poker.on('pointerup', () => this.toggleHandPoker(pokerId));
            } else {
                if (poker.disableInteractive) {
                    poker.disableInteractive();
                }
                poker.setVisible(false);
            }
        }
    }

    toggleHandPoker(pokerId) {
        this.selectedPokers = togglePokerSelection(this.selectedPokers, pokerId);
        this.updateHandSelection();
        this.updateShotButtonState();
        this.publishStatus({
            selectedPokerCount: this.selectedPokers.length,
            lastAction: this.selectedPokers.length > 0 ? '已选 ' + this.selectedPokers.length + ' 张牌' : '已清空选牌',
        });
    }

    updateHandSelection() {
        if (!this.deckPokers) {
            return;
        }

        this.deckPokers.forEach(poker => {
            if (!poker.visible) {
                return;
            }
            const selected = this.selectedPokers.indexOf(poker.id) !== -1;
            poker.y = this.getHandPokerY(selected);
            if (selected && poker.setTint) {
                poker.setTint(0xfff0a8);
            } else if (!selected && poker.clearTint) {
                poker.clearTint();
            }
            if (poker.setScale) {
                poker.setScale(selected ? 1.05 : 1);
            }
        });
    }

    getHandPokerY(isSelected) {
        return getHandPokerY(this.game.config.height, isSelected);
    }

    removeLocalPokers(pokers) {
        if (!pokers || pokers.length === 0) {
            this.selectedPokers = [];
            this.updateHandSelection();
            return;
        }

        this.localHand = this.localHand.filter(poker => pokers.indexOf(poker) === -1);
        this.players[0].pokerInHand = this.localHand.slice();
        this.selectedPokers = [];
        this.showDeckPokers(this.localHand);
    }

    addLocalPokers(pokers) {
        if (!pokers || pokers.length === 0) {
            return;
        }

        this.showDeckPokers(this.localHand.concat(pokers));
    }

    reducePlayerCardCount(seat, count) {
        const player = this.players[seat];
        if (!player || !count) {
            return;
        }

        player.setCardCount(player.cardCount - count);
    }

    showTablePokers(pokers) {
        this.tablePokerSprites.forEach(poker => {
            if (poker && poker.destroy) {
                poker.destroy();
            }
        });
        this.tablePokerSprites = [];

        const positions = getTablePokerPositions(this.game.config.width, this.game.config.height, pokers.length);
        pokers.forEach((pokerId, index) => {
            const position = positions[index];
            const poker = new Poker(this, position.x, position.y, 'poker', pokerId);
            this.add.existing(poker);
            this.tablePokerSprites.push(poker);
        });
    }

    dealPoker(pokers) {
        this.showDeckPokers(pokers);
        this.players.forEach((player, index) => {
            player.setCardCount(index === 0 ? pokers.length : 17);
        });
    }


    onopen() {
        this.reconnectDelay = 1000;
        this.setConnectionText('');
        const roomLevel = readStoredRoomLevel();
        const roomId = getStoredRoomId();
        this.publishStatus({
            connection: '已连接',
            lastAction: roomId === -1 ? '正在加入 ' + roomLevel + ' 档房间' : '正在恢复房间 ' + roomId,
        });
        Socket.send([Protocol.REQ_ROOM_LIST, {}]);
        Socket.send([Protocol.REQ_JOIN_ROOM, {room: roomId, level: roomLevel}]);
    }

    onerror() {
        console.log('socket connect onerror');
        this.scheduleReconnect();
    }

    connectSocket() {
        this.setConnectionText('正在连接牌桌...');
        Socket.connect(this.onopen.bind(this), this.onmessage.bind(this), this.onerror.bind(this));
    }

    scheduleReconnect() {
        if (this.reconnectTimer) {
            return;
        }

        const delay = this.reconnectDelay;
        this.setConnectionText('连接已断开，' + Math.ceil(delay / 1000) + ' 秒后重连...');
        this.reconnectTimer = this.time.delayedCall(delay, function () {
            this.reconnectTimer = null;
            this.reconnectDelay = Math.min(this.reconnectDelay * 2, 8000);
            this.connectSocket();
        }, [], this);
    }

    setConnectionText(message) {
        if (!this.connectionText) {
            return;
        }

        const hasMessage = Boolean(message);
        this.connectionText.setText(message);
        this.connectionText.setVisible(hasMessage);
        this.publishStatus({
            connection: message || '已连接',
            lastAction: message || '连接已建立',
            ...(hasMessage ? {
                actionHint: message,
                actionTone: message.indexOf('断开') !== -1 ? 'blocked' : 'waiting',
            } : {}),
        });
    }

    send_message(request) {
        const sent = Socket.send(request);
        if (!sent) {
            const reason = '连接未建立，操作未发送';
            if (this.players && this.players[0]) {
                this.players[0].say(reason);
            }
            this.publishStatus({
                lastAction: reason,
                actionHint: reason,
                actionTone: 'blocked',
            });
        }
        return sent;
    }

    applyRoomSync(packet) {
        const identity = getStoredPlayerIdentity();
        const syncState = getRoomSyncState(packet, identity.uid);
        this.currentRoom = syncState.room;
        storeCurrentRoomId(syncState.room && syncState.room.id);
        if (this.titleBar) {
            this.titleBar.setText(formatRoomTitle(syncState.room));
        }

        syncState.players.forEach((playerState, index) => {
            this.players[index].updateInfo(playerState.uid, playerState.name);
            this.players[index].setReady(playerState.ready);
            this.players[index].setLandlord(playerState.landlord);
            if (this.players[index].setLeft) {
                this.players[index].setLeft(playerState.left);
            } else {
                this.players[index].left = Boolean(playerState.left);
            }
            this.players[index].setPoint(playerState.point);
            this.players[index].setCardCount(playerState.cardCount);
        });
        if (isWaitingRoom(syncState.room)) {
            this.cleanWorld();
            this.updateReadyButtonState();
            this.setReadyButtonVisible(true);
            this.publishStatus({phase: '准备中', lastAction: '等待玩家准备'});
        } else {
            if (syncState.players[0].pokers.length > 0) {
                this.showDeckPokers(syncState.players[0].pokers);
            }
            this.updateRoomTimer(syncState.room && syncState.room.timer);
            this.restoreBottomPokersFromSync(syncState.room);
            this.restoreLastShotFromSync(syncState.room);
            const turnSeat = this.uidToSeat(syncState.room && syncState.room.whose_turn);
            if (turnSeat !== -1) {
                this.setWhoseTurn(turnSeat);
            }
            this.setReadyButtonVisible(false);
            this.setCallScoreControlsVisible(false);
            this.setPlayControlsVisible(false);
            this.publishStatus({
                phase: getRoomPhaseLabel(syncState.room),
                lastAction: '房间状态同步',
            });

            const resumeMode = getRoomResumeMode(syncState.room);
            if (resumeMode === 'call-score') {
                this.startCallScore();
            } else if (resumeMode === 'playing') {
                this.startPlay();
            }
        }
    }

    applyReady(packet) {
        const seat = this.uidToSeat(packet.uid);
        if (seat === -1) {
            return;
        }
        this.players[seat].setReady(packet.ready);
        if (seat === 0) {
            this.updateReadyButtonState();
            this.setReadyButtonVisible(true);
        }
        this.publishStatus({
            phase: '准备中',
            lastAction: this.players[seat].name + (packet.ready ? ' 已准备' : ' 取消准备'),
        });
    }

    applyLeave(packet) {
        const seat = this.uidToSeat(packet.uid);
        if (seat === -1) {
            return;
        }

        const player = this.players[seat];
        const name = player.name || '玩家';
        player.setReady(false);
        if (player.setLeft) {
            player.setLeft(true);
        } else {
            player.left = true;
        }
        player.setTurnActive(false);
        player.say('暂离');
        this.publishStatus({
            lastAction: name + ' 暂离',
            actionHint: name + ' 暂离',
            actionTone: 'blocked',
        });
    }

    applyChat(packet) {
        const seat = this.uidToSeat(packet.uid);
        const message = String(packet.message || '').trim();
        if (seat === -1 || !message) {
            return;
        }

        this.players[seat].say(message);
        this.publishStatus({
            lastAction: this.players[seat].name + '：' + message,
            actionHint: message,
            actionTone: seat === 0 ? 'action' : 'waiting',
        });
    }

    showError(packet) {
        const rawReason = packet.reason || packet.detail;
        const reason = normalizeServerErrorReason(rawReason);
        if (this.recoverFromMissingStoredRoom(rawReason, reason)) {
            return;
        }
        if (this.recoverFromInsufficientPoint(reason)) {
            return;
        }
        this.players[0].say(reason);
        this.setPlayControlsVisible(this.whoseTurn === 0);
        this.publishStatus({
            lastAction: reason,
            actionHint: reason,
            actionTone: 'blocked',
        });
    }

    recoverFromMissingStoredRoom(rawReason, reason) {
        const isMissingRoom = /^Room\[[^\]]+\] Not Found$/.test(String(rawReason || '').trim())
            || reason === '房间不存在';
        if (!isMissingRoom || getStoredRoomId() === -1) {
            return false;
        }

        const roomLevel = readStoredRoomLevel();
        storeCurrentRoomId(-1);
        this.publishStatus({
            lastAction: '原房间已关闭，正在重新匹配',
            actionHint: '正在加入 ' + roomLevel + ' 档房间',
            actionTone: 'waiting',
        });
        Socket.send([Protocol.REQ_JOIN_ROOM, {room: -1, level: roomLevel}]);
        return true;
    }

    recoverFromInsufficientPoint(reason) {
        if (reason !== '积分不足，无法进入该场次') {
            return false;
        }

        storeRoomLevel(DEFAULT_ROOM_LEVEL);
        storeCurrentRoomId(-1);
        this.publishStatus({
            lastAction: '积分不足，已切换到新手场',
            actionHint: '正在加入新手场',
            actionTone: 'waiting',
        });
        Socket.send([Protocol.REQ_JOIN_ROOM, {room: -1, level: DEFAULT_ROOM_LEVEL}]);
        return true;
    }

    onmessage(message) {
        const action = getMessageAction(message);
        const packet = action.packet;
        switch (action.type) {
            case 'error':
                this.showError(packet);
                break;
            case 'room-list':
                break;
            case 'new-room':
                break;
            case 'join-room':
                this.applyRoomSync(packet);
                break;
            case 'leave-room':
                this.applyLeave(packet);
                break;
            case 'chat':
                this.applyChat(packet);
                break;
            case 'ready':
                this.applyReady(packet);
                break;
            case 'deal-poker':
                let pokers = packet.pokers || [];
                this.players.forEach(player => player.setReady(false));
                this.setReadyButtonVisible(false);
                this.updateRoomTimer(packet.timer);
                this.dealPoker(pokers);
                this.setWhoseTurn(this.uidToSeat(packet.uid));
                this.publishStatus({phase: '叫地主', lastAction: '已发牌，等待叫地主'});
                this.startCallScore();
                break;
            case 'call-score':
                let playerId = packet.uid;
                let landlord = packet.landlord;
                this.updateRoomMultiple(packet.multiple);
                this.setWhoseTurn(this.uidToSeat(playerId));

                if (this.whoseTurn >= 0) {
                    this.players[this.whoseTurn].say(getCallScoreWord(packet.rob));
                }
                if (isCallScoreFinished(packet)) {
                    this.setCallScoreControlsVisible(false);
                    this.setWhoseTurn(this.uidToSeat(landlord));
                    if (this.whoseTurn >= 0) {
                        const bottomPokers = packet.pokers || [];
                        this.setBottomState(bottomPokers);
                        this.tablePoker = bottomPokers;
                        this.players[this.whoseTurn].setLandlord();
                        this.lastShotPlayer = this.players[this.whoseTurn];
                        this.showTablePokers(this.tablePoker);
                        if (this.whoseTurn === 0) {
                            this.addLocalPokers(bottomPokers);
                        } else {
                            this.players[this.whoseTurn].setCardCount(this.players[this.whoseTurn].cardCount + bottomPokers.length);
                        }
                        this.publishStatus({
                            phase: '加倍',
                            lastAction: this.players[this.whoseTurn].name + ' 成为地主',
                        });
                        this.startDoublePhase();
                    }
                } else {
                    this.setWhoseTurn(getNextSeat(this.whoseTurn));
                    this.publishStatus({phase: '叫地主', lastAction: '等待下一位叫地主'});
                    this.startCallScore();
                }
                break;
            case 'double': {
                this.updateRoomMultiple(packet.multiple);
                const room = this.currentRoom || {};
                if (packet.phase === 'end') {
                    this.endDoublePhase();
                } else {
                    room.double_turn_uid = packet.uid === undefined ? -1 : packet.uid;
                    if (!room.double_decisions) {
                        room.double_decisions = {};
                    }
                    if (packet.uid !== undefined) {
                        room.double_decisions[packet.uid] = packet.double;
                    }
                    this.updateDoubleControls(room);
                }
                break;
            }
            case 'shot-poker':
                this.handleShotPoker(packet);
                break;
            case 'game-over':
                this.setWhoseTurn(this.uidToSeat(packet.winner));
                if (this.whoseTurn === -1) {
                    this.setWhoseTurn(0);
                }
                this.applyGameOverBalances(packet);
                this.publishStatus(this.getGameOverStatus(packet));
                this.showGameOverResult(this.whoseTurn, packet);
                this.time.delayedCall(GAME_OVER_RESTART_DELAY, this.restartAfterGameOver, [], this);
                break;
            default:
                this.showError({reason: 'Unsupported server message'});
        }
    }

    applyGameOverBalances(packet = {}) {
        (packet.players || []).forEach(row => {
            if (row.balance === undefined || row.balance === null) {
                return;
            }
            const seat = this.uidToSeat(row.uid);
            if (seat === -1 || !this.players[seat]) {
                return;
            }
            if (this.players[seat].setPoint) {
                this.players[seat].setPoint(row.balance);
            } else {
                this.players[seat].point = row.balance;
            }
        });
    }

    getGameOverStatus(packet = {}) {
        const winner = this.players[this.whoseTurn];
        const scoreRows = getGameOverScoreRows(packet.players, this.players);
        const resultSummary = getGameOverStatusSummary(winner && winner.isLandlord, scoreRows);
        const multipleSummary = getGameOverMultipleSummary(packet.multiple);

        return {
            phase: '结算',
            lastAction: '对局结束',
            actionHint: resultSummary,
            actionTone: 'done',
            resultSummary: resultSummary,
            multipleSummary: multipleSummary,
            scoreRows: scoreRows,
        };
    }

    showGameOverResult(winnerSeat, packet = {}) {
        const winner = this.players[winnerSeat];
        const result = getGameOverResult(winner && winner.isLandlord);
        const width = this.game.config.width;
        const height = this.game.config.height;
        const scoreRows = getGameOverScoreRows(packet.players, this.players);
        const multipleSummary = getGameOverMultipleSummary(packet.multiple);

        if (this.gameOverLayer) {
            this.gameOverLayer.destroy();
        }

        const layer = this.add.container(width / 2, height / 2);
        const backdrop = this.add.rectangle(0, 0, width, height, 0x120908, 0.8);
        const panelHeight = scoreRows.length || multipleSummary ? 314 : 210;
        const panelWidth = width - 72;
        const panelShadow = this.add.rectangle(8, 12, panelWidth, panelHeight, 0x050302, 0.36);
        const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x4b2021, 0.97);
        panel.setStrokeStyle(4, 0xffd56d, 0.9);
        const panelGlow = this.add.rectangle(0, -panelHeight / 2 + 18, panelWidth - 28, 16, 0xfff0a8, 0.18);
        const ribbon = this.add.rectangle(0, -panelHeight / 2 + 2, panelWidth - 90, 44, 0x0b705d, 0.94);
        ribbon.setStrokeStyle(2, 0xffd56d, 0.72);
        const leftCoin = this.add.ellipse(-panelWidth / 2 + 58, -panelHeight / 2 + 2, 38, 38, 0xffd56d, 0.96);
        leftCoin.setStrokeStyle(3, 0xb87924, 0.9);
        const rightCoin = this.add.ellipse(panelWidth / 2 - 58, -panelHeight / 2 + 2, 38, 38, 0xffd56d, 0.96);
        rightCoin.setStrokeStyle(3, 0xb87924, 0.9);

        const title = this.add.text(0, -panelHeight / 2 + 58, result.title, {
            fontFamily: 'Arial',
            fontSize: '44px',
            fontStyle: 'bold',
            color: '#ffe7a8',
            align: 'center',
        });
        title.setOrigin(0.5);

        const detail = this.add.text(0, -panelHeight / 2 + 116, result.detail, {
            fontFamily: 'Arial',
            fontSize: '22px',
            color: '#b9ffe4',
            align: 'center',
        });
        detail.setOrigin(0.5);

        const scoreText = this.add.text(0, -panelHeight / 2 + 166, this.formatScoreRows(scoreRows), {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#fff7df',
            align: 'center',
            lineSpacing: 6,
        });
        scoreText.setOrigin(0.5);
        scoreText.setVisible(scoreRows.length > 0);

        const multipleText = this.add.text(0, panelHeight / 2 - 82, multipleSummary, {
            fontFamily: 'Arial',
            fontSize: '16px',
            color: '#75c9ef',
            align: 'center',
            lineSpacing: 4,
            wordWrap: {width: width - 120},
        });
        multipleText.setOrigin(0.5);
        multipleText.setVisible(Boolean(multipleSummary));

        const next = this.add.text(0, panelHeight / 2 - 42, '即将回到准备', {
            fontFamily: 'Arial',
            fontSize: '18px',
            color: '#ffd56d',
            align: 'center',
        });
        next.setOrigin(0.5);

        layer.add([
            backdrop,
            panelShadow,
            panel,
            panelGlow,
            ribbon,
            leftCoin,
            rightCoin,
            title,
            detail,
            scoreText,
            multipleText,
            next,
        ]);
        layer.setDepth(1000);
        this.gameOverLayer = layer;

        if (this.sound && this.sound.play) {
            this.sound.play(result.sound);
        }
    }

    formatScoreRows(scoreRows) {
        return scoreRows.map(row => {
            const point = row.point > 0 ? '+' + row.point : '' + row.point;
            const balance = row.balance !== undefined && row.balance !== null ? '  余额 ' + row.balance : '';
            return row.name + '  ' + point + balance;
        }).join('\n');
    }

    restartAfterGameOver() {
        this.cleanWorld();
        if (this.gameOverLayer) {
            this.gameOverLayer.destroy();
            this.gameOverLayer = null;
        }
        this.players.forEach(player => {
            player.setReady(false);
            player.setLandlord(false);
            player.setCardCount(0);
            player.say('');
        });
        this.setReadyButtonVisible(true);
        this.setCallScoreControlsVisible(false);
        this.setPlayControlsVisible(false);
        this.setDoubleControlsVisible(false);
        if (this.doubleHud) {
            this.doubleHud.setVisible(false);
            this.doubleHud.setText('');
        }
        if (this.doublePrompt) {
            this.doublePrompt.setVisible(false);
        }
        this.lastShotPlayer = null;
        this.setBottomState([]);
        this.setLastShotState('暂无出牌', []);
        this.setWhoseTurn(-1);
        this.publishStatus({
            phase: '准备中',
            lastAction: '等待下一局准备',
            resultSummary: '',
            multipleSummary: '',
            scoreRows: [],
        });
    }

    cleanWorld() {
        for (let i = 0; i < 3; i++) {
            this.players[i].cleanPokers();
            this.players[i].setLandlord(false);
            this.players[i].setCardCount(0);
        }

        this.tablePokerSprites.forEach(p => {
            if (p && p.destroy) {
                p.destroy();
            }
        });
        this.tablePokerSprites = [];
        this.tablePoker = [];
        this.setBottomState([]);
        this.setLastShotState('暂无出牌', []);
        this.resetDeckPokers();
        this.setWhoseTurn(-1);
    }

    uidToSeat(uid) {
        for (let i = 0; i < 3; i++) {
            if (uid === this.players[i].uid)
                return i;
        }
        console.log('ERROR uidToSeat:' + uid);
        return -1;
    }

    handleShotPoker(packet) {
        const seat = this.uidToSeat(packet.uid);
        if (seat === -1) {
            return;
        }

        this.updateRoomMultiple(packet.multiple);
        const pokers = packet.pokers || [];
        let lastShotLabel = this.players[seat].name + ' · 不出';
        this.setLastShotState(lastShotLabel, []);
        if (pokers.length === 0) {
            this.players[seat].say('不出');
            if (seat === 0) {
                this.removeLocalPokers([]);
            }
        } else {
            const sortedPokers = pokers.slice().sort(Poker.comparePoker);
            lastShotLabel = this.players[seat].name + ' · ' + sortedPokers.length + ' 张';
            this.setLastShotState(lastShotLabel, sortedPokers);
            this.players[seat].say('出牌');
            this.tablePoker = sortedPokers;
            this.lastShotPlayer = this.players[seat];
            this.showTablePokers(sortedPokers);
            if (seat === 0) {
                this.removeLocalPokers(sortedPokers);
            } else {
                this.reducePlayerCardCount(seat, sortedPokers.length);
            }
        }

        this.setWhoseTurn(getNextSeat(seat));
        this.publishStatus({
            phase: '出牌中',
            lastAction: this.players[seat].name + (pokers.length === 0 ? ' 不出' : ' 出牌'),
        });
        if (this.localHand.length > 0) {
            this.time.delayedCall(350, this.startPlay, [], this);
        } else {
            this.setPlayControlsVisible(false);
        }
    }

    getSelectedPokerError() {
        if (this.selectedPokers.length === 0) {
            return '';
        }

        try {
            return this.players[0].canPlay(this.isLastShotPlayer() ? [] : this.tablePoker, this.selectedPokers);
        } catch (error) {
            return '';
        }
    }

    startCallScore() {
        this.updateCallScoreControls();
    }

    startPlay() {
        this.updatePlayControls();
    }

    finishPlay(pokers) {
        if (this.send_message([Protocol.REQ_SHOT_POKER, {pokers: pokers}])) {
            this.setPlayControlsVisible(false);
        }
    }

    isLastShotPlayer() {
        return this.players[this.whoseTurn] === this.lastShotPlayer;
    }

}

export default GameScene;
