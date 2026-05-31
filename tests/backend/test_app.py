import json
import logging
import unittest

from tornado.testing import AsyncHTTPTestCase

from app import Application


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


if __name__ == '__main__':
    unittest.main()
