from godot_e2e import expect

from dz_helpers import call_landlord, root, text


def test_v0_5_0_m4_result_restart_and_quit_affordances(game):
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    expect(game.locator(name="QuitButton")).to_be_visible()

    game.locator(name="QuitButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_quit_requested") is True,
        description="quit affordance records a safe quit request state",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Quit requested" in text(node),
        description="quit request is visible to the player",
    )

    game.locator(name="ResultNewRoundButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_quit_requested") is False,
        description="new round clears quit request state",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "Call landlord" in text(node),
        description="restart returns to landlord phase cleanly",
    )