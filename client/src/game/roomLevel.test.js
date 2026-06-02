import {
  DEFAULT_ROOM_LEVEL,
  canEnterRoomLevel,
  getSelectableRoomLevel,
  getRoomLevelPointShortfall,
  getRoomLevelStatus,
  normalizePlayerPoint,
  normalizeRoomLevel,
  normalizeRoomOptions,
  readStoredRoomLevel,
  storeRoomLevel,
} from './roomLevel';

afterEach(() => {
  localStorage.clear();
});

it('normalizes room level selections for room joins', () => {
  expect(normalizeRoomLevel(2)).toBe(2);
  expect(normalizeRoomLevel('3')).toBe(3);
  expect(normalizeRoomLevel('bad')).toBe(DEFAULT_ROOM_LEVEL);
  expect(normalizeRoomLevel(-1, 2)).toBe(2);
});

it('normalizes room options while preserving empty default levels', () => {
  expect(normalizeRoomOptions([
    {level: 2, label: '进阶', origin: 30, min_point: 1200, number: 3},
    {level: 1, number: 'bad'},
    {level: 4, number: 1},
  ])).toEqual([
    {level: 1, label: '新手场', origin: 10, minPoint: 0, number: 0},
    {level: 2, label: '进阶', origin: 30, minPoint: 1200, number: 3},
    {level: 3, label: '高手场', origin: 60, minPoint: 2000, number: 0},
    {level: 4, label: '4 档', origin: 10, minPoint: 0, number: 1},
  ]);
});

it('labels room level occupancy status for the lobby picker', () => {
  expect(getRoomLevelStatus({number: 0})).toEqual({label: '空闲', tone: 'idle'});
  expect(getRoomLevelStatus({number: 2})).toEqual({label: '待补位', tone: 'waiting'});
  expect(getRoomLevelStatus({number: 3})).toEqual({label: '有对局', tone: 'active'});
});

it('labels locked room levels when the player point is too low', () => {
  expect(normalizePlayerPoint(null)).toBe(1000);
  expect(normalizePlayerPoint('')).toBe(1000);
  expect(normalizePlayerPoint('1280')).toBe(1280);
  expect(canEnterRoomLevel({minPoint: 2000}, 1280)).toBe(false);
  expect(canEnterRoomLevel({min_point: 1200}, 1280)).toBe(true);
  expect(getRoomLevelPointShortfall({minPoint: 2000}, 1280)).toBe(720);
  expect(getRoomLevelPointShortfall({min_point: 1200}, 1280)).toBe(0);
  expect(getRoomLevelStatus({number: 0, minPoint: 2000}, 1280)).toEqual({
    label: '积分不足',
    tone: 'locked',
    shortfall: 720,
  });
});

it('selects the highest preferred room only when the point balance allows it', () => {
  const rooms = [
    {level: 1, min_point: 0, number: 0},
    {level: 2, min_point: 1000, number: 0},
    {level: 3, min_point: 2000, number: 0},
  ];

  expect(getSelectableRoomLevel(rooms, 3, 900)).toBe(1);
  expect(getSelectableRoomLevel(rooms, 3, 1500)).toBe(2);
  expect(getSelectableRoomLevel(rooms, 3, 2500)).toBe(3);
});

it('stores and reads the preferred room level defensively', () => {
  expect(readStoredRoomLevel()).toBe(1);

  expect(storeRoomLevel(3)).toBe(3);
  expect(localStorage.getItem('roomLevel')).toBe('3');
  expect(readStoredRoomLevel()).toBe(3);

  const blockedStorage = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  expect(readStoredRoomLevel(blockedStorage)).toBe(1);
  expect(storeRoomLevel(2, blockedStorage)).toBe(2);
});
