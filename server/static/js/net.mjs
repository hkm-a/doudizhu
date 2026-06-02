export const Protocol = {
    /**
     * [ERROR, {"reason": 错误原因}]
     */
    ERROR: 0,

    /**
     * 请求房间列表
     * [REQ_ROOM_LIST, {}]
     */
    REQ_ROOM_LIST: 1001,
    /**
     * [RSP_ROOM_LIST, {
     *     "rooms": [{"level": int 房间等级, "number": int 房间人数}]
     * }]
     */
    RSP_ROOM_LIST: 1002,

    REQ_NEW_ROOM: 1003,
    RSP_NEW_ROOM: 1004,


    /**
     * 请求加入房间
     * [REQ_JOIN_ROOM, {
     *     "room": int 房间号 (-1表示快速加入),
     *     "level": int (1/2/3 初/中/高级场),
     *     "personality": string (optional, default "balanced")
     *         // GDD v0.2 F 章节: AI 性格
     *         // 取值: conservative / balanced / aggressive / trickster / erratic
     * }]
     *
     */
    REQ_JOIN_ROOM: 1005,
    /**
     *  用户进入房间广播
     *  [RSP_JOIN_ROOM, {
     *      "room": {
     *          "id": int 房间号,
     *          "origin": int 底分,
     *          "multiple": int 倍数,
     *          "state": int 房间状态 (1/2/3/4 WAITING/CALL_SCORE/PLAYING/GAME_OVER),
     *          "landlord_uid": int 本轮叫地主用户,
     *          "whose_turn": int 正在叫分/出牌用户 UID,
     *          "timer": int 倒计时,
     *          "last_shot_uid": int 房间状态,
     *          "last_shot_poker": int 房间状态,
     *          "double_turn_uid": int 加倍阶段当前决策 UID (-1 if 不在加倍阶段),
     *          "personality": string AI 性格 (conservative/balanced/aggressive/trickster/erratic)
     *      },
     *      "players": [{
     *          "uid": int 用户ID,
     *          "name": 用户名,
     *          "sex": int 0 男 1 女
     *          "avatar": 头像,
     *          "point": int 分数
     *          "ready": int 是否准备(1 准备 0 未准备),
     *          "rob":  int 是否抢地主 (-1/0/1),
     *          "leave": int 是否离开房间 (1 离开离开 0 在房间)
     *          "landlord":  int 是否是地主 (0/1),
     *          "pokers": [int 手牌]
     *      }, {}, {}]
     *  }]
     */
    RSP_JOIN_ROOM: 1006,

    /**
     * 请求离开房间
     * [REQ_LEAVE_ROOM, {}]
     */
    REQ_LEAVE_ROOM: 1007,

    /**
     * 离开房间广播
     * [REQ_LEAVE_ROOM, {"uid": int 用户ID}]
     */
    RSP_LEAVE_ROOM: 1008,

    /**
     * 用户进入准备状态
     * [REQ_READY, {"ready": int (1 准备 0 取消准备)}]
     */
    REQ_READY: 2001,
    /**
     * 用户准备/取消准备状态广播
     * [RSP_READY, {"uid": 用户ID, "ready": int(0/1)}]
     */
    RSP_READY: 2002,


    /**
     *  发牌, 当用户全部进去准备状态，服务器主动下发
     *  [RSP_DEAL_POKER, {
     *      "room_id": 用户ID 开始抢地主的用户, 客户端判断是否是自己,
     *      "timer": int 倒计时开始,
     *      "pokers": [int 17张扑克牌]
     *  }]
     */
    RSP_DEAL_POKER: 2004,


    /**
     *  是否抢地主
     *  [REQ_CALL_SCORE, {"rob": int (0 不抢  1 抢地主)}]
     */
    REQ_CALL_SCORE: 2005,

    /**
     * 抢地主广播
     * [RSP_CALL_SCORE, {
     *      "room_id": 叫地主用户ID,
     *      "rob": int 是否抢地主,
     *      "landlord": 用户ID, -1表示继续抢地主, 否则返回地主用户ID,
     *      "multiple": int 当前倍数,
     *      "pokers": [int 抢地主结束时返回三张底牌]}
     *      }]
     */
    RSP_CALL_SCORE: 2006,


    /**
     * 是否加倍（地主确认后、地主第一次出牌前）
     * [REQ_DOUBLE, {"double": int (0 不加倍 1 加倍)}]
     */
    REQ_DOUBLE: 2007,
    /**
     * 加倍广播
     * [RSP_DOUBLE, {
     *     "room_id": 房间号,
     *     "uid": 加倍用户ID,
     *     "double": int (0/1),
     *     "multiple": int 加倍后的当前倍数,
     *     "personality": "rule"|"douzero"|null  // AI 决策时记录
     * }]
     */
    RSP_DOUBLE: 2008,


    /**
     * 请求出牌
     * [REQ_SHOT_POKER, {"pokers": [int 扑克牌]}]
     */
    REQ_SHOT_POKER: 3001,
    /**
     * 出牌广播
     *  [RSP_SHOT_POKER, {"uid": 用户ID 出牌用户, "pokers": [int 扑克牌], "multiple": int 当前倍数}]
     */
    RSP_SHOT_POKER: 3002,


    /**
     *  游戏结束广播, 服务器主动下发
     *  pokers 为最后展示手牌用, 可以忽略
     *  [RSP_GAME_OVER, {
     *      "winner": int 获胜的用户ID,
     *      "spring": int 是否春天 1/0,
     *      "antispring": int 是否反春 1/0,
     *      "multiple": {
     *         "origin": int 初始倍数,
     *         "di": int   底牌,
     *         "ming": int 明牌,
     *         "bomb": int 炸弹,
     *         "rob": int  抢地主,
     *         "spring": int 春天,
     *         "landlord": int 地主加倍,
     *         "farmer": int 农民加倍
     *      },
     *      "players": [{"uid": int用户ID, "point": int 输赢分数, "pokers": [int 手牌]}, {}, {}],
     *  }]
     */
    RSP_GAME_OVER: 4002,


    /**
     * 段位变更推送（服务端 → 单个玩家）
     * [RSP_SEGMENT_CHANGE, {
     *     "uid": 玩家 UID,
     *     "old_segment": "gold",
     *     "old_points": 80,
     *     "new_segment": "platinum",
     *     "new_points": 10,
     *     "promoted": true,
     *     "demoted": false,
     *     "score_delta": 30
     * }]
     */
    RSP_SEGMENT_CHANGE: 4009,


    REQ_CHAT: 5001,
    RSP_CHAT: 5002,
};

function pretty_log(tag, packet) {
    for (let key in Protocol) {
        if (packet[0] === Protocol[key])
            console.log(`${tag}: ${key} ${JSON.stringify(packet.slice(1))}`)
    }
}

export class Socket {
    constructor(url) {
        this.url = url;
        this.websocket = null;
    }

    connect(onopen, onmessage, onerror) {
        this.close();

        const websocket = new WebSocket(this.url);
        websocket.binaryType = "arraybuffer";
        this.websocket = websocket;

        let reportedClose = false;
        const reportClose = () => {
            if (reportedClose || this.websocket !== websocket) {
                return;
            }

            reportedClose = true;
            this.websocket = null;
            onerror();
        };

        websocket.onopen = function () {
            console.log("CONNECTED");
            onopen();
        };

        websocket.onerror = function () {
            console.log("CONNECT ERROR");
            reportClose();
        };

        websocket.onclose = function () {
            console.log("DISCONNECTED");
            reportClose();
        };

        websocket.onmessage = function (evt) {
            const packet = JSON.parse(evt.data);
            pretty_log("RSP", packet);
            onmessage(packet);
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

    send (packet) {
        if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
            console.log("SKIP SEND: socket is not connected");
            return;
        }

        pretty_log("REQ", packet);
        this.websocket.send(JSON.stringify(packet));
    }

}
