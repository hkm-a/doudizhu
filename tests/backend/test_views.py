import unittest
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

from http import HTTPStatus
from tornado.web import HTTPError

from api.game.views import parse_bool, SocketHandler


class ParseBoolTest(unittest.TestCase):
    def test_passes_bool_through(self):
        self.assertIs(parse_bool(True), True)
        self.assertIs(parse_bool(False), False)

    def test_converts_int_0_and_1(self):
        self.assertIs(parse_bool(0), False)
        self.assertIs(parse_bool(1), True)

    def test_rejects_other_int(self):
        with self.assertRaises(HTTPError) as ctx:
            parse_bool(2)
        self.assertEqual(ctx.exception.status_code, HTTPStatus.BAD_REQUEST)

    def test_converts_true_strings(self):
        for val in ('1', 'true', 'True', '  yes  ', 'on'):
            with self.subTest(val=val):
                self.assertIs(parse_bool(val), True)

    def test_converts_false_strings(self):
        for val in ('0', 'false', 'False', '  no  ', 'off'):
            with self.subTest(val=val):
                self.assertIs(parse_bool(val), False)

    def test_rejects_unknown_string(self):
        with self.assertRaises(HTTPError) as ctx:
            parse_bool('maybe')
        self.assertEqual(ctx.exception.status_code, HTTPStatus.BAD_REQUEST)

    def test_rejects_non_bool_non_int_non_str(self):
        with self.assertRaises(HTTPError) as ctx:
            parse_bool([])
        self.assertEqual(ctx.exception.status_code, HTTPStatus.BAD_REQUEST)


class DecodeMessageTest(unittest.TestCase):
    def test_valid_message_returns_code_and_packet(self):
        code, packet = SocketHandler.decode_message('[2007, {"double": 1}]')
        self.assertEqual(code, 2007)
        self.assertEqual(packet, {'double': 1})

    def test_invalid_json_returns_none_none(self):
        code, packet = SocketHandler.decode_message('not json')
        self.assertIsNone(code)
        self.assertIsNone(packet)

    def test_non_list_message_returns_none_none(self):
        code, packet = SocketHandler.decode_message('"string"')
        self.assertIsNone(code)
        self.assertIsNone(packet)

    def test_list_wrong_length_returns_none_none(self):
        code, packet = SocketHandler.decode_message('[1]')
        self.assertIsNone(code)
        self.assertIsNone(packet)

    def test_code_not_int_returns_none_none(self):
        code, packet = SocketHandler.decode_message('["bad", {}]')
        self.assertIsNone(code)
        self.assertIsNone(packet)

    def test_packet_not_dict_returns_none_none(self):
        code, packet = SocketHandler.decode_message('[2007, "bad"]')
        self.assertIsNone(code)
        self.assertIsNone(packet)


class SavePlayerPointsTest(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.handler = SocketHandler.__new__(SocketHandler)

    async def test_save_player_points_calls_session_execute(self):
        session = AsyncMock()
        session.__aenter__ = AsyncMock(return_value=session)
        session.__aexit__ = AsyncMock(return_value=None)
        session.begin = MagicMock()
        session.begin.return_value = AsyncMock()
        session.begin.return_value.__aenter__ = AsyncMock(return_value=session)
        session.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch.object(SocketHandler, 'session', new_callable=PropertyMock, return_value=session):
            result = await self.handler.save_player_points({1: 1200, 2: 800})

        self.assertTrue(result)
        self.assertEqual(session.execute.call_count, 2)
        session.commit.assert_awaited_once()

    async def test_save_player_points_with_empty_dict(self):
        session = AsyncMock()
        session.__aenter__ = AsyncMock(return_value=session)
        session.__aexit__ = AsyncMock(return_value=None)
        session.begin = MagicMock()
        session.begin.return_value = AsyncMock()
        session.begin.return_value.__aenter__ = AsyncMock(return_value=session)
        session.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch.object(SocketHandler, 'session', new_callable=PropertyMock, return_value=session):
            result = await self.handler.save_player_points({})

        self.assertTrue(result)
        session.execute.assert_not_called()
        session.commit.assert_awaited_once()

    async def test_save_player_points_always_returns_true(self):
        session = AsyncMock()
        session.__aenter__ = AsyncMock(return_value=session)
        session.__aexit__ = AsyncMock(return_value=None)
        session.begin = MagicMock()
        session.begin.return_value = AsyncMock()
        session.begin.return_value.__aenter__ = AsyncMock(return_value=session)
        session.begin.return_value.__aexit__ = AsyncMock(return_value=None)

        with patch.object(SocketHandler, 'session', new_callable=PropertyMock, return_value=session):
            result = await self.handler.save_player_points({1: 1000})
        self.assertTrue(result)
