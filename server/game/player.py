from __future__ import annotations

from typing import List


class PureGamePlayer:
    def __init__(self, uid: int, name: str, sex: int = 1, avatar: str = '',
                 point: int = 1000):
        self.uid = uid
        self.name = name
        self.sex = sex
        self.avatar = avatar
        self.point = self.normalize_point(point)
        self.seat: int = -1
        self._ready: int = 0
        self.rob: int = -1
        self.landlord: int = 0
        self._leave: int = 0
        self._hand_pokers: List[int] = []
        self._is_robot: bool = False

    def restart(self) -> None:
        self._ready = 0
        self._hand_pokers = []
        self.rob = -1
        self.landlord = 0

    def push_pokers(self, pokers: List[int]) -> None:
        self._hand_pokers.extend(pokers)

    @property
    def hand_pokers(self) -> List[int]:
        return self._hand_pokers

    @property
    def ready(self) -> int:
        return self._ready

    @ready.setter
    def ready(self, val: int) -> None:
        self._ready = val

    def is_left(self) -> bool:
        return self._leave == 1

    def set_left(self, is_left: int = 1) -> None:
        self._leave = is_left

    @property
    def timeout(self) -> int:
        return 0 if self._leave else 20

    @staticmethod
    def normalize_point(point) -> int:
        return max(point, 0) if isinstance(point, (int, float)) else 0

    @staticmethod
    def _is_valid_poker_list(pokers) -> bool:
        if not isinstance(pokers, (list, tuple)):
            return False
        return all(isinstance(p, int) and 0 < p < 55 for p in pokers)

    @staticmethod
    def _is_protocol_bit(value) -> bool:
        if not isinstance(value, int):
            return False
        return value in (0, 1)

    def sync_data(self, real: bool = True) -> dict:
        data = {
            'uid': self.uid,
            'name': self.name,
            'sex': self.sex,
            'avatar': self.avatar,
            'ready': self._ready,
            'rob': self.rob,
            'leave': self._leave,
            'landlord': self.landlord,
            'point': self.point,
        }
        if real:
            data['pokers'] = list(self._hand_pokers)
        return data

    def __repr__(self) -> str:
        return f'{self.uid}-{self.name}'

    def __str__(self) -> str:
        return self.__repr__()

    def __eq__(self, other) -> bool:
        return isinstance(other, PureGamePlayer) and self.uid == other.uid

    def __ne__(self, other) -> bool:
        return not self.__eq__(other)

    def __hash__(self) -> int:
        return self.uid
