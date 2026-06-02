import argparse
import json
import os
import sys

from ai.decision_summary import format_summary_html, format_summary_text, summarize_decision_log


def main() -> int:
    parser = argparse.ArgumentParser(description='Summarize AI decision JSONL logs.')
    parser.add_argument('path', nargs='?', default=os.getenv('AI_DECISION_LOG_PATH'))
    parser.add_argument('--text', action='store_true', help='Print a human-readable summary instead of JSON.')
    parser.add_argument('--html', action='store_true', help='Print a self-contained HTML report.')
    parser.add_argument('--output', help='Write the summary/report to this file instead of stdout.')
    args = parser.parse_args()

    if not args.path:
        parser.error('path is required, or set AI_DECISION_LOG_PATH')

    summary = summarize_decision_log(args.path)
    if args.html:
        payload = format_summary_html(summary)
    elif args.text:
        payload = format_summary_text(summary)
    else:
        payload = json.dumps(summary.to_dict(), ensure_ascii=False, sort_keys=True)

    if args.output:
        output_dir = os.path.dirname(os.path.abspath(args.output))
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
        with open(args.output, 'w', encoding='utf-8') as output_file:
            output_file.write(payload)
            output_file.write('\n')
    else:
        print(payload)
    return 0


if __name__ == '__main__':
    sys.exit(main())
