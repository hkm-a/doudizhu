from godot_e2e import GodotE2E, expect

from conftest import GODOT_PATH, GODOT_PROJECT
from dz_helpers import call_landlord


def _rect(snapshot, name):
    rect = snapshot[name]
    return {
        "x": rect.x,
        "y": rect.y,
        "w": rect.w,
        "h": rect.h,
        "right": rect.x + rect.w,
        "bottom": rect.y + rect.h,
    }


def _assert_table_layout(root):
    snapshot = root.call("debug_layout_snapshot")
    viewport = snapshot["viewport"]
    trick = _rect(snapshot, "trick_rect")
    status = _rect(snapshot, "status_rect")
    action = _rect(snapshot, "action_rect")
    hand = _rect(snapshot, "hand_rect")
    ai_left = _rect(snapshot, "ai_left_rect")
    ai_right = _rect(snapshot, "ai_right_rect")

    assert ai_left["bottom"] < hand["y"]
    assert ai_right["bottom"] < hand["y"]
    assert trick["bottom"] < status["y"]
    assert status["bottom"] < action["y"]
    assert action["bottom"] < hand["y"]
    assert hand["right"] <= viewport.x
    assert hand["bottom"] <= viewport.y


def test_v0_3_0_m2_common_desktop_resolutions_keep_layout_clear():
    for resolution in ["1280x720", "1366x768", "1600x900"]:
        with GodotE2E.launch(
            GODOT_PROJECT,
            godot_path=GODOT_PATH,
            timeout=15.0,
            extra_args=["--windowed", "--resolution", resolution],
        ) as game:
            game.wait_for_node("/root/Main", timeout=10.0)
            _assert_table_layout(game.locator(path="/root/Main"))


def test_v0_3_0_m2_result_banner_is_centered_and_clear(game):
    root = game.locator(path="/root/Main")
    call_landlord(game)
    root.call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    assert not game.locator(name="TrickPanel").is_visible()
    snapshot = root.call("debug_layout_snapshot")
    viewport = snapshot["viewport"]
    result = _rect(snapshot, "result_rect")
    hand = _rect(snapshot, "hand_rect")

    assert result["x"] > 0
    assert result["y"] > 0
    assert result["right"] < viewport.x
    assert result["bottom"] < hand["y"]
    assert abs((result["x"] + result["w"] * 0.5) - viewport.x * 0.5) < 4.0
