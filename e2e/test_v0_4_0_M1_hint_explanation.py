from godot_e2e import expect

from dz_helpers import root, text


def test_v0_4_0_m1_hint_explains_low_cost_legal_play(game):
    root(game).call("debug_configure_expanded_rule_fixture")

    root(game).call("simulate_hint")

    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_selected_count") == 5,
        description="hint selects the legal straight response",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: text(node).startswith("Hint:") and "straight" in text(node).lower(),
        description="hint status names the selected play type and rationale",
    )
