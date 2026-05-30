import asyncio
import logging
import logging.config
import signal
from concurrent.futures import ThreadPoolExecutor

import tornado.locks
import tornado.web
import tornado.websocket
import uvloop
from tornado.process import cpu_count

from api.auth import HealthHandler, IndexHandler, LoginHandler, UserInfoHandler
from api.game.views import AdminHandler, SocketHandler
from api.wx import WechatConfig, WechatHandler
from config import DEBUG, LOGGING, PORT, SECRET_KEY, TEMPLATE_ROOT, STATIC_ROOT, STATIC_URL

logging.config.dictConfig(LOGGING)
logger = logging.getLogger(__name__)


class Application(tornado.web.Application):
    def __init__(self):
        settings = {
            'debug': DEBUG,
            'cookie_secret': SECRET_KEY,
            'xsrf_cookies': False,
            'gzip': False,
            'autoescape': 'xhtml_escape',
            'template_path': TEMPLATE_ROOT,
            'static_path': STATIC_ROOT,
            'static_url_prefix': STATIC_URL,
            'login_url': '/login',
        }

        url_patterns = [
            ('/', IndexHandler),
            ('/healthz', HealthHandler),
            ('/login', LoginHandler),
            ('/userinfo', UserInfoHandler),
            ('/admin', AdminHandler),
            ('/ws', SocketHandler),
            ('/social/config', WechatConfig),
            ('/social/index', WechatHandler),
        ]
        super().__init__(url_patterns, **settings)
        self.executor = ThreadPoolExecutor(cpu_count() * 2)
        self.allow_robot = True


async def main():
    app = Application()
    app.listen(PORT)
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()

    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop_event.set)

    logger.info('server on http://127.0.0.1:%s', PORT)
    await stop_event.wait()
    logger.info('server stopping')

    app.executor.shutdown(wait=False, cancel_futures=True)


if __name__ == '__main__':
    uvloop.install()
    asyncio.run(main())
