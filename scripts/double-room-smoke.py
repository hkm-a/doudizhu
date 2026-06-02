"""Smoke test for Room double phase + 5 personalities in room context.

Exercises:
  - Room.__init__ initializes double_turn_seat=-1, _double_decisions={}
  - start_double_phase picks the first non-landlord player
  - on_double accumulates landlord / farmer multiples correctly
  - on_double with all 3 decisions returns True (end)
  - restart() resets double phase state
  - 5 personalities in room context with strong / weak hands
  - Round-trip: choose_double writes decision_log with personality + room context

Exits 0 on success, 1 on any failure.
"""
from __future__ import annotations

import os
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import MagicMock

from ai.decision_log import get_decision_logger
from ai.personality import PersonalityMode
from ai.policy import RuleBasedPolicy
from api.game.player import State


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _build_player(uid: int, seat: int, hand: list, is_landlord: bool = False) -> SimpleNamespace:
    def _change_state(new_state):
        p.state = new_state
    p = SimpleNamespace(
        uid=uid,
        name=f'P{uid}',
        seat=seat,
        landlord=1 if is_landlord else 0,
        is_left=lambda: False,
        hand_pokers=list(hand),
        state=State.CALL_SCORE,
        socket=None,
        timeout=20,
        change_state=_change_state,
        restart=MagicMock(),
        write_message=MagicMock(),
    )
    return p


def _build_room() -> MagicMock:
    """Build a Room-like with a stubbed Timer so smoke does not need IOLoop."""
    # Patch the Timer at import site so Room.__init__ uses the stub.
    import api.game.room as room_mod
    real_timer = room_mod.Timer
    room_mod.Timer = MagicMock()
    try:
        from api.game.room import Room
        # seat 0 = landlord (after rob end), seat 1/2 = farmers
        room = Room(room_id=1, level=1, allow_robot=False)
        room.timer = MagicMock()
        room.timer.timeout = 0
        # Manually assign players (skip on_join / on_rob which need real state machine)
        p0 = _build_player(101, 0, [2, 15, 28, 41, 53, 54, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16], is_landlord=True)
        p1 = _build_player(102, 1, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36], is_landlord=False)
        p2 = _build_player(103, 2, [37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 6, 7, 8], is_landlord=False)
        room.players = [p0, p1, p2]
        room.landlord_seat = 0
        return room
    finally:
        room_mod.Timer = real_timer


def _exercise_init_state() -> None:
    import api.game.room as room_mod
    real_timer = room_mod.Timer
    room_mod.Timer = MagicMock()
    try:
        from api.game.room import Room
        room = Room(room_id=2, level=1, allow_robot=False)
        _assert(room.double_turn_seat == -1, f'init double_turn_seat should be -1, got {room.double_turn_seat}')
        _assert(room._double_decisions == {}, f'init _double_decisions should be empty, got {room._double_decisions}')
    finally:
        room_mod.Timer = real_timer


def _exercise_start_double_phase() -> None:
    room = _build_room()
    room.start_double_phase()
    # seat 1 is the first non-landlord (seat 0 is landlord)
    _assert(room.double_turn_seat == 1, f'first double turn should be seat 1, got {room.double_turn_seat}')


def _exercise_full_double_round() -> None:
    room = _build_room()
    room.start_double_phase()

    # Farmer at seat 1 doubles
    is_end = room.on_double(room.players[1], 1)
    _assert(not is_end, 'after first farmer, should not be end')
    _assert(room._multiple_details['farmer'] == 2, f'farmer multiple should be 2, got {room._multiple_details["farmer"]}')
    _assert(room.double_turn_seat == 2, f'second double turn should be seat 2, got {room.double_turn_seat}')

    # Farmer at seat 2 does NOT double
    is_end = room.on_double(room.players[2], 0)
    _assert(not is_end, 'after second farmer, should not be end')
    _assert(room._multiple_details['farmer'] == 2, f'farmer multiple should still be 2, got {room._multiple_details["farmer"]}')
    _assert(room.double_turn_seat == 0, f'third double turn should be landlord seat 0, got {room.double_turn_seat}')

    # Landlord doubles
    is_end = room.on_double(room.players[0], 1)
    _assert(is_end, 'after landlord, should be end')
    _assert(room._multiple_details['landlord'] == 2, f'landlord multiple should be 2, got {room._multiple_details["landlord"]}')
    _assert(room._multiple_details['farmer'] == 2, f'farmer multiple should still be 2, got {room._multiple_details["farmer"]}')

    # Verify 3 decisions recorded
    _assert(len(room._double_decisions) == 3, f'expected 3 decisions, got {len(room._double_decisions)}')
    _assert(room._double_decisions[101] == 1, 'landlord doubled')
    _assert(room._double_decisions[102] == 1, 'farmer 1 doubled')
    _assert(room._double_decisions[103] == 0, 'farmer 2 did not double')


def _exercise_all_skip() -> None:
    """All 3 choose 0 — multiple stays at 1."""
    room = _build_room()
    room.start_double_phase()
    room.on_double(room.players[1], 0)
    room.on_double(room.players[2], 0)
    is_end = room.on_double(room.players[0], 0)
    _assert(is_end, 'all-skip should still be end')
    _assert(room._multiple_details['farmer'] == 1, f'farmer multiple should be 1, got {room._multiple_details["farmer"]}')
    _assert(room._multiple_details['landlord'] == 1, f'landlord multiple should be 1, got {room._multiple_details["landlord"]}')


def _exercise_restart_resets() -> None:
    room = _build_room()
    room.start_double_phase()
    room.on_double(room.players[1], 1)
    room.restart()
    _assert(room.double_turn_seat == -1, f'restart should reset double_turn_seat, got {room.double_turn_seat}')
    _assert(room._double_decisions == {}, f'restart should reset _double_decisions, got {room._double_decisions}')


def _exercise_skip_to_playing() -> None:
    """No non-landlord players → start_double_phase falls through to PLAYING."""
    import api.game.room as room_mod
    real_timer = room_mod.Timer
    room_mod.Timer = MagicMock()
    try:
        from api.game.room import Room
        room = Room(room_id=3, level=1, allow_robot=False)
        room.timer = MagicMock()
        # All 3 are landlord (degenerate case)
        room.players = [
            _build_player(201, 0, [1], is_landlord=True),
            _build_player(202, 1, [1], is_landlord=True),
            _build_player(203, 2, [1], is_landlord=True),
        ]
        room.landlord_seat = 0
        room._multiple_details['landlord'] = 5
        room.start_double_phase()
        # Should have skipped to PLAYING state on all 3
        for p in room.players:
            _assert(p.state == State.PLAYING, f'expected PLAYING, got {p.state}')
        _assert(room.double_turn_seat == -1, 'should reset double_turn_seat')
    finally:
        room_mod.Timer = real_timer


def _exercise_ai_in_room_context() -> None:
    """All 5 personalities in room context + decision_log written with room context."""
    log_path = tempfile.NamedTemporaryFile(prefix='double-room-', suffix='.jsonl', delete=False).name
    open(log_path, 'w').close()
    os.environ['AI_DECISION_LOG_PATH'] = log_path
    from ai import decision_log as _dl
    _dl.get_decision_logger.cache_clear()  # type: ignore[attr-defined]

    try:
        for mode in PersonalityMode:
            room = _build_room()
            policy = RuleBasedPolicy()
            decisions = []
            for player in room.players[1:]:  # farmers
                d = policy.choose_double(player, room, personality=mode)
                decisions.append(d)
            for player in [room.players[0]]:  # landlord
                d = policy.choose_double(player, room, personality=mode)
                decisions.append(d)
            _assert(all(d in (0, 1) for d in decisions), f'all decisions should be 0/1, got {decisions}')

        # Verify log has 5 personalities * 3 decisions = 15 double events with room context
        with open(log_path, encoding='utf-8') as log_file:
            double_events = [line for line in log_file if '"mode": "double"' in line]
        _assert(len(double_events) == 15, f'expected 15 double events, got {len(double_events)}')

        # Each event should have room.id and personality fields
        first_event = double_events[0]
        _assert('"personality"' in first_event, 'double event should have personality')
        _assert('"room"' in first_event, 'double event should have room context')
    finally:
        if os.path.exists(log_path):
            os.unlink(log_path)


def _exercise_room_personality_propagation() -> None:
    """GDD v0.2 F 章节：room.personality 字段被 set 后，AI 决策应该用该 personality。

    对每个 PersonalityMode 创建 Room，重复 50 次 choose_double，验证激进性格
    在同强牌上比保守性格加倍更频繁。
    """
    from api.game.room import Room
    from unittest.mock import MagicMock
    import api.game.room as room_mod
    real_timer = room_mod.Timer
    room_mod.Timer = MagicMock()
    try:
        policy = RuleBasedPolicy()
        results = {}
        for mode in PersonalityMode:
            room = Room(room_id=100 + list(PersonalityMode).index(mode), level=1, allow_robot=False, personality=mode)
            room.timer = MagicMock()
            room.players = [
                _build_player(101, 0, [2, 15, 28, 41, 53, 54, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16], is_landlord=True),
                _build_player(102, 1, [17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32, 33, 34, 35, 36], is_landlord=False),
                _build_player(103, 2, [37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 1, 6, 7, 8], is_landlord=False),
            ]
            _assert(room.personality == mode, f'room.personality should be {mode}, got {room.personality}')
            # Use room.personality (the propagation path) instead of passing mode directly
            n_double = 0
            for _ in range(50):
                d = policy.choose_double(room.players[0], room, personality=room.personality)
                if d == 1:
                    n_double += 1
            results[mode.value] = n_double

        # Aggressive should double more than conservative on the same strong hand
        _assert(
            results['aggressive'] >= results['conservative'],
            f'aggressive should double >= conservative via room.personality, got {results}',
        )
    finally:
        room_mod.Timer = real_timer


def main() -> int:
    try:
        _exercise_init_state()
        _exercise_start_double_phase()
        _exercise_full_double_round()
        _exercise_all_skip()
        _exercise_restart_resets()
        _exercise_skip_to_playing()
        _exercise_ai_in_room_context()
        _exercise_room_personality_propagation()
        print('double-room-smoke OK: init + start_phase + 3-decision round + all-skip + restart + degenerate-skip + AI in room context + room.personality propagation')
        return 0
    except AssertionError as e:
        print(f'double-room-smoke FAIL: {e}', file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover - defensive
        print(f'double-room-smoke ERROR: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
