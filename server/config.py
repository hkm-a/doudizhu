import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')
TEMPLATE_ROOT = os.path.join(BASE_DIR, 'templates')

def env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.lower() in {'1', 'true', 'yes', 'on'}


def env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


DEBUG = env_bool('TORNADO_DEBUG')

SECRET_KEY = os.getenv('SECRET_KEY', 'fiDSpuZ7QFe8fm0XP9Jb7ZIPNsOegkHYtgKSd4I83Hs=')

PORT = env_int('PORT', 8080)

WECHAT_CONFIG = {
    'appid': os.getenv('APPID'),
    'appsecret': os.getenv('APPSECRET'),
    'token': os.getenv('TOKEN'),
    'encoding_aes_key': os.getenv('ENCODING_AES_KEY'),
}

DATABASE_URI = os.getenv('DATABASE_URI', 'mysql+aiomysql://root:123456@127.0.0.1:3306/ddz')
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
