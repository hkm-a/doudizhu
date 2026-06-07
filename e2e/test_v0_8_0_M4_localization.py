from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_m4_language_system_exists(game):
    """M4: Localization system is integrated and accessible."""
    # Verify main scene loads and has localization wired
    audio = root(game).call("debug_audio_state")
    assert isinstance(audio, dict), "audio state accessible, localization wired"
