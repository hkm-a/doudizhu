import logging
from typing import Dict, Optional

from .player import Player
from .room import Room


class GlobalVar(object):
    room_levels = (1, 2, 3)
    total_room_count = 0
    __players__: Dict[int, Player] = {}
    __waiting_rooms__: Dict[int, Room] = {}
    __playing_rooms__: Dict[int, Room] = {}

    @classmethod
    def room_list(cls):
        rooms = {level: 0 for level in cls.room_levels}
        for room in list(cls.__waiting_rooms__.values()) + list(cls.__playing_rooms__.values()):
            rooms.setdefault(room.level, 0)
            rooms[room.level] += cls.active_room_size(room)
        return [cls.room_level_summary(level, number) for level, number in rooms.items()]

    @classmethod
    def room_level_summary(cls, level: int, number: int):
        profile = Room.level_profile(level)
        return {
            'level': level,
            'label': profile['label'],
            'origin': profile['origin'],
            'min_point': profile['min_point'],
            'number': number,
        }

    @staticmethod
    def active_room_size(room: Room) -> int:
        return sum([
            player is not None and not player.is_left()
            for player in room.players
        ])

    @classmethod
    def lobby_summary(cls):
        active_players = [
            player
            for player in cls.__players__.values()
            if player and not player.is_left()
        ]
        return {
            'players': len(active_players),
            'waiting_rooms': len(cls.__waiting_rooms__),
            'playing_rooms': len(cls.__playing_rooms__),
        }

    @classmethod
    def find_player(cls, uid: int, *args, **kwargs) -> Player:
        if uid not in cls.__players__:
            cls.__players__[uid] = Player(uid, *args, **kwargs)
        return cls.__players__[uid]

    @classmethod
    def find_player_room_id(cls, uid: int) -> int:
        player = cls.__players__.get(uid)
        if player and player.room:
            return player.room.room_id
        return -1

    @classmethod
    def remove_player(cls, uid: int):
        cls.__players__.pop(uid, None)

    @classmethod
    def new_room(cls, level: int, allow_robot: bool, personality=None) -> Room:
        room = Room(cls.gen_room_id(), level, allow_robot, personality=personality)
        cls.__waiting_rooms__[room.room_id] = room
        logging.info('ROOM[%s] CREATED [personality=%s]', room, room.personality.value)
        return room

    @classmethod
    def find_room(cls, room_id: int, level: int, allow_robot: bool, personality=None) -> Optional[Room]:
        if room_id in cls.__waiting_rooms__:
            return cls.__waiting_rooms__[room_id]

        if room_id in cls.__playing_rooms__:
            return cls.__playing_rooms__[room_id]

        if room_id != -1:
            return None

        for _, room in cls.__waiting_rooms__.items():
            if room.level != level or room.has_robot():
                continue
            return room
        return cls.new_room(level, allow_robot, personality=personality)

    @classmethod
    def on_room_changed(cls, room: Room):
        if room.is_full():
            cls.__waiting_rooms__.pop(room.room_id, None)
            cls.__playing_rooms__[room.room_id] = room
            logging.info('Room[%s] FULL', room)
        if room.is_empty():
            cls.__waiting_rooms__.pop(room.room_id, None)
            cls.__playing_rooms__.pop(room.room_id, None)
            logging.info('Room[%s] CLOSED', room)

    @classmethod
    def gen_room_id(cls) -> int:
        cls.total_room_count += 1
        if cls.total_room_count > 999999:
            cls.total_room_count = 1
        return cls.total_room_count
