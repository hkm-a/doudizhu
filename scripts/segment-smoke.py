"""Smoke test for GDD v0.2 H.1 段位体系 calculator + 段位变更。

Exercises:
  - Segment enum + SEGMENT_COEFFICIENTS 一致性
  - compute_score_delta: 胜利 / 失败 / 流局 / landlord vs farmer / 系数影响
  - apply_match_result: 胜利跨 100 晋级 / 失败降级 / 跨多级 / 流局
  - leaderboard 排序（高段位优先，积分次之）
  - from_dict / to_dict 序列化

无数据库依赖——纯计算层。数据库集成在 tests/backend/test_app.py 端到端。
"""
from __future__ import annotations

import os
import sys

from segment import (
    MatchDelta,
    POINTS_PER_SEGMENT,
    SEGMENT_COEFFICIENTS,
    Segment,
    SegmentState,
    apply_match_result,
    compute_score_delta,
    from_dict,
    initial_state,
    leaderboard,
)


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _exercise_segment_enum() -> None:
    ordered = Segment.ordered()
    _assert(len(ordered) == 7, f'expected 7 segments, got {len(ordered)}')
    _assert(ordered[0] == Segment.BRONZE, 'first segment should be BRONZE')
    _assert(ordered[-1] == Segment.KING, 'last segment should be KING')
    for s in ordered:
        _assert(s in SEGMENT_COEFFICIENTS, f'segment {s} missing from coefficients')


def _exercise_compute_score_delta() -> None:
    # 流局
    _assert(compute_score_delta(True, True, 0, 1.0) == 0, 'zero base should give 0')

    # 黄金段位 (coeff 1.0) 胜利农民
    delta = compute_score_delta(is_winner=True, is_landlord=False, base_score=10, segment_coefficient=1.0)
    _assert(delta == 10, f'gold farmer win should give +10, got {delta}')

    # 黄金胜利地主（×2 角色加成）
    delta = compute_score_delta(is_winner=True, is_landlord=True, base_score=10, segment_coefficient=1.0)
    _assert(delta == 20, f'gold landlord win should give +20, got {delta}')

    # 黄金失败农民（-50%）
    delta = compute_score_delta(is_winner=False, is_landlord=False, base_score=10, segment_coefficient=1.0)
    _assert(delta == -5, f'gold farmer lose should give -5, got {delta}')

    # 王者段位 (coeff 1.5) 胜利地主
    delta = compute_score_delta(is_winner=True, is_landlord=True, base_score=10, segment_coefficient=1.5)
    _assert(delta == 30, f'king landlord win should give +30, got {delta}')


def _exercise_apply_match_promotion() -> None:
    # 黄金 80 积分，胜利 +30 → 跨 100 晋级 → 铂金 10 积分
    # GDD v0.2 H.1 段位顺序: BRONZE < SILVER < GOLD < PLATINUM < DIAMOND < MASTER < KING
    state = SegmentState(segment=Segment.GOLD, points=80)
    delta = MatchDelta(score_delta=30, base_score=10, role='farmer', is_winner=True)
    result = apply_match_result(state, delta)
    _assert(result.promoted, f'expected promotion, got {result.to_dict()}')
    _assert(result.state.segment == Segment.PLATINUM, f'promoted to PLATINUM, got {result.state.segment}')
    _assert(result.state.points == 10, f'leftover points = 10, got {result.state.points}')
    _assert(not result.demoted, 'should not be demoted')


def _exercise_apply_match_demotion() -> None:
    # 白银 10 积分，失败 -25 → 跨 0 降级 → 青铜 85 积分
    state = SegmentState(segment=Segment.SILVER, points=10)
    delta = MatchDelta(score_delta=-25, base_score=10, role='farmer', is_winner=False)
    result = apply_match_result(state, delta)
    _assert(result.demoted, f'expected demotion, got {result.to_dict()}')
    _assert(result.state.segment == Segment.BRONZE, f'demoted to BRONZE, got {result.state.segment}')
    _assert(result.state.points == 85, f'leftover points = 85, got {result.state.points}')


def _exercise_apply_match_multi_step() -> None:
    # 黄金 50 积分，胜利 +250 → 300 跨 3 次 100 → 大师 0 积分
    # GOLD(idx=2) + 3 = MASTER(idx=5)
    state = SegmentState(segment=Segment.GOLD, points=50)
    delta = MatchDelta(score_delta=250, base_score=10, role='landlord', is_winner=True)
    result = apply_match_result(state, delta)
    _assert(result.promoted, 'should be promoted')
    _assert(result.state.segment == Segment.MASTER, f'should be MASTER, got {result.state.segment}')
    _assert(result.state.points == 0, f'points = 0, got {result.state.points}')


def _exercise_apply_match_zero_delta() -> None:
    # 流局
    state = SegmentState(segment=Segment.GOLD, points=42)
    delta = MatchDelta(score_delta=0, base_score=10, role='farmer', is_winner=False)
    result = apply_match_result(state, delta)
    _assert(not result.promoted and not result.demoted, 'no promotion / demotion on zero delta')
    _assert(result.state.segment == Segment.GOLD, 'segment unchanged')
    _assert(result.state.points == 42, 'points unchanged')


def _exercise_apply_match_at_top() -> None:
    # 王者 90 积分，胜利 +20 → 应保持在王者 10 积分（不跨过 KING）
    state = SegmentState(segment=Segment.KING, points=90)
    delta = MatchDelta(score_delta=20, base_score=10, role='farmer', is_winner=True)
    result = apply_match_result(state, delta)
    _assert(result.promoted, 'should be promoted (one step)')
    _assert(result.state.segment == Segment.KING, f'should stay at KING, got {result.state.segment}')
    _assert(result.state.points == 10, f'points = 10, got {result.state.points}')


def _exercise_apply_match_at_bottom() -> None:
    # 青铜 10 积分，失败 -25 → 应保持在青铜 85 积分（不降过 BRONZE）
    state = SegmentState(segment=Segment.BRONZE, points=10)
    delta = MatchDelta(score_delta=-25, base_score=10, role='farmer', is_winner=False)
    result = apply_match_result(state, delta)
    _assert(result.demoted, 'should be demoted (one step)')
    _assert(result.state.segment == Segment.BRONZE, f'should stay at BRONZE, got {result.state.segment}')
    _assert(result.state.points == 85, f'points = 85, got {result.state.points}')


def _exercise_leaderboard_sort() -> None:
    states = {
        1: SegmentState(segment=Segment.GOLD, points=50),
        2: SegmentState(segment=Segment.KING, points=10),
        3: SegmentState(segment=Segment.BRONZE, points=99),
        4: SegmentState(segment=Segment.GOLD, points=80),
    }
    ranking = leaderboard(states)
    # KING 10 → GOLD 80 → GOLD 50 → BRONZE 99
    _assert(ranking[0][0] == 2, f'first should be uid 2 (KING), got {ranking[0]}')
    _assert(ranking[1][0] == 4, f'second should be uid 4 (GOLD 80), got {ranking[1]}')
    _assert(ranking[2][0] == 1, f'third should be uid 1 (GOLD 50), got {ranking[2]}')
    _assert(ranking[3][0] == 3, f'fourth should be uid 3 (BRONZE 99), got {ranking[3]}')


def _exercise_serialization() -> None:
    state = SegmentState(segment=Segment.DIAMOND, points=42)
    d = state.to_dict()
    _assert(d['segment'] == 'diamond', f'serialized segment should be diamond, got {d["segment"]}')
    _assert(d['points'] == 42, f'points = 42, got {d["points"]}')
    _assert(d['coefficient'] == 1.2, f'coefficient = 1.2, got {d["coefficient"]}')

    restored = from_dict(d)
    _assert(restored.segment == Segment.DIAMOND, 'round-trip preserves segment')
    _assert(restored.points == 42, 'round-trip preserves points')

    # 空 dict → initial state
    initial = from_dict(None)
    _assert(initial.segment == Segment.GOLD, 'None should default to GOLD')
    _assert(initial.points == 0, 'None should default to 0 points')

    # 非法 segment → 兜底到 GOLD
    bad = from_dict({'segment': 'unobtanium', 'points': 99})
    _assert(bad.segment == Segment.GOLD, 'unknown segment should fall back to GOLD')


def _exercise_initial_state() -> None:
    init = initial_state()
    _assert(init.segment == Segment.GOLD, 'initial segment is GOLD')
    _assert(init.points == 0, 'initial points is 0')


def _exercise_points_per_segment() -> None:
    _assert(POINTS_PER_SEGMENT == 100, f'POINTS_PER_SEGMENT should be 100, got {POINTS_PER_SEGMENT}')


def _exercise_season_reset_normal() -> None:
    """GDD v0.2 H.2 赛季重置：每赛季段位降 1 级，积分清零。"""
    from segment import apply_season_reset
    # PLATINUM 50 → GOLD 0
    state = SegmentState(segment=Segment.PLATINUM, points=50)
    new = apply_season_reset(state)
    _assert(new.segment == Segment.GOLD, f'PLATINUM should demote to GOLD, got {new.segment}')
    _assert(new.points == 0, f'points should be 0, got {new.points}')

    # KING 99 → MASTER 0
    state = SegmentState(segment=Segment.KING, points=99)
    new = apply_season_reset(state)
    _assert(new.segment == Segment.MASTER, f'KING should demote to MASTER, got {new.segment}')


def _exercise_season_reset_bottom_protection() -> None:
    """BRONZE 不降级（保持在 BRONZE 0 积分）。"""
    from segment import apply_season_reset
    state = SegmentState(segment=Segment.BRONZE, points=99)
    new = apply_season_reset(state)
    _assert(new.segment == Segment.BRONZE, f'BRONZE should stay at BRONZE, got {new.segment}')
    _assert(new.points == 0, f'points should be 0, got {new.points}')


def _exercise_elo_basic() -> None:
    """GDD v0.2 H.3 ELO：标准公式 + K=32。"""
    from segment import compute_elo_change, DEFAULT_ELO, ELO_K_FACTOR
    _assert(DEFAULT_ELO == 1000, f'DEFAULT_ELO should be 1000, got {DEFAULT_ELO}')
    _assert(ELO_K_FACTOR == 32, f'ELO_K_FACTOR should be 32, got {ELO_K_FACTOR}')

    # 同段位对决：胜者 +16，败者 -16（接近 16 期望）
    result = compute_elo_change(1000, 1000, 1.0)
    _assert(result.delta_a == 16, f'expected delta_a=16, got {result.delta_a}')
    _assert(result.delta_b == -16, f'expected delta_b=-16, got {result.delta_b}')
    _assert(result.new_rating_a == 1016, f'expected new_rating_a=1016, got {result.new_rating_a}')
    _assert(result.new_rating_b == 984, f'expected new_rating_b=984, got {result.new_rating_b}')


def _exercise_elo_underdog_wins() -> None:
    """弱者胜（rating_a < rating_b）：弱者加分更多，强者减分更多。"""
    from segment import compute_elo_change
    # a=800, b=1200, a 胜
    result = compute_elo_change(800, 1200, 1.0)
    # a 期望胜率 = 1/(1+10^((1200-800)/400)) = 1/(1+10^1) ≈ 0.0909
    # a 加 = 32 * (1 - 0.0909) ≈ 29.09 → round 29
    _assert(result.delta_a == 29, f'underdog win should give ~29, got {result.delta_a}')
    _assert(result.delta_b == -29, f'strong loser should give ~-29, got {result.delta_b}')


def _exercise_elo_draw() -> None:
    """平局（score_a=0.5）：rating 不变。"""
    from segment import compute_elo_change
    result = compute_elo_change(1500, 1500, 0.5)
    _assert(result.delta_a == 0, f'draw with equal rating: delta_a should be 0, got {result.delta_a}')
    _assert(result.delta_b == 0, f'draw with equal rating: delta_b should be 0, got {result.delta_b}')
    _assert(result.new_rating_a == 1500, f'rating_a should stay 1500, got {result.new_rating_a}')


def main() -> int:
    try:
        _exercise_segment_enum()
        _exercise_compute_score_delta()
        _exercise_apply_match_promotion()
        _exercise_apply_match_demotion()
        _exercise_apply_match_multi_step()
        _exercise_apply_match_zero_delta()
        _exercise_apply_match_at_top()
        _exercise_apply_match_at_bottom()
        _exercise_leaderboard_sort()
        _exercise_serialization()
        _exercise_initial_state()
        _exercise_points_per_segment()
        _exercise_season_reset_normal()
        _exercise_season_reset_bottom_protection()
        _exercise_elo_basic()
        _exercise_elo_underdog_wins()
        _exercise_elo_draw()
        print('segment-smoke OK: enum + compute_score_delta + apply_match_result (promotion/demotion/multi-step/zero/at-top/at-bottom) + leaderboard + serialization + season_reset + elo')
        return 0
    except AssertionError as e:
        print(f'segment-smoke FAIL: {e}', file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover - defensive
        print(f'segment-smoke ERROR: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
