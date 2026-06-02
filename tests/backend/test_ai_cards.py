import unittest

from ai.cards import (
    douzero_cards_to_pokers,
    douzero_rank_to_svz_candidates,
    pokers_to_douzero_cards,
    svz_poker_to_douzero_rank,
)


class DouZeroCardMappingTest(unittest.TestCase):
    def test_maps_regular_cards_by_rank_across_suits(self):
        cases = [
            ([3, 16, 29, 42], [3, 3, 3, 3]),
            ([13, 26, 39, 52], [13, 13, 13, 13]),
            ([1, 14, 27, 40], [14, 14, 14, 14]),
            ([2, 15, 28, 41], [17, 17, 17, 17]),
        ]

        for pokers, expected in cases:
            with self.subTest(pokers=pokers):
                self.assertEqual(pokers_to_douzero_cards(pokers), expected)

    def test_maps_jokers_to_douzero_sentinel_ranks(self):
        self.assertEqual(pokers_to_douzero_cards([53, 54]), [20, 30])

    def test_rejects_invalid_svz_ids(self):
        for poker in (0, 55, True, '3'):
            with self.subTest(poker=poker):
                with self.assertRaises(ValueError):
                    svz_poker_to_douzero_rank(poker)

    def test_returns_svz_candidates_for_rank(self):
        self.assertEqual(douzero_rank_to_svz_candidates(3), [3, 16, 29, 42])
        self.assertEqual(douzero_rank_to_svz_candidates(13), [13, 26, 39, 52])
        self.assertEqual(douzero_rank_to_svz_candidates(14), [1, 14, 27, 40])
        self.assertEqual(douzero_rank_to_svz_candidates(17), [2, 15, 28, 41])
        self.assertEqual(douzero_rank_to_svz_candidates(20), [53])
        self.assertEqual(douzero_rank_to_svz_candidates(30), [54])

    def test_rejects_invalid_douzero_rank(self):
        for rank in (0, 2, 15, 16, 18, 19, 21, True, '3'):
            with self.subTest(rank=rank):
                with self.assertRaises(ValueError):
                    douzero_rank_to_svz_candidates(rank)


class DouZeroActionMappingTest(unittest.TestCase):
    def test_maps_rank_action_to_available_concrete_pokers_in_hand_order(self):
        hand = [16, 3, 29, 53, 54, 2, 15]

        self.assertEqual(douzero_cards_to_pokers([3, 3, 20, 30, 17], hand), [16, 3, 53, 54, 2])

    def test_rejects_action_when_hand_lacks_enough_rank_cards(self):
        with self.assertRaises(ValueError):
            douzero_cards_to_pokers([3, 3, 3], [3, 16])

    def test_rejects_invalid_rank_in_action(self):
        with self.assertRaises(ValueError):
            douzero_cards_to_pokers([15], [3, 16])

    def test_rejects_invalid_poker_in_hand(self):
        with self.assertRaises(ValueError):
            douzero_cards_to_pokers([3], [3, 55])


if __name__ == '__main__':
    unittest.main()
