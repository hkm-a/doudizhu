from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def test_v0_6_0_m1_hand_scoring_delta_is_visible(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")

    expect(game.locator(name="ResultBanner")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="result banner is visible after human win",
    )
    expect(game.locator(name="ResultText")).to_satisfy(
        lambda node: "Delta H:+2 L:-1 R:-1" in text(node)
        and "Scores H:+2 L:-1 R:-1" in text(node),
        description="hand result shows score delta and cumulative totals",
    )
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_score_state")["totals"] == [2, -1, -1]
        and node.call("debug_score_state")["hands_played"] == 1,
        description="score state applies landlord win once",
    )
