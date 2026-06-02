"""GDD v0.2 H.6 段位自动调度：每 30 天对所有 user 应用赛季重置。

通过 admin POST /segment/season/reset 端点批量处理。
需要 admin token（uid=1）。

用法：
  1. 启 dev:server：PYTHONPATH=server PORT=8081 python3 server/app.py
  2. 跑：ADMIN_TOKEN=<jwt> python3 scripts/season_reset_cron.py

调度（cron 方式）：
  - Hermes cronjob: action='create' schedule='30d' script='season_reset_cron.py'
  - 系统 cron: 0 0 1 * * python3 scripts/season_reset_cron.py
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from typing import Dict, List, Optional


DEFAULT_BACKEND = os.getenv('DOUDIZHU_BACKEND_URL', 'http://127.0.0.1:8081')
ADMIN_TOKEN = os.getenv('ADMIN_TOKEN', '')
DAYS_THRESHOLD = int(os.getenv('SEASON_RESET_DAYS', '30'))


def _http_get(path: str, base: str, token: str) -> dict:
    req = urllib.request.Request(
        base + path,
        headers={'Cookie': f'userinfo={token}'} if token else {},
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _http_post(path: str, body: dict, base: str, token: str) -> dict:
    req = urllib.request.Request(
        base + path,
        data=json.dumps(body).encode('utf-8'),
        headers={'Content-Type': 'application/json', 'Cookie': f'userinfo={token}'} if token else {},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main() -> int:
    if not ADMIN_TOKEN:
        print('ADMIN_TOKEN env var not set. Skipping season reset (no-op).')
        print('To enable:')
        print('  1. Login as uid=1 admin to get a token')
        print('  2. export ADMIN_TOKEN=<jwt>')
        print('  3. python3 scripts/season_reset_cron.py')
        return 0

    print(f'Starting season reset (threshold={DAYS_THRESHOLD} days)')
    leaderboard = _http_get('/segment/leaderboard?limit=100', DEFAULT_BACKEND, ADMIN_TOKEN)
    users = leaderboard.get('leaderboard', [])
    if not users:
        print('No users in leaderboard; nothing to reset.')
        return 0

    reset_count = 0
    failed = 0
    for user in users:
        uid = user.get('uid')
        if not uid:
            continue
        try:
            result = _http_post('/segment/season/reset', {'uid': uid}, DEFAULT_BACKEND, ADMIN_TOKEN)
            old_seg = result.get('old_state', {}).get('segment', '?')
            new_seg = result.get('new_state', {}).get('segment', '?')
            demoted = result.get('demoted', False)
            print(f'  uid={uid} {old_seg} -> {new_seg}{"  (降级)" if demoted else ""}')
            reset_count += 1
        except urllib.error.HTTPError as e:
            print(f'  uid={uid} HTTP {e.code}: {e.reason}')
            failed += 1
        except Exception as e:
            print(f'  uid={uid} error: {e}')
            failed += 1

    print(f'\nDone. {reset_count} users reset, {failed} failed.')
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
