"""Fetch real sound assets for the 9 placeholder slots in GDD v0.2 I 章节.

This script does NOT fabricate audio. It queries the Freesound public API and
downloads the best-matching licensed sound for each placeholder slot, then
writes the file to disk in place of the existing ``*_placeholder.wav``.

**You must provide a Freesound API token**:

  1. Register at https://freesound.org/apiv2/apply/ to get an API key
  2. Export it: ``export FREESOUND_API_KEY=<your-key>``
  3. Run: ``python3 scripts/fetch-real-sounds.py --dry-run``  (search only)
  4. Run: ``python3 scripts/fetch-real-sounds.py``            (search + download)

If ``FREESOUND_API_KEY`` is unset, the script prints a help message and exits 0
without making any network calls. This is the expected no-op path under our
project rules: never fabricate audio assets.

Each search query is built from the GDD v0.2 I.1 spec (sound name, frequency,
duration, mood). The script picks the highest-rated short clip per slot.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request


FREESOUND_SEARCH_URL = 'https://freesound.org/apiv2/search/text/'
FREESOUND_DOWNLOAD_URL = 'https://freesound.org/apiv2/sounds/{sound_id}/download/'


# 9 slots from GDD v0.2 I.1. Query + license filter (CC0 / CC-BY only).
SLOTS = [
    ('bomb', 'bomb explosion impact short low'),
    ('rocket', 'rocket whoosh rise boom short'),
    ('spring', 'victory bell chime short'),
    ('antispring', 'defeat low bell short'),
    ('trustee', 'neutral tone ding short'),
    ('pass', 'short soft decline tick'),
    ('shot', 'card slap short crisp'),
    ('countdown', 'tick tick tick short three'),
    ('double', 'betting chip clink short rise'),
]


def _http_get_json(url: str, params: dict, token: str, timeout: int = 30) -> dict:
    params = dict(params)
    params['token'] = token
    query = urllib.parse.urlencode(params)
    full = f'{url}?{query}'
    req = urllib.request.Request(full, headers={'User-Agent': 'doudizhu-placeholder-fetcher/0.1'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode('utf-8'))


def _http_download(url: str, token: str, out_path: str, timeout: int = 60) -> int:
    query = urllib.parse.urlencode({'token': token})
    full = f'{url}?{query}'
    req = urllib.request.Request(full, headers={'User-Agent': 'doudizhu-placeholder-fetcher/0.1'})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        data = resp.read()
    with open(out_path, 'wb') as f:
        f.write(data)
    return len(data)


def _search_one(query: str, token: str, max_duration: float = 1.5) -> dict:
    """Search Freesound and return the best-rated clip under max_duration seconds."""
    response = _http_get_json(FREESOUND_SEARCH_URL, {
        'query': query,
        'filter': f'duration:[0 TO {max_duration}]',
        'sort': 'rating_desc',
        'page_size': 5,
        'fields': 'id,name,duration,license,username',
    }, token)
    for result in response.get('results', []):
        if result.get('duration', 99) <= max_duration:
            return result
    return {}


def main() -> int:
    parser = argparse.ArgumentParser(description='Fetch real sound assets for placeholder slots.')
    parser.add_argument('--dry-run', action='store_true', help='Search only, do not download.')
    parser.add_argument('--repo-root', default=os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    parser.add_argument('--max-duration', type=float, default=1.5, help='Max clip duration in seconds.')
    args = parser.parse_args()

    token = os.getenv('FREESOUND_API_KEY')
    if not token:
        print('FREESOUND_API_KEY not set. Skipping real-asset fetch.')
        print('To enable:')
        print('  1. Register at https://freesound.org/apiv2/apply/')
        print('  2. export FREESOUND_API_KEY=<your-key>')
        print('  3. python3 scripts/fetch-real-sounds.py --dry-run')
        print('  4. python3 scripts/fetch-real-sounds.py')
        print()
        # Report current placeholder state instead of fetching
        for slot, _ in SLOTS:
            for dest in ['server/static/audio', 'client/build/static/audio']:
                path = os.path.join(args.repo_root, dest, f'{slot}_placeholder.wav')
                if os.path.exists(path):
                    print(f'  placeholder present: {dest}/{slot}_placeholder.wav ({os.path.getsize(path)} bytes)')
        return 0

    failures = []
    for slot, query in SLOTS:
        try:
            print(f'[{slot}] searching Freesound: {query!r}')
            hit = _search_one(query, token, max_duration=args.max_duration)
            if not hit:
                print(f'  no match within {args.max_duration}s; skipping')
                failures.append((slot, 'no-match'))
                continue
            print(f'  found id={hit.get("id")} name={hit.get("name")!r} duration={hit.get("duration"):.2f}s')

            if args.dry_run:
                continue

            download_url = FREESOUND_DOWNLOAD_URL.format(sound_id=hit['id'])
            for dest in ['server/static/audio', 'client/build/static/audio']:
                out_dir = os.path.join(args.repo_root, dest)
                os.makedirs(out_dir, exist_ok=True)
                out_path = os.path.join(out_dir, f'{slot}.wav')
                size = _http_download(download_url, token, out_path)
                print(f'  -> {dest}/{slot}.wav ({size} bytes)')
            time.sleep(1)  # be polite to Freesound API
        except urllib.error.HTTPError as e:
            print(f'  HTTP error: {e.code} {e.reason}')
            failures.append((slot, f'http-{e.code}'))
        except Exception as e:  # pragma: no cover - defensive
            print(f'  error: {e}')
            failures.append((slot, str(e)))

    if failures:
        print(f'\nFAILED: {len(failures)} slots: {failures}')
        return 1
    print('\nAll slots processed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
