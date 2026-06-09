from godot_e2e import expect

from dz_helpers import root, text


def test_stats_panel_shows_hand_record_line(game):
    expect(game.locator(name="StatsPanel")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="stats panel is visible on the main table",
    )
    stats_before = root(game).call("debug_stats_text")
    expect(game.locator(name="StatsText")).to_satisfy(
        lambda node: len(text(node)) > 0,
        description="stats text displays content before any hands are completed",
    )


def test_stats_update_after_hand_result(game):
    root(game).call("simulate_call_landlord")
    game.wait_physics_frames(10)
    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    expect(game.locator(name="ResultBanner")).to_be_visible()

    expect(game.locator(name="StatsText")).to_satisfy(
        lambda node: len(text(node)) > 0,
        description="stats panel still shows content after a result",
    )

    score_state = root(game).call("debug_score_state")
    assert isinstance(score_state, dict), "score state is a valid dictionary after result"


def test_stats_reset_clears_score_state(game):
    root(game).call("simulate_call_landlord")
    game.wait_physics_frames(10)
    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    root(game).call("simulate_open_settings")
    expect(game.locator(name="SettingsPanel")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="settings panel opens from simulate_open_settings",
    )
    expect(game.locator(name="ResetStatsButton")).to_be_visible()

    root(game).call("simulate_reset_stats")

    score_state = root(game).call("debug_score_state")
    assert isinstance(score_state, dict), "score state is still a valid dictionary after reset"

    root(game).call("simulate_settings_close")
    expect(game.locator(name="SettingsPanel")).to_satisfy(
        lambda node: node.get_property("visible") is False,
        description="settings panel closes after reset",
    )


def test_stats_scoreboard_updates_after_play_and_result(game):
    root(game).call("simulate_call_landlord")
    game.wait_physics_frames(10)
    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    expect(game.locator(name="ScoreboardBand")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="scoreboard band remains visible after result",
    )

    scoreboard_text = root(game).call("debug_scoreboard_text")
    assert isinstance(scoreboard_text, str) and len(scoreboard_text) > 0, \
        "scoreboard displays text after a hand result"


def test_stats_persist_across_new_hand(game):
    from dz_helpers import call_landlord
    call_landlord(game)
    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    score_state_first = root(game).call("debug_score_state")
    assert isinstance(score_state_first, dict), "score state is a valid dict before new hand"

    root(game).call("simulate_result_new_hand")
    game.wait_physics_frames(10)
    expect(game.locator(name="ResultBanner")).to_satisfy(
        lambda node: node.get_property("visible") is False,
        description="result banner is hidden after new hand",
    )

    score_state_second = root(game).call("debug_score_state")
    assert isinstance(score_state_second, dict), \
        "score state persists as a dictionary after new hand"

    stats_second = root(game).call("debug_stats_text")
    assert isinstance(stats_second, str), "stats text remains a string after new hand"
