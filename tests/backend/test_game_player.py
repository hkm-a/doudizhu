import unittest

from game.player import PureGamePlayer


class PureGamePlayerInitTest(unittest.TestCase):
    def test_constructor_sets_all_fields(self):
        p = PureGamePlayer(1, 'alice', sex=0, avatar='ava.png', point=500)
        self.assertEqual(p.uid, 1)
        self.assertEqual(p.name, 'alice')
        self.assertEqual(p.sex, 0)
        self.assertEqual(p.avatar, 'ava.png')
        self.assertEqual(p.point, 500)
        self.assertEqual(p.seat, -1)
        self.assertEqual(p.ready, 0)
        self.assertEqual(p.rob, -1)
        self.assertEqual(p.landlord, 0)
        self.assertEqual(p.is_left(), False)
        self.assertEqual(p.hand_pokers, [])
        self.assertEqual(p._is_robot, False)

    def test_constructor_defaults(self):
        p = PureGamePlayer(2, 'bob')
        self.assertEqual(p.sex, 1)
        self.assertEqual(p.avatar, '')
        self.assertEqual(p.point, 1000)

    def test_constructor_normalizes_negative_point_to_zero(self):
        p = PureGamePlayer(3, 'bad', point=-100)
        self.assertEqual(p.point, 0)

    def test_constructor_normalizes_non_numeric_point_to_zero(self):
        p = PureGamePlayer(4, 'invalid', point=None)
        self.assertEqual(p.point, 0)

    def test_constructor_accepts_float_point(self):
        p = PureGamePlayer(5, 'float', point=50.7)
        self.assertEqual(p.point, 50.7)


class PureGamePlayerStateTest(unittest.TestCase):
    def setUp(self):
        self.p = PureGamePlayer(1, 'test')
        self.p._hand_pokers = [3, 17, 31]
        self.p.rob = 1
        self.p.landlord = 1
        self.p._ready = 1

    def test_restart_resets_all_game_state(self):
        self.p.restart()
        self.assertEqual(self.p.ready, 0)
        self.assertEqual(self.p.hand_pokers, [])
        self.assertEqual(self.p.rob, -1)
        self.assertEqual(self.p.landlord, 0)

    def test_push_pokers_adds_to_hand(self):
        p = PureGamePlayer(2, 'pusher')
        p.push_pokers([5, 10])
        self.assertEqual(p.hand_pokers, [5, 10])
        p.push_pokers([15])
        self.assertEqual(p.hand_pokers, [5, 10, 15])

    def test_is_left_true_after_set_left(self):
        self.assertFalse(self.p.is_left())
        self.p.set_left(1)
        self.assertTrue(self.p.is_left())

    def test_is_left_false_after_set_left_zero(self):
        self.p.set_left(1)
        self.p.set_left(0)
        self.assertFalse(self.p.is_left())

    def test_timeout_returns_20_for_active_player(self):
        self.assertEqual(self.p.timeout, 20)

    def test_timeout_returns_0_for_left_player(self):
        self.p.set_left(1)
        self.assertEqual(self.p.timeout, 0)


class PureGamePlayerReadyTest(unittest.TestCase):
    def test_ready_getter_and_setter(self):
        p = PureGamePlayer(1, 'ready')
        self.assertEqual(p.ready, 0)
        p.ready = 1
        self.assertEqual(p.ready, 1)
        p.ready = 0
        self.assertEqual(p.ready, 0)


class PureGamePlayerStaticTest(unittest.TestCase):
    def test_normalize_point_positive(self):
        self.assertEqual(PureGamePlayer.normalize_point(500), 500)

    def test_normalize_point_zero(self):
        self.assertEqual(PureGamePlayer.normalize_point(0), 0)

    def test_normalize_point_negative_clamps_to_zero(self):
        self.assertEqual(PureGamePlayer.normalize_point(-10), 0)

    def test_normalize_point_float_preserved(self):
        self.assertEqual(PureGamePlayer.normalize_point(50.7), 50.7)

    def test_normalize_point_none_returns_zero(self):
        self.assertEqual(PureGamePlayer.normalize_point(None), 0)

    def test_normalize_point_string_returns_zero(self):
        self.assertEqual(PureGamePlayer.normalize_point('bad'), 0)

    def test_is_valid_poker_list_accepts_list_of_ints(self):
        self.assertTrue(PureGamePlayer._is_valid_poker_list([1, 2, 54]))

    def test_is_valid_poker_list_accepts_tuple(self):
        self.assertTrue(PureGamePlayer._is_valid_poker_list((1, 2, 3)))

    def test_is_valid_poker_list_rejects_non_sequence(self):
        self.assertFalse(PureGamePlayer._is_valid_poker_list(42))

    def test_is_valid_poker_list_rejects_out_of_range(self):
        self.assertFalse(PureGamePlayer._is_valid_poker_list([0, 1, 2]))

    def test_is_valid_poker_list_rejects_above_54(self):
        self.assertFalse(PureGamePlayer._is_valid_poker_list([1, 55]))

    def test_is_valid_poker_list_rejects_non_int(self):
        self.assertFalse(PureGamePlayer._is_valid_poker_list([1, '2']))

    def test_is_protocol_bit_accepts_0(self):
        self.assertTrue(PureGamePlayer._is_protocol_bit(0))

    def test_is_protocol_bit_accepts_1(self):
        self.assertTrue(PureGamePlayer._is_protocol_bit(1))

    def test_is_protocol_bit_rejects_2(self):
        self.assertFalse(PureGamePlayer._is_protocol_bit(2))

    def test_is_protocol_bit_accepts_bool_as_int_subclass(self):
        self.assertTrue(PureGamePlayer._is_protocol_bit(True))

    def test_is_protocol_bit_rejects_string(self):
        self.assertFalse(PureGamePlayer._is_protocol_bit('1'))


class PureGamePlayerSyncDataTest(unittest.TestCase):
    def test_sync_data_with_real_includes_pokers(self):
        p = PureGamePlayer(1, 'alice', point=800)
        p._hand_pokers = [3, 17, 31]
        p.rob = 1
        p.landlord = 1
        data = p.sync_data(real=True)
        self.assertEqual(data['uid'], 1)
        self.assertEqual(data['name'], 'alice')
        self.assertEqual(data['point'], 800)
        self.assertEqual(data['rob'], 1)
        self.assertEqual(data['landlord'], 1)
        self.assertEqual(data['pokers'], [3, 17, 31])

    def test_sync_data_without_real_hides_pokers(self):
        p = PureGamePlayer(2, 'bob')
        p._hand_pokers = [5, 10]
        data = p.sync_data(real=False)
        self.assertNotIn('pokers', data)


class PureGamePlayerEqualityTest(unittest.TestCase):
    def test_eq_matches_by_uid(self):
        a = PureGamePlayer(1, 'alice')
        b = PureGamePlayer(1, 'bob')
        self.assertEqual(a, b)

    def test_eq_mismatch_by_uid(self):
        a = PureGamePlayer(1, 'alice')
        b = PureGamePlayer(2, 'bob')
        self.assertNotEqual(a, b)

    def test_eq_rejects_non_pure_game_player(self):
        a = PureGamePlayer(1, 'alice')
        self.assertNotEqual(a, None)
        self.assertNotEqual(a, 'not a player')

    def test_hash_is_uid(self):
        p = PureGamePlayer(42, 'answer')
        self.assertEqual(hash(p), 42)

    def test_str_repr_format(self):
        p = PureGamePlayer(7, 'seven')
        self.assertEqual(str(p), '7-seven')
        self.assertEqual(repr(p), '7-seven')


if __name__ == '__main__':
    unittest.main()
