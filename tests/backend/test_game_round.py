import unittest
from unittest.mock import patch, Mock

from game.round import GameRound
from game.player import PureGamePlayer


class PlayerFactory:
    @staticmethod
    def make(uid, seat, landlord=0, left=False):
        p = PureGamePlayer(uid, f'p{uid}')
        p.seat = seat
        p.landlord = landlord
        if left:
            p.set_left(1)
        return p


class GameRoundInitTest(unittest.TestCase):
    def test_constructor_sets_basic_fields(self):
        g = GameRound(1)
        self.assertEqual(g.room_id, 1)
        self.assertEqual(g.level, 1)
        self.assertEqual(g.state, 0)
        self.assertEqual(g.whose_turn, 0)
        self.assertEqual(g.landlord_seat, 0)

    def test_constructor_sets_level_profile(self):
        g = GameRound(1, level=2)
        self.assertEqual(g.level, 2)

    def test_constructor_sets_multiples(self):
        g = GameRound(1)
        md = g._multiple_details
        self.assertEqual(md['origin'], 10)
        self.assertEqual(md['origin_multiple'], 15)

    def test_constructor_level_2_has_higher_origin(self):
        g = GameRound(1, level=2)
        self.assertEqual(g._multiple_details['origin'], 30)

    def test_set_state_updates_state(self):
        g = GameRound(1)
        g.set_state(3)
        self.assertEqual(g.state, 3)


class GameRoundLevelProfileTest(unittest.TestCase):
    def test_level_1_profile(self):
        p = GameRound.level_profile(1)
        self.assertEqual(p['label'], '新手场')
        self.assertEqual(p['origin'], 10)
        self.assertEqual(p['min_point'], 0)

    def test_level_2_profile(self):
        p = GameRound.level_profile(2)
        self.assertEqual(p['label'], '进阶场')
        self.assertEqual(p['origin'], 30)
        self.assertEqual(p['min_point'], 1000)

    def test_level_3_profile(self):
        p = GameRound.level_profile(3)
        self.assertEqual(p['label'], '高手场')
        self.assertEqual(p['origin'], 60)
        self.assertEqual(p['min_point'], 2000)

    def test_unknown_level_falls_back(self):
        p = GameRound.level_profile(99)
        self.assertEqual(p['origin'], 10)
        self.assertEqual(p['min_point'], 0)


class GameRoundPlayerManagementTest(unittest.TestCase):
    def test_on_join_fills_empty_seat(self):
        g = GameRound(1)
        p = PlayerFactory.make(1, -1)
        result = g._on_join(p)
        self.assertTrue(result)
        self.assertEqual(g.players[0], p)
        self.assertEqual(p.seat, 0)

    def test_on_join_fills_second_slot(self):
        g = GameRound(1)
        p1 = PlayerFactory.make(1, -1)
        p2 = PlayerFactory.make(2, -1)
        g._on_join(p1)
        g._on_join(p2)
        self.assertEqual(g.players[1], p2)

    def test_on_join_rejects_when_full(self):
        g = GameRound(1)
        for i in range(3):
            g._on_join(PlayerFactory.make(i, -1))
        p4 = PlayerFactory.make(4, -1)
        self.assertFalse(g._on_join(p4))

    def test_size_counts_non_none_players(self):
        g = GameRound(1)
        self.assertEqual(g.size(), 0)
        g._on_join(PlayerFactory.make(1, -1))
        self.assertEqual(g.size(), 1)

    def test_is_full_true_when_three_players(self):
        g = GameRound(1)
        for i in range(3):
            g._on_join(PlayerFactory.make(i, -1))
        self.assertTrue(g.is_full())

    def test_is_empty_true_when_no_players(self):
        g = GameRound(1)
        self.assertTrue(g.is_empty())

    def test_is_ready_requires_all_ready(self):
        g = GameRound(1)
        for i in range(3):
            p = PlayerFactory.make(i, -1)
            p.ready = 1
            g._on_join(p)
        self.assertTrue(g.is_ready())

    def test_is_ready_false_when_not_all_ready(self):
        g = GameRound(1)
        for i in range(3):
            p = PlayerFactory.make(i, -1)
            p.ready = 0 if i == 1 else 1
            g._on_join(p)
        self.assertFalse(g.is_ready())

    def test_seat_to_uid_returns_uid(self):
        g = GameRound(1)
        p = PlayerFactory.make(42, 0)
        g._on_join(p)
        self.assertEqual(g.seat_to_uid(0), 42)

    def test_seat_to_uid_minus_one_for_empty_seat(self):
        g = GameRound(1)
        self.assertEqual(g.seat_to_uid(1), -1)

    def test_landlord_returns_none_when_no_landlord(self):
        g = GameRound(1)
        for i in range(3):
            g._on_join(PlayerFactory.make(i, -1))
        self.assertIsNone(g.landlord)

    def test_landlord_finds_landlord_player(self):
        g = GameRound(1)
        p0 = PlayerFactory.make(1, 0, landlord=1)
        PlayerFactory.make(2, 1)
        g._on_join(p0)
        g._on_join(PlayerFactory.make(2, 1))
        g._on_join(PlayerFactory.make(3, 2))
        self.assertIs(g.landlord, p0)

    def test_landlord_skips_empty_seats(self):
        g = GameRound(1)
        g.players = [None, PlayerFactory.make(2, 1), PlayerFactory.make(3, 2, landlord=1)]
        self.assertIsNotNone(g.landlord)
        self.assertEqual(g.landlord.uid, 3)

    def test_remove_player_clears_slot(self):
        g = GameRound(1)
        p1 = PlayerFactory.make(1, -1)
        g._on_join(p1)
        g._on_join(PlayerFactory.make(2, -1))
        seat = g.remove_player(p1)
        self.assertEqual(seat, 0)
        self.assertIsNone(g.players[0])

    def test_remove_player_returns_minus_one_for_missing(self):
        g = GameRound(1)
        result = g.remove_player(PlayerFactory.make(99, -1))
        self.assertEqual(result, -1)


class GameRoundTurnTest(unittest.TestCase):
    def test_turn_player_returns_current(self):
        g = GameRound(1)
        p0 = PlayerFactory.make(1, 0)
        g.players = [p0, PlayerFactory.make(2, 1), PlayerFactory.make(3, 2)]
        g.whose_turn = 1
        self.assertIs(g.turn_player, g.players[1])

    def test_prev_player_computes_correctly(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), PlayerFactory.make(3, 2)]
        g.whose_turn = 0
        self.assertIs(g.prev_player, g.players[2])

    def test_next_player_computes_correctly(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), PlayerFactory.make(3, 2)]
        g.whose_turn = 1
        self.assertIs(g.next_player, g.players[2])

    def test_go_next_turn_advances_to_next_non_left(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), PlayerFactory.make(3, 2)]
        g.whose_turn = 0
        g.go_next_turn()
        self.assertEqual(g.whose_turn, 1)

    def test_go_next_turn_skips_left_player(self):
        g = GameRound(1)
        g.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1, left=True),
            PlayerFactory.make(3, 2),
        ]
        g.whose_turn = 0
        g.go_next_turn()
        self.assertEqual(g.whose_turn, 2)

    def test_go_next_turn_skips_empty_seat(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), None, PlayerFactory.make(3, 2)]
        g.whose_turn = 0
        g.go_next_turn()
        self.assertEqual(g.whose_turn, 2)

    def test_go_prev_turn_goes_back(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), PlayerFactory.make(3, 2)]
        g.whose_turn = 1
        g.go_prev_turn()
        self.assertEqual(g.whose_turn, 0)

    def test_go_prev_turn_skips_left(self):
        g = GameRound(1)
        g.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1, left=True),
            PlayerFactory.make(3, 2),
        ]
        g.whose_turn = 2
        g.go_prev_turn()
        self.assertEqual(g.whose_turn, 0)


class GameRoundRobTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]
        self.g.players = self.players
        self.g.pokers = [1, 14, 27]
        self.g.landlord_seat = 1

    def test_rob_returns_false_when_not_full(self):
        g = GameRound(2)
        g._on_join(PlayerFactory.make(1, -1))
        self.assertFalse(g.on_rob(g.players[0]) if hasattr(g, 'players') else False)

    def test_rob_doubles_multiple_when_rob_equals_one(self):
        before = self.g._multiple_details['rob']
        p = self.players[1]
        p.rob = 1
        self.g.on_rob(p)
        self.assertEqual(self.g._multiple_details['rob'], before * 2)

    def test_rob_not_ended_advances_turn(self):
        p = self.players[1]
        p.rob = 1
        result = self.g.on_rob(p)
        self.assertFalse(result)

    def test_rob_ended_assigns_landlord_when_one_player_robs(self):
        self.players[1].rob = 1
        self.g.on_rob(self.players[1])
        self.players[2].rob = 0
        self.g.on_rob(self.players[2])
        self.players[0].rob = 0
        result = self.g.on_rob(self.players[0])
        self.assertTrue(result)
        self.assertEqual(self.players[1].landlord, 1)

    def test_rob_ended_assigns_landlord_when_nobody_robs(self):
        self.g.landlord_seat = 0
        self.players[0].rob = 0
        self.g.on_rob(self.players[0])
        self.players[1].rob = 0
        self.g.on_rob(self.players[1])
        self.players[2].rob = 0
        result = self.g.on_rob(self.players[2])
        self.assertTrue(result)
        self.assertEqual(self.players[0].landlord, 1)


class GameRoundRobEndTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.g.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]

    def test_not_ended_when_next_has_not_robbed(self):
        self.g.whose_turn = 0
        self.g.players[1].rob = -1
        self.assertFalse(self.g._is_rob_end())

    def test_ended_when_next_is_not_dealer_and_decided(self):
        self.g.landlord_seat = 0
        self.g.whose_turn = 0
        self.g.players[1].rob = 0
        self.assertTrue(self.g._is_rob_end())

    def test_ended_when_dealer_passed(self):
        self.g.landlord_seat = 1
        self.g.whose_turn = 0
        self.g.players[1].rob = 0
        self.assertTrue(self.g._is_rob_end())

    def test_ended_when_all_farmers_passed_after_dealer_robbed(self):
        self.g.landlord_seat = 1
        self.g.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]
        self.g.players[0].rob = 0
        self.g.players[1].rob = 1
        self.g.players[2].rob = 0
        self.g.whose_turn = 0
        self.assertTrue(self.g._is_rob_end())

    def test_not_ended_one_farmer_robbed_after_dealer_robbed(self):
        self.g.landlord_seat = 1
        self.g.players[0].rob = 0
        self.g.players[1].rob = 1
        self.g.players[2].rob = 1
        self.g.whose_turn = 0
        self.assertFalse(self.g._is_rob_end())

    def test_not_ended_turn_player_also_robbed(self):
        self.g.landlord_seat = 1
        self.g.players[0].rob = 1
        self.g.players[1].rob = 1
        self.g.players[2].rob = 0
        self.g.whose_turn = 0
        self.assertFalse(self.g._is_rob_end())


class GameRoundShotTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.g.players = [
            PlayerFactory.make(1, 0),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = []
        self.g.bomb_multiple = 2

    def test_valid_shot_updates_last_shot(self):
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = [3]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = 'single'
            mock_rule.compare_pokers.return_value = 1
            result = self.g.on_shot(1, [4])
        self.assertEqual(result, '')
        self.assertEqual(self.g.last_shot_seat, 1)
        self.assertEqual(self.g.last_shot_poker, [4])

    def test_invalid_spec_returns_error(self):
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = None
            result = self.g.on_shot(1, [4])
        self.assertEqual(result, 'Poker does not comply with the rules')

    def test_smaller_than_last_returns_error(self):
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = [10]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = 'single'
            mock_rule.compare_pokers.return_value = -1
            result = self.g.on_shot(1, [4])
        self.assertEqual(result, 'Poker small than last shot')

    def test_bomb_doubles_multiple(self):
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = 'bomb'
            mock_rule.compare_pokers.return_value = 1
            before = self.g._multiple_details['bomb']
            self.g.on_shot(1, [10, 10, 10, 10])
        self.assertEqual(self.g._multiple_details['bomb'], before * 2)

    def test_rocket_doubles_multiple(self):
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = [3]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = 'rocket'
            mock_rule.compare_pokers.return_value = 1
            before = self.g._multiple_details['bomb']
            self.g.on_shot(1, [53, 54])
        self.assertEqual(self.g._multiple_details['bomb'], before * 2)

    def test_pass_appends_empty_shot(self):
        self.g.last_shot_seat = 1
        self.g.last_shot_poker = [4]
        result = self.g.on_shot(0, [])
        self.assertEqual(result, '')
        self.assertEqual(self.g.shot_round, [[]])

    def test_pass_not_allowed_when_own_last_shot(self):
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = [4]
        result = self.g.on_shot(0, [])
        self.assertEqual(result, 'Last shot player does not allow pass')

    def test_shot_appends_to_round(self):
        self.g.last_shot_seat = 0
        self.g.last_shot_poker = [3]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_poker_spec.return_value = 'single'
            mock_rule.compare_pokers.return_value = 1
            self.g.on_shot(1, [4])
        self.assertEqual(self.g.shot_round, [[4]])


class GameRoundDoubleTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.g.players = [
            PlayerFactory.make(1, 0, landlord=1),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]
        self.g._double_decisions = {}

    def test_on_double_without_landlord_returns_true(self):
        g = GameRound(2)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), None]
        g._double_decisions = {}
        self.assertTrue(g.on_double(g.players[0], 0))

    def test_on_double_farmer_choice_zero(self):
        p = self.g.players[1]
        self.g.double_turn_seat = 1
        result = self.g.on_double(p, 0)
        self.assertIn(p.uid, self.g._double_decisions)
        self.assertEqual(self.g._double_decisions[p.uid], 0)
        self.assertFalse(result)

    def test_on_double_farmer_choice_one_updates_farmer_multiple(self):
        p = self.g.players[1]
        self.g.double_turn_seat = 1
        before = self.g._multiple_details['farmer']
        self.g.on_double(p, 1)
        self.assertEqual(self.g._multiple_details['farmer'], before * 2)

    def test_on_double_landlord_choice_one_updates_landlord_multiple(self):
        p = self.g.players[0]
        self.g.double_turn_seat = 0
        before = self.g._multiple_details['landlord']
        self.g.on_double(p, 1)
        self.assertEqual(self.g._multiple_details['landlord'], before * 2)

    def test_on_double_returns_true_when_all_decided(self):
        for p in self.g.players:
            self.g.double_turn_seat = p.seat
            self.g.on_double(p, 0)
        result = self.g.on_double(self.g.players[2], 0)
        self.assertTrue(result)


class GameRoundNextDoubleSeatTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.g.players = [
            PlayerFactory.make(1, 0, landlord=1),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]

    def test_returns_next_undecided_seat(self):
        self.g._double_decisions = {1: 0}
        next_seat = self.g._next_double_seat(0)
        self.assertEqual(next_seat, 1)

    def test_skips_left_player(self):
        self.g.players[2].set_left(1)
        self.g._double_decisions = {}
        next_seat = self.g._next_double_seat(0)
        self.assertEqual(next_seat, 1)

    def test_returns_none_when_all_decided(self):
        self.g._double_decisions = {1: 0, 2: 0, 3: 0}
        next_seat = self.g._next_double_seat(2)
        self.assertIsNone(next_seat)


class GameRoundRestartTest(unittest.TestCase):
    def test_restart_resets_state_keeps_players(self):
        g = GameRound(1)
        p1 = PlayerFactory.make(1, 0)
        p2 = PlayerFactory.make(2, 1)
        g.players = [p1, p2, None]
        g.pokers = [53, 54, 3]
        g.whose_turn = 2
        g.last_shot_seat = 2
        g.last_shot_poker = [3]
        g.shot_round = [[3]]
        g._multiple_details['bomb'] = 4

        g.restart()

        self.assertEqual(g.players, [p1, p2, None])
        self.assertEqual(g.pokers, [])
        self.assertEqual(g.whose_turn, 0)
        self.assertEqual(g.last_shot_seat, 0)
        self.assertEqual(g.last_shot_poker, [])
        self.assertEqual(g.shot_round, [])
        self.assertEqual(g._multiple_details['bomb'], 1)

    def test_restart_does_not_reset_landlord_seat(self):
        g = GameRound(1)
        g.landlord_seat = 2
        g.restart()
        self.assertEqual(g.landlord_seat, 2)

    def test_restart_skips_left_players(self):
        g = GameRound(1)
        p1 = PlayerFactory.make(1, 0)
        p2 = PlayerFactory.make(2, 1, left=True)
        g.players = [p1, p2, None]
        p1.ready = 1
        p1.rob = 1
        p1.landlord = 1
        g.restart()
        self.assertEqual(p1.ready, 0)
        self.assertEqual(p1.rob, -1)
        self.assertEqual(p1.landlord, 0)


class GameRoundMultipleTest(unittest.TestCase):
    def test_multiple_default_value(self):
        g = GameRound(1)
        self.assertEqual(g.multiple, 15)

    def test_multiple_reflects_bomb(self):
        g = GameRound(1)
        g._multiple_details['bomb'] = 4
        self.assertEqual(g.multiple, 60)

    def test_re_multiple_jokers_double_per_joker(self):
        g = GameRound(1)
        g.pokers = [53, 54, 3]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_joker_no.return_value = 2
            g.re_multiple()
        self.assertEqual(g._multiple_details['di'], 4)

    def test_re_multiple_same_color(self):
        g = GameRound(1)
        g.pokers = [1, 14, 27]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_joker_no.return_value = 0
            mock_rule.is_same_color.return_value = True
            mock_rule.is_short_seq.return_value = False
            g.re_multiple()
        self.assertEqual(g._multiple_details['di'], 2)

    def test_re_multiple_short_seq(self):
        g = GameRound(1)
        g.pokers = [1, 14, 27]
        with patch('api.game.rule.rule') as mock_rule:
            mock_rule.get_joker_no.return_value = 0
            mock_rule.is_same_color.return_value = False
            mock_rule.is_short_seq.return_value = True
            g.re_multiple()
        self.assertEqual(g._multiple_details['di'], 2)


class GameRoundScoringTest(unittest.TestCase):
    def setUp(self):
        self.g = GameRound(1)
        self.players = [
            PlayerFactory.make(1, 0, landlord=1),
            PlayerFactory.make(2, 1),
            PlayerFactory.make(3, 2),
        ]
        self.g.players = self.players
        self.g.shot_round = [[3], [], [], [4]]

    def test_get_point_landlord_wins_charges_farmers(self):
        winner = self.players[0]
        self.assertEqual(self.g.get_point(winner, self.players[0]), 300)
        self.assertEqual(self.g.get_point(winner, self.players[1]), -150)
        self.assertEqual(self.g.get_point(winner, self.players[2]), -150)

    def test_get_point_farmer_wins_charges_landlord_twice(self):
        winner = self.players[1]
        self.assertEqual(self.g.get_point(winner, self.players[0]), -300)
        self.assertEqual(self.g.get_point(winner, self.players[1]), 150)
        self.assertEqual(self.g.get_point(winner, self.players[2]), 150)

    def test_is_spring_true_when_farmers_never_play(self):
        self.assertTrue(self.g.is_spring(self.players[0]))

    def test_is_spring_false_when_any_farmer_plays(self):
        self.g.shot_round = [[3], [4], [], [5]]
        self.assertFalse(self.g.is_spring(self.players[0]))

    def test_is_spring_false_for_farmer_winner(self):
        self.assertFalse(self.g.is_spring(self.players[1]))

    def test_anti_spring_true_when_landlord_only_plays_once(self):
        self.g.shot_round = [[3], [4], [5], [], [6]]
        self.assertTrue(self.g.anti_spring(self.players[1]))

    def test_anti_spring_false_when_landlord_plays_again(self):
        self.g.shot_round = [[3], [4], [5], [6]]
        self.assertFalse(self.g.anti_spring(self.players[1]))

    def test_anti_spring_false_for_landlord_winner(self):
        self.assertFalse(self.g.anti_spring(self.players[0]))


class GameRoundHasRobotTest(unittest.TestCase):
    def test_has_robot_false_when_no_robot_flag(self):
        g = GameRound(1)
        g.players = [PlayerFactory.make(1, 0), PlayerFactory.make(2, 1), None]
        self.assertFalse(g.has_robot())

    def test_has_robot_true_when_robot_flag(self):
        g = GameRound(1)
        p = PlayerFactory.make(1, 0)
        p._is_robot = True
        g.players = [p, PlayerFactory.make(2, 1), None]
        self.assertTrue(g.has_robot())


class GameRoundMetadataTest(unittest.TestCase):
    def test_eq_matches_by_room_id(self):
        self.assertEqual(GameRound(1), GameRound(1))
        self.assertNotEqual(GameRound(1), GameRound(2))

    def test_hash_is_room_id(self):
        self.assertEqual(hash(GameRound(42)), 42)

    def test_str_format(self):
        result = str(GameRound(1))
        self.assertIn('1', result)


if __name__ == '__main__':
    unittest.main()
