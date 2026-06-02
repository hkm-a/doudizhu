import argparse
import importlib.util
import json
import os
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List
from urllib.parse import urlparse


REQUIRED_IMPORTS = (
    'aiomysql',
    'jwt',
    'sqlalchemy',
    'tornado',
    'uvloop',
)

AI_OPTIONAL_IMPORTS = (
    'torch',
    'douzero',
)

DOUZERO_MODEL_FILES = ('landlord.ckpt', 'landlord_up.ckpt', 'landlord_down.ckpt')


@dataclass(frozen=True)
class Check:
    status: str
    label: str
    detail: str
    hint: str = ''

    def to_dict(self):
        return {
            'status': self.status,
            'label': self.label,
            'detail': self.detail,
            'hint': self.hint,
        }


def run_preflight(database_uri=None, skip_network=False, timeout=1.5) -> List[Check]:
    checks = []
    for module in REQUIRED_IMPORTS:
        if importlib.util.find_spec(module):
            checks.append(Check('pass', f'python import {module}', 'available'))
        else:
            checks.append(Check(
                'fail',
                f'python import {module}',
                'missing',
                'Install backend dependencies with pip install -r requirements.txt.',
            ))

    checks.append(check_douzero_ai())

    database_uri = database_uri or os.getenv('DATABASE_URI', 'mysql+aiomysql://ddz:ddz@127.0.0.1:3306/ddz')
    checks.append(check_database_uri(database_uri, skip_network=skip_network, timeout=timeout))
    return checks


def check_douzero_ai() -> Check:
    enabled = os.getenv('DOUZERO_ENABLED', '').strip().lower() in {'1', 'true', 'yes', 'on'}
    if not enabled:
        return Check('skip', 'AI (DouZero)', 'disabled (DOUZERO_ENABLED is not set)')

    missing_imports = [m for m in AI_OPTIONAL_IMPORTS if not importlib.util.find_spec(m)]
    if missing_imports:
        return Check(
            'warn', 'AI (DouZero)',
            f'missing imports: {", ".join(missing_imports)}',
            'Install optional AI deps: pip install -r requirements-ai.txt',
        )

    model_dir = os.getenv('DOUZERO_MODEL_DIR', '')
    if not model_dir:
        return Check(
            'warn', 'AI (DouZero)',
            'DOUZERO_MODEL_DIR is not set',
            'Run npm run dev:ai:setup to download models and configure .env',
        )

    model_path = Path(model_dir)
    missing_models = [f for f in DOUZERO_MODEL_FILES if not (model_path / f).is_file()]
    if missing_models:
        return Check(
            'warn', 'AI (DouZero)',
            f'missing model files in {model_dir}: {", ".join(missing_models)}',
            'Run npm run dev:ai:setup to download missing models',
        )

    total_size = sum((model_path / f).stat().st_size for f in DOUZERO_MODEL_FILES)
    return Check('pass', 'AI (DouZero)', f'ready: {len(DOUZERO_MODEL_FILES)} models, {total_size / 1024 / 1024:.1f} MB')


def check_database_uri(database_uri, skip_network=False, timeout=1.5) -> Check:
    parsed = urlparse(database_uri)
    if not parsed.scheme or not parsed.hostname:
        return Check('fail', 'database URI', database_uri, 'Set DATABASE_URI to mysql+aiomysql://user:pass@host:port/db.')

    port = parsed.port or 3306
    label = f'database TCP {parsed.hostname}:{port}'
    if skip_network:
        return Check('skip', label, 'network check skipped')

    try:
        with socket.create_connection((parsed.hostname, port), timeout=timeout):
            return Check('pass', label, 'reachable')
    except OSError as exc:
        return Check(
            'warn',
            label,
            str(exc),
            'Start MySQL with npm run dev:db, or check DATABASE_URI/MYSQL_PORT.',
        )


def main() -> int:
    parser = argparse.ArgumentParser(description='Check backend Python imports and database reachability.')
    parser.add_argument('--database-uri', default=os.getenv('DATABASE_URI'))
    parser.add_argument('--skip-network', action='store_true')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()

    checks = run_preflight(args.database_uri, skip_network=args.skip_network)
    if args.json:
        print(json.dumps([check.to_dict() for check in checks], ensure_ascii=False, sort_keys=True))
    else:
        for check in checks:
            suffix = f" {check.hint}" if check.hint else ''
            print(f"[{check.status}] {check.label}: {check.detail}{suffix}")

    return 1 if any(check.status == 'fail' for check in checks) else 0


if __name__ == '__main__':
    sys.exit(main())
