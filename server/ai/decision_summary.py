from __future__ import annotations

import json
from collections import Counter
from dataclasses import dataclass
from html import escape
from typing import Any, Dict, Iterable, List, Tuple


@dataclass(frozen=True)
class DecisionSummary:
    total_records: int
    malformed_lines: int
    by_policy: Dict[str, int]
    by_mode: Dict[str, int]
    fallback_count: int
    pass_count: int
    decision_count: int
    average_decision_cards: float
    reason_counts: Dict[str, int]
    room_count: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            'total_records': self.total_records,
            'malformed_lines': self.malformed_lines,
            'by_policy': self.by_policy,
            'by_mode': self.by_mode,
            'fallback_count': self.fallback_count,
            'pass_count': self.pass_count,
            'decision_count': self.decision_count,
            'average_decision_cards': self.average_decision_cards,
            'reason_counts': self.reason_counts,
            'room_count': self.room_count,
        }


def summarize_decision_log(path: str) -> DecisionSummary:
    records, malformed_lines = read_decision_records(path)
    return summarize_decisions(records, malformed_lines)


def read_decision_records(path: str) -> Tuple[List[Dict[str, Any]], int]:
    records = []
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


def summarize_decisions(records: Iterable[Dict[str, Any]], malformed_lines: int = 0) -> DecisionSummary:
    records = list(records)
    by_policy = Counter()
    by_mode = Counter()
    reasons = Counter()
    rooms = set()
    fallback_count = 0
    pass_count = 0
    decision_count = 0
    decision_cards = 0

    for record in records:
        by_policy[_label(record.get('policy'))] += 1
        by_mode[_label(record.get('mode'))] += 1

        if record.get('fallback'):
            fallback_count += 1

        reason = record.get('fallback_reason') or record.get('reason')
        if reason:
            reasons[str(reason)] += 1

        room = record.get('room')
        if isinstance(room, dict) and room.get('id') is not None:
            rooms.add(room.get('id'))

        if 'decision' not in record or record.get('decision') is None:
            continue

        decision = record.get('decision')
        decision_count += 1
        if isinstance(decision, list):
            decision_cards += len(decision)
            if len(decision) == 0:
                pass_count += 1

    average_decision_cards = round(decision_cards / decision_count, 2) if decision_count else 0.0
    return DecisionSummary(
        total_records=len(records),
        malformed_lines=malformed_lines,
        by_policy=dict(sorted(by_policy.items())),
        by_mode=dict(sorted(by_mode.items())),
        fallback_count=fallback_count,
        pass_count=pass_count,
        decision_count=decision_count,
        average_decision_cards=average_decision_cards,
        reason_counts=dict(reasons.most_common()),
        room_count=len(rooms),
    )


def format_summary_text(summary: DecisionSummary) -> str:
    data = summary.to_dict()
    lines = [
        f"records: {data['total_records']}",
        f"malformed_lines: {data['malformed_lines']}",
        f"rooms: {data['room_count']}",
        f"fallbacks: {data['fallback_count']}",
        f"passes: {data['pass_count']}",
        f"avg_decision_cards: {data['average_decision_cards']}",
        f"by_policy: {_format_counts(data['by_policy'])}",
        f"by_mode: {_format_counts(data['by_mode'])}",
    ]
    if data['reason_counts']:
        lines.append(f"reasons: {_format_counts(data['reason_counts'])}")
    return '\n'.join(lines)


def format_summary_html(summary: DecisionSummary, title: str = 'AI 决策日志报告') -> str:
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
        '<p>DouZero / Rule AI telemetry</p>',
        f'<h1>{safe_title}</h1>',
        '<span>从 JSONL 决策日志生成，可直接随 release 附件归档。</span>',
        '</header>',
        '<section class="metrics" aria-label="关键指标">',
        _metric_card('记录数', data['total_records']),
        _metric_card('异常行', data['malformed_lines']),
        _metric_card('房间数', data['room_count']),
        _metric_card('回退次数', data['fallback_count']),
        _metric_card('不出次数', data['pass_count']),
        _metric_card('平均出牌张数', data['average_decision_cards']),
        '</section>',
        '<section class="panel" aria-label="策略分布">',
        '<h2>策略分布</h2>',
        _bar_list(data['by_policy'], total),
        '</section>',
        '<section class="panel" aria-label="模式分布">',
        '<h2>模式分布</h2>',
        _bar_list(data['by_mode'], total),
        '</section>',
        '<section class="panel" aria-label="原因统计">',
        '<h2>原因统计</h2>',
        _bar_list(data['reason_counts'], total, empty_label='暂无 fallback 或 pass 原因'),
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
  --bg: #10251f;
  --panel: #17231f;
  --panel-strong: #1d3b32;
  --line: rgba(227, 193, 93, 0.28);
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
