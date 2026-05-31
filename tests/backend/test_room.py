import unittest
from unittest.mock import patch

from api.game.room import Room


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


class TimerStub:
    def __init__(self):
        self.started = []
        self.stopped = False

    def start_timing(self, timeout):
        self.started.append(timeout)

    def stop_timing(self):
        self.stopped = True


class RoomShotTest(unittest.TestCase):
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

    def test_bomb_and_rocket_double_bomb_multiplier(self):
        room = Room(1)

        self.assertEqual(room._multiple_details['bomb'], 1)
        self.assertEqual(room.on_shot(0, [3, 16, 29, 42]), '')
        self.assertEqual(room._multiple_details['bomb'], 2)
        self.assertEqual(room.on_shot(1, [53, 54]), '')
        self.assertEqual(room._multiple_details['bomb'], 4)
        self.assertEqual(room.shot_round, [[3, 16, 29, 42], [53, 54]])


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
