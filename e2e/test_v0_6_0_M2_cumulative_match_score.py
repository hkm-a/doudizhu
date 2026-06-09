from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def test_v0_6_0_m2_new_hand_preserves_cumulative_scores(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_score_state")["totals"] == [2, -1, -1],
        description="first hand score is applied",
    )

    root(game).call("simulate_result_new_hand")
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="new hand returns to landlord phase",
    )
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_score_state")["totals"] == [2, -1, -1]
        and node.call("debug_score_state")["last_delta"] == [0, 0, 0],
        description="new hand preserves totals and clears only last delta",
    )
    expect(game.locator(name="ScoreboardText")).to_satisfy(
        lambda node: "Scores H:+2 L:-1 R:-1" in text(node),
        description="scoreboard keeps cumulative scores during next hand",
    )
