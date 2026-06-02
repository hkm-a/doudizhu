import unittest
from unittest.mock import patch

from api.game.components.simple import RobotPlayer
from api.game.protocol import Protocol as Pt
from ai.personality import PersonalityMode


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
        self.double_calls = []

    def choose_rob(self, player):
        self.rob_calls.append(player)
        return 1

    def choose_shot(self, player, room):
        self.shot_calls.append((player, room))
        return [3]

    def choose_double(self, player, room, personality=None):
        self.double_calls.append((player, room, personality))
        return 1


class RoomStub:
    def __init__(self, turn_player=None):
        self.turn_player = turn_player
        self.double_turn_seat = -1
        self.personality = PersonalityMode.BALANCED


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


class RobotPlayerAutoDoubleTest(unittest.TestCase):
    def test_auto_double_during_its_turn(self):
        robot = RobotPlayer(10002, 'bot')
        room = RoomStub(turn_player=robot)
        room.double_turn_seat = 0
        robot.room = room
        robot.seat = 0
        robot._hand_pokers = [3, 4, 5]
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop):
            scheduled = robot.auto_double()

        self.assertTrue(scheduled)
        self.assertEqual(policy.double_calls, [(robot, room, PersonalityMode.BALANCED)])
        self.assertEqual(loop.delayed, [(1, robot.to_server, (Pt.REQ_DOUBLE, {'double': 1}), {})])

    def test_auto_double_without_room_is_logged_and_skipped(self):
        robot = RobotPlayer(10002, 'bot')
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_double()

        self.assertFalse(scheduled)
        logger.warning.assert_called_once_with('ROBOT[%d] auto double skipped because room is missing', 10002)

    def test_auto_double_skipped_when_not_double_turn(self):
        robot = RobotPlayer(10002, 'bot')
        room = RoomStub()
        room.double_turn_seat = 1
        robot.room = room
        robot.seat = 0
        robot._hand_pokers = [3, 4, 5]
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_double()

        self.assertFalse(scheduled)
        logger.warning.assert_called_once_with(
            'ROBOT[%d] auto double skipped because it is not the double turn',
            10002,
        )

    def test_auto_double_skipped_when_hand_is_empty(self):
        robot = RobotPlayer(10002, 'bot')
        room = RoomStub()
        room.double_turn_seat = 0
        robot.room = room
        robot.seat = 0
        robot._hand_pokers = []
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_double()

        self.assertFalse(scheduled)
        logger.warning.assert_called_once_with('ROBOT[%d] auto double skipped because hand is empty', 10002)


class RobotPlayerEdgeCasesTest(unittest.TestCase):
    def test_auto_rob_skipped_when_not_turn_player(self):
        robot = RobotPlayer(10003, 'bot')
        room = RoomStub(turn_player=None)
        robot.room = room
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_rob()

        self.assertFalse(scheduled)
        self.assertEqual(policy.rob_calls, [])
        logger.warning.assert_called_once_with(
            'ROBOT[%d] auto rob skipped because it is not the turn player',
            10003,
        )

    def test_auto_shot_skipped_when_hand_is_empty(self):
        robot = RobotPlayer(10004, 'bot')
        room = RoomStub(turn_player=robot)
        robot.room = room
        robot._hand_pokers = []
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_shot()

        self.assertFalse(scheduled)
        logger.warning.assert_called_once_with('ROBOT[%d] auto shot skipped because hand is empty', 10004)

    def test_auto_shot_skipped_when_not_turn_player(self):
        robot = RobotPlayer(10004, 'bot')
        room = RoomStub(turn_player=None)
        robot.room = room
        robot._hand_pokers = [3]
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop), \
                patch('api.game.components.simple.logger') as logger:
            scheduled = robot.auto_shot()

        self.assertFalse(scheduled)
        logger.warning.assert_called_once_with(
            'ROBOT[%d] auto shot skipped because it is not the turn player',
            10004,
        )


class RobotPlayerWriteMessageTest(unittest.TestCase):
    def test_join_room_triggers_auto_ready(self):
        robot = RobotPlayer(10005, 'bot')
        room = RoomStub()
        robot.room = room
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_JOIN_ROOM, {}])

        self.assertTrue(queued)

    def test_double_triggers_auto_double_when_eligible(self):
        robot = RobotPlayer(10006, 'bot')
        room = RoomStub()
        room.double_turn_seat = 0
        robot.room = room
        robot.seat = 0
        robot._hand_pokers = [3, 4, 5]
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=PolicyStub()), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_DOUBLE, {}])

        self.assertTrue(queued)

    def test_double_skipped_when_not_robot_turn(self):
        robot = RobotPlayer(10007, 'bot')
        room = RoomStub()
        room.double_turn_seat = 1
        robot.room = room
        robot.seat = 0
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_DOUBLE, {}])

        self.assertTrue(queued)

    def test_double_skipped_when_hand_empty(self):
        robot = RobotPlayer(10007, 'bot')
        room = RoomStub()
        room.double_turn_seat = 0
        robot.room = room
        robot.seat = 0
        robot._hand_pokers = []
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_DOUBLE, {}])

        self.assertTrue(queued)

    def test_shot_triggers_auto_shot_when_eligible(self):
        robot = RobotPlayer(10008, 'bot')
        room = RoomStub(turn_player=robot)
        robot.room = room
        robot._hand_pokers = [3]
        policy = PolicyStub()
        loop = IOLoopStub()

        with patch('api.game.components.simple.get_robot_policy', return_value=policy), \
                patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_SHOT_POKER, {}])

        self.assertTrue(queued)

    def test_game_over_schedules_auto_ready(self):
        robot = RobotPlayer(10009, 'bot')
        room = RoomStub()
        robot.room = room
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_GAME_OVER, {}])
            self.assertTrue(queued)
            callback, args, kwargs = loop.callbacks[0]
            callback(*args, **kwargs)
            self.assertEqual(len(loop.delayed), 1)
            self.assertEqual(loop.delayed[0][0], 5)
            self.assertEqual(loop.delayed[0][1].__func__, robot.auto_ready.__func__)

    def test_call_score_landlord_decided_triggers_auto_shot(self):
        robot = RobotPlayer(10010, 'bot')
        room = RoomStub(turn_player=robot)
        robot.room = room
        robot._hand_pokers = [3]
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            queued = robot.write_message([Pt.RSP_CALL_SCORE, {'landlord': 1}])

        self.assertTrue(queued)


class RobotPlayerBasicsTest(unittest.TestCase):
    def test_constructor_sets_room(self):
        room = RoomStub()
        robot = RobotPlayer(10011, 'bot', room=room)

        self.assertIs(robot.room, room)

    def test_allow_robot_is_true(self):
        robot = RobotPlayer(10012, 'bot')

        self.assertTrue(robot.allow_robot)

    def test_to_server_queues_callback(self):
        robot = RobotPlayer(10013, 'bot')
        loop = IOLoopStub()

        with patch('api.game.components.simple.IOLoop.current', return_value=loop):
            robot.to_server(Pt.REQ_READY, {'ready': 1})

        self.assertEqual(len(loop.callbacks), 1)


if __name__ == '__main__':
    unittest.main()
