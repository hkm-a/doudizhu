import {Protocol} from './net';

const MESSAGE_ACTIONS = {
  [Protocol.ERROR]: 'error',
  [Protocol.RSP_ROOM_LIST]: 'room-list',
  [Protocol.RSP_NEW_ROOM]: 'new-room',
  [Protocol.RSP_JOIN_ROOM]: 'join-room',
  [Protocol.RSP_LEAVE_ROOM]: 'leave-room',
  [Protocol.RSP_READY]: 'ready',
  [Protocol.RSP_DEAL_POKER]: 'deal-poker',
  [Protocol.RSP_CALL_SCORE]: 'call-score',
  [Protocol.RSP_DOUBLE]: 'double',
  [Protocol.RSP_SHOT_POKER]: 'shot-poker',
  [Protocol.RSP_GAME_OVER]: 'game-over',
  [Protocol.RSP_CHAT]: 'chat',
};

const getMessageAction = function (message) {
  const code = message && message[0];
  const packet = message && message[1] && typeof message[1] === 'object' && !Array.isArray(message[1])
    ? message[1]
    : {};
  return {
    type: MESSAGE_ACTIONS[code] || 'unknown',
    code: code,
    packet: packet,
  };
};

const getCallScoreWord = function (rob) {
  return ['不抢', '抢地主'][rob] || '';
};

const isCallScoreFinished = function (packet) {
  return packet && packet.landlord !== -1;
};

const getNextSeat = function (seat) {
  return (seat + 1) % 3;
};

export {
  MESSAGE_ACTIONS,
  getCallScoreWord,
  getMessageAction,
  getNextSeat,
  isCallScoreFinished,
};
