from godot_e2e import expect

from dz_helpers import human_count, root, text


def test_v0_2_0_m1_hint_and_play_follow_straight(game):
    root(game).call("debug_configure_expanded_rule_fixture")
    before = human_count(game)

    game.locator(name="HintButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_selected_count") == 5,
        description="hint selects the five-card straight response",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: text(node).startswith("Hint:"),
        description="hint status is visible",
    )

    game.locator(name="PlayButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_human_card_count") == before - 5,
        description="playing the selected straight reduces the hand",
    )
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_active_trick_type") == "straight",
        description="the active trick records the expanded straight type",
    )
