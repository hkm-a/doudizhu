from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass, field
from html import escape
from typing import Any, Dict, Iterable, List, Tuple


@dataclass(frozen=True)
class PlayerEventSummary:
    total_records: int
    malformed_lines: int
    by_event_type: Dict[str, int]
    by_result: Dict[str, int]
    session_count: int
    player_count: int
    room_count: int
    abandon_count: int
    timeout_count: int
    average_decision_ms: float
    server_reject_count: int
    reason_counts: Dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_records': self.total_records,
            'malformed_lines': self.malformed_lines,
            'by_event_type': self.by_event_type,
            'by_result': self.by_result,
            'session_count': self.session_count,
            'player_count': self.player_count,
            'room_count': self.room_count,
            'abandon_count': self.abandon_count,
            'timeout_count': self.timeout_count,
            'average_decision_ms': self.average_decision_ms,
            'server_reject_count': self.server_reject_count,
            'reason_counts': self.reason_counts,
        }


def summarize_player_event_log(path: str) -> PlayerEventSummary:
    records, malformed_lines = read_player_event_records(path)
    return summarize_player_events(records, malformed_lines)


def read_player_event_records(path: str) -> Tuple[List[Dict[str, Any]], int]:
    records: List[Dict[str, Any]] = []
    malformed_lines = 0
    with open(path, encoding='utf-8') as log_file:
        for line in log_file:
            line = line.strip()
            if not line:
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                malformed_lines += 1
                continue
            if isinstance(record, dict):
                records.append(record)
            else:
                malformed_lines += 1
    return records, malformed_lines


def summarize_player_events(records: Iterable[Dict[str, Any]], malformed_lines: int = 0) -> PlayerEventSummary:
    records = list(records)
    by_event_type: Counter = Counter()
    by_result: Counter = Counter()
    reasons: Counter = Counter()
    sessions: set = set()
    players: set = set()
    rooms: set = set()
    abandon_count = 0
    timeout_count = 0
    server_reject_count = 0
    decision_ms_total = 0
    decision_ms_count = 0

    for record in records:
        by_event_type[_label(record.get('event_type'))] += 1
        by_result[_label(record.get('result'))] += 1

        if record.get('event_type') == 'session_abandon':
            abandon_count += 1
        if record.get('result') == 'timeout':
            timeout_count += 1
        if record.get('event_type') == 'server_reject':
            server_reject_count += 1

        reason = record.get('reason')
        if reason:
            reasons[str(reason)] += 1

        session_id = record.get('session_id')
        if session_id:
            sessions.add(session_id)
        player_id = record.get('player_id')
        if player_id is not None:
            players.add(player_id)
        room_id = record.get('room_id')
        if room_id is not None:
            rooms.add(room_id)

        if record.get('event_type') in {'rob_decision', 'shot_decision', 'pass_decision', 'double_decision'}:
            duration = record.get('duration_ms')
            if isinstance(duration, (int, float)):
                decision_ms_total += duration
                decision_ms_count += 1

    average_decision_ms = round(decision_ms_total / decision_ms_count, 2) if decision_ms_count else 0.0

    return PlayerEventSummary(
        total_records=len(records),
        malformed_lines=malformed_lines,
        by_event_type=dict(sorted(by_event_type.items())),
        by_result=dict(sorted(by_result.items())),
        session_count=len(sessions),
        player_count=len(players),
        room_count=len(rooms),
        abandon_count=abandon_count,
        timeout_count=timeout_count,
        average_decision_ms=average_decision_ms,
        server_reject_count=server_reject_count,
        reason_counts=dict(reasons.most_common()),
    )


def format_summary_text(summary: PlayerEventSummary) -> str:
    data = summary.to_dict()
    lines = [
        f"records: {data['total_records']}",
        f"malformed_lines: {data['malformed_lines']}",
        f"sessions: {data['session_count']}",
        f"players: {data['player_count']}",
        f"rooms: {data['room_count']}",
        f"abandons: {data['abandon_count']}",
        f"timeouts: {data['timeout_count']}",
        f"server_rejects: {data['server_reject_count']}",
        f"avg_decision_ms: {data['average_decision_ms']}",
        f"by_event_type: {_format_counts(data['by_event_type'])}",
        f"by_result: {_format_counts(data['by_result'])}",
    ]
    if data['reason_counts']:
        lines.append(f"reasons: {_format_counts(data['reason_counts'])}")
    return '\n'.join(lines)


def format_summary_html(summary: PlayerEventSummary, title: str = '玩家行为日志报告') -> str:
    data = summary.to_dict()
    total = max(data['total_records'], 1)
    safe_title = escape(title)
    return '\n'.join([
        '<!doctype html>',
        '<html lang="zh-CN">',
        '<head>',
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f'<title>{safe_title}</title>',
        '<style>',
        _html_styles(),
        '</style>',
        '</head>',
        '<body>',
        '<main class="report">',
        '<header class="hero">',
        '<p>Player behavior telemetry</p>',
        f'<h1>{safe_title}</h1>',
        '<span>从 JSONL 玩家行为日志生成，可直接随 release 附件归档。</span>',
        '</header>',
        '<section class="metrics" aria-label="关键指标">',
        _metric_card('记录数', data['total_records']),
        _metric_card('异常行', data['malformed_lines']),
        _metric_card('会话数', data['session_count']),
        _metric_card('玩家数', data['player_count']),
        _metric_card('房间数', data['room_count']),
        _metric_card('弃坑次数', data['abandon_count']),
        _metric_card('超时次数', data['timeout_count']),
        _metric_card('服务器拒绝', data['server_reject_count']),
        _metric_card('平均决策耗时 ms', data['average_decision_ms']),
        '</section>',
        '<section class="panel" aria-label="事件类型分布">',
        '<h2>事件类型分布</h2>',
        _bar_list(data['by_event_type'], total),
        '</section>',
        '<section class="panel" aria-label="结果分布">',
        '<h2>结果分布</h2>',
        _bar_list(data['by_result'], total),
        '</section>',
        '<section class="panel" aria-label="原因统计">',
        '<h2>原因统计</h2>',
        _bar_list(data['reason_counts'], total, empty_label='暂无失败原因'),
        '</section>',
        '</main>',
        '</body>',
        '</html>',
    ])


def _label(value: Any) -> str:
    if value is None or value == '':
        return 'unknown'
    return str(value)


def _format_counts(counts: Dict[str, int]) -> str:
    if not counts:
        return 'none'
    return ', '.join(f'{key}={value}' for key, value in counts.items())


def _metric_card(label: str, value: Any) -> str:
    return (
        '<article class="metric">'
        f'<span>{escape(label)}</span>'
        f'<strong>{escape(str(value))}</strong>'
        '</article>'
    )


def _bar_list(counts: Dict[str, int], total: int, empty_label: str = '暂无数据') -> str:
    if not counts:
        return f'<p class="empty">{escape(empty_label)}</p>'

    rows = []
    for label, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        percent = round(count / total * 100, 1) if total else 0
        rows.append(
            '<li class="bar-row">'
            f'<span class="bar-row__label">{escape(str(label))}</span>'
            '<span class="bar-row__track" aria-hidden="true">'
            f'<i style="width: {percent}%"></i>'
            '</span>'
            f'<strong>{count}</strong>'
            f'<em>{percent}%</em>'
            '</li>'
        )
    return '<ul class="bar-list">' + ''.join(rows) + '</ul>'


def _html_styles() -> str:
    return '''
:root {
  color-scheme: dark;
  --bg: #0f1f2a;
  --panel: #162634;
  --panel-strong: #1d3a52;
  --line: rgba(148, 217, 195, 0.28);
  --gold: #f1d885;
  --mint: #94d9c3;
  --cream: #fff8e7;
  --danger: #ff9770;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: linear-gradient(135deg, #0f3c32 0%, #122821 52%, #2b1717 100%);
  color: var(--cream);
  font-family: Inter, "PingFang SC", "Microsoft YaHei", Arial, sans-serif;
}
.report {
  width: min(1040px, calc(100% - 32px));
  margin: 0 auto;
  padding: 32px 0;
}
.hero, .panel, .metric {
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(23, 35, 31, 0.86);
  box-shadow: 0 22px 58px rgba(0, 0, 0, 0.28);
}
.hero {
  padding: 28px;
  margin-bottom: 16px;
}
.hero p {
  margin: 0 0 8px;
  color: var(--mint);
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
}
.hero h1 {
  margin: 0 0 8px;
  font-size: clamp(2rem, 5vw, 3.6rem);
  line-height: 1.02;
}
.hero span, .empty {
  color: #d9f5ec;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}
.metric {
  min-height: 94px;
  display: grid;
  gap: 8px;
  align-content: center;
  padding: 18px;
}
.metric span, .panel h2 {
  color: var(--mint);
  font-size: 0.82rem;
  font-weight: 900;
}
.metric strong {
  color: var(--gold);
  font-size: 2rem;
  line-height: 1;
}
.panel {
  padding: 20px;
  margin-bottom: 16px;
}
.panel h2 {
  margin: 0 0 14px;
}
.bar-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.bar-row {
  display: grid;
  grid-template-columns: minmax(100px, 180px) minmax(120px, 1fr) 56px 64px;
  align-items: center;
  gap: 12px;
}
.bar-row__label {
  min-width: 0;
  overflow-wrap: anywhere;
  color: var(--cream);
  font-weight: 800;
}
.bar-row__track {
  height: 14px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(148, 217, 195, 0.16);
}
.bar-row__track i {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--gold), var(--danger));
}
.bar-row strong {
  color: var(--gold);
  text-align: right;
}
.bar-row em {
  color: #d9f5ec;
  font-style: normal;
  text-align: right;
}
@media (max-width: 720px) {
  .metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .bar-row {
    grid-template-columns: minmax(0, 1fr) 48px;
  }
  .bar-row__track {
    grid-column: 1 / -1;
    grid-row: 2;
  }
  .bar-row em {
    display: none;
  }
}
'''.strip()
