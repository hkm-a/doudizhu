"""Smoke test for player_event logger + summary pipeline.

Exercises:
  - PlayerEventLogger writes JSONL when PLAYER_EVENT_LOG_PATH is set
  - Invalid event_type / result are dropped
  - read_player_event_records round-trips records
  - summarize_player_events aggregates correctly
  - format_summary_text / format_summary_html both render

Exits 0 on success, 1 on any failure.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from typing import List, Tuple

from api.player_event import (
    VALID_EVENT_TYPES,
    PlayerEventLogger,
    get_player_event_logger,
    new_session_id,
)
from api.player_event_summary import (
    format_summary_html,
    format_summary_text,
    read_player_event_records,
    summarize_player_events,
)


def _assert(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def _setup_temp_logger() -> Tuple[PlayerEventLogger, str]:
    env_path = os.getenv('PLAYER_EVENT_LOG_PATH')
    if env_path:
        path = os.path.expanduser(env_path)
        if not os.path.isabs(path):
            from config import PROJECT_ROOT
            path = os.path.join(PROJECT_ROOT, path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # Truncate env-provided path so smoke is repeatable across re-runs.
        open(path, 'w').close()
    else:
        tmp_dir = tempfile.mkdtemp(prefix='player-event-smoke-')
        path = os.path.join(tmp_dir, 'player-events.jsonl')
    logger = PlayerEventLogger(path)
    return logger, path


def _exercise_logging(logger: PlayerEventLogger) -> str:
    session = new_session_id()
    pid = 1001
    room = 42

    # Valid events
    _assert(logger.log('session_start', pid, room, session, payload={'room_config': {'origin': 1}}), 'session_start')
    _assert(logger.log('rob_decision', pid, room, session, payload={'rob': 1}, duration_ms=1200, result='success'), 'rob_decision')
    _assert(logger.log('shot_decision', pid, room, session, payload={'pokers': [3, 4], 'type': 'seq_single5'}, duration_ms=850, result='success'), 'shot_decision')
    _assert(logger.log('pass_decision', pid, room, session, result='success'), 'pass_decision')
    _assert(logger.log('server_reject', pid, room, session, payload={'action': 'shot'}, result='fail', reason='invalid_type'), 'server_reject')
    _assert(logger.log('hint_request', pid, room, session, payload={'context': 'follow'}, result='success'), 'hint_request')
    _assert(logger.log('session_end', pid, room, session, payload={'winner': 'landlord', 'role': 'farmer_up', 'score_delta': -2, 'duration_ms': 320000, 'hand_count': 14}, result='success'), 'session_end')
    _assert(logger.log('session_abandon', pid, room, session, payload={'at_hand': 5, 'duration_ms': 90000}, result='cancel'), 'session_abandon')

    # Invalid event_type should be dropped
    _assert(not logger.log('not_a_real_event', pid, room, session), 'invalid event type must be dropped')
    # Invalid result should be dropped
    _assert(not logger.log('shot_decision', pid, room, session, result='not_a_result'), 'invalid result must be dropped')

    return session


def _exercise_summary(path: str, expected_session: str) -> dict:
    records, malformed = read_player_event_records(path)
    _assert(malformed == 0, f'expected 0 malformed, got {malformed}')
    _assert(len(records) == 8, f'expected 8 valid records, got {len(records)}')

    summary = summarize_player_events(records, malformed_lines=malformed)
    data = summary.to_dict()

    _assert(data['total_records'] == 8, f'total_records={data["total_records"]}')
    _assert(data['session_count'] == 1, f"session_count={data['session_count']}")
    _assert(data['player_count'] == 1, f"player_count={data['player_count']}")
    _assert(data['room_count'] == 1, f"room_count={data['room_count']}")
    _assert(data['abandon_count'] == 1, f"abandon_count={data['abandon_count']}")
    _assert(data['timeout_count'] == 0, f"timeout_count={data['timeout_count']}")
    _assert(data['server_reject_count'] == 1, f"server_reject_count={data['server_reject_count']}")
    _assert(data['by_event_type'].get('shot_decision') == 1, 'shot_decision count')
    _assert(data['by_event_type'].get('session_end') == 1, 'session_end count')
    _assert(data['by_event_type'].get('session_abandon') == 1, 'session_abandon count')
    _assert(data['average_decision_ms'] > 0, 'average_decision_ms should be > 0')
    _assert(data['reason_counts'].get('invalid_type') == 1, 'reason invalid_type should be 1')

    text = format_summary_text(summary)
    _assert('records: 8' in text, 'text format should include record count')
    _assert('avg_decision_ms' in text, 'text format should include avg_decision_ms')

    html = format_summary_html(summary)
    _assert('<!doctype html>' in html, 'html format should be doctype html')
    _assert('玩家行为日志报告' in html, 'html format should include title')
    _assert(html.count('<article class="metric">') >= 9, 'html should include at least 9 metric cards')

    return data


def _exercise_disabled_logger() -> None:
    disabled = PlayerEventLogger(None)
    _assert(not disabled.enabled, 'disabled logger should report enabled=False')
    _assert(not disabled.log('session_start', 1, 1, 's1'), 'disabled logger should not write')


def _exercise_cached_logger_with_env(monkeypatch_path: str) -> None:
    # get_player_event_logger is lru_cached; only call it after we set env via env-var injection at process level.
    # We do not need to mutate the global cache here; just assert it returns a PlayerEventLogger.
    cached = get_player_event_logger()
    _assert(isinstance(cached, PlayerEventLogger), 'get_player_event_logger should return PlayerEventLogger')


def main() -> int:
    try:
        logger, path = _setup_temp_logger()
        _assert(logger.enabled, 'logger should be enabled when path is set')

        session = _exercise_logging(logger)
        data = _exercise_summary(path, expected_session=session)
        _exercise_disabled_logger()
        _exercise_cached_logger_with_env(path)

        print(f'player-event-smoke OK: {data["total_records"]} records across {data["session_count"]} session(s)')
        return 0
    except AssertionError as e:
        print(f'player-event-smoke FAIL: {e}', file=sys.stderr)
        return 1
    except Exception as e:  # pragma: no cover - defensive
        print(f'player-event-smoke ERROR: {e}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
