from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_M7_audio_system_exists(game):
    """M7: Audio system is integrated and queryable."""
    state = root(game).call("debug_audio_state")
    assert isinstance(state, dict), "audio state is dict"
    assert "sfx_enabled" in state, "sfx_enabled field present"
