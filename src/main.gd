extends Control

const BASE_VIEWPORT := Vector2(1280, 720)
const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0
const TABLE_COLOR := Color(0.04, 0.35, 0.22)
const PANEL_COLOR := Color(0.05, 0.16, 0.12, 0.9)
const ACTIVE_PANEL_COLOR := Color(0.18, 0.24, 0.13, 0.95)
const ACTIVE_BORDER_COLOR := Color(0.95, 0.72, 0.25)
const RESULT_PANEL_COLOR := Color(0.08, 0.11, 0.1, 0.96)
const SELECTED_CARD_COLOR := Color(1.0, 0.94, 0.55)
const AudioControllerScript := preload("res://src/audio_controller.gd")
const ScoreStateScript := preload("res://src/score_state.gd")

var game := DoudizhuGame.new()
var score_state := ScoreStateScript.new()
var audio_controller := AudioControllerScript.new()
var round_counter := 0
var layout_scale := 1.0
var debug_viewport_override := Vector2.ZERO

var background: ColorRect
var ai_left_panel: Panel
var ai_right_panel: Panel
var bottom_cards_box: HBoxContainer
var trick_panel: PanelContainer
var trick_box: HBoxContainer
var trick_owner_label: Label
var status_label: Label
var hand_summary_label: Label
var scoreboard_panel: PanelContainer
var scoreboard_label: Label
var hand_area: Control
var action_bar: HBoxContainer
var call_button: Button
var decline_button: Button
var play_button: Button
var pass_button: Button
var hint_button: Button
var help_button: Button
var settings_button: Button
var new_round_button: Button
var quit_button: Button
var sfx_toggle_button: Button
var music_toggle_button: Button
var volume_button: Button
var result_panel: PanelContainer
var result_label: Label
var result_actions_bar: HBoxContainer
var result_new_hand_button: Button
var result_new_match_button: Button
var help_blocker: ColorRect
var help_panel: PanelContainer
var help_label: Label
var settings_blocker: ColorRect
var settings_panel: PanelContainer
var settings_label: Label
var help_visible := false
var settings_visible := false
var quit_requested := false


func _ready() -> void:
	name = "Main"
	audio_controller.name = "AudioController"
	add_child(audio_controller)
	_build_ui()
	_layout_ui()
	_start_new_round()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_node_ready():
		_layout_ui()
		_refresh()


func _start_new_round() -> void:
	round_counter += 1
	score_state.start_new_hand()
	game.new_round(100 + round_counter)
	_refresh()


func _start_new_match() -> void:
	score_state.reset_match()
	round_counter = 0
	_start_new_round()


func _build_ui() -> void:
	background = ColorRect.new()
	background.name = "TableBackground"
	background.color = TABLE_COLOR
	background.mouse_filter = Control.MOUSE_FILTER_IGNORE
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	ai_left_panel = _seat_panel("AILeftPanel")
	ai_right_panel = _seat_panel("AIRightPanel")
	_pin_top_left(ai_left_panel)
	_pin_top_left(ai_right_panel)
	add_child(ai_left_panel)
	add_child(ai_right_panel)

	bottom_cards_box = HBoxContainer.new()
	bottom_cards_box.name = "BottomCards"
	_pin_top_left(bottom_cards_box)
	bottom_cards_box.add_theme_constant_override("separation", 6)
	add_child(bottom_cards_box)

	trick_panel = PanelContainer.new()
	trick_panel.name = "TrickPanel"
	_pin_top_left(trick_panel)
	trick_panel.add_theme_stylebox_override("panel", _box_style(PANEL_COLOR, Color(0.03, 0.1, 0.08)))
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
	_pin_top_left(status_label)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	add_child(status_label)

	hand_summary_label = Label.new()
	hand_summary_label.name = "HandSummary"
	_pin_top_left(hand_summary_label)
	hand_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hand_summary_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hand_summary_label.add_theme_color_override("font_color", Color(0.92, 0.96, 0.9))
	add_child(hand_summary_label)

	scoreboard_panel = PanelContainer.new()
	scoreboard_panel.name = "ScoreboardBand"
	_pin_top_left(scoreboard_panel)
	scoreboard_panel.add_theme_stylebox_override("panel", _box_style(Color(0.07, 0.13, 0.11, 0.88), ACTIVE_BORDER_COLOR, 1))
	add_child(scoreboard_panel)
	scoreboard_label = Label.new()
	scoreboard_label.name = "ScoreboardText"
	scoreboard_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	scoreboard_label.add_theme_color_override("font_color", Color(0.96, 0.94, 0.76))
	scoreboard_panel.add_child(scoreboard_label)

	action_bar = HBoxContainer.new()
	action_bar.name = "ActionBar"
	_pin_top_left(action_bar)
	action_bar.add_theme_constant_override("separation", 8)
	add_child(action_bar)
	call_button = _action_button("CallLandlordButton", "Call Landlord", _on_call_pressed)
	decline_button = _action_button("DeclineLandlordButton", "Do Not Call", _on_decline_pressed)
	play_button = _action_button("PlayButton", "Play", _on_play_pressed)
	pass_button = _action_button("PassButton", "Pass", _on_pass_pressed)
	hint_button = _action_button("HintButton", "Hint", _on_hint_pressed)
	help_button = _action_button("HelpButton", "Help", _on_help_pressed)
	settings_button = _action_button("SettingsButton", "Audio", _on_settings_pressed)
	new_round_button = _action_button("NewHandButton", "New Hand", _on_new_hand_pressed)

	hand_area = Control.new()
	hand_area.name = "PlayerHand"
	_pin_top_left(hand_area)
	add_child(hand_area)

	result_panel = PanelContainer.new()
	result_panel.name = "ResultBanner"
	_pin_top_left(result_panel)
	result_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 3))
	add_child(result_panel)
	var result_vbox := VBoxContainer.new()
	result_vbox.name = "ResultLayout"
	result_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	result_vbox.add_theme_constant_override("separation", 12)
	result_panel.add_child(result_vbox)
	result_label = Label.new()
	result_label.name = "ResultText"
	result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_label.add_theme_font_size_override("font_size", 24)
	result_vbox.add_child(result_label)
	result_actions_bar = HBoxContainer.new()
	result_actions_bar.name = "ResultActions"
	result_actions_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	result_actions_bar.add_theme_constant_override("separation", 10)
	result_vbox.add_child(result_actions_bar)
	result_new_hand_button = Button.new()
	result_new_hand_button.name = "ResultNewHandButton"
	result_new_hand_button.text = "New Hand"
	result_new_hand_button.focus_mode = Control.FOCUS_NONE
	result_new_hand_button.custom_minimum_size = Vector2(128, 42)
	result_new_hand_button.add_theme_stylebox_override("normal", _button_style(false))
	result_new_hand_button.add_theme_stylebox_override("hover", _button_style(true))
	result_new_hand_button.add_theme_stylebox_override("pressed", _button_style(true))
	result_new_hand_button.pressed.connect(_on_new_hand_pressed)
	result_actions_bar.add_child(result_new_hand_button)
	result_new_match_button = Button.new()
	result_new_match_button.name = "ResultNewMatchButton"
	result_new_match_button.text = "New Match"
	result_new_match_button.focus_mode = Control.FOCUS_NONE
	result_new_match_button.custom_minimum_size = Vector2(128, 42)
	result_new_match_button.add_theme_stylebox_override("normal", _button_style(false))
	result_new_match_button.add_theme_stylebox_override("hover", _button_style(true))
	result_new_match_button.add_theme_stylebox_override("pressed", _button_style(true))
	result_new_match_button.pressed.connect(_on_new_match_pressed)
	result_actions_bar.add_child(result_new_match_button)
	quit_button = Button.new()
	quit_button.name = "QuitButton"
	quit_button.text = "Quit"
	quit_button.focus_mode = Control.FOCUS_NONE
	quit_button.custom_minimum_size = Vector2(128, 42)
	quit_button.add_theme_stylebox_override("normal", _button_style(false))
	quit_button.add_theme_stylebox_override("hover", _button_style(true))
	quit_button.add_theme_stylebox_override("pressed", _button_style(true))
	quit_button.pressed.connect(_on_quit_pressed)
	result_actions_bar.add_child(quit_button)

	help_blocker = ColorRect.new()
	help_blocker.name = "HelpModalBlocker"
	help_blocker.color = Color(0, 0, 0, 0.18)
	help_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	help_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(help_blocker)

	help_panel = PanelContainer.new()
	help_panel.name = "HelpPanel"
	_pin_top_left(help_panel)
	help_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 2))
	add_child(help_panel)
	var help_vbox := VBoxContainer.new()
	help_vbox.name = "HelpLayout"
	help_vbox.add_theme_constant_override("separation", 10)
	help_panel.add_child(help_vbox)
	help_label = Label.new()
	help_label.name = "HelpText"
	help_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help_label.add_theme_color_override("font_color", Color.WHITE)
	help_vbox.add_child(help_label)
	var close_button := Button.new()
	close_button.name = "HelpCloseButton"
	close_button.text = "Close"
	close_button.focus_mode = Control.FOCUS_NONE
	close_button.add_theme_stylebox_override("normal", _button_style(false))
	close_button.add_theme_stylebox_override("hover", _button_style(true))
	close_button.add_theme_stylebox_override("pressed", _button_style(true))
	close_button.pressed.connect(_on_help_close_pressed)
	help_vbox.add_child(close_button)

	settings_blocker = ColorRect.new()
	settings_blocker.name = "SettingsModalBlocker"
	settings_blocker.color = Color(0.0, 0.0, 0.0, 0.28)
	settings_blocker.visible = false
	settings_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	settings_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(settings_blocker)

	settings_panel = PanelContainer.new()
	settings_panel.name = "SettingsPanel"
	_pin_top_left(settings_panel)
	settings_panel.visible = false
	settings_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 2))
	add_child(settings_panel)
	var settings_vbox := VBoxContainer.new()
	settings_vbox.name = "SettingsLayout"
	settings_vbox.add_theme_constant_override("separation", 8)
	settings_panel.add_child(settings_vbox)
	settings_label = Label.new()
	settings_label.name = "SettingsText"
	settings_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	settings_label.add_theme_color_override("font_color", Color.WHITE)
	settings_vbox.add_child(settings_label)
	sfx_toggle_button = Button.new()
	sfx_toggle_button.name = "SfxToggleButton"
	sfx_toggle_button.pressed.connect(_on_sfx_toggle_pressed)
	settings_vbox.add_child(sfx_toggle_button)
	music_toggle_button = Button.new()
	music_toggle_button.name = "MusicToggleButton"
	music_toggle_button.pressed.connect(_on_music_toggle_pressed)
	settings_vbox.add_child(music_toggle_button)
	volume_button = Button.new()
	volume_button.name = "VolumePresetButton"
	volume_button.pressed.connect(_on_volume_pressed)
	settings_vbox.add_child(volume_button)
	var settings_close := Button.new()
	settings_close.name = "SettingsCloseButton"
	settings_close.text = "Close"
	settings_close.pressed.connect(_on_settings_close_pressed)
	settings_vbox.add_child(settings_close)


func _layout_ui() -> void:
	for control in [
		ai_left_panel,
		ai_right_panel,
		bottom_cards_box,
		trick_panel,
		status_label,
		hand_summary_label,
		scoreboard_panel,
		action_bar,
		hand_area,
		result_panel,
		help_blocker,
		help_panel,
		settings_blocker,
		settings_panel,
	]:
		_pin_top_left(control)
	help_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	settings_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	var viewport_size := debug_viewport_override
	if viewport_size == Vector2.ZERO:
		viewport_size = BASE_VIEWPORT
	if debug_viewport_override == Vector2.ZERO and is_inside_tree():
		viewport_size = get_viewport_rect().size
	if viewport_size.x <= 0.0 or viewport_size.y <= 0.0:
		viewport_size = BASE_VIEWPORT
	layout_scale = clampf(min(viewport_size.x / BASE_VIEWPORT.x, viewport_size.y / BASE_VIEWPORT.y), 0.82, 1.14)
	var margin := 28.0 * layout_scale
	var seat_size := Vector2(min(320.0 * layout_scale, viewport_size.x * 0.28), 132.0 * layout_scale)
	ai_left_panel.position = Vector2(margin, margin * 0.85)
	ai_left_panel.custom_minimum_size = seat_size
	ai_left_panel.size = seat_size
	_layout_seat_content(ai_left_panel, seat_size)
	ai_right_panel.position = Vector2(viewport_size.x - margin - seat_size.x, margin * 0.85)
	ai_right_panel.custom_minimum_size = seat_size
	ai_right_panel.size = seat_size
	_layout_seat_content(ai_right_panel, seat_size)

	var card_size := _card_size()
	var bottom_size := Vector2((card_size.x * 3.0) + (8.0 * layout_scale * 2.0), card_size.y + 12.0 * layout_scale)
	bottom_cards_box.position = Vector2((viewport_size.x - bottom_size.x) * 0.5, margin)
	bottom_cards_box.custom_minimum_size = bottom_size
	bottom_cards_box.size = bottom_size
	bottom_cards_box.add_theme_constant_override("separation", int(8.0 * layout_scale))

	var trick_size := Vector2(clampf(viewport_size.x * 0.46, 480.0 * layout_scale, 620.0 * layout_scale), 170.0 * layout_scale)
	trick_panel.position = Vector2((viewport_size.x - trick_size.x) * 0.5, viewport_size.y * 0.30)
	trick_panel.custom_minimum_size = trick_size
	trick_panel.size = trick_size
	trick_box.add_theme_constant_override("separation", int(6.0 * layout_scale))

	var status_size := Vector2(clampf(viewport_size.x * 0.62, 560.0 * layout_scale, 820.0 * layout_scale), 48.0 * layout_scale)
	status_label.position = Vector2((viewport_size.x - status_size.x) * 0.5, trick_panel.position.y + trick_size.y + 14.0 * layout_scale)
	status_label.custom_minimum_size = status_size
	status_label.size = status_size
	status_label.add_theme_font_size_override("font_size", int(18.0 * layout_scale))

	var summary_size := Vector2(clampf(viewport_size.x * 0.62, 560.0 * layout_scale, 820.0 * layout_scale), 34.0 * layout_scale)
	hand_summary_label.position = Vector2(
		(viewport_size.x - summary_size.x) * 0.5,
		status_label.position.y + status_size.y + 4.0 * layout_scale
	)
	hand_summary_label.custom_minimum_size = summary_size
	hand_summary_label.size = summary_size
	hand_summary_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))

	var scoreboard_size := Vector2(clampf(viewport_size.x * 0.44, 460.0 * layout_scale, 620.0 * layout_scale), 34.0 * layout_scale)
	scoreboard_panel.position = Vector2((viewport_size.x - scoreboard_size.x) * 0.5, bottom_cards_box.position.y + bottom_size.y + 8.0 * layout_scale)
	scoreboard_panel.custom_minimum_size = scoreboard_size
	scoreboard_panel.size = scoreboard_size
	scoreboard_label.custom_minimum_size = scoreboard_size - Vector2(16.0 * layout_scale, 6.0 * layout_scale)
	scoreboard_label.size = scoreboard_label.custom_minimum_size
	scoreboard_label.add_theme_font_size_override("font_size", int(15.0 * layout_scale))

	var hand_size := Vector2(viewport_size.x - (margin * 2.0), 128.0 * layout_scale)
	hand_area.position = Vector2(margin, viewport_size.y - margin - hand_size.y)
	hand_area.custom_minimum_size = hand_size
	hand_area.size = hand_size

	var action_size := Vector2(min(620.0 * layout_scale, viewport_size.x - margin * 2.0), 48.0 * layout_scale)
	action_bar.position = Vector2(viewport_size.x - margin - action_size.x, hand_area.position.y - action_size.y - 14.0 * layout_scale)
	action_bar.custom_minimum_size = action_size
	action_bar.size = action_size
	action_bar.add_theme_constant_override("separation", int(8.0 * layout_scale))
	for button in [call_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button]:
		button.custom_minimum_size = Vector2(88.0 * layout_scale, 42.0 * layout_scale)

	var result_size := Vector2(clampf(viewport_size.x * 0.48, 560.0 * layout_scale, 700.0 * layout_scale), 270.0 * layout_scale)
	result_panel.position = Vector2((viewport_size.x - result_size.x) * 0.5, (viewport_size.y - result_size.y) * 0.40)
	result_panel.custom_minimum_size = result_size
	result_panel.size = result_size
	result_label.custom_minimum_size = Vector2(result_size.x - 36.0 * layout_scale, 164.0 * layout_scale)
	result_label.size = result_label.custom_minimum_size
	result_label.add_theme_font_size_override("font_size", int(20.0 * layout_scale))
	result_actions_bar.custom_minimum_size = Vector2(result_size.x - 36.0 * layout_scale, 42.0 * layout_scale)
	result_actions_bar.size = result_actions_bar.custom_minimum_size
	result_actions_bar.add_theme_constant_override("separation", int(10.0 * layout_scale))
	for button in [result_new_hand_button, result_new_match_button, quit_button]:
		button.custom_minimum_size = Vector2(132.0 * layout_scale, 38.0 * layout_scale)

	var help_size := Vector2(clampf(viewport_size.x * 0.54, 520.0 * layout_scale, 680.0 * layout_scale), 230.0 * layout_scale)
	help_panel.position = Vector2((viewport_size.x - help_size.x) * 0.5, (viewport_size.y - help_size.y) * 0.38)
	help_panel.custom_minimum_size = help_size
	help_panel.size = help_size
	help_label.custom_minimum_size = Vector2(help_size.x - 32.0 * layout_scale, 160.0 * layout_scale)
	help_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))

	var settings_size := Vector2(360.0 * layout_scale, 240.0 * layout_scale)
	settings_panel.position = Vector2(viewport_size.x - margin - settings_size.x, action_bar.position.y - settings_size.y - 10.0 * layout_scale)
	settings_panel.custom_minimum_size = settings_size
	settings_panel.size = settings_size
	settings_label.custom_minimum_size = Vector2(settings_size.x - 32.0 * layout_scale, 54.0 * layout_scale)
	settings_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))


func _seat_panel(node_name: String) -> Panel:
	var panel := Panel.new()
	panel.name = node_name
	var box := VBoxContainer.new()
	box.name = "Content"
	_pin_top_left(box)
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	for label_name in ["Name", "Role", "Count", "Turn", "Recent", "Reason"]:
		var label := Label.new()
		label.name = label_name
		label.text = label_name
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
	return panel


func _layout_seat_content(panel: Panel, seat_size: Vector2) -> void:
	var box: VBoxContainer = panel.get_node("Content")
	var inset := Vector2(10.0 * layout_scale, 8.0 * layout_scale)
	box.position = inset
	box.custom_minimum_size = seat_size - inset * 2.0
	box.size = box.custom_minimum_size


func _pin_top_left(control: Control) -> void:
	control.set_anchors_preset(Control.PRESET_TOP_LEFT, true)


func _action_button(node_name: String, text: String, callback: Callable) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.pressed.connect(callback)
	action_bar.add_child(button)
	return button


func _refresh() -> void:
	_apply_result_score_once()
	_refresh_seat(ai_left_panel, DoudizhuGame.AI_LEFT)
	_refresh_seat(ai_right_panel, DoudizhuGame.AI_RIGHT)
	_refresh_bottom_cards()
	_refresh_trick()
	_refresh_hand()
	_refresh_actions()
	status_label.text = game.message
	hand_summary_label.text = game.hand_summary_text()
	scoreboard_label.text = score_state.score_line()
	trick_panel.visible = game.phase != "result"
	result_panel.visible = game.phase == "result"
	result_label.text = _result_summary_text()
	result_new_hand_button.visible = not score_state.match_complete
	result_new_match_button.visible = score_state.match_complete
	help_label.text = game.rules_help_text()
	help_blocker.visible = help_visible
	help_panel.visible = help_visible
	_refresh_settings_ui()


func _refresh_seat(panel: Panel, seat: int) -> void:
	var box := panel.get_node("Content")
	box.get_node("Name").text = DoudizhuGame.SEAT_NAMES[seat]
	box.get_node("Role").text = "Role: %s" % game.roles[seat]
	box.get_node("Count").text = "Cards: %d" % game.hands[seat].size()
	box.get_node("Turn").text = "TURN" if game.current_seat == seat and game.phase == "play" else ""
	box.get_node("Recent").text = "Recent: %s" % (game.recent_plays[seat] if game.recent_plays[seat] != "" else "-")
	box.get_node("Reason").text = "Why: %s" % (game.ai_reasons[seat] if game.ai_reasons[seat] != "" else "-")
	var active := game.current_seat == seat and game.phase == "play"
	panel.add_theme_stylebox_override("panel", _panel_style(active))


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
	var card_size := _card_size()
	var step: float = CARD_SIZE.x + CARD_GAP
	if count > 1:
		step = min(card_size.x + (CARD_GAP * layout_scale), (hand_area.size.x - card_size.x) / float(count - 1))
	for index in range(cards.size()):
		var card: Dictionary = cards[index]
		var selected := game.selected_cards.has(int(card.id))
		var button := _card_button(card, true, selected)
		var target_position := Vector2(index * step, 18.0 * layout_scale if not selected else 0.0)
		button.position = target_position
		hand_area.add_child(button)
		if selected:
			button.position = target_position + Vector2(0.0, 10.0 * layout_scale)
			var tween := create_tween()
			tween.tween_property(button, "position", target_position, 0.08)


func _refresh_actions() -> void:
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


func _refresh_settings_ui() -> void:
	settings_blocker.visible = settings_visible
	settings_panel.visible = settings_visible
	settings_label.text = "Audio settings apply immediately during this hand."
	sfx_toggle_button.text = "SFX: %s" % ("On" if audio_controller.sfx_enabled else "Off")
	music_toggle_button.text = "Music: %s" % ("On" if audio_controller.music_enabled else "Off")
	volume_button.text = "Volume: %s" % audio_controller.volume_preset.capitalize()


func _apply_result_score_once() -> Dictionary:
	if game.phase != "result":
		return score_state.debug_state()
	var summary := game.result_summary()
	return score_state.apply_hand_result(
		String(summary.winner_side),
		int(summary.landlord_seat),
		String(summary.result_key)
	)


func _result_summary_text() -> String:
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


func _play_result_audio_if_needed() -> void:
	if game.phase != "result":
		return
	if game.winner_side == "landlord" and game.landlord_seat == DoudizhuGame.HUMAN:
		audio_controller.play_event("result_win")
	elif game.winner_side == "farmers" and game.landlord_seat != DoudizhuGame.HUMAN:
		audio_controller.play_event("result_win")
	else:
		audio_controller.play_event("result_loss")


func _card_button(card: Dictionary, interactive: bool, selected: bool) -> Button:
	var button := Button.new()
	var card_size := _card_size()
	button.custom_minimum_size = card_size
	button.size = card_size
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
		button.modulate = SELECTED_CARD_COLOR if selected else _card_color(card)
		button.add_theme_stylebox_override("normal", _card_style(card, selected))
		button.add_theme_stylebox_override("hover", _card_style(card, true))
		button.add_theme_stylebox_override("pressed", _card_style(card, true))
		button.add_theme_color_override("font_color", _card_text_color(card))
		button.add_theme_font_size_override("font_size", int(16.0 * layout_scale))
		if interactive:
			button.pressed.connect(func() -> void:
				game.toggle_selection(int(card.id))
				audio_controller.play_event("select")
				_refresh()
			)
	return button


func _card_size() -> Vector2:
	return CARD_SIZE * layout_scale


func _panel_style(active: bool) -> StyleBoxFlat:
	var style := _box_style(
		ACTIVE_PANEL_COLOR if active else PANEL_COLOR,
		ACTIVE_BORDER_COLOR if active else Color(0.0, 0.0, 0.0, 0.0),
		2 if active else 0
	)
	style.content_margin_left = 10.0 * layout_scale
	style.content_margin_top = 8.0 * layout_scale
	style.content_margin_right = 10.0 * layout_scale
	style.content_margin_bottom = 8.0 * layout_scale
	return style


func _box_style(bg_color: Color, border_color: Color, border_width := 1) -> StyleBoxFlat:
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


func _button_style(highlighted: bool) -> StyleBoxFlat:
	var style := _box_style(
		Color(0.13, 0.2, 0.17, 1.0) if highlighted else Color(0.09, 0.15, 0.13, 1.0),
		ACTIVE_BORDER_COLOR if highlighted else Color(0.18, 0.26, 0.22, 1.0)
	)
	style.content_margin_left = 14
	style.content_margin_top = 8
	style.content_margin_right = 14
	style.content_margin_bottom = 8
	return style


func _card_style(card: Dictionary, selected: bool) -> StyleBoxFlat:
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


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		node.remove_child(child)
		child.queue_free()


func _on_call_pressed() -> void:
	game.resolve_landlord(true)
	audio_controller.play_event("landlord")
	_play_result_audio_if_needed()
	_refresh()


func _on_decline_pressed() -> void:
	game.resolve_landlord(false)
	audio_controller.play_event("landlord")
	_play_result_audio_if_needed()
	_refresh()


func _on_play_pressed() -> void:
	var played := game.play_selected()
	if played:
		audio_controller.play_event("play")
		_play_result_audio_if_needed()
	else:
		audio_controller.play_event("invalid")
	_refresh()


func _on_pass_pressed() -> void:
	var passed := game.pass_turn()
	if passed:
		audio_controller.play_event("pass")
		_play_result_audio_if_needed()
	else:
		audio_controller.play_event("invalid")
	_refresh()


func _on_hint_pressed() -> void:
	game.hint()
	_refresh()


func _on_help_pressed() -> void:
	help_visible = true
	_refresh()


func _on_help_close_pressed() -> void:
	help_visible = false
	_refresh()


func _on_settings_pressed() -> void:
	settings_visible = true
	_refresh()


func _on_settings_close_pressed() -> void:
	settings_visible = false
	_refresh()


func _on_sfx_toggle_pressed() -> void:
	audio_controller.toggle_sfx()
	_refresh()


func _on_music_toggle_pressed() -> void:
	audio_controller.toggle_music()
	_refresh()


func _on_volume_pressed() -> void:
	var next_preset := "normal"
	if audio_controller.volume_preset == "normal":
		next_preset = "quiet"
	elif audio_controller.volume_preset == "quiet":
		next_preset = "loud"
	audio_controller.set_volume_preset(next_preset)
	_refresh()


func _on_quit_pressed() -> void:
	quit_requested = true
	game.message = "Quit requested. Close the window when ready."
	audio_controller.play_event("pass")
	_refresh()


func _on_new_hand_pressed() -> void:
	help_visible = false
	settings_visible = false
	quit_requested = false
	audio_controller.play_event("play")
	_start_new_round()


func _on_new_match_pressed() -> void:
	help_visible = false
	settings_visible = false
	quit_requested = false
	audio_controller.play_event("play")
	_start_new_match()


func _on_new_round_pressed() -> void:
	_on_new_hand_pressed()


func debug_finish_human_win() -> void:
	game.force_finish_for_human_win()
	_play_result_audio_if_needed()
	_refresh()


func debug_configure_expanded_rule_fixture() -> void:
	game.debug_configure_expanded_rule_fixture()
	_refresh()


func debug_configure_bomb_conservation_fixture() -> void:
	game.debug_configure_bomb_conservation_fixture()
	_refresh()


func debug_selected_count() -> int:
	return game.selected_cards.size()


func debug_human_card_count() -> int:
	return game.hands[DoudizhuGame.HUMAN].size()


func debug_status_text() -> String:
	return game.message


func debug_active_trick_type() -> String:
	return String(game.active_trick.get("play_type", ""))


func debug_hand_summary_text() -> String:
	return game.hand_summary_text()


func debug_ai_reason(seat: int) -> String:
	return game.ai_reasons[seat]


func debug_help_visible() -> bool:
	return help_panel.visible


func debug_audio_state() -> Dictionary:
	return audio_controller.debug_state()


func debug_score_state() -> Dictionary:
	return score_state.debug_state()


func debug_scoreboard_text() -> String:
	return scoreboard_label.text


func debug_result_text() -> String:
	return result_label.text


func simulate_apply_result_score() -> Dictionary:
	var result := _apply_result_score_once()
	_refresh()
	return result


func simulate_new_hand() -> void:
	_on_new_hand_pressed()


func simulate_new_match() -> void:
	_on_new_match_pressed()


func debug_settings_visible() -> bool:
	return settings_panel.visible


func debug_quit_requested() -> bool:
	return quit_requested


func debug_layout_snapshot() -> Dictionary:
	return {
		"viewport": debug_viewport_override if debug_viewport_override != Vector2.ZERO else get_viewport_rect().size,
		"scale": layout_scale,
		"hand_rect": Rect2(hand_area.global_position, hand_area.size),
		"action_rect": Rect2(action_bar.global_position, action_bar.size),
		"status_rect": Rect2(status_label.global_position, status_label.size),
		"summary_rect": Rect2(hand_summary_label.global_position, hand_summary_label.size),
		"scoreboard_rect": Rect2(scoreboard_panel.global_position, scoreboard_panel.size),
		"trick_rect": Rect2(trick_panel.global_position, trick_panel.size),
		"ai_left_rect": Rect2(ai_left_panel.global_position, ai_left_panel.size),
		"ai_right_rect": Rect2(ai_right_panel.global_position, ai_right_panel.size),
		"result_rect": Rect2(result_panel.global_position, result_panel.size),
		"result_text_rect": Rect2(result_label.global_position, result_label.size),
		"result_actions_rect": Rect2(result_actions_bar.global_position, result_actions_bar.size),
		"result_new_hand_rect": Rect2(result_new_hand_button.global_position, result_new_hand_button.size),
		"result_new_match_rect": Rect2(result_new_match_button.global_position, result_new_match_button.size),
		"result_quit_rect": Rect2(quit_button.global_position, quit_button.size),
		"help_rect": Rect2(help_panel.global_position, help_panel.size),
	}


func debug_layout_snapshot_for_viewport(viewport_size: Vector2) -> Dictionary:
	debug_viewport_override = viewport_size
	_layout_ui()
	_refresh()
	var snapshot := debug_layout_snapshot()
	debug_viewport_override = Vector2.ZERO
	return snapshot


func debug_visible_hand_card_rects() -> Array:
	var rects: Array = []
	for child in hand_area.get_children():
		if child is Control and child.name.begins_with("Card_") and child.is_visible_in_tree():
			rects.append(child.get_global_rect())
	return rects
