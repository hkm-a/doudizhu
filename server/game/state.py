from __future__ import annotations

from enum import IntEnum


class State(IntEnum):
    INIT = 0
    WAITING = 1
    CALL_SCORE = 2
    PLAYING = 3
    GAME_OVER = 4
    DOUBLE = 5
