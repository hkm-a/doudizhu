
const Protocol = {
    ERROR: 0,

    REQ_ROOM_LIST: 1001,
    RSP_ROOM_LIST: 1002,

    REQ_NEW_ROOM: 1003,
    RSP_NEW_ROOM: 1004,

    REQ_JOIN_ROOM: 1005,
    RSP_JOIN_ROOM: 1006,

    REQ_LEAVE_ROOM: 1007,
    RSP_LEAVE_ROOM: 1008,

    REQ_READY: 2001,
    RSP_READY: 2002,

    RSP_DEAL_POKER: 2004,

    REQ_CALL_SCORE: 2005,
    RSP_CALL_SCORE: 2006,

    REQ_SHOT_POKER: 3001,
    RSP_SHOT_POKER: 3002,

    REQ_DOUBLE: 2007,
    RSP_DOUBLE: 2008,

    RSP_GAME_OVER: 4002,

    REQ_CHAT: 5001,
    RSP_CHAT: 5002,
};

Object.assign(Protocol, {
  CLI_CHEAT: 1,
  SER_CHEAT: 2,
  CLI_LOGIN: 11,
  SER_LOGIN: 12,
  CLI_LIST_TABLE: Protocol.REQ_ROOM_LIST,
  SER_LIST_TABLE: Protocol.RSP_ROOM_LIST,
  CLI_CREATE_TABLE: Protocol.REQ_NEW_ROOM,
  SER_CREATE_TABLE: Protocol.RSP_NEW_ROOM,
  CLI_JOIN_TABLE: Protocol.REQ_JOIN_ROOM,
  SER_JOIN_TABLE: Protocol.RSP_JOIN_ROOM,
  CLI_DEAL_POKER: Protocol.REQ_READY,
  SER_DEAL_POKER: Protocol.RSP_DEAL_POKER,
  CLI_HOLE_POKER: 35,
  SER_HOLE_POKER: 36,
  CLI_CALL_SCORE: Protocol.REQ_CALL_SCORE,
  SER_CALL_SCORE: Protocol.RSP_CALL_SCORE,
  CLI_SHOT_POKER: Protocol.REQ_SHOT_POKER,
  SER_SHOT_POKER: Protocol.RSP_SHOT_POKER,
  SER_GAME_OVER: Protocol.RSP_GAME_OVER,
  CLI_RESTART: 45,
  SER_RESTART: 46,
});

const buildSocketUrl = function (location, token) {
    const protocol = location.protocol.startsWith('https') ? 'wss://' : 'ws://';
    const query = token ? '?token=' + encodeURIComponent(token) : '';
    return protocol + location.host + '/ws' + query;
};

const getStoredToken = function () {
    try {
        return window.localStorage.getItem('token');
    } catch (error) {
        return null;
    }
};

const parseSocketMessage = function (data) {
    try {
        const message = JSON.parse(data);
        return Array.isArray(message) && message.length > 0
            ? message
            : [Protocol.ERROR, {reason: 'Protocol cannot be resolved'}];
    } catch (error) {
        return [Protocol.ERROR, {reason: 'Protocol cannot be resolved'}];
    }
};

class SocketClient {
    constructor(webSocketFactory, tokenProvider) {
        this.webSocketFactory = webSocketFactory || (url => new WebSocket(url));
        this.tokenProvider = tokenProvider || getStoredToken;
        this.websocket = null;
    }

    connect(onopen, onmessage, onerror) {
        this.close();

        const websocket = this.webSocketFactory(buildSocketUrl(window.location, this.tokenProvider()));
        websocket.binaryType = 'arraybuffer';
        this.websocket = websocket;

        let reportedClose = false;
        const reportClose = () => {
            if (reportedClose || this.websocket !== websocket) {
                return;
            }

            reportedClose = true;
            this.websocket = null;
            if (onerror) {
                onerror();
            }
        };

        websocket.onopen = function () {
            console.log('CONNECTED');
            if (onopen) {
                onopen();
            }
        };

        websocket.onerror = function () {
            console.log('CONNECT ERROR');
            reportClose();
        };

        websocket.onclose = function () {
            console.log('DISCONNECTED');
            reportClose();
        };

        websocket.onmessage = function (evt) {
            console.log('RECV: ' + evt.data);
            onmessage(parseSocketMessage(evt.data));
        };
    }

    close() {
        if (!this.websocket) {
            return;
        }

        const websocket = this.websocket;
        this.websocket = null;
        websocket.onopen = null;
        websocket.onmessage = null;
        websocket.onerror = null;
        websocket.onclose = null;

        if (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING) {
            websocket.close();
        }
    }

    send(msg) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.log('SKIP SEND: socket is not connected');
            return false;
        }

        console.log('SEND: ' + msg);
        this.websocket.send(JSON.stringify(msg));
        return true;
    }
}

const Socket = new SocketClient();

export {Protocol, Socket, SocketClient, buildSocketUrl, parseSocketMessage}
