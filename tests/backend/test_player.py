import unittest
from unittest.mock import patch

from api.game.player import Player, State
from api.game.protocol import Protocol as Pt


class SocketStub:
    allow_robot = False

    def __init__(self):
        self.messages = []

    def write_message(self, packet):
        self.messages.append(packet)


class PlayerBalanceTest(unittest.TestCase):
    def test_player_uses_persisted_account_point(self):
        self.assertEqual(Player(1, 'saved', point=1280).point, 1280)
        self.assertEqual(Player(2, 'legacy', point='bad').point, 1000)


class RoomStub:
    def __init__(self, on_shot_error=''):
        self.whose_turn = 0
        self.multiple = 15
        self.on_shot_error = on_shot_error
        self.last_shot_seat = 0
        self.last_shot_poker = []
        self.shots = []
        self.broadcasts = []
        self.next_turns = 0
        self.game_over_winner = None
        self.saved_rounds = 0
        self.saved_points = 0
        self.players = []

    def on_shot(self, seat, pokers):
        self.shots.append((seat, list(pokers)))
        return self.on_shot_error

    def broadcast(self, packet):
        self.broadcasts.append(packet)

    def go_next_turn(self):
        self.next_turns += 1

    @property
    def turn_player(self):
        if 0 <= self.whose_turn < len(self.players):
            return self.players[self.whose_turn]
        return None

    def on_game_over(self, winner):
        self.game_over_winner = winner

    async def save_shot_round(self):
        self.saved_rounds += 1

    async def save_player_points(self):
        self.saved_points += 1


class WaitingRoomStub:
    def __init__(self, is_ready=False, deal_result=True):
        self.players = []
        self.broadcasts = []
        self.deals = 0
        self._is_ready = is_ready
        self.deal_result = deal_result

    def broadcast(self, packet):
        self.broadcasts.append(packet)

    def is_ready(self):
        return self._is_ready

    def on_deal_poker(self):
        self.deals += 1
        return self.deal_result


class LeaveRoomStub:
    def __init__(self, room_id=1):
        self.room_id = room_id
        self.synced = 0
        self.left_players = []
        self.broadcasts = []

    def sync_room(self):
        self.synced += 1

    def on_leave(self, player):
        self.left_players.append(player)

    def broadcast(self, packet):
        self.broadcasts.append(packet)


class CallScoreRoomStub:
    def __init__(self, is_end=False, landlord=None):
        self.whose_turn = 0
        self.multiple = 30
        self.pokers = [53, 54, 3]
        self.players = []
        self.broadcasts = []
        self.on_rob_calls = []
        self.start_double_phase_calls = []
        self._is_end = is_end
        self._landlord = landlord

    def on_rob(self, player):
        self.on_rob_calls.append(player)
        return self._is_end

    def start_double_phase(self):
        # Stubbed for GDD v0.2 G 章节 integration; real implementation moves
        # the room into State.DOUBLE; tests that exercise this path will assert
        # start_double_phase_calls.
        self.start_double_phase_calls.append(True)

    @property
    def turn_player(self):
        if 0 <= self.whose_turn < len(self.players):
            return self.players[self.whose_turn]
        return None

    # GDD v0.2 G 章节：加倍阶段 stub 配套
    def on_double(self, target, choice):
        return False  # 默认 not end；测试可覆盖

    def _log_player_double(self, target, choice):
        pass

    @property
    def landlord(self):
        return self._landlord

    def broadcast(self, packet):
        self.broadcasts.append(packet)


class DoubleRoomStub:
    """GDD v0.2 G 章节：加倍阶段专用 stub，支持 on_double / double_turn_seat / timer 等。"""
    def __init__(self, double_turn_seat=0, on_double_returns=False):
        self.double_turn_seat = double_turn_seat
        self.whose_turn = 0
        self.landlord_seat = 0
        self.broadcasts = []
        self.on_double_calls = []
        self.timer_started = []
        self._on_double_returns = on_double_returns
        self._multiple_details = {'landlord': 1, 'farmer': 1}
        self._log_double_calls = []
        # 玩家清单（seat 0/1/2）
        self.players = []
        self.turn_player_cache = None

    def on_double(self, target, choice):
        self.on_double_calls.append((target, choice))
        return self._on_double_returns

    def _log_player_double(self, target, choice):
        self._log_double_calls.append((target.uid if hasattr(target, 'uid') else target, choice))

    def broadcast(self, packet):
        self.broadcasts.append(packet)

    @property
    def timer(self):
        return _TimerStub(self.timer_started)

    @property
    def turn_player(self):
        return self.turn_player_cache


class _TimerStub:
    def __init__(self, started_list):
        self._started = started_list
    def start_timing(self, timeout):
        self._started.append(timeout)


def make_double_player(seat=0, double_turn_seat=0, on_double_returns=False):
    room = DoubleRoomStub(double_turn_seat=double_turn_seat, on_double_returns=on_double_returns)
    player = Player(1, 'probe')
    player.socket = SocketStub()
    player.seat = seat
    player.state = State.DOUBLE
    player.room = room
    room.players = [player]
    room.turn_player_cache = player
    return player, room


def make_player(hand_pokers, room=None):
    room = room or RoomStub()
    player = Player(1, 'probe')
    player.socket = SocketStub()
    player.room = room
    player.seat = 0
    player.state = State.PLAYING
    player._hand_pokers = list(hand_pokers)
    room.players = [player]
    return player, room


def make_call_score_player(room=None):
    player = Player(1, 'probe')
    player.socket = SocketStub()
    player.seat = 0
    player.state = State.CALL_SCORE
    room = room or CallScoreRoomStub()
    player.room = room
    room.players = [player]
    if room._landlord is None:
        room._landlord = player
    return player, room


def make_waiting_player(room=None):
    player = Player(1, 'probe')
    player.socket = SocketStub()
    player.seat = 0
    player.state = State.WAITING
    room = room or WaitingRoomStub()
    player.room = room
    room.players = [player]
    return player, room


def make_left_player(room=None):
    player = Player(1, 'probe')
    player.socket = SocketStub()
    player.seat = 0
    player.state = State.WAITING
    player.room = room
    player.set_left(1)
    return player


class PlayerWriteMessageTest(unittest.TestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger = self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    def test_write_message_without_socket_is_logged_and_skipped(self):
        player = Player(1, 'probe')

        sent = player.write_message([Pt.RSP_READY, {'uid': 1, 'ready': 1}])

        self.assertFalse(sent)
        self.logger.warning.assert_called_once_with('USER[%d] missing socket for response %s', 1, [Pt.RSP_READY, {'uid': 1, 'ready': 1}])

    def test_write_message_with_socket_sends_packet(self):
        player = Player(1, 'probe')
        player.socket = SocketStub()

        sent = player.write_message([Pt.RSP_READY, {'uid': 1, 'ready': 1}])

        self.assertTrue(sent)
        self.assertEqual(player.socket.messages, [[Pt.RSP_READY, {'uid': 1, 'ready': 1}]])


class PlayerHandleInitTest(unittest.TestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    def test_low_point_player_cannot_join_locked_room_level(self):
        player = Player(1, 'low-point', point=999)
        player.socket = SocketStub()

        with patch('api.game.globalvar.GlobalVar.find_room') as find_room:
            player.handle_init(Pt.REQ_JOIN_ROOM, {'room': -1, 'level': 2})

        find_room.assert_not_called()
        self.assertEqual(player.state, State.INIT)
        self.assertIsNone(player.room)
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Insufficient point for room level'}]])


class PlayerExplicitLeaveTest(unittest.TestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    def test_waiting_player_explicit_leave_frees_room_seat(self):
        room = LeaveRoomStub(room_id=7)
        player = Player(1, 'probe')
        player.socket = SocketStub()
        player.room = room
        player.seat = 0
        player._ready = 1
        player.state = State.WAITING

        left = player.leave_room()

        self.assertTrue(left)
        self.assertIsNone(player.room)
        self.assertEqual(player.seat, -1)
        self.assertEqual(player.state, State.INIT)
        self.assertEqual(player.ready, 0)
        self.assertEqual(player.is_left(), False)
        self.assertEqual(room.left_players, [player])
        self.assertEqual(room.broadcasts, [[Pt.RSP_LEAVE_ROOM, {'uid': 1}]])
        self.assertEqual(room.synced, 1)

    def test_playing_player_explicit_leave_preserves_rejoinable_room_slot(self):
        player, room = make_player([3, 4])

        left = player.leave_room()

        self.assertFalse(left)
        self.assertTrue(player.is_left())
        self.assertIs(player.room, room)
        self.assertEqual(room.broadcasts, [[Pt.RSP_LEAVE_ROOM, {'uid': 1}]])


class PlayerHandleLeaveTest(unittest.TestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    def test_rejoin_missing_room_keeps_player_left_and_reports_error(self):
        player = make_left_player(LeaveRoomStub(room_id=7))

        with patch('api.game.globalvar.GlobalVar.find_room', return_value=None):
            handled = player.handle_leave(Pt.REQ_JOIN_ROOM, {'room': 99, 'level': 1})

        self.assertTrue(handled)
        self.assertTrue(player.is_left())
        self.assertEqual(player.socket.messages[-1], [Pt.ERROR, {'reason': 'Room[99] Not Found'}])

    def test_rejoin_current_room_clears_left_state_and_syncs_room(self):
        room = LeaveRoomStub(room_id=7)
        player = make_left_player(room)

        with patch('api.game.globalvar.GlobalVar.find_room', return_value=room):
            handled = player.handle_leave(Pt.REQ_JOIN_ROOM, {'room': 7, 'level': 1})

        self.assertTrue(handled)
        self.assertFalse(player.is_left())
        self.assertEqual(room.synced, 1)

    def test_rejoin_different_room_is_rejected_without_switching_room(self):
        current_room = LeaveRoomStub(room_id=7)
        target_room = LeaveRoomStub(room_id=8)
        player = make_left_player(current_room)

        with patch('api.game.globalvar.GlobalVar.find_room', return_value=target_room):
            handled = player.handle_leave(Pt.REQ_JOIN_ROOM, {'room': 8, 'level': 1})

        self.assertTrue(handled)
        self.assertTrue(player.is_left())
        self.assertIs(player.room, current_room)
        self.assertEqual(target_room.synced, 0)
        self.assertEqual(player.socket.messages[-1], [Pt.ERROR, {'reason': 'Room[8] Not Joined'}])

    def test_leave_to_lobby_removes_player_from_room_and_allows_init_handling(self):
        room = LeaveRoomStub(room_id=7)
        player = make_left_player(room)

        handled = player.handle_leave(Pt.REQ_JOIN_ROOM, {'room': -1, 'level': 1})

        self.assertFalse(handled)
        self.assertFalse(player.is_left())
        self.assertIsNone(player.room)
        self.assertEqual(player.state, State.INIT)
        self.assertEqual(room.left_players, [player])


class PlayerHandleWaitingTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    def test_ready_value_updates_and_broadcasts_without_dealing_until_room_is_ready(self):
        player, room = make_waiting_player(WaitingRoomStub(is_ready=False))

        player.handle_waiting(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(player.ready, 1)
        self.assertEqual(player.state, State.WAITING)
        self.assertEqual(room.broadcasts, [[Pt.RSP_READY, {'uid': 1, 'ready': 1}]])
        self.assertEqual(room.deals, 0)

    def test_ready_value_starts_call_score_and_deals_when_room_is_ready(self):
        player, room = make_waiting_player(WaitingRoomStub(is_ready=True))

        player.handle_waiting(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(player.state, State.CALL_SCORE)
        self.assertEqual(room.broadcasts, [[Pt.RSP_READY, {'uid': 1, 'ready': 1}]])
        self.assertEqual(room.deals, 1)

    def test_failed_deal_keeps_players_waiting(self):
        player, room = make_waiting_player(WaitingRoomStub(is_ready=True, deal_result=False))
        other = Player(2, 'other')
        other.state = State.WAITING
        room.players.append(other)

        player.handle_waiting(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(player.ready, 1)
        self.assertEqual(player.state, State.WAITING)
        self.assertEqual(other.state, State.WAITING)
        self.assertEqual(room.broadcasts, [[Pt.RSP_READY, {'uid': 1, 'ready': 1}]])
        self.assertEqual(room.deals, 1)

    def test_invalid_ready_value_is_rejected_without_mutating_room(self):
        for ready in (True, '1', 2, None):
            with self.subTest(ready=ready):
                player, room = make_waiting_player(WaitingRoomStub(is_ready=True))

                player.handle_waiting(Pt.REQ_READY, {'ready': ready})

                self.assertEqual(player.ready, 0)
                self.assertEqual(player.state, State.WAITING)
                self.assertEqual(room.broadcasts, [])
                self.assertEqual(room.deals, 0)
                self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Invalid ready value'}]])

    def test_non_ready_message_reports_state_error(self):
        player, room = make_waiting_player()

        player.handle_waiting(Pt.REQ_CALL_SCORE, {'rob': 1})

        self.assertEqual(room.broadcasts, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'STATE[State.WAITING]'}]])

    async def test_chat_message_broadcasts_to_room_from_waiting_state(self):
        player, room = make_waiting_player()

        await player.on_message(Pt.REQ_CHAT, {'message': ' 大家好 '})

        self.assertEqual(room.broadcasts, [[Pt.RSP_CHAT, {'uid': 1, 'message': '大家好'}]])
        self.assertEqual(player.socket.messages, [])

    async def test_invalid_chat_message_is_rejected(self):
        for message in ('', 'x' * 25, None):
            with self.subTest(message=message):
                player, room = make_waiting_player()

                await player.on_message(Pt.REQ_CHAT, {'message': message})

                self.assertEqual(room.broadcasts, [])
                self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Invalid chat message'}]])

    async def test_chat_without_room_is_rejected(self):
        player = Player(1, 'probe')
        player.socket = SocketStub()
        player.state = State.INIT

        await player.on_message(Pt.REQ_CHAT, {'message': '大家好'})

        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Room not joined'}]])


class PlayerHandleCallScoreTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    async def test_unfinished_call_score_broadcasts_without_landlord_or_bottom_cards(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=False))

        await player.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 1})

        self.assertEqual(player.rob, 1)
        self.assertEqual(room.on_rob_calls, [player])
        self.assertEqual(player.state, State.CALL_SCORE)
        self.assertEqual(room.broadcasts, [[Pt.RSP_CALL_SCORE, {
            'uid': 1,
            'rob': 1,
            'landlord': -1,
            'multiple': 30,
            'pokers': [],
        }]])

    async def test_finished_call_score_switches_room_to_double_phase_then_broadcasts_landlord(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=True))
        other = Player(2, 'other')
        other.state = State.CALL_SCORE
        room.players.append(other)

        await player.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 0})

        self.assertEqual(player.rob, 0)
        # GDD v0.2 G 章节：抢地主结束 → 进 DOUBLE 阶段（不再直接 PLAYING）
        self.assertEqual(player.state, State.DOUBLE)
        self.assertEqual(other.state, State.DOUBLE)
        self.assertEqual(room.start_double_phase_calls, [True])
        self.assertEqual(room.broadcasts, [[Pt.RSP_CALL_SCORE, {
            'uid': 1,
            'rob': 0,
            'landlord': 1,
            'multiple': 30,
            'pokers': [53, 54, 3],
        }]])

    async def test_finished_call_score_skips_empty_room_seats_when_changing_state(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=True))
        other = Player(2, 'other')
        other.state = State.CALL_SCORE
        room.players = [player, None, other]

        await player.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 0})

        # GDD v0.2 G 章节：所有在场玩家都进 DOUBLE 阶段
        self.assertEqual(player.state, State.DOUBLE)
        self.assertEqual(other.state, State.DOUBLE)
        self.assertEqual(room.players[1], None)

    async def test_non_call_score_message_reports_state_error(self):
        player, room = make_call_score_player()

        await player.handle_call_score(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(room.on_rob_calls, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'STATE[State.CALL_SCORE]'}]])

    async def test_invalid_call_score_value_is_rejected_without_mutating_room(self):
        player, room = make_call_score_player()

        await player.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': True})

        self.assertEqual(player.rob, -1)
        self.assertEqual(room.on_rob_calls, [])
        self.assertEqual(room.broadcasts, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Invalid rob value'}]])


class PlayerHandleTimeoutTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger = self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    async def test_call_score_timeout_defaults_to_decline_for_connected_player(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=False))

        await player.handle_timeout()

        self.assertEqual(player.rob, 0)
        self.assertEqual(room.on_rob_calls, [player])
        self.assertEqual(room.broadcasts, [[Pt.RSP_CALL_SCORE, {
            'uid': 1,
            'rob': 0,
            'landlord': -1,
            'multiple': 30,
            'pokers': [],
        }]])

    async def test_timeout_bypasses_left_player_message_gate(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=False))
        player.set_left(1)

        await player.handle_timeout()

        self.assertEqual(player.rob, 0)
        self.assertEqual(room.on_rob_calls, [player])
        self.assertEqual(room.broadcasts, [
            [Pt.RSP_LEAVE_ROOM, {'uid': 1}],
            [Pt.RSP_CALL_SCORE, {
                'uid': 1,
                'rob': 0,
                'landlord': -1,
                'multiple': 30,
                'pokers': [],
            }],
        ])

    async def test_call_score_timeout_without_room_is_logged_and_skipped(self):
        player = Player(1, 'probe')
        player.socket = SocketStub()
        player.state = State.CALL_SCORE

        handled = await player.handle_timeout()

        self.assertFalse(handled)
        self.assertEqual(player.rob, -1)
        self.assertEqual(player.socket.messages, [])
        self.logger.warning.assert_called_once_with('USER[%d] timeout skipped because room is missing', 1)

    async def test_playing_timeout_passes_when_following_another_player(self):
        player, room = make_player([4, 5])
        room.last_shot_seat = 1
        room.last_shot_poker = [3]

        await player.handle_timeout()

        self.assertEqual(player.hand_pokers, [4, 5])
        self.assertEqual(room.shots, [(0, [])])
        self.assertEqual(room.broadcasts, [[Pt.RSP_SHOT_POKER, {'uid': 1, 'pokers': [], 'multiple': 15}]])
        self.assertEqual(room.next_turns, 1)

    async def test_playing_timeout_without_room_is_logged_and_skipped(self):
        player = Player(1, 'probe')
        player.socket = SocketStub()
        player.state = State.PLAYING
        player.seat = 0
        player._hand_pokers = [3, 4]

        handled = await player.handle_timeout()

        self.assertFalse(handled)
        self.assertEqual(player.hand_pokers, [3, 4])
        self.assertEqual(player.socket.messages, [])
        self.logger.warning.assert_called_once_with('USER[%d] timeout skipped because room is missing', 1)


class PlayerHandlePlayingTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    async def test_rejects_cards_that_are_not_in_hand(self):
        player, room = make_player([3, 4])

        await player.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [5]})

        self.assertEqual(player.hand_pokers, [3, 4])
        self.assertEqual(room.shots, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Poker does not exist'}]])

    async def test_rejects_stale_player_object_even_when_seat_matches_turn(self):
        player, room = make_player([3, 4])
        replacement = Player(2, 'replacement')
        replacement.seat = 0
        replacement.state = State.PLAYING
        room.players = [replacement]

        await player.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [3]})

        self.assertEqual(player.hand_pokers, [3, 4])
        self.assertEqual(room.shots, [])
        self.assertEqual(room.broadcasts, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'TURN ERROR'}]])

    async def test_rejects_missing_poker_list_without_mutating_room(self):
        player, room = make_player([3, 4])

        await player.handle_playing(Pt.REQ_SHOT_POKER, {})

        self.assertEqual(player.hand_pokers, [3, 4])
        self.assertEqual(room.shots, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Invalid pokers'}]])

    async def test_rejects_non_integer_or_out_of_range_pokers(self):
        invalid_packets = (
            {'pokers': '3'},
            {'pokers': [0]},
            {'pokers': [55]},
            {'pokers': ['3']},
            {'pokers': [True]},
        )

        for packet in invalid_packets:
            with self.subTest(packet=packet):
                player, room = make_player([3, 4])

                await player.handle_playing(Pt.REQ_SHOT_POKER, packet)

                self.assertEqual(player.hand_pokers, [3, 4])
                self.assertEqual(room.shots, [])
                self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Invalid pokers'}]])

    async def test_room_rejection_keeps_hand_and_reports_error(self):
        player, room = make_player([3, 4], RoomStub(on_shot_error='Poker small than last shot'))

        await player.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [3]})

        self.assertEqual(player.hand_pokers, [3, 4])
        self.assertEqual(room.shots, [(0, [3])])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'Poker small than last shot'}]])
        self.assertEqual(room.broadcasts, [])

    async def test_successful_shot_removes_cards_broadcasts_and_advances_turn(self):
        player, room = make_player([3, 4, 5])

        await player.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [3, 5]})

        self.assertEqual(player.hand_pokers, [4])
        self.assertEqual(room.shots, [(0, [3, 5])])
        self.assertEqual(room.broadcasts, [[Pt.RSP_SHOT_POKER, {'uid': 1, 'pokers': [3, 5], 'multiple': 15}]])
        self.assertEqual(room.next_turns, 1)
        self.assertIsNone(room.game_over_winner)
        self.assertEqual(room.saved_rounds, 0)

    async def test_empty_hand_after_shot_ends_game_and_saves_round(self):
        player, room = make_player([3])

        await player.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': [3]})

        self.assertEqual(player.hand_pokers, [])
        self.assertEqual(player.state, State.GAME_OVER)
        self.assertEqual(room.game_over_winner, player)
        self.assertEqual(room.saved_points, 1)
        self.assertEqual(room.saved_rounds, 1)
        self.assertEqual(room.next_turns, 0)

    async def test_non_shot_message_reports_state_error(self):
        player, room = make_player([3])

        await player.handle_playing(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(room.shots, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'STATE[State.PLAYING]'}]])


class PlayerHandleDoubleTest(unittest.IsolatedAsyncioTestCase):
    """GDD v0.2 G 章节：Player.handle_double 单元测试。"""

    def setUp(self):
        self.logger_patch = patch('api.game.player.logger')
        self.logger = self.logger_patch.start()

    def tearDown(self):
        self.logger_patch.stop()

    async def test_double_turn_error_when_not_your_seat(self):
        # player at seat 0, but room.double_turn_seat is 1
        player, room = make_double_player(seat=0, double_turn_seat=1)

        await player.handle_double(Pt.REQ_DOUBLE, {'double': 1})

        self.assertEqual(room.on_double_calls, [])
        self.assertEqual(room.broadcasts, [])
        self.assertEqual(
            player.socket.messages,
            [[Pt.ERROR, {'reason': 'TURN ERROR (double phase)'}]],
        )

    async def test_double_invalid_value_rejected(self):
        player, room = make_double_player(seat=0, double_turn_seat=0)

        await player.handle_double(Pt.REQ_DOUBLE, {'double': 2})  # not 0/1

        self.assertEqual(room.on_double_calls, [])
        self.assertEqual(
            player.socket.messages,
            [[Pt.ERROR, {'reason': 'Invalid double value'}]],
        )

    async def test_double_non_double_message_reports_state_error(self):
        player, room = make_double_player(seat=0, double_turn_seat=0)

        await player.handle_double(Pt.REQ_SHOT_POKER, {'pokers': [3]})

        self.assertEqual(room.on_double_calls, [])
        self.assertEqual(
            player.socket.messages,
            [[Pt.ERROR, {'reason': 'STATE[State.DOUBLE]'}]],
        )

    async def test_double_continues_phase_keeps_playing_state(self):
        # on_double returns False (not end) → player stays in DOUBLE
        player, room = make_double_player(seat=0, double_turn_seat=0, on_double_returns=False)

        await player.handle_double(Pt.REQ_DOUBLE, {'double': 1})

        self.assertEqual(room.on_double_calls, [(player, 1)])
        self.assertEqual(len(room.broadcasts), 1)
        broadcast = room.broadcasts[0]
        self.assertEqual(broadcast[0], Pt.RSP_DOUBLE)
        self.assertEqual(broadcast[1]['uid'], player.uid)
        self.assertEqual(broadcast[1]['double'], 1)
        self.assertEqual(broadcast[1]['phase'], 'continue')
        self.assertEqual(player.state, State.DOUBLE)
        self.assertEqual(room.timer_started, [])  # not end, no timer reset

    async def test_double_ends_phase_transitions_to_playing(self):
        # on_double returns True (end) → player transitions to PLAYING + timer reset
        player, room = make_double_player(seat=0, double_turn_seat=0, on_double_returns=True)

        await player.handle_double(Pt.REQ_DOUBLE, {'double': 0})

        self.assertEqual(room.on_double_calls, [(player, 0)])
        broadcast = room.broadcasts[0]
        self.assertEqual(broadcast[1]['phase'], 'end')
        self.assertEqual(player.state, State.PLAYING)
        self.assertEqual(room.timer_started, [20])  # timer reset for shot phase
        self.assertEqual(room.whose_turn, room.landlord_seat)

    async def test_double_zero_and_one_both_accepted(self):
        for choice in (0, 1):
            with self.subTest(choice=choice):
                player, room = make_double_player(seat=0, double_turn_seat=0)
                await player.handle_double(Pt.REQ_DOUBLE, {'double': choice})
                self.assertEqual(room.on_double_calls, [(player, choice)])
                # clear socket messages for next subtest
                player.socket.messages = []

    async def test_double_timeout_defaults_to_decline(self):
        player, room = make_double_player(seat=0, double_turn_seat=0)

        await player.handle_timeout()

        self.assertEqual(room.on_double_calls, [(player, 0)])


if __name__ == '__main__':
    unittest.main()
