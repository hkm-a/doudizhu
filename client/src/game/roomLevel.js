const ROOM_LEVEL_STORAGE_KEY = 'roomLevel';
const DEFAULT_ROOM_LEVEL = 1;
const DEFAULT_ROOM_LEVELS = [1, 2, 3];
const DEFAULT_ROOM_LEVEL_PROFILES = {
  1: {label: '新手场', origin: 10, minPoint: 0},
  2: {label: '进阶场', origin: 30, minPoint: 1000},
  3: {label: '高手场', origin: 60, minPoint: 2000},
};

const getBrowserStorage = function () {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage;
};

const normalizeRoomLevel = function (value, fallback = DEFAULT_ROOM_LEVEL) {
  const level = Number(value);
  const nextLevel = Number.isInteger(level) && level > 0 ? level : Number(fallback);
  return Number.isInteger(nextLevel) && nextLevel > 0 ? nextLevel : DEFAULT_ROOM_LEVEL;
};

const normalizeRoomOptions = function (rooms, levels = DEFAULT_ROOM_LEVELS) {
  const byLevel = new Map();
  levels.forEach(level => {
    const normalizedLevel = normalizeRoomLevel(level);
    const profile = DEFAULT_ROOM_LEVEL_PROFILES[normalizedLevel] || {};
    byLevel.set(normalizedLevel, {
      level: normalizedLevel,
      label: profile.label || normalizedLevel + ' 档',
      origin: profile.origin || 10,
      minPoint: profile.minPoint || 0,
      number: 0,
    });
  });

  if (Array.isArray(rooms)) {
    rooms.forEach(room => {
      const level = normalizeRoomLevel(room && room.level);
      const number = Math.max(0, Number(room && room.number) || 0);
      const previous = byLevel.get(level) || {
        level,
        label: level + ' 档',
        origin: 10,
        minPoint: 0,
        number: 0,
      };
      byLevel.set(level, {
        level,
        label: String(room && room.label ? room.label : previous.label),
        origin: normalizePositiveNumber(room && room.origin, previous.origin),
        minPoint: normalizeNonNegativeNumber(
          room && (room.minPoint !== undefined ? room.minPoint : room.min_point),
          previous.minPoint,
        ),
        number: previous.number + number,
      });
    });
  }

  return Array.from(byLevel.values())
    .sort((left, right) => left.level - right.level);
};

const normalizePositiveNumber = function (value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
};

const normalizeNonNegativeNumber = function (value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

const normalizePlayerPoint = function (point, fallback = 1000) {
  if (point === null || point === undefined || point === '') {
    return fallback;
  }
  const number = Number(point);
  return Number.isFinite(number) ? number : fallback;
};

const canEnterRoomLevel = function (room, point = 1000) {
  const minPoint = normalizeNonNegativeNumber(
    room && (room.minPoint !== undefined ? room.minPoint : room.min_point),
    0,
  );
  return normalizePlayerPoint(point) >= minPoint;
};

const getRoomLevelPointShortfall = function (room, point = 1000) {
  const minPoint = normalizeNonNegativeNumber(
    room && (room.minPoint !== undefined ? room.minPoint : room.min_point),
    0,
  );
  return Math.max(0, minPoint - normalizePlayerPoint(point));
};

const getRoomLevelStatus = function (room, point = null) {
  if (point !== null && point !== undefined && !canEnterRoomLevel(room, point)) {
    return {
      label: '积分不足',
      tone: 'locked',
      shortfall: getRoomLevelPointShortfall(room, point),
    };
  }

  const number = Math.max(0, Number(room && room.number) || 0);
  if (number === 0) {
    return {label: '空闲', tone: 'idle'};
  }
  if (number < 3) {
    return {label: '待补位', tone: 'waiting'};
  }
  return {label: '有对局', tone: 'active'};
};

const getSelectableRoomLevel = function (rooms, preferredLevel, point = 1000) {
  const normalizedRooms = normalizeRoomOptions(rooms);
  const preferred = normalizeRoomLevel(preferredLevel);
  const selectedRoom = normalizedRooms.find(room => room.level === preferred);
  if (selectedRoom && canEnterRoomLevel(selectedRoom, point)) {
    return preferred;
  }
  const firstAvailable = normalizedRooms
    .filter(room => canEnterRoomLevel(room, point))
    .sort((left, right) => right.level - left.level)[0];
  return firstAvailable ? firstAvailable.level : DEFAULT_ROOM_LEVEL;
};

const readStoredRoomLevel = function (storage = getBrowserStorage()) {
  try {
    return normalizeRoomLevel(storage && storage.getItem(ROOM_LEVEL_STORAGE_KEY));
  } catch (error) {
    return DEFAULT_ROOM_LEVEL;
  }
};

const storeRoomLevel = function (value, storage = getBrowserStorage()) {
  const level = normalizeRoomLevel(value);
  try {
    if (storage && storage.setItem) {
      storage.setItem(ROOM_LEVEL_STORAGE_KEY, String(level));
    }
    return level;
  } catch (error) {
    return level;
  }
};

export {
  DEFAULT_ROOM_LEVEL,
  DEFAULT_ROOM_LEVELS,
  DEFAULT_ROOM_LEVEL_PROFILES,
  ROOM_LEVEL_STORAGE_KEY,
  getRoomLevelStatus,
  getRoomLevelPointShortfall,
  canEnterRoomLevel,
  getSelectableRoomLevel,
  normalizeRoomLevel,
  normalizeRoomOptions,
  normalizePlayerPoint,
  readStoredRoomLevel,
  storeRoomLevel,
};
