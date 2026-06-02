jest.mock('phaser', () => ({
  __esModule: true,
  default: {
    Scene: class {},
  },
}));

jest.mock('./poker', () => ({
  __esModule: true,
  default: {
    comparePoker: jest.fn(),
    toCards: jest.fn(() => ['3', '3']),
  },
  Rule: {
    cardsValue: jest.fn(() => ['pair', 0]),
  },
}));

jest.mock('./net', () => ({
  Protocol: {
    REQ_ROOM_LIST: 'room-list',
    REQ_JOIN_ROOM: 'join-room',
    RSP_LEAVE_ROOM: 'leave-room',
    REQ_CALL_SCORE: 'call-score',
    REQ_READY: 'ready',
    REQ_SHOT_POKER: 'shot-poker',
    REQ_CHAT: 'chat',
    RSP_CHAT: 'chat-response',
  },
  Socket: {
    send: jest.fn(),
  },
}));

jest.mock('./status', () => ({
  emitGameStatus: jest.fn(),
}));

jest.mock('./hint', () => ({
  getSuggestedPokers: jest.fn(),
}));

import GameScene from './game';
import Poker, {Rule} from './poker';
import {emitGameStatus} from './status';
import {Socket} from './net';
import {getSuggestedPokers} from './hint';

const createPlayer = (name, extra = {}) => ({
  name,
  ready: false,
  isLandlord: false,
  setTurnActive: jest.fn(),
  setPoint: jest.fn(function (point) {
    this.point = point;
  }),
  setReady: jest.fn(function (ready) {
    this.ready = Boolean(ready);
  }),
  say: jest.fn(),
  ...extra,
});

const createTextStub = () => ({
  text: '',
  visible: false,
  setText(value) {
    this.text = value;
  },
  setVisible(value) {
    this.visible = value;
  },
});

const createPlayActionStub = action => ({
  action,
  visible: null,
  setVisible: jest.fn(function (value) {
    this.visible = value;
  }),
});

const createStyledPlayActionStub = action => ({
  ...createPlayActionStub(action),
  background: {
    setFillStyle: jest.fn(),
    setStrokeStyle: jest.fn(),
  },
  label: {
    setColor: jest.fn(),
  },
  setAlpha: jest.fn(function (value) {
    this.alpha = value;
  }),
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

it('publishes a blocked action hint when an operation cannot be sent', () => {
  Socket.send.mockReturnValue(false);
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.markReady();

  expect(Socket.send).toHaveBeenCalledWith(['ready', {ready: 1}]);
  expect(localPlayer.say).toHaveBeenCalledWith('连接未建立，操作未发送');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '连接未建立，操作未发送',
    actionHint: '连接未建立，操作未发送',
    actionTone: 'blocked',
  }));
});

it('marks the local player ready from the ready button action', () => {
  Socket.send.mockReturnValue(true);
  const scene = new GameScene();
  scene.setReadyButtonVisible = jest.fn();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentPhase = '准备中';
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.markReady();

  expect(Socket.send).toHaveBeenCalledWith(['ready', {ready: 1}]);
  expect(scene.players[0].ready).toBe(true);
  expect(scene.setReadyButtonVisible).toHaveBeenCalledWith(true);
});

it('lets the local player cancel ready before a hand is dealt', () => {
  Socket.send.mockReturnValue(true);
  const scene = new GameScene();
  scene.setReadyButtonVisible = jest.fn();
  scene.publishStatus = jest.fn();
  scene.players = [
    createPlayer('me', {ready: true}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.markReady();

  expect(Socket.send).toHaveBeenCalledWith(['ready', {ready: 0}]);
  expect(scene.players[0].ready).toBe(false);
  expect(scene.setReadyButtonVisible).toHaveBeenCalledWith(true);
  expect(scene.publishStatus).toHaveBeenCalledWith({
    phase: '准备中',
    lastAction: 'me 取消准备',
  });
});

it('updates the ready button label and tone from local ready state', () => {
  const scene = new GameScene();
  const label = {setText: jest.fn(), setColor: jest.fn()};
  const background = {setFillStyle: jest.fn(), setStrokeStyle: jest.fn()};
  scene.readyButton = {label, background};
  scene.players = [
    createPlayer('me', {ready: true}),
    createPlayer('next'),
    createPlayer('prev'),
  ];

  scene.updateReadyButtonState();

  expect(label.setText).toHaveBeenCalledWith('取消准备');
  expect(label.setColor).toHaveBeenCalledWith('#ffe7a8');
  expect(background.setFillStyle).toHaveBeenCalledWith(0x8f2429, 0.98);
  expect(background.setStrokeStyle).toHaveBeenCalledWith(3, 0xffd56d, 0.88);

  scene.players[0].ready = false;
  scene.updateReadyButtonState();

  expect(label.setText).toHaveBeenLastCalledWith('准备');
  expect(label.setColor).toHaveBeenLastCalledWith('#301409');
  expect(background.setFillStyle).toHaveBeenLastCalledWith(0xf0a12e, 0.98);
  expect(background.setStrokeStyle).toHaveBeenLastCalledWith(3, 0xffe7a8, 0.88);
});

it('chooses call score from the visible call-score action', () => {
  Socket.send.mockReturnValue(true);
  const scene = new GameScene();
  scene.setCallScoreControlsVisible = jest.fn();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = 0;
  scene.currentPhase = '叫地主';
  scene.currentRoom = {id: 8, multiple: 15, timer: 20};

  scene.chooseCallScore(1);

  expect(Socket.send).toHaveBeenCalledWith(['call-score', {rob: 1}]);
  expect(scene.setCallScoreControlsVisible).toHaveBeenCalledWith(false);
});

it('hides call-score actions while waiting for another player', () => {
  const scene = new GameScene();
  const callAction = createPlayActionStub('call');
  scene.callScoreLayer = {};
  scene.callScorePrompt = createTextStub();
  scene.callScoreActions = [callAction];
  scene.whoseTurn = 1;
  scene.setCallScoreControlsVisible = jest.fn();

  scene.updateCallScoreControls();

  expect(scene.callScorePrompt.text).toBe('等待对手抢地主');
  expect(callAction.setVisible).toHaveBeenCalledWith(false);
  expect(scene.setCallScoreControlsVisible).toHaveBeenCalledWith(true);
});

it('joins the room level selected on the login screen after socket open', () => {
  localStorage.setItem('roomLevel', '2');
  const scene = new GameScene();
  scene.reconnectDelay = 4000;
  scene.setConnectionText = jest.fn();
  scene.publishStatus = jest.fn();

  scene.onopen();

  expect(scene.reconnectDelay).toBe(1000);
  expect(scene.setConnectionText).toHaveBeenCalledWith('');
  expect(scene.publishStatus).toHaveBeenCalledWith({
    connection: '已连接',
    lastAction: '正在加入 2 档房间',
  });
  expect(Socket.send).toHaveBeenCalledWith(['room-list', {}]);
  expect(Socket.send).toHaveBeenCalledWith(['join-room', {room: -1, level: 2}]);
});

it('rejoins the stored room when the login session can be resumed', () => {
  localStorage.setItem('roomLevel', '3');
  localStorage.setItem('room', '18');
  const scene = new GameScene();
  scene.setConnectionText = jest.fn();
  scene.publishStatus = jest.fn();

  scene.onopen();

  expect(scene.publishStatus).toHaveBeenCalledWith({
    connection: '已连接',
    lastAction: '正在恢复房间 18',
  });
  expect(Socket.send).toHaveBeenCalledWith(['room-list', {}]);
  expect(Socket.send).toHaveBeenCalledWith(['join-room', {room: 18, level: 3}]);
});

it('stores the synced room id after joining or resuming a room', () => {
  const scene = new GameScene();
  scene.titleBar = {setText: jest.fn()};
  scene.cleanWorld = jest.fn();
  scene.setReadyButtonVisible = jest.fn();
  scene.publishStatus = jest.fn();
  scene.players = [
    createPlayer('me', {updateInfo: jest.fn(), setReady: jest.fn(), setLandlord: jest.fn(), setLeft: jest.fn(), setCardCount: jest.fn()}),
    createPlayer('next', {updateInfo: jest.fn(), setReady: jest.fn(), setLandlord: jest.fn(), setLeft: jest.fn(), setCardCount: jest.fn()}),
    createPlayer('prev', {updateInfo: jest.fn(), setReady: jest.fn(), setLandlord: jest.fn(), setLeft: jest.fn(), setCardCount: jest.fn()}),
  ];
  localStorage.setItem('uid', '7');

  scene.applyRoomSync({
    room: {id: 18, state: 1, label: '进阶场', origin: 30, multiple: 15},
    players: [
      {uid: 7, name: 'me', point: 1000},
      {uid: 8, name: 'left', leave: 1, point: 900},
      {},
    ],
  });

  expect(localStorage.getItem('room')).toBe('18');
  expect(scene.players[1].setLeft).toHaveBeenCalledWith(true);
});

it('clears a stale stored room and rematches when rejoin fails', () => {
  localStorage.setItem('room', '18');
  localStorage.setItem('roomLevel', '2');
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.setPlayControlsVisible = jest.fn();
  scene.publishStatus = jest.fn();

  scene.showError({reason: 'Room[18] Not Found'});

  expect(localStorage.getItem('room')).toBeNull();
  expect(scene.players[0].say).not.toHaveBeenCalled();
  expect(scene.publishStatus).toHaveBeenCalledWith({
    lastAction: '原房间已关闭，正在重新匹配',
    actionHint: '正在加入 2 档房间',
    actionTone: 'waiting',
  });
  expect(Socket.send).toHaveBeenCalledWith(['join-room', {room: -1, level: 2}]);
});

it('falls back to the beginner room when the selected room level needs more points', () => {
  localStorage.setItem('room', '18');
  localStorage.setItem('roomLevel', '3');
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.setPlayControlsVisible = jest.fn();
  scene.publishStatus = jest.fn();

  scene.showError({reason: 'Insufficient point for room level'});

  expect(localStorage.getItem('room')).toBeNull();
  expect(localStorage.getItem('roomLevel')).toBe('1');
  expect(scene.players[0].say).not.toHaveBeenCalled();
  expect(scene.publishStatus).toHaveBeenCalledWith({
    lastAction: '积分不足，已切换到新手场',
    actionHint: '正在加入新手场',
    actionTone: 'waiting',
  });
  expect(Socket.send).toHaveBeenCalledWith(['join-room', {room: -1, level: 1}]);
});

it('shows a temporary leave status when another player disconnects', () => {
  const scene = new GameScene();
  const nextPlayer = createPlayer('next', {
    uid: 8,
    ready: true,
    setReady: jest.fn(function (ready) {
      this.ready = Boolean(ready);
    }),
    setLeft: jest.fn(function (left) {
      this.left = Boolean(left);
    }),
    setTurnActive: jest.fn(),
  });
  scene.players = [
    createPlayer('me', {uid: 7}),
    nextPlayer,
    createPlayer('prev', {uid: 9}),
  ];
  scene.publishStatus = jest.fn();

  scene.onmessage(['leave-room', {uid: 8}]);

  expect(nextPlayer.ready).toBe(false);
  expect(nextPlayer.left).toBe(true);
  expect(nextPlayer.setReady).toHaveBeenCalledWith(false);
  expect(nextPlayer.setLeft).toHaveBeenCalledWith(true);
  expect(nextPlayer.setTurnActive).toHaveBeenCalledWith(false);
  expect(nextPlayer.say).toHaveBeenCalledWith('暂离');
  expect(scene.publishStatus).toHaveBeenCalledWith({
    lastAction: 'next 暂离',
    actionHint: 'next 暂离',
    actionTone: 'blocked',
  });
});

it('shows chat broadcasts as seat bubbles and React activity', () => {
  const scene = new GameScene();
  const nextPlayer = createPlayer('next', {uid: 8});
  scene.players = [
    createPlayer('me', {uid: 7}),
    nextPlayer,
    createPlayer('prev', {uid: 9}),
  ];
  scene.publishStatus = jest.fn();

  scene.onmessage(['chat-response', {uid: 8, message: '打得不错'}]);

  expect(nextPlayer.say).toHaveBeenCalledWith('打得不错');
  expect(scene.publishStatus).toHaveBeenCalledWith({
    lastAction: 'next：打得不错',
    actionHint: '打得不错',
    actionTone: 'waiting',
  });
});

it('builds a game-over status summary from winner and score rows', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {uid: 7, isLandlord: true}),
    createPlayer('next', {uid: 8}),
    createPlayer('prev', {uid: 9}),
  ];
  scene.whoseTurn = 0;

  expect(scene.getGameOverStatus({
    players: [
      {uid: 7, point: 20},
      {uid: 8, point: -10},
      {uid: 9, point: -10},
    ],
  })).toEqual({
    phase: '结算',
    lastAction: '对局结束',
    actionHint: '地主赢 · me +20 / next -10 / prev -10',
    actionTone: 'done',
    resultSummary: '地主赢 · me +20 / next -10 / prev -10',
    multipleSummary: '',
    scoreRows: [
      {uid: 7, name: 'me', point: 20},
      {uid: 8, name: 'next', point: -10},
      {uid: 9, name: 'prev', point: -10},
    ],
  });
});

it('applies game-over balances to local player state before publishing settlement status', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {uid: 7, isLandlord: true, point: 1000}),
    createPlayer('next', {uid: 8, point: 1000}),
    createPlayer('prev', {uid: 9, point: 1000}),
  ];
  scene.whoseTurn = 0;

  scene.applyGameOverBalances({
    players: [
      {uid: 7, point: 20, balance: 1020},
      {uid: 8, point: -10, balance: 990},
      {uid: 9, point: -10, balance: 990},
    ],
  });

  expect(scene.players.map(player => player.point)).toEqual([1020, 990, 990]);
  expect(scene.getSeatSummaries().map(seat => seat.point)).toEqual([1020, 990, 990]);
});

it('clears the result summary when returning to ready state after game over', () => {
  const scene = new GameScene();
  scene.cleanWorld = jest.fn();
  scene.gameOverLayer = {destroy: jest.fn()};
  scene.setReadyButtonVisible = jest.fn();
  scene.setCallScoreControlsVisible = jest.fn();
  scene.setPlayControlsVisible = jest.fn();
  scene.players = [
    createPlayer('me', {setReady: jest.fn(), setLandlord: jest.fn(), setCardCount: jest.fn()}),
    createPlayer('next', {setReady: jest.fn(), setLandlord: jest.fn(), setCardCount: jest.fn()}),
    createPlayer('prev', {setReady: jest.fn(), setLandlord: jest.fn(), setCardCount: jest.fn()}),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = 0;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.restartAfterGameOver();

  expect(scene.gameOverLayer).toBeNull();
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '准备中',
    lastAction: '等待下一局准备',
    resultSummary: '',
    multipleSummary: '',
    scoreRows: [],
  }));
});

it('formats game-over rows with balances for the Phaser result panel', () => {
  const scene = new GameScene();

  expect(scene.formatScoreRows([
    {name: 'me', point: 20, balance: 1020},
    {name: 'next', point: -10},
  ])).toBe('me  +20  余额 1020\nnext  -10');
});

it('publishes actionable ready hints before the local player is ready', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.publishStatus({phase: '准备中', lastAction: '等待玩家准备'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '准备中',
    roomLabel: '房间 8',
    roomLevelLabel: '未选择',
    roomOrigin: 0,
    actionHint: '点击准备开始对局',
    actionTone: 'action',
  }));
});

it('publishes synced room level and base score to the React shell', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, label: '进阶场', origin: 30, multiple: 15, timer: 0};

  scene.publishStatus({phase: '准备中', lastAction: '等待玩家准备'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    roomLabel: '进阶场 · 房间 8',
    roomLevelLabel: '进阶场',
    roomOrigin: 30,
  }));
});

it('publishes waiting ready hints after the local player is ready', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {ready: true}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.publishStatus({phase: '准备中', lastAction: 'me 已准备'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '准备中',
    actionHint: '等待其他玩家准备',
    actionTone: 'waiting',
  }));
});

it('publishes connection loss as a blocked action hint', () => {
  const scene = new GameScene();
  scene.connectionText = createTextStub();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.setConnectionText('连接已断开，1 秒后重连...');

  expect(scene.connectionText.text).toBe('连接已断开，1 秒后重连...');
  expect(scene.connectionText.visible).toBe(true);
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    connection: '连接已断开，1 秒后重连...',
    lastAction: '连接已断开，1 秒后重连...',
    actionHint: '连接已断开，1 秒后重连...',
    actionTone: 'blocked',
  }));
});

it('publishes connecting state as a waiting action hint', () => {
  const scene = new GameScene();
  scene.connectionText = createTextStub();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.setConnectionText('正在连接牌桌...');

  expect(scene.connectionText.text).toBe('正在连接牌桌...');
  expect(scene.connectionText.visible).toBe(true);
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    connection: '正在连接牌桌...',
    lastAction: '正在连接牌桌...',
    actionHint: '正在连接牌桌...',
    actionTone: 'waiting',
  }));
});

it('translates server errors into blocked React status feedback', () => {
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.setPlayControlsVisible = jest.fn();
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [3, 4];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.showError({reason: 'Poker small than last shot'});

  expect(localPlayer.say).toHaveBeenCalledWith('出牌需要大于上家');
  expect(scene.setPlayControlsVisible).toHaveBeenCalledWith(true);
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '出牌需要大于上家',
    actionHint: '出牌需要大于上家',
    actionTone: 'blocked',
  }));
});

it('publishes unknown server messages as blocked React status feedback', () => {
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.setPlayControlsVisible = jest.fn();
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = -1;
  scene.currentPhase = '准备中';
  scene.currentRoom = {id: 8, multiple: 15, timer: 0};

  scene.onmessage([9999, {x: 1}]);

  expect(localPlayer.say).toHaveBeenCalledWith('收到暂不支持的服务器消息');
  expect(scene.setPlayControlsVisible).toHaveBeenCalledWith(false);
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '收到暂不支持的服务器消息',
    actionHint: '收到暂不支持的服务器消息',
    actionTone: 'blocked',
  }));
});

it('publishes a pass-aware prompt when the local player follows another shot', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.publishStatus({phase: '出牌中', lastAction: '轮到你出牌'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '出牌中',
    actionHint: '可不出，或选择牌跟上',
    actionTone: 'action',
  }));
});

it('shows the clear play action only after cards are selected', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.playActions = [
    createPlayActionStub('pass'),
    createPlayActionStub('hint'),
    createPlayActionStub('clear'),
    createPlayActionStub('shot'),
  ];
  scene.selectedPokers = [];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;

  scene.updatePlayActionVisibility();

  expect(scene.playActions.map(action => action.visible)).toEqual([true, true, false, true]);

  scene.selectedPokers = [3, 4];
  scene.updatePlayActionVisibility();

  expect(scene.playActions.map(action => action.visible)).toEqual([true, true, true, true]);

  scene.lastShotPlayer = scene.players[0];
  scene.updatePlayActionVisibility();

  expect(scene.playActions.map(action => action.visible)).toEqual([false, true, true, true]);
});

it('dims the shot action until the selected cards can be submitted', () => {
  const scene = new GameScene();
  const shotAction = createStyledPlayActionStub('shot');
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.playPrompt = createTextStub();
  scene.playActions = [
    createPlayActionStub('hint'),
    shotAction,
  ];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;

  scene.updateShotButtonState();

  expect(shotAction.canSubmit).toBe(false);
  expect(shotAction.disabledReason).toBe('请选择要出的牌');
  expect(shotAction.setAlpha).toHaveBeenLastCalledWith(0.48);
  expect(shotAction.background.setFillStyle).toHaveBeenLastCalledWith(0x4a3d38, 0.72);
  expect(shotAction.background.setStrokeStyle).toHaveBeenLastCalledWith(2, 0x8a817a, 0.38);
  expect(shotAction.label.setColor).toHaveBeenLastCalledWith('#d2c2ac');

  scene.selectedPokers = [3, 4];
  scene.updateShotButtonState();

  expect(shotAction.canSubmit).toBe(true);
  expect(shotAction.disabledReason).toBe('');
  expect(shotAction.setAlpha).toHaveBeenLastCalledWith(1);
  expect(shotAction.background.setFillStyle).toHaveBeenLastCalledWith(0x0b705d, 0.98);
  expect(shotAction.background.setStrokeStyle).toHaveBeenLastCalledWith(2, 0xffd56d, 0.9);
  expect(shotAction.label.setColor).toHaveBeenLastCalledWith('#fff7df');
});

it('keeps the shot action disabled when the selected cards are invalid', () => {
  const scene = new GameScene();
  const shotAction = createStyledPlayActionStub('shot');
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '出牌需要大于上家')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.playPrompt = createTextStub();
  scene.playActions = [shotAction];
  scene.selectedPokers = [3, 4];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;

  scene.updateShotButtonState();

  expect(shotAction.canSubmit).toBe(false);
  expect(shotAction.disabledReason).toBe('出牌需要大于上家');
  expect(shotAction.setAlpha).toHaveBeenLastCalledWith(0.48);
  expect(scene.playPrompt.text).toBe('出牌需要大于上家');
});

it('publishes a lead prompt when the local player owns the last shot', () => {
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[0];
  scene.whoseTurn = 0;
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.publishStatus({phase: '出牌中', lastAction: '轮到你出牌'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '出牌中',
    actionHint: '请选择牌出牌',
    actionTone: 'action',
  }));
});

it('publishes a submit prompt after the local player selects legal cards', () => {
  Poker.toCards.mockReturnValue(['3', '3']);
  Rule.cardsValue.mockReturnValue(['pair', 0]);
  const scene = new GameScene();
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 16, 5];
  scene.selectedPokers = [3, 16];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.publishStatus({phase: '出牌中', lastAction: '已选 2 张牌'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    phase: '出牌中',
    actionHint: '已选 2 张牌，点击出牌',
    actionTone: 'action',
    bottomCount: 0,
    bottomPokerLabel: '',
    bottomPokerTypeLabel: '',
    selectedPokerLabel: '3 3',
    selectedPokerTypeLabel: '对子',
    lastShotPokerLabel: '',
    lastShotPokerTypeLabel: '',
  }));
});

it('passes the current selection into play hints so repeated hints can cycle', () => {
  getSuggestedPokers.mockReturnValue([4]);
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [3];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};
  scene.updateHandSelection = jest.fn();
  scene.updateShotButtonState = jest.fn();
  scene.publishStatus = jest.fn();

  scene.applyPlayHint();

  expect(getSuggestedPokers).toHaveBeenCalledWith([3, 4, 5], [20], false, [3]);
  expect(scene.selectedPokers).toEqual([4]);
  expect(scene.updateHandSelection).toHaveBeenCalled();
  expect(scene.updateShotButtonState).toHaveBeenCalled();
  expect(localPlayer.say).toHaveBeenCalledWith('已选提示牌');
  expect(scene.publishStatus).toHaveBeenCalledWith({lastAction: '已选出牌提示'});
});

it('publishes a pass hint when no suggested follow-up cards exist', () => {
  getSuggestedPokers.mockReturnValue([]);
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.applyPlayHint();

  expect(localPlayer.say).toHaveBeenCalledWith('没有可出的牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '没有可出的提示',
    actionHint: '没有可出的牌，可以不出',
    actionTone: 'action',
  }));
});

it('publishes a blocked hint when no lead cards can be suggested', () => {
  getSuggestedPokers.mockReturnValue([]);
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[0];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.applyPlayHint();

  expect(localPlayer.say).toHaveBeenCalledWith('没有可出的牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '没有可出的提示',
    actionHint: '没有可出的牌',
    actionTone: 'blocked',
  }));
});

it('submits the selected cards from the visible play action', () => {
  Socket.send.mockReturnValue(true);
  const scene = new GameScene();
  scene.setPlayControlsVisible = jest.fn();
  scene.players = [
    createPlayer('me', {canPlay: jest.fn(() => '')}),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [3, 4];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.choosePlayAction('shot');

  expect(Socket.send).toHaveBeenCalledWith(['shot-poker', {pokers: [3, 4]}]);
  expect(scene.setPlayControlsVisible).toHaveBeenCalledWith(false);
});

it('publishes readable last-shot card details after a player shoots', () => {
  Poker.toCards.mockReturnValue(['3', '3']);
  Rule.cardsValue.mockReturnValue(['pair', 0]);
  const scene = new GameScene();
  scene.setPlayControlsVisible = jest.fn();
  scene.players = [
    createPlayer('me', {uid: 7, cardCount: 8, setCardCount: jest.fn()}),
    createPlayer('next', {uid: 8, cardCount: 9, setCardCount: jest.fn()}),
    createPlayer('prev', {uid: 9, cardCount: 10, setCardCount: jest.fn()}),
  ];
  scene.localHand = [];
  scene.selectedPokers = [];
  scene.tablePoker = [];
  scene.whoseTurn = 1;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};
  scene.showTablePokers = jest.fn();

  scene.handleShotPoker({uid: 8, pokers: [3, 16], multiple: 60});

  expect(scene.showTablePokers).toHaveBeenCalledWith([3, 16]);
  expect(scene.players[1].say).toHaveBeenCalledWith('出牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    multiple: 60,
    lastShotLabel: 'next · 2 张',
    lastShotPokerLabel: '3 3',
    lastShotPokerTypeLabel: '对子',
    lastAction: 'next 出牌',
  }));

  emitGameStatus.mockClear();
  scene.publishStatus({phase: '出牌中', lastAction: '轮到你出牌'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastShotLabel: 'next · 2 张',
    lastShotPokerLabel: '3 3',
    lastShotPokerTypeLabel: '对子',
  }));
});

it('keeps bottom cards independent from the last shot status', () => {
  Poker.toCards.mockImplementation(pokers => pokers.length === 3 ? ['3', '3', '3'] : ['3', '3']);
  Rule.cardsValue.mockImplementation(cards => cards.length === 3 ? ['trio', 0] : ['pair', 0]);
  const scene = new GameScene();
  scene.players = [
    createPlayer('me'),
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [9];
  scene.lastShotPokers = [3, 16];
  scene.lastShotLabel = 'next · 2 张';
  scene.bottomPokers = [53, 54, 3];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 60, timer: 10};

  scene.publishStatus({phase: '出牌中', lastAction: '轮到你出牌'});

  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    bottomCount: 3,
    bottomPokerLabel: '大王 小王 3',
    bottomPokerTypeLabel: '三张',
    lastShotLabel: 'next · 2 张',
    lastShotPokerLabel: '3 3',
    lastShotPokerTypeLabel: '对子',
  }));
});

it('blocks the pass action when the local player must lead the trick', () => {
  Socket.send.mockReturnValue(true);
  const scene = new GameScene();
  const localPlayer = createPlayer('me', {canPlay: jest.fn(() => '')});
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [];
  scene.tablePoker = [20];
  scene.lastShotPlayer = localPlayer;
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.choosePlayAction('pass');

  expect(Socket.send).not.toHaveBeenCalled();
  expect(localPlayer.say).toHaveBeenCalledWith('本轮需要你先出牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '本轮需要你先出牌',
    actionHint: '本轮需要你先出牌',
    actionTone: 'blocked',
  }));
});

it('clears selected cards from the clear play action', () => {
  const scene = new GameScene();
  const localPlayer = createPlayer('me', {canPlay: jest.fn(() => '')});
  scene.updateHandSelection = jest.fn();
  scene.updateShotButtonState = jest.fn();
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [3, 4];
  scene.tablePoker = [20];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.choosePlayAction('clear');

  expect(scene.selectedPokers).toEqual([]);
  expect(scene.updateHandSelection).toHaveBeenCalled();
  expect(scene.updateShotButtonState).toHaveBeenCalled();
  expect(localPlayer.say).toHaveBeenCalledWith('已清空选牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    selectedPokerCount: 0,
    lastAction: '已清空选牌',
  }));
});

it('blocks play actions while another decision phase is active', () => {
  const scene = new GameScene();
  const localPlayer = createPlayer('me');
  scene.players = [
    localPlayer,
    createPlayer('next'),
    createPlayer('prev'),
  ];
  scene.localHand = [3, 4, 5];
  scene.selectedPokers = [3, 4];
  scene.tablePoker = [20];
  scene.whoseTurn = 0;
  scene.currentPhase = '叫地主';
  scene.currentRoom = {id: 8, multiple: 15, timer: 20};

  scene.choosePlayAction('shot');

  expect(Socket.send).not.toHaveBeenCalled();
  expect(localPlayer.say).toHaveBeenCalledWith('还没轮到你出牌');
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    lastAction: '还没轮到你出牌',
    actionHint: '还没轮到你出牌',
    actionTone: 'waiting',
  }));
});

it('publishes invalid shot reasons to the React status rail', () => {
  const scene = new GameScene();
  const localPlayer = createPlayer('me', {
    canPlay: jest.fn(() => '出牌需要大于上家'),
  });
  scene.players = [
    localPlayer,
    createPlayer('next', {cardCount: 9, isLandlord: true}),
    createPlayer('prev', {ready: true, cardCount: 8}),
  ];
  scene.selectedPokers = [3, 4];
  scene.localHand = [3, 4, 5];
  scene.tablePoker = [20, 21];
  scene.lastShotPlayer = scene.players[1];
  scene.whoseTurn = 0;
  scene.currentPhase = '出牌中';
  scene.currentRoom = {id: 8, multiple: 30, timer: 12};

  scene.choosePlayAction('shot');

  expect(localPlayer.say).toHaveBeenCalledWith('出牌需要大于上家');
  expect(Socket.send).not.toHaveBeenCalled();
  expect(emitGameStatus).toHaveBeenCalledWith(expect.objectContaining({
    roomLabel: '房间 8',
    multiple: 30,
    turnTimer: 12,
    selectedPokerCount: 2,
    lastAction: '出牌需要大于上家',
    actionHint: '出牌需要大于上家',
    actionTone: 'blocked',
    seatSummaries: [
      {seat: '你', name: 'me', ready: false, landlord: false, left: false, turn: true, point: 0, cardCount: 3},
      {seat: '下家', name: 'next', ready: false, landlord: true, left: false, turn: false, point: 0, cardCount: 9},
      {seat: '上家', name: 'prev', ready: true, landlord: false, left: false, turn: false, point: 0, cardCount: 8},
    ],
  }));
});
