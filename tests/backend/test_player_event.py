import os
import json
import tempfile
import unittest

from api.player_event import PlayerEventLogger, new_session_id, VALID_EVENT_TYPES, VALID_RESULTS


class PlayerEventLoggerInitTest(unittest.TestCase):
    def test_init_with_path_creates_logger(self):
        logger = PlayerEventLogger('/tmp/test-events.jsonl')
        self.assertTrue(logger.enabled)
        self.assertEqual(logger.path, '/tmp/test-events.jsonl')

    def test_init_without_path_disables_logger(self):
        logger = PlayerEventLogger(None)
        self.assertFalse(logger.enabled)
        self.assertIsNone(logger.path)

    def test_init_with_empty_path_disables_logger(self):
        logger = PlayerEventLogger('')
        self.assertFalse(logger.enabled)


class PlayerEventLoggerEnabledTest(unittest.TestCase):
    def test_enabled_true_when_path_set(self):
        self.assertTrue(PlayerEventLogger('/tmp/x.jsonl').enabled)

    def test_enabled_false_when_path_none(self):
        self.assertFalse(PlayerEventLogger(None).enabled)


class PlayerEventLoggerLogTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.jsonl', delete=False)
        self.tmp.close()
        self.logger = PlayerEventLogger(self.tmp.name)

    def tearDown(self):
        if os.path.exists(self.tmp.name):
            os.unlink(self.tmp.name)

    def test_log_returns_true_and_writes_line(self):
        result = self.logger.log('session_start', player_id=1, room_id=0, session_id='s1')
        self.assertTrue(result)
        with open(self.tmp.name) as f:
            line = json.loads(f.readline())
        self.assertEqual(line['event_type'], 'session_start')
        self.assertEqual(line['player_id'], 1)
        self.assertEqual(line['result'], 'success')

    def test_log_disabled_returns_false(self):
        logger = PlayerEventLogger(None)
        result = logger.log('session_start', player_id=1, room_id=0, session_id='s1')
        self.assertFalse(result)

    def test_log_invalid_event_type_returns_false(self):
        result = self.logger.log('invalid_type', player_id=1, room_id=0, session_id='s1')
        self.assertFalse(result)

    def test_log_invalid_result_returns_false(self):
        result = self.logger.log('session_start', player_id=1, room_id=0, session_id='s1', result='invalid')
        self.assertFalse(result)

    def test_log_with_full_payload(self):
        result = self.logger.log(
            event_type='shot_decision',
            player_id=42,
            room_id=7,
            session_id='abc-123',
            payload={'pokers': [3, 4, 5]},
            duration_ms=150,
            result='success',
            reason='played seq_single5',
        )
        self.assertTrue(result)
        with open(self.tmp.name) as f:
            line = json.loads(f.readline())
        self.assertEqual(line['event_type'], 'shot_decision')
        self.assertEqual(line['payload'], {'pokers': [3, 4, 5]})
        self.assertEqual(line['duration_ms'], 150)
        self.assertEqual(line['reason'], 'played seq_single5')

    def test_log_appends_lines(self):
        self.logger.log('session_start', player_id=1, room_id=0, session_id='s1')
        self.logger.log('session_end', player_id=1, room_id=0, session_id='s1')
        with open(self.tmp.name) as f:
            lines = f.readlines()
        self.assertEqual(len(lines), 2)


class PlayerEventLoggerSegmentTest(unittest.TestCase):
    def test_all_segment_event_types_are_valid(self):
        for t in ('segment_change', 'season_reset', 'elo_update'):
            self.assertIn(t, VALID_EVENT_TYPES)

    def test_all_results_are_valid(self):
        for r in ('success', 'fail', 'timeout', 'cancel'):
            self.assertIn(r, VALID_RESULTS)


class NewSessionIdTest(unittest.TestCase):
    def test_returns_string(self):
        sid = new_session_id()
        self.assertIsInstance(sid, str)
        self.assertGreater(len(sid), 10)

    def test_returns_unique_values(self):
        self.assertNotEqual(new_session_id(), new_session_id())


class PlayerEventLoggerWriteFailureTest(unittest.TestCase):
    def test_log_to_invalid_path_returns_false(self):
        logger = PlayerEventLogger('/nonexistent/dir/events.jsonl')
        result = logger.log('session_start', player_id=1, room_id=0, session_id='s1')
        self.assertFalse(result)

    def test_log_with_payload_includes_all_fields(self):
        logger = PlayerEventLogger('/tmp/test-include-fields.jsonl')
        try:
            logger.log('ready_request', player_id=5, room_id=3, session_id='s2',
                       payload={'ready': 1}, result='success')
            with open('/tmp/test-include-fields.jsonl') as f:
                data = json.loads(f.readline())
            self.assertIn('timestamp', data)
            self.assertEqual(data['player_id'], 5)
            self.assertEqual(data['room_id'], 3)
            self.assertEqual(data['session_id'], 's2')
            self.assertEqual(data['payload'], {'ready': 1})
        finally:
            if os.path.exists('/tmp/test-include-fields.jsonl'):
                os.unlink('/tmp/test-include-fields.jsonl')


class ValidEventTypesTest(unittest.TestCase):
    def test_decision_types_present(self):
        for t in ('rob_decision', 'shot_decision', 'double_decision'):
            self.assertIn(t, VALID_EVENT_TYPES)

    def test_session_types_present(self):
        for t in ('session_start', 'session_end', 'session_abandon'):
            self.assertIn(t, VALID_EVENT_TYPES)

    def test_connection_types_present(self):
        for t in ('disconnect', 'reconnect'):
            self.assertIn(t, VALID_EVENT_TYPES)

    def test_room_types_present(self):
        for t in ('room_create', 'room_join', 'room_leave'):
            self.assertIn(t, VALID_EVENT_TYPES)


if __name__ == '__main__':
    unittest.main()
