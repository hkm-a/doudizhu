from __future__ import annotations

import functools
import logging
from typing import TYPE_CHECKING, List, Optional, Dict, Any

from tornado.ioloop import IOLoop

from game.player import PureGamePlayer
from game.state import State
from .protocol import Protocol as Pt
from .rule import rule

if TYPE_CHECKING:
    from .room import Room
    from .views import SocketHandler

logger = logging.getLogger(__file__)


def shot_turn(func):
    @functools.wraps(func)
    async def wrapper(player, *args, **kwargs):
        room = player.room
        if room and room.whose_turn == player.seat and room.turn_player is player:
            return await func(player, *args, **kwargs)
        else:
            player.write_error('TURN ERROR')

    return wrapper


class Player(PureGamePlayer):

    def __init__(self, uid: int, name: str, sex: int = 1, avatar: str = '', point: int = 1000, **kwargs):
        super().__init__(uid, name, sex, avatar, point)
        self.room: Optional[Room] = None
        self.state = State.INIT
        self.socket: Optional[SocketHandler] = None

    def restart(self):
        super().restart()
        self.state = State.WAITING

    def sync_data(self, real=True) -> Dict[str, str]:
        return {
            'uid': self.uid,
            'name': self.name,
            'sex': self.sex,
            'avatar': self.avatar,
            'ready': self.ready,
            'rob': self.rob,
            'leave': self._leave,
            'landlord': self.landlord,
            'point': self.point,
            'pokers': self.hand_pokers if real else [0] * len(self.hand_pokers),
        }

    def push_pokers(self, pokers: List[int]):
        super().push_pokers(pokers)

        def compare_single_poker(poker: int):
            if poker == 53 or poker == 54:
                return poker
            poker = poker % 13
            if poker <= 2:
                return poker + 13
            return poker

        self._hand_pokers.sort(key=compare_single_poker)

    async def on_message(self, code: int, packet: Dict[str, Any]):
        if self.is_left():
            if self.handle_leave(code, packet):
                return

        if code == Pt.REQ_LEAVE_ROOM:
            self.leave_room()
            return
        if code == Pt.REQ_CHAT:
            self.handle_chat(packet)
            return

        if self.state == State.INIT:
            self.handle_init(code, packet)
        elif self.state == State.WAITING:
            self.handle_waiting(code, packet)
        elif self.state == State.CALL_SCORE:
            await self.handle_call_score(code, packet)
        elif self.state == State.DOUBLE:
            await self.handle_double(code, packet)
        elif self.state == State.PLAYING:
            await self.handle_playing(code, packet)
        elif self.state == State.GAME_OVER:
            self.handle_game_over(code, packet)

    def handle_chat(self, packet: Dict[str, Any]):
        if not self.room:
            self.write_error('Room not joined')
            return

        message = packet.get('message') if isinstance(packet, dict) else None
        if not isinstance(message, str):
            self.write_error('Invalid chat message')
            return

        message = message.strip()
        if not message or len(message) > 24:
            self.write_error('Invalid chat message')
            return

        self.room.broadcast([Pt.RSP_CHAT, {'uid': self.uid, 'message': message}])

    def on_disconnect(self):
        self.set_left()

    def leave_room(self):
        if self.room and self.state in (State.INIT, State.WAITING, State.GAME_OVER):
            room = self.room
            room.broadcast([Pt.RSP_LEAVE_ROOM, {'uid': self.uid}])
            room.on_leave(self)
            room.sync_room()
            self.room = None
            self.seat = -1
            self.set_left(0)
            self.restart()
            self.state = State.INIT
            return True

        self.on_disconnect()
        return False

    def on_timeout(self):
        IOLoop.current().add_callback(self.handle_timeout)

    async def handle_timeout(self):
        room = self.room
        if self.state in (State.CALL_SCORE, State.PLAYING) and room is None:
            logger.warning('USER[%d] timeout skipped because room is missing', self.uid)
            return False

        if self.state == State.CALL_SCORE:
            await self.handle_call_score(Pt.REQ_CALL_SCORE, {'rob': 0})
            return True
        elif self.state == State.DOUBLE:
            await self.handle_double(Pt.REQ_DOUBLE, {'double': 0})
            return True
        elif self.state == State.PLAYING:
            if not room.last_shot_poker or room.last_shot_seat == self.seat:
                await self.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': rule.find_best_shot(self.hand_pokers)})
            else:
                await self.handle_playing(Pt.REQ_SHOT_POKER, {'pokers': []})
            return True
        return False

    def to_server(self, code: int, packet: Dict[str, Any]):
        IOLoop.current().add_callback(self.on_message, code, packet)

    def handle_leave(self, code: int, packet: Dict[str, Any]):
        from .globalvar import GlobalVar
        if code == Pt.REQ_JOIN_ROOM:
            room_id, level = packet.get('room', -1), packet.get('level', 1)
            if room_id == -1:
                self.set_left(0)
                self.restart()
                self.state = State.INIT
                if self.room:
                    self.room.on_leave(self)
                    self.room = None
                return False

            room = GlobalVar.find_room(room_id, level, self.allow_robot)
            if room is None:
                self.write_error('Room[%s] Not Found' % room_id)
            elif self.room == room:
                self.set_left(0)
                room.sync_room()
                logger.info('PLAYER[%s] REJOIN ROOM[%d]', self.uid, room.room_id)
            else:
                self.write_error('Room[%s] Not Joined' % room_id)
        return True

    def handle_init(self, code: int, packet: Dict[str, Any]):
        from .globalvar import GlobalVar
        from .room import Room
        from ai.personality import PersonalityMode
        if code == Pt.REQ_JOIN_ROOM:
            room_id, level = packet.get('room', -1), packet.get('level', 1)
            requested_profile = Room.level_profile(level)
            if self.point < requested_profile['min_point']:
                self.write_error('Insufficient point for room level')
                return

            personality_str = packet.get('personality', 'balanced')
            try:
                personality = PersonalityMode(personality_str)
            except ValueError:
                personality = PersonalityMode.BALANCED

            room = GlobalVar.find_room(room_id, level, self.allow_robot, personality=personality)
            if room is None:
                self.write_error('Room[%s] Not Found' % room_id)
                return

            if room.personality != personality:
                pass

            self.state = State.WAITING
            if self.join_room(room):
                self.room.sync_room()
            logger.info('PLAYER[%s] JOIN ROOM[%d] [personality=%s]', self.uid, room.room_id, room.personality.value)

            if room.is_full():
                GlobalVar.on_room_changed(room)
                logger.info('ROOM[%s] FULL[%s]', room.room_id, room.players)
        else:
            self.write_error('ERROR STATE[%s]' % self.state)

    def handle_waiting(self, code: int, packet: Dict[str, Any]):
        if code == Pt.REQ_READY:
            ready = packet.get('ready')
            if not self._is_protocol_bit(ready):
                self.write_error('Invalid ready value')
                return

            self.ready = ready
            if self.room.is_ready():
                if self.room.on_deal_poker():
                    self.change_state(State.CALL_SCORE)
        else:
            self.write_error('STATE[%s]' % self.state)

    @shot_turn
    async def handle_call_score(self, code: int, packet: Dict[str, Any]):
        if code == Pt.REQ_CALL_SCORE:
            rob = packet.get('rob')
            if not self._is_protocol_bit(rob):
                self.write_error('Invalid rob value')
                return

            self.rob = rob

            is_end = self.room.on_rob(self)
            if is_end:
                self.room.start_double_phase()
                self.change_state(State.DOUBLE)
                logger.info('ROB END LANDLORD[%s] -> DOUBLE phase', self.room.landlord)

            response = [Pt.RSP_CALL_SCORE, {
                'uid': self.uid,
                'rob': self.rob,
                'landlord': self.room.landlord.uid if is_end else -1,
                'multiple': self.room.multiple,
                'pokers': self.room.pokers if is_end else [],
            }]
            self.room.broadcast(response)
        else:
            self.write_error('STATE[%s]' % self.state)

    async def handle_double(self, code, packet):
        if not self.room:
            self.write_error('Room not joined')
            return
        if self.room.double_turn_seat != self.seat:
            self.write_error('TURN ERROR (double phase)')
            return
        if code != Pt.REQ_DOUBLE:
            self.write_error('STATE[%s]' % self.state)
            return
        choice = packet.get('double')
        if not self._is_protocol_bit(choice):
            self.write_error('Invalid double value')
            return
        is_end = self.room.on_double(self, choice)
        self.room.broadcast([Pt.RSP_DOUBLE, {
            'uid': self.uid,
            'double': choice,
            'multiple': self.room._multiple_details,
            'phase': 'end' if is_end else 'continue',
        }])
        if is_end:
            self.change_state(State.PLAYING)
            self.room.whose_turn = self.room.landlord_seat
            self.room.timer.start_timing(self.room.turn_player.timeout)

    @shot_turn
    async def handle_playing(self, code, packet):
        if code == Pt.REQ_SHOT_POKER:
            pokers = packet.get('pokers')
            if not self._is_valid_poker_list(pokers):
                self.write_error('Invalid pokers')
                return

            if not rule.is_contains(self._hand_pokers, pokers):
                self.write_error('Poker does not exist')
                return

            error = self.room.on_shot(self.seat, pokers)
            if error:
                self.write_error(error)
                return

            for p in pokers:
                self._hand_pokers.remove(p)

            self.room.broadcast([Pt.RSP_SHOT_POKER, {'uid': self.uid, 'pokers': pokers, 'multiple': self.room.multiple}])
            logger.info('USER[%d] shot %s', self.uid, pokers)

            if self._hand_pokers:
                self.room.go_next_turn()
            else:
                self.change_state(State.GAME_OVER)
                self.room.on_game_over(self)
                await self.room.save_player_points()
                await self.room.save_shot_round()
        else:
            self.write_error('STATE[%s]' % self.state)

    @staticmethod
    def normalize_point(point) -> int:
        try:
            return int(point)
        except (TypeError, ValueError):
            return 1000

    @staticmethod
    def _is_valid_poker_list(pokers) -> bool:
        return (
            isinstance(pokers, list)
            and all(type(poker) is int and 1 <= poker <= 54 for poker in pokers)
        )

    @staticmethod
    def _is_protocol_bit(value) -> bool:
        return type(value) is int and value in (0, 1)

    def handle_game_over(self, code: int, packet: Dict[str, Any]):
        self.write_error('STATE[%s]' % self.state)

    def change_state(self, state: State):
        for player in self.room.players:
            if player:
                player.state = state

    def write_message(self, packet):
        if not self.socket:
            logger.warning('USER[%d] missing socket for response %s', self.uid, packet)
            return False
        self.socket.write_message(packet)
        return True

    def write_error(self, reason: str):
        if self.socket:
            self.socket.write_message([Pt.ERROR, {'reason': reason}])
        logger.error('USER[%d][%s] %s', self.uid, self.state, reason)

    @property
    def ready(self) -> int:
        return self._ready

    @ready.setter
    def ready(self, val):
        self._ready = val
        if self.room:
            self.room.broadcast([Pt.RSP_READY, {'uid': self.uid, 'ready': self._ready}])

    @property
    def timeout(self):
        return 5 if self.is_left() else 20

    def set_left(self, is_left=1):
        self._leave = is_left
        if is_left:
            from .globalvar import GlobalVar
            if self.room:
                self.room.broadcast([Pt.RSP_LEAVE_ROOM, {'uid': self.uid}])

    @property
    def allow_robot(self) -> bool:
        if not self.socket:
            return False
        return self.socket.allow_robot

    def join_room(self, room: Room):
        if room.is_full():
            self.write_error('Room[%s] FULL' % room.room_id)
            return False

        self.set_left(0)
        self.room = room
        return room.on_join(self)
