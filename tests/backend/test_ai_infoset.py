import sys
import types
import unittest
from unittest.mock import MagicMock

from ai.infoset import (
    build_douzero_infoset,
    get_douzero_legal_actions,
    seat_to_douzero_position,
)


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

    def test_hands_by_position_skips_none_player_slot(self):
        room = RoomStub()
        room.players[0] = None

        infoset = build_douzero_infoset(room.players[1], room)

        self.assertEqual(infoset.num_cards_left_dict, {
            'landlord': 6,
            'landlord_up': 0,
            'landlord_down': 3,
        })

    def test_last_pid_falls_back_to_action_seq_when_last_shot_poker_empty(self):
        room = RoomStub()
        room.shot_round = [[], [4]]
        room.last_shot_seat = 2
        room.last_shot_poker = []

        infoset = build_douzero_infoset(room.players[1], room)

        self.assertEqual(infoset.last_pid, 'landlord_down')

    def test_last_pid_defaults_to_landlord_when_no_shots(self):
        room = RoomStub()
        room.shot_round = []
        room.last_shot_seat = 2
        room.last_shot_poker = []

        infoset = build_douzero_infoset(room.players[1], room)

        self.assertEqual(infoset.last_pid, 'landlord')


_MOVE_GEN_METHODS = [
    'gen_moves', 'gen_type_1_single', 'gen_type_2_pair', 'gen_type_3_triple',
    'gen_type_4_bomb', 'gen_type_5_king_bomb', 'gen_type_6_3_1', 'gen_type_7_3_2',
    'gen_type_8_serial_single', 'gen_type_9_serial_pair', 'gen_type_10_serial_triple',
    'gen_type_11_serial_3_1', 'gen_type_12_serial_3_2', 'gen_type_13_4_2', 'gen_type_14_4_22',
]


def _make_md_ms():
    md = MagicMock()
    for name in ('TYPE_0_PASS', 'TYPE_1_SINGLE', 'TYPE_2_PAIR', 'TYPE_3_TRIPLE',
                 'TYPE_4_BOMB', 'TYPE_5_KING_BOMB', 'TYPE_6_3_1', 'TYPE_7_3_2',
                 'TYPE_8_SERIAL_SINGLE', 'TYPE_9_SERIAL_PAIR', 'TYPE_10_SERIAL_TRIPLE',
                 'TYPE_11_SERIAL_3_1', 'TYPE_12_SERIAL_3_2', 'TYPE_13_4_2', 'TYPE_14_4_22'):
        setattr(md, name, name)
    ms = MagicMock()
    return md, ms


def _make_MovesGener():
    MovesGener = MagicMock()
    gen = MovesGener.return_value
    for method in _MOVE_GEN_METHODS:
        getattr(gen, method).return_value = []
    return MovesGener


def _install_douzero_mocks(md, ms, MovesGener):
    douzero = types.ModuleType('douzero')
    douzero.env = types.ModuleType('douzero.env')
    douzero.env.move_detector = md
    douzero.env.move_selector = ms
    douzero.env.move_generator = types.ModuleType('douzero.env.move_generator')
    douzero.env.move_generator.MovesGener = MovesGener
    sys.modules['douzero'] = douzero
    sys.modules['douzero.env'] = douzero.env
    sys.modules['douzero.env.move_detector'] = md
    sys.modules['douzero.env.move_selector'] = ms
    sys.modules['douzero.env.move_generator'] = douzero.env.move_generator


class DouZeroLegalActionsTest(unittest.TestCase):
    def _run(self, hand_pokers, shot_round, last_shot_seat=2):
        player = PlayerStub(0, hand_pokers)
        room = RoomStub()
        room.players[0] = player
        room.shot_round = shot_round
        room.last_shot_seat = last_shot_seat
        room.last_shot_poker = shot_round[-1] if shot_round else []
        return player, room

    def test_returns_all_moves_when_rival_pass(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_0_PASS}
        MovesGener.return_value.gen_moves.return_value = [[3], [4]]
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run([3, 4], [[3, 16, 29, 42]])

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        self.assertEqual(len(moves), 3)

    def test_filters_single_when_rival_single(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_1_SINGLE}
        MovesGener.return_value.gen_type_1_single.return_value = [[3], [4], [5]]
        MovesGener.return_value.gen_type_4_bomb.return_value = [[11, 11, 11, 11]]
        ms.filter_type_1_single.return_value = [[4], [5]]
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run([3, 4, 5], [[3, 16, 29, 42]])

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        ms.filter_type_1_single.assert_called_once()
        self.assertEqual(len(moves), 4)

    def test_appends_bombs_and_pass_after_filter(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_1_SINGLE}
        MovesGener.return_value.gen_type_1_single.return_value = [[3]]
        MovesGener.return_value.gen_type_4_bomb.return_value = [[10, 10, 10, 10]]
        MovesGener.return_value.gen_type_5_king_bomb.return_value = []
        ms.filter_type_1_single.return_value = [[3]]
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run(
            [3, 10, 10, 10, 10],
            [[3, 16, 29, 42]],
        )

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        self.assertIn([3], moves)
        self.assertIn([10, 10, 10, 10], moves)
        self.assertIn([], moves)

    def test_king_bomb_returns_empty_moves_with_pass(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_5_KING_BOMB}
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run(
            [53, 54],
            [[53, 54]],
            last_shot_seat=2,
        )

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        self.assertEqual(moves, [[]])

    def test_bomb_does_not_reappend_bomb(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_4_BOMB}
        ms.filter_type_4_bomb.return_value = []
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run(
            [3, 10, 10, 10, 10],
            [[3, 16, 29, 42]],
        )

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        self.assertEqual(moves, [[]])

    def test_no_rival_move_omits_empty_pass(self):
        md, ms = _make_md_ms()
        MovesGener = _make_MovesGener()
        md.get_move_type.return_value = {'type': md.TYPE_0_PASS}
        MovesGener.return_value.gen_moves.return_value = [[3]]
        _install_douzero_mocks(md, ms, MovesGener)

        player, room = self._run([3], [])
        room.last_shot_seat = 0
        room.last_shot_poker = []

        from ai.infoset import get_douzero_legal_actions as _g
        moves = _g(player, room)

        self.assertEqual(moves, [[3]])
        self.assertNotIn([], moves)


if __name__ == '__main__':
    unittest.main()
