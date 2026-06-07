extends GdUnitTestSuite

const SaveLoadUtilsScript := preload("res://src/utils/save_load_utils.gd")


func test_save_file_operations_delete_nonexistent() -> void:
	assert_that(SaveLoadUtilsScript.save_exists()).is_equal(false)
	var del_ok: bool = SaveLoadUtilsScript.delete_save()
	assert_that(del_ok).is_equal(true)
	assert_that(SaveLoadUtilsScript.save_exists()).is_equal(false)


func test_load_game_returns_empty_when_no_save() -> void:
	SaveLoadUtilsScript.delete_save()
	var loaded: Dictionary = SaveLoadUtilsScript.load_game()
	assert_that(loaded.is_empty()).is_equal(true)


func test_load_into_score_restores_state() -> void:
	var score := ScoreState.new()
	score.apply_hand_result("landlord", ScoreState.HUMAN, "test_key")

	var save_data: Dictionary = {
		"cumulative_score": [2, -1, -1],
		"last_delta": [2, -1, -1],
		"hand_wins": [1, 0, 0],
		"hand_losses": [0, 1, 1],
		"hands_played": 1,
		"match_complete": false,
		"match_winner": "",
		"match_winner_seat": -1,
		"match_winner_score": 0,
		"target_score": 6,
		"hand_count_cap": 3,
		"stats_hands_completed": 1,
		"stats_matches_completed": 0,
		"stats_player_side_wins": 1,
		"stats_landlord_side_wins": 1,
		"stats_farmer_side_wins": 0,
		"stats_best_player_score": 2,
	}

	SaveLoadUtilsScript.load_into_score(score, save_data)

	assert_that(score.totals).is_equal([2, -1, -1])
	assert_that(score.last_delta).is_equal([2, -1, -1])
	assert_that(score.hands_played).is_equal(1)
	assert_that(score.match_complete).is_equal(false)
	assert_that(score.stats_player_side_wins).is_equal(1)


func test_load_into_score_restores_match_complete() -> void:
	var score := ScoreState.new()

	var save_data: Dictionary = {
		"cumulative_score": [6, 0, 0],
		"last_delta": [2, -1, -1],
		"hand_wins": [2, 0, 0],
		"hand_losses": [0, 1, 2],
		"hands_played": 3,
		"match_complete": true,
		"match_winner": "Player",
		"match_winner_seat": 0,
		"match_winner_score": 6,
		"target_score": 6,
		"hand_count_cap": 3,
		"stats_hands_completed": 3,
		"stats_matches_completed": 1,
		"stats_player_side_wins": 2,
		"stats_landlord_side_wins": 1,
		"stats_farmer_side_wins": 0,
		"stats_best_player_score": 6,
	}

	SaveLoadUtilsScript.load_into_score(score, save_data)

	assert_that(score.match_complete).is_equal(true)
	assert_that(score.match_winner).is_equal("Player")
	assert_that(score.match_winner_seat).is_equal(0)
	assert_that(score.match_winner_score).is_equal(6)
	assert_that(score.stats_matches_completed).is_equal(1)


func test_load_into_audio_restores_settings() -> void:
	var audio := AudioController.new()
	audio.name = "AudioController"

	var settings_data: Dictionary = {
		"sfx_enabled": false,
		"music_enabled": true,
		"volume_preset": "quiet",
	}

	SaveLoadUtilsScript.load_into_audio(audio, settings_data)

	assert_that(audio.sfx_enabled).is_equal(false)
	assert_that(audio.music_enabled).is_equal(true)
	assert_that(audio.volume_preset).is_equal("quiet")

	audio.queue_free()


func test_load_into_audio_defaults() -> void:
	var audio := AudioController.new()
	audio.name = "AudioController"

	var settings_data: Dictionary = {}

	SaveLoadUtilsScript.load_into_audio(audio, settings_data)

	assert_that(audio.sfx_enabled).is_equal(true)
	assert_that(audio.music_enabled).is_equal(false)
	assert_that(audio.volume_preset).is_equal("normal")

	audio.queue_free()


func test_load_into_game_restores_phase_and_roles() -> void:
	var fresh_game := DoudizhuGame.new()
	fresh_game.new_round(1)

	var game_data: Dictionary = {
		"hands": [],
		"bottom_cards": [
			{"id": 51, "rank": 10, "suit": "S", "label": "10S"},
			{"id": 52, "rank": 14, "suit": "C", "label": "AS"},
			{"id": 53, "rank": 17, "suit": "Joker", "label": "BJ"},
		],
		"roles": ["farmer", "landlord", "farmer"],
		"landlord_seat": 1,
		"phase": "play",
		"current_seat": 2,
		"initiative_seat": 1,
		"consecutive_passes": 0,
		"active_trick": {},
		"recent_plays": ["", "", ""],
		"ai_reasons": ["", "", ""],
		"winner_side": "",
		"winner_seat": -1,
		"result_key": "",
		"hand_number": 5,
		"seed": 99,
	}

	SaveLoadUtilsScript.load_into_game(fresh_game, game_data)

	assert_that(fresh_game.phase).is_equal("play")
	assert_that(fresh_game.roles).is_equal(["farmer", "landlord", "farmer"])
	assert_that(fresh_game.landlord_seat).is_equal(1)
	assert_that(fresh_game.current_seat).is_equal(2)
	assert_that(fresh_game.initiative_seat).is_equal(1)
	assert_that(fresh_game.hand_number).is_equal(5)
	assert_that(fresh_game.seed).is_equal(99)
	assert_that(fresh_game.active_trick.is_empty()).is_equal(true)
	assert_that(fresh_game.recent_plays).is_equal(["", "", ""])


func test_load_into_game_restores_active_trick() -> void:
	var fresh_game := DoudizhuGame.new()
	fresh_game.new_round(1)

	var game_data: Dictionary = {
		"hands": [],
		"bottom_cards": [],
		"roles": ["landlord", "farmer", "farmer"],
		"landlord_seat": 0,
		"phase": "play",
		"current_seat": 1,
		"initiative_seat": 0,
		"consecutive_passes": 0,
		"active_trick": {
			"cards": [
				{"id": 0, "rank": 3, "suit": "S", "label": "3S"},
				{"id": 4, "rank": 4, "suit": "S", "label": "4S"},
			],
			"owner_seat": 0,
			"play_type": "single",
		},
		"recent_plays": ["3S4S", "", ""],
		"ai_reasons": ["", "", ""],
		"winner_side": "",
		"winner_seat": -1,
		"result_key": "",
		"hand_number": 2,
		"seed": 42,
	}

	SaveLoadUtilsScript.load_into_game(fresh_game, game_data)

	assert_that(fresh_game.active_trick.is_empty()).is_equal(false)
	assert_that(fresh_game.active_trick.get("owner_seat", -1)).is_equal(0)
	assert_that(String(fresh_game.active_trick.get("play_type", ""))).is_equal("single")
	assert_that(fresh_game.recent_plays[0]).is_equal("3S4S")


func test_load_into_game_empty_state() -> void:
	var fresh_game := DoudizhuGame.new()
	fresh_game.new_round(1)

	var game_data: Dictionary = {}

	SaveLoadUtilsScript.load_into_game(fresh_game, game_data)

	assert_that(fresh_game.phase).is_equal("setup")
	assert_that(fresh_game.roles).is_equal(["undecided", "undecided", "undecided"])
	assert_that(fresh_game.active_trick.is_empty()).is_equal(true)
	assert_that(fresh_game.recent_plays).is_equal(["", "", ""])
	assert_that(fresh_game.ai_reasons).is_equal(["", "", ""])
