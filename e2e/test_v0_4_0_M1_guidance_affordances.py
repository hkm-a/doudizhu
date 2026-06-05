from godot_e2e import expect

from dz_helpers import root


def test_v0_4_0_m1_help_modal_opens_and_closes(game):
    game.locator(name="HelpButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is True,
        description="help modal opens from the action bar",
    )

    game.locator(name="HelpCloseButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is False,
        description="help modal closes from its close button",
    )
