from godot_e2e import expect

from dz_helpers import call_landlord, root, text


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


def test_v0_6_0_m4_score_ui_and_settings_focus_stay_readable(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultText")).to_satisfy(
        lambda node: "Delta" in text(node) and "Scores" in text(node),
        description="result score summary is visible",
    )
    snapshot = root(game).call("debug_layout_snapshot")
    result = _rect(snapshot, "result_rect")
    hand = _rect(snapshot, "hand_rect")
    result_actions = _rect(snapshot, "result_actions_rect")
    assert result["bottom"] <= hand["y"]
    assert result_actions["right"] <= result["right"]

    game.locator(name="ResultNewHandButton").click()
    expect(game.locator(name="ScoreboardText")).to_satisfy(
        lambda node: "Scores" in text(node) and "Hand 1/3" in text(node),
        description="scoreboard is readable during normal play",
    )

    expect(root(game)).to_satisfy(
        lambda node: all(value == 0 for value in node.call("debug_settings_focus_modes").values()),
        description="hidden settings buttons are not focusable",
    )
    game.locator(name="SettingsButton").click()
    expect(root(game)).to_satisfy(
        lambda node: all(value != 0 for value in node.call("debug_settings_focus_modes").values()),
        description="visible settings buttons are focusable",
    )
