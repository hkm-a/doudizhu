from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional, Protocol, TYPE_CHECKING

from api.game.rule import rule

if TYPE_CHECKING:
    from api.game.player import Player
    from api.game.room import Room

logger = logging.getLogger(__name__)


class AiPolicy(Protocol):
    def choose_rob(self, player: Player) -> int:
        ...

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        ...


class RuleBasedPolicy:
    """Current svzdev heuristic AI, kept as the reliable fallback."""

    def choose_rob(self, player: Player) -> int:
        high_cards = [poker for poker in (54, 53, 2, 15, 28, 41) if poker in player.hand_pokers]
        return int(len(high_cards) >= 4)

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        if not room.last_shot_poker or room.last_shot_seat == player.seat:
            return rule.find_best_shot(player.hand_pokers)

        ally = room.players[room.last_shot_seat].landlord == player.landlord
        left_pokers = len(room.players[room.last_shot_seat].hand_pokers)
        if ally and left_pokers <= 4 and len(player.hand_pokers) - len(room.last_shot_poker) > 4:
            return []

        pokers = rule.find_best_follow(player.hand_pokers, room.last_shot_poker, ally)
        if 53 in pokers and 54 in pokers and left_pokers > 10:
            return []
        return pokers


@dataclass(frozen=True)
class DouZeroConfig:
    enabled: bool
    model_dir: Optional[str]

    @classmethod
    def from_env(cls) -> DouZeroConfig:
        enabled = os.getenv('DOUZERO_ENABLED', '').strip().lower() in {'1', 'true', 'yes', 'on'}
        return cls(enabled=enabled, model_dir=os.getenv('DOUZERO_MODEL_DIR'))


class DouZeroPolicy:
    """Adapter boundary for kwai/DouZero.

    The room server keeps using svzdev poker ids (1..54). This policy owns all
    DouZero concerns: dependency loading, model path validation, and later the
    infoset/card-id conversion. Until the full state adapter is enabled, it
    delegates to the rule policy so robots remain playable.
    """

    def __init__(self, config: DouZeroConfig, fallback: Optional[AiPolicy] = None):
        self.config = config
        self.fallback = fallback or RuleBasedPolicy()
        self.available = False
        self.disabled_reason = 'DOUZERO_ENABLED is not set'
        self._agents = {}
        self._try_bootstrap()

    def _try_bootstrap(self) -> None:
        if not self.config.enabled:
            return
        if not self.config.model_dir:
            self.disabled_reason = 'DOUZERO_MODEL_DIR is not set'
            logger.warning('DouZero requested but DOUZERO_MODEL_DIR is missing; falling back to rule AI')
            return

        expected = {
            'landlord': 'landlord.ckpt',
            'landlord_up': 'landlord_up.ckpt',
            'landlord_down': 'landlord_down.ckpt',
        }
        missing = [name for name in expected.values() if not os.path.exists(os.path.join(self.config.model_dir, name))]
        if missing:
            self.disabled_reason = 'missing model files: ' + ', '.join(missing)
            logger.warning('DouZero model directory is incomplete (%s); falling back to rule AI', self.disabled_reason)
            return

        try:
            from douzero.evaluation.deep_agent import DeepAgent
        except Exception as exc:  # pragma: no cover - depends on optional torch/douzero install
            self.disabled_reason = f'douzero import failed: {exc}'
            logger.warning('DouZero import failed; falling back to rule AI', exc_info=True)
            return

        self._agents = {
            position: DeepAgent(position, os.path.join(self.config.model_dir, filename))
            for position, filename in expected.items()
        }
        self.available = True
        self.disabled_reason = ''
        logger.info('DouZero policy loaded from %s', self.config.model_dir)

    def choose_rob(self, player: Player) -> int:
        # DouZero's public project focuses on play after landlord is known. Keep
        # bidding deterministic until we add/verify a bidding model.
        return self.fallback.choose_rob(player)

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        if not self.available:
            return self.fallback.choose_shot(player, room)

        # TODO: Build a DouZero InfoSet from Room state and map selected env
        # cards back to svzdev poker ids. The fallback keeps gameplay stable
        # while the model assets and state adapter are wired in.
        return self.fallback.choose_shot(player, room)


@lru_cache(maxsize=1)
def get_robot_policy() -> AiPolicy:
    config = DouZeroConfig.from_env()
    if config.enabled:
        return DouZeroPolicy(config)
    return RuleBasedPolicy()
