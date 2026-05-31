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
        self._is_end = is_end
        self._landlord = landlord

    def on_rob(self, player):
        self.on_rob_calls.append(player)
        return self._is_end

    @property
    def turn_player(self):
        if 0 <= self.whose_turn < len(self.players):
            return self.players[self.whose_turn]
        return None

    @property
    def landlord(self):
        return self._landlord

    def broadcast(self, packet):
        self.broadcasts.append(packet)


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


class PlayerHandleWaitingTest(unittest.TestCase):
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

    async def test_finished_call_score_switches_room_to_playing_and_broadcasts_landlord(self):
        player, room = make_call_score_player(CallScoreRoomStub(is_end=True))
        other = Player(2, 'other')
        other.state = State.CALL_SCORE
        room.players.append(other)

        await player.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 0})

        self.assertEqual(player.rob, 0)
        self.assertEqual(player.state, State.PLAYING)
        self.assertEqual(other.state, State.PLAYING)
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

        self.assertEqual(player.state, State.PLAYING)
        self.assertEqual(other.state, State.PLAYING)
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
        self.logger_patch.start()

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

    async def test_playing_timeout_passes_when_following_another_player(self):
        player, room = make_player([4, 5])
        room.last_shot_seat = 1
        room.last_shot_poker = [3]

        await player.handle_timeout()

        self.assertEqual(player.hand_pokers, [4, 5])
        self.assertEqual(room.shots, [(0, [])])
        self.assertEqual(room.broadcasts, [[Pt.RSP_SHOT_POKER, {'uid': 1, 'pokers': [], 'multiple': 15}]])
        self.assertEqual(room.next_turns, 1)


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
        self.assertEqual(room.saved_rounds, 1)
        self.assertEqual(room.next_turns, 0)

    async def test_non_shot_message_reports_state_error(self):
        player, room = make_player([3])

        await player.handle_playing(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(room.shots, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'STATE[State.PLAYING]'}]])


if __name__ == '__main__':
    unittest.main()
