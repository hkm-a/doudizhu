class_name MainUIRefresh
extends RefCounted

const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0
const PANEL_COLOR := Color(0.05, 0.16, 0.12, 0.9)
const ACTIVE_PANEL_COLOR := Color(0.18, 0.24, 0.13, 0.95)
const ACTIVE_BORDER_COLOR := Color(0.95, 0.72, 0.25)
const SELECTED_CARD_COLOR := Color(1.0, 0.94, 0.55)

var turn_timer_remaining: float = 30.0
var _turn_timer_active: bool = false
var _turn_timer_label_bottom: Label
var _turn_timer_label_bottom_created: bool = false


func refresh_all(game, score_state, audio_controller,
		label: Label, hand_summary_label: Label, scoreboard_label: Label,
		stats_label: Label, trick_panel: PanelContainer,
		result_panel: PanelContainer, result_label: Label,
		help_label: Label, help_close_button: Button,
		ai_left_panel: Panel, ai_right_panel: Panel,
		ai_left_hand: Control, ai_right_hand: Control,
		hand_area: Control, bottom_cards_box: HBoxContainer,
		trick_box: HBoxContainer, trick_owner_label: Label,
		action_bar: HBoxContainer, call_button: Button,
		decline_button: Button, play_button: Button, pass_button: Button,
		hint_button: Button, help_button: Button, settings_button: Button,
		new_round_button: Button,
		settings_blocker: ColorRect, settings_panel: PanelContainer,
		sfx_toggle_button: Button, music_toggle_button: Button,
		volume_button: Button, ai_difficulty_button: Button,
		settings_close_button: Button,
		result_new_hand_button: Button, result_new_match_button: Button,
		quit_button: Button, help_visible: bool, layout_scale: float,
		animation_system, loc, main, parent) -> void:

	_apply_result_score_once(game, score_state, audio_controller, parent, layout_scale)
	_refresh_seat(ai_left_panel, DoudizhuGame.AI_LEFT, animation_system, loc, layout_scale, parent)
	_refresh_seat(ai_right_panel, DoudizhuGame.AI_RIGHT, animation_system, loc, layout_scale, parent)
	var left_hand := parent._game_ref.hands[DoudizhuGame.AI_LEFT]
	var right_hand := parent._game_ref.hands[DoudizhuGame.AI_RIGHT]
	_refresh_ai_hand(ai_left_hand, left_hand, DoudizhuGame.AI_LEFT,
		parent, layout_scale, loc, game)
	_refresh_ai_hand(ai_right_hand, right_hand, DoudizhuGame.AI_RIGHT,
		parent, layout_scale, loc, game)
	_refresh_bottom_cards(game, bottom_cards_box, parent, layout_scale, loc)
	_refresh_trick(game, trick_box, trick_owner_label, loc, layout_scale, parent)
	_refresh_hand(game, hand_area, layout_scale, animation_system, loc, parent)
	_refresh_actions(game, action_bar, call_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button)
	label.text = game.message
	hand_summary_label.text = game.hand_summary_text()
	scoreboard_label.text = score_state.score_line()
	stats_label.text = score_state.hand_record_line()
	trick_panel.visible = game.phase != "result"
	result_panel.visible = game.phase == "result"
	result_label.text = _result_summary_text(game, score_state)
	result_new_hand_button.visible = not score_state.match_complete
	result_new_match_button.visible = score_state.match_complete
	_refresh_result_action_focus(result_panel, result_new_hand_button, result_new_match_button, quit_button)
	help_label.text = game.rules_help_text()
	settings_blocker.visible = parent.settings_visible
	settings_panel.visible = parent.settings_visible
	help_close_button.focus_mode = Control.FOCUS_ALL if help_visible else Control.FOCUS_NONE
	_refresh_settings_ui(settings_blocker, settings_panel, sfx_toggle_button, music_toggle_button, volume_button, ai_difficulty_button, settings_close_button, audio_controller, layout_scale, parent)
	_ensure_timer_label_bottom(main).visible = (game.phase == "landlord" or game.phase == "play")
	_ensure_timer_label_bottom(main).text = debug_timer_label_text(layout_scale)


func _refresh_seat(panel: Panel, seat: int, animation_system, loc: LocalizationUtilsScript, layout_scale: float, parent) -> void:
	var box := panel.get_node("Content")
	box.get_node("Name").text = loc.string("seat.player") if seat == DoudizhuGame.HUMAN else DoudizhuGame.SEAT_NAMES[seat]

	var role := parent._game_ref.roles[seat]
	var role_text := "%s: %s" % [loc.string("label.role"), role]
	if role == "地主":
		role_text = "【地主】%s" % role
	elif role == "农民":
		role_text = "【农民】%s" % role
	box.get_node("Role").text = role_text
	# Apply role-based color
	if role == "地主":
		box.get_node("Role").add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	else:
		box.get_node("Role").add_theme_color_override("font_color", Color(0.4, 0.6, 1.0))

	box.get_node("Count").text = "%d张" % parent._game_ref.hands[seat].size()
	box.get_node("Count").add_theme_font_size_override("font_size", int(16.0 * layout_scale))
	box.get_node("Turn").text = "回合" if parent._game_ref.current_seat == seat and parent._game_ref.phase == "play" else ""
	box.get_node("Recent").text = "%s: %s" % [loc.string("label.recent"), (parent._game_ref.recent_plays[seat] if parent._game_ref.recent_plays[seat] != "" else "-")]
	box.get_node("Reason").text = "%s: %s" % [loc.string("label.reason"), (parent._game_ref.ai_reasons[seat] if parent._game_ref.ai_reasons[seat] != "" else "-")]
	var active := parent._game_ref.current_seat == seat and parent._game_ref.phase == "play"
	panel.add_theme_stylebox_override("panel", _panel_style(active, layout_scale))


func _refresh_bottom_cards(game, bottom_cards_box: HBoxContainer, parent, layout_scale: float, loc: LocalizationUtilsScript) -> void:
	_clear_children(bottom_cards_box)
	for card in game.bottom_cards:
		if game.phase == "landlord":
			bottom_cards_box.add_child(_card_button({}, false, false, parent, layout_scale, loc))
		else:
			bottom_cards_box.add_child(_card_button(card, false, false, parent, layout_scale, loc))


func _refresh_trick(game, trick_box: HBoxContainer, trick_owner_label: Label, loc: LocalizationUtilsScript, layout_scale: float, parent) -> void:
	_clear_children(trick_box)
	if game.active_trick.is_empty():
		trick_owner_label.text = ""
		return
	trick_owner_label.text = "%s出牌" % DoudizhuGame.SEAT_NAMES[int(game.active_trick.owner_seat)]
	for card in game.active_trick.cards:
		trick_box.add_child(_card_button(card, false, false, parent, layout_scale, loc))


func _refresh_hand(game, hand_area: Control, layout_scale: float, animation_system, loc: LocalizationUtilsScript, parent) -> void:
	_clear_children(hand_area)
	var cards: Array = parent._game_ref.hands[DoudizhuGame.HUMAN]
	var count: int = cards.size()
	if count == 0:
		return

	var card_size := CARD_SIZE * layout_scale
	var positions := parent._calculate_fan_positions(count)

	for index in range(count):
		var card: Dictionary = cards[index]
		var selected := parent._game_ref.selected_cards.has(int(card.id))
		var button := _card_button(card, true, selected, parent, layout_scale, loc)

		if index < positions.size():
			var pos_data: Dictionary = positions[index]
			button.position = pos_data["position"]
			button.rotation = pos_data["rotation"]

			if selected:
				button.position += Vector2(0.0, -18.0 * layout_scale)
				var bounce_tween: Tween = animation_system.play_bounce_animation(button, 6.0 * layout_scale, 0.18)
				bounce_tween.finished.connect(func() -> void:
					button.position += Vector2(0.0, -18.0 * layout_scale)
				)
		else:
			button.position = Vector2(index * (card_size.x + 8.0), 10.0 * layout_scale)

		hand_area.add_child(button)


func _refresh_actions(game, action_bar: HBoxContainer, call_button: Button, decline_button: Button,
		play_button: Button, pass_button: Button, hint_button: Button, help_button: Button,
		settings_button: Button, new_round_button: Button) -> void:
	var landlord := game.phase == "landlord"
	var player_turn := game.phase == "play" and game.current_seat == DoudizhuGame.HUMAN
	call_button.visible = landlord
	decline_button.visible = landlord
	play_button.visible = player_turn
	pass_button.visible = player_turn
	hint_button.visible = player_turn
	help_button.visible = game.phase != "result"
	settings_button.visible = true
	new_round_button.visible = false
	for button in [call_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button]:
		button.focus_mode = Control.FOCUS_NONE if not button.visible else Control.FOCUS_ALL


func _refresh_settings_ui(settings_blocker: ColorRect, settings_panel: PanelContainer,
		sfx_toggle_button: Button, music_toggle_button: Button,
		volume_button: Button, ai_difficulty_button: Button,
		settings_close_button: Button, audio_controller,
		layout_scale: float, parent) -> void:
	settings_blocker.visible = parent.settings_visible
	settings_panel.visible = parent.settings_visible
	sfx_toggle_button.text = "SFX: %s" % ("On" if audio_controller.sfx_enabled else "Off")
	music_toggle_button.text = "Music: %s" % ("On" if audio_controller.music_enabled else "Off")
	volume_button.text = "Volume: %s" % audio_controller.volume_preset.capitalize()
	var current := parent.AIUtilsScript.get_difficulty()
	ai_difficulty_button.text = "AI Difficulty: %s" % ("Normal" if current == 0 else "Hard")
	var focus_mode := Control.FOCUS_ALL if parent.settings_visible else Control.FOCUS_NONE
	for button in [sfx_toggle_button, music_toggle_button, volume_button, ai_difficulty_button, settings_close_button]:
		button.focus_mode = focus_mode


func _refresh_result_action_focus(result_panel: PanelContainer, result_new_hand_button: Button,
		result_new_match_button: Button, quit_button: Button) -> void:
	for button in [result_new_hand_button, result_new_match_button, quit_button]:
		button.focus_mode = Control.FOCUS_ALL if result_panel.visible and button.visible else Control.FOCUS_NONE


func _apply_result_score_once(game, score_state, audio_controller, parent, layout_scale: float) -> Dictionary:
	if game.phase != "result":
		return score_state.debug_state()
	var summary := game.result_summary()
	var result := score_state.apply_hand_result(
		String(summary.winner_side),
		int(summary.landlord_seat),
		String(summary.result_key)
	)
	if result.applied and not score_state.match_complete:
		_auto_save_after_result(game, score_state, audio_controller, parent)
	return result


func _auto_save_after_result(game, score_state, audio_controller, parent) -> void:
	var ok := SaveLoadUtilsScript.save_game(game, score_state, audio_controller)
	if ok:
		parent.has_save = true


func _result_summary_text(game, score_state) -> String:
	if game.phase != "result":
		return ""
	var result := game.result_summary()
	var lines := [
		"%s win" % String(result.winner_side).capitalize(),
		"Winner: %s | Landlord: %s" % [String(result.winner_name), String(result.landlord_name)],
		score_state.delta_line(),
		score_state.score_line(),
		score_state.match_line(),
	]
	return "\n".join(lines)


func play_result_audio_if_needed(game, audio_controller) -> void:
	if game.phase != "result":
		return
	if game.winner_side == "landlord" and game.landlord_seat == DoudizhuGame.HUMAN:
		audio_controller.play_event("result_win")
	elif game.winner_side == "farmers" and game.landlord_seat != DoudizhuGame.HUMAN:
		audio_controller.play_event("result_win")
	else:
		audio_controller.play_event("result_loss")


func _card_button(card: Dictionary, interactive: bool, selected: bool, parent, layout_scale: float, loc: LocalizationUtilsScript) -> Button:
	var button := Button.new()
	var card_size := CARD_SIZE * layout_scale
	button.custom_minimum_size = card_size
	button.size = card_size
	button.focus_mode = Control.FOCUS_NONE
	if card.is_empty():
		button.name = "HiddenCard"
		button.tooltip_text = ""
		var back_tex := CardAssetsScript.get_card_back()
		if back_tex != null:
			button.text = ""
			var icon := TextureRect.new()
			icon.name = "CardBackTexture"
			icon.texture = back_tex
			icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
			icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			icon.size = card_size
			button.add_child(icon)
			button.disabled = true
		else:
			button.text = "?"
			button.disabled = true
			button.modulate = Color(0.5, 0.5, 0.5)
	else:
		button.name = "Card_%d" % int(card.id)
		var card_id := int(card.id)
		button.set_meta("card_id", card_id)
		button.tooltip_text = String(card.label)
		var tex := CardAssetsScript.get_card_image(card_id)
		if tex != null:
			button.text = ""
			var card_icon := TextureRect.new()
			card_icon.name = "CardTexture"
			card_icon.texture = tex
			card_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
			card_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			card_icon.size = card_size
			button.add_child(card_icon)
		else:
			button.text = String(card.label)
			button.modulate = SELECTED_CARD_COLOR if selected else _card_color(card)
			button.add_theme_color_override("font_color", _card_text_color(card))
			button.add_theme_font_size_override("font_size", int(16.0 * layout_scale))
		button.disabled = not interactive
		if button.text == "":
			button.modulate = SELECTED_CARD_COLOR if selected else Color.WHITE
		button.add_theme_stylebox_override("normal", _card_style(card, selected, layout_scale))
		button.add_theme_stylebox_override("hover", _card_style(card, true, layout_scale))
		button.add_theme_stylebox_override("pressed", _card_style(card, true, layout_scale))
		if interactive:
			button.pressed.connect(func() -> void:
				parent._game_ref.toggle_selection(int(card.id))
				parent.audio_controller.play_event("select")
				parent._refresh()
			)
	return button


func _card_style(card: Dictionary, selected: bool, layout_scale: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = SELECTED_CARD_COLOR if selected else _card_color(card)
	style.border_color = ACTIVE_BORDER_COLOR if selected else Color(0.08, 0.08, 0.08)
	style.border_width_left = 3 if selected else 1
	style.border_width_top = 3 if selected else 1
	style.border_width_right = 3 if selected else 1
	style.border_width_bottom = 3 if selected else 1
	style.corner_radius_top_left = 5
	style.corner_radius_top_right = 5
	style.corner_radius_bottom_right = 5
	style.corner_radius_bottom_left = 5
	return style


func _card_text_color(card: Dictionary) -> Color:
	if String(card.suit) == "H" or String(card.suit) == "D":
		return Color(0.62, 0.05, 0.05)
	if int(card.rank) >= 16:
		return Color(0.06, 0.12, 0.42)
	return Color(0.04, 0.04, 0.04)


func _card_color(card: Dictionary) -> Color:
	if String(card.suit) == "H" or String(card.suit) == "D":
		return Color(1.0, 0.86, 0.86)
	if int(card.rank) >= 16:
		return Color(0.86, 0.9, 1.0)
	return Color.WHITE


func _panel_style(active: bool, layout_scale: float) -> StyleBoxFlat:
	var style := _box_style(
		ACTIVE_PANEL_COLOR if active else PANEL_COLOR,
		ACTIVE_BORDER_COLOR if active else Color(0.0, 0.0, 0.0, 0.0),
		2 if active else 0,
		layout_scale
	)
	return style


func _box_style(bg_color: Color, border_color: Color, border_width: int, layout_scale: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg_color
	style.border_color = border_color
	style.border_width_left = border_width
	style.border_width_top = border_width
	style.border_width_right = border_width
	style.border_width_bottom = border_width
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_right = 6
	style.corner_radius_bottom_left = 6
	return style


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()


func _ensure_timer_label_bottom(main: Control) -> Label:
	if _turn_timer_label_bottom == null:
		_turn_timer_label_bottom = Label.new()
		_turn_timer_label_bottom.name = "TurnTimerLabelBottom"
		_turn_timer_label_bottom.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_turn_timer_label_bottom.visible = false
		_turn_timer_label_bottom.text = "0:30"
		_turn_timer_label_bottom.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
		main.add_child(_turn_timer_label_bottom)
		_turn_timer_label_bottom_created = true
	return _turn_timer_label_bottom


func debug_timer_label_text(layout_scale: float) -> String:
	var total_secs: int = ceili(turn_timer_remaining)
	var mins: int = total_secs / 60
	var secs: int = total_secs % 60
	return "%d:%02d" % [mins, secs]


func _process_turn_timer(game, main: Control, layout_scale: float) -> void:
	turn_timer_remaining -= 0.016
	if turn_timer_remaining < 0.0:
		turn_timer_remaining = 0.0
	var is_landlord_phase: bool = game.phase == "landlord"
	var is_human_seat: bool = game.current_seat == DoudizhuGame.HUMAN
	if is_landlord_phase and is_human_seat:
		_turn_timer_active = true
		_ensure_timer_label_bottom(main).text = debug_timer_label_text(layout_scale)
		_ensure_timer_label_bottom(main).visible = true
	elif game.phase == "play" and is_human_seat:
		_turn_timer_active = true
		_ensure_timer_label_bottom(main).text = debug_timer_label_text(layout_scale)
		_ensure_timer_label_bottom(main).visible = true
		if turn_timer_remaining <= 0.0:
			game.pass_turn()
			_turn_timer_active = false
			turn_timer_remaining = 30.0
	else:
		_turn_timer_active = false
		if _turn_timer_label_bottom != null:
			_ensure_timer_label_bottom(main).visible = false
		if game.phase == "landlord" and turn_timer_remaining <= 0.0:
			game.resolve_landlord(true)


func turn_timer_active() -> bool:
	return _turn_timer_active


func turn_timer_set_active(val: bool) -> void:
	_turn_timer_active = val


func timer_remaining() -> float:
	return turn_timer_remaining


func timer_set_remaining(val: float) -> void:
	turn_timer_remaining = val


func timer_label_bottom() -> Label:
	return _turn_timer_label_bottom


func card_button_factory(card: Dictionary, interactive: bool, selected: bool, parent, layout_scale: float) -> Button:
	var button := Button.new()
	var card_size := CARD_SIZE * layout_scale
	button.custom_minimum_size = card_size
	button.size = card_size
	button.focus_mode = Control.FOCUS_NONE
	if card.is_empty():
		button.name = "HiddenCard"
		button.tooltip_text = ""
		var back_tex := CardAssetsScript.get_card_back()
		if back_tex != null:
			button.text = ""
			var icon := TextureRect.new()
			icon.name = "CardBackTexture"
			icon.texture = back_tex
			icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
			icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			icon.size = card_size
			button.add_child(icon)
			button.disabled = true
		else:
			button.text = "?"
			button.disabled = true
			button.modulate = Color(0.5, 0.5, 0.5)
	else:
		button.name = "Card_%d" % int(card.id)
		var card_id := int(card.id)
		button.set_meta("card_id", card_id)
		button.tooltip_text = String(card.label)
		var tex := CardAssetsScript.get_card_image(card_id)
		if tex != null:
			button.text = ""
			var card_icon := TextureRect.new()
			card_icon.name = "CardTexture"
			card_icon.texture = tex
			card_icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT
			card_icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
			card_icon.size = card_size
			button.add_child(card_icon)
		else:
			button.text = String(card.label)
			button.modulate = SELECTED_CARD_COLOR if selected else _card_color(card)
			button.add_theme_color_override("font_color", _card_text_color(card))
			button.add_theme_font_size_override("font_size", int(16.0 * layout_scale))
		button.disabled = not interactive
		if button.text == "":
			button.modulate = SELECTED_CARD_COLOR if selected else Color.WHITE
		button.add_theme_stylebox_override("normal", _card_style(card, selected, layout_scale))
		button.add_theme_stylebox_override("hover", _card_style(card, true, layout_scale))
		button.add_theme_stylebox_override("pressed", _card_style(card, true, layout_scale))
		if interactive:
			button.pressed.connect(func() -> void:
				parent._game_ref.toggle_selection(int(card.id))
				parent.audio_controller.play_event("select")
				parent._refresh()
			)
	return button


func card_style(card: Dictionary, selected: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = SELECTED_CARD_COLOR if selected else _card_color(card)
	style.border_color = ACTIVE_BORDER_COLOR if selected else Color(0.08, 0.08, 0.08)
	style.border_width_left = 3 if selected else 1
	style.border_width_top = 3 if selected else 1
	style.border_width_right = 3 if selected else 1
	style.border_width_bottom = 3 if selected else 1
	style.corner_radius_top_left = 5
	style.corner_radius_top_right = 5
	style.corner_radius_bottom_right = 5
	style.corner_radius_bottom_left = 5
	return style


func _refresh_ai_hand(hand_area: Control, cards: Array, seat: int,
		parent, layout_scale: float, loc: LocalizationUtilsScript,
		_game) -> void:
	_clear_children(hand_area)
	var count: int = cards.size()
	if count == 0:
		hand_area.visible = false
		return
	hand_area.visible = true
	var card_size := CARD_SIZE * Vector2(0.55, 0.77) * layout_scale
	var card_width := card_size.x
	var vertical_spacing := card_size.y * 0.85
	if seat == DoudizhuGame.AI_LEFT:
		hand_area.position = Vector2(
			8.0 * layout_scale, 160.0 * layout_scale)
		var h := count * vertical_spacing + 30.0 * layout_scale
		hand_area.custom_minimum_size = Vector2(
			card_width + 16.0 * layout_scale, h)
		for i in range(count):
			var btn := _card_button({}, false, false,
				parent, layout_scale, loc)
			btn.position = Vector2(
				8.0 * layout_scale, i * vertical_spacing)
			btn.custom_minimum_size = card_size
			btn.size = card_size
			hand_area.add_child(btn)
	elif seat == DoudizhuGame.AI_RIGHT:
		var viewport_size := Vector2(1280.0, 720.0)
		hand_area.position = Vector2(
			viewport_size.x - card_width - 8.0 * layout_scale,
			160.0 * layout_scale)
		var h := count * vertical_spacing + 30.0 * layout_scale
		hand_area.custom_minimum_size = Vector2(
			card_width + 16.0 * layout_scale, h)
		for i in range(count):
			var btn := _card_button({}, false, false,
				parent, layout_scale, loc)
			btn.position = Vector2(
				8.0 * layout_scale, i * vertical_spacing)
			btn.custom_minimum_size = card_size
			btn.size = card_size
			hand_area.add_child(btn)
