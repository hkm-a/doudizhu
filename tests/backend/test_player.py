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
