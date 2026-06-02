import json
import os
import tempfile
import unittest
from unittest.mock import patch

from ai.decision_log import AiDecisionLogger, decision_event, get_decision_logger


class PlayerStub:
    uid = 10001
    seat = 2
    landlord = 0
    hand_pokers = [3, 16, 53]


class RoomStub:
    room_id = 7
    level = 1
    landlord_seat = 0
    last_shot_seat = 1
    last_shot_poker = [4]
    shot_round = [[3], [], [4]]
    multiple = 30


class AiDecisionLoggerTest(unittest.TestCase):
    def tearDown(self):
        get_decision_logger.cache_clear()

    def test_disabled_logger_does_not_write(self):
        logger = AiDecisionLogger(None)

        self.assertFalse(logger.enabled)
        self.assertFalse(logger.log({'policy': 'rule'}))

    def test_writes_jsonl_records_and_creates_parent_directory(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, 'nested', 'ai-decisions.jsonl')
            logger = AiDecisionLogger(path)

            self.assertTrue(logger.enabled)
            self.assertTrue(logger.log({'policy': 'rule', 'decision': [3]}))
            self.assertTrue(logger.log({'policy': 'douzero', 'decision': []}))

            with open(path, encoding='utf-8') as log_file:
                records = [json.loads(line) for line in log_file]

        self.assertEqual([record['policy'] for record in records], ['rule', 'douzero'])
        self.assertEqual(records[0]['decision'], [3])
        self.assertIn('timestamp', records[0])

    def test_get_decision_logger_reads_environment_once(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, 'ai.jsonl')
            with patch.dict(os.environ, {'AI_DECISION_LOG_PATH': path}):
                logger = get_decision_logger()

            self.assertEqual(logger.path, path)


class AiDecisionEventTest(unittest.TestCase):
    def test_builds_sanitized_context_without_player_name(self):
        event = decision_event('rule', 'shot', PlayerStub(), RoomStub(), decision=[3], reason='test')

        self.assertEqual(event['policy'], 'rule')
        self.assertEqual(event['mode'], 'shot')
        self.assertEqual(event['player'], {
            'uid': 10001,
            'seat': 2,
            'landlord': 0,
            'hand_pokers': [3, 16, 53],
        })
        self.assertEqual(event['room'], {
            'id': 7,
            'level': 1,
            'landlord_seat': 0,
            'last_shot_seat': 1,
            'last_shot_poker': [4],
            'shot_round_count': 3,
            'multiple': 30,
        })
        self.assertEqual(event['decision'], [3])
        self.assertEqual(event['reason'], 'test')


if __name__ == '__main__':
    unittest.main()
