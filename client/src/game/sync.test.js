import {
  ROOM_STATES,
  formatRoomTitle,
  getRoomBottomPokers,
  getRoomLastShotLabel,
  getRoomLastShotPokers,
  getRoomPhaseLabel,
  getRoomResumeMode,
  getRoomStatusLabel,
  getRoomSyncState,
  getStoredPlayerIdentity,
  getStoredRoomId,
  isWaitingRoom,
  normalizeRoomId,
  rotatePlayersForLocalSeat,
  storeCurrentRoomId,
} from './sync';

it('rotates backend room seats so the logged in player is local seat zero', () => {
  const players = [
    {uid: 7, name: 'left', ready: 1, leave: 1, point: 980},
    {uid: 42, name: 'me', ready: 0, point: 1040},
    {uid: 9, name: 'right', landlord: 1, point: 1000},
  ];

  expect(rotatePlayersForLocalSeat(players, '42')).toEqual([
    {uid: 42, name: 'me', ready: false, landlord: false, left: false, point: 1040, cardCount: 0, pokers: [], present: true},
    {uid: 9, name: 'right', ready: false, landlord: true, left: false, point: 1000, cardCount: 0, pokers: [], present: true},
    {uid: 7, name: 'left', ready: true, landlord: false, left: true, point: 980, cardCount: 0, pokers: [], present: true},
  ]);
});

it('keeps sparse backend player slots stable when local uid is unknown', () => {
  expect(rotatePlayersForLocalSeat([{uid: 7, name: 'left'}, {}, null], null)).toEqual([
    {uid: 7, name: 'left', ready: false, landlord: false, left: false, point: 0, cardCount: 0, pokers: [], present: true},
    {uid: null, name: '等待玩家加入', ready: false, landlord: false, left: false, point: 0, cardCount: 0, pokers: [], present: false},
    {uid: null, name: '等待玩家加入', ready: false, landlord: false, left: false, point: 0, cardCount: 0, pokers: [], present: false},
  ]);
});

it('extracts room sync state and formats the room title', () => {
  const packet = {
    room: {id: 18, label: '进阶场', origin: 30, multiple: 2},
    players: [
      {uid: 1, name: 'a'},
      {uid: 2, name: 'b'},
      {uid: 3, name: 'c'},
    ],
  };

  expect(getRoomSyncState(packet, 2).players.map(player => player.name)).toEqual(['b', 'c', 'a']);
  expect(formatRoomTitle(packet.room)).toBe('进阶场 · 房间号: 18 底分: 30 倍数: 2');
  expect(getRoomStatusLabel(packet.room)).toBe('进阶场 · 房间 18');
  expect(formatRoomTitle(null)).toBe('房间:');
  expect(getRoomStatusLabel(null)).toBe('等待房间');
});

it('derives card counts from synced poker arrays', () => {
  const packet = {
    players: [
      {uid: 1, name: 'a', pokers: [3, 4, 5]},
      {uid: 2, name: 'b', pokers: [0, 0]},
      {uid: 3, name: 'c'},
    ],
  };

  expect(getRoomSyncState(packet, 1).players.map(player => player.cardCount)).toEqual([3, 2, 0]);
  expect(getRoomSyncState(packet, 1).players[0].pokers).toEqual([3, 4, 5]);
});

it('reads stored player identity defensively', () => {
  const storage = {
    getItem(key) {
      return {uid: '42', name: 'tester'}[key];
    },
  };

  expect(getStoredPlayerIdentity(storage)).toEqual({uid: 42, name: 'tester'});
  expect(getStoredPlayerIdentity({getItem() { throw new Error('blocked'); }})).toEqual({uid: null, name: 'player'});
});

it('stores and reads the current room id defensively', () => {
  const storage = {
    value: null,
    getItem(key) {
      return key === 'room' ? this.value : null;
    },
    setItem(key, value) {
      if (key === 'room') {
        this.value = value;
      }
    },
    removeItem(key) {
      if (key === 'room') {
        this.value = null;
      }
    },
  };

  expect(normalizeRoomId('18')).toBe(18);
  expect(normalizeRoomId('bad')).toBe(-1);
  expect(getStoredRoomId(storage)).toBe(-1);
  expect(storeCurrentRoomId(18, storage)).toBe(18);
  expect(storage.value).toBe('18');
  expect(getStoredRoomId(storage)).toBe(18);
  expect(storeCurrentRoomId(-1, storage)).toBe(-1);
  expect(storage.value).toBeNull();
  expect(getStoredRoomId({getItem() { throw new Error('blocked'); }})).toBe(-1);
  expect(storeCurrentRoomId(7, {setItem() { throw new Error('blocked'); }})).toBe(7);
});

it('identifies waiting rooms from backend room state', () => {
  expect(isWaitingRoom(null)).toBe(true);
  expect(isWaitingRoom({state: ROOM_STATES.WAITING})).toBe(true);
  expect(isWaitingRoom({state: ROOM_STATES.CALL_SCORE})).toBe(false);
  expect(isWaitingRoom({state: ROOM_STATES.PLAYING})).toBe(false);
});

it('describes how an active room should be resumed in the UI', () => {
  expect(getRoomResumeMode({state: ROOM_STATES.CALL_SCORE})).toBe('call-score');
  expect(getRoomResumeMode({state: ROOM_STATES.PLAYING})).toBe('playing');
  expect(getRoomResumeMode({state: ROOM_STATES.GAME_OVER})).toBe('game-over');
  expect(getRoomResumeMode({state: ROOM_STATES.WAITING})).toBe('waiting');
  expect(getRoomResumeMode(null)).toBe('waiting');

  expect(getRoomPhaseLabel({state: ROOM_STATES.CALL_SCORE})).toBe('叫地主');
  expect(getRoomPhaseLabel({state: ROOM_STATES.PLAYING})).toBe('出牌中');
  expect(getRoomPhaseLabel({state: ROOM_STATES.GAME_OVER})).toBe('结算');
  expect(getRoomPhaseLabel({state: ROOM_STATES.WAITING})).toBe('准备中');
});

it('summarizes the last synced shot for the status rail', () => {
  const room = {
    last_shot_uid: '9',
    last_shot_poker: [17, 16, 15],
  };
  const players = [
    {uid: 7, name: 'left'},
    {uid: 9, name: 'right'},
  ];

  expect(getRoomLastShotPokers(room)).toEqual([17, 16, 15]);
  expect(getRoomLastShotLabel(room, players)).toBe('right · 3 张');
  expect(getRoomLastShotLabel({last_shot_uid: 8, last_shot_poker: [4]}, players)).toBe('玩家 8 · 1 张');
  expect(getRoomLastShotLabel({last_shot_uid: 9, last_shot_poker: []}, players)).toBe('暂无出牌');
  expect(getRoomLastShotPokers(null)).toEqual([]);
});

it('extracts synced bottom cards for the status rail', () => {
  expect(getRoomBottomPokers({pokers: [52, 53, 54]})).toEqual([52, 53, 54]);
  expect(getRoomBottomPokers({pokers: []})).toEqual([]);
  expect(getRoomBottomPokers(null)).toEqual([]);
});
