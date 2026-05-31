import unittest
from unittest.mock import patch

from api.game.components.simple import RobotPlayer
from api.game.protocol import Protocol as Pt


class IOLoopStub:
    def __init__(self):
        self.callbacks = []
        self.delayed = []

    def add_callback(self, callback, *args, **kwargs):
        self.callbacks.append((callback, args, kwargs))

    def call_later(self, delay, callback, *args, **kwargs):
        self.delayed.append((delay, callback, args, kwargs))


class PolicyStub:
    def __init__(self):
        self.rob_calls = []
        self.shot_calls = []

    def choose_rob(self, player):
        self.rob_calls.append(player)
        return 1

    def choose_shot(self, player, room):
        self.shot_calls.append((player, room))
        return [3]


class RoomStub:
    def __init__(self, turn_player=None):
        self.turn_player = turn_player


class RobotPlayerAutoActionTest(unittest.TestCase):
    def test_auto_ready_without_room_is_logged_and_skipped(self):
        robot = RobotPlayer(10001, 'bot')
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_ready()

        self.assertFalse(scheduled)
        self.assertEqual(loop.callbacks, [])
        logger.warning.assert_called_once_with('ROBOT[%d] auto ready skipped because room is missing', 10001)

    def test_auto_rob_without_room_is_logged_and_skipped(self):
        robot = RobotPlayer(10001, 'bot')
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_rob()

        self.assertFalse(scheduled)
        self.assertEqual(policy.rob_calls, [])
        self.assertEqual(loop.delayed, [])
        logger.warning.assert_called_once_with('ROBOT[%d] auto rob skipped because room is missing', 10001)

    def test_auto_shot_without_room_is_logged_and_skipped(self):
        robot = RobotPlayer(10001, 'bot')
        robot._hand_pokers = [3, 4]
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_shot()

        self.assertFalse(scheduled)
        self.assertEqual(policy.shot_calls, [])
        self.assertEqual(loop.delayed, [])
        logger.warning.assert_called_once_with('ROBOT[%d] auto shot skipped because room is missing', 10001)

    def test_write_message_without_room_does_not_crash_on_call_score_response(self):
        robot = RobotPlayer(10001, 'bot')
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_CALL_SCORE, {'landlord': -1}])

        self.assertTrue(queued)
        callback, args, kwargs = loop.callbacks[0]
        self.assertIs(callback.__self__, robot)
        self.assertIs(callback.__func__, robot._write_message.__func__)
        callback(*args, **kwargs)

    def test_auto_shot_for_current_turn_schedules_request(self):
        robot = RobotPlayer(10001, 'bot')
        room = RoomStub(turn_player=robot)
        robot.room = room
        robot._hand_pokers = [3, 4]
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop):
            scheduled = robot.auto_shot()

        self.assertTrue(scheduled)
        self.assertEqual(policy.shot_calls, [(robot, room)])
        self.assertEqual(loop.delayed, [(2, robot.to_server, (Pt.REQ_SHOT_POKER, {'pokers': [3]}), {})])


if __name__ == '__main__':
    unittest.main()
