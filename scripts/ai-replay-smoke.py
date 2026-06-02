import json
import sys

from ai.replay import run_fixed_replay


def main() -> None:
    result = run_fixed_replay()
    payload = {
        'winner_seat': result.winner_seat,
        'winner_uid': result.winner_uid,
        'landlord_seat': result.landlord_seat,
        'bottom_pokers': result.bottom_pokers,
        'turns': len(result.steps),
    }
    if '--verbose' in sys.argv:
        payload['shot_round'] = result.shot_round
    print(json.dumps(payload, ensure_ascii=False, sort_keys=True))


if __name__ == '__main__':
    main()
