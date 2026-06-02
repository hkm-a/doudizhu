import asyncio
import unittest
from unittest.mock import Mock, patch, AsyncMock, MagicMock

from api.game.player import Player, State
from api.game.protocol import Protocol as Pt


def run(coro):
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)


class SocketStub:
    def __init__(self):
        self.messages = []
        self.allow_robot = True

    def write_message(self, packet):
        self.messages.append(packet)


class RoomStub:
    def __init__(self, room_id=1):
        self.room_id = room_id
        self.players = []
        self.whose_turn = None
        self.turn_player = None
        self.last_shot_poker = None
        self.last_shot_seat = None
        self.multiple = 15
        self.pokers = []
        self.messages = []
        self.broadcast_calls = []
        self.sync_calls = 0
        self.personality = MagicMock()
        self.personality.value = 'balanced'
        self.landlord = None
        self._multiple_details = {}

    def broadcast(self, packet):
        self.broadcast_calls.append(packet)

    def sync_room(self):
        self.sync_calls += 1

    def on_leave(self, player):
        pass

    def is_ready(self):
        return True

    def on_deal_poker(self):
        return True

    def on_rob(self, player):
        return True

    def start_double_phase(self):
        pass

    def on_double(self, player, choice):
        return True

    def on_shot(self, seat, pokers):
        return ''

    def go_next_turn(self):
        pass

    def on_game_over(self, player):
        pass

    async def save_player_points(self):
        pass

    async def save_shot_round(self):
        pass

    def on_join(self, player):
        return self._on_join(player)

    def _on_join(self, player):
        return True

    def is_full(self):
        return False


class PlayerInitTest(unittest.TestCase):
    def test_init_sets_defaults(self):
        p = Player(1, 'Alice', sex=2, avatar='a.png', point=500)
        self.assertEqual(p.uid, 1)
        self.assertEqual(p.name, 'Alice')
        self.assertEqual(p.sex, 2)
        self.assertEqual(p.avatar, 'a.png')
        self.assertEqual(p.point, 500)
        self.assertIsNone(p.room)
        self.assertEqual(p.state, State.INIT)
        self.assertIsNone(p.socket)

    def test_restart_resets_state_to_waiting(self):
        p = Player(1, 'x')
        p.state = State.PLAYING
        p.restart()
        self.assertEqual(p.state, State.WAITING)


class PlayerSyncDataTest(unittest.TestCase):
    def test_sync_data_real_includes_pokers(self):
        p = Player(1, 'x')
        p.push_pokers([3, 4, 5])
        data = p.sync_data(real=True)
        self.assertEqual(data['pokers'], [3, 4, 5])

    def test_sync_data_not_real_replaces_pokers(self):
        p = Player(1, 'x')
        p.push_pokers([3, 4, 5])
        data = p.sync_data(real=False)
        self.assertEqual(data['pokers'], [0, 0, 0])

    def test_sync_data_includes_basic_fields(self):
        p = Player(1, 'x', point=500)
        data = p.sync_data()
        self.assertEqual(data['uid'], 1)
        self.assertEqual(data['name'], 'x')
        self.assertEqual(data['point'], 500)


class PlayerPushPokersTest(unittest.TestCase):
    def test_push_pokers_sorts_by_game_order(self):
        p = Player(1, 'x')
        p.push_pokers([2, 3, 1])
        self.assertEqual(p.hand_pokers, [3, 1, 2])


class PlayerOnMessageTest(unittest.TestCase):
    def setUp(self):
        self.p = Player(1, 'x')
        self.p.room = RoomStub()
        self.p.room.players = [self.p, Player(2, 'y'), Player(3, 'z')]

    def test_left_player_handles_leave(self):
        self.p.set_left()
        with patch.object(self.p, 'handle_leave', return_value=True) as mock:
            run(self.p.on_message(Pt.REQ_JOIN_ROOM, {'room': -1}))
            mock.assert_called_once()

    def test_left_player_proceeds_if_handle_leave_false(self):
        self.p.set_left()
        with patch.object(self.p, 'handle_leave', return_value=False):
            run(self.p.on_message(Pt.REQ_JOIN_ROOM, {'room': -1}))

    def test_leave_room_code_calls_leave_room(self):
        with patch.object(self.p, 'leave_room', return_value=True) as mock:
            run(self.p.on_message(Pt.REQ_LEAVE_ROOM, {}))
            mock.assert_called_once()

    def test_chat_code_calls_handle_chat(self):
        with patch.object(self.p, 'handle_chat') as mock:
            run(self.p.on_message(Pt.REQ_CHAT, {'message': 'hello'}))
            mock.assert_called_once_with({'message': 'hello'})

    def test_init_state_dispatches_to_handle_init(self):
        self.p.state = State.INIT
        with patch.object(self.p, 'handle_init') as mock:
            run(self.p.on_message(Pt.REQ_JOIN_ROOM, {}))
            mock.assert_called_once_with(Pt.REQ_JOIN_ROOM, {})

    def test_waiting_state_dispatches_to_handle_waiting(self):
        self.p.state = State.WAITING
        with patch.object(self.p, 'handle_waiting') as mock:
            run(self.p.on_message(Pt.REQ_READY, {'ready': 1}))
            mock.assert_called_once_with(Pt.REQ_READY, {'ready': 1})

    def test_call_score_state_dispatches_to_handle_call_score(self):
        self.p.state = State.CALL_SCORE
        with patch.object(self.p, 'handle_call_score', new_callable=AsyncMock) as mock:
            run(self.p.on_message(Pt.REQ_CALL_SCORE, {'rob': 0}))
            mock.assert_called_once_with(Pt.REQ_CALL_SCORE, {'rob': 0})

    def test_double_state_dispatches_to_handle_double(self):
        self.p.state = State.DOUBLE
        with patch.object(self.p, 'handle_double', new_callable=AsyncMock) as mock:
            run(self.p.on_message(Pt.REQ_DOUBLE, {'double': 0}))
            mock.assert_called_once_with(Pt.REQ_DOUBLE, {'double': 0})

    def test_playing_state_dispatches_to_handle_playing(self):
        self.p.state = State.PLAYING
        with patch.object(self.p, 'handle_playing', new_callable=AsyncMock) as mock:
            run(self.p.on_message(Pt.REQ_SHOT_POKER, {'pokers': [3]}))
            mock.assert_called_once_with(Pt.REQ_SHOT_POKER, {'pokers': [3]})

    def test_game_over_state_dispatches_to_handle_game_over(self):
        self.p.state = State.GAME_OVER
        with patch.object(self.p, 'handle_game_over') as mock:
            run(self.p.on_message(Pt.REQ_SHOT_POKER, {}))
            mock.assert_called_once_with(Pt.REQ_SHOT_POKER, {})

    def test_unknown_state_writes_error(self):
        self.p.state = State.INIT
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.on_message(9999, {}))
            mock.assert_called_once()


class PlayerHandleChatTest(unittest.TestCase):
    def test_chat_broadcasts_message(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.handle_chat({'message': 'hello'})
        self.assertEqual(p.room.broadcast_calls[0][0], Pt.RSP_CHAT)

    def test_chat_no_room_writes_error(self):
        p = Player(1, 'x')
        p.room = None
        with patch.object(p, 'write_error') as mock:
            p.handle_chat({'message': 'hello'})
            mock.assert_called_once()

    def test_chat_non_string_writes_error(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        with patch.object(p, 'write_error') as mock:
            p.handle_chat({'message': 123})
            mock.assert_called_once()

    def test_chat_empty_writes_error(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        with patch.object(p, 'write_error') as mock:
            p.handle_chat({'message': '   '})
            mock.assert_called_once()

    def test_chat_too_long_writes_error(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        with patch.object(p, 'write_error') as mock:
            p.handle_chat({'message': 'a' * 25})
            mock.assert_called_once()


class PlayerLeaveRoomTest(unittest.TestCase):
    def test_leave_room_waits_for_correct_state(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.state = State.PLAYING
        result = p.leave_room()
        self.assertFalse(result)

    def test_leave_room_in_waiting_state(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.state = State.WAITING
        result = p.leave_room()
        self.assertTrue(result)
        self.assertIsNone(p.room)
        self.assertEqual(p.state, State.INIT)

    def test_leave_room_in_init_state(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.state = State.INIT
        result = p.leave_room()
        self.assertTrue(result)

    def test_leave_room_in_game_over_state(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.state = State.GAME_OVER
        result = p.leave_room()
        self.assertTrue(result)

    def test_leave_room_no_room(self):
        p = Player(1, 'x')
        p.state = State.INIT
        p.room = None
        result = p.leave_room()
        self.assertFalse(result)


class PlayerHandleTimeoutTest(unittest.TestCase):
    def setUp(self):
        self.p = Player(1, 'x')
        self.p.room = RoomStub()
        self.p.room.landlord_seat = 0
        self.p.push_pokers([3, 4, 5])

    def test_timeout_call_score_rob_0(self):
        self.p.state = State.CALL_SCORE
        with patch.object(self.p, 'handle_call_score', new_callable=AsyncMock) as mock:
            run(self.p.handle_timeout())
            mock.assert_called_once_with(Pt.REQ_CALL_SCORE, {'rob': 0})

    def test_timeout_double_0(self):
        self.p.state = State.DOUBLE
        with patch.object(self.p, 'handle_double', new_callable=AsyncMock) as mock:
            run(self.p.handle_timeout())
            mock.assert_called_once_with(Pt.REQ_DOUBLE, {'double': 0})

    def test_timeout_playing_no_last_shot(self):
        self.p.state = State.PLAYING
        with patch.object(self.p, 'handle_playing', new_callable=AsyncMock) as mock:
            run(self.p.handle_timeout())
            mock.assert_called_once()

    def test_timeout_playing_passes_if_already_shot(self):
        self.p.state = State.PLAYING
        self.p.room.last_shot_seat = 1
        self.p.room.last_shot_poker = [3]
        with patch.object(self.p, 'handle_playing', new_callable=AsyncMock) as mock:
            run(self.p.handle_timeout())
            mock.assert_called_once_with(Pt.REQ_SHOT_POKER, {'pokers': []})

    def test_timeout_return_false_other_state(self):
        self.p.state = State.GAME_OVER
        result = run(self.p.handle_timeout())
        self.assertFalse(result)

    def test_timeout_skipped_if_room_missing(self):
        self.p.state = State.CALL_SCORE
        self.p.room = None
        result = run(self.p.handle_timeout())
        self.assertFalse(result)


class PlayerHandleLeaveTest(unittest.TestCase):
    def test_handle_leave_rejoin_same_room(self):
        p = Player(1, 'x')
        p.set_left()
        p.room = RoomStub()
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=p.room):
            result = p.handle_leave(Pt.REQ_JOIN_ROOM, {'room': p.room.room_id, 'level': 1})
            self.assertTrue(result)

    def test_handle_leave_room_not_found_writes_error(self):
        p = Player(1, 'x')
        p.set_left()
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=None):
            with patch.object(p, 'write_error') as mock:
                p.handle_leave(Pt.REQ_JOIN_ROOM, {'room': 999, 'level': 1})
                mock.assert_called_once()

    def test_handle_leave_room_not_joined_writes_error(self):
        p = Player(1, 'x')
        p.set_left()
        other_room = RoomStub(room_id=2)
        p.room = RoomStub(room_id=1)
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=other_room):
            with patch.object(p, 'write_error') as mock:
                p.handle_leave(Pt.REQ_JOIN_ROOM, {'room': 2, 'level': 1})
                mock.assert_called_once()

    def test_handle_leave_wrong_code_returns_true(self):
        p = Player(1, 'x')
        p.set_left()
        result = p.handle_leave(9999, {})
        self.assertTrue(result)


class PlayerHandleInitTest(unittest.TestCase):
    def test_join_room_success(self):
        p = Player(1, 'x', point=5000)
        room = RoomStub()
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=room):
            p.handle_init(Pt.REQ_JOIN_ROOM, {'room': -1, 'level': 1})
            self.assertEqual(p.state, State.WAITING)

    def test_join_room_insufficient_points(self):
        p = Player(1, 'x', point=0)
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=RoomStub()):
            with patch.object(p, 'write_error') as mock:
                p.handle_init(Pt.REQ_JOIN_ROOM, {'room': -1, 'level': 3})
                mock.assert_called_once()

    def test_join_room_not_found(self):
        p = Player(1, 'x')
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=None):
            with patch.object(p, 'write_error') as mock:
                p.handle_init(Pt.REQ_JOIN_ROOM, {'room': 999, 'level': 1})
                mock.assert_called_once()

    def test_wrong_code_writes_error(self):
        p = Player(1, 'x')
        with patch.object(p, 'write_error') as mock:
            p.handle_init(9999, {})
            mock.assert_called_once()

    def test_invalid_personality_defaults_to_balanced(self):
        p = Player(1, 'x', point=5000)
        room = RoomStub()
        with patch('api.game.globalvar.GlobalVar.find_room', return_value=room):
            p.handle_init(Pt.REQ_JOIN_ROOM, {'room': -1, 'level': 1, 'personality': 'invalid'})
            self.assertEqual(p.state, State.WAITING)


class PlayerHandleWaitingTest(unittest.TestCase):
    def test_ready_valid(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.handle_waiting(Pt.REQ_READY, {'ready': 1})
        self.assertEqual(p.ready, 1)

    def test_ready_invalid_value(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        with patch.object(p, 'write_error') as mock:
            p.handle_waiting(Pt.REQ_READY, {'ready': 2})
            mock.assert_called_once()

    def test_wrong_code_writes_error(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        with patch.object(p, 'write_error') as mock:
            p.handle_waiting(9999, {})
            mock.assert_called_once()


class PlayerHandleCallScoreTest(unittest.TestCase):
    def test_call_score_success(self):
        p = Player(1, 'x')
        p.seat = 0
        p.room = RoomStub()
        p.room.whose_turn = 0
        p.room.turn_player = p
        p.room.landlord = p
        run(p.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 1}))
        self.assertEqual(p.rob, 1)

    def test_call_score_not_turn_writes_error(self):
        p = Player(1, 'x')
        p.seat = 0
        p.room = RoomStub()
        p.room.whose_turn = 1
        with patch.object(p, 'write_error') as mock:
            run(p.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 1}))
            mock.assert_called_once()

    def test_call_score_invalid_rob(self):
        p = Player(1, 'x')
        p.seat = 0
        p.room = RoomStub()
        p.room.whose_turn = 0
        p.room.turn_player = p
        with patch.object(p, 'write_error') as mock:
            run(p.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 2}))
            mock.assert_called_once()

    def test_call_score_wrong_code(self):
        p = Player(1, 'x')
        p.seat = 0
        p.room = RoomStub()
        p.room.whose_turn = 0
        p.room.turn_player = p
        with patch.object(p, 'write_error') as mock:
            run(p.handle_call_score(9999, {'rob': 1}))
            mock.assert_called_once()


class PlayerHandleDoubleTest(unittest.TestCase):
    def setUp(self):
        self.p = Player(1, 'x')
        self.p.seat = 0
        self.p.room = RoomStub()
        self.p.room.double_turn_seat = 0
        self.p.room.landlord_seat = 0
        self.p.room.turn_player = self.p
        self.p.room.timer = MagicMock()

    def test_double_success(self):
        run(self.p.handle_double(Pt.REQ_DOUBLE, {'double': 1}))
        self.assertEqual(self.p.room.broadcast_calls[0][0], Pt.RSP_DOUBLE)

    def test_double_no_room(self):
        self.p.room = None
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_double(Pt.REQ_DOUBLE, {'double': 1}))
            mock.assert_called_once()

    def test_double_wrong_turn(self):
        self.p.room.double_turn_seat = 1
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_double(Pt.REQ_DOUBLE, {'double': 1}))
            mock.assert_called_once()

    def test_double_wrong_code(self):
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_double(9999, {'double': 1}))
            mock.assert_called_once()

    def test_double_invalid_choice(self):
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_double(Pt.REQ_DOUBLE, {'double': 2}))
            mock.assert_called_once()


class PlayerHandlePlayingTest(unittest.TestCase):
    def setUp(self):
        self.p = Player(1, 'x')
        self.p.seat = 0
        self.p.room = RoomStub()
        self.p.room.whose_turn = 0
        self.p.room.turn_player = self.p
        self.p.push_pokers([3, 4, 5])

    def test_shot_success(self):
        run(self.p.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [3]}))
        self.assertEqual(self.p.room.broadcast_calls[0][0], Pt.RSP_SHOT_POKER)

    def test_shot_invalid_pokers(self):
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': 'not_list'}))
            mock.assert_called_once()

    def test_shot_poker_not_in_hand(self):
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [55]}))
            mock.assert_called_once()

    def test_shot_wrong_code(self):
        with patch.object(self.p, 'write_error') as mock:
            run(self.p.handle_playing(9999, {'pokers': [3]}))
            mock.assert_called_once()

    def test_shot_not_turn(self):
        p2 = Player(2, 'y')
        p2.seat = 1
        p2.room = self.p.room
        self.p.room.whose_turn = 0
        self.p.room.turn_player = self.p
        with patch.object(p2, 'write_error') as mock:
            run(p2.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': []}))
            mock.assert_called_once()


class PlayerStaticMethodsTest(unittest.TestCase):
    def test_normalize_point_int(self):
        self.assertEqual(Player.normalize_point(50), 50)

    def test_normalize_point_int_string(self):
        self.assertEqual(Player.normalize_point('50'), 50)

    def test_normalize_point_invalid_returns_1000(self):
        self.assertEqual(Player.normalize_point('abc'), 1000)

    def test_is_valid_poker_list_valid(self):
        self.assertTrue(Player._is_valid_poker_list([1, 2, 54]))

    def test_is_valid_poker_list_wrong_type(self):
        self.assertFalse(Player._is_valid_poker_list('not_list'))

    def test_is_valid_poker_list_out_of_range(self):
        self.assertFalse(Player._is_valid_poker_list([0]))

    def test_is_valid_poker_list_float(self):
        self.assertFalse(Player._is_valid_poker_list([1.0]))

    def test_is_protocol_bit_valid(self):
        self.assertTrue(Player._is_protocol_bit(1))
        self.assertTrue(Player._is_protocol_bit(0))

    def test_is_protocol_bit_invalid(self):
        self.assertFalse(Player._is_protocol_bit(2))
        self.assertFalse(Player._is_protocol_bit(True))
        self.assertFalse(Player._is_protocol_bit('1'))


class PlayerWriteMessageTest(unittest.TestCase):
    def test_write_message_with_socket(self):
        p = Player(1, 'x')
        sock = SocketStub()
        p.socket = sock
        result = p.write_message([1, 2, 3])
        self.assertTrue(result)
        self.assertEqual(sock.messages, [[1, 2, 3]])

    def test_write_message_no_socket(self):
        p = Player(1, 'x')
        p.socket = None
        result = p.write_message([1, 2, 3])
        self.assertFalse(result)


class PlayerWriteErrorTest(unittest.TestCase):
    def test_write_error_with_socket(self):
        p = Player(1, 'x')
        sock = SocketStub()
        p.socket = sock
        p.write_error('test error')
        self.assertEqual(sock.messages, [[Pt.ERROR, {'reason': 'test error'}]])

    def test_write_error_no_socket_does_not_crash(self):
        p = Player(1, 'x')
        p.socket = None
        p.write_error('test error')


class PlayerReadyTest(unittest.TestCase):
    def test_ready_getter(self):
        p = Player(1, 'x')
        self.assertEqual(p.ready, 0)

    def test_ready_setter_with_room(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.ready = 1
        self.assertEqual(p._ready, 1)
        self.assertEqual(p.room.broadcast_calls[0][0], Pt.RSP_READY)

    def test_ready_setter_no_room(self):
        p = Player(1, 'x')
        p.ready = 1
        self.assertEqual(p._ready, 1)


class PlayerTimeoutPropertyTest(unittest.TestCase):
    def test_timeout_left_returns_5(self):
        p = Player(1, 'x')
        p.set_left()
        self.assertEqual(p.timeout, 5)

    def test_timeout_normal_returns_20(self):
        p = Player(1, 'x')
        self.assertEqual(p.timeout, 20)


class PlayerSetLeftTest(unittest.TestCase):
    def test_set_left_broadcasts_if_room(self):
        p = Player(1, 'x')
        p.room = RoomStub()
        p.set_left()
        self.assertEqual(p._leave, 1)
        self.assertEqual(p.room.broadcast_calls[0][0], Pt.RSP_LEAVE_ROOM)


class PlayerAllowRobotTest(unittest.TestCase):
    def test_allow_robot_no_socket(self):
        p = Player(1, 'x')
        self.assertFalse(p.allow_robot)

    def test_allow_robot_with_socket(self):
        p = Player(1, 'x')
        sock = SocketStub()
        sock.allow_robot = True
        p.socket = sock
        self.assertTrue(p.allow_robot)

    def test_allow_robot_socket_disallows(self):
        p = Player(1, 'x')
        sock = SocketStub()
        sock.allow_robot = False
        p.socket = sock
        self.assertFalse(p.allow_robot)


class PlayerJoinRoomTest(unittest.TestCase):
    def test_join_room_full_writes_error(self):
        p = Player(1, 'x')
        room = RoomStub()
        room.is_full = lambda: True
        with patch.object(p, 'write_error') as mock:
            result = p.join_room(room)
            self.assertFalse(result)
            mock.assert_called_once()

    def test_join_room_success(self):
        p = Player(1, 'x')
        room = RoomStub()
        result = p.join_room(room)
        self.assertTrue(result)


class PlayerOnTimeoutTest(unittest.TestCase):
    @patch('tornado.ioloop.IOLoop.current')
    def test_on_timeout_adds_callback(self, mock_ioloop):
        p = Player(1, 'x')
        p.on_timeout()
        mock_ioloop.return_value.add_callback.assert_called_once_with(p.handle_timeout)


class PlayerToServerTest(unittest.TestCase):
    @patch('tornado.ioloop.IOLoop.current')
    def test_to_server_adds_callback(self, mock_ioloop):
        p = Player(1, 'x')
        p.to_server(123, {'key': 'val'})
        mock_ioloop.return_value.add_callback.assert_called_once_with(p.on_message, 123, {'key': 'val'})


class PlayerGameOverTest(unittest.TestCase):
    def test_handle_game_over_writes_error(self):
        p = Player(1, 'x')
        with patch.object(p, 'write_error') as mock:
            p.handle_game_over(999, {})
            mock.assert_called_once()


class PlayerOnDisconnectTest(unittest.TestCase):
    def test_on_disconnect_sets_left(self):
        p = Player(1, 'x')
        p.on_disconnect()
        self.assertTrue(p.is_left())


class PlayerChangeStateTest(unittest.TestCase):
    def test_change_state_updates_all_players(self):
        p = Player(1, 'x')
        p2 = Player(2, 'y')
        p3 = Player(3, 'z')
        p.room = RoomStub()
        p.room.players = [p, p2, p3]
        p.change_state(State.PLAYING)
        self.assertEqual(p.state, State.PLAYING)
        self.assertEqual(p2.state, State.PLAYING)
        self.assertEqual(p3.state, State.PLAYING)


if __name__ == '__main__':
    unittest.main()
