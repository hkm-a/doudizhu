import unittest
from unittest.mock import Mock, patch

from api.game.timer import Timer


class TimerInitTest(unittest.TestCase):
    def test_constructor_stores_callback(self):
        cb = Mock()
        t = Timer(cb)
        self.assertIs(t._callback, cb)

    def test_constructor_doubles_timeout(self):
        t = Timer(Mock(), timeout=10)
        self.assertEqual(t._timeout, 20)

    def test_constructor_not_running(self):
        t = Timer(Mock())
        self.assertFalse(t._is_running)


class TimerTimeoutPropertyTest(unittest.TestCase):
    def test_timeout_returns_remaining_time(self):
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.side_effect = [100, 105]
            t = Timer(Mock(), timeout=10)
            t._timeout = 20
            t._last_time = 100
            remaining = t.timeout
        self.assertEqual(remaining, 15)

    def test_timeout_clamps_to_zero(self):
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.side_effect = [100, 200]
            t = Timer(Mock(), timeout=10)
            t._last_time = 100
            remaining = t.timeout
        self.assertEqual(remaining, 0)


class TimerStartStopTest(unittest.TestCase):
    def test_start_timing_sets_timeout_with_double(self):
        cb = Mock()
        t = Timer(cb)
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 100
            with patch('api.game.timer.IOLoop') as mock_ioloop:
                t.start_timing(15)
        self.assertEqual(t._timeout, 30)
        self.assertEqual(t._last_time, 100)
        self.assertTrue(t._is_running)

    def test_start_timing_keeps_existing_timeout_when_zero(self):
        cb = Mock()
        t = Timer(cb)
        t._timeout = 50
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 100
            with patch('api.game.timer.IOLoop') as mock_ioloop:
                t.start_timing(0)
        self.assertEqual(t._timeout, 50)

    def test_start_timing_schedules_first_poll(self):
        cb = Mock()
        t = Timer(cb)
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 100
            with patch('api.game.timer.IOLoop') as mock_ioloop:
                t.start_timing()
        mock_ioloop.current.return_value.call_later.assert_called_once_with(1, t._on_time)

    def test_start_timing_does_not_reschedule_if_already_running(self):
        cb = Mock()
        t = Timer(cb)
        t._is_running = True
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 100
            with patch('api.game.timer.IOLoop') as mock_ioloop:
                t.start_timing()
        mock_ioloop.current.return_value.call_later.assert_not_called()

    def test_stop_timing_sets_not_running(self):
        t = Timer(Mock())
        t._is_running = True
        t.stop_timing()
        self.assertFalse(t._is_running)


class TimerOnTimeTest(unittest.TestCase):
    def test_on_time_returns_if_not_running(self):
        cb = Mock()
        t = Timer(cb)
        t._is_running = False
        t._on_time()
        cb.assert_not_called()

    def test_on_time_calls_callback_when_expired(self):
        cb = Mock()
        t = Timer(cb)
        t._is_running = True
        t._timeout = 10
        t._last_time = 100
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 111
            t._on_time()
        self.assertFalse(t._is_running)
        cb.assert_called_once()

    def test_on_time_reschedules_when_not_expired(self):
        cb = Mock()
        t = Timer(cb)
        t._is_running = True
        t._timeout = 20
        t._last_time = 100
        with patch('api.game.timer.time') as mock_time:
            mock_time.time.return_value = 105
            with patch('api.game.timer.IOLoop') as mock_ioloop:
                t._on_time()
        mock_ioloop.current.return_value.call_later.assert_called_once_with(1, t._on_time)
        cb.assert_not_called()


if __name__ == '__main__':
    unittest.main()
