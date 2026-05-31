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

    def on_game_over(self, winner):
        self.game_over_winner = winner

    async def save_shot_round(self):
        self.saved_rounds += 1


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

    async def test_non_call_score_message_reports_state_error(self):
        player, room = make_call_score_player()

        await player.handle_call_score(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(room.on_rob_calls, [])
        self.assertEqual(player.socket.messages, [[Pt.ERROR, {'reason': 'STATE[State.CALL_SCORE]'}]])


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
