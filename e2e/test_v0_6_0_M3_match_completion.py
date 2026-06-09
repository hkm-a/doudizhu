from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def _finish_player_landlord_hand(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="result banner is visible after human win",
    )


def test_v0_6_0_m3_match_completion_and_new_match_reset(game):
    for hand_index in range(3):
        _finish_player_landlord_hand(game)
        if hand_index < 2:
            root(game).call("simulate_new_hand")
            game.wait_physics_frames(10)

    expect(game.locator(name="ResultText")).to_satisfy(
        lambda node: "Match winner: Player" in text(node),
        description="match winner appears after the short match completes",
    )
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_score_state")["match_complete"] is True
        and node.call("debug_score_state")["hands_played"] == 3,
        description="match completion state is observable",
    )

    root(game).call("simulate_result_new_match")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_score_state")["totals"] == [0, 0, 0]
        and node.call("debug_score_state")["hands_played"] == 0,
        description="new match clears cumulative scoring state",
    )
    expect(game.locator(name="ScoreboardText")).to_satisfy(
        lambda node: "Hand 0/3" in text(node),
        description="scoreboard shows fresh match state",
    )
