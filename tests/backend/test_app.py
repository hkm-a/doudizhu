import json
import logging
import unittest
from unittest.mock import patch

from tornado.testing import AsyncHTTPTestCase

from app import Application
from api.game.views import SocketHandler


class HealthHandlerTest(AsyncHTTPTestCase):
    def get_app(self):
        self.app = Application()
        return self.app

    def setUp(self):
        self.access_logger = logging.getLogger('tornado.access')
        self.original_access_disabled = self.access_logger.disabled
        self.access_logger.disabled = True
        super().setUp()

    def tearDown(self):
        self.app.executor.shutdown(wait=False, cancel_futures=True)
        self.access_logger.disabled = self.original_access_disabled
        super().tearDown()

    def test_healthz_reports_service_status(self):
        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body), {
            'status': 'ok',
            'service': 'doudizhu',
            'robots': True,
        })

    def test_healthz_reflects_robot_toggle(self):
        self.app.allow_robot = False

        response = self.fetch('/healthz')

        self.assertEqual(response.code, 200)
        self.assertFalse(json.loads(response.body)['robots'])


class SocketHandlerDecodeMessageTest(unittest.TestCase):
    def setUp(self):
        self.logging_patch = patch('api.game.views.logging')
        self.logging_patch.start()

    def tearDown(self):
        self.logging_patch.stop()

    def test_decodes_valid_protocol_packet(self):
        self.assertEqual(SocketHandler.decode_message('[2001, {"ready": 1}]'), (2001, {'ready': 1}))

    def test_rejects_malformed_json_without_raising(self):
        self.assertEqual(SocketHandler.decode_message('{bad-json'), (None, None))

    def test_rejects_non_packet_json_values_without_raising(self):
        invalid_messages = (
            'null',
            '1',
            '{}',
            '[2001]',
            '[2001, {"ready": 1}, "extra"]',
            '{"0": 2001, "1": {"ready": 1}}',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))

    def test_rejects_bool_or_string_protocol_codes(self):
        invalid_messages = (
            '[true, {"ready": 1}]',
            '["2001", {"ready": 1}]',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))

    def test_rejects_non_object_packet_payloads(self):
        invalid_messages = (
            '[2001, null]',
            '[2001, []]',
            '[2001, "ready"]',
        )

        for message in invalid_messages:
            with self.subTest(message=message):
                self.assertEqual(SocketHandler.decode_message(message), (None, None))


if __name__ == '__main__':
    unittest.main()
