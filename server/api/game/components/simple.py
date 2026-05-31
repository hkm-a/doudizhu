from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from tornado.ioloop import IOLoop

from ..player import Player
from ..protocol import Protocol as Pt
from ai.policy import get_robot_policy

if TYPE_CHECKING:
    from ..room import Room

logger = logging.getLogger(__file__)


class RobotPlayer(Player):

    def __init__(self, uid: int, name: str, sex: int = 1, avatar: str = 0, room: Room = None, **kwargs):
        super().__init__(uid, name, sex, avatar, **kwargs)
        self.room = room

    @property
    def allow_robot(self) -> bool:
        return True

    def to_server(self, code, packet):
        IOLoop.current().add_callback(self.on_message, code, packet)

    def write_message(self, packet):
        IOLoop.current().add_callback(self._write_message, packet)
        return True

    def _write_message(self, packet):
        code = packet[0]
        if code == Pt.RSP_JOIN_ROOM:
            self.auto_ready()
        elif code == Pt.RSP_DEAL_POKER:
            if self.uid == packet[1]['uid']:
                self.auto_rob()
        elif code == Pt.RSP_CALL_SCORE:
            if self.room and self.room.turn_player == self:
                landlord = packet[1]['landlord']
                if landlord == -1:
                    self.auto_rob()
                elif self.room and self.room.turn_player == self:
                    IOLoop.current().call_later(1, self.auto_shot)
        elif code == Pt.RSP_SHOT_POKER:
            if self.room and self.room.turn_player == self and self.hand_pokers:
                self.auto_shot()
        elif code == Pt.RSP_GAME_OVER:
            IOLoop.current().call_later(5, self.auto_ready)
        return True

    def auto_ready(self):
        if not self.room:
            logger.warning('ROBOT[%d] auto ready skipped because room is missing', self.uid)
            return False
        IOLoop.current().add_callback(self.to_server, Pt.REQ_READY, {'ready': 1})
        return True

    def auto_rob(self):
        if not self.room:
            logger.warning('ROBOT[%d] auto rob skipped because room is missing', self.uid)
            return False
        if self.room.turn_player != self:
            logger.warning('ROBOT[%d] auto rob skipped because it is not the turn player', self.uid)
            return False
        rob = get_robot_policy().choose_rob(self)
        IOLoop.current().call_later(1.5, self.to_server, Pt.REQ_CALL_SCORE, {'rob': rob})
        return True

    def auto_shot(self):
        if not self.room:
            logger.warning('ROBOT[%d] auto shot skipped because room is missing', self.uid)
            return False
        if self.room.turn_player != self:
            logger.warning('ROBOT[%d] auto shot skipped because it is not the turn player', self.uid)
            return False
        if not self.hand_pokers:
            logger.warning('ROBOT[%d] auto shot skipped because hand is empty', self.uid)
            return False
        pokers = get_robot_policy().choose_shot(self, self.room)
        IOLoop.current().call_later(2, self.to_server, Pt.REQ_SHOT_POKER, {'pokers': pokers})
        return True
