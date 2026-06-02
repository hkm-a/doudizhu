import {Protocol, SocketClient, buildSocketUrl, parseSocketMessage} from './net';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;

  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.sent = [];
    this.closed = false;
  }

  send(message) {
    this.sent.push(message);
  }

  close() {
    this.closed = true;
    this.readyState = MockWebSocket.CLOSED;
  }
}

const originalWebSocket = global.WebSocket;

beforeEach(() => {
  global.WebSocket = MockWebSocket;
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  global.WebSocket = originalWebSocket;
  jest.restoreAllMocks();
});

it('builds websocket URLs from the current page location', () => {
  expect(buildSocketUrl({protocol: 'http:', host: '127.0.0.1:3000'})).toBe('ws://127.0.0.1:3000/ws');
  expect(buildSocketUrl({protocol: 'https:', host: 'game.example'})).toBe('wss://game.example/ws');
  expect(buildSocketUrl({protocol: 'http:', host: 'game.example'}, 'token with spaces')).toBe(
    'ws://game.example/ws?token=token%20with%20spaces'
  );
});

it('uses the backend room/game protocol while keeping scene aliases stable', () => {
  expect(Protocol.REQ_JOIN_ROOM).toBe(1005);
  expect(Protocol.RSP_JOIN_ROOM).toBe(1006);
  expect(Protocol.REQ_READY).toBe(2001);
  expect(Protocol.RSP_DEAL_POKER).toBe(2004);
  expect(Protocol.REQ_SHOT_POKER).toBe(3001);
  expect(Protocol.RSP_GAME_OVER).toBe(4002);
  expect(Protocol.REQ_CHAT).toBe(5001);
  expect(Protocol.RSP_CHAT).toBe(5002);

  expect(Protocol.CLI_JOIN_TABLE).toBe(Protocol.REQ_JOIN_ROOM);
  expect(Protocol.SER_JOIN_TABLE).toBe(Protocol.RSP_JOIN_ROOM);
  expect(Protocol.CLI_CALL_SCORE).toBe(Protocol.REQ_CALL_SCORE);
  expect(Protocol.SER_CALL_SCORE).toBe(Protocol.RSP_CALL_SCORE);
  expect(Protocol.SER_RESTART).toBe(46);
});

it('connects, receives packets, and sends only when open', () => {
  const sockets = [];
  const client = new SocketClient(url => {
    const socket = new MockWebSocket(url);
    sockets.push(socket);
    return socket;
  }, () => 'saved-token');
  const onopen = jest.fn();
  const onmessage = jest.fn();
  const onerror = jest.fn();

  client.connect(onopen, onmessage, onerror);
  const socket = sockets[0];

  expect(socket.url).toBe(buildSocketUrl(window.location, 'saved-token'));
  socket.onopen();
  expect(onopen).toHaveBeenCalledTimes(1);

  socket.onmessage({data: '[32, [1, 2, 3]]'});
  expect(onmessage).toHaveBeenCalledWith([32, [1, 2, 3]]);

  expect(client.send([31, {ready: 1}])).toBe(false);
  socket.readyState = MockWebSocket.OPEN;

  expect(client.send([31, {ready: 1}])).toBe(true);
  expect(socket.sent).toEqual(['[31,{"ready":1}]']);
});

it('turns malformed websocket messages into protocol errors', () => {
  expect(parseSocketMessage('not json')).toEqual([
    Protocol.ERROR,
    {reason: 'Protocol cannot be resolved'},
  ]);
  expect(parseSocketMessage('{}')).toEqual([
    Protocol.ERROR,
    {reason: 'Protocol cannot be resolved'},
  ]);
  expect(parseSocketMessage('[]')).toEqual([
    Protocol.ERROR,
    {reason: 'Protocol cannot be resolved'},
  ]);
  expect(parseSocketMessage('[1006, {"room": {"id": 8}}]')).toEqual([
    1006,
    {room: {id: 8}},
  ]);

  const sockets = [];
  const client = new SocketClient(url => {
    const socket = new MockWebSocket(url);
    sockets.push(socket);
    return socket;
  });
  const onmessage = jest.fn();

  client.connect(jest.fn(), onmessage, jest.fn());
  sockets[0].onmessage({data: 'not json'});

  expect(onmessage).toHaveBeenCalledWith([
    Protocol.ERROR,
    {reason: 'Protocol cannot be resolved'},
  ]);
});

it('reports a connection loss once and clears the active socket', () => {
  const socket = new MockWebSocket('ws://test/ws');
  const client = new SocketClient(() => socket);
  const onerror = jest.fn();

  client.connect(jest.fn(), jest.fn(), onerror);
  socket.onerror();
  socket.onclose();

  expect(onerror).toHaveBeenCalledTimes(1);
  expect(client.websocket).toBeNull();
});

it('closes the previous socket before reconnecting', () => {
  const sockets = [];
  const client = new SocketClient(url => {
    const socket = new MockWebSocket(url);
    sockets.push(socket);
    return socket;
  });

  client.connect(jest.fn(), jest.fn(), jest.fn());
  sockets[0].readyState = MockWebSocket.OPEN;
  client.connect(jest.fn(), jest.fn(), jest.fn());

  expect(sockets[0].closed).toBe(true);
  expect(client.websocket).toBe(sockets[1]);
});
