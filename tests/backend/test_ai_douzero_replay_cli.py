import json
import os
import subprocess
import sys
import unittest


class DouZeroReplayCliTest(unittest.TestCase):
    def test_cli_skips_cleanly_without_douzero_enabled(self):
        result = subprocess.run(
            [sys.executable, 'scripts/ai-douzero-replay-smoke.py'],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            env={**os.environ, 'PYTHONPATH': 'server', 'DOUZERO_ENABLED': '0'},
            check=True,
            capture_output=True,
            text=True,
        )

        payload = json.loads(result.stdout)
        self.assertEqual(payload['status'], 'skipped')
        self.assertIn('DOUZERO_ENABLED', payload['reason'])

    def test_cli_require_fails_without_douzero_enabled(self):
        result = subprocess.run(
            [sys.executable, 'scripts/ai-douzero-replay-smoke.py', '--require'],
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            env={**os.environ, 'PYTHONPATH': 'server', 'DOUZERO_ENABLED': '0'},
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 2)
        self.assertEqual(json.loads(result.stdout)['status'], 'skipped')


if __name__ == '__main__':
    unittest.main()
