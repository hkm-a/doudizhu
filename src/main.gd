extends Control

const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0

var game := DoudizhuGame.new()
var round_counter := 0

var ai_left_panel: PanelContainer
var ai_right_panel: PanelContainer
var bottom_cards_box: HBoxContainer
var trick_box: HBoxContainer
var trick_owner_label: Label
var status_label: Label
var hand_area: Control
var action_bar: HBoxContainer
var call_button: Button
var decline_button: Button
var play_button: Button
var pass_button: Button
var hint_button: Button
var new_round_button: Button
var result_panel: PanelContainer
var result_label: Label


func _ready() -> void:
	name = "Main"
	_build_ui()
	_start_new_round()


func _start_new_round() -> void:
	round_counter += 1
	game.new_round(100 + round_counter)
	_refresh()


func _build_ui() -> void:
	var background := ColorRect.new()
	background.name = "TableBackground"
	background.color = Color(0.05, 0.34, 0.21)
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	ai_left_panel = _seat_panel("AILeftPanel", Vector2(28, 24), Vector2(300, 128))
	ai_right_panel = _seat_panel("AIRightPanel", Vector2(952, 24), Vector2(300, 128))
	add_child(ai_left_panel)
	add_child(ai_right_panel)

	bottom_cards_box = HBoxContainer.new()
	bottom_cards_box.name = "BottomCards"
	bottom_cards_box.position = Vector2(548, 28)
	bottom_cards_box.custom_minimum_size = Vector2(184, 88)
	bottom_cards_box.size = bottom_cards_box.custom_minimum_size
	bottom_cards_box.add_theme_constant_override("separation", 6)
	add_child(bottom_cards_box)

	var trick_panel := PanelContainer.new()
	trick_panel.name = "TrickPanel"
	trick_panel.position = Vector2(360, 214)
	trick_panel.custom_minimum_size = Vector2(560, 168)
	trick_panel.size = trick_panel.custom_minimum_size
	add_child(trick_panel)
	var trick_vbox := VBoxContainer.new()
	trick_vbox.name = "TrickLayout"
	trick_vbox.add_theme_constant_override("separation", 8)
	trick_panel.add_child(trick_vbox)
	trick_owner_label = Label.new()
	trick_owner_label.name = "TrickOwner"
	trick_owner_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	trick_vbox.add_child(trick_owner_label)
	trick_box = HBoxContainer.new()
	trick_box.name = "CurrentTrick"
	trick_box.alignment = BoxContainer.ALIGNMENT_CENTER
	trick_box.add_theme_constant_override("separation", 6)
	trick_vbox.add_child(trick_box)

	status_label = Label.new()
	status_label.name = "StatusMessage"
	status_label.position = Vector2(260, 396)
	status_label.custom_minimum_size = Vector2(760, 48)
	status_label.size = status_label.custom_minimum_size
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(status_label)

	action_bar = HBoxContainer.new()
	action_bar.name = "ActionBar"
	action_bar.position = Vector2(706, 486)
	action_bar.custom_minimum_size = Vector2(530, 48)
	action_bar.size = action_bar.custom_minimum_size
	action_bar.add_theme_constant_override("separation", 8)
	add_child(action_bar)
	call_button = _action_button("CallLandlordButton", "Call Landlord", _on_call_pressed)
	decline_button = _action_button("DeclineLandlordButton", "Do Not Call", _on_decline_pressed)
	play_button = _action_button("PlayButton", "Play", _on_play_pressed)
	pass_button = _action_button("PassButton", "Pass", _on_pass_pressed)
	hint_button = _action_button("HintButton", "Hint", _on_hint_pressed)
	new_round_button = _action_button("NewRoundButton", "New Round", _on_new_round_pressed)

	hand_area = Control.new()
	hand_area.name = "PlayerHand"
	hand_area.position = Vector2(40, 554)
	hand_area.custom_minimum_size = Vector2(1200, 118)
	hand_area.size = hand_area.custom_minimum_size
	add_child(hand_area)

	result_panel = PanelContainer.new()
	result_panel.name = "ResultBanner"
	result_panel.position = Vector2(430, 242)
	result_panel.custom_minimum_size = Vector2(420, 130)
	result_panel.size = result_panel.custom_minimum_size
	add_child(result_panel)
	var result_vbox := VBoxContainer.new()
	result_vbox.name = "ResultLayout"
	result_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	result_vbox.add_theme_constant_override("separation", 12)
	result_panel.add_child(result_vbox)
	result_label = Label.new()
	result_label.name = "ResultText"
	result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_vbox.add_child(result_label)
	var result_new_round := Button.new()
	result_new_round.name = "ResultNewRoundButton"
	result_new_round.text = "New Round"
	result_new_round.focus_mode = Control.FOCUS_NONE
	result_new_round.pressed.connect(_on_new_round_pressed)
	result_vbox.add_child(result_new_round)


func _seat_panel(node_name: String, pos: Vector2, size: Vector2) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.name = node_name
	panel.position = pos
	panel.custom_minimum_size = size
	panel.size = size
	var box := VBoxContainer.new()
	box.name = "Content"
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	for label_name in ["Name", "Role", "Count", "Turn", "Recent"]:
		var label := Label.new()
		label.name = label_name
		label.text = label_name
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
	return panel


func _action_button(node_name: String, text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.custom_minimum_size = Vector2(92, 40)
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(callback)
	action_bar.add_child(button)
	return button


func _refresh() -> void:
	_refresh_seat(ai_left_panel, DoudizhuGame.AI_LEFT)
	_refresh_seat(ai_right_panel, DoudizhuGame.AI_RIGHT)
	_refresh_bottom_cards()
	_refresh_trick()
	_refresh_hand()
	_refresh_actions()
	status_label.text = game.message
	result_panel.visible = game.phase == "result"
	result_label.text = "%s win" % game.winner_side.capitalize()


func _refresh_seat(panel: PanelContainer, seat: int) -> void:
	var box := panel.get_node("Content")
	box.get_node("Name").text = DoudizhuGame.SEAT_NAMES[seat]
	box.get_node("Role").text = "Role: %s" % game.roles[seat]
	box.get_node("Count").text = "Cards: %d" % game.hands[seat].size()
	box.get_node("Turn").text = "TURN" if game.current_seat == seat and game.phase == "play" else ""
	box.get_node("Recent").text = "Recent: %s" % (game.recent_plays[seat] if game.recent_plays[seat] != "" else "-")


func _refresh_bottom_cards() -> void:
	_clear_children(bottom_cards_box)
	for card in game.bottom_cards:
		if game.phase == "landlord":
			bottom_cards_box.add_child(_card_button({}, false, false))
		else:
			bottom_cards_box.add_child(_card_button(card, false, false))


func _refresh_trick() -> void:
	_clear_children(trick_box)
	if game.active_trick.is_empty():
		trick_owner_label.text = "Current trick: none"
		return
	trick_owner_label.text = "Current trick: %s" % DoudizhuGame.SEAT_NAMES[int(game.active_trick.owner_seat)]
	for card in game.active_trick.cards:
		trick_box.add_child(_card_button(card, false, false))


func _refresh_hand() -> void:
	_clear_children(hand_area)
	var cards: Array = game.hands[DoudizhuGame.HUMAN]
	var count: int = max(cards.size(), 1)
	var step: float = min(CARD_SIZE.x + CARD_GAP, (hand_area.custom_minimum_size.x - CARD_SIZE.x) / count)
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		var selected := game.selected_cards.has(int(card.id))
		var button := _card_button(card, true, selected)
		button.position = Vector2(index * step, 14 if not selected else 0)
		hand_area.add_child(button)


func _refresh_actions() -> void:
	var landlord := game.phase == "landlord"
	var player_turn := game.phase == "play" and game.current_seat == DoudizhuGame.HUMAN
	call_button.visible = landlord
	decline_button.visible = landlord
	play_button.visible = player_turn
	pass_button.visible = player_turn
	hint_button.visible = player_turn
	new_round_button.visible = game.phase == "result"


func _card_button(card: Dictionary, interactive: bool, selected: bool) -> Button:
	var button := Button.new()
	button.custom_minimum_size = CARD_SIZE
	button.size = CARD_SIZE
	button.focus_mode = Control.FOCUS_NONE
	if card.is_empty():
		button.name = "HiddenCard"
		button.text = "?"
		button.disabled = true
	else:
		button.name = "Card_%d" % int(card.id)
		button.text = String(card.label)
		button.set_meta("card_id", int(card.id))
		button.disabled = not interactive
		button.modulate = Color(1.0, 0.94, 0.55) if selected else _card_color(card)
		if interactive:
			button.pressed.connect(func() -> void:
				game.toggle_selection(int(card.id))
				_refresh()
			)
	return button


func _card_color(card: Dictionary) -> Color:
	if String(card.suit) == "H" or String(card.suit) == "D":
		return Color(1.0, 0.86, 0.86)
	if int(card.rank) >= 16:
		return Color(0.86, 0.9, 1.0)
	return Color.WHITE


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()


func _on_call_pressed() -> void:
	game.resolve_landlord(true)
	_refresh()


func _on_decline_pressed() -> void:
	game.resolve_landlord(false)
	_refresh()


func _on_play_pressed() -> void:
	game.play_selected()
	_refresh()


func _on_pass_pressed() -> void:
	game.pass_turn()
	_refresh()


func _on_hint_pressed() -> void:
	game.hint()
	_refresh()


func _on_new_round_pressed() -> void:
	_start_new_round()


func debug_finish_human_win() -> void:
	game.force_finish_for_human_win()
	_refresh()


func debug_selected_count() -> int:
	return game.selected_cards.size()


func debug_human_card_count() -> int:
	return game.hands[DoudizhuGame.HUMAN].size()


func debug_status_text() -> String:
	return game.message
