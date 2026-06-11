class_name SaveLoadUtils
extends RefCounted

const SAVE_PATH := "user://doudizhu_save.json"


static func save_game(engine, audio_controller) -> bool:
	var save_data := {
		"engine": {
			"phase": engine.phase,
			"current_seat": engine.current_seat,
			"landlord_seat": engine.landlord_seat,
			"hands": engine.hands,
			"bottom_cards": engine.bottom_cards,
			"roles": engine.roles,
			"selected_cards": engine.selected_cards,
			"active_trick": engine.active_trick,
			"recent_plays": engine.recent_plays,
			"ai_reasons": engine.ai_reasons,
			"bid_amount": engine.bid_amount,
			"bid_counter": engine.bid_counter,
			"highest_bid": engine.highest_bid,
			"highest_bidder": engine.highest_bidder,
			"bid_passed": engine.bid_passed,
			"initiative_seat": engine.initiative_seat,
			"consecutive_passes": engine.consecutive_passes,
			"winner_side": engine.winner_side,
			"winner_seat": engine.winner_seat,
			"hand_number": engine.hand_number,
			"multiplier": engine.multiplier,
			"seed": engine.seed,
		},
		"settings": {
			"sfx_enabled": audio_controller.sfx_enabled,
			"music_enabled": audio_controller.music_enabled,
			"volume_preset": audio_controller.volume_preset,
		},
	}
	
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return false
	file.store_string(JSON.stringify(save_data))
	return true


static func load_game() -> Dictionary:
	if not FileAccess.file_exists(SAVE_PATH):
		return {}
	
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return {}
	
	var data := JSON.parse_string(file.get_as_text())
	return data if data is Dictionary else {}


static func delete_save() -> void:
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.remove_absolute(SAVE_PATH)


static func save_exists() -> bool:
	return FileAccess.file_exists(SAVE_PATH)
