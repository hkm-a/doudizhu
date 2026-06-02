import React from 'react';
import ReactDOM from 'react-dom';
import {act, Simulate} from 'react-dom/test-utils';
import App, {
  buildRoundHistory,
  buildRoundHistoryStats,
  createChatReceipt,
  createRoundHistoryEntry,
  getActionAdvisor,
  getActionStateLabel,
  getConnectionTone,
  getLocalSettlementSummary,
  getMultipleRisk,
  getPhaseProgress,
  getScorePointLabel,
  getScorePointTone,
  getScoreRowClassName,
  getReadyProgress,
  getSeatPressure,
  getSeatStatusBadges,
  getTablePulse,
  getTurnTimerSummary,
  isLocalScoreRow,
  getLocalSeatPoint,
  getStoredToken,
  readStoredSession,
  removeStoredItem,
  setStoredItem,
  storeSessionRoom,
} from './App';
import {formatLobbySummary, readStoredLoginName, readStoredLoginPoint} from './components/Login';
import {Protocol, Socket} from './game/net';
import {GAME_STATUS_EVENT} from './game/status';

jest.mock('./game/Index', () => function MockGame() {
  return <div data-testid="game">Game</div>;
});

const REAL_XMLHTTPREQUEST = global.XMLHttpRequest;

afterEach(() => {
  localStorage.clear();
  global.XMLHttpRequest = REAL_XMLHTTPREQUEST;
  jest.restoreAllMocks();
  jest.useRealTimers();
});

const installMockXMLHttpRequest = function () {
  const requests = [];
  const originalXMLHttpRequest = global.XMLHttpRequest;
  class MockXMLHttpRequest {
    static DONE = 4;

    constructor() {
      this.readyState = 0;
      this.status = 0;
      this.responseText = '';
      this.method = '';
      this.url = '';
      this.headers = {};
      requests.push(this);
    }

    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(body) {
      this.body = body;
    }
  }
  global.XMLHttpRequest = MockXMLHttpRequest;
  return {
    requests,
    restore() {
      global.XMLHttpRequest = originalXMLHttpRequest;
    },
    MockXMLHttpRequest,
  };
};

const finishRequest = function (request, MockXMLHttpRequest, status, response) {
  request.readyState = MockXMLHttpRequest.DONE;
  request.status = status;
  request.responseText = typeof response === 'string' ? response : JSON.stringify(response);
  request.onreadystatechange();
};

it('reads local session storage defensively', () => {
  const storage = {
    getItem(key) {
      return {token: 'saved-token', name: 'tester', uid: '42'}[key];
    },
  };

  expect(readStoredSession(storage)).toEqual({
    token: 'saved-token',
    name: 'tester',
    uid: '42',
    point: 1000,
    page: 'game',
  });
  expect(readStoredSession({getItem() { throw new Error('blocked'); }})).toEqual({
    token: null,
    name: 'player',
    uid: null,
    point: 1000,
    page: 'login',
  });
  expect(getStoredToken(storage)).toBe('saved-token');
  expect(getStoredToken({getItem() { throw new Error('blocked'); }})).toBeNull();
  expect(readStoredLoginName({getItem() { throw new Error('blocked'); }})).toBe('player');
  expect(readStoredLoginPoint({getItem() { return null; }})).toBe(1000);
  expect(readStoredLoginPoint({getItem() { return '2400'; }})).toBe(2400);
  expect(readStoredLoginPoint({getItem() { throw new Error('blocked'); }})).toBe(1000);
});

it('formats lobby summaries for the login status chips', () => {
  expect(formatLobbySummary({players: 4, waiting_rooms: 1, playing_rooms: 2})).toBe('在线 4 · 房间 3');
  expect(formatLobbySummary({players: 'bad', waiting_rooms: 'bad', playing_rooms: 2})).toBe('在线 0 · 房间 2');
  expect(formatLobbySummary(null)).toBe('在线 0 · 房间 0');
});

it('keeps happy Dou Dizhu HUD widgets responsive on narrow screens', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Login.css'), 'utf8');

  expect(css).toContain('@media (max-width: 520px)');
  expect(css).toContain('.game-shell__metrics,\n  .game-shell__round-summary,\n  .game-shell__quick-chat-presets,\n  .game-shell__quick-chat form,');
  expect(css).toContain('.game-shell__local-settlement,\n  .game-shell__score-row,\n  .game-shell__seat-meta,\n  .game-shell__turn-focus,');
  expect(css).toContain('.game-shell__local-settlement small {\n    white-space: normal;');
});

it('distributes the happy Dou Dizhu HUD around the table', () => {
  const fs = require('fs');
  const path = require('path');
  const css = fs.readFileSync(path.join(process.cwd(), 'src/components/Login.css'), 'utf8');

  expect(css).toContain('grid-template-columns: minmax(236px, 300px) minmax(560px, 1fr) minmax(236px, 300px);');
  expect(css).toContain('.game-shell__rail {\n  display: contents;');
  expect(css).toContain('"quick-chat stage last-shot"');
  expect(css).toContain('"metrics metrics metrics"');
  expect(css).toContain('--table-red: #d83b32;');
  expect(css).toContain('--table-gold: #ffd56d;');
  expect(css).toContain('--table-green: #08705a;');
  expect(css).toContain('.game-shell__stage {\n  grid-area: stage;');
  expect(css).toContain('.game-shell__advisor { grid-area: advisor; }');
  expect(css).toContain('.game-shell__table-status { grid-area: table-status; }');
  expect(css).toContain('.game-shell__round-state { grid-area: round-state; }');
  expect(css).toContain('@media (max-width: 760px)');
  expect(css).toContain('grid-template-areas: none;');
  expect(css).toContain('.game-shell__rail {\n    display: grid;');
});

it('does not fail app actions when local session storage writes are unavailable', () => {
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  jest.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('blocked');
  });

  expect(setStoredItem('token', 'saved-token')).toBe(false);
  expect(removeStoredItem('token')).toBe(false);
});

it('stores the resumable room id from a login session defensively', () => {
  expect(storeSessionRoom(18)).toBe(true);
  expect(localStorage.getItem('room')).toBe('18');
  expect(storeSessionRoom(-1)).toBe(true);
  expect(localStorage.getItem('room')).toBeNull();

  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  expect(storeSessionRoom(7)).toBe(false);
});

it('summarizes the current action state for the game shell', () => {
  expect(getActionStateLabel('action')).toBe('轮到你操作');
  expect(getActionStateLabel('waiting')).toBe('等待对手');
  expect(getActionStateLabel('blocked')).toBe('操作受阻');
  expect(getActionStateLabel('done')).toBe('本局结束');
  expect(getActionStateLabel('unknown')).toBe('等待对手');
  expect(getActionStateLabel('action', true)).toBe('即将超时');
});

it('maps connection copy to visual connection tones', () => {
  expect(getConnectionTone('已连接')).toBe('online');
  expect(getConnectionTone('连接已建立')).toBe('online');
  expect(getConnectionTone('正在连接牌桌...')).toBe('waiting');
  expect(getConnectionTone('连接已断开，1 秒后重连...')).toBe('blocked');
  expect(getConnectionTone('本地服务未连接')).toBe('blocked');
});

it('maps game phases to stage progress values', () => {
  expect(getPhaseProgress('准备中')).toEqual({index: 0, percent: 25});
  expect(getPhaseProgress('叫地主')).toEqual({index: 1, percent: 50});
  expect(getPhaseProgress('出牌中')).toEqual({index: 2, percent: 75});
  expect(getPhaseProgress('结算')).toEqual({index: 3, percent: 100});
  expect(getPhaseProgress('未知阶段')).toEqual({index: 0, percent: 25});
});

it('summarizes multiple risk for the game metrics', () => {
  expect(getMultipleRisk(15)).toEqual({
    label: '风险正常',
    detail: '常规倍数',
    tone: 'normal',
  });
  expect(getMultipleRisk(30)).toEqual({
    label: '倍数升温',
    detail: '注意本局积分',
    tone: 'warm',
  });
  expect(getMultipleRisk(60)).toEqual({
    label: '高倍风险',
    detail: '输赢波动很大',
    tone: 'danger',
  });
  expect(getMultipleRisk('bad')).toEqual({
    label: '待确认',
    detail: '等待倍数同步',
    tone: 'waiting',
  });
});

it('summarizes the turn timer display state', () => {
  expect(getTurnTimerSummary(0)).toEqual({
    valueLabel: '待开始',
    stateLabel: '暂无计时',
    tone: 'idle',
  });
  expect(getTurnTimerSummary('bad')).toEqual({
    valueLabel: '待开始',
    stateLabel: '暂无计时',
    tone: 'idle',
  });
  expect(getTurnTimerSummary(5)).toEqual({
    valueLabel: '5s',
    stateLabel: '即将超时',
    tone: 'low',
  });
  expect(getTurnTimerSummary(18)).toEqual({
    valueLabel: '18s',
    stateLabel: '计时中',
    tone: 'active',
  });
});

it('labels seat card-count pressure for late-game decisions', () => {
	expect(getSeatPressure({seat: '下家', name: 'next', cardCount: 1})).toEqual({
		label: '报单',
    tone: 'danger',
  });
  expect(getSeatPressure({seat: '下家', name: 'next', left: true, cardCount: 1})).toEqual({
    label: '',
    tone: 'normal',
  });
  expect(getSeatPressure({seat: '上家', name: 'prev', cardCount: 2})).toEqual({
    label: '报双',
    tone: 'danger',
  });
  expect(getSeatPressure({seat: '你', name: 'me', cardCount: 2})).toEqual({
    label: '剩 2 张',
    tone: 'low',
  });
  expect(getSeatPressure({seat: '下家', name: 'next', cardCount: 5})).toEqual({
    label: '低牌量',
    tone: 'low',
  });
  expect(getSeatPressure({seat: '下家', name: '等待玩家加入', cardCount: 1})).toEqual({
    label: '',
    tone: 'normal',
	});
});

it('builds compact seat badges for role, turn, and pressure', () => {
  expect(getSeatStatusBadges(
    {seat: '下家', name: 'next', ready: true, landlord: true, turn: true, cardCount: 2},
    {label: '报双', tone: 'danger'},
  )).toEqual([
    {label: '地主', tone: 'landlord'},
    {label: '当前回合', tone: 'turn'},
    {label: '报双', tone: 'danger'},
  ]);
  expect(getSeatStatusBadges({seat: '上家', name: 'prev', left: true, cardCount: 1})).toEqual([
    {label: '暂离', tone: 'blocked'},
  ]);
  expect(getSeatStatusBadges({seat: '你', name: 'me', ready: false, cardCount: 8})).toEqual([
    {label: '未准备', tone: 'waiting'},
  ]);
});

it('summarizes the table pulse from seat pressure and turn timing', () => {
  expect(getTablePulse({
    phase: '出牌中',
    actionTone: 'waiting',
    turnTimer: 18,
    seatSummaries: [
      {seat: '你', name: 'me', cardCount: 6},
      {seat: '下家', name: 'next', cardCount: 1},
      {seat: '上家', name: 'prev', cardCount: 2},
    ],
  })).toEqual({
    leaderLabel: '下家 1张',
    leaderDetail: 'next 牌最少',
    leaderTone: 'danger',
    pressureLabel: '对手报单',
    pressureDetail: '1人只剩 1 张',
    pressureTone: 'danger',
    paceLabel: '出牌中',
    paceDetail: '剩余 18s',
    paceTone: 'normal',
  });

  expect(getTablePulse({
    phase: '出牌中',
    actionTone: 'action',
    turnTimer: 4,
    seatSummaries: [
      {seat: '你', name: 'me', cardCount: 2},
      {seat: '下家', name: 'next', left: true, cardCount: 1},
      {seat: '上家', name: '等待玩家加入', cardCount: 1},
    ],
  })).toEqual({
    leaderLabel: '你 2张',
    leaderDetail: '你当前牌最少',
    leaderTone: 'action',
    pressureLabel: '压力正常',
    pressureDetail: '等待对手入座',
    pressureTone: 'normal',
    paceLabel: '计时紧',
    paceDetail: '剩余 4s',
    paceTone: 'danger',
  });
});

it('builds contextual action advice from table state', () => {
  expect(getActionAdvisor({
    phase: '出牌中',
    actionTone: 'action',
    selectedPokerCount: 0,
    lastShotLabel: '上家 · 2 张',
    turnTimer: 18,
    multiple: 30,
    seatSummaries: [
      {seat: '你', name: 'me', cardCount: 8},
      {seat: '下家', name: 'next', cardCount: 1},
      {seat: '上家', name: 'prev', cardCount: 6},
    ],
  })).toEqual({
    label: '寻找可管牌',
    detail: '上家 · 2 张',
    tone: 'action',
    secondary: '1人只剩 1 张',
  });
  expect(getActionAdvisor({
    phase: '出牌中',
    actionTone: 'action',
    selectedPokerCount: 2,
    turnTimer: 5,
  })).toEqual({
    label: '尽快决策',
    detail: '剩余 5s',
    tone: 'danger',
    secondary: '已选 2 张，可检查后出牌',
  });
  expect(getActionAdvisor({
    phase: '出牌中',
    actionTone: 'blocked',
    actionHint: '牌型不合法',
    multiple: 60,
  })).toEqual({
    label: '先处理阻塞',
    detail: '牌型不合法',
    tone: 'blocked',
    secondary: '倍数很高，避免误点',
  });
  expect(getActionAdvisor({
    phase: '准备中',
    actionTone: 'action',
    playerCount: 3,
    readyCount: 2,
  })).toEqual({
    label: '准备开局',
    detail: '2/3 已准备',
    tone: 'action',
    secondary: '点击准备进入下一局',
  });
});

it('creates compact quick chat receipts for sent and blocked messages', () => {
  expect(createChatReceipt(' 大家好 ', true)).toEqual({
    label: '已发送',
    message: '大家好',
    tone: 'sent',
  });
  expect(createChatReceipt(' 加油 ', false)).toEqual({
    label: '未发送',
    message: '加油',
    tone: 'blocked',
  });
  expect(createChatReceipt('', false)).toEqual({
    label: '未发送',
    message: '请输入快捷语',
    tone: 'blocked',
  });
});

it('summarizes the local settlement result from score rows', () => {
  expect(getLocalSettlementSummary({
    scoreRows: [
      {uid: 7, name: 'me', point: 20, balance: 1020},
      {uid: 8, name: 'next', point: -10, balance: 990},
    ],
  }, '7')).toEqual({
    label: '本局盈利',
    point: 20,
    pointLabel: '+20',
    balanceLabel: '余额 1020',
    tone: 'win',
  });
  expect(getLocalSettlementSummary({
    scoreRows: [
      {uid: 7, name: 'me', point: -15, balance: null},
    ],
  }, 7)).toEqual({
    label: '本局亏损',
    point: -15,
    pointLabel: '-15',
    balanceLabel: '余额待同步',
    tone: 'lose',
  });
  expect(getLocalSettlementSummary({scoreRows: [{uid: 7, point: 'bad'}]}, 7)).toBeNull();
  expect(getLocalSettlementSummary({scoreRows: [{uid: 8, point: 20}]}, 7)).toBeNull();
});

it('formats settlement score point labels and tones', () => {
  expect(getScorePointLabel(20)).toBe('+20');
  expect(getScorePointLabel(-10)).toBe('-10');
  expect(getScorePointLabel(0)).toBe('0');
  expect(getScorePointLabel('bad')).toBe('0');
  expect(getScorePointTone(20)).toBe('win');
  expect(getScorePointTone(-10)).toBe('lose');
  expect(getScorePointTone(0)).toBe('even');
  expect(getScorePointTone('bad')).toBe('even');
});

it('marks the local settlement score row without matching missing ids', () => {
  expect(isLocalScoreRow({uid: 7}, '7')).toBe(true);
  expect(isLocalScoreRow({uid: null}, null)).toBe(false);
  expect(isLocalScoreRow({uid: 8}, '7')).toBe(false);
  expect(getScoreRowClassName({uid: 7, point: 20}, '7')).toBe('game-shell__score-row game-shell__score-row--win game-shell__score-row--local');
  expect(getScoreRowClassName({uid: 8, point: -10}, '7')).toBe('game-shell__score-row game-shell__score-row--lose');
});

it('summarizes ready progress for the table status rail', () => {
  expect(getReadyProgress({playerCount: 3, readyCount: 2})).toEqual({
    label: '2/3 已准备',
    percent: 67,
    tone: 'waiting',
  });
  expect(getReadyProgress({playerCount: 3, readyCount: 4})).toEqual({
    label: '3/3 已准备',
    percent: 100,
    tone: 'done',
  });
  expect(getReadyProgress({playerCount: 0, readyCount: 0})).toEqual({
    label: '等待玩家',
    percent: 0,
    tone: 'waiting',
  });
});

it('reads the local seat point from game status', () => {
  expect(getLocalSeatPoint({
    seatSummaries: [
      {seat: '你', point: '1280'},
      {seat: '下家', point: 900},
    ],
  }, '7')).toBe(1280);
  expect(getLocalSeatPoint({seatSummaries: [{seat: '下家', point: 900}]}, '7')).toBeNull();
});

it('builds a deduplicated settlement history from game status', () => {
  const status = {
    phase: '结算',
    roomLabel: '进阶场 · 房间 8',
    resultSummary: '地主赢 · me +20 / next -10',
    multipleSummary: '底分 30 · 倍数 x2',
    scoreRows: [
      {uid: 7, name: 'me', point: 20, balance: 1020},
      {uid: 8, name: 'next', point: -10, balance: 990},
    ],
  };

  const entry = createRoundHistoryEntry(status, 7);
  const firstHistory = buildRoundHistory([], status, 7);
  const duplicateHistory = buildRoundHistory(firstHistory, status, 7);
  const cappedHistory = buildRoundHistory([
    {signature: 'a'},
    {signature: 'b'},
  ], status, 7, 2);

  expect(entry.roomLabel).toBe('进阶场 · 房间 8');
  expect(entry.localPoint).toBe(20);
  expect(firstHistory).toHaveLength(1);
  expect(duplicateHistory).toHaveLength(1);
  expect(cappedHistory.map(item => item.signature)).toEqual([entry.signature, 'a']);
  expect(createRoundHistoryEntry({...status, phase: '准备中'}, 7)).toBeNull();
});

it('summarizes recent settlement history for point trend chips', () => {
  expect(buildRoundHistoryStats([
    {localPoint: 20},
    {localPoint: -15},
    {localPoint: 0},
    {localPoint: null},
    {localPoint: 'bad'},
  ])).toEqual({
    rounds: 3,
    totalPoint: 5,
    wins: 1,
    losses: 1,
    streakCount: 1,
    streakLabel: '1连胜',
    streakTone: 'win',
  });
  expect(buildRoundHistoryStats([
    {localPoint: -20},
    {localPoint: -15},
    {localPoint: 10},
  ])).toMatchObject({
    streakCount: 2,
    streakLabel: '2连败',
    streakTone: 'lose',
  });
  expect(buildRoundHistoryStats([{localPoint: 0}])).toMatchObject({
    streakCount: 1,
    streakLabel: '刚持平',
    streakTone: 'even',
  });
  expect(buildRoundHistoryStats(null)).toEqual({
    rounds: 0,
    totalPoint: 0,
    wins: 0,
    losses: 0,
    streakCount: 0,
    streakLabel: '暂无走势',
    streakTone: 'even',
  });
});

it('renders the login page without a token', () => {
  const xhr = installMockXMLHttpRequest();
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.textContent).toContain('斗地主');
  expect(div.textContent).toContain('检查中');
  expect(div.textContent).toContain('大厅待确认');
  expect(div.querySelector('.login-account-summary').getAttribute('aria-label')).toBe('账户积分');
  expect(div.querySelector('.login-account-summary').textContent).toBe('积分 1000可入场 2/3');
  expect(div.textContent).toContain('新手场底分 100 人 · 入场 0 · 空闲');
  expect(div.textContent).toContain('进阶场底分 300 人 · 入场 1000 · 空闲');
  expect(div.textContent).toContain('高手场底分 600 人 · 入场 2000 · 积分不足');
  expect(div.querySelector('.login-room-option--locked em').textContent).toBe('还差 1000 积分');
  expect(div.querySelector('input[name="roomLevel"][value="3"]').disabled).toBe(false);
  expect(div.querySelector('button[type="submit"]').textContent).toBe('检查服务...');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(true);
  expect(div.querySelector('#name').getAttribute('aria-invalid')).toBe('false');
  expect(div.querySelector('#name').getAttribute('maxLength')).toBe('50');
  expect(div.querySelector('#name').getAttribute('aria-describedby')).toBe('login-name-meta');
  expect(div.querySelector('#login-name-meta').textContent).toBe('最多 50 个字');
  expect(div.querySelector('[data-testid="game"]')).toBeNull();
  expect(xhr.requests[0].method).toBe('GET');
  expect(xhr.requests[0].url).toBe('/healthz');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('renders the login page when local storage is unavailable', () => {
  const xhr = installMockXMLHttpRequest();
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('[data-testid="game"]')).toBeNull();
  expect(div.textContent).toContain('斗地主');
  expect(div.querySelector('#name').value).toBe('player');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('keeps higher room levels selectable for players with enough stored point', () => {
  const xhr = installMockXMLHttpRequest();
  localStorage.setItem('point', '2500');
  localStorage.setItem('roomLevel', '3');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('input[name="roomLevel"][value="3"]').disabled).toBe(false);
  expect(div.querySelector('.login-account-summary').textContent).toBe('积分 2500可入场 3/3');
  expect(div.querySelector('.login-room-option--selected').textContent).toBe('高手场底分 600 人 · 入场 2000 · 空闲');
  expect(div.querySelector('.login-room-option--locked')).toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('lets players clear a resumable room before matching again', () => {
  const xhr = installMockXMLHttpRequest();
  localStorage.setItem('room', '18');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('.login-resume').getAttribute('role')).toBe('status');
  expect(div.querySelector('.login-resume').textContent).toBe('继续房间18重新匹配');

  act(() => {
    div.querySelector('.login-resume button').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(localStorage.getItem('room')).toBeNull();
  expect(div.querySelector('.login-resume')).toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('shows local backend health and robot status on the login page', () => {
  const xhr = installMockXMLHttpRequest();
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: false,
      lobby: {
        players: 2,
        waiting_rooms: 1,
        playing_rooms: 1,
      },
      rooms: [
        {level: 1, label: '新手场', origin: 10, min_point: 0, number: 2},
        {level: 2, label: '进阶场', origin: 30, min_point: 1000, number: 4},
        {level: 3, label: '高手场', origin: 60, min_point: 2000, number: 0},
      ],
    });
  });

  expect(div.textContent).toContain('服务在线');
  expect(div.textContent).toContain('机器人补位关闭');
  expect(div.textContent).toContain('在线 2 · 房间 2');
  expect(div.querySelector('button[type="submit"]').textContent).toBe('进入牌桌');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(false);
  act(() => {
    Simulate.change(div.querySelector('#name'), {target: {name: 'name', value: '   '}});
  });
  expect(div.querySelector('button[type="submit"]').textContent).toBe('输入昵称');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(true);
  act(() => {
    Simulate.change(div.querySelector('#name'), {target: {name: 'name', value: 'tester'}});
  });
  expect(div.querySelector('button[type="submit"]').textContent).toBe('进入牌桌');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(false);
  expect(div.querySelector('.login-status__item--online').textContent).toBe('服务在线');
  expect(div.querySelector('.login-status__item--offline').textContent).toBe('机器人补位关闭');
  expect(div.querySelector('.login-status__item--lobby').textContent).toBe('在线 2 · 房间 2');
  expect(Array.from(div.querySelectorAll('.login-room-option')).map(option => option.textContent)).toEqual([
    '新手场底分 102 人 · 入场 0 · 待补位',
    '进阶场底分 304 人 · 入场 1000 · 有对局',
    '高手场底分 600 人 · 入场 2000 · 积分不足还差 1000 积分',
  ]);
  expect(div.querySelector('.login-room-option--locked em').textContent).toBe('还差 1000 积分');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('saves the selected room level before entering the game', () => {
  const xhr = installMockXMLHttpRequest();
  localStorage.setItem('room', '18');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {
        players: 3,
        waiting_rooms: 1,
        playing_rooms: 0,
      },
      rooms: [
        {level: 1, label: '新手场', origin: 10, number: 1},
        {level: 2, label: '进阶场', origin: 30, number: 3},
        {level: 3, label: '高手场', origin: 60, number: 0},
      ],
    });
  });

  act(() => {
    const levelTwo = div.querySelector('input[name="roomLevel"][value="2"]');
    levelTwo.dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(localStorage.getItem('roomLevel')).toBe('2');
  expect(localStorage.getItem('room')).toBeNull();
  expect(div.querySelector('.login-room-option--selected').textContent).toBe('进阶场底分 303 人 · 入场 1000 · 有对局');

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {token: 'fresh-token', name: 'tester', uid: 42, point: 1280, room: 18});
  });

  expect(localStorage.getItem('roomLevel')).toBe('2');
  expect(localStorage.getItem('room')).toBe('18');
  expect(localStorage.getItem('point')).toBe('1280');
  expect(div.querySelector('[data-testid="game"]')).not.toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('falls back to an enterable room after login when the selected room needs more points', () => {
  const xhr = installMockXMLHttpRequest();
  localStorage.setItem('point', '400');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {
        players: 0,
        waiting_rooms: 0,
        playing_rooms: 0,
      },
      rooms: [
        {level: 1, label: '新手场', origin: 10, min_point: 0, number: 0},
        {level: 2, label: '进阶场', origin: 30, min_point: 1000, number: 0},
        {level: 3, label: '高手场', origin: 60, min_point: 2000, number: 0},
      ],
    });
  });

  act(() => {
    div.querySelector('input[name="roomLevel"][value="3"]').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
  expect(div.querySelector('.login-room-option--selected').textContent).toContain('高手场');

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {
      token: 'fresh-token',
      name: 'tester',
      uid: 42,
      point: 400,
      room: 18,
      rooms: [
        {level: 1, label: '新手场', origin: 10, min_point: 0, number: 0},
        {level: 2, label: '进阶场', origin: 30, min_point: 1000, number: 0},
        {level: 3, label: '高手场', origin: 60, min_point: 2000, number: 0},
      ],
    });
  });

  expect(localStorage.getItem('roomLevel')).toBe('1');
  expect(localStorage.getItem('room')).toBeNull();
  expect(localStorage.getItem('point')).toBe('400');
  expect(div.querySelector('[data-testid="game"]')).not.toBeNull();
  expect(div.textContent).not.toContain('当前积分不足');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('shows a retry action when the local backend health check fails', () => {
  const xhr = installMockXMLHttpRequest();
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    xhr.requests[0].onerror();
  });

  expect(div.textContent).toContain('本地服务未连接');
  expect(div.textContent).toContain('大厅离线');
  expect(div.querySelector('.login-health').getAttribute('role')).toBe('status');
  expect(div.querySelector('.login-health button').textContent).toBe('重试');
  expect(div.querySelector('button[type="submit"]').textContent).toBe('服务离线');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(true);

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  expect(div.querySelector('#login-name-error').textContent).toBe('本地服务未连接，请先重试');
  expect(xhr.requests).toHaveLength(1);

  act(() => {
    div.querySelector('.login-health button').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(xhr.requests).toHaveLength(2);
  expect(xhr.requests[1].method).toBe('GET');
  expect(xhr.requests[1].url).toBe('/healthz');
  expect(div.querySelector('#login-name-error')).toBeNull();
  expect(div.querySelector('button[type="submit"]').textContent).toBe('检查服务...');

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {players: 0, waiting_rooms: 0, playing_rooms: 0},
      rooms: [],
    });
  });

  expect(div.querySelector('button[type="submit"]').textContent).toBe('进入牌桌');
  expect(div.querySelector('button[type="submit"]').disabled).toBe(false);

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('renders the game when a token is present', () => {
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('uid', '42');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('[data-testid="game"]')).not.toBeNull();
  expect(div.textContent).toContain('当前玩家');
  expect(div.textContent).toContain('UID 42');
  expect(div.textContent).toContain('积分 1000');
  expect(div.querySelector('.game-shell__advisor').getAttribute('aria-label')).toBe('行动建议');
  expect(div.querySelector('.game-shell__advisor').textContent).toContain('等待同桌');
  expect(div.querySelector('.game-shell__advisor').textContent).toContain('等待玩家');
  expect(div.textContent).toContain('准备中');
  expect(div.textContent).toContain('等待房间');
  expect(div.querySelector('.game-shell__ready-progress').getAttribute('aria-label')).toBe('准备进度');
  expect(div.querySelector('.game-shell__ready-track').getAttribute('role')).toBe('progressbar');
  expect(div.querySelector('.game-shell__ready-track').getAttribute('aria-valuenow')).toBe('0');
  expect(div.querySelector('.game-shell__ready-fill').style.width).toBe('0%');
  expect(div.querySelector('.game-shell__turn-focus').getAttribute('aria-label')).toBe('当前操作状态');
  expect(div.querySelector('.game-shell__turn-focus').textContent).toContain('当前操作等待对手');
  expect(div.querySelector('.game-shell__turn-focus').textContent).toContain('回合等待玩家');
  expect(div.querySelector('.game-shell__phase-track').getAttribute('aria-label')).toBe('对局阶段');
  expect(div.querySelector('.game-shell__phase-progress').getAttribute('aria-label')).toBe('对局进度');
  expect(div.querySelector('.game-shell__phase-progress').getAttribute('role')).toBe('progressbar');
  expect(div.querySelector('.game-shell__phase-progress').getAttribute('aria-valuenow')).toBe('25');
  expect(div.querySelector('.game-shell__phase-progress span').style.width).toBe('25%');
  expect(Array.from(div.querySelectorAll('.game-shell__phase-step')).map(item => item.textContent)).toEqual([
    '准备中',
    '叫地主',
    '出牌中',
    '结算',
  ]);
  expect(div.querySelector('.game-shell__phase-step--active').textContent).toBe('准备中');

  ReactDOM.unmountComponentAtNode(div);
});

it('updates the game shell from live game status events', () => {
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('uid', '7');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        connection: '已连接',
        phase: '出牌中',
        roomLabel: '进阶场 · 房间 8',
        roomLevelLabel: '进阶场',
        roomOrigin: 30,
        playerCount: 3,
        readyCount: 3,
        multiple: 30,
        landlordLabel: 'p1',
        localRoleLabel: '农民',
        turnTimer: 18,
        localHandCount: 16,
        selectedPokerCount: 2,
        selectedPokerLabel: 'A A',
        selectedPokerTypeLabel: '对子',
        turnLabel: '轮到你',
        bottomCount: 3,
        bottomPokerLabel: '大王 小王 A',
        bottomPokerTypeLabel: '未成牌型',
        lastShotLabel: '上家 · 2 张',
        lastShotPokerLabel: 'K K',
        lastShotPokerTypeLabel: '对子',
        lastAction: '地主开始出牌',
        actionHint: '轮到你出牌',
        actionTone: 'action',
        resultSummary: '地主赢 · me +20 / next -10',
        scoreRows: [
          {uid: 7, name: 'me', point: 20, balance: 1020},
          {uid: 8, name: 'next', point: -10, balance: 990},
          {uid: 9, name: 'prev', point: -10, balance: 990},
        ],
        seatSummaries: [
          {seat: '你', name: 'me', ready: true, landlord: false, turn: true, point: 1020, cardCount: 16},
          {seat: '下家', name: 'next', ready: true, landlord: true, turn: false, point: 990, cardCount: 3},
          {seat: '上家', name: 'prev', ready: true, landlord: false, turn: false, point: 990, cardCount: 7},
        ],
      },
    }));
  });

  expect(div.textContent).toContain('已连接');
  expect(div.querySelector('.game-shell__connection').getAttribute('aria-label')).toBe('连接状态');
  expect(div.querySelector('.game-shell__connection--online').textContent).toBe('已连接');
  expect(div.textContent).toContain('出牌中');
  expect(div.querySelector('.game-shell__phase-step--active').textContent).toBe('出牌中');
  expect(div.querySelector('.game-shell__phase-progress').getAttribute('aria-valuenow')).toBe('75');
  expect(div.querySelector('.game-shell__phase-progress span').style.width).toBe('75%');
  expect(Array.from(div.querySelectorAll('.game-shell__phase-step--complete')).map(item => item.textContent)).toEqual([
    '准备中',
    '叫地主',
  ]);
  expect(div.textContent).toContain('进阶场 · 房间 8');
  expect(div.textContent).toContain('3/3');
  expect(div.querySelector('.game-shell__ready-progress--done').textContent).toContain('3/3 已准备');
  expect(div.querySelector('.game-shell__ready-track').getAttribute('aria-valuenow')).toBe('100');
  expect(div.querySelector('.game-shell__ready-fill').style.width).toBe('100%');
  expect(div.textContent).toContain('场次进阶场');
  expect(div.textContent).toContain('底分30');
  expect(div.textContent).toContain('x30');
  expect(div.querySelector('.game-shell__metric--multiple').getAttribute('aria-label')).toBe('当前倍数风险：倍数升温，注意本局积分');
  expect(div.querySelector('.game-shell__metric--warm').textContent).toBe('倍数x30倍数升温');
  expect(div.textContent).toContain('地主p1');
  expect(div.textContent).toContain('身份农民');
  expect(div.textContent).toContain('18s');
  expect(div.textContent).toContain('计时中');
  expect(div.textContent).toContain('手牌16');
  expect(div.textContent).toContain('已选2');
  expect(div.querySelector('.game-shell__selected-ranks').getAttribute('aria-label')).toBe('已选牌面');
  expect(div.querySelector('.game-shell__selected-ranks').textContent).toContain('对子');
  expect(div.querySelector('.game-shell__selected-ranks').textContent).toContain('A A');
  expect(div.textContent).toContain('轮到你');
  expect(div.textContent).toContain('操作提示');
  expect(div.textContent).toContain('轮到你出牌');
  expect(div.querySelector('.game-shell__turn-focus').className).toContain('game-shell__turn-focus--action');
  expect(div.querySelector('.game-shell__turn-focus').textContent).toContain('当前操作轮到你操作');
  expect(div.querySelector('.game-shell__turn-focus').textContent).toContain('回合轮到你');
  expect(div.textContent).toContain('结算摘要');
  expect(div.textContent).toContain('地主赢 · me +20 / next -10');
  expect(div.querySelector('.game-shell__local-settlement').getAttribute('aria-label')).toBe('我的本局结算');
  expect(div.querySelector('.game-shell__local-settlement--win').textContent).toBe('本局盈利+20余额 1020');
  expect(div.querySelector('.game-shell__score-list').getAttribute('aria-label')).toBe('结算分数');
  expect(Array.from(div.querySelectorAll('.game-shell__score-row')).map(row => row.textContent)).toEqual([
    'me你+20余额 1020',
    'next-10余额 990',
    'prev-10余额 990',
  ]);
  expect(div.querySelector('.game-shell__score-row--local').getAttribute('aria-current')).toBe('true');
  expect(div.querySelector('.game-shell__score-row--local b').textContent).toBe('你');
  expect(div.querySelector('.game-shell__score-row--win').textContent).toBe('me你+20余额 1020');
  expect(div.querySelector('.game-shell__score-points small').textContent).toBe('余额 1020');
  expect(div.querySelectorAll('.game-shell__score-row--lose')).toHaveLength(2);
  expect(div.querySelector('.game-shell__action-hint').className).toContain('game-shell__action-hint--action');
  expect(div.querySelector('.game-shell__action-hint').getAttribute('role')).toBe('status');
  expect(div.querySelector('.game-shell__action-hint').getAttribute('aria-live')).toBe('polite');
  expect(div.textContent).toContain('底牌 3 张');
  expect(div.querySelector('.game-shell__bottom-ranks').getAttribute('aria-label')).toBe('底牌牌面');
  expect(div.querySelector('.game-shell__bottom-ranks').textContent).toContain('未成牌型');
  expect(div.querySelector('.game-shell__bottom-ranks').textContent).toContain('大王 小王 A');
  expect(div.textContent).toContain('上家 · 2 张');
  expect(div.querySelector('.game-shell__shot-ranks').getAttribute('aria-label')).toBe('上一手牌面');
  expect(div.querySelector('.game-shell__shot-ranks').textContent).toContain('对子');
  expect(div.querySelector('.game-shell__shot-ranks').textContent).toContain('K K');
  expect(div.textContent).toContain('地主开始出牌');
  expect(div.textContent).toContain('牌桌动态');
  expect(div.querySelector('.game-shell__activity-item').className).toContain('game-shell__activity-item--action');
  expect(div.querySelector('.game-shell__activity-item').getAttribute('aria-label')).toBe('出牌中: 地主开始出牌');
  expect(div.textContent).toContain('玩家座位');
  expect(div.textContent).toContain('你me已准备');
  expect(div.querySelector('.game-shell__seat-meta').textContent).toContain('手牌16 张');
  expect(div.querySelector('.game-shell__seat-meta').textContent).toContain('积分1020');
  expect(localStorage.getItem('point')).toBe('1020');
  expect(div.textContent).toContain('下家next地主');
  expect(div.textContent).toContain('上家prev已准备');
  expect(div.querySelector('.game-shell__seat--turn').textContent).toContain('当前回合');
  expect(div.querySelector('.game-shell__seat-badges').getAttribute('aria-label')).toBe('你状态');
  expect(Array.from(div.querySelectorAll('.game-shell__seat-badge--landlord')).map(item => item.textContent)).toEqual(['地主']);
  expect(Array.from(div.querySelectorAll('.game-shell__seat-badge--turn')).map(item => item.textContent)).toEqual(['当前回合']);
  expect(Array.from(div.querySelectorAll('.game-shell__seat-badge--low')).map(item => item.textContent)).toEqual(['低牌量']);
  expect(div.querySelector('.game-shell__pulse').getAttribute('aria-label')).toBe('牌局脉搏');
  expect(Array.from(div.querySelectorAll('.game-shell__pulse-item')).map(item => item.textContent)).toEqual([
    '领跑下家 3张next 牌最少',
    '压力对手低牌1人进入 5 张内',
    '节奏轮到你剩余 18s',
  ]);
  expect(div.querySelector('.game-shell__pulse-item--low').textContent).toContain('对手低牌');
  expect(div.querySelector('.game-shell__pulse-item--action').textContent).toContain('轮到你');
  expect(div.querySelector('.game-shell__advisor--action').textContent).toContain('检查后出牌');
  expect(div.querySelector('.game-shell__advisor--action').textContent).toContain('已选 2 张牌');

  ReactDOM.unmountComponentAtNode(div);
});

it('highlights opponent single-card and pair-card pressure in the seat rail', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        seatSummaries: [
          {seat: '你', name: 'me', ready: true, landlord: false, turn: false, point: 1000, cardCount: 4},
          {seat: '下家', name: 'next', ready: true, landlord: true, turn: true, point: 980, cardCount: 2},
          {seat: '上家', name: 'prev', ready: true, landlord: false, turn: false, point: 1040, cardCount: 1},
        ],
      },
    }));
  });

  const dangerSeats = Array.from(div.querySelectorAll('.game-shell__seat--danger'));
  expect(dangerSeats).toHaveLength(2);
  expect(dangerSeats.map(seat => seat.textContent).join('|')).toContain('报双');
  expect(dangerSeats.map(seat => seat.textContent).join('|')).toContain('报单');
  expect(Array.from(div.querySelectorAll('.game-shell__seat-badge--danger')).map(item => item.textContent)).toEqual([
    '报双',
    '报单',
  ]);
  expect(div.querySelector('.game-shell__seat--low').textContent).toContain('低牌量');

  ReactDOM.unmountComponentAtNode(div);
});

it('shows disconnected seats without card-pressure warnings', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        seatSummaries: [
          {seat: '你', name: 'me', ready: true, landlord: false, left: false, turn: false, point: 1000, cardCount: 6},
          {seat: '下家', name: 'next', ready: true, landlord: false, left: true, turn: true, point: 980, cardCount: 1},
          {seat: '上家', name: 'prev', ready: true, landlord: false, left: false, turn: false, point: 1040, cardCount: 4},
        ],
      },
    }));
  });

  const leftSeat = div.querySelector('.game-shell__seat--left');
  expect(leftSeat.textContent).toContain('下家next暂离');
  expect(leftSeat.textContent).not.toContain('报单');
  expect(leftSeat.querySelector('.game-shell__seat-badge--danger')).toBeNull();
  expect(leftSeat.querySelector('.game-shell__seat-badge--blocked').textContent).toBe('暂离');

  ReactDOM.unmountComponentAtNode(div);
});

it('hides the game-over summary while there is no settlement result', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('.game-shell__result')).toBeNull();
  expect(div.querySelector('.game-shell__score-list')).toBeNull();
  expect(div.querySelector('.game-shell__round-history')).toBeNull();
  expect(div.textContent).not.toContain('结算摘要');
  expect(div.textContent).not.toContain('近局战绩');

  ReactDOM.unmountComponentAtNode(div);
});

it('keeps recent settlement history visible after the next round starts', () => {
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('uid', '7');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  const sendSettlement = (summary, point, roomLabel = '进阶场 · 房间 8') => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        phase: '结算',
        roomLabel,
        resultSummary: summary,
        multipleSummary: '底分 30 · 倍数 x2',
        scoreRows: [
          {uid: 7, name: 'me', point, balance: 1000 + point},
          {uid: 8, name: 'next', point: -point / 2, balance: 1000 - point / 2},
        ],
      },
    }));
  };

  act(() => {
    sendSettlement('地主赢 · me +20', 20);
    sendSettlement('地主赢 · me +20', 20);
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        phase: '准备中',
        resultSummary: '',
        multipleSummary: '',
        scoreRows: [],
        lastAction: '等待下一局准备',
      },
    }));
  });

  expect(div.querySelector('.game-shell__result')).toBeNull();
  expect(div.querySelector('.game-shell__round-history').getAttribute('aria-label')).toBe('近局战绩');
  expect(div.querySelector('.game-shell__round-history').textContent).toContain('进阶场 · 房间 8');
  expect(div.querySelector('.game-shell__round-history').textContent).toContain('地主赢 · me +20');
  expect(div.querySelector('.game-shell__round-history-delta--win').textContent).toBe('+20');
  expect(div.querySelectorAll('.game-shell__round-history-item')).toHaveLength(1);

  act(() => {
    sendSettlement('农民赢 · me -15', -15, '高手场 · 房间 9');
  });

  const historyItems = Array.from(div.querySelectorAll('.game-shell__round-history-item'));
  expect(historyItems).toHaveLength(2);
  expect(historyItems[0].textContent).toContain('高手场 · 房间 9');
  expect(historyItems[0].textContent).toContain('-15');
  expect(historyItems[0].querySelector('.game-shell__round-history-delta--lose')).not.toBeNull();
  expect(div.querySelector('.game-shell__round-summary').getAttribute('aria-label')).toBe('近局积分趋势');
  expect(div.querySelector('.game-shell__round-summary').textContent).toContain('净胜分+5');
  expect(div.querySelector('.game-shell__round-summary').textContent).toContain('胜负1胜 1负');
  expect(div.querySelector('.game-shell__round-summary').textContent).toContain('走势1连败');
  expect(div.querySelector('.game-shell__round-summary-point--win').textContent).toBe('+5');
  expect(div.querySelector('.game-shell__round-summary-point--lose').textContent).toBe('1连败');

  ReactDOM.unmountComponentAtNode(div);
});

it('shows the newest table activity messages without duplicating the latest entry', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  const sendStatus = (phase, lastAction, actionTone = 'waiting') => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        phase,
        lastAction,
        actionTone,
      },
    }));
  };

  act(() => {
    sendStatus('准备中', '等待玩家准备');
    sendStatus('叫地主', '已发牌，等待叫地主');
    sendStatus('出牌中', '地主开始出牌');
    sendStatus('出牌中', '地主开始出牌');
    sendStatus('出牌中', '上家 出牌');
    sendStatus('出牌中', '轮到你出牌', 'action');
  });

  const activityLog = div.querySelector('.game-shell__activity-list');
  expect(activityLog.getAttribute('role')).toBe('log');
  expect(activityLog.getAttribute('aria-label')).toBe('牌桌动态');
  expect(activityLog.getAttribute('aria-live')).toBe('polite');
  expect(activityLog.getAttribute('aria-relevant')).toBe('additions text');

  const activityItems = Array.from(div.querySelectorAll('.game-shell__activity-list li'));
  expect(activityItems.map(item => item.textContent)).toEqual([
    '出牌中轮到你出牌最新',
    '出牌中上家 出牌',
    '出牌中地主开始出牌',
    '叫地主已发牌，等待叫地主',
  ]);
  expect(activityItems[0].getAttribute('aria-current')).toBe('true');
  expect(activityItems[0].querySelector('b').textContent).toBe('最新');
  expect(activityItems[1].querySelector('b')).toBeNull();
  expect(activityItems[0].className).toContain('game-shell__activity-item--action');
  expect(activityItems[1].className).toContain('game-shell__activity-item--waiting');
  expect(activityItems.map(item => item.textContent).join('')).not.toContain('等待进入牌桌');

  ReactDOM.unmountComponentAtNode(div);
});

it('counts down the visible turn timer while the game is open', () => {
  jest.useFakeTimers();
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: 2,
      },
    }));
  });

  expect(div.textContent).toContain('2s');

  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(div.textContent).toContain('1s');

  act(() => {
    jest.advanceTimersByTime(2000);
  });

  expect(div.textContent).toContain('待开始');
  expect(div.textContent).toContain('暂无计时');

  ReactDOM.unmountComponentAtNode(div);
});

it('highlights the turn timer only while it is low and active', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  const getTimerMetric = () => Array.from(div.querySelectorAll('.game-shell__metric'))
    .find(element => element.textContent.includes('计时'));

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: 6,
      },
    }));
  });

  expect(getTimerMetric().className).toContain('game-shell__metric--timer-active');
  expect(getTimerMetric().textContent).toContain('计时中');
  expect(getTimerMetric().className).not.toContain('game-shell__metric--timer-low');

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: 5,
      },
    }));
  });

  expect(getTimerMetric().className).toContain('game-shell__metric--timer-low');
  expect(getTimerMetric().textContent).toContain('即将超时');
  expect(div.querySelector('.game-shell__turn-focus').className).toContain('game-shell__turn-focus--timer-low');
  expect(div.querySelector('.game-shell__turn-focus').textContent).toContain('当前操作即将超时');

  act(() => {
    window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: 0,
      },
  }));
  });

  expect(getTimerMetric().className).toContain('game-shell__metric--timer-idle');
  expect(getTimerMetric().className).not.toContain('game-shell__metric--timer-low');

  ReactDOM.unmountComponentAtNode(div);
});

it('renders a clamped progress bar for the turn timer', () => {
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
	ReactDOM.render(<App />, div);

	const getTimerProgress = () => div.querySelector('.game-shell__timer-track');
	const getTimerFill = () => div.querySelector('.game-shell__timer-fill');

	act(() => {
		window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
			detail: {
        turnTimer: 20,
      },
    }));
	});

	expect(getTimerProgress().getAttribute('role')).toBe('progressbar');
	expect(getTimerProgress().getAttribute('aria-label')).toBe('剩余出牌时间');
	expect(getTimerProgress().getAttribute('aria-valuemax')).toBe('40');
	expect(getTimerProgress().getAttribute('aria-valuenow')).toBe('20');
	expect(getTimerFill().style.width).toBe('50%');

	act(() => {
		window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: 60,
      },
    }));
	});

	expect(getTimerProgress().getAttribute('aria-valuenow')).toBe('40');
	expect(getTimerFill().style.width).toBe('100%');

	act(() => {
		window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
      detail: {
        turnTimer: -1,
      },
    }));
	});

	expect(getTimerProgress().getAttribute('aria-valuenow')).toBe('0');
	expect(getTimerFill().style.width).toBe('0%');

  ReactDOM.unmountComponentAtNode(div);
});

it('clears the saved token when logging out', () => {
  const xhr = installMockXMLHttpRequest();
  const send = jest.spyOn(Socket, 'send').mockReturnValue(true);
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('name', 'tester');
  localStorage.setItem('uid', '12');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    div.querySelector('.game-shell__logout').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(localStorage.getItem('token')).toBeNull();
  expect(localStorage.getItem('uid')).toBeNull();
  expect(localStorage.getItem('point')).toBeNull();
  expect(localStorage.getItem('room')).toBeNull();
  expect(send).toHaveBeenCalledWith([Protocol.REQ_LEAVE_ROOM, {}]);
  expect(div.querySelector('[data-testid="game"]')).toBeNull();
  expect(div.textContent).toContain('斗地主');
  expect(xhr.requests[0].url).toBe('/healthz');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('lets players leave the current table without logging out', () => {
  const xhr = installMockXMLHttpRequest();
  const send = jest.spyOn(Socket, 'send').mockReturnValue(true);
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('name', 'tester');
  localStorage.setItem('uid', '12');
  localStorage.setItem('point', '1320');
  localStorage.setItem('room', '18');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('[data-testid="game"]')).not.toBeNull();
  expect(div.querySelector('.game-shell__actions').getAttribute('aria-label')).toBe('牌桌操作');

  act(() => {
    div.querySelector('.game-shell__rematch').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(send).toHaveBeenCalledWith([Protocol.REQ_LEAVE_ROOM, {}]);
  expect(localStorage.getItem('token')).toBe('saved-token');
  expect(localStorage.getItem('uid')).toBe('12');
  expect(localStorage.getItem('point')).toBe('1320');
  expect(localStorage.getItem('room')).toBeNull();
  expect(div.querySelector('[data-testid="game"]')).toBeNull();
  expect(div.textContent).toContain('斗地主');
  expect(div.querySelector('#name').value).toBe('tester');
  expect(xhr.requests[0].url).toBe('/healthz');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('sends quick chat messages from the game shell', () => {
  const send = jest.spyOn(Socket, 'send').mockReturnValue(true);
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(div.querySelector('.game-shell__quick-chat').getAttribute('aria-label')).toBe('快捷语');

  act(() => {
    div.querySelector('.game-shell__quick-chat button').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(send).toHaveBeenCalledWith([Protocol.REQ_CHAT, {message: '大家好'}]);
  expect(div.querySelector('.game-shell__chat-receipt').getAttribute('role')).toBe('status');
  expect(div.querySelector('.game-shell__chat-receipt').getAttribute('aria-live')).toBe('polite');
  expect(div.querySelector('.game-shell__chat-receipt--sent').textContent).toBe('已发送大家好');

  ReactDOM.unmountComponentAtNode(div);
});

it('sends custom quick chat text and clears the draft after success', () => {
  const send = jest.spyOn(Socket, 'send').mockReturnValue(true);
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  const input = div.querySelector('.game-shell__chat-input');
  const submitButton = div.querySelector('.game-shell__quick-chat form button[type="submit"]');

  expect(input.getAttribute('maxLength')).toBe('24');
  expect(input.getAttribute('aria-label')).toBe('自定义快捷语');
  expect(input.getAttribute('aria-describedby')).toBe('game-chat-counter');
  expect(div.querySelector('#game-chat-counter').textContent).toBe('0/24');
  expect(submitButton.disabled).toBe(true);

  act(() => {
    Simulate.change(input, {target: {value: '  加油  '}});
  });
  expect(input.value).toBe('  加油  ');
  expect(div.querySelector('#game-chat-counter').textContent).toBe('6/24');
  expect(submitButton.disabled).toBe(false);

  act(() => {
    div.querySelector('.game-shell__quick-chat form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  expect(send).toHaveBeenCalledWith([Protocol.REQ_CHAT, {message: '加油'}]);
  expect(input.value).toBe('');
  expect(div.querySelector('#game-chat-counter').textContent).toBe('0/24');
  expect(submitButton.disabled).toBe(true);
  expect(div.querySelector('.game-shell__chat-receipt--sent').textContent).toBe('已发送加油');

  ReactDOM.unmountComponentAtNode(div);
});

it('blocks empty custom quick chat submissions', () => {
  const send = jest.spyOn(Socket, 'send').mockReturnValue(true);
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);
  const input = div.querySelector('.game-shell__chat-input');
  const submitButton = div.querySelector('.game-shell__quick-chat form button[type="submit"]');

  expect(submitButton.disabled).toBe(true);

  act(() => {
    Simulate.change(input, {target: {value: '   '}});
  });
  expect(div.querySelector('#game-chat-counter').textContent).toBe('3/24');
  expect(submitButton.disabled).toBe(true);

  act(() => {
    div.querySelector('.game-shell__quick-chat form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  expect(send).not.toHaveBeenCalled();
  expect(div.querySelector('.game-shell__action-hint').textContent).toContain('请输入快捷语');
  expect(div.querySelector('.game-shell__chat-receipt--blocked').textContent).toBe('未发送请输入快捷语');

  ReactDOM.unmountComponentAtNode(div);
});

it('shows blocked feedback when quick chat cannot be sent', () => {
  jest.spyOn(Socket, 'send').mockReturnValue(false);
  localStorage.setItem('token', 'saved-token');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    div.querySelector('.game-shell__quick-chat button').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(div.querySelector('.game-shell__action-hint').textContent).toContain('连接未建立，快捷语未发送');
  expect(div.querySelector('.game-shell__chat-receipt--blocked').textContent).toBe('未发送大家好');

  ReactDOM.unmountComponentAtNode(div);
});

it('lets the local admin toggle robot fill from the game shell', () => {
  const xhr = installMockXMLHttpRequest();
  localStorage.setItem('token', 'saved-token');
  localStorage.setItem('name', 'admin');
  localStorage.setItem('uid', '1');
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  expect(xhr.requests[0].method).toBe('GET');
  expect(xhr.requests[0].url).toBe('/healthz');

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: false,
      lobby: {},
      rooms: [],
    });
  });

  expect(div.querySelector('.game-shell__admin-tools').getAttribute('aria-label')).toBe('管理员工具');
  expect(div.querySelector('.game-shell__admin-tools button').textContent).toBe('开启机器人');
  expect(div.querySelector('.game-shell__admin-tools span').textContent).toBe('机器人补位关闭');

  act(() => {
    div.querySelector('.game-shell__admin-tools button').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });

  expect(xhr.requests[1].method).toBe('POST');
  expect(xhr.requests[1].url).toBe('/admin');
  expect(xhr.requests[1].headers.Authorization).toBe('Bearer saved-token');
  expect(xhr.requests[1].body).toBe(JSON.stringify({allow_robot: true}));
  expect(div.querySelector('.game-shell__admin-tools button').textContent).toBe('切换中');

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {allow_robot: true});
  });

  expect(div.querySelector('.game-shell__admin-tools button').textContent).toBe('关闭机器人');
  expect(div.querySelector('.game-shell__admin-tools span').textContent).toBe('机器人补位已开启');

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('saves the logged in player identity for the game socket', () => {
  const xhr = installMockXMLHttpRequest();

  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {players: 0, waiting_rooms: 0, playing_rooms: 0},
      rooms: [],
    });
  });

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {token: 'fresh-token', name: 'tester', uid: 42, point: 1180, room: -1});
  });

  expect(xhr.requests[0].url).toBe('/healthz');
  expect(xhr.requests[1].url).toBe('/login');
  expect(xhr.requests[1].body).toBe(JSON.stringify({name: 'player'}));
  expect(localStorage.getItem('token')).toBe('fresh-token');
  expect(localStorage.getItem('name')).toBe('tester');
  expect(localStorage.getItem('uid')).toBe('42');
  expect(localStorage.getItem('point')).toBe('1180');
  expect(localStorage.getItem('room')).toBeNull();
  expect(div.querySelector('[data-testid="game"]')).not.toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('shows a login error without leaving the page', () => {
  const xhr = installMockXMLHttpRequest();

  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {players: 0, waiting_rooms: 0, playing_rooms: 0},
      rooms: [],
    });
  });

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  expect(div.querySelector('button[type="submit"]').textContent).toBe('连接中...');

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 500, {detail: '数据库未连接'});
  });

  expect(div.textContent).toContain('数据库未连接');
  expect(div.querySelector('#name').getAttribute('aria-invalid')).toBe('true');
  expect(div.querySelector('#name').getAttribute('aria-describedby')).toBe('login-name-error');
  expect(div.querySelector('#login-name-error').getAttribute('role')).toBe('alert');
  expect(div.querySelector('#login-name-error').textContent).toBe('数据库未连接');
  expect(div.querySelector('[data-testid="game"]')).toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('blocks overlong login names before posting to the backend', () => {
  const xhr = installMockXMLHttpRequest();
  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {players: 0, waiting_rooms: 0, playing_rooms: 0},
      rooms: [],
    });
  });

  act(() => {
    Simulate.change(div.querySelector('#name'), {target: {name: 'name', value: 'x'.repeat(51)}});
  });
  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  expect(xhr.requests).toHaveLength(1);
  expect(div.querySelector('#login-name-error').textContent).toBe('昵称最多 50 个字');

  act(() => {
    Simulate.change(div.querySelector('#name'), {target: {name: 'name', value: 'tester'}});
  });
  expect(div.querySelector('#login-name-error')).toBeNull();
  expect(div.querySelector('#name').getAttribute('aria-describedby')).toBe('login-name-meta');

  act(() => {
    Simulate.change(div.querySelector('#name'), {target: {name: 'name', value: 'x'.repeat(51)}});
  });
  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });
  expect(div.querySelector('#login-name-error').textContent).toBe('昵称最多 50 个字');

  act(() => {
    div.querySelector('input[name="roomLevel"][value="2"]').dispatchEvent(new MouseEvent('click', {bubbles: true}));
  });
  expect(div.querySelector('#login-name-error')).toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});

it('rejects a malformed successful login response', () => {
  const xhr = installMockXMLHttpRequest();

  const div = document.createElement('div');
  ReactDOM.render(<App />, div);

  act(() => {
    finishRequest(xhr.requests[0], xhr.MockXMLHttpRequest, 200, {
      status: 'ok',
      service: 'doudizhu',
      robots: true,
      lobby: {players: 0, waiting_rooms: 0, playing_rooms: 0},
      rooms: [],
    });
  });

  act(() => {
    div.querySelector('form').dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
  });

  act(() => {
    finishRequest(xhr.requests[1], xhr.MockXMLHttpRequest, 200, {name: 'player'});
  });

  expect(div.textContent).toContain('登录响应缺少 token');
  expect(div.querySelector('[data-testid="game"]')).toBeNull();

  ReactDOM.unmountComponentAtNode(div);
  xhr.restore();
});
