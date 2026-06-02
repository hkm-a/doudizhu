"""GDD v0.2 H.1 段位体系：纯函数计算层。

无数据库依赖——纯 Python 数据处理，方便单测。
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Tuple


class Segment(str, Enum):
    BRONZE = 'bronze'
    SILVER = 'silver'
    GOLD = 'gold'
    PLATINUM = 'platinum'
    DIAMOND = 'diamond'
    MASTER = 'master'
    KING = 'king'

    @classmethod
    def ordered(cls) -> List['Segment']:
        return [cls.BRONZE, cls.SILVER, cls.GOLD, cls.PLATINUM, cls.DIAMOND, cls.MASTER, cls.KING]


SEGMENT_COEFFICIENTS: Dict[Segment, float] = {
    Segment.BRONZE: 0.8,
    Segment.SILVER: 0.9,
    Segment.GOLD: 1.0,
    Segment.PLATINUM: 1.1,
    Segment.DIAMOND: 1.2,
    Segment.MASTER: 1.3,
    Segment.KING: 1.5,
}

# 段位内 0..99 积分；每跨 100 积分晋级 / 降级
POINTS_PER_SEGMENT = 100


@dataclass(frozen=True)
class SegmentState:
    segment: Segment
    points: int

    def to_dict(self) -> dict:
        return {
            'segment': self.segment.value,
            'points': self.points,
            'coefficient': SEGMENT_COEFFICIENTS[self.segment],
        }


@dataclass(frozen=True)
class MatchDelta:
    """一局结算的段位影响。"""
    score_delta: int
    base_score: int
    role: str  # 'landlord' | 'farmer'
    is_winner: bool

    def to_dict(self) -> dict:
        return {
            'score_delta': self.score_delta,
            'base_score': self.base_score,
            'role': self.role,
            'is_winner': self.is_winner,
        }


@dataclass(frozen=True)
class PromotionResult:
    """apply_match_result 的返回值。"""
    state: SegmentState
    promoted: bool
    demoted: bool
    score_delta: int

    def to_dict(self) -> dict:
        return {
            **self.state.to_dict(),
            'promoted': self.promoted,
            'demoted': self.demoted,
            'score_delta': self.score_delta,
        }


def compute_score_delta(
    is_winner: bool,
    is_landlord: bool,
    base_score: int,
    segment_coefficient: float,
) -> int:
    """一局结算的段位积分 delta。

    胜利：+(底分 × 段位系数 × 角色加成)
    失败：-(底分 × 段位系数 × 0.5 × 角色加成)
    流局：0
    """
    if base_score <= 0:
        return 0
    role_multiplier = 2.0 if is_landlord else 1.0
    if is_winner:
        return round(base_score * segment_coefficient * role_multiplier)
    return -round(base_score * segment_coefficient * 0.5 * role_multiplier)


def _clamp_to_segment(points: int) -> int:
    """限制 points 在 [0, POINTS_PER_SEGMENT) 范围。"""
    return max(0, min(POINTS_PER_SEGMENT - 1, points))


def _step_segment(current: Segment, step: int) -> Segment:
    """按 step 移动段位（正=晋级，负=降级）。"""
    ordered = Segment.ordered()
    idx = ordered.index(current)
    new_idx = max(0, min(len(ordered) - 1, idx + step))
    return ordered[new_idx]


def apply_match_result(
    state: SegmentState,
    delta: MatchDelta,
) -> PromotionResult:
    """应用一局结算到段位状态。

    - 胜利：points += score_delta；点数到 100 → 晋级
    - 失败：points -= |score_delta|；点数 < 0 → 降级
    - 流局：不变
    """
    if delta.score_delta == 0:
        return PromotionResult(state=state, promoted=False, demoted=False, score_delta=0)

    segment = state.segment
    points = state.points
    promoted = False
    demoted = False

    if delta.score_delta > 0:
        # 胜利：跨 POINTS_PER_SEGMENT 晋级
        new_points = points + delta.score_delta
        while new_points >= POINTS_PER_SEGMENT:
            new_points -= POINTS_PER_SEGMENT
            segment = _step_segment(segment, +1)
            promoted = True
        points = _clamp_to_segment(new_points)
    else:
        # 失败：跨 0 降级
        loss = -delta.score_delta
        new_points = points - loss
        while new_points < 0:
            new_points += POINTS_PER_SEGMENT
            segment = _step_segment(segment, -1)
            demoted = True
        points = _clamp_to_segment(new_points)

    return PromotionResult(
        state=SegmentState(segment=segment, points=points),
        promoted=promoted,
        demoted=demoted,
        score_delta=delta.score_delta,
    )


def leaderboard(states: Dict[int, SegmentState]) -> List[Tuple[int, SegmentState]]:
    """按段位从高到低、积分从多到少排序。返回 [(uid, state), ...]。"""
    def _rank(uid: int, s: SegmentState):
        return (Segment.ordered().index(s.segment), s.points)
    return sorted(states.items(), key=lambda item: (-_rank(*item)[0], -_rank(*item)[1], item[0]))


def initial_state() -> SegmentState:
    """新用户的初始段位状态（GOLD 段位 0 积分）。"""
    return SegmentState(segment=Segment.GOLD, points=0)


def apply_season_reset(state: SegmentState) -> SegmentState:
    """GDD v0.2 H.2 赛季重置：每赛季结束段位降 1 级，积分清零。

    边界保护：BRONZE 段位不降级（保持在 BRONZE 0 积分）。
    """
    if state.segment == Segment.BRONZE:
        return SegmentState(segment=Segment.BRONZE, points=0)
    new_segment = _step_segment(state.segment, -1)
    return SegmentState(segment=new_segment, points=0)


# GDD v0.2 H.3 排位 ELO
ELO_K_FACTOR = 32  # ELO K 因子
DEFAULT_ELO = 1000


@dataclass(frozen=True)
class EloChange:
    """ELO 调整结果。"""
    new_rating_a: int
    new_rating_b: int
    delta_a: int  # 正=加分，负=减分
    delta_b: int
    expected_a: float
    expected_b: float

    def to_dict(self) -> dict:
        return {
            'new_rating_a': self.new_rating_a,
            'new_rating_b': self.new_rating_b,
            'delta_a': self.delta_a,
            'delta_b': self.delta_b,
            'expected_a': round(self.expected_a, 3),
            'expected_b': round(self.expected_b, 3),
        }


def _expected_score(rating_a: int, rating_b: int) -> float:
    """ELO 期望胜率（标准公式 1 / (1 + 10^((Rb - Ra)/400))）。"""
    return 1.0 / (1.0 + 10 ** ((rating_b - rating_a) / 400.0))


def compute_elo_change(rating_a: int, rating_b: int, score_a: float) -> EloChange:
    """计算一对玩家 ELO 调整。

    Args:
        rating_a: A 当前 ELO
        rating_b: B 当前 ELO
        score_a: A 的实际得分（1.0 胜 / 0.5 平 / 0.0 负）
    """
    expected_a = _expected_score(rating_a, rating_b)
    expected_b = 1.0 - expected_a
    delta_a = round(ELO_K_FACTOR * (score_a - expected_a))
    delta_b = round(ELO_K_FACTOR * ((1.0 - score_a) - expected_b))
    return EloChange(
        new_rating_a=rating_a + delta_a,
        new_rating_b=rating_b + delta_b,
        delta_a=delta_a,
        delta_b=delta_b,
        expected_a=expected_a,
        expected_b=expected_b,
    )


def from_dict(d: Optional[dict]) -> SegmentState:
    """从 JSON dict 还原 SegmentState（用于 ORM 反序列化）。"""
    if not d:
        return initial_state()
    try:
        seg = Segment(d.get('segment', 'gold'))
    except ValueError:
        seg = Segment.GOLD
    pts = int(d.get('points', 0))
    return SegmentState(segment=seg, points=pts)
