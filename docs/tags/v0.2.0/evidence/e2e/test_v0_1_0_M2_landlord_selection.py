from godot_e2e import expect

from dz_helpers import call_landlord, human_count, text


def test_v0_1_0_m2_landlord_selection_updates_roles(game):
    call_landlord(game)
    assert human_count(game) == 20
    expect(game.locator(name="AILeftPanel").locator(name="Role")).to_have_text("Role: farmer")
    expect(game.locator(name="AIRightPanel").locator(name="Role")).to_have_text("Role: farmer")
    expect(game.locator(name="BottomCards").locator(name="Card_*")).to_satisfy(
        lambda node: node.count() == 3,
        description="bottom cards reveal after landlord assignment",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Player is landlord" in text(node),
        description="status identifies the landlord",
    )

