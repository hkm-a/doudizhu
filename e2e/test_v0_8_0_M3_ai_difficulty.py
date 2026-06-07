from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_m3_ai_difficulty_button_exists(game):
    """M3: Settings panel has AI difficulty selector button."""
    root(game).call("simulate_open_settings")
    expect(game.locator(name="SettingsPanel")).to_be_visible()
    ai_button = game.locator(name="AIDifficultyButton")
    expect(ai_button).to_be_visible()
    root(game).call("simulate_close_settings")
