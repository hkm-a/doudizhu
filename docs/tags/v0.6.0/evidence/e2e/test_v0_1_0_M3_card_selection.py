from godot_e2e import expect

from dz_helpers import call_landlord, root


def test_v0_1_0_m3_card_click_selects_hand_card(game):
    call_landlord(game)
    game.locator(name="PlayerHand").locator(name="Card_*").first().click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_selected_count") == 1,
        description="clicking a card toggles selected state",
    )

