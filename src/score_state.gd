class_name ScoreState
extends RefCounted

const HUMAN := 0
const AI_LEFT := 1
const AI_RIGHT := 2
const SEAT_NAMES := ["Player", "AI Left", "AI Right"]
const SIDE_LANDLORD := "landlord"
const SIDE_FARMERS := "farmers"

var target_score := 6
var hand_count_cap := 3
var totals: Array[int] = [0, 0, 0]
var last_delta: Array[int] = [0, 0, 0]
var hand_wins: Array[int] = [0, 0, 0]
var hand_losses: Array[int] = [0, 0, 0]
var hands_played := 0
var match_complete := false
var match_winner := ""
var match_winner_seat := -1
var match_winner_score := 0
var stats_hands_completed := 0
var stats_matches_completed := 0
var stats_player_side_wins := 0
var stats_landlord_side_wins := 0
var stats_farmer_side_wins := 0
var stats_best_player_score := 0

var _applied_result_keys := {}
var _current_match_stats_recorded := false


func configure(new_target_score: int = 6, new_hand_count_cap: int = 3) -> void:
	target_score = max(1, new_target_score)
	hand_count_cap = max(1, new_hand_count_cap)
	_update_match_state()


func reset_match() -> void:
	totals = [0, 0, 0]
	last_delta = [0, 0, 0]
	hand_wins = [0, 0, 0]
	hand_losses = [0, 0, 0]
	hands_played = 0
	match_complete = false
	match_winner = ""
	match_winner_seat = -1
	match_winner_score = 0
	_current_match_stats_recorded = false
	_applied_result_keys.clear()


func reset_stats() -> void:
	stats_hands_completed = 0
	stats_matches_completed = 0
	stats_player_side_wins = 0
	stats_landlord_side_wins = 0
	stats_farmer_side_wins = 0
	stats_best_player_score = 0


func start_new_hand() -> void:
	last_delta = [0, 0, 0]


func calculate_delta(winner_side: String, landlord_seat: int) -> Array[int]:
	var delta: Array[int] = [0, 0, 0]
	if landlord_seat < HUMAN or landlord_seat > AI_RIGHT:
		return delta
	if winner_side == SIDE_LANDLORD:
		delta[landlord_seat] = 2
		for seat in range(3):
			if seat != landlord_seat:
				delta[seat] = -1
	elif winner_side == SIDE_FARMERS:
		delta[landlord_seat] = -2
		for seat in range(3):
			if seat != landlord_seat:
				delta[seat] = 1
	return delta


func apply_hand_result(winner_side: String, landlord_seat: int, result_key: String = "") -> Dictionary:
	var key := result_key
	if key == "":
		key = "hand_%d_%s_%d" % [hands_played + 1, winner_side, landlord_seat]
	if _applied_result_keys.has(key):
		return _summary(false, key)
	if match_complete:
		return _summary(false, key)
	last_delta = calculate_delta(winner_side, landlord_seat)
	for seat in range(3):
		totals[seat] += last_delta[seat]
		if last_delta[seat] > 0:
			hand_wins[seat] += 1
		elif last_delta[seat] < 0:
			hand_losses[seat] += 1
	hands_played += 1
	_applied_result_keys[key] = true
	_update_match_state()
	_record_stats(winner_side, landlord_seat)
	return _summary(true, key)


func score_line() -> String:
	return "Scores H:%+d L:%+d R:%+d  Hand %d/%d" % [
		totals[HUMAN],
		totals[AI_LEFT],
		totals[AI_RIGHT],
		hands_played,
		hand_count_cap,
	]


func delta_line() -> String:
	return "Delta H:%+d L:%+d R:%+d" % [last_delta[HUMAN], last_delta[AI_LEFT], last_delta[AI_RIGHT]]


func match_line() -> String:
	if match_complete:
		return "Match winner: %s (%+d)" % [match_winner, match_winner_score]
	return "Match target: %+d or %d hands" % [target_score, hand_count_cap]


func hand_record_line() -> String:
	return "Hand W/L  H:%d-%d L:%d-%d R:%d-%d" % [
		hand_wins[HUMAN],
		hand_losses[HUMAN],
		hand_wins[AI_LEFT],
		hand_losses[AI_LEFT],
		hand_wins[AI_RIGHT],
		hand_losses[AI_RIGHT],
	]


func stats_line() -> String:
	return "Stats Hands:%d Matches:%d PlayerSide:%d Landlord:%d Farmers:%d Best:%+d" % [
		stats_hands_completed,
		stats_matches_completed,
		stats_player_side_wins,
		stats_landlord_side_wins,
		stats_farmer_side_wins,
		stats_best_player_score,
	]


func debug_state() -> Dictionary:
	return {
		"target_score": target_score,
		"hand_count_cap": hand_count_cap,
		"totals": totals.duplicate(),
		"last_delta": last_delta.duplicate(),
		"hand_wins": hand_wins.duplicate(),
		"hand_losses": hand_losses.duplicate(),
		"hands_played": hands_played,
		"match_complete": match_complete,
		"match_winner": match_winner,
		"match_winner_seat": match_winner_seat,
		"match_winner_score": match_winner_score,
		"stats_hands_completed": stats_hands_completed,
		"stats_matches_completed": stats_matches_completed,
		"stats_player_side_wins": stats_player_side_wins,
		"stats_landlord_side_wins": stats_landlord_side_wins,
		"stats_farmer_side_wins": stats_farmer_side_wins,
		"stats_best_player_score": stats_best_player_score,
		"applied_count": _applied_result_keys.size(),
	}


func _record_stats(winner_side: String, landlord_seat: int) -> void:
	stats_hands_completed += 1
	if winner_side == SIDE_LANDLORD:
		stats_landlord_side_wins += 1
		if landlord_seat == HUMAN:
			stats_player_side_wins += 1
	elif winner_side == SIDE_FARMERS:
		stats_farmer_side_wins += 1
		if landlord_seat != HUMAN:
			stats_player_side_wins += 1
	stats_best_player_score = max(stats_best_player_score, totals[HUMAN])
	if match_complete and not _current_match_stats_recorded:
		stats_matches_completed += 1
		_current_match_stats_recorded = true


func _summary(applied: bool, key: String) -> Dictionary:
	return {
		"applied": applied,
		"result_key": key,
		"totals": totals.duplicate(),
		"last_delta": last_delta.duplicate(),
		"hands_played": hands_played,
		"match_complete": match_complete,
		"match_winner": match_winner,
		"match_winner_seat": match_winner_seat,
	}


func _update_match_state() -> void:
	match_complete = false
	match_winner = ""
	match_winner_seat = -1
	match_winner_score = 0
	var best_score := totals[HUMAN]
	var best_seat := HUMAN
	var tied := false
	for seat in [AI_LEFT, AI_RIGHT]:
		if totals[seat] > best_score:
			best_score = totals[seat]
			best_seat = seat
			tied = false
		elif totals[seat] == best_score:
			tied = true
	var reached_target := false
	for score in totals:
		if score >= target_score:
			reached_target = true
			break
	if reached_target or hands_played >= hand_count_cap:
		match_complete = true
		match_winner_seat = -1 if tied else best_seat
		match_winner = "Tie" if tied else SEAT_NAMES[best_seat]
		match_winner_score = best_score

