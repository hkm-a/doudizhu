import unittest
from unittest.mock import Mock, patch

from api.game.player import Player, State
from api.game.protocol import Protocol as Pt
from api.game.room import Room, ROBOT_FIRST_JOIN_DELAY, ROBOT_SECOND_JOIN_DELAY


class PlayerStub:
    def __init__(self, uid, seat, landlord=0):
        self.uid = uid
        self.seat = seat
        self.landlord = landlord
        self.rob = -1
        self.ready = 1
        self.left = 0
        self.restarts = 0
        self.timeouts = 0
        self.timeout = 20
        self.hand_pokers = []
        self.messages = []
        self.socket = None
        self.state = State.WAITING
        self.point = 1000

    def push_pokers(self, pokers):
        self.hand_pokers.extend(pokers)

    def is_left(self):
        return self.left == 1

    def restart(self):
        self.restarts += 1
        self.ready = 0
        self.rob = -1
        self.landlord = 0
        self.hand_pokers = []

    def on_timeout(self):
        self.timeouts += 1

    def write_message(self, packet):
        self.messages.append(packet)


class TimerStub:
    def __init__(self):
        self.started = []
        self.stopped = False
        self.timeout = 20

    def start_timing(self, timeout):
        self.started.append(timeout)

    def stop_timing(self):
        self.stopped = True


class RecordSocketStub:
    def __init__(self):
        self.records = []
        self.points = []

    async def insert(self, record):
        self.records.append(record)

    async def save_player_points(self, points):
        self.points.append(points)


class RoomShotTest(unittest.TestCase):
    def test_room_level_controls_base_score(self):
        self.assertEqual(Room(1, level=1).sync_data()['origin'], 10)
        self.assertEqual(Room(2, level=2).sync_data()['origin'], 30)
        self.assertEqual(Room(3, level=3).sync_data()['origin'], 60)

    def test_room_level_controls_entry_point_requirement(self):
        self.assertEqual(Room.level_profile(1)['min_point'], 0)
        self.assertEqual(Room.level_profile(2)['min_point'], 1000)
        self.assertEqual(Room.level_profile(3)['min_point'], 2000)

    def test_valid_shot_updates_last_shot_and_round(self):
        room = Room(1)

        error = room.on_shot(0, [3])

        self.assertEqual(error, '')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [3])
        self.assertEqual(room.shot_round, [[3]])

    def test_invalid_shot_does_not_change_state(self):
        room = Room(1)
        room.last_shot_seat = 2
        room.last_shot_poker = [10]

        error = room.on_shot(0, [3, 4])

        self.assertEqual(error, 'Poker does not comply with the rules')
        self.assertEqual(room.last_shot_seat, 2)
        self.assertEqual(room.last_shot_poker, [10])
        self.assertEqual(room.shot_round, [])

    def test_player_cannot_pass_when_they_own_last_shot(self):
        room = Room(1)
        room.last_shot_seat = 1
        room.last_shot_poker = [3]

        error = room.on_shot(1, [])

        self.assertEqual(error, 'Last shot player does not allow pass')
        self.assertEqual(room.shot_round, [])

    def test_player_can_pass_against_another_last_shot(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [3]

        error = room.on_shot(1, [])

        self.assertEqual(error, '')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [3])
        self.assertEqual(room.shot_round, [[]])

    def test_smaller_follow_is_rejected_without_mutating_state(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [4]

        error = room.on_shot(1, [3])

        self.assertEqual(error, 'Poker small than last shot')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [4])
        self.assertEqual(room.shot_round, [])

    def test_equal_follow_is_rejected_without_mutating_state(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [3]

        error = room.on_shot(1, [3])

        self.assertEqual(error, 'Poker small than last shot')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [3])
        self.assertEqual(room.shot_round, [])

    def test_different_non_bomb_shape_follow_is_rejected_without_mutating_state(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [4]

        error = room.on_shot(1, [3, 16])

        self.assertEqual(error, 'Poker small than last shot')
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [4])
        self.assertEqual(room.shot_round, [])

    def test_bomb_can_follow_regular_non_bomb_shape(self):
        room = Room(1)
        room.last_shot_seat = 0
        room.last_shot_poker = [52]

        error = room.on_shot(1, [3, 16, 29, 42])

        self.assertEqual(error, '')
        self.assertEqual(room.last_shot_seat, 1)
        self.assertEqual(room.last_shot_poker, [3, 16, 29, 42])
        self.assertEqual(room.shot_round, [[3, 16, 29, 42]])

    def test_bomb_and_rocket_double_bomb_multiplier(self):
        room = Room(1)

        self.assertEqual(room._multiple_details['bomb'], 1)
        self.assertEqual(room.on_shot(0, [3, 16, 29, 42]), '')
        self.assertEqual(room._multiple_details['bomb'], 2)
        self.assertEqual(room.on_shot(1, [53, 54]), '')
        self.assertEqual(room._multiple_details['bomb'], 4)
        self.assertEqual(room.shot_round, [[3, 16, 29, 42], [53, 54]])


class RoomBroadcastTest(unittest.TestCase):
    def test_broadcast_continues_when_player_has_no_socket(self):
        room = Room(1)
        connected = PlayerStub(1, 0)
        disconnected = Player(2, 'disconnected')
        room.players = [connected, disconnected, None]
        packet = [Pt.RSP_READY, {'uid': 1, 'ready': 1}]

        with patch('api.game.player.logger') as logger:
            room.broadcast(packet)

        self.assertEqual(connected.messages, [packet])
        logger.warning.assert_called_once_with('USER[%d] missing socket for response %s', 2, packet)


class RoomRobotFillTest(unittest.TestCase):
    def test_new_player_schedules_fast_robot_fill_for_beginner_room(self):
        room = Room(1, level=1, allow_robot=True)
        player = PlayerStub(1, 0)

        with patch('api.game.room.IOLoop') as ioloop:
            room.on_join(player)

        ioloop.current.return_value.call_later.assert_called_once_with(
            ROBOT_FIRST_JOIN_DELAY,
            room.add_robot,
            nth=1,
        )

    def test_first_robot_schedules_second_robot_quickly(self):
        room = Room(1, level=1, allow_robot=True)
        room.players = [PlayerStub(1, 0), None, None]

        with patch('api.game.components.simple.RobotPlayer') as robot_player:
            robot_player.return_value.to_server = Mock()
            with patch('api.game.room.IOLoop') as ioloop:
                room.add_robot(nth=1)

        ioloop.current.return_value.call_later.assert_called_once_with(
            ROBOT_SECOND_JOIN_DELAY,
            room.add_robot,
            nth=2,
        )


class RoomRestartTest(unittest.TestCase):
    def test_restart_skips_empty_seats_and_restarts_present_players(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0), None, PlayerStub(3, 2)]
        room.players = players
        room.pokers = [53, 54, 3]
        room.landlord_seat = 2
        room.whose_turn = 2
        room.last_shot_seat = 2
        room.last_shot_poker = [3]
        room.shot_round = [[3]]
        room._multiple_details['bomb'] = 4

        room.restart()

        self.assertEqual(room.players, players)
        self.assertEqual(players[0].restarts, 1)
        self.assertEqual(players[2].restarts, 1)
        self.assertEqual(room.pokers, [])
        self.assertEqual(room.landlord_seat, 0)
        self.assertEqual(room.whose_turn, 0)
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room.last_shot_poker, [])
        self.assertEqual(room.shot_round, [])
        self.assertEqual(room._multiple_details['bomb'], 1)
        self.assertTrue(room.timer.stopped)


class RoomSyncTest(unittest.TestCase):
    def test_sync_data_exposes_serializable_room_state(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0), PlayerStub(2, 1), None]
        players[0].state = State.PLAYING
        players[1].state = State.PLAYING
        room.players = players
        room.whose_turn = 1
        room.pokers = [52, 53, 54]
        room.last_shot_seat = 0
        room.last_shot_poker = [3, 4]

        data = room.sync_data()

        self.assertEqual(data['level'], 1)
        self.assertEqual(data['label'], '新手场')
        self.assertEqual(data['origin'], 10)
        self.assertEqual(data['min_point'], 0)
        self.assertEqual(data['state'], State.PLAYING)
        self.assertIsInstance(data['state'], int)
        self.assertEqual(data['whose_turn'], 2)
        self.assertEqual(data['pokers'], [52, 53, 54])
        self.assertEqual(data['last_shot_uid'], 1)
        self.assertEqual(data['last_shot_poker'], [3, 4])


class RoomTimeoutTest(unittest.TestCase):
    def test_timeout_delegates_to_current_turn_player(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.players = players
        room.whose_turn = 1

        room.on_timeout()

        self.assertEqual([player.timeouts for player in players], [0, 1, 0])
        self.assertFalse(room.timer.stopped)

    def test_timeout_without_turn_player_stops_timer_instead_of_crashing(self):
        room = Room(1)
        room.timer = TimerStub()
        room.players = [PlayerStub(1, 0), None, PlayerStub(3, 2)]
        room.whose_turn = 1

        with patch('api.game.room.logging') as logging:
            room.on_timeout()

        self.assertTrue(room.timer.stopped)
        logging.warning.assert_called_once_with('Room[%d] timeout without turn player', 1)


class RoomTurnTest(unittest.TestCase):
    def test_next_turn_skips_empty_seats(self):
        room = Room(1)
        room.timer = TimerStub()
        room.players = [PlayerStub(1, 0), None, PlayerStub(3, 2)]
        room.whose_turn = 0

        room.go_next_turn()

        self.assertEqual(room.whose_turn, 2)
        self.assertEqual(room.timer.started, [20])
        self.assertFalse(room.timer.stopped)

    def test_next_turn_stops_timer_when_no_players_remain(self):
        room = Room(1)
        room.timer = TimerStub()
        room.players = [None, None, None]
        room.whose_turn = 0

        room.go_next_turn()

        self.assertEqual(room.timer.started, [])
        self.assertTrue(room.timer.stopped)


class RoomDealTest(unittest.TestCase):
    def test_deal_skips_incomplete_room_instead_of_crashing(self):
        room = Room(1)
        room.timer = TimerStub()
        room.players = [PlayerStub(1, 0), None, PlayerStub(3, 2)]

        with patch('api.game.room.logging') as logging:
            is_dealt = room.on_deal_poker()

        self.assertFalse(is_dealt)
        self.assertEqual(room.pokers, [])
        self.assertEqual(room.timer.started, [])
        self.assertTrue(room.timer.stopped)
        self.assertEqual(room.players[0].hand_pokers, [])
        self.assertEqual(room.players[2].hand_pokers, [])
        logging.warning.assert_called_once_with('Room[%d] deal skipped because room is not full', 1)

    def test_deal_distributes_cards_and_starts_landlord_timer(self):
        room = Room(1)
        room.timer = TimerStub()
        room.players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.landlord_seat = 1

        with patch('api.game.room.random.shuffle'), patch('api.game.room.logging'):
            is_dealt = room.on_deal_poker()

        self.assertTrue(is_dealt)
        self.assertEqual(room.whose_turn, 1)
        self.assertEqual(room.timer.started, [20])
        self.assertEqual([len(player.hand_pokers) for player in room.players], [17, 17, 17])
        self.assertEqual(room.pokers, [52, 53, 54])
        self.assertEqual([len(player.messages) for player in room.players], [1, 1, 1])


class RoomRobTest(unittest.TestCase):
    def make_room(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(i + 1, i) for i in range(3)]
        room.players = players
        room.landlord_seat = 0
        room.whose_turn = 0
        return room, players

    def test_rob_doubles_rob_multiple_and_moves_to_next_turn_when_unfinished(self):
        room, players = self.make_room()
        players[0].rob = 1

        is_end = room.on_rob(players[0])

        self.assertFalse(is_end)
        self.assertEqual(room._multiple_details['rob'], 2)
        self.assertEqual(room.whose_turn, 1)
        self.assertEqual(room.timer.started, [20])
        self.assertEqual([player.landlord for player in players], [0, 0, 0])

    def test_rob_skips_incomplete_room_instead_of_crashing(self):
        room, players = self.make_room()
        room.players = [players[0], None, players[2]]
        players[0].rob = 1

        with patch('api.game.room.logging') as logging:
            is_end = room.on_rob(players[0])

        self.assertFalse(is_end)
        self.assertEqual(room._multiple_details['rob'], 1)
        self.assertEqual(room.whose_turn, 0)
        self.assertEqual(room.timer.started, [])
        self.assertTrue(room.timer.stopped)
        self.assertEqual([players[0].landlord, players[2].landlord], [0, 0])
        logging.warning.assert_called_once_with('Room[%d] rob skipped because room is not full', 1)

    def test_all_players_decline_assigns_original_landlord_seat(self):
        room, players = self.make_room()
        room.whose_turn = 2
        room.pokers = [53, 54, 3]
        for player in players:
            player.rob = 0

        is_end = room.on_rob(players[2])

        self.assertTrue(is_end)
        self.assertEqual(players[0].landlord, 1)
        self.assertEqual(players[0].hand_pokers, [53, 54, 3])
        self.assertEqual(room.last_shot_seat, 0)
        self.assertEqual(room._multiple_details['di'], 4)


class RoomScoringTest(unittest.TestCase):
    def make_room(self):
        room = Room(1)
        players = [
            PlayerStub(1, 0, landlord=1),
            PlayerStub(2, 1, landlord=0),
            PlayerStub(3, 2, landlord=0),
        ]
        room.players = players
        return room, players

    def test_landlord_win_points_charge_each_farmer_once(self):
        room, players = self.make_room()

        self.assertEqual(room.get_point(players[0], players[0]), 300)
        self.assertEqual(room.get_point(players[0], players[1]), -150)
        self.assertEqual(room.get_point(players[0], players[2]), -150)

    def test_farmer_win_points_charge_landlord_twice(self):
        room, players = self.make_room()

        self.assertEqual(room.get_point(players[1], players[0]), -300)
        self.assertEqual(room.get_point(players[1], players[1]), 150)
        self.assertEqual(room.get_point(players[1], players[2]), 150)

    def test_game_over_applies_score_delta_to_player_balances(self):
        room, players = self.make_room()
        room.timer = TimerStub()
        room.shot_round = [[3], [4], []]

        with patch('api.game.room.IOLoop') as ioloop_mock, patch('api.game.room.logging'):
            room.on_game_over(players[0])

        response = players[0].messages[-1]
        self.assertEqual([
            {'uid': 1, 'point': 300, 'balance': 1300, 'pokers': [], 'segment': 'gold', 'segment_points': 0},
            {'uid': 2, 'point': -150, 'balance': 850, 'pokers': [], 'segment': 'gold', 'segment_points': 0},
            {'uid': 3, 'point': -150, 'balance': 850, 'pokers': [], 'segment': 'gold', 'segment_points': 0},
        ], response[1]['players'])
        self.assertEqual([player.point for player in players], [1300, 850, 850])

    def test_landlord_lookup_skips_empty_seats(self):
        room = Room(1)
        players = [PlayerStub(1, 0), PlayerStub(3, 2, landlord=1)]
        room.players = [None, players[0], players[1]]

        self.assertIs(room.landlord, players[1])
        self.assertEqual(room.get_point(players[1], players[0]), -150)

    def test_landlord_spring_when_farmers_never_play_cards(self):
        room, players = self.make_room()
        room.shot_round = [[3], [], [], [4]]

        self.assertTrue(room.is_spring(players[0]))
        self.assertFalse(room.anti_spring(players[0]))

    def test_landlord_spring_is_false_when_any_farmer_plays_cards(self):
        room, players = self.make_room()
        room.shot_round = [[3], [4], [], [5]]

        self.assertFalse(room.is_spring(players[0]))

    def test_anti_spring_when_landlord_only_plays_opening_shot(self):
        room, players = self.make_room()
        room.shot_round = [[3], [4], [5], [], [6]]

        self.assertTrue(room.anti_spring(players[1]))
        self.assertFalse(room.is_spring(players[1]))

    def test_anti_spring_is_false_when_landlord_plays_again(self):
        room, players = self.make_room()
        room.shot_round = [[3], [4], [5], [6]]

        self.assertFalse(room.anti_spring(players[1]))

    def test_game_over_skips_empty_seats_when_building_score_response(self):
        room, players = self.make_room()
        room.timer = TimerStub()
        room.players = [players[0], None, players[2]]
        room.shot_round = [[3], [], []]

        with patch('api.game.room.logging'):
            room.on_game_over(players[0])

        response = players[0].messages[-1]
        self.assertEqual(response[0], Pt.RSP_GAME_OVER)
        self.assertEqual([item['uid'] for item in response[1]['players']], [1, 3])
        self.assertEqual(players[2].messages[-1], response)
        self.assertTrue(room.timer.stopped)


class RoomSaveShotRoundTest(unittest.IsolatedAsyncioTestCase):
    async def test_save_shot_round_records_first_available_socket(self):
        room = Room(1)
        players = [
            PlayerStub(1, 0, landlord=1),
            PlayerStub(2, 1),
            PlayerStub(3, 2),
        ]
        players[0].socket = RecordSocketStub()
        players[1].socket = RecordSocketStub()
        players[0].hand_pokers = [3]
        players[1].hand_pokers = [4, 5]
        players[2].hand_pokers = []
        room.players = players
        room.shot_round = [[6], [], [7]]

        saved = await room.save_shot_round()

        self.assertTrue(saved)
        self.assertEqual(len(players[0].socket.records), 1)
        self.assertEqual(players[1].socket.records, [])
        record = players[0].socket.records[0]
        self.assertEqual(record.round, {
            'left': {
                0: [3],
                1: [4, 5],
                2: [],
            },
            'round': [[6], [], [7]],
            'lord': 0,
        })

    async def test_save_shot_round_skips_missing_landlord_instead_of_crashing(self):
        room = Room(1)
        player = PlayerStub(1, 0)
        player.socket = RecordSocketStub()
        room.players = [player, None, PlayerStub(3, 2)]
        room.shot_round = [[3]]

        with patch('api.game.room.logging') as logging:
            saved = await room.save_shot_round()

        self.assertFalse(saved)
        self.assertEqual(player.socket.records, [])
        logging.warning.assert_called_once_with(
            'Room[%d] skipped saving shot round because landlord is missing',
            1,
        )

    async def test_save_player_points_records_current_balances(self):
        room = Room(1)
        players = [
            PlayerStub(1, 0),
            PlayerStub(2, 1),
            PlayerStub(3, 2),
        ]
        players[0].point = 1300
        players[1].point = 850
        players[2].point = 850
        players[0].socket = RecordSocketStub()
        players[1].socket = RecordSocketStub()
        room.players = players

        saved = await room.save_player_points()

        self.assertTrue(saved)
        self.assertEqual(players[0].socket.points, [{1: 1300, 2: 850, 3: 850}])
        self.assertEqual(players[1].socket.points, [])


class RoomMultipleTest(unittest.TestCase):
    def test_bottom_card_jokers_double_per_joker_and_skip_other_di_rules(self):
        room = Room(1)
        room.pokers = [53, 54, 3]

        room.re_multiple()

        self.assertEqual(room._multiple_details['di'], 4)

    def test_same_color_and_short_sequence_bottom_cards_stack_di(self):
        room = Room(1)
        room.pokers = [3, 4, 5]

        room.re_multiple()

        self.assertEqual(room._multiple_details['di'], 4)

    def test_short_sequence_bottom_cards_double_di(self):
        room = Room(1)
        room.pokers = [3, 17, 31]

        room.re_multiple()

        self.assertEqual(room._multiple_details['di'], 2)


if __name__ == '__main__':
    unittest.main()
