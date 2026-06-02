import {
  getCallScoreWord,
  getMessageAction,
  getNextSeat,
  isCallScoreFinished,
} from './message';
import {Protocol} from './net';

it('maps backend opcodes to scene message actions', () => {
  expect(getMessageAction([Protocol.ERROR, {reason: 'bad'}])).toEqual({
    type: 'error',
    code: Protocol.ERROR,
    packet: {reason: 'bad'},
  });
  expect(getMessageAction([Protocol.RSP_JOIN_ROOM, {room: {id: 1}}])).toEqual({
    type: 'join-room',
    code: Protocol.RSP_JOIN_ROOM,
    packet: {room: {id: 1}},
  });
  expect(getMessageAction([Protocol.RSP_LEAVE_ROOM, {uid: 7}])).toEqual({
    type: 'leave-room',
    code: Protocol.RSP_LEAVE_ROOM,
    packet: {uid: 7},
  });
  expect(getMessageAction([Protocol.RSP_CHAT, {uid: 7, message: '大家好'}])).toEqual({
    type: 'chat',
    code: Protocol.RSP_CHAT,
    packet: {uid: 7, message: '大家好'},
  });
  expect(getMessageAction([9999, {x: 1}])).toEqual({
    type: 'unknown',
    code: 9999,
    packet: {x: 1},
  });
});

it('normalizes missing packet payloads', () => {
  expect(getMessageAction([Protocol.RSP_ROOM_LIST])).toEqual({
    type: 'room-list',
    code: Protocol.RSP_ROOM_LIST,
    packet: {},
  });
  expect(getMessageAction([Protocol.RSP_READY, 'bad payload'])).toEqual({
    type: 'ready',
    code: Protocol.RSP_READY,
    packet: {},
  });
  expect(getMessageAction([Protocol.RSP_READY, [1, 2]])).toEqual({
    type: 'ready',
    code: Protocol.RSP_READY,
    packet: {},
  });
  expect(getMessageAction(null)).toEqual({
    type: 'unknown',
    code: null,
    packet: {},
  });
});

it('describes call score and turn transitions', () => {
  expect(getCallScoreWord(0)).toBe('不抢');
  expect(getCallScoreWord(1)).toBe('抢地主');
  expect(getCallScoreWord(9)).toBe('');

  expect(isCallScoreFinished({landlord: -1})).toBe(false);
  expect(isCallScoreFinished({landlord: 42})).toBe(true);

  expect(getNextSeat(0)).toBe(1);
  expect(getNextSeat(2)).toBe(0);
});
