class_name SaveLoadUtils
extends RefCounted

const SAVE_PATH := "user://savegame.json"


static func save_game(game, score_state, audio) -> bool:

	var game_dict := _serialize_game(game)
	var score_dict := _serialize_score(score_state)
	var settings_dict := _serialize_settings(audio)

	var save_data: Dictionary = {
		"game_state": game_dict,
		"score_state": score_dict,
		"settings": settings_dict,
	}

	var json_string: String = JSON.stringify(save_data)
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_line(json_string)
	file.close()
	return true


static func load_game() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}

	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return {}

	var json_string: String = file.get_as_text()
	file.close()

	var parse_result: Variant = JSON.parse_string(json_string)
	if parse_result == null or not parse_result is Dictionary:
		return {}

	return Dictionary(parse_result)


static func delete_save() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return true

	var err := DirAccess.remove_absolute(SAVE_PATH)
	return err == OK


static func save_exists() -> bool:
	return FileAccess.file_exists(SAVE_PATH)


static func _serialize_game(game: Variant) -> Dictionary:
	var hands: Array = []
	for seat in range(3):
		var seat_cards: Array = []
		for card in game.hands[seat]:
			seat_cards.append({
				"id": int(card.id),
				"rank": int(card.rank),
				"suit": String(card.suit),
				"label": String(card.label),
			})
		hands.append(seat_cards)

	var bottom_cards: Array = []
	for card in game.bottom_cards:
		bottom_cards.append({
			"id": int(card.id),
			"rank": int(card.rank),
			"suit": String(card.suit),
			"label": String(card.label),
		})

	var active_trick_dict: Dictionary = {}
	if not game.active_trick.is_empty():
		var trick_cards: Array = []
		for card in game.active_trick.get("cards", []):
			trick_cards.append({
				"id": int(card.id),
				"rank": int(card.rank),
				"suit": String(card.suit),
				"label": String(card.label),
			})
		active_trick_dict = {
			"cards": trick_cards,
			"owner_seat": game.active_trick.get("owner_seat", -1),
			"play_type": String(game.active_trick.get("play_type", "")),
		}

	return {
		"hands": hands,
		"bottom_cards": bottom_cards,
		"roles": game.roles.duplicate(),
		"landlord_seat": game.landlord_seat,
		"phase": game.phase,
		"current_seat": game.current_seat,
		"initiative_seat": game.initiative_seat,
		"consecutive_passes": game.consecutive_passes,
		"active_trick": active_trick_dict,
		"recent_plays": game.recent_plays.duplicate(),
		"ai_reasons": game.ai_reasons.duplicate(),
		"winner_side": String(game.winner_side),
		"winner_seat": game.winner_seat,
		"result_key": String(game.result_key),
		"hand_number": game.hand_number,
		"seed": game.seed,
	}


static func _serialize_score(score_state: Variant) -> Dictionary:
	return {
		"cumulative_score": score_state.debug_state().totals.duplicate(),
		"last_delta": score_state.debug_state().last_delta.duplicate(),
		"hand_wins": score_state.debug_state().hand_wins.duplicate(),
		"hand_losses": score_state.debug_state().hand_losses.duplicate(),
		"hands_played": score_state.hands_played,
		"match_complete": score_state.match_complete,
		"match_winner": score_state.match_winner,
		"match_winner_seat": score_state.match_winner_seat,
		"match_winner_score": score_state.match_winner_score,
		"target_score": score_state.target_score,
		"hand_count_cap": score_state.hand_count_cap,
		"stats_hands_completed": score_state.stats_hands_completed,
		"stats_matches_completed": score_state.stats_matches_completed,
		"stats_player_side_wins": score_state.stats_player_side_wins,
		"stats_landlord_side_wins": score_state.stats_landlord_side_wins,
		"stats_farmer_side_wins": score_state.stats_farmer_side_wins,
		"stats_best_player_score": score_state.stats_best_player_score,
	}


static func _serialize_settings(audio: Variant) -> Dictionary:
	return {
		"sfx_enabled": audio.sfx_enabled,
		"music_enabled": audio.music_enabled,
		"volume_preset": audio.volume_preset,
	}


static func load_into_game(game: Variant, game_data: Dictionary) -> void:
	var hands: Array[Array] = [[], [], []]
	var raw_hands: Array = game_data.get("hands", [])
	for seat in range(min(raw_hands.size(), 3)):
		var raw_cards: Array = raw_hands[seat]
		for raw_card in raw_cards:
			hands[seat].append({
				"id": raw_card.get("id", 0),
				"rank": raw_card.get("rank", 3),
				"suit": raw_card.get("suit", "S"),
				"label": raw_card.get("label", "3S"),
			})
	game.hands = hands

	var raw_bottom: Array = game_data.get("bottom_cards", [])
	var bottom_cards: Array[Dictionary] = []
	for raw_card in raw_bottom:
		bottom_cards.append({
			"id": raw_card.get("id", 0),
			"rank": raw_card.get("rank", 3),
			"suit": raw_card.get("suit", "S"),
			"label": raw_card.get("label", "3S"),
		})
	game.bottom_cards = bottom_cards

	for card in bottom_cards:
		game.cards_by_id[int(card.id)] = card

	var raw_roles: Array = game_data.get("roles", ["undecided", "undecided", "undecided"])
	var new_roles: Array[String] = [String(raw_roles[0]), String(raw_roles[1]), String(raw_roles[2])]
	game.roles = new_roles
	game.landlord_seat = game_data.get("landlord_seat", -1)
	game.phase = String(game_data.get("phase", "setup"))
	game.current_seat = game_data.get("current_seat", 0)
	game.initiative_seat = game_data.get("initiative_seat", -1)
	game.consecutive_passes = game_data.get("consecutive_passes", 0)

	var raw_trick: Dictionary = game_data.get("active_trick", {})
	if not raw_trick.is_empty():
		var trick_cards: Array[Dictionary] = []
		var raw_trick_cards: Array = raw_trick.get("cards", [])
		for raw_card in raw_trick_cards:
			trick_cards.append({
				"id": raw_card.get("id", 0),
				"rank": raw_card.get("rank", 3),
				"suit": raw_card.get("suit", "S"),
				"label": raw_card.get("label", "3S"),
			})
		game.active_trick = {
			"cards": trick_cards,
			"owner_seat": raw_trick.get("owner_seat", -1),
			"play_type": String(raw_trick.get("play_type", "")),
		}
	else:
		game.active_trick = {}

	var raw_plays: Array = game_data.get("recent_plays", ["", "", ""])
	var new_plays: Array[String] = [String(raw_plays[0]), String(raw_plays[1]), String(raw_plays[2])]
	game.recent_plays = new_plays
	var raw_reasons: Array = game_data.get("ai_reasons", ["", "", ""])
	var new_reasons: Array[String] = [String(raw_reasons[0]), String(raw_reasons[1]), String(raw_reasons[2])]
	game.ai_reasons = new_reasons
	game.winner_side = String(game_data.get("winner_side", ""))
	game.winner_seat = game_data.get("winner_seat", -1)
	game.result_key = String(game_data.get("result_key", ""))
	game.hand_number = game_data.get("hand_number", 0)
	game.seed = game_data.get("seed", 7)
	var empty_selected: Array[int] = []
	game.selected_cards = empty_selected
	game.hint_reason = ""


static func load_into_score(score_state: Variant, score_data: Dictionary) -> void:
	score_state.configure(
		score_data.get("target_score", 6),
		score_data.get("hand_count_cap", 3)
	)
	var cumul: Array = score_data.get("cumulative_score", [0, 0, 0])
	var new_totals: Array[int] = [int(cumul[0]), int(cumul[1]), int(cumul[2])]
	score_state.totals = new_totals
	var last_delta_data: Array = score_data.get("last_delta", [0, 0, 0])
	var new_delta: Array[int] = [int(last_delta_data[0]), int(last_delta_data[1]), int(last_delta_data[2])]
	score_state.last_delta = new_delta
	score_state.hands_played = score_data.get("hands_played", 0)
	score_state.match_complete = score_data.get("match_complete", false)
	score_state.match_winner = String(score_data.get("match_winner", ""))
	score_state.match_winner_seat = score_data.get("match_winner_seat", -1)
	score_state.match_winner_score = score_data.get("match_winner_score", 0)
	score_state.stats_hands_completed = score_data.get("stats_hands_completed", 0)
	score_state.stats_matches_completed = score_data.get("stats_matches_completed", 0)
	score_state.stats_player_side_wins = score_data.get("stats_player_side_wins", 0)
	score_state.stats_landlord_side_wins = score_data.get("stats_landlord_side_wins", 0)
	score_state.stats_farmer_side_wins = score_data.get("stats_farmer_side_wins", 0)
	score_state.stats_best_player_score = score_data.get("stats_best_player_score", 0)


static func load_into_audio(audio: Variant, settings_data: Dictionary) -> void:
	audio.sfx_enabled = settings_data.get("sfx_enabled", true)
	audio.music_enabled = settings_data.get("music_enabled", false)
	var preset: String = String(settings_data.get("volume_preset", "normal"))
	if not ["quiet", "normal", "loud"].has(preset):
		preset = "normal"
	audio.volume_preset = preset
