import importlib.util
import json
import os
import socket
import subprocess
import sys
import unittest
from unittest.mock import patch


ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
SCRIPT = os.path.join(ROOT, 'scripts', 'backend-preflight.py')


class BackendPreflightCliTest(unittest.TestCase):
    def test_cli_outputs_json_with_skipped_network_check(self):
        result = subprocess.run(
            [sys.executable, SCRIPT, '--skip-network', '--json'],
            check=True,
            capture_output=True,
            text=True,
        )

        checks = json.loads(result.stdout)
        self.assertTrue(any(check['label'].startswith('python import tornado') for check in checks))
        self.assertIn({'status': 'skip', 'label': 'database TCP 127.0.0.1:3306', 'detail': 'network check skipped', 'hint': ''}, checks)


class BackendPreflightUnitTest(unittest.TestCase):
    def load_module(self):
        spec = importlib.util.spec_from_file_location('backend_preflight', SCRIPT)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module

    def test_invalid_database_uri_fails(self):
        module = self.load_module()

        check = module.check_database_uri('not-a-uri')

        self.assertEqual(check.status, 'fail')
        self.assertEqual(check.label, 'database URI')

    def test_database_socket_error_is_actionable_warning(self):
        module = self.load_module()

        with patch.object(socket, 'create_connection', side_effect=OSError('refused')):
            check = module.check_database_uri('mysql+aiomysql://u:p@db.example:3307/ddz')

        self.assertEqual(check.status, 'warn')
        self.assertEqual(check.label, 'database TCP db.example:3307')
        self.assertIn('npm run dev:db', check.hint)


if __name__ == '__main__':
    unittest.main()
