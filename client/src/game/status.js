const GAME_STATUS_EVENT = 'doudizhu:game-status';
const GAME_COMMAND_EVENT = 'doudizhu:game-command';

const DEFAULT_SEAT_SUMMARIES = [
  {seat: '你', name: '等待玩家加入', ready: false, landlord: false, left: false, turn: false, point: 0, cardCount: 0},
  {seat: '下家', name: '等待玩家加入', ready: false, landlord: false, left: false, turn: false, point: 0, cardCount: 0},
  {seat: '上家', name: '等待玩家加入', ready: false, landlord: false, left: false, turn: false, point: 0, cardCount: 0},
];

const ACTION_HINT_TONES = ['action', 'waiting', 'blocked', 'done'];

const DEFAULT_GAME_STATUS = {
  connection: '准备连接',
  phase: '准备中',
  roomLabel: '等待房间',
  roomLevelLabel: '未选择',
  roomOrigin: 0,
  playerCount: 0,
  readyCount: 0,
  multiple: 15,
  turnTimer: 0,
  localHandCount: 0,
  selectedPokerCount: 0,
  selectedPokerLabel: '',
  selectedPokerTypeLabel: '',
  landlordLabel: '未确定',
  localRoleLabel: '未确定',
  turnLabel: '等待玩家',
  bottomCount: 0,
  bottomPokerLabel: '',
  bottomPokerTypeLabel: '',
  lastShotLabel: '暂无出牌',
  lastShotPokerLabel: '',
  lastShotPokerTypeLabel: '',
  lastAction: '等待进入牌桌',
  actionHint: '等待进入牌桌',
  actionTone: 'waiting',
  canReady: false,
  canCallScore: false,
  canPass: false,
  canHint: false,
  canShot: false,
  resultSummary: '',
  multipleSummary: '',
  scoreRows: [],
  seatSummaries: DEFAULT_SEAT_SUMMARIES,
};

const DEFAULT_STATUS_LOG_LIMIT = 4;

const normalizeNumber = function (value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const buildStatusLog = function (currentLog, status, limit = DEFAULT_STATUS_LOG_LIMIT) {
  const message = String(status && status.lastAction ? status.lastAction : '').trim();
  if (!message || limit <= 0) {
    return Array.isArray(currentLog) ? currentLog.slice(0, Math.max(limit, 0)) : [];
  }

  const phase = String(status && status.phase ? status.phase : DEFAULT_GAME_STATUS.phase);
  const log = Array.isArray(currentLog) ? currentLog : [];
  const newest = log[0];
  if (newest && newest.message === message && newest.phase === phase) {
    return log.slice(0, limit);
  }

  return [{
    message,
    phase,
    tone: normalizeActionTone(status && status.actionTone),
  }].concat(log).slice(0, limit);
};

const normalizeSeatSummary = function (seat, index) {
  const fallback = DEFAULT_SEAT_SUMMARIES[index] || DEFAULT_SEAT_SUMMARIES[0];
  const nextSeat = seat || {};
  return {
    seat: String(nextSeat.seat || fallback.seat),
    name: String(nextSeat.name || fallback.name),
    ready: Boolean(nextSeat.ready),
    landlord: Boolean(nextSeat.landlord),
    left: Boolean(nextSeat.left),
    turn: Boolean(nextSeat.turn),
    point: normalizeNumber(nextSeat.point, 0),
    cardCount: Math.max(0, normalizeNumber(nextSeat.cardCount, fallback.cardCount)),
  };
};

const normalizeSeatSummaries = function (seats) {
  const source = Array.isArray(seats) ? seats : [];
  return DEFAULT_SEAT_SUMMARIES.map((seat, index) => normalizeSeatSummary(source[index], index));
};

const normalizeScoreRows = function (rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map(row => {
    const nextRow = row || {};
    return {
      uid: nextRow.uid === undefined || nextRow.uid === null ? '' : String(nextRow.uid),
      name: String(nextRow.name || '玩家'),
      point: normalizeNumber(nextRow.point, 0),
      balance: normalizeOptionalNumber(nextRow.balance),
    };
  });
};

const normalizeOptionalNumber = function (value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  return normalizeNumber(value, 0);
};

const normalizeActionTone = function (tone) {
  return ACTION_HINT_TONES.indexOf(tone) === -1 ? DEFAULT_GAME_STATUS.actionTone : tone;
};

const normalizeGameStatus = function (status) {
  const nextStatus = {
    ...DEFAULT_GAME_STATUS,
    ...(status || {}),
  };

  return {
    ...nextStatus,
    playerCount: normalizeNumber(nextStatus.playerCount, DEFAULT_GAME_STATUS.playerCount),
    readyCount: normalizeNumber(nextStatus.readyCount, DEFAULT_GAME_STATUS.readyCount),
    roomLevelLabel: String(nextStatus.roomLevelLabel || DEFAULT_GAME_STATUS.roomLevelLabel),
    roomOrigin: normalizeNumber(nextStatus.roomOrigin, DEFAULT_GAME_STATUS.roomOrigin),
    multiple: normalizeNumber(nextStatus.multiple, DEFAULT_GAME_STATUS.multiple),
    turnTimer: normalizeNumber(nextStatus.turnTimer, DEFAULT_GAME_STATUS.turnTimer),
    localHandCount: normalizeNumber(nextStatus.localHandCount, DEFAULT_GAME_STATUS.localHandCount),
    selectedPokerCount: normalizeNumber(nextStatus.selectedPokerCount, DEFAULT_GAME_STATUS.selectedPokerCount),
    selectedPokerLabel: String(nextStatus.selectedPokerLabel || ''),
    selectedPokerTypeLabel: String(nextStatus.selectedPokerTypeLabel || ''),
    bottomCount: normalizeNumber(nextStatus.bottomCount, DEFAULT_GAME_STATUS.bottomCount),
    bottomPokerLabel: String(nextStatus.bottomPokerLabel || ''),
    bottomPokerTypeLabel: String(nextStatus.bottomPokerTypeLabel || ''),
    lastShotPokerLabel: String(nextStatus.lastShotPokerLabel || ''),
    lastShotPokerTypeLabel: String(nextStatus.lastShotPokerTypeLabel || ''),
    multipleSummary: String(nextStatus.multipleSummary || ''),
    scoreRows: normalizeScoreRows(nextStatus.scoreRows),
    seatSummaries: normalizeSeatSummaries(nextStatus.seatSummaries),
    actionTone: normalizeActionTone(nextStatus.actionTone),
    canReady: Boolean(nextStatus.canReady),
    canCallScore: Boolean(nextStatus.canCallScore),
    canPass: Boolean(nextStatus.canPass),
    canHint: Boolean(nextStatus.canHint),
    canShot: Boolean(nextStatus.canShot),
  };
};

const emitGameStatus = function (status) {
  if (typeof window === 'undefined' || !window.dispatchEvent) {
    return false;
  }

  window.dispatchEvent(new CustomEvent(GAME_STATUS_EVENT, {
    detail: normalizeGameStatus(status),
  }));
  return true;
};

const emitGameCommand = function (command) {
  if (typeof window === 'undefined' || !window.dispatchEvent) {
    return false;
  }

  window.dispatchEvent(new CustomEvent(GAME_COMMAND_EVENT, {
    detail: command || {},
  }));
  return true;
};

export {
  buildStatusLog,
  ACTION_HINT_TONES,
  DEFAULT_GAME_STATUS,
  DEFAULT_SEAT_SUMMARIES,
  DEFAULT_STATUS_LOG_LIMIT,
  GAME_COMMAND_EVENT,
  GAME_STATUS_EVENT,
  emitGameCommand,
  emitGameStatus,
  normalizeGameStatus,
  normalizeActionTone,
  normalizeScoreRows,
  normalizeSeatSummaries,
};
