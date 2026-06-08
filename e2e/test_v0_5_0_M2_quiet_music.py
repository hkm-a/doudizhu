from godot_e2e import expect

from dz_helpers import root


def test_v0_5_0_m2_music_toggle_updates_audio_state(game):
    root(game).call("simulate_open_settings")
    root(game).call("simulate_music_toggle")

    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_audio_state")["music_enabled"] is True
        and "music_on" in node.call("debug_audio_state")["event_history"],
        description="music toggle enables quiet music state",
    )

    root(game).call("simulate_music_toggle")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_audio_state")["music_enabled"] is False,
        description="music toggle disables quiet music state",
    )
