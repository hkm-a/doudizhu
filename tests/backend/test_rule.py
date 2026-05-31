import unittest

from api.game.rule import rule


class RuleCardSpecTest(unittest.TestCase):
    def test_recognizes_basic_card_types(self):
        cases = [
            ([3], 'single'),
            ([3, 16], 'pair'),
            ([3, 16, 29], 'trio'),
            ([3, 16, 29, 42], 'bomb'),
            ([53, 54], 'rocket'),
            ([3, 4, 5, 6, 7], 'seq_single5'),
            ([3, 16, 4, 17, 5, 18], 'seq_pair3'),
        ]

        for pokers, expected in cases:
            with self.subTest(pokers=pokers):
                self.assertEqual(rule.get_poker_spec(pokers), expected)

    def test_rejects_invalid_card_shapes(self):
        for pokers in ([3, 4], [53, 54, 3], [2, 3, 4, 5, 6]):
            with self.subTest(pokers=pokers):
                self.assertIsNone(rule.get_poker_spec(pokers))


class RuleCompareTest(unittest.TestCase):
    def test_compares_same_type_by_rank(self):
        self.assertGreater(rule.compare_pokers([4], [3]), 0)
        self.assertEqual(rule.compare_pokers([3, 16], [3, 16]), 0)
        self.assertLess(rule.compare_pokers([3, 16], [4, 17]), 0)

    def test_bomb_and_rocket_beat_regular_cards(self):
        self.assertGreater(rule.compare_pokers([3, 16, 29, 42], [52]), 0)
        self.assertGreater(rule.compare_pokers([53, 54], [3, 16, 29, 42]), 0)

    def test_regular_cards_do_not_beat_different_non_bomb_shapes(self):
        self.assertEqual(rule.compare_pokers([4], [3, 16]), 0)


class RuleStrategyTest(unittest.TestCase):
    def test_find_best_shot_plays_complete_hand_when_possible(self):
        shot = rule.find_best_shot([3, 4, 5, 6, 7])

        self.assertEqual(rule.get_poker_spec(shot), 'seq_single5')
        self.assertEqual(set(shot), {3, 4, 5, 6, 7})

    def test_find_best_follow_returns_smallest_winning_single(self):
        follow = rule.find_best_follow([4, 5, 53], [3], ally=False)

        self.assertEqual(rule.get_poker_spec(follow), 'single')
        self.assertGreater(rule.compare_pokers(follow, [3]), 0)
        self.assertEqual(follow, [4])

    def test_find_best_follow_cannot_beat_rocket(self):
        self.assertEqual(rule.find_best_follow([3, 16, 29, 42], [53, 54], ally=False), [])


class RuleHelperTest(unittest.TestCase):
    def test_same_color_requires_same_suit_bucket(self):
        self.assertTrue(rule.is_same_color([3, 4, 5]))
        self.assertFalse(rule.is_same_color([3, 16]))

    def test_short_sequence_excludes_twos_and_jokers(self):
        self.assertTrue(rule.is_short_seq([3, 4, 5, 6, 7]))
        self.assertFalse(rule.is_short_seq([2, 3, 4, 5, 6]))
        self.assertFalse(rule.is_short_seq([3, 4, 5, 6, 53]))


if __name__ == '__main__':
    unittest.main()
