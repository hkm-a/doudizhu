import os
import tempfile
import unittest
from unittest.mock import patch

from config import env_bool, env_int, load_env_file


class EnvBoolTest(unittest.TestCase):
    def test_uses_default_for_missing_variable(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertTrue(env_bool('MISSING_FLAG', default=True))
            self.assertFalse(env_bool('MISSING_FLAG', default=False))

    def test_accepts_common_truthy_values(self):
        for value in ('1', 'true', 'yes', 'on', ' TRUE '):
            with self.subTest(value=value):
                with patch.dict(os.environ, {'FLAG': value}, clear=True):
                    self.assertTrue(env_bool('FLAG'))

    def test_rejects_non_truthy_values(self):
        for value in ('0', 'false', 'no', 'off', 'maybe', ''):
            with self.subTest(value=value):
                with patch.dict(os.environ, {'FLAG': value}, clear=True):
                    self.assertFalse(env_bool('FLAG'))


class EnvIntTest(unittest.TestCase):
    def test_reads_integer_values(self):
        with patch.dict(os.environ, {'PORT': '9090'}, clear=True):
            self.assertEqual(env_int('PORT', 8081), 9090)

    def test_uses_default_for_missing_or_invalid_values(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(env_int('PORT', 8081), 8081)
        with patch.dict(os.environ, {'PORT': 'not-a-port'}, clear=True):
            self.assertEqual(env_int('PORT', 8081), 8081)


class LoadEnvFileTest(unittest.TestCase):
    def test_loads_simple_key_value_pairs_without_overwriting_existing_env(self):
        content = """
# comment
PORT=8082
SECRET_KEY="from-file"
DATABASE_URI='mysql://example'
BROKEN_LINE
"""
        with tempfile.NamedTemporaryFile('w', delete=False) as env_file:
            env_file.write(content)
            env_path = env_file.name

        try:
            with patch.dict(os.environ, {'SECRET_KEY': 'already-set'}, clear=True):
                load_env_file(env_path)

                self.assertEqual(os.environ['PORT'], '8082')
                self.assertEqual(os.environ['SECRET_KEY'], 'already-set')
                self.assertEqual(os.environ['DATABASE_URI'], 'mysql://example')
                self.assertNotIn('BROKEN_LINE', os.environ)
        finally:
            os.unlink(env_path)

    def test_ignores_missing_files(self):
        with patch.dict(os.environ, {}, clear=True):
            load_env_file('/tmp/doudizhu-missing-env-file')
            self.assertEqual(os.environ, {})


if __name__ == '__main__':
    unittest.main()
