import unittest

from api.game.rule import Rule


MINIMAL_RULES = {
    'single': ['3', '4', '5', '6', '7', '8', '9', '0', 'J', 'Q', 'K', 'A', '2', 'w', 'W'],
    'pair': ['33', '44', '55', '66', '77', '88', '99', '00', 'JJ', 'QQ', 'KK', 'AA', '22'],
    'trio': ['333', '444', '555', '666', '777', '888', '999', '000', 'JJJ', 'QQQ', 'KKK', 'AAA', '222'],
    'bomb': ['3333', '4444', '5555', '6666', '7777', '8888', '9999', '0000', 'JJJJ', 'QQQQ', 'KKKK', 'AAAA', '2222'],
    'rocket': ['wW'],
    'trio_single': ['3334', '4445', '5556', '6667', '7778', '8889', '9990', '000J', 'JJJQ', 'QQQK', 'KKKA', 'AAA2', '222w'],
    'trio_pair': ['33344', '44455', '55566', '66677', '77788', '88899', '99900', '000JJ', 'JJJQQ', 'QQQKK', 'KKKAA', 'AAA22', '222WW'],
    'seq_single5': ['34567', '45678', '56789', '67890', '7890J', '890JQ', '90JQK', '0JQKA'],
    'seq_single6': ['345678', '456789', '567890', '67890J', '7890JQ', '890JQK', '90JQKA'],
    'seq_pair3': ['334455', '445566', '556677', '667788', '778899', '889900', '9900JJ', '00JJQQ', 'JJQQKK', 'QQKKAA'],
    'seq_trio2': ['333444', '444555', '555666', '666777', '777888', '888999', '999000', '000JJJ', 'JJJQQQ', 'QQQKKK'],
    'seq_trio_single2': ['33344456', '44455567', '55566678', '66677789', '77788890', '8889990J', '999000JQ', '000JJJQK', 'JJJQQQKA'],
    'seq_trio_pair2': ['3334445566', '4445556677', '5556667788', '6667778899', '7778889900', '88899900JJ', '999000JJQQ', '000JJJQQKK', 'JJJQQQKKAA'],
}


CARD_POKERS = {
    '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
    '0': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 1, '2': 2,
}


class RuleInitTest(unittest.TestCase):
    def setUp(self):
        self.rule = Rule(dict(MINIMAL_RULES))

    def test_cnt_to_specs_groups_by_length(self):
        self.assertIn('single', self.rule.cnt_to_specs[1])
        self.assertIn('pair', self.rule.cnt_to_specs[2])
        self.assertIn('trio', self.rule.cnt_to_specs[3])
        self.assertIn('bomb', self.rule.cnt_to_specs[4])


class RuleGetPokerSpecTest(unittest.TestCase):
    def setUp(self):
        self.rule = Rule(dict(MINIMAL_RULES))

    def test_single(self):
        self.assertEqual(self.rule.get_poker_spec([3]), 'single')

    def test_pair(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16]), 'pair')

    def test_trio(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16, 29]), 'trio')

    def test_bomb(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16, 29, 42]), 'bomb')

    def test_rocket(self):
        self.assertEqual(self.rule.get_poker_spec([53, 54]), 'rocket')

    def test_invalid_returns_none(self):
        self.assertIsNone(self.rule.get_poker_spec([3, 4]))

    def test_trio_single(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16, 29, 4]), 'trio_single')

    def test_trio_pair(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16, 29, 4, 17]), 'trio_pair')

    def test_seq_single5(self):
        self.assertEqual(self.rule.get_poker_spec([3, 4, 5, 6, 7]), 'seq_single5')

    def test_seq_pair3(self):
        self.assertEqual(self.rule.get_poker_spec([3, 16, 4, 17, 5, 18]), 'seq_pair3')


class RuleComparePokerTest(unittest.TestCase):
    def setUp(self):
        self.rule = Rule(dict(MINIMAL_RULES))

    def test_higher_single_beats_lower(self):
        self.assertGreater(self.rule.compare_pokers([4], [3]), 0)

    def test_lower_single_loses(self):
        self.assertLess(self.rule.compare_pokers([3], [4]), 0)

    def test_equal_singles_tie(self):
        self.assertEqual(self.rule.compare_pokers([3], [3]), 0)

    def test_bomb_beats_single(self):
        self.assertGreater(self.rule.compare_pokers([3, 16, 29, 42], [4]), 0)

    def test_rocket_beats_bomb(self):
        self.assertGreater(self.rule.compare_pokers([53, 54], [3, 16, 29, 42]), 0)

    def test_mixed_hand_not_bomb_returns_0(self):
        self.assertEqual(self.rule.compare_pokers([3, 4], [5]), 0)


class RuleToCardsTest(unittest.TestCase):
    def test_three(self):
        self.assertEqual(Rule._to_cards([3]), ['3'])

    def test_ace(self):
        self.assertEqual(Rule._to_cards([1]), ['A'])

    def test_two(self):
        self.assertEqual(Rule._to_cards([2]), ['2'])

    def test_small_joker(self):
        self.assertEqual(Rule._to_cards([53]), ['w'])

    def test_big_joker(self):
        self.assertEqual(Rule._to_cards([54]), ['W'])

    def test_sorts_result(self):
        self.assertEqual(Rule._to_cards([2, 3]), ['3', '2'])

    def test_king(self):
        self.assertEqual(Rule._to_cards([13]), ['K'])


class RuleToPokerTest(unittest.TestCase):
    def test_three(self):
        self.assertEqual(Rule._to_poker('3'), [3, 16, 29, 42])

    def test_small_joker(self):
        self.assertEqual(Rule._to_poker('w'), [53])

    def test_big_joker(self):
        self.assertEqual(Rule._to_poker('W'), [54])

    def test_unknown_returns_question_mark_index(self):
        self.assertEqual(Rule._to_poker('?'), [0, 13, 26, 39])


class RuleToPokersTest(unittest.TestCase):
    def test_picks_first_available_rank(self):
        result = Rule._to_pokers([3, 16, 29, 42, 4, 17], ['3', '4'])
        self.assertEqual(result, [3, 4])


class RuleIsSameColorTest(unittest.TestCase):
    def test_single_card_same_color(self):
        self.assertTrue(Rule.is_same_color([3]))

    def test_different_suits(self):
        self.assertFalse(Rule.is_same_color([3, 16]))

    def test_same_suit(self):
        self.assertTrue(Rule.is_same_color([3, 4]))

    def test_two_different_suits_false(self):
        self.assertFalse(Rule.is_same_color([3, 16]))

    def test_both_jokers_same_color(self):
        self.assertTrue(Rule.is_same_color([53, 54]))


class RuleIsShortSeqTest(unittest.TestCase):
    def test_consecutive_values(self):
        self.assertTrue(Rule.is_short_seq([3, 4, 5]))

    def test_non_consecutive(self):
        self.assertFalse(Rule.is_short_seq([3, 4, 8]))

    def test_rejects_joker(self):
        self.assertFalse(Rule.is_short_seq([3, 53]))

    def test_two_cards_any_arithmetic(self):
        self.assertTrue(Rule.is_short_seq([3, 5]))

    def test_both_jokers_false(self):
        self.assertFalse(Rule.is_short_seq([53, 54]))

    def test_empty_hand_raises(self):
        with self.assertRaises(IndexError):
            Rule.is_short_seq([])


class RuleGetJokerNoTest(unittest.TestCase):
    def test_no_jokers(self):
        self.assertEqual(Rule.get_joker_no([3, 4, 5]), 0)

    def test_one_joker(self):
        self.assertEqual(Rule.get_joker_no([3, 53]), 1)

    def test_both_jokers(self):
        self.assertEqual(Rule.get_joker_no([53, 54]), 2)


class RuleGetSmallBigCardsTest(unittest.TestCase):
    def test_small_excludes_2_and_jokers(self):
        self.assertEqual(Rule.get_small_cards(['3', '4', '2', 'w', 'W']), ['3', '4'])

    def test_big_only_2_and_jokers(self):
        self.assertEqual(Rule.get_big_cards(['3', '4', '2', 'w', 'W']), ['2', 'w', 'W'])


class RuleGetSingleNoTest(unittest.TestCase):
    def test_counts_single_occurrences(self):
        cards = ['3', '4', '3', '5', '5', '6']
        self.assertEqual(Rule.get_single_no(cards), 2)

    def test_no_singles(self):
        self.assertEqual(Rule.get_single_no(['3', '3', '4', '4']), 0)


class RuleIsContainsTest(unittest.TestCase):
    def test_contains_subset(self):
        self.assertTrue(Rule.is_contains(['3', '3', '3', '4'], ['3', '3']))

    def test_not_enough_copies(self):
        self.assertFalse(Rule.is_contains(['3', '4'], ['3', '3']))

    def test_missing_card(self):
        self.assertFalse(Rule.is_contains(['3', '4'], ['5']))


class RuleMinusTest(unittest.TestCase):
    def test_removes_one_copy_per_card(self):
        result = Rule.minus(['3', '3', '4', '5'], ['3', '4'])
        self.assertEqual(result, ['3', '5'])

    def test_removes_exactly_one_match(self):
        result = Rule.minus(['3', '3'], ['3'])
        self.assertEqual(result, ['3'])


class RuleSortCardTest(unittest.TestCase):
    def test_sorts_by_game_order(self):
        result = Rule._sort_card(['2', '3', 'A', 'w', 'W', 'K'])
        self.assertEqual(result, ['3', 'K', 'A', '2', 'w', 'W'])


class RuleSafeIndexOfTest(unittest.TestCase):
    def test_finds_existing(self):
        self.assertEqual(Rule.safe_index_of(MINIMAL_RULES['single'], '5'), 2)

    def test_missing_returns_minus_one(self):
        self.assertEqual(Rule.safe_index_of(MINIMAL_RULES['single'], 'X'), -1)

    def test_wrong_length_returns_minus_one(self):
        self.assertEqual(Rule.safe_index_of(MINIMAL_RULES['single'], '33'), -1)


class RuleFindBestShotTest(unittest.TestCase):
    def setUp(self):
        self.rule = Rule(dict(MINIMAL_RULES))

    def test_single_card(self):
        result = self.rule.find_best_shot([3])
        self.assertEqual(result, [3])

    def test_one_shot_pair(self):
        result = self.rule.find_best_shot([3, 16])
        self.assertEqual(result, [3, 16])

    def test_seq_single5(self):
        result = self.rule.find_best_shot([3, 4, 5, 6, 7])
        self.assertIn(len(result), {5, 1})

    def test_best_shot_empty_hand_raises(self):
        with self.assertRaises(IndexError):
            self.rule.find_best_shot([])


class RuleGetCardsValueTest(unittest.TestCase):
    def setUp(self):
        self.rule = Rule(dict(MINIMAL_RULES))

    def test_rocket_value(self):
        ctype, cval = self.rule._get_cards_value(['w', 'W'])
        self.assertEqual(ctype, 'rocket')

    def test_bomb_value(self):
        ctype, cval = self.rule._get_cards_value(['3', '3', '3', '3'])
        self.assertEqual(ctype, 'bomb')
        self.assertGreaterEqual(cval, 20000)

    def test_single_value(self):
        ctype, cval = self.rule._get_cards_value(['5'])
        self.assertEqual(ctype, 'single')
        self.assertEqual(cval, 2)


if __name__ == '__main__':
    unittest.main()
