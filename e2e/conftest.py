import os

import pytest
from godot_e2e import GodotE2E

GODOT_PROJECT = os.path.join(os.path.dirname(__file__), "..")
GODOT_CONFIG = os.path.join(GODOT_PROJECT, ".agents", "godotmaker.yaml")


def _read_godot_path():
    try:
        with open(GODOT_CONFIG, "r", encoding="utf-8") as f:
            for line in f:
                line = line.split("#", 1)[0].strip()
                if line.startswith("godot_path:"):
                    value = line.split(":", 1)[1].strip().strip("\"'")
                    return value or None
    except OSError:
        return None
    return None


GODOT_PATH = _read_godot_path()


@pytest.fixture(scope="module")
def _game_process():
    with GodotE2E.launch(
        GODOT_PROJECT,
        godot_path=GODOT_PATH,
        timeout=15.0,
    ) as game:
        game.wait_for_node("/root/Main", timeout=10.0)
        yield game


@pytest.fixture(scope="function")
def game(_game_process):
    _game_process.reload_scene()
    _game_process.wait_for_node("/root/Main", timeout=5.0)
    # Clean save file and ensure game is in fresh state
    from dz_helpers import root
    root(_game_process).call("debug_clear_save")
    _game_process.wait_physics_frames(5)
    yield _game_process
