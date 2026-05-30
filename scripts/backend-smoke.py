import asyncio

from tornado.web import HTTPError

from api.game.globalvar import GlobalVar
from api.game.player import Player
from api.game.room import Room
from api.game.timer import Timer
from api.game.views import parse_bool
from models import Record


def reset_rooms() -> None:
    GlobalVar.__waiting_rooms__.clear()
    GlobalVar.__playing_rooms__.clear()
    GlobalVar.total_room_count = 0


async def check_timer() -> None:
    fired = asyncio.Event()
    timer = Timer(fired.set, timeout=1)
    timer.start_timing(1)
    await asyncio.wait_for(fired.wait(), timeout=3)


async def check_missing_room_join() -> None:
    class ProbePlayer(Player):
        def __init__(self):
            super().__init__(1, 'probe')
            self.errors = []

        def write_error(self, reason):
            self.errors.append(reason)

    reset_rooms()
    player = ProbePlayer()
    await player.on_message(1005, {'room': 999, 'level': 1})
    assert player.errors == ['Room[999] Not Found'], player.errors
    assert player.room is None
    assert GlobalVar.__waiting_rooms__ == {}


async def check_record_snapshot() -> None:
    class Socket:
        def __init__(self):
            self.saved = None

        async def insert(self, record):
            self.saved = record.round

    room = Room(1)
    players = [Player(i + 1, f'p{i + 1}') for i in range(3)]
    for seat, player in enumerate(players):
        player.seat = seat
        player.room = room
        player._hand_pokers = [seat + 1]
    players[0].socket = Socket()
    players[1].landlord = 1
    room.players = players
    room.shot_round = [[1], [], [2, 3]]
    await room.save_shot_round()
    room.shot_round[0].append(99)
    players[1]._hand_pokers.append(88)
    saved = players[0].socket.saved
    assert saved['round'] == [[1], [], [2, 3]], saved
    assert saved['left'][1] == [2], saved
    assert saved['lord'] == 1, saved


def check_parse_bool() -> None:
    for value in (True, 1, '1', 'true', 'yes', 'on', ' TRUE '):
        assert parse_bool(value) is True, value
    for value in (False, 0, '0', 'false', 'no', 'off', ' FALSE '):
        assert parse_bool(value) is False, value
    for value in ('', 'maybe', 2, object()):
        try:
            parse_bool(value)
        except HTTPError as error:
            assert error.status_code == 400
        else:
            raise AssertionError(value)


async def main() -> None:
    reset_rooms()
    assert GlobalVar.find_room(999, 1, True) is None
    quick = GlobalVar.find_room(-1, 1, True)
    assert quick.room_id == 1
    assert Player(1, 'probe').allow_robot is False
    assert Record.__table__.c.round.default.arg(None) == {}
    check_parse_bool()
    await check_timer()
    await check_missing_room_join()
    await check_record_snapshot()
    print('backend-smoke-ok')


if __name__ == '__main__':
    asyncio.run(main())
