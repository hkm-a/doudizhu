class_name TestScoreState
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")


func test_landlord_win_delta_and_totals() -> void:
	var score := ScoreState.new()
	var result := score.apply_hand_result("landlord", ScoreState.HUMAN, "h1")
	assert_that(result.applied).is_equal(true)
	assert_that(score.debug_state().last_delta).is_equal([2, -1, -1])
	assert_that(score.debug_state().totals).is_equal([2, -1, -1])
	assert_that(score.debug_state().hands_played).is_equal(1)


func test_farmer_win_delta_and_totals() -> void:
	var score := ScoreState.new()
	score.apply_hand_result("farmers", ScoreState.AI_LEFT, "h1")
	assert_that(score.debug_state().last_delta).is_equal([1, -2, 1])
	assert_that(score.debug_state().totals).is_equal([1, -2, 1])


func test_cumulative_match_completion_by_hand_cap() -> void:
	var score := ScoreState.new()
	score.configure(10, 2)
	score.apply_hand_result("farmers", ScoreState.AI_LEFT, "h1")
	assert_that(score.debug_state().match_complete).is_equal(false)
	score.apply_hand_result("landlord", ScoreState.HUMAN, "h2")
	var state := score.debug_state()
	assert_that(state.hands_played).is_equal(2)
	assert_that(state.match_complete).is_equal(true)
	assert_that(state.match_winner).is_equal("Player")


func test_match_completion_by_target_score() -> void:
	var score := ScoreState.new()
	score.configure(2, 5)
	score.apply_hand_result("landlord", ScoreState.AI_RIGHT, "h1")
	var state := score.debug_state()
	assert_that(state.match_complete).is_equal(true)
	assert_that(state.match_winner).is_equal("AI Right")

func test_negative_score_alone_does_not_end_match_by_target() -> void:
	var score := ScoreState.new()
	score.configure(2, 5)
	score.apply_hand_result("farmers", ScoreState.AI_LEFT, "h1")
	var state := score.debug_state()
	assert_that(state.totals).is_equal([1, -2, 1])
	assert_that(state.match_complete).is_equal(false)

func test_new_hand_preserves_totals_and_new_match_clears_all() -> void:
	var score := ScoreState.new()
	score.apply_hand_result("landlord", ScoreState.HUMAN, "h1")
	score.start_new_hand()
	assert_that(score.debug_state().totals).is_equal([2, -1, -1])
	assert_that(score.debug_state().last_delta).is_equal([0, 0, 0])
	score.reset_match()
	var state := score.debug_state()
	assert_that(state.totals).is_equal([0, 0, 0])
	assert_that(state.last_delta).is_equal([0, 0, 0])
	assert_that(state.hands_played).is_equal(0)
	assert_that(state.match_complete).is_equal(false)


func test_duplicate_result_key_applies_once() -> void:
	var score := ScoreState.new()
	var first := score.apply_hand_result("landlord", ScoreState.HUMAN, "same")
	var second := score.apply_hand_result("landlord", ScoreState.HUMAN, "same")
	assert_that(first.applied).is_equal(true)
	assert_that(second.applied).is_equal(false)
	assert_that(score.debug_state().totals).is_equal([2, -1, -1])
	assert_that(score.debug_state().hands_played).is_equal(1)


func test_game_result_summary_exposes_scoring_inputs() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.resolve_landlord(true)
	game.force_finish_for_human_win()
	var summary := game.result_summary()
	assert_that(summary.winner_side).is_equal("landlord")
	assert_that(summary.landlord_seat).is_equal(DoudizhuGame.HUMAN)
	assert_that(summary.winner_seat).is_equal(DoudizhuGame.HUMAN)
	assert_that(String(summary.result_key).begins_with("hand_1_landlord_0")).is_equal(true)


func test_main_simulate_result_score_and_reset_boundaries() -> void:
	var main = auto_free(MainScript.new())
	main._ready()
	main.game.resolve_landlord(true)
	main.game.force_finish_for_human_win()
	var first: Dictionary = main.simulate_apply_result_score()
	var duplicate: Dictionary = main.simulate_apply_result_score()
	assert_that(first.applied).is_equal(true)
	assert_that(duplicate.applied).is_equal(false)
	assert_that(main.debug_score_state().totals).is_equal([2, -1, -1])
	assert_that(main.debug_result_text().contains("Delta H:+2 L:-1 R:-1")).is_equal(true)
	main.simulate_new_hand()
	assert_that(main.debug_score_state().totals).is_equal([2, -1, -1])
	main.simulate_new_match()
	assert_that(main.debug_score_state().totals).is_equal([0, 0, 0])
	assert_that(main.debug_scoreboard_text().contains("Hand 0/3")).is_equal(true)


func test_settings_modal_children_are_focusable_only_when_visible() -> void:
	var main = auto_free(MainScript.new())
	main._ready()

	assert_that(main.debug_settings_visible()).is_equal(false)
	for focus_mode in main.debug_settings_focus_modes().values():
		assert_that(focus_mode).is_equal(Control.FOCUS_NONE)

	main.simulate_open_settings()
	assert_that(main.debug_settings_visible()).is_equal(true)
	for focus_mode in main.debug_settings_focus_modes().values():
		assert_that(focus_mode).is_equal(Control.FOCUS_ALL)

	main.simulate_close_settings()
	assert_that(main.debug_settings_visible()).is_equal(false)
	for focus_mode in main.debug_settings_focus_modes().values():
		assert_that(focus_mode).is_equal(Control.FOCUS_NONE)


func test_result_banner_compact_score_layout_fits_supported_desktop_sizes() -> void:
	var main = auto_free(MainScript.new())
	main._ready()
	main.score_state.configure(2, 5)
	main.game.resolve_landlord(true)
	main.game.force_finish_for_human_win()
	main.simulate_apply_result_score()
	var lines: Array = main.debug_result_text().split("\n")
	assert_that(lines.size()).is_greater_equal(1)

	for viewport_size in [Vector2(1280, 720), Vector2(1366, 768), Vector2(1600, 900)]:
		var snapshot: Dictionary = main.debug_layout_snapshot_for_viewport(viewport_size)
		var result_rect: Rect2 = snapshot.result_rect
		var hand_rect: Rect2 = snapshot.hand_rect
		var scale: float = snapshot.scale
		var required_height := (164.0 + 42.0 + 10.0 + 36.0) * scale
		var three_button_width := ((132.0 * 3.0) + (10.0 * 2.0)) * scale
		var readable_width := result_rect.size.x - (36.0 * scale)
		assert_that(result_rect.size.y + 0.01 >= required_height).is_equal(true)
		assert_that(readable_width + 0.01 >= three_button_width).is_equal(true)
		assert_that(result_rect.position.y + result_rect.size.y <= hand_rect.position.y).is_equal(true)

