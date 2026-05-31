import os
import tempfile
import unittest
from unittest.mock import patch

from ai.policy import DouZeroConfig, DouZeroPolicy, RuleBasedPolicy


class StubFallback:
    def __init__(self):
        self.rob_calls = []
        self.shot_calls = []

    def choose_rob(self, player):
        self.rob_calls.append(player)
        return 1

    def choose_shot(self, player, room):
        self.shot_calls.append((player, room))
        return [3, 4, 5]


class PlayerStub:
    def __init__(self, hand_pokers=None, seat=0, landlord=0):
        self.hand_pokers = hand_pokers or []
        self.seat = seat
        self.landlord = landlord


class RoomStub:
    def __init__(self):
        self.last_shot_poker = []
        self.last_shot_seat = -1
        self.players = []


class DouZeroConfigTest(unittest.TestCase):
    def test_reads_disabled_env_by_default(self):
        with patch.dict(os.environ, {}, clear=True):
            config = DouZeroConfig.from_env()

        self.assertFalse(config.enabled)
        self.assertIsNone(config.model_dir)

    def test_accepts_common_truthy_flags(self):
        for value in ('1', 'true', 'yes', 'on', ' TRUE '):
            with self.subTest(value=value):
                with patch.dict(os.environ, {'DOUZERO_ENABLED': value, 'DOUZERO_MODEL_DIR': '/models'}, clear=True):
                    config = DouZeroConfig.from_env()

                self.assertTrue(config.enabled)
                self.assertEqual(config.model_dir, '/models')

    def test_rejects_non_truthy_flags(self):
        for value in ('0', 'false', 'no', 'off', 'maybe'):
            with self.subTest(value=value):
                with patch.dict(os.environ, {'DOUZERO_ENABLED': value}, clear=True):
                    self.assertFalse(DouZeroConfig.from_env().enabled)


class DouZeroPolicyTest(unittest.TestCase):
    def test_disabled_policy_delegates_to_fallback(self):
        fallback = StubFallback()
        policy = DouZeroPolicy(DouZeroConfig(enabled=False, model_dir=None), fallback=fallback)
        player = PlayerStub()
        room = RoomStub()

        self.assertFalse(policy.available)
        self.assertEqual(policy.disabled_reason, 'DOUZERO_ENABLED is not set')
        self.assertEqual(policy.choose_rob(player), 1)
        self.assertEqual(policy.choose_shot(player, room), [3, 4, 5])
        self.assertEqual(fallback.rob_calls, [player])
        self.assertEqual(fallback.shot_calls, [(player, room)])

    def test_enabled_policy_without_model_dir_explains_fallback(self):
        fallback = StubFallback()
        with patch('ai.policy.logger.warning'):
            policy = DouZeroPolicy(DouZeroConfig(enabled=True, model_dir=None), fallback=fallback)

        self.assertFalse(policy.available)
        self.assertEqual(policy.disabled_reason, 'DOUZERO_MODEL_DIR is not set')

    def test_incomplete_model_dir_lists_missing_files(self):
        with tempfile.TemporaryDirectory() as model_dir:
            with open(os.path.join(model_dir, 'landlord.ckpt'), 'w'):
                pass
            with patch('ai.policy.logger.warning'):
                policy = DouZeroPolicy(DouZeroConfig(enabled=True, model_dir=model_dir), fallback=StubFallback())

        self.assertFalse(policy.available)
        self.assertIn('landlord_up.ckpt', policy.disabled_reason)
        self.assertIn('landlord_down.ckpt', policy.disabled_reason)


class RuleBasedPolicyTest(unittest.TestCase):
    def test_rob_requires_four_high_cards(self):
        policy = RuleBasedPolicy()

        self.assertEqual(policy.choose_rob(PlayerStub([54, 53, 2])), 0)
        self.assertEqual(policy.choose_rob(PlayerStub([54, 53, 2, 15])), 1)


if __name__ == '__main__':
    unittest.main()
