from __future__ import annotations

import json
import logging
import os
import uuid
from datetime import datetime, timezone
from functools import lru_cache
from typing import Any, Dict, Optional

from config import PROJECT_ROOT

logger = logging.getLogger(__name__)


VALID_EVENT_TYPES = {
    'rob_decision', 'shot_decision', 'pass_decision', 'double_decision', 'trustee_toggle',
    'card_select', 'card_deselect', 'hint_request', 'sort_request', 'settings_change',
    'server_reject', 'disconnect', 'reconnect',
    'session_start', 'session_end', 'session_abandon', 'ready_request',
    'app_open', 'app_close', 'room_create', 'room_join', 'room_leave',
    # GDD v0.2 H.3：段位变更
    'segment_change',
    # GDD v0.2 H.2/H.3：赛季重置 / ELO 调整
    'season_reset', 'elo_update',
}

VALID_RESULTS = {'success', 'fail', 'timeout', 'cancel'}


class PlayerEventLogger:
    """Player-facing JSONL telemetry, mirrors AiDecisionLogger semantics.

    Logs are opt-in: when ``PLAYER_EVENT_LOG_PATH`` is not set, ``log`` becomes a no-op.
    Each call appends a single JSONL line with a server-issued timestamp.
    """

    def __init__(self, path: Optional[str]):
        self.path = _resolve_path(path) if path else None

    @property
    def enabled(self) -> bool:
        return bool(self.path)

    def log(self, event_type: str, player_id: int, room_id: int, session_id: str,
            payload: Optional[Dict[str, Any]] = None,
            duration_ms: Optional[int] = None,
            result: str = 'success',
            reason: Optional[str] = None) -> bool:
        if not self.path:
            return False
        if event_type not in VALID_EVENT_TYPES:
            logger.warning('Player event type %r is not in VALID_EVENT_TYPES; dropping', event_type)
            return False
        if result not in VALID_RESULTS:
            logger.warning('Player event result %r is not in VALID_RESULTS; dropping', result)
            return False

        record = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'event_type': event_type,
            'player_id': int(player_id),
            'room_id': int(room_id),
            'session_id': str(session_id),
            'payload': payload or {},
            'duration_ms': duration_ms,
            'result': result,
            'reason': reason,
        }
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            with open(self.path, 'a', encoding='utf-8') as log_file:
                log_file.write(json.dumps(record, ensure_ascii=False, sort_keys=True))
                log_file.write('\n')
            return True
        except Exception:
            logger.warning('Player event log write failed: %s', self.path, exc_info=True)
            return False


@lru_cache(maxsize=1)
def get_player_event_logger() -> PlayerEventLogger:
    return PlayerEventLogger(os.getenv('PLAYER_EVENT_LOG_PATH'))


def new_session_id() -> str:
    """Generate a fresh session id for one complete game round."""
    return str(uuid.uuid4())


def _resolve_path(path: str) -> str:
    path = os.path.expanduser(path)
    if os.path.isabs(path):
        return path
    return os.path.join(PROJECT_ROOT, path)
