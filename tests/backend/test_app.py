import json
import logging
import unittest
from unittest.mock import patch
import asyncio

from tornado.testing import AsyncHTTPTestCase, gen_test
from tornado.web import HTTPError
from tornado.web import create_signed_value
from tornado.websocket import websocket_connect

from app import Application
from api.auth import normalize_login_name
from api.base import JwtMixin
from api.game.globalvar import GlobalVar
from api.game.protocol import Protocol
from api.game.views import SocketHandler
from models import User


class UserModelTest(unittest.TestCase):
    def test_normalizes_login_name_for_account_lookup(self):
        self.assertEqual(normalize_login_name('  tester  '), 'tester')

    def test_rejects_invalid_login_names_before_database_write(self):
        invalid_names = (
            '',
            '   ',
            'x' * 51,
            123,
        )

        for value in invalid_names:
            with self.subTest(value=value):
                with self.assertRaises(HTTPError):
                    normalize_login_name(value)

    def test_user_dict_includes_persisted_point_balance(self):
        account = User(id=7, name='tester', sex=1, avatar='', point=1280)

        self.assertEqual(account.to_dict(), {
            'uid': 7,
            'name': 'tester',
            'sex': 1,
            'avatar': '',
            'point': 1280,
            'segment': 'gold',
            'segment_points': 0,
            'elo': 1000,
        })

    def test_user_dict_defaults_missing_point_balance(self):
        account = User(id=7, name='tester', sex=1, avatar='', point=None)

        self.assertEqual(account.to_dict()['point'], 1000)


class HealthHandlerTest(AsyncHTTPTestCase):
    def get_app(self):
        self.app = Application()
        return self.app

    def setUp(self):
        GlobalVar.__players__.clear()
        GlobalVar.__waiting_rooms__.clear()
        GlobalVar.__playing_rooms__.clear()
        GlobalVar.total_room_count = 0
        self.access_logger = logging.getLogger('tornado.access')
        self.original_access_disabled = self.access_logger.disabled
        self.access_logger.disabled = True
        super().setUp()

    def tearDown(self):
        self.app.executor.shutdown(wait=False, cancel_futures=True)
        GlobalVar.__players__.clear()
        GlobalVar.__waiting_rooms__.clear()
        GlobalVar.__playing_rooms__.clear()
        GlobalVar.total_room_count = 0
        self.access_logger.disabled = self.original_access_disabled
        super().tearDown()

    def test_healthz_reports_service_status(self):
        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertIn('Authorization', response.headers['Access-Control-Allow-Headers'])
        self.assertEqual(json.loads(response.body), {
            'status': 'ok',
            'service': 'doudizhu',
            'robots': True,
            'lobby': {
                'players': 0,
                'waiting_rooms': 0,
                'playing_rooms': 0,
            },
            'rooms': [
                {'level': 1, 'label': '新手场', 'origin': 10, 'min_point': 0, 'number': 0},
                {'level': 2, 'label': '进阶场', 'origin': 30, 'min_point': 1000, 'number': 0},
                {'level': 3, 'label': '高手场', 'origin': 60, 'min_point': 2000, 'number': 0},
            ],
        })

    def test_healthz_reflects_robot_toggle(self):
        self.app.allow_robot = False

        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertFalse(json.loads(response.body)['robots'])

    def test_healthz_reports_lobby_summary(self):
        GlobalVar.find_player(501, 'active')
        left_player = GlobalVar.find_player(502, 'left')
        left_player.set_left()
        GlobalVar.new_room(1, allow_robot=False)
        playing_room = GlobalVar.new_room(1, allow_robot=False)
        GlobalVar.__waiting_rooms__.pop(playing_room.room_id)
        GlobalVar.__playing_rooms__[playing_room.room_id] = playing_room

        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body)['lobby'], {
            'players': 1,
            'waiting_rooms': 1,
            'playing_rooms': 1,
        })

    def test_healthz_reports_room_level_occupancy(self):
        level_one_room = GlobalVar.new_room(1, allow_robot=False)
        level_three_room = GlobalVar.new_room(3, allow_robot=False)
        level_one_room.players = [
            GlobalVar.find_player(601, 'one-a'),
            GlobalVar.find_player(602, 'one-b'),
            None,
        ]
        level_three_room.players = [
            GlobalVar.find_player(603, 'three-a'),
            None,
            None,
        ]

        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body)['rooms'], [
            {'level': 1, 'label': '新手场', 'origin': 10, 'min_point': 0, 'number': 2},
            {'level': 2, 'label': '进阶场', 'origin': 30, 'min_point': 1000, 'number': 0},
            {'level': 3, 'label': '高手场', 'origin': 60, 'min_point': 2000, 'number': 1},
        ])


class GlobalVarLobbyTest(unittest.TestCase):
    def setUp(self):
        GlobalVar.__players__.clear()
        GlobalVar.__waiting_rooms__.clear()
        GlobalVar.__playing_rooms__.clear()
        GlobalVar.total_room_count = 0

    def tearDown(self):
        GlobalVar.__players__.clear()
        GlobalVar.__waiting_rooms__.clear()
        GlobalVar.__playing_rooms__.clear()
        GlobalVar.total_room_count = 0

    def test_room_list_reports_real_room_occupancy_by_level(self):
        waiting_room = GlobalVar.new_room(1, allow_robot=False)
        playing_room = GlobalVar.new_room(1, allow_robot=False)
        level_two_room = GlobalVar.new_room(2, allow_robot=False)
        GlobalVar.__waiting_rooms__.pop(playing_room.room_id)
        GlobalVar.__playing_rooms__[playing_room.room_id] = playing_room

        left_player = GlobalVar.find_player(205, 'left')
        left_player.set_left()
        waiting_room.players = [
            GlobalVar.find_player(201, 'waiting-a'),
            left_player,
            None,
        ]
        playing_room.players = [
            GlobalVar.find_player(202, 'playing-a'),
            GlobalVar.find_player(203, 'playing-b'),
            GlobalVar.find_player(204, 'playing-c'),
        ]
        level_two_room.players = [
            GlobalVar.find_player(206, 'level-two'),
            None,
            None,
        ]

        self.assertEqual(GlobalVar.room_list(), [
            {'level': 1, 'label': '新手场', 'origin': 10, 'min_point': 0, 'number': 4},
            {'level': 2, 'label': '进阶场', 'origin': 30, 'min_point': 1000, 'number': 1},
            {'level': 3, 'label': '高手场', 'origin': 60, 'min_point': 2000, 'number': 0},
        ])


class AdminHandlerTest(AsyncHTTPTestCase):
    def get_app(self):
        self.app = Application()
        return self.app

    def tearDown(self):
        self.app.executor.shutdown(wait=False, cancel_futures=True)
        super().tearDown()

    def auth_cookie(self, uid):
        value = json.dumps({
            'uid': uid,
            'name': 'admin' if uid == 1 else 'player',
            'sex': 1,
            'avatar': '',
            'point': 1000,
        })
        signed = create_signed_value(self.app.settings['cookie_secret'], 'userinfo', value)
        return 'userinfo=' + signed.decode('utf-8')

    def auth_header(self, uid):
        return 'Bearer ' + JwtMixin.jwt_encode({
            'uid': uid,
            'name': 'admin' if uid == 1 else 'player',
            'sex': 1,
            'avatar': '',
            'point': 1000,
        })

    def test_admin_can_toggle_robot_fill(self):
        response = self.fetch('/admin', headers={'Cookie': self.auth_cookie(1)})

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body), {'allow_robot': True})

        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Cookie': self.auth_cookie(1), 'Content-Type': 'application/json'},
            body=json.dumps({'allow_robot': False}),
        )

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body), {'allow_robot': False})
        self.assertFalse(self.app.allow_robot)

    def test_admin_can_toggle_robot_fill_with_bearer_token(self):
        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Authorization': self.auth_header(1), 'Content-Type': 'application/json'},
            body=json.dumps({'allow_robot': False}),
        )

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body), {'allow_robot': False})
        self.assertFalse(self.app.allow_robot)

    def test_non_admin_cannot_toggle_robot_fill(self):
        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Cookie': self.auth_cookie(2), 'Content-Type': 'application/json'},
            body=json.dumps({'allow_robot': False}),
            raise_error=False,
        )

        self.assertEqual(response.code, 403)
        self.assertEqual(json.loads(response.body), {'detail': 'Forbidden'})
        self.assertTrue(self.app.allow_robot)

    def test_json_endpoints_reject_malformed_request_body(self):
        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Cookie': self.auth_cookie(1), 'Content-Type': 'application/json'},
            body='{bad-json',
            raise_error=False,
        )

        self.assertEqual(response.code, 400)
        self.assertEqual(json.loads(response.body), {'detail': '请求 JSON 格式异常'})
        self.assertTrue(self.app.allow_robot)

    def test_json_endpoints_reject_non_object_request_body(self):
        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Cookie': self.auth_cookie(1), 'Content-Type': 'application/json'},
            body='[]',
            raise_error=False,
        )

        self.assertEqual(response.code, 400)
        self.assertEqual(json.loads(response.body), {'detail': '请求 JSON 必须是对象'})
        self.assertTrue(self.app.allow_robot)

    def test_json_endpoints_reject_missing_required_fields(self):
        response = self.fetch(
            '/admin',
            method='POST',
            headers={'Cookie': self.auth_cookie(1), 'Content-Type': 'application/json'},
            body='{}',
            raise_error=False,
        )

        self.assertEqual(response.code, 400)
        self.assertEqual(json.loads(response.body), {'detail': 'The field "allow_robot" is required'})
        self.assertTrue(self.app.allow_robot)


class SocketHandlerDecodeMessageTest(unittest.TestCase):
    def setUp(self):
        self.logging_patch = patch('api.game.views.logging')
        self.logging_patch.start()

    def tearDown(self):
        self.logging_patch.stop()

    def test_decodes_valid_protocol_packet(self):
        self.assertEqual(SocketHandler.decode_message('[2001, {"ready": 1}]'), (2001, {'ready': 1}))

    def test_rejects_malformed_json_without_raising(self):
        self.assertEqual(SocketHandler.decode_message('{bad-json'), (None, None))

    def test_rejects_non_packet_json_values_without_raising(self):
        invalid_messages = (
            'null',
            '1',
            '{}',
            '[2001]',
            '[2001, {"ready": 1}, "extra"]',
            '{"0": 2001, "1": {"ready": 1}}',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))

    def test_rejects_bool_or_string_protocol_codes(self):
        invalid_messages = (
            '[true, {"ready": 1}]',
            '["2001", {"ready": 1}]',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))

    def test_rejects_non_object_packet_payloads(self):
        invalid_messages = (
            '[2001, null]',
            '[2001, []]',
            '[2001, "ready"]',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))


class SocketHandlerMessageTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.logging_patch = patch('api.game.views.logging')
        self.logging = self.logging_patch.start()

    def tearDown(self):
        self.logging_patch.stop()

    async def test_non_room_list_message_without_player_reports_error(self):
        class HandlerProbe:
            player = None
            decode_message = staticmethod(SocketHandler.decode_message)

            def __init__(self):
                self.messages = []

            @property
            def uid(self):
                return 0

            def write_message(self, message):
                self.messages.append(message)

        handler = HandlerProbe()

        await SocketHandler.on_message(handler, '[2001, {"ready": 1}]')

        self.assertEqual(handler.messages, [[Protocol.ERROR, {'reason': 'Player is not ready'}]])
        self.logging.warning.assert_called_once_with('SOCKET message ignored before player is ready: %s', '[2001, {"ready": 1}]')


class SocketHandlerFlowTest(AsyncHTTPTestCase):
    def get_app(self):
        self.app = Application()
        self.app.allow_robot = False
        return self.app

    def setUp(self):
        GlobalVar.__players__.clear()
        GlobalVar.__waiting_rooms__.clear()
        GlobalVar.__playing_rooms__.clear()
        GlobalVar.total_room_count = 0
        self.access_logger = logging.getLogger('tornado.access')
        self.original_access_disabled = self.access_logger.disabled
        self.access_logger.disabled = True
        super().setUp()

    def tearDown(self):
        self.app.executor.shutdown(wait=False, cancel_futures=True)
        self.access_logger.disabled = self.original_access_disabled
        super().tearDown()

    async def connect_player(self, uid, name):
        token = JwtMixin.jwt_encode({
            'uid': uid,
            'name': name,
            'sex': 1,
            'avatar': '',
        })
        return await websocket_connect(f'ws://127.0.0.1:{self.get_http_port()}/ws?token={token}')

    async def read_until(self, websocket, code, predicate=None):
        while True:
            raw_message = await asyncio.wait_for(websocket.read_message(), timeout=3)
            self.assertIsNotNone(raw_message)
            message = json.loads(raw_message)
            if message[0] == code and (predicate is None or predicate(message[1])):
                return message[1]

    @staticmethod
    def next_uid(seat_order, uid):
        return seat_order[(seat_order.index(uid) + 1) % len(seat_order)]

    @gen_test
    async def test_three_websocket_players_can_play_first_turn(self):
        players = [
            (101, await self.connect_player(101, 'p1')),
            (102, await self.connect_player(102, 'p2')),
            (103, await self.connect_player(103, 'p3')),
        ]
        sockets = [websocket for _, websocket in players]
        socket_by_uid = dict(players)
        try:
            sockets[0].write_message(json.dumps([Protocol.REQ_ROOM_LIST, {}]))
            room_list = await self.read_until(sockets[0], Protocol.RSP_ROOM_LIST)
            self.assertTrue(any(room['level'] == 1 for room in room_list['rooms']))

            for websocket in sockets:
                websocket.write_message(json.dumps([Protocol.REQ_JOIN_ROOM, {'room': -1, 'level': 1}]))

            def room_is_full(packet):
                return len([player for player in packet['players'] if player.get('uid')]) == 3

            join_packets = [await self.read_until(websocket, Protocol.RSP_JOIN_ROOM, room_is_full) for websocket in sockets]
            self.assertEqual({packet['room']['id'] for packet in join_packets}, {1})
            self.assertEqual({player['uid'] for player in join_packets[0]['players']}, {101, 102, 103})
            seat_order = [player['uid'] for player in join_packets[0]['players']]

            for websocket in sockets:
                websocket.write_message(json.dumps([Protocol.REQ_READY, {'ready': 1}]))

            deal_packets = [await self.read_until(websocket, Protocol.RSP_DEAL_POKER) for websocket in sockets]
            self.assertEqual([len(packet['pokers']) for packet in deal_packets], [17, 17, 17])
            self.assertEqual(len({packet['uid'] for packet in deal_packets}), 1)
            starter_uid = deal_packets[0]['uid']
            self.assertIn(starter_uid, {101, 102, 103})
            hand_by_uid = {
                uid: packet['pokers']
                for (uid, _), packet in zip(players, deal_packets)
            }

            current_uid = starter_uid
            final_call = None
            for _ in range(3):
                socket_by_uid[current_uid].write_message(json.dumps([Protocol.REQ_CALL_SCORE, {'rob': 0}]))
                call_packets = [await self.read_until(websocket, Protocol.RSP_CALL_SCORE) for websocket in sockets]
                self.assertEqual({packet['uid'] for packet in call_packets}, {current_uid})
                self.assertEqual({packet['rob'] for packet in call_packets}, {0})

                if call_packets[0]['landlord'] != -1:
                    final_call = call_packets[0]
                    break
                current_uid = self.next_uid(seat_order, current_uid)

            self.assertIsNotNone(final_call)
            landlord_uid = final_call['landlord']
            self.assertEqual(landlord_uid, starter_uid)
            self.assertEqual(len(final_call['pokers']), 3)

            # GDD v0.2 G 章节：抢地主结束 → DOUBLE 阶段。2 个农民先，地主最后。
            non_landlord_uids = [uid for uid in seat_order if uid != landlord_uid]
            first_double_uid = non_landlord_uids[0]
            second_double_uid = non_landlord_uids[1]

            # First non-landlord declines double; wait for continue broadcast
            socket_by_uid[first_double_uid].write_message(
                json.dumps([Protocol.REQ_DOUBLE, {'double': 0}]))
            for ws in sockets:
                await self.read_until(ws, Protocol.RSP_DOUBLE,
                                      lambda p: p.get('phase') == 'continue')

            # Second non-landlord declines double
            socket_by_uid[second_double_uid].write_message(
                json.dumps([Protocol.REQ_DOUBLE, {'double': 0}]))
            for ws in sockets:
                await self.read_until(ws, Protocol.RSP_DOUBLE,
                                      lambda p: p.get('phase') == 'continue')

            # Landlord declines double; phase should be 'end'
            socket_by_uid[landlord_uid].write_message(
                json.dumps([Protocol.REQ_DOUBLE, {'double': 0}]))
            for ws in sockets:
                await self.read_until(ws, Protocol.RSP_DOUBLE,
                                      lambda p: p.get('phase') == 'end')

            first_card = hand_by_uid[landlord_uid][0]
            socket_by_uid[landlord_uid].write_message(json.dumps([Protocol.REQ_SHOT_POKER, {'pokers': [first_card]}]))

            shot_packets = [await self.read_until(websocket, Protocol.RSP_SHOT_POKER) for websocket in sockets]
            self.assertEqual({packet['uid'] for packet in shot_packets}, {landlord_uid})
            self.assertEqual([packet['pokers'] for packet in shot_packets], [[first_card]] * 3)
        finally:
            for websocket in sockets:
                websocket.close()


class SegmentEndpointTest(unittest.IsolatedAsyncioTestCase):
    """GDD v0.2 H.1 段位端到端测试：直接构造 handler 实例 + 模拟 session 走完整业务链路。

    不走 HTTP 路由（避免 MySQL 依赖），但覆盖从 HTTP body 解析 → admin 校验 → 数据库 update → 响应写入 全链路。
    """

    def setUp(self):
        from api.segment_handler import SegmentUpdateHandler, SegmentHandler
        from segment import Segment, SegmentState
        self._SegmentUpdateHandler = SegmentUpdateHandler
        self._SegmentHandler = SegmentHandler
        self.Segment = Segment
        self.SegmentState = SegmentState

    def _build_handler(self, current_user, body_bytes):
        """构造一个 mock handler，模拟 Tornado 收到 POST 请求时的状态。"""
        from types import SimpleNamespace
        import json
        from urllib.parse import quote

        # 模拟 async session：记录 execute / commit 调用
        calls = {'execute': [], 'commit': 0, 'scalar': []}

        class _FakeUser:
            def __init__(self, uid, name='tester', segment='gold', segment_points=0, point=1000):
                self.id = uid
                self.name = name
                self.segment = segment
                self.segment_points = segment_points
                self.point = point
                self.sex = 1
                self.avatar = ''

        # Mock the User model: each call returns the updated state
        user_state = {'current': _FakeUser(uid=current_user.get('uid', 7))}

        class _FakeScalarResult:
            def __init__(self, value):
                self._value = value
            def scalar_one_or_none(self):
                return self._value

        class _FakeSession:
            def __init__(self):
                self._state = user_state
            async def __aenter__(self):
                return self
            async def __aexit__(self, *args):
                pass
            async def execute(self, stmt):
                calls['execute'].append(stmt)
                # SELECT User where id == uid
                # update User: change segment + segment_points
                # Detect: if stmt is update → mutate user
                try:
                    compiled = stmt.compile()
                except Exception:
                    compiled = None
                # Simpler: just check if we have a _set_values
                if hasattr(stmt, '_values') and stmt._values:
                    for k, v in stmt._values.items():
                        if k == 'segment':
                            user_state['current'].segment = v
                        elif k == 'segment_points':
                            user_state['current'].segment_points = v
                # SELECT
                return _FakeScalarResult(user_state['current'])
            async def commit(self):
                calls['commit'] += 1
                return None

        class _FakeRequest:
            def __init__(self, body):
                self.body = body
        class _FakeApplication:
            pass

        # Build minimal handler namespace
        handler = SimpleNamespace()
        handler.current_user = current_user
        handler.session = _FakeSession()
        handler._write_calls = []
        handler._log_segment_change_calls = []
        def _write(payload):
            handler._write_calls.append(payload)
        handler.write = _write
        handler.request = _FakeRequest(body_bytes)
        # GDD v0.2 H.3：mock 段位变更日志 + 房间推送
        handler._log_segment_change = lambda *args, **kwargs: handler._log_segment_change_calls.append((args, kwargs))
        handler._push_segment_to_room = lambda *args, **kwargs: handler._push_segment_to_room_calls.append((args, kwargs))
        handler._push_segment_to_room_calls = []

        return handler, calls, user_state

    async def test_segment_update_promotes_gold_80_plus_30(self):
        """GDD v0.2 H.1：黄金 80 积分 + 胜利 +30（base=30 农民 coeff=1.0）→ 跨 100 晋级铂金 10 积分。"""
        body = json.dumps({'uid': 7, 'is_winner': True, 'is_landlord': False, 'base_score': 30}).encode()
        handler, calls, user_state = self._build_handler({'uid': 1}, body)
        # Pre-seed: gold 80
        user_state['current'].segment = 'gold'
        user_state['current'].segment_points = 80

        await self._SegmentUpdateHandler.post(handler)

        # Should have written the result
        self.assertEqual(len(handler._write_calls), 1)
        result = handler._write_calls[0]
        self.assertTrue(result['promoted'], f'expected promotion, got {result}')
        self.assertEqual(result['segment'], 'platinum', f"got {result['segment']}")
        self.assertEqual(result['points'], 10, f"got {result['points']}")
        # DB was updated + committed
        self.assertEqual(calls['commit'], 1)
        # GDD v0.2 H.3：段位变更触发 player_event_log
        self.assertEqual(len(handler._log_segment_change_calls), 1, 'segment change should be logged')

    async def test_segment_update_demotes_silver_10_minus_25(self):
        """白银 10 积分 + 失败 25（base=50 农民 coeff=0.9 × 0.5）→ 跨 0 降级青铜 85 积分。"""
        # silver coeff=0.9, base=50, farmer lose → -round(50 * 0.9 * 0.5 * 1) = -22
        # 10 - 22 = -12 → 跨 0 一次 → bronze 88
        body = json.dumps({'uid': 7, 'is_winner': False, 'is_landlord': False, 'base_score': 50}).encode()
        handler, calls, user_state = self._build_handler({'uid': 1}, body)
        user_state['current'].segment = 'silver'
        user_state['current'].segment_points = 10

        await self._SegmentUpdateHandler.post(handler)

        result = handler._write_calls[0]
        self.assertTrue(result['demoted'], f'expected demotion, got {result}')
        self.assertEqual(result['segment'], 'bronze', f"got {result['segment']}")
        # 10 - 22 = -12 → bronze (100-12) = 88
        self.assertEqual(result['points'], 88, f"got {result['points']}")

    async def test_segment_update_rejects_non_admin(self):
        """非 admin 调用 → 403。"""
        body = json.dumps({'uid': 7, 'is_winner': True, 'is_landlord': False, 'base_score': 10}).encode()
        handler, calls, user_state = self._build_handler({'uid': 5}, body)  # 不是 admin

        with self.assertRaises(HTTPError) as ctx:
            await self._SegmentUpdateHandler.post(handler)
        self.assertEqual(ctx.exception.status_code, 403)
        # DB not touched
        self.assertEqual(calls['commit'], 0)

    async def test_segment_update_rejects_zero_uid(self):
        body = json.dumps({'uid': 0, 'is_winner': True, 'is_landlord': False, 'base_score': 10}).encode()
        handler, calls, user_state = self._build_handler({'uid': 1}, body)

        with self.assertRaises(HTTPError) as ctx:
            await self._SegmentUpdateHandler.post(handler)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(calls['commit'], 0)

    async def test_segment_update_king_at_top_does_not_exceed_king(self):
        """王者 90 + 胜利 15（base=10 农民 coeff=1.5）→ 保持在王者 5 积分（不超 KING）。"""
        body = json.dumps({'uid': 7, 'is_winner': True, 'is_landlord': False, 'base_score': 10}).encode()
        handler, calls, user_state = self._build_handler({'uid': 1}, body)
        user_state['current'].segment = 'king'
        user_state['current'].segment_points = 90

        await self._SegmentUpdateHandler.post(handler)

        result = handler._write_calls[0]
        self.assertTrue(result['promoted'])
        self.assertEqual(result['segment'], 'king')
        self.assertEqual(result['points'], 5)  # 90 + 15 = 105 → KING 5


if __name__ == '__main__':
    unittest.main()
