from __future__ import annotations

import logging
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import List, Optional, Protocol, TYPE_CHECKING

from ai.cards import douzero_cards_to_pokers
from ai.decision_log import decision_event, get_decision_logger
from ai.infoset import build_douzero_infoset, get_douzero_legal_actions, seat_to_douzero_position
from api.game.rule import rule
from ai.personality import PersonalityMode, resolve_personality

if TYPE_CHECKING:
    from api.game.player import Player
    from api.game.room import Room

logger = logging.getLogger(__name__)


class AiPolicy(Protocol):
    def choose_rob(self, player: Player) -> int:
        ...

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        ...

    def choose_double(self, player: Player, room: Room, personality: Optional[PersonalityMode] = None) -> int:
        ...


class RuleBasedPolicy:
    """Current svzdev heuristic AI, kept as the reliable fallback."""

    def choose_rob(self, player: Player) -> int:
        high_cards = [poker for poker in (54, 53, 2, 15, 28, 41) if poker in player.hand_pokers]
        decision = int(len(high_cards) >= 4)
        get_decision_logger().log(decision_event(
            'rule',
            'rob',
            player,
            decision=decision,
            high_cards=high_cards,
        ))
        return decision

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        if not room.last_shot_poker or room.last_shot_seat == player.seat:
            decision = rule.find_best_shot(player.hand_pokers)
            get_decision_logger().log(decision_event('rule', 'shot', player, room, decision=decision))
            return decision

        last_player = self._last_shot_player(room)
        ally = bool(last_player and last_player.landlord == player.landlord)
        left_pokers = len(last_player.hand_pokers) if last_player else 17
        if ally and left_pokers <= 4 and len(player.hand_pokers) - len(room.last_shot_poker) > 4:
            get_decision_logger().log(decision_event(
                'rule',
                'shot',
                player,
                room,
                decision=[],
                reason='ally_has_few_cards_left',
                ally=ally,
                last_player_left_pokers=left_pokers,
            ))
            return []

        pokers = rule.find_best_follow(player.hand_pokers, room.last_shot_poker, ally)
        if 53 in pokers and 54 in pokers and left_pokers > 10:
            get_decision_logger().log(decision_event(
                'rule',
                'shot',
                player,
                room,
                decision=[],
                candidate=pokers,
                reason='hold_rocket_while_opponent_has_many_cards',
                ally=ally,
                last_player_left_pokers=left_pokers,
            ))
            return []
        get_decision_logger().log(decision_event(
            'rule',
            'shot',
            player,
            room,
            decision=pokers,
            ally=ally,
            last_player_left_pokers=left_pokers,
        ))
        return pokers

    @staticmethod
    def _last_shot_player(room: Room) -> Optional[Player]:
        if 0 <= room.last_shot_seat < len(room.players):
            return room.players[room.last_shot_seat]
        return None

    def choose_double(self, player: Player, room: Room, personality: Optional[PersonalityMode] = None) -> int:
        """Decide whether to double at the start of the playing phase.

        Strength is a quick heuristic on hand size + high cards (2/A/w/W). The
        ``PersonalityConfig.double_bias`` shifts the threshold: aggressive
        personalities double on weaker hands, conservative on stronger ones.
        """
        cfg = resolve_personality(personality)
        high_set = {2, 15, 28, 41, 53, 54}
        hand_size = len(player.hand_pokers)
        high_cards = sum(1 for p in player.hand_pokers if p in high_set)
        # Normalize: 0 (no cards) to ~1 (4+ high cards at full hand length)
        strength = max(0.0, min(1.0, (20 - hand_size) / 20.0 + high_cards / 6.0))
        # Map [strength in 0..1, bias in -1..1] to probability in 0..1
        prob = max(0.0, min(1.0, strength * 0.5 + cfg.double_bias * 0.5 + 0.25))

        if cfg.err_rate > 0:
            import random
            if random.random() < cfg.err_rate:
                prob = 1.0 - prob

        decision = 1 if prob >= 0.5 else 0
        get_decision_logger().log(decision_event(
            'rule',
            'double',
            player,
            room,
            decision=decision,
            personality=cfg.mode.value,
            strength=round(strength, 3),
            prob=round(prob, 3),
            hand_size=hand_size,
            high_cards=high_cards,
        ))
        return decision


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
    DouZero concerns: dependency loading, model path validation, InfoSet/card-id
    conversion, and rule-AI fallback whenever the optional model path fails.
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

    def choose_double(self, player: Player, room: Room, personality: Optional[PersonalityMode] = None) -> int:
        # DouZero's public project has no trained double model. Delegate to the
        # personality-aware RuleBasedPolicy until a double checkpoint is added.
        return self.fallback.choose_double(player, room, personality)

    def choose_shot(self, player: Player, room: Room) -> List[int]:
        if not self.available:
            return self.fallback.choose_shot(player, room)

        try:
            position = seat_to_douzero_position(player.seat, room.landlord_seat)
            legal_actions = get_douzero_legal_actions(player, room)
            infoset = build_douzero_infoset(player, room, legal_actions)
            action = self._agents[position].act(infoset)
            decision = douzero_cards_to_pokers(action, player.hand_pokers)
            get_decision_logger().log(decision_event(
                'douzero',
                'shot',
                player,
                room,
                decision=decision,
                douzero_action=action,
                position=position,
                legal_action_count=len(legal_actions),
            ))
            return decision
        except Exception as exc:
            logger.warning('DouZero action failed; falling back to rule AI', exc_info=True)
            get_decision_logger().log(decision_event(
                'douzero',
                'shot',
                player,
                room,
                decision=None,
                fallback=True,
                fallback_reason=str(exc),
            ))
            return self.fallback.choose_shot(player, room)


@lru_cache(maxsize=1)
def get_robot_policy() -> AiPolicy:
    config = DouZeroConfig.from_env()
    if config.enabled:
        return DouZeroPolicy(config)
    return RuleBasedPolicy()
