from godot_e2e import expect

from dz_helpers import root


def test_v0_4_0_m4_help_modal_opens_and_closes(game):
    game.locator(name="HelpButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is True,
        description="help modal opens from the action bar",
    )
    expect(game.locator(name="HelpText")).to_satisfy(
        lambda node: "Supported:" in node.get_property("text") and "Hint selects" in node.get_property("text"),
        description="help text explains supported rules and hint behavior",
    )

    game.locator(name="HelpCloseButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is False,
        description="help modal closes from its close button",
    )
