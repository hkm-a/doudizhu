extends RefCounted

const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0
const PANEL_COLOR := Color(0.05, 0.16, 0.12, 0.9)
const ACTIVE_PANEL_COLOR := Color(0.18, 0.24, 0.13, 0.95)
const ACTIVE_BORDER_COLOR := Color(0.95, 0.72, 0.25)
const SELECTED_CARD_COLOR := Color(1.0, 0.94, 0.55)


func refresh_all(engine, audio_controller,
		status_label: Label, hand_summary_label: Label,
		scoreboard_label: Label, stats_label: Label,
		trick_panel: PanelContainer,
		result_panel: PanelContainer, result_label: Label,
		ai_left_panel: Panel, ai_right_panel: Panel,
		ai_left_hand: Control, ai_right_hand: Control,
		hand_area: Control, bottom_cards_box: HBoxContainer,
		trick_box: HBoxContainer, trick_owner_label: Label,
		action_bar: HBoxContainer,
		call1_button: Button, call2_button: Button, call3_button: Button,
		decline_button: Button, play_button: Button, pass_button: Button,
		hint_button: Button, help_button: Button, settings_button: Button,
		new_round_button: Button,
		result_new_hand_button: Button, result_new_match_button: Button,
		quit_button: Button,
		settings_panel: PanelContainer,
		help_panel: PanelContainer, help_label: Label, help_close_button: Button,
		settings_close_button: Button,
		settings_blocker: ColorRect, help_blocker: ColorRect,
		help_visible: bool, layout_scale: float, animation_system, main) -> void:

	_refresh_seat(ai_left_panel, 1, engine, layout_scale)
	_refresh_seat(ai_right_panel, 2, engine, layout_scale)
	_refresh_ai_hand(ai_left_hand, engine.hands[1], 1, layout_scale)
	_refresh_ai_hand(ai_right_hand, engine.hands[2], 2, layout_scale)
	_refresh_bottom_cards(engine, bottom_cards_box, layout_scale)
	_refresh_trick(engine, trick_box, trick_owner_label, layout_scale)
	_refresh_hand(engine, hand_area, layout_scale, animation_system)
	_refresh_actions(engine, action_bar, call1_button, call2_button, call3_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button)
	
	status_label.text = _format_status(engine)
	hand_summary_label.text = engine.get_hand_summary()
	scoreboard_label.text = _score_line(engine)
	stats_label.text = _stats_line(engine)
	
	trick_panel.visible = engine.phase != 4
	result_panel.visible = engine.phase == 4
	result_label.text = _result_text(engine)
	result_new_hand_button.visible = true
	result_new_match_button.visible = false
	result_new_hand_button.disabled = engine.phase != 4
	result_new_match_button.disabled = engine.phase != 4
	quit_button.disabled = engine.phase != 4
	settings_blocker.visible = false
	settings_panel.visible = false
	help_blocker.visible = false
	help_panel.visible = false
	help_close_button.focus_mode = Control.FOCUS_NONE
	settings_close_button.focus_mode = Control.FOCUS_NONE


func _refresh_seat(panel: Panel, seat: int, engine, layout_scale: float) -> void:
	var box := panel.get_node("Content")
	var name_label := box.get_node("Name")
	name_label.text = ["Player", "AI Left", "AI Right"][seat]
	name_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))
	
	var role_label := box.get_node("Role")
	var landlord_crown := box.get_node_or_null("LandlordCrown")
	if landlord_crown == null:
		landlord_crown = Label.new()
		landlord_crown.name = "LandlordCrown"
		landlord_crown.add_theme_font_size_override("font_size", int(24.0 * layout_scale))
		landlord_crown.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		box.add_child(landlord_crown)
	
	var role: Variant = engine.roles[seat]
	if engine.landlord_seat >= 0 and role == "地主":
		landlord_crown.text = "★"
		landlord_crown.visible = true
		role_label.text = "【地主】%s" % ["Player", "AI Left", "AI Right"][seat]
		role_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	elif engine.landlord_seat >= 0 and role == "农民":
		landlord_crown.visible = false
		role_label.text = "【农民】%s" % ["Player", "AI Left", "AI Right"][seat]
		role_label.add_theme_color_override("font_color", Color(0.4, 0.6, 1.0))
	elif engine.phase == 2:
		landlord_crown.visible = false
		role_label.text = "%s: 待定" % ["Player", "AI Left", "AI Right"][seat]
		role_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.7))
	else:
		landlord_crown.visible = false
		role_label.text = "%s" % role
	
	var count_label := box.get_node("Count")
	count_label.text = "%d张" % engine.hands[seat].size()
	count_label.add_theme_font_size_override("font_size", int(18.0 * layout_scale))
	
	var turn_label := box.get_node("Turn")
	var is_active: bool = engine.current_seat == seat and engine.phase == 3
	turn_label.text = "\u25B6 出牌中" if is_active else ""
	turn_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))
	turn_label.add_theme_color_override("font_color", ACTIVE_BORDER_COLOR if is_active else Color(0.5, 0.5, 0.5))
	
	var recent_label := box.get_node("Recent")
	recent_label.text = "最近: %s" % (engine.recent_plays[seat] if engine.recent_plays[seat] != "" else "-")
	recent_label.add_theme_font_size_override("font_size", int(12.0 * layout_scale))
	
	var reason_label := box.get_node("Reason")
	reason_label.text = "原因: %s" % (engine.ai_reasons[seat] if engine.ai_reasons[seat] != "" else "-")
	reason_label.add_theme_font_size_override("font_size", int(11.0 * layout_scale))
	
	var active: bool = is_active
	panel.add_theme_stylebox_override("panel", _panel_style(active, layout_scale))


func _refresh_bottom_cards(engine, bottom_cards_box: HBoxContainer, layout_scale: float) -> void:
	_clear_children(bottom_cards_box)
	var label := Label.new()
	label.text = "底牌:"
	label.add_theme_font_size_override("font_size", int(12.0 * layout_scale))
	label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.2))
	bottom_cards_box.add_child(label)
	
	for card in engine.bottom_cards:
		if engine.phase == 3 or engine.phase == 4:
			bottom_cards_box.add_child(_card_button(card, false, false, layout_scale))
		else:
			bottom_cards_box.add_child(_card_button({}, false, false, layout_scale))


func _refresh_trick(engine, trick_box: HBoxContainer, trick_owner_label: Label, layout_scale: float) -> void:
	_clear_children(trick_box)
	if engine.active_trick.is_empty():
		trick_owner_label.text = ""
		return
	var owner_seat := int(engine.active_trick.get("owner_seat", -1))
	trick_owner_label.text = "%s出牌" % ["Player", "AI Left", "AI Right"][owner_seat]
	for card in engine.active_trick.get("cards", []):
		trick_box.add_child(_card_button(card, false, false, layout_scale))


func _refresh_hand(engine, hand_area: Control, layout_scale: float, animation_system) -> void:
	_clear_children(hand_area)
	var cards: Variant = engine.hands[0]
	var count: int = cards.size()
	if count == 0:
		return
	
	var card_size := CARD_SIZE * layout_scale
	var positions: Variant = load("res://ui_layout.gd").new().new().calculate_fan_positions(count, card_size, hand_area.size)
	
	for index in range(count):
		var card: Variant = cards[index]
		var button := _card_button(card, true, false, layout_scale)
		
		if index < positions.size():
			var pos_data: Variant = positions[index]
			button.position = pos_data["position"]
			button.rotation = pos_data["rotation"]
		else:
			button.position = Vector2(index * (card_size.x + 8.0), 10.0 * layout_scale)
		
		hand_area.add_child(button)


func _refresh_actions(engine, action_bar: HBoxContainer,
		call1_button: Button, call2_button: Button, call3_button: Button,
		decline_button: Button, play_button: Button, pass_button: Button,
		hint_button: Button, help_button: Button, settings_button: Button,
		new_round_button: Button) -> void:
	
	var in_bidding: bool = engine.phase == 2
	var in_play: bool = engine.phase == 3
	var human_turn: bool = engine.current_seat == 0
	
	call1_button.visible = in_bidding and human_turn
	call2_button.visible = in_bidding and human_turn
	call3_button.visible = in_bidding and human_turn
	decline_button.visible = in_bidding and human_turn
	play_button.visible = in_play and human_turn and engine.initiative_seat == 0
	pass_button.visible = in_play and human_turn and engine.initiative_seat != 0
	hint_button.visible = in_play and human_turn
	help_button.visible = true
	settings_button.visible = true
	new_round_button.visible = false
	
	for button in [call1_button, call2_button, call3_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button]:
		button.disabled = not button.visible


func _format_status(engine) -> String:
	var lines: Array = []
	
	if engine.phase == 2:
		lines.append("[地主待定]")
	elif engine.phase == 3:
		if engine.current_seat == 0:
			if engine.initiative_seat == 0:
				lines.append("[你的回合 - 先出]")
			else:
				lines.append("[你的回合 - 跟牌或不出]")
		else:
			lines.append("[%s出牌中...]" % ["Player", "AI Left", "AI Right"][engine.current_seat])
	elif engine.phase == 4:
		lines.append("[牌局结束]")
	
	if engine.landlord_seat >= 0:
		lines.append("地主: %s" % ["Player", "AI Left", "AI Right"][engine.landlord_seat])
	
	lines.append("手牌: %d张" % engine.hands[0].size())
	
	if not engine.active_trick.is_empty():
		lines.append("当前牌: %s" % engine.get_trick_display())
	
	return "\n".join(lines)


func _score_line(engine) -> String:
	return "Score: %d" % engine.multiplier


func _stats_line(engine) -> String:
	return "Hand #%d" % engine.hand_number


func _result_text(engine) -> String:
	if engine.phase != 4:
		return ""
	return "%s win! Multiplier: x%d" % [engine.winner_side.capitalize(), engine.multiplier]


func _card_button(card, interactive, selected, layout_scale: float) -> Button:
	var button := Button.new()
	var card_size := CARD_SIZE * layout_scale
	button.custom_minimum_size = card_size
	button.size = card_size
	button.focus_mode = Control.FOCUS_NONE
	
	if card.is_empty():
		button.text = "?"
		button.disabled = true
		button.modulate = Color(0.5, 0.5, 0.5)
	else:
		var card_id := int(card["id"])
		button.set_meta("card_id", card_id)
		var c: Variant = load("res://card.gd").new(card_id)
		button.text = c.get_display_label()
		button.modulate = SELECTED_CARD_COLOR if selected else Color.WHITE
		button.add_theme_color_override("font_color", _card_text_color(card))
		button.add_theme_font_size_override("font_size", int(14.0 * layout_scale))
		button.disabled = not interactive
		button.add_theme_stylebox_override("normal", _card_style(card, selected, layout_scale))
		button.add_theme_stylebox_override("hover", _card_style(card, true, layout_scale))
		button.add_theme_stylebox_override("pressed", _card_style(card, true, layout_scale))
		
		if interactive:
			button.pressed.connect(func() -> void:
				button.modulate = SELECTED_CARD_COLOR if button.modulate != SELECTED_CARD_COLOR else Color.WHITE
			)
	
	return button


func _card_style(card, selected, layout_scale: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = SELECTED_CARD_COLOR if selected else Color.WHITE
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


func _card_text_color(card) -> Color:
	var suit := str(card.get("suit", ""))
	if suit in ["H", "D"]:
		return Color(0.62, 0.05, 0.05)
	var rank := int(card.get("rank", 0))
	if rank >= 16:
		return Color(0.06, 0.12, 0.42)
	return Color(0.04, 0.04, 0.04)


func _panel_style(active, layout_scale: float) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = ACTIVE_PANEL_COLOR if active else PANEL_COLOR
	style.border_color = ACTIVE_BORDER_COLOR if active else Color(0, 0, 0, 0)
	style.border_width_left = 2 if active else 0
	style.border_width_top = 2 if active else 0
	style.border_width_right = 2 if active else 0
	style.border_width_bottom = 2 if active else 0
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_right = 6
	style.corner_radius_bottom_left = 6
	return style


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()


func _refresh_ai_hand(hand_area: Control, cards, seat, layout_scale: float) -> void:
	_clear_children(hand_area)
	var count: int = cards.size()
	if count == 0:
		hand_area.visible = false
		return
	hand_area.visible = true
	
	var card_size := CARD_SIZE * Vector2(0.55, 0.77) * layout_scale
	var vertical_spacing := card_size.y * 0.85
	
	var viewport_size := Vector2(1280.0, 720.0)
	if seat == 1:
		hand_area.position = Vector2(8.0 * layout_scale, 160.0 * layout_scale)
		for i in range(count):
			var btn := _card_button({}, false, false, layout_scale)
			btn.position = Vector2(8.0 * layout_scale, i * vertical_spacing)
			btn.custom_minimum_size = card_size
			btn.size = card_size
			hand_area.add_child(btn)
	elif seat == 2:
		hand_area.position = Vector2(viewport_size.x - card_size.x - 8.0 * layout_scale, 160.0 * layout_scale)
		for i in range(count):
			var btn := _card_button({}, false, false, layout_scale)
			btn.position = Vector2(8.0 * layout_scale, i * vertical_spacing)
			btn.custom_minimum_size = card_size
			btn.size = card_size
			hand_area.add_child(btn)


func _play_compare(a, b) -> bool:
	var ra := int(a["primary_rank"])
	var rb := int(b["primary_rank"])
	if ra != rb:
		return ra < rb
	return a["structural_length"] < b["structural_length"]
