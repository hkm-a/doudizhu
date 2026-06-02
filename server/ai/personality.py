"""AI personality layer (GDD v0.2 F 章节).

Provides:
  - ``PersonalityMode`` enum (5 性格)
  - ``PersonalityConfig`` dataclass (调参组合)
  - ``get_personality_config(mode)`` 性格 → 调参查表
  - ``resolve_personality(hand_pokers, room, base_config)`` 调参注入

This module is the v0.2 起步 (Pillar 3 "AI 有脾气" 落地). Room/ws integration
that wires a player to a mode is left for follow-up work; for now AI callers can
ask the policy ``choose_double(player, room, personality)`` directly.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional


class PersonalityMode(str, Enum):
    CONSERVATIVE = 'conservative'
    BALANCED = 'balanced'
    AGGRESSIVE = 'aggressive'
    TRICKSTER = 'trickster'
    ERRATIC = 'erratic'


@dataclass(frozen=True)
class PersonalityConfig:
    mode: PersonalityMode
    rob_threshold: int           # 抢地主需要几张大牌 (2/A/w/W)
    follow_strategy: str         # 'strict' | 'relaxed' | 'reverse'
    bomb_threshold: int          # 何时敢出炸弹（[待测试]）
    rocket_hold_threshold: int   # 火箭保留时对手剩几张
    let_ally_threshold: int      # 队友剩几张时让牌
    err_rate: float              # 失误率（仅 erratic）
    double_bias: float           # 加倍倾向 [-1.0, 1.0]；-1 永不，+1 必加


PERSONALITY_PRESETS: dict = {
    PersonalityMode.CONSERVATIVE: PersonalityConfig(
        mode=PersonalityMode.CONSERVATIVE,
        rob_threshold=5,
        follow_strategy='strict',
        bomb_threshold=10,
        rocket_hold_threshold=15,
        let_ally_threshold=2,
        err_rate=0.0,
        double_bias=-0.5,
    ),
    PersonalityMode.BALANCED: PersonalityConfig(
        mode=PersonalityMode.BALANCED,
        rob_threshold=4,
        follow_strategy='strict',
        bomb_threshold=8,
        rocket_hold_threshold=10,
        let_ally_threshold=4,
        err_rate=0.0,
        double_bias=0.0,
    ),
    PersonalityMode.AGGRESSIVE: PersonalityConfig(
        mode=PersonalityMode.AGGRESSIVE,
        rob_threshold=3,
        follow_strategy='relaxed',
        bomb_threshold=6,
        rocket_hold_threshold=6,
        let_ally_threshold=6,
        err_rate=0.0,
        double_bias=0.6,
    ),
    PersonalityMode.TRICKSTER: PersonalityConfig(
        mode=PersonalityMode.TRICKSTER,
        rob_threshold=4,
        follow_strategy='reverse',
        bomb_threshold=8,
        rocket_hold_threshold=12,
        let_ally_threshold=3,
        err_rate=0.0,
        double_bias=0.2,
    ),
    PersonalityMode.ERRATIC: PersonalityConfig(
        mode=PersonalityMode.ERRATIC,
        rob_threshold=4,
        follow_strategy='strict',
        bomb_threshold=8,
        rocket_hold_threshold=10,
        let_ally_threshold=4,
        err_rate=0.05,
        double_bias=0.0,
    ),
}


def get_personality_config(mode: PersonalityMode) -> PersonalityConfig:
    """性格 → 调参配置 查表。"""
    return PERSONALITY_PRESETS[mode]


def resolve_personality(mode: Optional[PersonalityMode]) -> PersonalityConfig:
    """Fallback to BALANCED when mode is None or unknown."""
    if mode is None:
        return PERSONALITY_PRESETS[PersonalityMode.BALANCED]
    return get_personality_config(mode)
