import unittest

from api.game.room import Room


class RoomShotTest(unittest.TestCase):
    def test_valid_shot_updates_last_shot_and_round(self):
        room = Room(1)

        error = room.on_shot(0, [3])

        self.assertEqual(error, '')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [3])
        self.assertEqual(room.shot_round, [[3]])

    def test_invalid_shot_does_not_change_state(self):
        room = Room(1)
        room.last_shot_seat = 2
        room.last_shot_poker = [10]

        error = room.on_shot(0, [3, 4])

        self.assertEqual(error, 'Poker does not comply with the rules')
        self.assertEqual(room.last_shot_seat, 2)
        self.assertEqual(room.last_shot_poker, [10])
        self.assertEqual(room.shot_round, [])

    def test_player_cannot_pass_when_they_own_last_shot(self):
        room = Room(1)
        room.last_shot_seat = 1
        room.last_shot_poker = [3]

        error = room.on_shot(1, [])

        self.assertEqual(error, 'Last shot player does not allow pass')
        self.assertEqual(room.shot_round, [])

    def test_player_can_pass_against_another_last_shot(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [3]

        error = room.on_shot(1, [])

        self.assertEqual(error, '')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [3])
        self.assertEqual(room.shot_round, [[]])

    def test_smaller_follow_is_rejected_without_mutating_state(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [4]

        error = room.on_shot(1, [3])

        self.assertEqual(error, 'Poker small than last shot')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [4])
        self.assertEqual(room.shot_round, [])

    def test_bomb_and_rocket_double_bomb_multiplier(self):
        room = Room(1)

        self.assertEqual(room._multiple_details['bomb'], 1)
        self.assertEqual(room.on_shot(0, [3, 16, 29, 42]), '')
        self.assertEqual(room._multiple_details['bomb'], 2)
        self.assertEqual(room.on_shot(1, [53, 54]), '')
        self.assertEqual(room._multiple_details['bomb'], 4)
        self.assertEqual(room.shot_round, [[3, 16, 29, 42], [53, 54]])


if __name__ == '__main__':
    unittest.main()
