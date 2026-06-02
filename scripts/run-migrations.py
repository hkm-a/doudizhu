import asyncio
import logging
import sys
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parent.parent / 'server'

if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

from alembic.config import CommandLine, Config

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger('migrate')


def run_migrations():
    alembic_ini = SERVER_DIR / 'alembic.ini'
    if not alembic_ini.is_file():
        logger.error('alembic.ini not found at %s', alembic_ini)
        return False

    config = Config(str(alembic_ini))
    config.set_main_option('script_location', str(SERVER_DIR / 'alembic'))

    try:
        CommandLine().run_cmd(config, ['upgrade', 'head'])
        logger.info('Migrations up to date')
        return True
    except Exception as e:
        logger.error('Migration failed: %s', e)
        return False


def autogenerate(message: str):
    alembic_ini = SERVER_DIR / 'alembic.ini'
    if not alembic_ini.is_file():
        logger.error('alembic.ini not found at %s', alembic_ini)
        return False

    config = Config(str(alembic_ini))
    config.set_main_option('script_location', str(SERVER_DIR / 'alembic'))

    try:
        CommandLine().run_cmd(config, ['revision', '--autogenerate', '-m', message])
        logger.info('Generated migration: %s', message)
        return True
    except Exception as e:
        logger.error('Autogenerate failed: %s', e)
        return False


def check_migrations():
    alembic_ini = SERVER_DIR / 'alembic.ini'
    if not alembic_ini.is_file():
        return False

    config = Config(str(alembic_ini))
    config.set_main_option('script_location', str(SERVER_DIR / 'alembic'))

    try:
        CommandLine().run_cmd(config, ['check'])
        return True
    except SystemExit:
        return False


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Database migration management')
    parser.add_argument('action', nargs='?', default='upgrade',
                        choices=['upgrade', 'autogenerate', 'check'],
                        help='Migration action')
    parser.add_argument('-m', '--message', default='auto',
                        help='Migration message (for autogenerate)')

    args = parser.parse_args()

    if args.action == 'upgrade':
        success = run_migrations()
    elif args.action == 'autogenerate':
        success = autogenerate(args.message)
    elif args.action == 'check':
        success = check_migrations()

    sys.exit(0 if success else 1)
