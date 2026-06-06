from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, root


def test_v0_4_0_m2_ai_turn_records_visible_reason(game):
    call_landlord(game)
    hint_then_play(game)

    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_ai_reason", [1]) != "" or node.call("debug_ai_reason", [2]) != "",
        description="at least one AI turn records a readable reason after responding",
    )
    expect(game.locator(text="Why: *").first()).to_be_visible()
