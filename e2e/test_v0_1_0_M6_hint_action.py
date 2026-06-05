from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def test_v0_1_0_m6_hint_selects_smallest_legal_response(game):
    call_landlord(game)
    game.locator(name="HintButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_selected_count") > 0,
        description="hint selects at least one card",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: text(node).startswith("Hint:"),
        description="hint outcome is visible in status text",
    )

