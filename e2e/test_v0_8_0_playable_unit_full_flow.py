from godot_e2e import expect

from dz_helpers import root, text


def test_v0_8_0_playable_unit_full_flow(game):
    """Playable unit: launch, settings, difficulty, query game state, result."""
    # Settings + difficulty button
    root(game).call("simulate_open_settings")
    expect(game.locator(name="SettingsPanel")).to_be_visible()
    expect(game.locator(name="AIDifficultyButton")).to_be_visible()
    root(game).call("simulate_close_settings")

    # Verify game state is queryable
    card_rects = root(game).call("debug_visible_hand_card_rects")
    assert isinstance(card_rects, list), "card rects accessible"

    # Verify animation system
    progress = root(game).call("get_animation_progress")
    assert isinstance(progress, dict), "animation system exists"

    # Verify result text is queryable
    result = root(game).call("debug_result_text")
    assert isinstance(result, str), "result text is string"

    # Verify score state
    score = root(game).call("debug_score_state")
    assert isinstance(score, dict), "score state is dict"
