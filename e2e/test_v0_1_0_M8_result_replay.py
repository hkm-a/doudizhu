from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def test_v0_1_0_m8_result_banner_and_replay(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    expect(game.locator(name="ResultText")).to_satisfy(
        lambda node: "win" in text(node).lower(),
        description="result banner names a winner side",
    )
    game.locator(name="ResultNewHandButton").click()
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="new round returns to landlord phase",
    )


