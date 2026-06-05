from godot_e2e import expect

from dz_helpers import human_count, text


def test_v0_1_0_m1_round_setup_visible(game):
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="landlord prompt is visible on launch",
    )
    expect(game.locator(name="AILeftPanel").locator(name="Count")).to_have_text("Cards: 17")
    expect(game.locator(name="AIRightPanel").locator(name="Count")).to_have_text("Cards: 17")
    expect(game.locator(text="?")).to_satisfy(
        lambda node: node.count() == 3,
        description="three bottom-card placeholders are visible",
    )
    assert human_count(game) == 17
