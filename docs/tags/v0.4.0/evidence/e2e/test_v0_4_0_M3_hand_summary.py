from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, root


def test_v0_4_0_m3_hand_summary_updates_after_play(game):
    initial_summary = root(game).call("debug_hand_summary_text")
    assert "Hand: 17 cards" in initial_summary

    call_landlord(game)
    hint_then_play(game)

    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_hand_summary_text") != initial_summary,
        description="hand summary changes after the player plays cards",
    )
    expect(game.locator(name="HandSummary")).to_satisfy(
        lambda node: "pairs" in node.get_property("text") and "chains" in node.get_property("text"),
        description="hand summary label remains visible with count groups and opportunities",
    )
