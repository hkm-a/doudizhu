from __future__ import annotations

from collections import Counter
from typing import Iterable, List


DOUZERO_SMALL_JOKER = 20
DOUZERO_BIG_JOKER = 30
DOUZERO_TWO = 17
DOUZERO_ACE = 14

DOUZERO_RANKS = frozenset(range(3, 15)) | {DOUZERO_TWO, DOUZERO_SMALL_JOKER, DOUZERO_BIG_JOKER}


def svz_poker_to_douzero_rank(poker: int) -> int:
    """Convert one svz concrete poker id (1..54) to a DouZero rank."""
    if type(poker) is not int or not 1 <= poker <= 54:
        raise ValueError(f'invalid svz poker id: {poker!r}')

    if poker == 53:
        return DOUZERO_SMALL_JOKER
    if poker == 54:
        return DOUZERO_BIG_JOKER

    rank = poker % 13
    if rank == 0:
        return 13
    if rank == 1:
        return DOUZERO_ACE
    if rank == 2:
        return DOUZERO_TWO
    return rank


def pokers_to_douzero_cards(pokers: Iterable[int]) -> List[int]:
    return [svz_poker_to_douzero_rank(poker) for poker in pokers]


def douzero_rank_to_svz_candidates(rank: int) -> List[int]:
    if type(rank) is not int or rank not in DOUZERO_RANKS:
        raise ValueError(f'invalid DouZero rank: {rank!r}')

    if rank == DOUZERO_SMALL_JOKER:
        return [53]
    if rank == DOUZERO_BIG_JOKER:
        return [54]
    if rank == DOUZERO_TWO:
        base = 2
    elif rank == DOUZERO_ACE:
        base = 1
    else:
        base = rank
    return [base + 13 * suit for suit in range(4)]


def douzero_cards_to_pokers(douzero_cards: Iterable[int], hand_pokers: Iterable[int]) -> List[int]:
    """Map a DouZero rank action back to concrete svz ids from a hand.

    When several suits are possible, ids are chosen in the order they appear in
    ``hand_pokers`` so the result is stable and respects the server's hand sort.
    """
    action = list(douzero_cards)
    hand = list(hand_pokers)

    for rank in action:
        if type(rank) is not int or rank not in DOUZERO_RANKS:
            raise ValueError(f'invalid DouZero rank: {rank!r}')

    available = Counter(pokers_to_douzero_cards(hand))
    requested = Counter(action)
    for rank, count in requested.items():
        if available[rank] < count:
            raise ValueError(f'hand does not contain enough DouZero rank {rank}')

    selected = []
    used_indexes = set()
    for rank in action:
        for index, poker in enumerate(hand):
            if index in used_indexes:
                continue
            if svz_poker_to_douzero_rank(poker) == rank:
                selected.append(poker)
                used_indexes.add(index)
                break
    return selected
