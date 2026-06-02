"""Smoke test for AI double decision + personality layer.

Exercises:
  - PersonalityConfig 5 性格调参返回正确
  - resolve_personality 兜底到 BALANCED
  - RuleBasedPolicy.choose_double 返回 0/1 + 写 decision_log
  - DouZeroPolicy.choose_double fallback 到 RuleBasedPolicy
  - 5 性格 × 多种手牌的偏向不同（保守 vs 激进）

Exits 0 on success, 1 on any failure.
"""
from __future__ import annotations

import os
import sys
import tempfile
from types import SimpleNamespace

from ai.decision_log import AiDecisionLogger, get_decision_logger
from ai.personality import (
    PERSONALITY_PRESETS,
    PersonalityConfig,
    PersonalityMode,
    resolve_personality,
)
from ai.policy import DouZeroPolicy, RuleBasedPolicy
from api.game.protocol import Protocol


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _build_player(uid: int, seat: int, hand: list) -> SimpleNamespace:
    return SimpleNamespace(
        uid=uid,
        seat=seat,
        landlord=False,
        hand_pokers=hand,
    )


def _build_room(landlord_seat: int = 0, multiple: int = 1) -> SimpleNamespace:
    return SimpleNamespace(
        room_id=42,
        level=1,
        landlord_seat=landlord_seat,
        last_shot_seat=-1,
        last_shot_poker=[],
        shot_round=[],
        multiple=multiple,
        players=[
            _build_player(101, 0, [2, 15, 28, 41, 53, 54, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]),
            _build_player(102, 1, [14, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 29, 30, 31, 32]),
            _build_player(103, 2, [33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 46, 47, 48, 49, 50]),
        ],
    )


def _setup_logger_for_double() -> str:
    """Create a fresh decision_log JSONL file and override the cached logger."""
    tmp_dir = tempfile.mkdtemp(prefix='ai-double-smoke-')
    path = os.path.join(tmp_dir, 'ai-decisions.jsonl')
    # Truncate any pre-existing log so smoke is repeatable.
    open(path, 'w').close()
    # Replace the cached logger so policy writes go to this path.
    get_decision_logger.cache_clear()  # type: ignore[attr-defined]
    # Monkey-patch the env var, then re-cache.
    os.environ['AI_DECISION_LOG_PATH'] = path
    # Re-instantiate by clearing and re-importing.
    from ai import decision_log as _dl
    _dl.get_decision_logger.cache_clear()  # type: ignore[attr-defined]
    return path


def _exercise_personality_presets() -> None:
    assert len(PERSONALITY_PRESETS) == 5, 'expected 5 personality presets'
    conservative = PERSONALITY_PRESETS[PersonalityMode.CONSERVATIVE]
    aggressive = PERSONALITY_PRESETS[PersonalityMode.AGGRESSIVE]
    balanced = PERSONALITY_PRESETS[PersonalityMode.BALANCED]
    erratic = PERSONALITY_PRESETS[PersonalityMode.ERRATIC]
    trickster = PERSONALITY_PRESETS[PersonalityMode.TRICKSTER]

    _assert(conservative.double_bias < balanced.double_bias, 'conservative should have lower double_bias than balanced')
    _assert(aggressive.double_bias > balanced.double_bias, 'aggressive should have higher double_bias than balanced')
    _assert(aggressive.rob_threshold < balanced.rob_threshold, 'aggressive should rob with fewer high cards')
    _assert(conservative.rob_threshold > balanced.rob_threshold, 'conservative should need more high cards to rob')
    _assert(erratic.err_rate > 0, 'erratic should have non-zero err_rate')
    _assert(conservative.err_rate == 0, 'conservative should have zero err_rate')
    _assert(trickster.follow_strategy == 'reverse', 'trickster should have reverse follow strategy')


def _exercise_resolve_personality() -> None:
    _assert(resolve_personality(None).mode == PersonalityMode.BALANCED, 'None should fallback to BALANCED')
    _assert(resolve_personality(PersonalityMode.AGGRESSIVE).mode == PersonalityMode.AGGRESSIVE, 'explicit mode passes through')


def _exercise_rule_based_choose_double(log_path: str) -> None:
    policy = RuleBasedPolicy()
    player = _build_player(101, 0, [2, 15, 28, 41, 53, 54, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])  # 6 high cards
    room = _build_room(landlord_seat=0)

    # 100 trials with the same strong hand, across personalities, to expose bias differences
    decisions_by_mode = {}
    for mode in PersonalityMode:
        n_double = 0
        for _ in range(50):
            d = policy.choose_double(player, room, personality=mode)
            _assert(d in (0, 1), f'choose_double must return 0 or 1, got {d}')
            if d == 1:
                n_double += 1
        decisions_by_mode[mode.value] = n_double

    # Aggressive should double more often than conservative on a strong hand
    _assert(
        decisions_by_mode['aggressive'] >= decisions_by_mode['conservative'],
        f"aggressive should double >= conservative, got {decisions_by_mode}",
    )

    # Verify decision_log got 5 modes * 50 trials = 250 double events
    with open(log_path, encoding='utf-8') as log_file:
        double_events = [line for line in log_file if '"mode": "double"' in line]
    _assert(len(double_events) == 250, f'expected 250 double events, got {len(double_events)}')

    # Verify personality field is present
    assert 'personality' in double_events[0], 'double events should record personality'


def _exercise_douzero_fallback(log_path: str) -> None:
    # DouZeroPolicy with no enabled config should be unavailable and fall back.
    from ai.policy import DouZeroConfig
    config = DouZeroConfig(enabled=False, model_dir=None)
    fallback = RuleBasedPolicy()
    douzero = DouZeroPolicy(config, fallback=fallback)
    _assert(not douzero.available, 'DouZero should not be available without enabled+model_dir')

    player = _build_player(101, 0, [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20])
    room = _build_room(landlord_seat=0)
    d = douzero.choose_double(player, room, personality=PersonalityMode.AGGRESSIVE)
    _assert(d in (0, 1), f'DouZero choose_double must return 0/1, got {d}')


def _exercise_protocol_constants() -> None:
    _assert(Protocol.REQ_DOUBLE == 2007, f'REQ_DOUBLE must be 2007, got {Protocol.REQ_DOUBLE}')
    _assert(Protocol.RSP_DOUBLE == 2008, f'RSP_DOUBLE must be 2008, got {Protocol.RSP_DOUBLE}')


def main() -> int:
    try:
        _exercise_personality_presets()
        _exercise_resolve_personality()
        log_path = _setup_logger_for_double()
        _exercise_rule_based_choose_double(log_path)
        _exercise_douzero_fallback(log_path)
        _exercise_protocol_constants()
        print(f'ai-double-smoke OK: protocol constants, 5 personalities, choose_double 250 trials + DouZero fallback')
        return 0
    except AssertionError as e:
        print(f'ai-double-smoke FAIL: {e}', file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover - defensive
        print(f'ai-double-smoke ERROR: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
