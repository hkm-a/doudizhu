const WAITING_PLAYER_NAME = '等待玩家加入';
const ROOM_STATES = {
  INIT: 0,
  WAITING: 1,
  CALL_SCORE: 2,
  PLAYING: 3,
  GAME_OVER: 4,
};

const normalizeUid = function (uid) {
  const parsed = Number(uid);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeRoomId = function (roomId) {
  const parsed = Number(roomId);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : -1;
};

const getStoredPlayerIdentity = function (storage) {
  const targetStorage = storage || window.localStorage;
  try {
    return {
      uid: normalizeUid(targetStorage.getItem('uid')),
      name: targetStorage.getItem('name') || 'player',
    };
  } catch (error) {
    return {uid: null, name: 'player'};
  }
};

const getStoredRoomId = function (storage) {
  const targetStorage = storage || window.localStorage;
  try {
    return normalizeRoomId(targetStorage.getItem('room'));
  } catch (error) {
    return -1;
  }
};

const storeCurrentRoomId = function (roomId, storage) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const targetStorage = storage || window.localStorage;
  try {
    if (normalizedRoomId === -1) {
      targetStorage.removeItem('room');
    } else {
      targetStorage.setItem('room', String(normalizedRoomId));
    }
    return normalizedRoomId;
  } catch (error) {
    return normalizedRoomId;
  }
};

const normalizePlayer = function (player) {
  const uid = player && player.uid !== undefined ? normalizeUid(player.uid) : null;
  const pokers = Array.isArray(player && player.pokers) ? player.pokers : [];
  const point = Number(player && player.point);
  return {
    uid: uid,
    name: player && player.name ? player.name : WAITING_PLAYER_NAME,
    ready: Boolean(player && player.ready),
    landlord: Boolean(player && player.landlord),
    left: Boolean(player && player.leave),
    point: Number.isFinite(point) ? point : 0,
    cardCount: pokers.length,
    pokers: pokers,
    present: uid !== null,
  };
};

const rotatePlayersForLocalSeat = function (players, localUid) {
  const roomSeats = [0, 1, 2].map(index => normalizePlayer(players && players[index]));
  const uid = normalizeUid(localUid);
  const localIndex = roomSeats.findIndex(player => player.uid !== null && player.uid === uid);

  if (localIndex === -1) {
    return roomSeats;
  }

  return [
    roomSeats[localIndex],
    roomSeats[(localIndex + 1) % 3],
    roomSeats[(localIndex + 2) % 3],
  ];
};

const formatRoomTitle = function (room) {
  if (!room || room.id === undefined) {
    return '房间:';
  }

  const label = room.label ? room.label + ' · ' : '';
  return label + '房间号: ' + room.id + ' 底分: ' + (room.origin || 0) + ' 倍数: ' + (room.multiple || 0);
};

const getRoomStatusLabel = function (room) {
  if (!room || room.id === undefined) {
    return '等待房间';
  }
  return (room.label ? room.label + ' · ' : '') + '房间 ' + room.id;
};

const isWaitingRoom = function (room) {
  return !room || room.state === undefined || Number(room.state) === ROOM_STATES.WAITING;
};

const getRoomResumeMode = function (room) {
  const state = Number(room && room.state);
  if (state === ROOM_STATES.CALL_SCORE) {
    return 'call-score';
  }
  if (state === ROOM_STATES.PLAYING) {
    return 'playing';
  }
  if (state === ROOM_STATES.GAME_OVER) {
    return 'game-over';
  }
  return 'waiting';
};

const getRoomPhaseLabel = function (room) {
  const mode = getRoomResumeMode(room);
  if (mode === 'call-score') {
    return '叫地主';
  }
  if (mode === 'playing') {
    return '出牌中';
  }
  if (mode === 'game-over') {
    return '结算';
  }
  return '准备中';
};

const getRoomLastShotPokers = function (room) {
  return Array.isArray(room && room.last_shot_poker) ? room.last_shot_poker : [];
};

const getRoomBottomPokers = function (room) {
  return Array.isArray(room && room.pokers) ? room.pokers : [];
};

const getRoomLastShotLabel = function (room, players) {
  const pokers = getRoomLastShotPokers(room);
  if (pokers.length === 0) {
    return '暂无出牌';
  }

  const uid = normalizeUid(room && room.last_shot_uid);
  const player = (players || []).find(item => item && item.uid === uid);
  const name = player && player.name ? player.name : (uid === null ? '上一位' : '玩家 ' + uid);
  return name + ' · ' + pokers.length + ' 张';
};

const getRoomSyncState = function (packet, localUid) {
  const payload = packet || {};
  return {
    room: payload.room || null,
    players: rotatePlayersForLocalSeat(payload.players || [], localUid),
  };
};

export {
  ROOM_STATES,
  WAITING_PLAYER_NAME,
  formatRoomTitle,
  getRoomStatusLabel,
  getRoomBottomPokers,
  getRoomLastShotLabel,
  getRoomLastShotPokers,
  getRoomPhaseLabel,
  getRoomResumeMode,
  getRoomSyncState,
  getStoredPlayerIdentity,
  getStoredRoomId,
  isWaitingRoom,
  normalizeRoomId,
  normalizeUid,
  rotatePlayersForLocalSeat,
  storeCurrentRoomId,
};
