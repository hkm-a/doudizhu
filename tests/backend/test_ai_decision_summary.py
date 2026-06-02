import json
import os
import subprocess
import sys
import tempfile
import unittest

from ai.decision_summary import format_summary_html, format_summary_text, summarize_decision_log, summarize_decisions


class AiDecisionSummaryTest(unittest.TestCase):
    def test_summarizes_records(self):
        summary = summarize_decisions([
            {'policy': 'rule', 'mode': 'rob', 'decision': 1},
            {'policy': 'rule', 'mode': 'shot', 'decision': [3, 16]},
            {'policy': 'douzero', 'mode': 'shot', 'decision': [], 'reason': 'pass'},
            {'policy': 'douzero', 'mode': 'shot', 'decision': None, 'fallback': True, 'fallback_reason': 'boom'},
            {'mode': 'shot', 'decision': [4], 'room': {'id': 9}},
            {'policy': 'rule', 'mode': 'shot', 'decision': [5], 'room': {'id': 9}},
        ], malformed_lines=2)

        self.assertEqual(summary.total_records, 6)
        self.assertEqual(summary.malformed_lines, 2)
        self.assertEqual(summary.by_policy, {'douzero': 2, 'rule': 3, 'unknown': 1})
        self.assertEqual(summary.by_mode, {'rob': 1, 'shot': 5})
        self.assertEqual(summary.fallback_count, 1)
        self.assertEqual(summary.pass_count, 1)
        self.assertEqual(summary.decision_count, 5)
        self.assertEqual(summary.average_decision_cards, 0.8)
        self.assertEqual(summary.reason_counts, {'pass': 1, 'boom': 1})
        self.assertEqual(summary.room_count, 1)

    def test_reads_jsonl_and_counts_malformed_lines(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, 'ai.jsonl')
            with open(path, 'w', encoding='utf-8') as log_file:
                log_file.write(json.dumps({'policy': 'rule', 'mode': 'shot', 'decision': [3]}) + '\n')
                log_file.write('not-json\n')
                log_file.write(json.dumps(['not-a-dict']) + '\n')

            summary = summarize_decision_log(path)

        self.assertEqual(summary.total_records, 1)
        self.assertEqual(summary.malformed_lines, 2)

    def test_formats_human_readable_summary(self):
        summary = summarize_decisions([
            {'policy': 'rule', 'mode': 'shot', 'decision': []},
        ])

        text = format_summary_text(summary)

        self.assertIn('records: 1', text)
        self.assertIn('passes: 1', text)
        self.assertIn('by_policy: rule=1', text)

    def test_formats_self_contained_html_summary(self):
        summary = summarize_decisions([
            {'policy': 'rule', 'mode': 'shot', 'decision': [3], 'reason': '<unsafe>'},
            {'policy': 'douzero', 'mode': 'shot', 'decision': [], 'fallback': True, 'fallback_reason': 'model missing'},
        ], malformed_lines=1)

        html = format_summary_html(summary, title='AI <Report>')

        self.assertIn('<!doctype html>', html)
        self.assertIn('<html lang="zh-CN">', html)
        self.assertIn('AI &lt;Report&gt;', html)
        self.assertIn('关键指标', html)
        self.assertIn('策略分布', html)
        self.assertIn('rule', html)
        self.assertIn('douzero', html)
        self.assertIn('model missing', html)
        self.assertIn('&lt;unsafe&gt;', html)
        self.assertNotIn('<unsafe>', html)


class AiDecisionSummaryCliTest(unittest.TestCase):
    def test_cli_prints_json_summary(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, 'ai.jsonl')
            with open(path, 'w', encoding='utf-8') as log_file:
                log_file.write(json.dumps({'policy': 'rule', 'mode': 'rob', 'decision': 0}) + '\n')

            result = subprocess.run(
                [sys.executable, 'scripts/ai-decision-summary.py', path],
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                env={**os.environ, 'PYTHONPATH': 'server'},
                check=True,
                capture_output=True,
                text=True,
            )

        payload = json.loads(result.stdout)
        self.assertEqual(payload['total_records'], 1)
        self.assertEqual(payload['by_policy'], {'rule': 1})

    def test_cli_writes_html_report(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = os.path.join(temp_dir, 'ai.jsonl')
            output_path = os.path.join(temp_dir, 'report.html')
            with open(path, 'w', encoding='utf-8') as log_file:
                log_file.write(json.dumps({'policy': 'rule', 'mode': 'shot', 'decision': [3, 4]}) + '\n')

            result = subprocess.run(
                [sys.executable, 'scripts/ai-decision-summary.py', path, '--html', '--output', output_path],
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
                env={**os.environ, 'PYTHONPATH': 'server'},
                check=True,
                capture_output=True,
                text=True,
            )

            with open(output_path, encoding='utf-8') as report_file:
                html = report_file.read()

        self.assertEqual(result.stdout, '')
        self.assertIn('AI 决策日志报告', html)
        self.assertIn('平均出牌张数', html)
        self.assertIn('rule', html)


if __name__ == '__main__':
    unittest.main()
