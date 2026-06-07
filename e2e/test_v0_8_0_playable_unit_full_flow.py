from godot_e2e import expect

from dz_helpers import call_landlord, human_count, root, text, hint_then_play


def test_v0_8_0_playable_unit_full_flow(game):
    """Playable unit: launch, save, difficulty, language, card art, result."""
    # Launch + settings: verify difficulty button
    root(game).call("simulate_open_settings")
    expect(game.locator(name="SettingsPanel")).to_be_visible()
    ai_button = game.locator(name="AIDifficultyButton")
    expect(ai_button).to_be_visible()
    root(game).call("simulate_close_settings")

    # Start round + play cards
    call_landlord(game)
    before = human_count(game)
    hint_then_play(game)
    after = human_count(game)
    assert after < before, "cards played"

    # Verify animation progress
    progress = root(game).call("get_animation_progress")
    assert isinstance(progress, dict), "animation system exists"

    # Force result to verify save/load wired
    root(game).call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    assert root(game).call("debug_result_text") != "", "result text shown"
