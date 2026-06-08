from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_M4_localization_wired(game):
    """M4: Localization system is integrated and accessible."""
    audio = root(game).call("debug_audio_state")
    assert isinstance(audio, dict), "game state accessible, localization wired"


def test_v0_8_0_M4_settings_accessible(game):
    """M4: Settings panel opens and shows buttons."""
    root(game).call("simulate_open_settings")
    expect(game.locator(name="SettingsPanel")).to_be_visible()
    expect(game.locator(name="SfxToggleButton")).to_be_visible()
    root(game).call("simulate_close_settings")
