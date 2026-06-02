import logging
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)


def load_env_file(path: str) -> None:
    if not os.path.isfile(path):
        return

    with open(path, encoding='utf-8') as env_file:
        for line in env_file:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue

            key, value = line.split('=', 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


load_env_file(os.path.join(PROJECT_ROOT, '.env'))
load_env_file(os.path.join(BASE_DIR, '.env'))

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
TEMPLATE_ROOT = os.path.join(BASE_DIR, 'templates')

def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


DEBUG = env_bool('TORNADO_DEBUG')

SECRET_KEY = os.getenv('SECRET_KEY', '')
if not SECRET_KEY:
    import base64
    logging.warning('SECRET_KEY not set in environment; generating ephemeral key (sessions will be invalidated on restart)')
    SECRET_KEY = base64.b64encode(os.urandom(32)).decode()

PORT = env_int('PORT', 8081)

WECHAT_CONFIG = {
    'appid': os.getenv('APPID'),
    'appsecret': os.getenv('APPSECRET'),
    'token': os.getenv('TOKEN'),
    'encoding_aes_key': os.getenv('ENCODING_AES_KEY'),
}

DATABASE_URI = os.getenv('DATABASE_URI', 'mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz')
SQL_ECHO = env_bool('SQL_ECHO')

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'root': {
        'level': 'INFO',
        'handlers': ['console'],
        'propagate': True,
    },
    'formatters': {
        'verbose': {
            'format': '%(asctime)s %(levelname)s %(module)s %(lineno)d %(message)s'
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose'
        },
    },
    'loggers': {
        'tornado.general': {
            'handlers': ['console'],
            'propagate': True,
        },
    }
}
