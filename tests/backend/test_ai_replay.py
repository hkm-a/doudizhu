import unittest
from unittest.mock import patch

from ai.policy import DouZeroConfig
from ai.replay import ReplayError, ReplaySkipped, build_douzero_replay_policy, run_fixed_replay


class OpeningPassPolicy:
    def choose_rob(self, player):
        return 0

    def choose_shot(self, player, room):
        return []


class MissingCardPolicy:
    def choose_rob(self, player):
        return 0

    def choose_shot(self, player, room):
        return [54]


class FixedReplayTest(unittest.TestCase):
    def test_rule_policy_fixed_replay_finishes_with_legal_steps(self):
        result = run_fixed_replay()

        self.assertIn(result.winner_seat, (0, 1, 2))
        self.assertGreater(len(result.steps), 0)
        self.assertLess(len(result.steps), 200)
        self.assertEqual(result.shot_round, [step.shot for step in result.steps])
        self.assertEqual(result.steps[-1].hand_after, [])

        for step in result.steps:
            for poker in step.shot:
                self.assertIn(poker, step.hand_before)
                self.assertNotIn(poker, step.hand_after)

    def test_replay_rejects_policy_that_passes_opening_turn(self):
        with self.assertRaisesRegex(ReplayError, 'Last shot player does not allow pass'):
            run_fixed_replay(policy=OpeningPassPolicy())

    def test_replay_rejects_policy_that_plays_missing_card(self):
        with self.assertRaisesRegex(ReplayError, 'shot contains poker not in hand'):
            run_fixed_replay(policy=MissingCardPolicy(), bottom_pokers=[1, 2, 3])

    def test_replay_validates_three_hands(self):
        with self.assertRaisesRegex(ValueError, 'exactly three hands'):
            run_fixed_replay(hands=[[3], [4]])


class DouZeroReplayPolicyTest(unittest.TestCase):
    def test_skips_when_douzero_is_disabled(self):
        with self.assertRaisesRegex(ReplaySkipped, 'DOUZERO_ENABLED'):
            build_douzero_replay_policy(DouZeroConfig(enabled=False, model_dir=None))

    def test_skips_when_douzero_policy_is_unavailable(self):
        with patch('ai.replay.DouZeroPolicy') as policy_class:
            policy_class.return_value.available = False
            policy_class.return_value.disabled_reason = 'missing model files'

            with self.assertRaisesRegex(ReplaySkipped, 'missing model files'):
                build_douzero_replay_policy(DouZeroConfig(enabled=True, model_dir='/models'))

    def test_returns_available_policy(self):
        with patch('ai.replay.DouZeroPolicy') as policy_class:
            policy_class.return_value.available = True

            policy = build_douzero_replay_policy(DouZeroConfig(enabled=True, model_dir='/models'))

        self.assertIs(policy, policy_class.return_value)


if __name__ == '__main__':
    unittest.main()
