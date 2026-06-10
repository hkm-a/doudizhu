class_name MainUICallbacks
extends RefCounted


func on_call_pressed(game, audio_controller) -> void:
	game.resolve_landlord(true)
	audio_controller.play_event("landlord")


func on_decline_pressed(game, audio_controller) -> void:
	game.resolve_landlord(false)
	audio_controller.play_event("landlord")


func on_play_pressed(game, audio_controller, animation_system, _hand_area_path: String) -> bool:
	var played: bool = bool(game.play_selected())
	if played:
		audio_controller.play_event("play")
		_animate_cards_to_table(game, animation_system)
	else:
		audio_controller.play_event("invalid")
	return played


func on_pass_pressed(game, audio_controller) -> bool:
	var passed: bool = bool(game.pass_turn())
	if passed:
		audio_controller.play_event("pass")
	else:
		audio_controller.play_event("invalid")
	return passed


func on_hint_pressed(game) -> void:
	game.hint()


func on_help_pressed(main) -> void:
	main.help_visible = true


func on_help_close_pressed(main) -> void:
	main.help_visible = false


func on_tutorial_pressed(main) -> void:
	main.tutorial_visible = true
	main.tutorial_panel.visible = true
	main.tutorial_blocker.visible = true
	main.tutorial_index = 0


func on_tutorial_close_pressed(main) -> void:
	main.tutorial_visible = false
	main.tutorial_panel.visible = false
	main.tutorial_blocker.visible = false


func on_tutorial_back_pressed(main, tutorial_steps) -> void:
	if main.tutorial_index > 0:
		main.tutorial_index -= 1
		_update_tutorial_display(main, tutorial_steps)


func on_tutorial_next_pressed(main, tutorial_steps) -> void:
	if main.tutorial_index < tutorial_steps.size() - 1:
		main.tutorial_index += 1
		_update_tutorial_display(main, tutorial_steps)


func _update_tutorial_display(main, tutorial_steps) -> void:
	var step: Dictionary = tutorial_steps[main.tutorial_index]
	main.tutorial_title_label.text = step.title
	main.tutorial_body_label.text = step.body
	main.tutorial_step_label.text = "Step %d of %d" % [main.tutorial_index + 1, tutorial_steps.size()]
	main.tutorial_back_button.disabled = main.tutorial_index <= 0
	main.tutorial_next_button.disabled = main.tutorial_index >= tutorial_steps.size() - 1


func on_settings_pressed(main) -> void:
	main.settings_visible = true


func on_settings_close_pressed(main) -> void:
	main.settings_visible = false


func on_sfx_toggle_pressed(audio_controller) -> void:
	audio_controller.toggle_sfx()


func on_music_toggle_pressed(audio_controller) -> void:
	audio_controller.toggle_music()


func on_volume_pressed(audio_controller) -> void:
	var next_preset := "normal"
	if audio_controller.volume_preset == "normal":
		next_preset = "quiet"
	elif audio_controller.volume_preset == "quiet":
		next_preset = "loud"
	audio_controller.set_volume_preset(next_preset)


func on_ai_difficulty_pressed(ai_utils_cls) -> void:
	var current: int = int(ai_utils_cls.get_difficulty())
	var next: int = int((current + 1) % 2)
	ai_utils_cls.save_difficulty(next)


func on_reset_stats_pressed(score_state) -> void:
	score_state.reset_stats()


func on_quit_pressed(main, audio_controller) -> void:
	main.quit_requested = true
	audio_controller.play_event("pass")


func on_new_hand_pressed(main, audio_controller, game) -> void:
	main.help_visible = false
	main.settings_visible = false
	main.quit_requested = false
	audio_controller.play_event("play")
	game.new_round(100 + game.round_counter)


func on_new_match_pressed(main, audio_controller, game, score_state) -> void:
	main.help_visible = false
	main.settings_visible = false
	main.quit_requested = false
	audio_controller.play_event("play")
	score_state.reset_match()
	game.round_counter = 0
	game.new_round(100 + game.round_counter)


func on_new_round_pressed(main, audio_controller, game) -> void:
	on_new_hand_pressed(main, audio_controller, game)


func on_save_game_pressed(game, score_state, audio_controller) -> bool:
	var ok := SaveLoadUtils.save_game(game, score_state, audio_controller)
	if ok:
		return true
	return false


func on_load_game_pressed(game, score_state, audio_controller, main) -> bool:
	if not SaveLoadUtils.save_exists():
		return false
	var saved: Dictionary = SaveLoadUtils.load_game()
	if saved.is_empty():
		return false
	SaveLoadUtils.load_into_game(game, saved.get("game_state", {}))
	SaveLoadUtils.load_into_score(score_state, saved.get("score_state", {}))
	SaveLoadUtils.load_into_audio(audio_controller, saved.get("settings", {}))
	main.has_save = false
	main.help_visible = false
	main.settings_visible = false
	return true


func on_hand_area_gui_input(event: InputEvent, game, hand_area: Control, layout_scale: float, callbacks) -> bool:
	if not event is InputEventMouseButton:
		return false
	var mb: InputEventMouseButton = event as InputEventMouseButton
	if mb.button_index != MOUSE_BUTTON_LEFT:
		return false
	if mb.pressed and game.phase == "play":
		callbacks._drag_select_active = true
		callbacks._drag_start_pos = mb.position
		return true
	elif not mb.pressed and callbacks._drag_select_active:
		var release_pos: Vector2 = mb.position
		var x1: float = minf(callbacks._drag_start_pos.x, release_pos.x)
		var x2: float = maxf(callbacks._drag_start_pos.x, release_pos.x)
		var y1: float = minf(callbacks._drag_start_pos.y, release_pos.y)
		var y2: float = maxf(callbacks._drag_start_pos.y, release_pos.y)
		var y_margin: float = 100.0 * layout_scale
		var count: int = 0
		for child in hand_area.get_children():
			if child is Button and child.is_visible_in_tree():
				var pos: Vector2 = child.position
				if pos.x >= x1 and pos.x <= x2 and pos.y >= (y1 - y_margin) and pos.y <= (y2 + y_margin):
					var cid: int = child.get_meta("card_id", -1)
					if cid >= 0:
						game.toggle_selection(cid)
						count += 1
		callbacks._drag_select_active = false
		if count == 0:
			for child in hand_area.get_children():
				if child is Button and child.is_visible_in_tree():
					var cid: int = child.get_meta("card_id", -1)
					if cid >= 0:
						game.toggle_selection(cid)
						count += 1
						break
		return true
	return false


func handle_shortcut(event: InputEventKey, main, help_button, tutorial_button,
		call_button, decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, game, score_state) -> bool:

	if event.keycode == KEY_ESCAPE:
		if main.settings_visible:
			return _press_visible_button(main, null)
		if main.tutorial_visible:
			return _press_visible_button(main, null)
		if main.help_visible:
			return _press_visible_button(main, null)
	if main.settings_visible:
		match event.keycode:
			KEY_S:
				return true
			KEY_M:
				return true
			KEY_V:
				return true
			KEY_R:
				return true
			_:
				return false
	if main.tutorial_visible:
		match event.keycode:
			KEY_LEFT, KEY_B:
				return true
			KEY_RIGHT, KEY_ENTER, KEY_SPACE:
				return true
			KEY_T:
				return true
			_:
				return false
	if main.help_visible:
		return false
	match event.keycode:
		KEY_F1:
			return _press_visible_button(main, help_button)
		KEY_T:
			return _press_visible_button(main, tutorial_button)
		KEY_A:
			return _press_visible_button(main, call_button)
		KEY_D:
			return _press_visible_button(main, decline_button)
		KEY_SPACE:
			if game.phase == "landlord":
				return _press_visible_button(main, call_button)
			return _press_visible_button(main, play_button)
		KEY_P:
			return _press_visible_button(main, pass_button)
		KEY_H:
			return _press_visible_button(main, hint_button)
		KEY_N:
			if game.phase == "result" and score_state.match_complete:
				return _press_visible_button(main, result_new_match_button)
			if game.phase == "result":
				return _press_visible_button(main, result_new_hand_button)
			return false
		KEY_Q:
			return _press_visible_button(main, quit_button)
		_:
			return false


func _press_visible_button(main, button: Button) -> bool:
	if button == null or not button.visible or button.disabled:
		return false
	button.pressed.emit()
	return true


func unhandled_key_input(event: InputEvent, main, help_button, tutorial_button,
		call_button, decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, game, score_state) -> bool:
	if not event is InputEventKey:
		return false
	var key_event := event as InputEventKey
	if not key_event.pressed or key_event.echo:
		return false
	return handle_shortcut(key_event, main, help_button, tutorial_button,
		call_button, decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, game, score_state)


func simulate_shortcut(keycode, parent, help_button, tutorial_button,
		call_button, decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, game, score_state) -> bool:
	var keys := []
	if keycode is Array:
		keys = keycode
	else:
		keys = [keycode]
	for key in keys:
		var event := InputEventKey.new()
		if key is String:
			match key:
				"KEY_T": event.keycode = KEY_T
				"KEY_F1": event.keycode = KEY_F1
				"KEY_H": event.keycode = KEY_H
				"KEY_P": event.keycode = KEY_P
				"KEY_N": event.keycode = KEY_N
				"KEY_SPACE": event.keycode = KEY_SPACE
				"KEY_B": event.keycode = KEY_B
				"KEY_RIGHT": event.keycode = KEY_RIGHT
				"KEY_LEFT": event.keycode = KEY_LEFT
		elif key is int:
			event.keycode = key
		event.pressed = true
		if not handle_shortcut(event, parent, help_button, tutorial_button, call_button, decline_button, play_button, pass_button, hint_button, result_new_hand_button, result_new_match_button, quit_button, game, score_state):
			return false
	return true


var _drag_select_active: bool = false
var _drag_start_pos: Vector2 = Vector2.ZERO


func drag_select_active() -> bool:
	return _drag_select_active


func drag_set_active(val: bool) -> void:
	_drag_select_active = val


func drag_start_pos() -> Vector2:
	return _drag_start_pos


func drag_set_start_pos(pos: Vector2) -> void:
	_drag_start_pos = pos


func _animate_cards_to_table(game, animation_system) -> void:
	var selected_cards: Array = game.selected_cards.duplicate()
	if selected_cards.is_empty():
		return
	var selected_buttons: Array[Button] = []
	for child in _get_hand_area(game).get_children():
		if child is Button and selected_cards.has(child.get_meta("card_id", -1)):
			selected_buttons.append(child)
	if selected_buttons.is_empty():
		return
	var trick_box := _get_trick_box(game)
	var total_width: float = 0.0
	if selected_buttons.size() > 1:
		total_width = selected_buttons.size() * 56.0 + (selected_buttons.size() - 1.0) * 6.0
	var start_x: float = trick_box.size.x * 0.5 - total_width * 0.5
	for i in selected_buttons.size():
		var btn: Button = selected_buttons[i]
		var target := Vector2(start_x + i * 62.0, 0.0)
		var duration := 0.2 + 0.2 * (i as float) / maxf(selected_buttons.size(), 1)
		animation_system.play_flight_animation(btn, target, clampf(duration, 0.2, 0.4))


func _get_hand_area(game) -> Control:
	var p: Control = game.get_parent()
	while p != null:
		if p.name == "PlayerHand":
			return p
		p = p.get_parent()
	return null


func _get_trick_box(game) -> Control:
	var p: Control = game.get_parent()
	while p != null:
		if p.name == "CurrentTrick":
			return p
		p = p.get_parent()
	return null
