from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from typing import Dict, Iterable, List, TYPE_CHECKING

from ai.cards import pokers_to_douzero_cards

if TYPE_CHECKING:
    from api.game.player import Player
    from api.game.room import Room


PLAY_ORDER = ('landlord', 'landlord_down', 'landlord_up')
INFOSET_POSITIONS = ('landlord', 'landlord_up', 'landlord_down')
BOMBS = [[rank] * 4 for rank in range(3, 15)] + [[17] * 4, [20, 30]]


@dataclass
class DouZeroInfoSet:
    player_position: str
    player_hand_cards: List[int]
    num_cards_left_dict: Dict[str, int]
    three_landlord_cards: List[int]
    card_play_action_seq: List[List[int]]
    other_hand_cards: List[int]
    legal_actions: List[List[int]]
    last_move: List[int]
    last_two_moves: List[List[int]]
    last_move_dict: Dict[str, List[int]]
    played_cards: Dict[str, List[int]]
    all_handcards: Dict[str, List[int]]
    last_pid: str
    bomb_num: int


def seat_to_douzero_position(seat: int, landlord_seat: int) -> str:
    if type(seat) is not int or seat not in (0, 1, 2):
        raise ValueError(f'invalid seat: {seat!r}')
    if type(landlord_seat) is not int or landlord_seat not in (0, 1, 2):
        raise ValueError(f'invalid landlord seat: {landlord_seat!r}')
    return PLAY_ORDER[(seat - landlord_seat) % 3]


def build_douzero_infoset(player: Player, room: Room, legal_actions: Iterable[Iterable[int]] = ()) -> DouZeroInfoSet:
    position = seat_to_douzero_position(player.seat, room.landlord_seat)
    hands = _hands_by_position(room)
    action_seq = _action_sequence(room)
    played_cards = _played_cards_by_position(room)
    last_move_dict = _last_move_dict(room)

    return DouZeroInfoSet(
        player_position=position,
        player_hand_cards=list(hands[position]),
        num_cards_left_dict={pos: len(hands[pos]) for pos in INFOSET_POSITIONS},
        three_landlord_cards=sorted(pokers_to_douzero_cards(room.pokers)),
        card_play_action_seq=deepcopy(action_seq),
        other_hand_cards=[
            card
            for pos in INFOSET_POSITIONS
            if pos != position
            for card in hands[pos]
        ],
        legal_actions=[sorted(list(action)) for action in legal_actions],
        last_move=_last_move(action_seq),
        last_two_moves=_last_two_moves(action_seq),
        last_move_dict=deepcopy(last_move_dict),
        played_cards=deepcopy(played_cards),
        all_handcards=deepcopy(hands),
        last_pid=_last_pid(room, action_seq),
        bomb_num=sum(1 for action in action_seq if action in BOMBS),
    )


def get_douzero_legal_actions(player: Player, room: Room) -> List[List[int]]:
    """Use DouZero's move generator when the optional package is installed."""
    from douzero.env import move_detector as md
    from douzero.env import move_selector as ms
    from douzero.env.move_generator import MovesGener

    hand_cards = sorted(pokers_to_douzero_cards(player.hand_pokers))
    generator = MovesGener(hand_cards)
    rival_move = _last_move(_action_sequence(room))
    rival_type = md.get_move_type(rival_move)
    rival_move_type = rival_type['type']
    rival_move_len = rival_type.get('len', 1)
    moves = []

    if rival_move_type == md.TYPE_0_PASS:
        moves = generator.gen_moves()
    elif rival_move_type == md.TYPE_1_SINGLE:
        moves = ms.filter_type_1_single(generator.gen_type_1_single(), rival_move)
    elif rival_move_type == md.TYPE_2_PAIR:
        moves = ms.filter_type_2_pair(generator.gen_type_2_pair(), rival_move)
    elif rival_move_type == md.TYPE_3_TRIPLE:
        moves = ms.filter_type_3_triple(generator.gen_type_3_triple(), rival_move)
    elif rival_move_type == md.TYPE_4_BOMB:
        all_moves = generator.gen_type_4_bomb() + generator.gen_type_5_king_bomb()
        moves = ms.filter_type_4_bomb(all_moves, rival_move)
    elif rival_move_type == md.TYPE_5_KING_BOMB:
        moves = []
    elif rival_move_type == md.TYPE_6_3_1:
        moves = ms.filter_type_6_3_1(generator.gen_type_6_3_1(), rival_move)
    elif rival_move_type == md.TYPE_7_3_2:
        moves = ms.filter_type_7_3_2(generator.gen_type_7_3_2(), rival_move)
    elif rival_move_type == md.TYPE_8_SERIAL_SINGLE:
        all_moves = generator.gen_type_8_serial_single(repeat_num=rival_move_len)
        moves = ms.filter_type_8_serial_single(all_moves, rival_move)
    elif rival_move_type == md.TYPE_9_SERIAL_PAIR:
        all_moves = generator.gen_type_9_serial_pair(repeat_num=rival_move_len)
        moves = ms.filter_type_9_serial_pair(all_moves, rival_move)
    elif rival_move_type == md.TYPE_10_SERIAL_TRIPLE:
        all_moves = generator.gen_type_10_serial_triple(repeat_num=rival_move_len)
        moves = ms.filter_type_10_serial_triple(all_moves, rival_move)
    elif rival_move_type == md.TYPE_11_SERIAL_3_1:
        all_moves = generator.gen_type_11_serial_3_1(repeat_num=rival_move_len)
        moves = ms.filter_type_11_serial_3_1(all_moves, rival_move)
    elif rival_move_type == md.TYPE_12_SERIAL_3_2:
        all_moves = generator.gen_type_12_serial_3_2(repeat_num=rival_move_len)
        moves = ms.filter_type_12_serial_3_2(all_moves, rival_move)
    elif rival_move_type == md.TYPE_13_4_2:
        moves = ms.filter_type_13_4_2(generator.gen_type_13_4_2(), rival_move)
    elif rival_move_type == md.TYPE_14_4_22:
        moves = ms.filter_type_14_4_22(generator.gen_type_14_4_22(), rival_move)

    if rival_move_type not in (md.TYPE_0_PASS, md.TYPE_4_BOMB, md.TYPE_5_KING_BOMB):
        moves = moves + generator.gen_type_4_bomb() + generator.gen_type_5_king_bomb()
    if rival_move:
        moves = moves + [[]]

    for move in moves:
        move.sort()
    return moves


def _hands_by_position(room: Room) -> Dict[str, List[int]]:
    hands = {pos: [] for pos in INFOSET_POSITIONS}
    for room_player in room.players:
        if not room_player:
            continue
        position = seat_to_douzero_position(room_player.seat, room.landlord_seat)
        hands[position] = sorted(pokers_to_douzero_cards(room_player.hand_pokers))
    return hands


def _action_sequence(room: Room) -> List[List[int]]:
    actions = []
    for shot in room.shot_round:
        actions.append(sorted(pokers_to_douzero_cards(shot)))
    return actions


def _played_cards_by_position(room: Room) -> Dict[str, List[int]]:
    played_cards = {pos: [] for pos in INFOSET_POSITIONS}
    for index, shot in enumerate(room.shot_round):
        seat = (room.landlord_seat + index) % 3
        position = seat_to_douzero_position(seat, room.landlord_seat)
        played_cards[position] += sorted(pokers_to_douzero_cards(shot))
    return played_cards


def _last_move_dict(room: Room) -> Dict[str, List[int]]:
    last_move_dict = {pos: [] for pos in INFOSET_POSITIONS}
    for index, shot in enumerate(room.shot_round):
        seat = (room.landlord_seat + index) % 3
        position = seat_to_douzero_position(seat, room.landlord_seat)
        last_move_dict[position] = sorted(pokers_to_douzero_cards(shot))
    return last_move_dict


def _last_move(action_seq: List[List[int]]) -> List[int]:
    if not action_seq:
        return []
    if not action_seq[-1]:
        return list(action_seq[-2]) if len(action_seq) >= 2 else []
    return list(action_seq[-1])


def _last_two_moves(action_seq: List[List[int]]) -> List[List[int]]:
    last_two_moves = [[], []]
    for action in action_seq[-2:]:
        last_two_moves.insert(0, list(action))
        last_two_moves = last_two_moves[:2]
    return last_two_moves


def _last_pid(room: Room, action_seq: List[List[int]]) -> str:
    if room.last_shot_poker:
        return seat_to_douzero_position(room.last_shot_seat, room.landlord_seat)
    if action_seq:
        for index in range(len(action_seq) - 1, -1, -1):
            if action_seq[index]:
                seat = (room.landlord_seat + index) % 3
                return seat_to_douzero_position(seat, room.landlord_seat)
    return 'landlord'
