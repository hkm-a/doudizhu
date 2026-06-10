class_name MainUIDebug
extends RefCounted

const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0


func finish_human_win(game, parent) -> void:
	game.force_finish_for_human_win()
	parent._refresh()


func configure_expanded_rule_fixture(game) -> void:
	game.debug_configure_expanded_rule_fixture()


func configure_bomb_conservation_fixture(game) -> void:
	game.debug_configure_bomb_conservation_fixture()


func selected_count(game) -> int:
	return game.selected_cards.size()


func human_card_count(game) -> int:
	return game.hands[DoudizhuGame.HUMAN].size()


func phase(game) -> String:
	return game.phase


func status_text(game) -> String:
	return game.message


func active_trick_type(game) -> String:
	return String(game.active_trick.get("play_type", ""))


func hand_summary_text(game) -> String:
	return game.hand_summary_text()


func ai_reason(game, seat: int) -> String:
	return game.ai_reasons[seat]


func help_visible(main) -> bool:
	return main.help_panel.visible


func audio_state(audio_controller) -> Dictionary:
	return audio_controller.debug_state()


func score_state(score_state) -> Dictionary:
	return score_state.debug_state()


func scoreboard_text(main) -> String:
	return main.scoreboard_label.text


func stats_text(main) -> String:
	return main.stats_label.text


func result_text(main) -> String:
	return main.result_label.text


func clear_save() -> void:
	SaveLoadUtils.delete_save()


func settings_visible(main) -> bool:
	return main.settings_panel.visible


func settings_focus_modes(sfx: Button, music: Button, volume: Button, close: Button) -> Dictionary:
	return {
		"sfx": sfx.focus_mode,
		"music": music.focus_mode,
		"volume": volume.focus_mode,
		"close": close.focus_mode,
	}


func result_focus_modes(new_hand: Button, new_match: Button, quit: Button) -> Dictionary:
	return {
		"new_hand": new_hand.focus_mode,
		"new_match": new_match.focus_mode,
		"quit": quit.focus_mode,
	}




func help_close_focus_mode(main) -> int:
	return main.help_close_button.focus_mode


func quit_requested(main) -> bool:
	return main.quit_requested


func tutorial_visible(main) -> bool:
	return main.tutorial_panel.visible


func tutorial_index(main) -> int:
	return main.tutorial_index


func tutorial_step_label(main) -> String:
	return main.tutorial_step_label.text


func layout_snapshot(main, debug_viewport_override) -> Dictionary:
	return {
		"viewport": debug_viewport_override if debug_viewport_override != Vector2.ZERO else main.get_viewport_rect().size,
		"scale": main.layout_scale,
		"hand_rect": Rect2(main.hand_area.global_position, main.hand_area.size),
		"action_rect": Rect2(main.action_bar.global_position, main.action_bar.size),
		"status_rect": Rect2(main.status_label.global_position, main.status_label.size),
		"summary_rect": Rect2(main.hand_summary_label.global_position, main.hand_summary_label.size),
		"scoreboard_rect": Rect2(main.scoreboard_panel.global_position, main.scoreboard_panel.size),
		"stats_rect": Rect2(main.stats_panel.global_position, main.stats_panel.size),
		"trick_rect": Rect2(main.trick_panel.global_position, main.trick_panel.size),
		"ai_left_rect": Rect2(main.ai_left_panel.global_position, main.ai_left_panel.size),
		"ai_right_rect": Rect2(main.ai_right_panel.global_position, main.ai_right_panel.size),
		"result_rect": Rect2(main.result_panel.global_position, main.result_panel.size),
		"result_text_rect": Rect2(main.result_label.global_position, main.result_label.size),
		"result_actions_rect": Rect2(main.result_actions_bar.global_position, main.result_actions_bar.size),
		"result_new_hand_rect": Rect2(main.result_new_hand_button.global_position, main.result_new_hand_button.size),
		"result_new_match_rect": Rect2(main.result_new_match_button.global_position, main.result_new_match_button.size),
		"result_quit_rect": Rect2(main.quit_button.global_position, main.quit_button.size),
		"help_rect": Rect2(main.help_panel.global_position, main.help_panel.size),
	}


func layout_snapshot_for_viewport(main, debug_viewport_override, layout_scale_ref) -> Dictionary:
	main.debug_viewport_override = debug_viewport_override
	# Layout will be applied via the layout module
	var snapshot := layout_snapshot(main, debug_viewport_override)
	main.debug_viewport_override = Vector2.ZERO
	return snapshot


func visible_hand_card_rects(main) -> Array:
	var rects: Array = []
	for child in main.hand_area.get_children():
		if child is Control and child.name.begins_with("Card_") and child.is_visible_in_tree():
			rects.append(child.get_global_rect())
	return rects


func drag_select_active(main_ui_callbacks) -> bool:
	return main_ui_callbacks._drag_select_active


func bottom_cards_revealed(main) -> bool:
	return main.bottom_cards_revealed


func bottom_cards_count(game) -> int:
	return game.bottom_cards.size()


func turn_timer_panel_visible(main) -> bool:
	return main._turn_timer_active


func turn_timer_active(main) -> bool:
	return main._turn_timer_active


func turn_timer_remaining(main) -> float:
	return main.turn_timer_remaining


func timer_label_text(main, layout_scale: float) -> String:
	var total_secs: int = ceili(main.turn_timer_remaining)
	var mins: int = total_secs / 60
	var secs: int = total_secs % 60
	return "%d:%02d" % [mins, secs]


func deal_anim_active(main) -> bool:
	return main._deal_anim_active


func deal_cards_remaining(main) -> int:
	return main._deal_cards_remaining


func animate_cards_to_table(game, animation_system, main) -> void:
	var selected_cards: Array = game.selected_cards.duplicate()
	if selected_cards.is_empty():
		return
	var selected_buttons: Array[Button] = []
	for child in main.hand_area.get_children():
		if child is Button and selected_cards.has(child.get_meta("card_id", -1)):
			selected_buttons.append(child)
	var table_area := main.trick_panel.get_node("TrickLayout/CurrentTrick")
	var start_positions: Array[Vector2] = []
	for btn in selected_buttons:
		start_positions.append(btn.position)
	var total_width: float = 0.0
	if selected_buttons.size() > 1:
		var avg_card_width: float = CARD_SIZE.x * main.layout_scale
		var avg_gap: float = 6.0 * main.layout_scale
		total_width = selected_buttons.size() * avg_card_width + (selected_buttons.size() - 1.0) * avg_gap
	var start_x: float = table_area.size.x * 0.5 - total_width * 0.5
	for i in selected_buttons.size():
		var btn: Button = selected_buttons[i]
		var target := Vector2(start_x + i * (CARD_SIZE.x * main.layout_scale + 6.0 * main.layout_scale), 0.0)
		var duration := 0.2 + 0.2 * (i as float) / maxf(selected_buttons.size(), 1)
		animation_system.play_flight_animation(btn, target, clampf(duration, 0.2, 0.4))


func calculate_fan_positions(card_count: int, card_size: Vector2, hand_area_size: Vector2, layout_scale: float, card_gap: float) -> Array[Vector2]:
	var positions: Array[Vector2] = []
	if card_count <= 0:
		return positions
	if card_count == 1:
		var x: float = (hand_area_size.x - card_size.x) * 0.5
		positions.push_back(Vector2(x, 18.0 * layout_scale))
		return positions
	var expected_step: float = CARD_SIZE.x * 0.6 * layout_scale
	var min_step: float = CARD_SIZE.x * layout_scale * 0.35
	var max_step: float = card_size.x + (card_gap * layout_scale)
	expected_step = maxf(expected_step, min_step)
	expected_step = minf(expected_step, max_step)
	for i in range(card_count):
		var x: float = (hand_area_size.x - ((card_count - 1) * expected_step + card_size.x)) * 0.5 + i * expected_step
		positions.push_back(Vector2(x, 18.0 * layout_scale))
	return positions

