from __future__ import annotations

from functools import reduce
from operator import mul
from typing import Dict, List, Optional

from game.player import PureGamePlayer
from game.state import State


class GameRound:
    LEVEL_PROFILES = {
        1: {'label': '新手场', 'origin': 10, 'min_point': 0},
        2: {'label': '进阶场', 'origin': 30, 'min_point': 1000},
        3: {'label': '高手场', 'origin': 60, 'min_point': 2000},
    }

    def __init__(self, room_id: int, level: int = 1, personality=None):
        self.room_id = room_id
        self.level = level
        self.personality = personality
        self._state: State = State.INIT
        self._players: List[Optional[PureGamePlayer]] = [None, None, None]
        self.pokers: List[int] = []
        self.whose_turn = 0
        self.landlord_seat = 0
        self.last_shot_seat = 0
        self.last_shot_poker: List[int] = []
        self.shot_round: List[List[int]] = []
        self.bomb_multiple = 2
        self.double_turn_seat: int = -1
        self._double_decisions: Dict[int, int] = {}
        self.first_session: bool = True
        self._multiple_details: Dict[str, int] = {}
        self._reset_multiple_details()

    def _reset_multiple_details(self) -> None:
        profile = self.level_profile(self.level)
        self._multiple_details = {
            'origin': profile['origin'],
            'origin_multiple': 15,
            'di': 1,
            'ming': 1,
            'bomb': 1,
            'rob': 1,
            'spring': 1,
            'landlord': 1,
            'farmer': 1,
        }

    @property
    def state(self) -> State:
        return self._state

    def set_state(self, s: State) -> None:
        self._state = s

    @classmethod
    def level_profile(cls, level: int) -> dict:
        return cls.LEVEL_PROFILES.get(level, {
            'label': '%s 档' % level,
            'origin': cls.LEVEL_PROFILES[1]['origin'],
            'min_point': 0,
        })

    @property
    def players(self) -> List[Optional[PureGamePlayer]]:
        return self._players

    @players.setter
    def players(self, value: List[Optional[PureGamePlayer]]) -> None:
        self._players = value

    def restart(self) -> None:
        for player in self._players:
            if player and not player.is_left():
                player.restart()
        self.pokers = []
        self.whose_turn = 0
        self.last_shot_seat = 0
        self.last_shot_poker = []
        self.shot_round = []
        self.double_turn_seat = -1
        self._double_decisions = {}
        self._reset_multiple_details()

    def _on_join(self, target: PureGamePlayer) -> bool:
        for i in range(3):
            if self._players[i] is None:
                self._players[i] = target
                target.seat = i
                return True
        return False

    def on_rob(self, target: PureGamePlayer) -> bool:
        if not self.is_full():
            return False
        if target.rob == 1:
            self._multiple_details['rob'] *= 2
        if not self._is_rob_end():
            self.go_next_turn()
            return False
        for _i in range(3):
            if self.turn_player.rob == 1 or _i == 2:
                self.turn_player.landlord = 1
                self.turn_player.push_pokers(self.pokers)
                self.last_shot_seat = self.whose_turn
                self.re_multiple()
                return True
            self.go_prev_turn()
        return True

    def on_shot(self, seat: int, pokers: List[int]) -> str:
        from api.game.rule import rule

        if pokers:
            spec = rule.get_poker_spec(pokers)
            if spec is None:
                return 'Poker does not comply with the rules'
            if seat != self.last_shot_seat and rule.compare_pokers(pokers, self.last_shot_poker) <= 0:
                return 'Poker small than last shot'
            if spec == 'bomb' or spec == 'rocket':
                self._multiple_details['bomb'] *= 2
            self.last_shot_seat = seat
            self.last_shot_poker = pokers
        else:
            if seat == self.last_shot_seat:
                return 'Last shot player does not allow pass'
        self.shot_round.append(pokers)
        return ''

    def on_double(self, target: PureGamePlayer, choice: int) -> bool:
        if not self.landlord:
            return True
        self._double_decisions[target.uid] = choice
        if choice == 1:
            if target.landlord == 1:
                self._multiple_details['landlord'] *= 2
            else:
                self._multiple_details['farmer'] *= 2
        next_seat = self._next_double_seat(target.seat)
        if next_seat is None:
            return True
        self.double_turn_seat = next_seat
        return False

    def _next_double_seat(self, current_seat: int) -> Optional[int]:
        for i in range(1, 4):
            candidate = (current_seat + i) % 3
            player = self._players[candidate]
            if player and not player.is_left() and player.uid not in self._double_decisions:
                return candidate
        return None

    def _is_rob_end(self) -> bool:
        if self.next_player.rob == -1:
            return False
        if self.next_player.seat == self.landlord_seat:
            if self.next_player.rob == 0:
                return True
            if self.turn_player.rob == 0:
                if self.prev_player.rob == 0:
                    return True
                else:
                    return False
            else:
                return False
        return True

    def re_multiple(self) -> None:
        from api.game.rule import rule

        joker_number = rule.get_joker_no(self.pokers)
        if joker_number > 0:
            self._multiple_details['di'] *= 2 * joker_number
            return
        if rule.is_same_color(self.pokers):
            self._multiple_details['di'] *= 2
        if rule.is_short_seq(self.pokers):
            self._multiple_details['di'] *= 2

    @property
    def multiple(self) -> int:
        return reduce(mul, self._multiple_details.values(), 1) // self._multiple_details['origin']

    def get_point(self, winner: PureGamePlayer, player: PureGamePlayer) -> int:
        origin = self._multiple_details['origin']
        if winner.landlord == 1:
            if player.landlord == 1:
                return self.multiple * 2 * origin
            return -self.multiple * origin
        if player.landlord == 1:
            return -self.multiple * 2 * origin
        return self.multiple * origin

    def is_spring(self, winner: PureGamePlayer) -> bool:
        if winner.landlord != 1:
            return False
        landlord_seat = self.landlord.seat if self.landlord else -1
        for i, shot in enumerate(self.shot_round):
            if i % 3 == landlord_seat:
                continue
            if shot:
                return False
        return True

    def anti_spring(self, winner: PureGamePlayer) -> bool:
        if winner.landlord == 1:
            return False
        landlord_seat = self.landlord.seat if self.landlord else -1
        landlord_has_played = False
        for i, shot in enumerate(self.shot_round):
            if i % 3 != landlord_seat:
                continue
            if not landlord_has_played:
                if shot:
                    landlord_has_played = True
            elif shot:
                return False
        return landlord_has_played

    def go_next_turn(self) -> None:
        for _i in range(3):
            self.whose_turn = (self.whose_turn + 1) % 3
            player = self._players[self.whose_turn]
            if player and not player.is_left():
                return
        return None

    def go_prev_turn(self) -> None:
        for _i in range(3):
            self.whose_turn = (self.whose_turn - 1) % 3
            player = self._players[self.whose_turn]
            if player and not player.is_left():
                return

    def remove_player(self, target: PureGamePlayer) -> int:
        for i, player in enumerate(self._players):
            if player == target:
                self._players[i] = None
                return i
        return -1

    def seat_to_uid(self, seat: int) -> int:
        player = self._players[seat]
        return player.uid if player else -1

    @property
    def landlord(self) -> Optional[PureGamePlayer]:
        for player in self._players:
            if player and player.landlord == 1:
                return player
        return None

    @property
    def turn_player(self) -> Optional[PureGamePlayer]:
        return self._players[self.whose_turn]

    @property
    def prev_player(self) -> Optional[PureGamePlayer]:
        return self._players[(self.whose_turn - 1) % 3]

    @property
    def next_player(self) -> Optional[PureGamePlayer]:
        return self._players[(self.whose_turn + 1) % 3]

    def is_ready(self) -> bool:
        return self.is_full() and all(p.ready for p in self._players if p)

    def is_full(self) -> bool:
        return self.size() == 3

    def is_empty(self) -> bool:
        return self.size() == 0

    def has_robot(self) -> bool:
        return any(p._is_robot for p in self._players if p)

    def size(self) -> int:
        return sum(1 for p in self._players if p is not None)

    def __str__(self) -> str:
        return f'[{self.room_id}{[p or "-" for p in self._players]}]'

    def __hash__(self) -> int:
        return self.room_id

    def __eq__(self, other) -> bool:
        return isinstance(other, GameRound) and self.room_id == other.room_id

    def __ne__(self, other) -> bool:
        return not self.__eq__(other)
