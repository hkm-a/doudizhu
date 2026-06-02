from __future__ import annotations

from dataclasses import dataclass
from typing import List, Optional, Sequence

from ai.policy import AiPolicy, DouZeroConfig, DouZeroPolicy, RuleBasedPolicy
from api.game.player import Player
from api.game.room import Room


class ReplayError(RuntimeError):
    pass


class ReplaySkipped(RuntimeError):
    pass


class StrictReplayFallback:
    def choose_rob(self, player: Player) -> int:
        return 0

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        raise ReplayError('DouZero replay attempted to fall back to rule AI')


@dataclass(frozen=True)
class ReplayStep:
    turn: int
    seat: int
    uid: int
    hand_before: List[int]
    shot: List[int]
    hand_after: List[int]
    last_shot_seat: int
    last_shot_poker: List[int]


@dataclass(frozen=True)
class ReplayResult:
    winner_seat: int
    winner_uid: int
    steps: List[ReplayStep]
    shot_round: List[List[int]]
    landlord_seat: int
    bottom_pokers: List[int]


FIXED_REPLAY_DEAL = [
    [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
    [20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36],
    [37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53],
]
FIXED_REPLAY_BOTTOM = [1, 2, 54]


def run_fixed_replay(
    policy: Optional[AiPolicy] = None,
    hands: Sequence[Sequence[int]] = FIXED_REPLAY_DEAL,
    bottom_pokers: Sequence[int] = FIXED_REPLAY_BOTTOM,
    landlord_seat: int = 0,
    max_turns: int = 200,
) -> ReplayResult:
    policy = policy or RuleBasedPolicy()
    room = _build_room(hands, bottom_pokers, landlord_seat)
    steps = []

    for turn in range(max_turns):
        player = room.turn_player
        hand_before = list(player.hand_pokers)
        shot = list(policy.choose_shot(player, room))
        _assert_subset(shot, player.hand_pokers)

        error = room.on_shot(player.seat, shot)
        if error:
            raise ReplayError(f'turn {turn} seat {player.seat} invalid shot {shot}: {error}')

        for poker in shot:
            player.hand_pokers.remove(poker)

        hand_after = list(player.hand_pokers)
        steps.append(ReplayStep(
            turn=turn,
            seat=player.seat,
            uid=player.uid,
            hand_before=hand_before,
            shot=shot,
            hand_after=hand_after,
            last_shot_seat=room.last_shot_seat,
            last_shot_poker=list(room.last_shot_poker),
        ))

        if not player.hand_pokers:
            return ReplayResult(
                winner_seat=player.seat,
                winner_uid=player.uid,
                steps=steps,
                shot_round=[list(shot_round) for shot_round in room.shot_round],
                landlord_seat=landlord_seat,
                bottom_pokers=list(bottom_pokers),
            )

        room.whose_turn = (room.whose_turn + 1) % 3

    raise ReplayError(f'fixed replay did not finish within {max_turns} turns')


def build_douzero_replay_policy(config: Optional[DouZeroConfig] = None) -> DouZeroPolicy:
    config = config or DouZeroConfig.from_env()
    if not config.enabled:
        raise ReplaySkipped('DOUZERO_ENABLED is not enabled')

    policy = DouZeroPolicy(config, fallback=StrictReplayFallback())
    if not policy.available:
        raise ReplaySkipped(policy.disabled_reason)
    return policy


def _build_room(hands: Sequence[Sequence[int]], bottom_pokers: Sequence[int], landlord_seat: int) -> Room:
    if len(hands) != 3:
        raise ValueError('fixed replay requires exactly three hands')
    if landlord_seat not in (0, 1, 2):
        raise ValueError('landlord_seat must be 0, 1, or 2')

    room = Room(9001, allow_robot=False)
    room.landlord_seat = landlord_seat
    room.whose_turn = landlord_seat
    room.last_shot_seat = landlord_seat
    room.last_shot_poker = []
    room.pokers = list(bottom_pokers)

    players = [Player(1000 + seat, f'replay-{seat}') for seat in range(3)]
    for seat, player in enumerate(players):
        player.seat = seat
        player.room = room
        player.landlord = int(seat == landlord_seat)
        player._hand_pokers = list(hands[seat])
    players[landlord_seat].push_pokers(list(bottom_pokers))
    room.players = players
    return room


def _assert_subset(shot: Sequence[int], hand_pokers: Sequence[int]) -> None:
    remaining = list(hand_pokers)
    for poker in shot:
        if poker not in remaining:
            raise ReplayError(f'shot contains poker not in hand: {poker}')
        remaining.remove(poker)
