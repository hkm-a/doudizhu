from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, root, text


def test_v0_1_0_playable_unit_full_loop(game):
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="launch starts a hand in landlord phase",
    )
    call_landlord(game)
    root(game).call("simulate_toggle_card_index", [0])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_selected_count") == 1,
        description="player can select a card",
    )
    hint_then_play(game)
    root(game).call("simulate_pass")
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: text(node) != "",
        description="pass/hint/play flow keeps status observable",
    )
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    root(game).call("simulate_result_new_hand")
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="replay starts another hand",
    )

