import unittest

from ai.infoset import build_douzero_infoset, seat_to_douzero_position


class PlayerStub:
    def __init__(self, seat, hand_pokers):
        self.seat = seat
        self.hand_pokers = list(hand_pokers)


class RoomStub:
    def __init__(self):
        self.landlord_seat = 1
        self.players = [
            PlayerStub(0, [4, 17]),
            PlayerStub(1, [3, 16, 29, 42, 53, 54]),
            PlayerStub(2, [5, 18, 31]),
        ]
        self.pokers = [1, 14, 27]
        self.shot_round = [
            [3, 16, 29, 42],
            [],
            [4],
        ]
        self.last_shot_seat = 0
        self.last_shot_poker = [4]


class SeatPositionMappingTest(unittest.TestCase):
    def test_maps_landlord_relative_positions(self):
        self.assertEqual(seat_to_douzero_position(1, 1), 'landlord')
        self.assertEqual(seat_to_douzero_position(2, 1), 'landlord_down')
        self.assertEqual(seat_to_douzero_position(0, 1), 'landlord_up')

    def test_rejects_invalid_seat_values(self):
        for seat, landlord_seat in ((-1, 0), (3, 0), (0, -1), (0, 3), (True, 0)):
            with self.subTest(seat=seat, landlord_seat=landlord_seat):
                with self.assertRaises(ValueError):
                    seat_to_douzero_position(seat, landlord_seat)


class DouZeroInfoSetTest(unittest.TestCase):
    def test_builds_infoset_from_room_snapshot(self):
        room = RoomStub()
        player = room.players[1]

        infoset = build_douzero_infoset(player, room, legal_actions=[[20, 30], []])

        self.assertEqual(infoset.player_position, 'landlord')
        self.assertEqual(infoset.player_hand_cards, [3, 3, 3, 3, 20, 30])
        self.assertEqual(infoset.num_cards_left_dict, {
            'landlord': 6,
            'landlord_up': 2,
            'landlord_down': 3,
        })
        self.assertEqual(infoset.three_landlord_cards, [14, 14, 14])
        self.assertEqual(infoset.card_play_action_seq, [[3, 3, 3, 3], [], [4]])
        self.assertEqual(infoset.other_hand_cards, [4, 4, 5, 5, 5])
        self.assertEqual(infoset.legal_actions, [[20, 30], []])
        self.assertEqual(infoset.last_move, [4])
        self.assertEqual(infoset.last_two_moves, [[4], []])
        self.assertEqual(infoset.last_move_dict, {
            'landlord': [3, 3, 3, 3],
            'landlord_up': [4],
            'landlord_down': [],
        })
        self.assertEqual(infoset.played_cards, {
            'landlord': [3, 3, 3, 3],
            'landlord_up': [4],
            'landlord_down': [],
        })
        self.assertEqual(infoset.all_handcards, {
            'landlord': [3, 3, 3, 3, 20, 30],
            'landlord_up': [4, 4],
            'landlord_down': [5, 5, 5],
        })
        self.assertEqual(infoset.last_pid, 'landlord_up')
        self.assertEqual(infoset.bomb_num, 1)

    def test_last_move_matches_douzero_pass_behavior_after_two_passes(self):
        room = RoomStub()
        room.shot_round = [[3], [], []]
        room.last_shot_seat = 1
        room.last_shot_poker = [3]

        infoset = build_douzero_infoset(room.players[1], room)

        self.assertEqual(infoset.last_move, [])
        self.assertEqual(infoset.last_two_moves, [[], []])
        self.assertEqual(infoset.last_pid, 'landlord')


if __name__ == '__main__':
    unittest.main()
