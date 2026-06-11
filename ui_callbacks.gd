extends RefCounted

## Handles user input and maps it to engine calls.

# Drag state
var _drag_active: bool = false
var _drag_start_pos: Vector2 = Vector2.ZERO


func on_call_1_pressed(engine, audio_controller) -> void:
	if engine.call_bid(0, 1):
		audio_controller.play_event("select")


func on_call_2_pressed(engine, audio_controller) -> void:
	if engine.call_bid(0, 2):
		audio_controller.play_event("select")


func on_call_3_pressed(engine, audio_controller) -> void:
	if engine.call_bid(0, 3):
		audio_controller.play_event("select")


func on_decline_pressed(engine, audio_controller) -> void:
	engine.pass_bid(0)
	audio_controller.play_event("pass")


func on_play_pressed(engine, audio_controller) -> bool:
	if engine.play_selected():
		audio_controller.play_event("play")
		return true
	audio_controller.play_event("invalid")
	return false


func on_pass_pressed(engine, audio_controller) -> bool:
	if engine.pass_turn():
		audio_controller.play_event("pass")
		return true
	audio_controller.play_event("invalid")
	return false


func on_hint_pressed(engine) -> void:
	var plays: Array = engine.get_legal_plays()
	if not plays.is_empty():
		# Select the smallest play
		plays.sort_custom(_play_compare)
		for card in plays[0]["cards"]:
			if not engine.selected_cards.has(int(card["id"])):
				engine.selected_cards.append(int(card["id"]))


func on_hand_area_gui_input(event, engine, hand_area: Control, layout_scale: float, callbacks) -> bool:
	if not event is InputEventMouseButton:
		return false
	var mb: InputEventMouseButton = event
	if mb.button_index != MOUSE_BUTTON_LEFT:
		return false
	
	if mb.pressed:
		callbacks._drag_active = true
		callbacks._drag_start_pos = mb.position
		return true
	elif callbacks._drag_active:
		var release_pos: Vector2 = mb.position
		var x1: float = minf(callbacks._drag_start_pos.x, release_pos.x)
		var x2: float = maxf(callbacks._drag_start_pos.x, release_pos.x)
		var y1: float = minf(callbacks._drag_start_pos.y, release_pos.y)
		var y2: float = maxf(callbacks._drag_start_pos.y, release_pos.y)
		var y_margin: float = 100.0 * layout_scale
		
		var count := 0
		for child in hand_area.get_children():
			if child is Button and child.visible:
				var pos: Vector2 = child.position
				if pos.x >= x1 and pos.x <= x2 and pos.y >= (y1 - y_margin) and pos.y <= (y2 + y_margin):
					var cid: int = child.get_meta("card_id", -1)
					if cid >= 0:
						engine.selected_cards.append(cid)
						count += 1
		
		callbacks._drag_active = false
		
		# If nothing was dragged over, toggle the first visible card
		if count == 0:
			for child in hand_area.get_children():
				if child is Button and child.visible:
					var cid: int = child.get_meta("card_id", -1)
					if cid >= 0:
						_toggle_selection(engine, cid)
						count += 1
						break
		
		return true
	
	return false


func _toggle_selection(engine, card_id: int) -> void:
	if engine.selected_cards.has(card_id):
		engine.selected_cards.erase(card_id)
	else:
		engine.selected_cards.append(card_id)


func handle_shortcut(event, engine, call1_button, call2_button, call3_button,
		decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, main) -> bool:
	
	if not event is InputEventKey:
		return false
	var key_event: InputEventKey = event
	if not key_event.pressed or key_event.echo:
		return false
	
	match key_event.keycode:
		KEY_A:
			return _press(call1_button)
		KEY_D:
			return _press(decline_button)
		KEY_SPACE:
			if engine.phase == 2:  # BIDDING
				return _press(call1_button)
			return _press(play_button)
		KEY_P:
			return _press(pass_button)
		KEY_H:
			return _press(hint_button)
		KEY_N:
			if engine.phase == 4:  # RESULT
				return _press(result_new_hand_button)
			return false
		_:
			return false


func _press(button: Button) -> bool:
	if button.visible and not button.disabled:
		button.pressed.emit()
		return true
	return false


func _play_compare(a: Dictionary, b: Dictionary) -> bool:
	var ra: int = int(a["primary_rank"])
	var rb: int = int(b["primary_rank"])
	if ra != rb: return ra < rb
	return a["structural_length"] < b["structural_length"]

