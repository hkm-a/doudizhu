import {
  buildStatusLog,
  DEFAULT_GAME_STATUS,
  GAME_STATUS_EVENT,
  emitGameStatus,
  normalizeGameStatus,
  normalizeActionTone,
  normalizeScoreRows,
  normalizeSeatSummaries,
} from './status';

it('normalizes partial game status payloads', () => {
  expect(normalizeGameStatus({
    landlordLabel: 'p1',
    localRoleLabel: '农民',
    phase: '出牌中',
    roomLevelLabel: '进阶场',
    roomOrigin: '30',
    localHandCount: '16',
    playerCount: '3',
    actionHint: '轮到你出牌',
    actionTone: 'action',
    multiple: '30',
    selectedPokerCount: '2',
    selectedPokerLabel: 'A A',
    selectedPokerTypeLabel: '对子',
    bottomPokerLabel: '大王 小王 A',
    bottomPokerTypeLabel: '未成牌型',
    lastShotPokerLabel: 'K K',
    lastShotPokerTypeLabel: '对子',
    multipleSummary: '总倍数 x30 · 初始 x15 / 抢地主 x2',
    resultSummary: '地主赢 · me +20',
    scoreRows: [
      {uid: 7, name: 'me', point: '20', balance: '1020'},
      {uid: 8, name: 'next', point: '-10'},
    ],
    turnTimer: '18',
  })).toEqual({
    ...DEFAULT_GAME_STATUS,
    landlordLabel: 'p1',
    localRoleLabel: '农民',
    phase: '出牌中',
    roomLevelLabel: '进阶场',
    roomOrigin: 30,
    localHandCount: 16,
    playerCount: 3,
    actionHint: '轮到你出牌',
    actionTone: 'action',
    multiple: 30,
    selectedPokerCount: 2,
    selectedPokerLabel: 'A A',
    selectedPokerTypeLabel: '对子',
    bottomPokerLabel: '大王 小王 A',
    bottomPokerTypeLabel: '未成牌型',
    lastShotPokerLabel: 'K K',
    lastShotPokerTypeLabel: '对子',
    multipleSummary: '总倍数 x30 · 初始 x15 / 抢地主 x2',
    resultSummary: '地主赢 · me +20',
    scoreRows: [
      {uid: '7', name: 'me', point: 20, balance: 1020},
      {uid: '8', name: 'next', point: -10, balance: null},
    ],
    turnTimer: 18,
  });
});

it('falls back when numeric game status fields are invalid', () => {
  expect(normalizeGameStatus({
    bottomCount: 'bad',
    localHandCount: 'bad',
    multiple: 'bad',
    playerCount: 'bad',
    readyCount: 'bad',
    roomOrigin: 'bad',
    selectedPokerCount: 'bad',
    turnTimer: 'bad',
  })).toMatchObject({
    bottomCount: DEFAULT_GAME_STATUS.bottomCount,
    localHandCount: DEFAULT_GAME_STATUS.localHandCount,
    multiple: DEFAULT_GAME_STATUS.multiple,
    playerCount: DEFAULT_GAME_STATUS.playerCount,
    readyCount: DEFAULT_GAME_STATUS.readyCount,
    roomOrigin: DEFAULT_GAME_STATUS.roomOrigin,
    selectedPokerCount: DEFAULT_GAME_STATUS.selectedPokerCount,
    turnTimer: DEFAULT_GAME_STATUS.turnTimer,
  });
});

it('normalizes action hint tones to known UI states', () => {
  expect(normalizeActionTone('blocked')).toBe('blocked');
  expect(normalizeActionTone('unknown')).toBe(DEFAULT_GAME_STATUS.actionTone);
  expect(normalizeGameStatus({actionTone: 'done'}).actionTone).toBe('done');
  expect(normalizeGameStatus({actionTone: 'unknown'}).actionTone).toBe(DEFAULT_GAME_STATUS.actionTone);
});

it('normalizes seat summaries for the React table rail', () => {
  expect(normalizeSeatSummaries([
    {seat: '你', name: 'me', ready: 1, landlord: 0, left: 0, turn: 1, point: '1040', cardCount: '17'},
    {seat: '下家', name: 'next', ready: 0, landlord: 1, left: 1, turn: 0, point: 'bad', cardCount: '-3'},
  ])).toEqual([
    {seat: '你', name: 'me', ready: true, landlord: false, left: false, turn: true, point: 1040, cardCount: 17},
    {seat: '下家', name: 'next', ready: false, landlord: true, left: true, turn: false, point: 0, cardCount: 0},
    {seat: '上家', name: '等待玩家加入', ready: false, landlord: false, left: false, turn: false, point: 0, cardCount: 0},
  ]);
});

it('normalizes settlement score rows for the React result rail', () => {
  expect(normalizeScoreRows([
    {uid: 7, name: 'me', point: '20', balance: '1020'},
    {uid: null, name: '', point: 'bad'},
  ])).toEqual([
    {uid: '7', name: 'me', point: 20, balance: 1020},
    {uid: '', name: '玩家', point: 0, balance: null},
  ]);
  expect(normalizeScoreRows(null)).toEqual([]);
});

it('keeps the newest unique table activity messages first', () => {
  let log = buildStatusLog([], {phase: '准备中', lastAction: '等待玩家准备', actionTone: 'waiting'});
  log = buildStatusLog(log, {phase: '叫地主', lastAction: '已发牌，等待叫地主', actionTone: 'waiting'});
  log = buildStatusLog(log, {phase: '出牌中', lastAction: '地主开始出牌', actionTone: 'waiting'});
  log = buildStatusLog(log, {phase: '出牌中', lastAction: '地主开始出牌', actionTone: 'waiting'});
  log = buildStatusLog(log, {phase: '出牌中', lastAction: '上家 出牌', actionTone: 'waiting'});
  log = buildStatusLog(log, {phase: '出牌中', lastAction: '轮到你出牌', actionTone: 'action'});

  expect(log).toEqual([
    {phase: '出牌中', message: '轮到你出牌', tone: 'action'},
    {phase: '出牌中', message: '上家 出牌', tone: 'waiting'},
    {phase: '出牌中', message: '地主开始出牌', tone: 'waiting'},
    {phase: '叫地主', message: '已发牌，等待叫地主', tone: 'waiting'},
  ]);
});

it('falls back to a waiting tone for table activity with unknown tone values', () => {
  expect(buildStatusLog([], {
    phase: '出牌中',
    lastAction: '无法出牌',
    actionTone: 'unknown',
  })).toEqual([
    {phase: '出牌中', message: '无法出牌', tone: DEFAULT_GAME_STATUS.actionTone},
  ]);
});

it('emits normalized game status events for the React shell', () => {
  const listener = jest.fn();
  window.addEventListener(GAME_STATUS_EVENT, listener);

  expect(emitGameStatus({roomLabel: '房间 1', readyCount: '2'})).toBe(true);

  expect(listener).toHaveBeenCalledTimes(1);
  expect(listener.mock.calls[0][0].detail).toMatchObject({
    roomLabel: '房间 1',
    readyCount: 2,
  });

  window.removeEventListener(GAME_STATUS_EVENT, listener);
});
