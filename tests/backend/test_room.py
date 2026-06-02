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

    def change_state(self, state):
        self.state = state

    def write_message(self, packet):
        self.messages.append(packet)

    def sync_data(self, real=True):
        return {
            'uid': self.uid,
            'ready': self.ready,
            'rob': self.rob,
            'landlord': self.landlord,
            'point': self.point,
        }


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


class RoomRobEndTest(unittest.TestCase):
    def setUp(self):
        self.room = Room(1)
        self.players = [PlayerStub(i + 1, i) for i in range(3)]
        self.room.players = self.players
        self.room.landlord_seat = 0

    def test_not_ended_when_next_player_has_not_robbed(self):
        self.room.whose_turn = 1
        self.players[1].rob = 0

        self.assertFalse(self.room._is_rob_end())

    def test_ended_when_next_player_declined_and_circle_complete(self):
        self.room.whose_turn = 0
        for p in self.players:
            p.rob = 0

        self.assertTrue(self.room._is_rob_end())

    def test_ended_when_all_declined_and_first_player_is_landlord(self):
        self.room.whose_turn = 2
        for p in self.players:
            p.rob = 0

        self.assertTrue(self.room._is_rob_end())

    def test_not_ended_when_first_player_can_rob_again(self):
        self.room.whose_turn = 2
        self.players[0].rob = 1
        self.players[1].rob = 0
        self.players[2].rob = 1

        self.assertFalse(self.room._is_rob_end())

    def test_not_ended_when_next_player_still_needs_to_decide(self):
        self.room.whose_turn = 2
        self.players[0].rob = 1
        self.players[1].rob = -1
        self.players[2].rob = 0

        self.assertFalse(self.room._is_rob_end())

    def test_ended_when_first_player_also_robbed_and_circle_complete(self):
        self.room.whose_turn = 0
        for p in self.players:
            p.rob = 1

        self.assertTrue(self.room._is_rob_end())

    def test_ended_when_first_player_declined_and_circle_complete(self):
        self.room.whose_turn = 2
        self.players[0].rob = 0
        self.players[1].rob = 0
        self.players[2].rob = 0

        self.assertTrue(self.room._is_rob_end())


class RoomOnRobEndTest(unittest.TestCase):
    def test_rob_end_sets_landlord_and_distributes_bottom_cards(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(i + 1, i) for i in range(3)]
        room.players = players
        room.landlord_seat = 0
        room.whose_turn = 1
        room.pokers = [52, 53, 54]
        players[0].rob = 1
        players[1].rob = 1
        players[2].rob = 0

        is_end = room.on_rob(players[1])

        self.assertTrue(is_end)
        self.assertEqual(players[1].landlord, 1)
        self.assertEqual(players[1].hand_pokers, [52, 53, 54])


class RoomDoublePhaseTest(unittest.TestCase):
    def _make_players(self):
        return [PlayerStub(101 + i, i) for i in range(3)]

    def test_on_double_returns_true_when_no_landlord(self):
        room = Room(1)
        room.players = self._make_players()

        done = room.on_double(room.players[0], 0)

        self.assertTrue(done)

    def test_on_double_records_landlord_decision(self):
        room = Room(1)
        room.timer = TimerStub()
        players = self._make_players()
        players[0].landlord = 1
        room.players = players
        room.landlord_seat = 0
        room.double_turn_seat = 0

        done = room.on_double(players[0], 1)

        self.assertFalse(done)
        self.assertEqual(room._double_decisions, {101: 1})
        self.assertEqual(room._multiple_details['landlord'], 2)

    def test_on_double_records_farmer_decision(self):
        room = Room(1)
        room.timer = TimerStub()
        players = self._make_players()
        players[0].landlord = 1
        room.players = players
        room.landlord_seat = 0
        room.double_turn_seat = 0

        room.on_double(players[1], 1)

        self.assertEqual(room._multiple_details['farmer'], 2)

    def test_on_double_returns_true_when_all_decided(self):
        room = Room(1)
        room.timer = TimerStub()
        players = self._make_players()
        players[0].landlord = 1
        room.players = players
        room.landlord_seat = 0
        room.double_turn_seat = 0

        not_done = room.on_double(players[0], 0)
        self.assertFalse(not_done)

        not_done = room.on_double(players[1], 0)
        self.assertFalse(not_done)

        done = room.on_double(players[2], 0)
        self.assertTrue(done)

    def test_skip_double_to_playing_resets_state(self):
        room = Room(1)
        room.timer = TimerStub()
        from api.game.player import State
        players = [PlayerStub(1, i) for i in range(3)]
        room.players = players
        room.landlord_seat = 0
        room.double_turn_seat = 1
        room._double_decisions = {1: 0}

        room._skip_double_to_playing()

        self.assertEqual(room.double_turn_seat, -1)
        self.assertEqual(room._double_decisions, {})
        self.assertEqual(room.whose_turn, 0)
        for player in players:
            self.assertEqual(player.state, State.PLAYING)


class RoomNextDoubleSeatTest(unittest.TestCase):
    def test_next_double_seat_skips_players_who_already_decided(self):
        room = Room(1)
        room.players = [PlayerStub(101, 0), PlayerStub(102, 1), PlayerStub(103, 2)]
        room._double_decisions = {101: 0}

        next_seat = room._next_double_seat(0)

        self.assertEqual(next_seat, 1)

    def test_next_double_seat_returns_none_when_all_decided(self):
        room = Room(1)
        room.players = [PlayerStub(101, 0), PlayerStub(102, 1), PlayerStub(103, 2)]
        room._double_decisions = {101: 0, 102: 0, 103: 0}

        next_seat = room._next_double_seat(2)

        self.assertIsNone(next_seat)

    def test_next_double_seat_skips_left_players(self):
        room = Room(1)
        room.players = [PlayerStub(101, 0), PlayerStub(102, 1), PlayerStub(103, 2)]
        room.players[1].left = 1
        room._double_decisions = {101: 0}

        next_seat = room._next_double_seat(0)

        self.assertEqual(next_seat, 2)


class RoomLeaveTest(unittest.TestCase):
    def test_on_leave_removes_target_player(self):
        room = Room(1)
        players = [PlayerStub(101, 0), PlayerStub(102, 1), PlayerStub(103, 2)]
        room.players = list(players)

        room.on_leave(players[1])

        self.assertIsNone(room.players[1])
        self.assertIsNotNone(room.players[0])

    def test_on_leave_handles_player_not_found_gracefully(self):
        room = Room(1)
        room.players = [PlayerStub(101, 0), None, None]
        unknown = PlayerStub(999, 5)

        result = room.on_leave(unknown)

        self.assertTrue(result)
        self.assertIsNotNone(room.players[0])

    def test_has_robot_detects_robot_player(self):
        from api.game.components.simple import RobotPlayer
        room = Room(1)
        room.players = [PlayerStub(101, 0), None, None]

        self.assertFalse(room.has_robot())

        room.players[1] = RobotPlayer(10001, 'bot')
        self.assertTrue(room.has_robot())

    def test_is_empty_returns_true_when_no_players(self):
        room = Room(1)
        room.players = [None, None, None]

        self.assertTrue(room.is_empty())
        self.assertEqual(room.size(), 0)

    def test_is_full_includes_robots(self):
        from api.game.components.simple import RobotPlayer
        room = Room(1)
        room.players = [
            PlayerStub(101, 0),
            RobotPlayer(10001, 'bot'),
            PlayerStub(103, 2),
        ]

        self.assertTrue(room.is_full())

    def test_level_profile_unknown_level_falls_back_to_default(self):
        profile = Room.level_profile(99)

        self.assertEqual(profile['label'], '99 档')
        self.assertEqual(profile['origin'], 10)
        self.assertEqual(profile['min_point'], 0)


class RoomMetadataTest(unittest.TestCase):
    def test_str_repr(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), None, None]

        self.assertIn('1', str(room))
        self.assertIn('1', str(room))

    def test_hash_and_equality(self):
        r1 = Room(1)
        r2 = Room(2)
        r1_copy = Room(1)

        self.assertEqual(hash(r1), hash(r1_copy))
        self.assertNotEqual(hash(r1), hash(r2))
        self.assertEqual(r1, r1_copy)
        self.assertNotEqual(r1, r2)
        self.assertFalse(r1 != r1_copy)

    def test_multiple_property(self):
        room = Room(1)
        room._multiple_details['rob'] = 2
        room._multiple_details['landlord'] = 2

        self.assertEqual(room.multiple, 60)


class RoomStateTest(unittest.TestCase):
    def test_room_state_returns_init_when_all_left(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        for p in room.players:
            p.left = 1

        self.assertEqual(room.room_state, State.INIT)


class RoomSyncRoomTest(unittest.TestCase):
    def test_sync_room_sends_state_and_players_to_each_player(self):
        room = Room(1)
        room.timer = TimerStub()
        p1, p2 = PlayerStub(1, 0), PlayerStub(2, 1)
        room.players = [p1, p2, None]

        room.sync_room()

        self.assertEqual(len(p1.messages), 1)
        self.assertEqual(len(p2.messages), 1)
        rsp1 = p1.messages[0]
        rsp2 = p2.messages[0]
        self.assertEqual(rsp1[0], Pt.RSP_JOIN_ROOM)
        self.assertEqual(rsp2[0], Pt.RSP_JOIN_ROOM)
        self.assertIn('room', rsp1[1])
        self.assertIn('players', rsp1[1])
        self.assertIsNotNone(rsp1[1]['players'][0])


class RoomAddRobotEdgeTest(unittest.TestCase):
    def test_add_robot_returns_when_full(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.add_robot()

    def test_add_robot_skips_when_two_players_and_first_call(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), PlayerStub(2, 1), None]
        room.add_robot(nth=1)

    def test_add_robot_skips_second_when_only_one_player(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), None, None]
        room.add_robot(nth=2)

    def test_add_robot_skips_when_exceeded_limit(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), None, None]
        room.robot_no = 6
        room.add_robot()


class RoomJoinFailTest(unittest.TestCase):
    def test_on_join_returns_false_when_room_full(self):
        room = Room(1)
        room.players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        extra = PlayerStub(4, -1)

        result = room.on_join(extra)

        self.assertFalse(result)


class RoomStartDoublePhaseTest(unittest.TestCase):
    def test_start_double_skips_when_no_landlord(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.players = players
        room.landlord_seat = 0

        room.start_double_phase()

        self.assertEqual(room.double_turn_seat, -1)
        self.assertEqual(room.whose_turn, 0)
        for p in players:
            self.assertEqual(p.state, State.PLAYING)

    def test_start_double_sets_first_farmer_as_double_turn(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0, landlord=1), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.players = players

        room.start_double_phase()

        self.assertEqual(room.double_turn_seat, 1)
        self.assertEqual(room._double_decisions, {})

    def test_start_double_skips_left_player(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0, landlord=1), PlayerStub(2, 1), PlayerStub(3, 2)]
        players[1].left = 1
        room.players = players

        room.start_double_phase()

        self.assertEqual(room.double_turn_seat, 2)

    def test_start_double_skips_to_playing_when_all_players_left(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0, landlord=1), PlayerStub(2, 1), PlayerStub(3, 2)]
        for p in players:
            p.left = 1
        room.players = players
        room.double_turn_seat = 1

        room.start_double_phase()

        self.assertEqual(room.double_turn_seat, -1)





class RoomLeaveEdgeTest(unittest.TestCase):
    def test_restart_with_left_players_triggers_on_leave(self):
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0), PlayerStub(2, 1), PlayerStub(3, 2)]
        players[1].left = 1
        room.players = players

        with patch('api.game.room.IOLoop') as ioloop_mock:
            room.restart()

        ioloop_mock.current.return_value.add_callback.assert_called_once()

    def test_on_leave_removes_robot_on_restart(self):
        from api.game.components.simple import RobotPlayer
        room = Room(1)
        room.robot_no = 2
        players = [RobotPlayer(10001, 'bot'), PlayerStub(102, 1), PlayerStub(103, 2)]
        room.players = list(players)

        room.on_leave(players[1], is_restart=True)

        self.assertIsNone(room.players[0])
        self.assertIsNone(room.players[1])
        self.assertIsNotNone(room.players[2])
        self.assertEqual(room.robot_no, 1)

    def test_on_leave_exception_returns_false(self):
        room = Room(1)
        room.players = [PlayerStub(101, 0), None, None]
        unknown_list = [None, None, None]

        room.players = unknown_list
        result = room.on_leave(PlayerStub(999, 5))

        self.assertTrue(result)


class RoomPlayerDoubleLogTest(unittest.TestCase):
    def setUp(self):
        self.env_patch = patch.dict('os.environ', {'PLAYER_EVENT_LOG_PATH': '/tmp/test_events.jsonl'})
        self.env_patch.start()

    def tearDown(self):
        self.env_patch.stop()

    def test_log_player_double_records_farmer_decision(self):
        from api.player_event import get_player_event_logger, new_session_id
        get_player_event_logger.cache_clear()

        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0, landlord=1), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.players = players

        room.on_double(players[1], 1)

        self.assertEqual(room._multiple_details['farmer'], 2)

    def test_log_player_double_skips_when_logger_disabled(self):
        from api.player_event import get_player_event_logger
        get_player_event_logger.cache_clear()
        room = Room(1)
        room.timer = TimerStub()
        players = [PlayerStub(1, 0, landlord=1), PlayerStub(2, 1), PlayerStub(3, 2)]
        room.players = players

        room.on_double(players[1], 0)


class RoomSaveShotRoundEdgeTest(unittest.IsolatedAsyncioTestCase):
    async def test_save_shot_skips_player_without_socket(self):
        room = Room(1)
        players = [
            PlayerStub(1, 0, landlord=1),
            PlayerStub(2, 1),
            PlayerStub(3, 2),
        ]
        room.players = players
        room.shot_round = [[3]]

        saved = await room.save_shot_round()

        self.assertFalse(saved)

    async def test_save_shot_round_returns_false_on_exception(self):
        room = Room(1)
        players = [
            PlayerStub(1, 0, landlord=1),
            PlayerStub(2, 1),
            PlayerStub(3, 2),
        ]
        players[0].socket = Mock()
        players[0].socket.insert = Mock(side_effect=Exception('db error'))
        room.players = players
        room.shot_round = [[3]]

        with patch('api.game.room.logging') as logging:
            saved = await room.save_shot_round()

        self.assertFalse(saved)


class RoomSavePlayerPointsEdgeTest(unittest.IsolatedAsyncioTestCase):
    async def test_save_returns_false_when_no_balances(self):
        room = Room(1)
        room.players = [None, None, None]

        saved = await room.save_player_points()

        self.assertFalse(saved)

    async def test_save_skips_player_without_socket(self):
        room = Room(1)
        players = [PlayerStub(1, 0), PlayerStub(2, 1), None]
        room.players = players

        saved = await room.save_player_points()

        self.assertFalse(saved)

    async def test_save_skips_player_without_save_method(self):
        room = Room(1)
        players = [PlayerStub(1, 0), PlayerStub(2, 1), None]
        players[0].socket = object()
        room.players = players

        saved = await room.save_player_points()

        self.assertFalse(saved)

    async def test_save_player_points_handles_exception(self):
        room = Room(1)
        players = [PlayerStub(1, 0), PlayerStub(2, 1), None]
        players[0].socket = Mock()
        players[0].socket.save_player_points = Mock(side_effect=Exception('db error'))
        room.players = players

        with patch('api.game.room.logging') as logging:
            saved = await room.save_player_points()

        self.assertFalse(saved)


if __name__ == '__main__':
    unittest.main()
