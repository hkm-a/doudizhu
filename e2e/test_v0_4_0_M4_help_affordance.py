from godot_e2e import expect

from dz_helpers import root


def test_v0_4_0_m4_help_modal_opens_and_closes(game):
    root(game).call("simulate_shortcut", ["KEY_F1"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is True,
        description="help modal opens via shortcut",
    )
