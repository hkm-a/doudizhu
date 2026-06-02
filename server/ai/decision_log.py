from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, Optional

from config import PROJECT_ROOT

logger = logging.getLogger(__name__)


class AiDecisionLogger:
    def __init__(self, path: Optional[str]):
        self.path = _resolve_path(path) if path else None

    @property
    def enabled(self) -> bool:
        return bool(self.path)

    def log(self, event: Dict[str, Any]) -> bool:
        if not self.path:
            return False

        record = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            **event,
        }
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            with open(self.path, 'a', encoding='utf-8') as log_file:
                log_file.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
                log_file.write('\n')
            return True
        except Exception:
            logger.warning('AI decision log write failed: %s', self.path, exc_info=True)
            return False


@lru_cache(maxsize=1)
def get_decision_logger() -> AiDecisionLogger:
    return AiDecisionLogger(os.getenv('AI_DECISION_LOG_PATH'))


def decision_event(policy: str, mode: str, player, room=None, **details) -> Dict[str, Any]:
    event = {
        'policy': policy,
        'mode': mode,
        'player': {
            'uid': getattr(player, 'uid', None),
            'seat': getattr(player, 'seat', None),
            'landlord': getattr(player, 'landlord', None),
            'hand_pokers': list(getattr(player, 'hand_pokers', []) or []),
        },
    }
    if room is not None:
        event['room'] = {
            'id': getattr(room, 'room_id', None),
            'level': getattr(room, 'level', None),
            'landlord_seat': getattr(room, 'landlord_seat', None),
            'last_shot_seat': getattr(room, 'last_shot_seat', None),
            'last_shot_poker': list(getattr(room, 'last_shot_poker', []) or []),
            'shot_round_count': len(getattr(room, 'shot_round', []) or []),
            'multiple': getattr(room, 'multiple', None),
        }
    event.update(details)
    return event


def _resolve_path(path: str) -> str:
    path = os.path.expanduser(path)
    if os.path.isabs(path):
        return path
    return os.path.join(PROJECT_ROOT, path)
