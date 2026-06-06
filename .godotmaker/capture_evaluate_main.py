import os
from godot_e2e import GodotE2E

PROJECT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
CONFIG = os.path.join(PROJECT, '.agents', 'godotmaker.yaml')
GODOT = None
with open(CONFIG, 'r', encoding='utf-8') as handle:
    for line in handle:
        line = line.split('#', 1)[0].strip()
        if line.startswith('godot_path:'):
            GODOT = line.split(':', 1)[1].strip().strip('"\'')
            break
out_dir = os.path.join(PROJECT, 'e2e', 'screenshots')
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, 'scene_main_v0_6_0.png')
with GodotE2E.launch(PROJECT, godot_path=GODOT, timeout=15.0) as game:
    game.wait_for_node('/root/Main', timeout=10.0)
    game.wait_seconds(0.5)
    result = game.screenshot(save_path=out_path)
    print(result)
