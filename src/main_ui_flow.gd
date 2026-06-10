class_name MainUIFlow
extends RefCounted


func show_continue_dialog(overlay) -> void:
	overlay.visible = true


func hide_continue_dialog(overlay) -> void:
	overlay.visible = false


func load_saved_game(game, score_state, audio_controller, main) -> bool:
	var saved: Dictionary = SaveLoadUtils.load_game()
	if saved.is_empty():
		game.message = "Failed to load save."
		return false
	SaveLoadUtils.load_into_game(game, saved.get("game_state", {}))
	SaveLoadUtils.load_into_score(score_state, saved.get("score_state", {}))
	SaveLoadUtils.load_into_audio(audio_controller, saved.get("settings", {}))
	main.has_save = false
	return true


func delete_save_and_start(game, score_state, main) -> void:
	SaveLoadUtils.delete_save()
	main.has_save = false
	game.new_round(100 + game.round_counter)
