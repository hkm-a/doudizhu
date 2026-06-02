import argparse
import json
import sys

from ai.replay import ReplayError, ReplaySkipped, build_douzero_replay_policy, run_fixed_replay


def main() -> int:
    parser = argparse.ArgumentParser(description='Run the fixed replay with real DouZero checkpoints.')
    parser.add_argument('--require', action='store_true', help='Exit non-zero when DouZero is unavailable.')
    parser.add_argument('--verbose', action='store_true', help='Include the full shot_round in the JSON output.')
    args = parser.parse_args()

    try:
        policy = build_douzero_replay_policy()
    except ReplaySkipped as exc:
        print(json.dumps({'status': 'skipped', 'reason': str(exc)}, ensure_ascii=False, sort_keys=True))
        return 2 if args.require else 0

    try:
        result = run_fixed_replay(policy=policy)
    except ReplayError as exc:
        print(json.dumps({'status': 'failed', 'reason': str(exc)}, ensure_ascii=False, sort_keys=True))
        return 1

    payload = {
        'status': 'passed',
        'winner_seat': result.winner_seat,
        'winner_uid': result.winner_uid,
        'landlord_seat': result.landlord_seat,
        'bottom_pokers': result.bottom_pokers,
        'turns': len(result.steps),
    }
    if args.verbose:
        payload['shot_round'] = result.shot_round
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))
    return 0


if __name__ == '__main__':
    sys.exit(main())
