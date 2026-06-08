from godot_e2e import expect

from dz_helpers import root, text


def test_v0_5_0_m3_audio_settings_apply_immediately(game):
    root(game).call("simulate_open_settings")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_settings_visible") is True,
        description="audio settings panel opens",
    )
    expect(game.locator(name="SettingsText")).to_satisfy(
        lambda node: "Audio settings" in text(node),
        description="settings panel explains immediate audio changes",
    )

    root(game).call("simulate_sfx_toggle")
    root(game).call("simulate_volume_toggle")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_audio_state")["sfx_enabled"] is False
        and node.call("debug_audio_state")["volume_preset"] == "quiet",
        description="sfx and volume settings update immediately",
    )

    root(game).call("simulate_close_settings")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_settings_visible") is False,
        description="audio settings panel closes",
    )
