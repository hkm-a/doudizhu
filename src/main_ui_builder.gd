class_name MainUIBuilder
extends RefCounted

const PANEL_COLOR := Color(0.05, 0.16, 0.12, 0.9)
const ACTIVE_BORDER_COLOR := Color(0.95, 0.72, 0.25)
const RESULT_PANEL_COLOR := Color(0.08, 0.11, 0.1, 0.96)
const SELECTED_CARD_COLOR := Color(1.0, 0.94, 0.55)


func build_ui(main: Control, loc: LocalizationUtils, layout_scale: float, card_assets_cls) -> Dictionary:
	card_assets_cls.initialize()

	var table_bg_texture := card_assets_cls.get_table_bg()
	if table_bg_texture != null:
		var bg_sprite := TextureRect.new()
		bg_sprite.name = "TableBackground"
		bg_sprite.texture = table_bg_texture
		bg_sprite.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_COVERED
		bg_sprite.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		bg_sprite.mouse_filter = Control.MOUSE_FILTER_IGNORE
		bg_sprite.set_anchors_preset(Control.PRESET_FULL_RECT)
		main.add_child(bg_sprite)
	else:
		var background := ColorRect.new()
		background.name = "TableBackground"
		background.color = TABLE_COLOR
		background.mouse_filter = Control.MOUSE_FILTER_IGNORE
		background.set_anchors_preset(Control.PRESET_FULL_RECT)
		main.add_child(background)

	var ai_left_panel := _seat_panel(main, "AILeftPanel", loc, layout_scale)
	var ai_right_panel := _seat_panel(main, "AIRightPanel", loc, layout_scale)
	_pin_top_left(main, ai_left_panel)
	_pin_top_left(main, ai_right_panel)
	_pin_top_left(main, ai_left_panel)
	_pin_top_left(main, ai_right_panel)
	main.add_child(ai_left_panel)
	main.add_child(ai_right_panel)

	# AI left hand card container
	var ai_left_hand := Control.new()
	ai_left_hand.name = "AILeftHand"
	ai_left_hand.visible = false  # hidden until phase == "play"
	_pin_top_left(main, ai_left_hand)
	main.add_child(ai_left_hand)

	# AI right hand card container
	var ai_right_hand := Control.new()
	ai_right_hand.name = "AIRightHand"
	ai_right_hand.visible = false  # hidden until phase == "play"
	_pin_top_left(main, ai_right_hand)
	main.add_child(ai_right_hand)

	var bottom_cards_box := HBoxContainer.new()
	bottom_cards_box.name = "BottomCards"
	_pin_top_left(main, bottom_cards_box)
	bottom_cards_box.add_theme_constant_override("separation", 6)
	main.add_child(bottom_cards_box)

	var trick_panel := PanelContainer.new()
	trick_panel.name = "TrickPanel"
	_pin_top_left(main, trick_panel)
	trick_panel.add_theme_stylebox_override("panel", _box_style(PANEL_COLOR, Color(0.03, 0.1, 0.08), layout_scale))
	main.add_child(trick_panel)
	var trick_vbox := VBoxContainer.new()
	trick_vbox.name = "TrickLayout"
	trick_vbox.add_theme_constant_override("separation", 8)
	trick_panel.add_child(trick_vbox)
	var trick_owner_label := Label.new()
	trick_owner_label.name = "TrickOwner"
	trick_owner_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	trick_vbox.add_child(trick_owner_label)
	var trick_box := HBoxContainer.new()
	trick_box.name = "CurrentTrick"
	trick_box.alignment = BoxContainer.ALIGNMENT_CENTER
	trick_box.add_theme_constant_override("separation", 6)
	trick_vbox.add_child(trick_box)

	var status_label := Label.new()
	status_label.name = "StatusMessage"
	_pin_top_left(main, status_label)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	main.add_child(status_label)

	var hand_summary_label := Label.new()
	hand_summary_label.name = "HandSummary"
	_pin_top_left(main, hand_summary_label)
	hand_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hand_summary_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	hand_summary_label.add_theme_color_override("font_color", Color(0.92, 0.96, 0.9))
	main.add_child(hand_summary_label)

	var score_label := Label.new()
	score_label.name = "ScoreText"
	score_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	score_label.add_theme_color_override("font_color", Color(0.96, 0.94, 0.76))
	score_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))
	main.add_child(score_label)

	var stats_label := Label.new()
	stats_label.name = "StatsText"
	stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stats_label.add_theme_color_override("font_color", Color(0.86, 0.94, 0.84))
	stats_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))
	main.add_child(stats_label)

	var action_bar := HBoxContainer.new()
	action_bar.name = "ActionBar"
	_pin_top_left(main, action_bar)
	action_bar.add_theme_constant_override("separation", 8)
	main.add_child(action_bar)

	var call_button := _action_button(main, action_bar, "CallLandlordButton", loc.string("action.call_landlord"), loc, layout_scale)
	var decline_button := _action_button(main, action_bar, "DeclineLandlordButton", loc.string("action.decline_landlord"), loc, layout_scale)
	var play_button := _action_button(main, action_bar, "PlayButton", loc.string("action.play"), loc, layout_scale)
	var pass_button := _action_button(main, action_bar, "PassButton", loc.string("action.pass"), loc, layout_scale)
	var hint_button := _action_button(main, action_bar, "HintButton", loc.string("action.hint"), loc, layout_scale)
	var help_button := _action_button(main, action_bar, "HelpButton", loc.string("label.help"), loc, layout_scale)
	var tutorial_button := _action_button(main, action_bar, "TutorialButton", "Tutorial", loc, layout_scale)
	var settings_button := _action_button(main, action_bar, "SettingsButton", loc.string("label.settings"), loc, layout_scale)
	var new_round_button := _action_button(main, action_bar, "NewHandButton", loc.string("result.new_hand"), loc, layout_scale)

	var hand_area := Control.new()
	hand_area.name = "PlayerHand"
	_pin_top_left(main, hand_area)
	main.add_child(hand_area)

	var result_panel := PanelContainer.new()
	result_panel.name = "ResultBanner"
	_pin_top_left(main, result_panel)
	result_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 3, layout_scale))
	main.add_child(result_panel)
	var result_vbox := VBoxContainer.new()
	result_vbox.name = "ResultLayout"
	result_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	result_vbox.add_theme_constant_override("separation", 12)
	result_panel.add_child(result_vbox)
	var result_label := Label.new()
	result_label.name = "ResultText"
	result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_label.add_theme_font_size_override("font_size", 24)
	result_vbox.add_child(result_label)
	var result_actions_bar := HBoxContainer.new()
	result_actions_bar.name = "ResultActions"
	result_actions_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	result_actions_bar.add_theme_constant_override("separation", 10)
	result_vbox.add_child(result_actions_bar)
	var result_new_hand_button := _result_button(result_actions_bar, loc.string("result.new_hand"), loc, layout_scale)
	var result_new_match_button := _result_button(result_actions_bar, loc.string("result.new_match"), loc, layout_scale)
	var quit_button := _result_button(result_actions_bar, loc.string("result.quit"), loc, layout_scale)

	var help_blocker := ColorRect.new()
	help_blocker.name = "HelpModalBlocker"
	help_blocker.color = Color(0, 0, 0, 0.18)
	help_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	help_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	main.add_child(help_blocker)

	var help_panel := PanelContainer.new()
	help_panel.name = "HelpPanel"
	_pin_top_left(main, help_panel)
	help_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 2, layout_scale))
	main.add_child(help_panel)
	var help_vbox := VBoxContainer.new()
	help_vbox.name = "HelpLayout"
	help_vbox.add_theme_constant_override("separation", 10)
	help_panel.add_child(help_vbox)
	var help_label := Label.new()
	help_label.name = "HelpText"
	help_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help_label.add_theme_color_override("font_color", Color.WHITE)
	help_vbox.add_child(help_label)
	var help_close_button := _modal_close_button(help_vbox, loc, layout_scale)

	var tutorial_panel := PanelContainer.new()
	tutorial_panel.name = "TutorialPanel"
	tutorial_panel.visible = false
	tutorial_panel.add_theme_stylebox_override("panel", _box_style(Color(0.08, 0.12, 0.18, 0.96), ACTIVE_BORDER_COLOR, 2, layout_scale))
	main.add_child(tutorial_panel)
	var tutorial_vbox := VBoxContainer.new()
	tutorial_vbox.name = "TutorialLayout"
	tutorial_vbox.add_theme_constant_override("separation", 8)
	tutorial_panel.add_child(tutorial_vbox)
	var tutorial_title_label := Label.new()
	tutorial_title_label.name = "TutorialTitle"
	tutorial_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tutorial_title_label.add_theme_color_override("font_color", Color(1.0, 0.92, 0.58))
	tutorial_vbox.add_child(tutorial_title_label)
	var tutorial_body_label := Label.new()
	tutorial_body_label.name = "TutorialBody"
	tutorial_body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tutorial_body_label.add_theme_color_override("font_color", Color.WHITE)
	tutorial_vbox.add_child(tutorial_body_label)
	var tutorial_step_label := Label.new()
	tutorial_step_label.name = "TutorialStep"
	tutorial_step_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tutorial_step_label.add_theme_color_override("font_color", Color(0.82, 0.9, 1.0))
	tutorial_vbox.add_child(tutorial_step_label)
	var tutorial_actions := HBoxContainer.new()
	tutorial_actions.name = "TutorialActions"
	tutorial_actions.alignment = BoxContainer.ALIGNMENT_CENTER
	tutorial_actions.add_theme_constant_override("separation", 8)
	tutorial_vbox.add_child(tutorial_actions)
	var tutorial_back_button := _tutorial_button(tutorial_actions, loc.string("label.back"), loc, layout_scale)
	var tutorial_next_button := _tutorial_button(tutorial_actions, loc.string("label.next"), loc, layout_scale)
	var tutorial_close_button := _tutorial_close_button(tutorial_actions, loc, layout_scale)

	var tutorial_blocker := ColorRect.new()
	tutorial_blocker.name = "TutorialModalBlocker"
	tutorial_blocker.color = Color(0, 0, 0, 0.18)
	tutorial_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	tutorial_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	main.add_child(tutorial_blocker)

	var settings_blocker := ColorRect.new()
	settings_blocker.name = "SettingsModalBlocker"
	settings_blocker.color = Color(0.0, 0.0, 0.0, 0.28)
	settings_blocker.visible = false
	settings_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	settings_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	main.add_child(settings_blocker)

	var continue_overlay := _create_continue_dialog(main, loc, layout_scale)

	var settings_panel := PanelContainer.new()
	settings_panel.name = "SettingsPanel"
	_pin_top_left(main, settings_panel)
	settings_panel.visible = false
	settings_panel.add_theme_stylebox_override("panel", _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 2, layout_scale))
	main.add_child(settings_panel)
	var settings_vbox := VBoxContainer.new()
	settings_vbox.name = "SettingsLayout"
	settings_vbox.add_theme_constant_override("separation", 8)
	settings_panel.add_child(settings_vbox)
	var settings_label := Label.new()
	settings_label.name = "SettingsText"
	settings_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	settings_label.add_theme_color_override("font_color", Color.WHITE)
	settings_vbox.add_child(settings_label)
	var sfx_toggle_button := _settings_toggle_button(settings_vbox, loc, layout_scale)
	var music_toggle_button := _settings_toggle_button(settings_vbox, loc, layout_scale)
	var volume_button := _settings_preset_button(settings_vbox, loc, layout_scale)
	var stats_reset_button := _settings_action_button(settings_vbox, loc, layout_scale)
	var ai_difficulty_button := _settings_action_button(settings_vbox, loc, layout_scale)
	var save_button := Button.new()
	save_button.name = "SaveGameButton"
	save_button.text = "Save Game"
	save_button.focus_mode = Control.FOCUS_NONE
	settings_vbox.add_child(save_button)
	var load_button := Button.new()
	load_button.name = "LoadGameButton"
	load_button.text = "Load Game"
	load_button.focus_mode = Control.FOCUS_NONE
	settings_vbox.add_child(load_button)
	var settings_close_button := _modal_close_button(settings_vbox, loc, layout_scale)

	# Return all created controls as a dictionary
	var controls := {}
	controls.ai_left_panel = ai_left_panel
	controls.ai_right_panel = ai_right_panel
	controls.ai_left_hand = ai_left_hand
	controls.ai_right_hand = ai_right_hand
	controls.bottom_cards_box = bottom_cards_box
	controls.trick_panel = trick_panel
	controls.trick_box = trick_box
	controls.trick_owner_label = trick_owner_label
	controls.status_label = status_label
	controls.hand_summary_label = hand_summary_label
	controls.scoreboard_label = score_label
	controls.stats_label = stats_label
	controls.action_bar = action_bar
	controls.call_button = call_button
	controls.decline_button = decline_button
	controls.play_button = play_button
	controls.pass_button = pass_button
	controls.hint_button = hint_button
	controls.help_button = help_button
	controls.tutorial_button = tutorial_button
	controls.settings_button = settings_button
	controls.new_round_button = new_round_button
	controls.hand_area = hand_area
	controls.result_panel = result_panel
	controls.result_label = result_label
	controls.result_actions_bar = result_actions_bar
	controls.result_new_hand_button = result_new_hand_button
	controls.result_new_match_button = result_new_match_button
	controls.quit_button = quit_button
	controls.help_blocker = help_blocker
	controls.help_panel = help_panel
	controls.help_label = help_label
	controls.help_close_button = help_close_button
	controls.tutorial_panel = tutorial_panel
	controls.tutorial_blocker = tutorial_blocker
	controls.tutorial_title_label = tutorial_title_label
	controls.tutorial_body_label = tutorial_body_label
	controls.tutorial_step_label = tutorial_step_label
	controls.tutorial_back_button = tutorial_back_button
	controls.tutorial_next_button = tutorial_next_button
	controls.tutorial_close_button = tutorial_close_button
	controls.settings_blocker = settings_blocker
	controls.settings_panel = settings_panel
	controls.settings_label = settings_label
	controls.settings_close_button = settings_close_button
	controls.sfx_toggle_button = sfx_toggle_button
	controls.music_toggle_button = music_toggle_button
	controls.volume_button = volume_button
	controls.stats_reset_button = stats_reset_button
	controls.ai_difficulty_button = ai_difficulty_button
	controls.save_button = save_button
	controls.load_button = load_button
	controls.continue_overlay = continue_overlay
	return controls


func _pin_top_left(main: Control, control: Control) -> void:
	control.set_anchors_preset(Control.PRESET_TOP_LEFT, true)


func _seat_panel(main: Control, node_name: String, loc: LocalizationUtils, layout_scale: float) -> Panel:
	var panel := Panel.new()
	panel.name = node_name
	var box := VBoxContainer.new()
	box.name = "Content"
	box.set_anchors_preset(Control.PRESET_TOP_LEFT, true)
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	for label_name in ["Name", "Role", "Count", "Turn", "Recent", "Reason"]:
		var label := Label.new()
		label.name = label_name
		var key: String = "label." + label_name.to_lower()
		label.text = loc.string(key)
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
	return panel


func _action_button(main: Control, action_bar: HBoxContainer, node_name: String, text: String, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	button.name = node_name
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	action_bar.add_child(button)
	return button


func _result_button(parent: Container, text: String, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(128, 42)
	button.add_theme_stylebox_override("normal", _button_style(false, layout_scale))
	button.add_theme_stylebox_override("hover", _button_style(true, layout_scale))
	button.add_theme_stylebox_override("pressed", _button_style(true, layout_scale))
	parent.add_child(button)
	return button


func _modal_close_button(parent: Container, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	button.text = loc.string("label.close")
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_stylebox_override("normal", _button_style(false, layout_scale))
	button.add_theme_stylebox_override("hover", _button_style(true, layout_scale))
	button.add_theme_stylebox_override("pressed", _button_style(true, layout_scale))
	parent.add_child(button)
	return button


func _tutorial_button(parent: Container, text: String, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	parent.add_child(button)
	return button


func _tutorial_close_button(parent: Container, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	button.text = loc.string("label.close")
	button.focus_mode = Control.FOCUS_NONE
	parent.add_child(button)
	return button


func _create_continue_dialog(main: Control, loc: LocalizationUtils, layout_scale: float) -> ColorRect:
	var overlay := ColorRect.new()
	overlay.name = "ContinueOverlay"
	overlay.color = Color(0.0, 0.0, 0.0, 0.65)
	overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.visible = false

	var panel := PanelContainer.new()
	panel.name = "ContinuePanel"
	var style := _box_style(RESULT_PANEL_COLOR, ACTIVE_BORDER_COLOR, 2, layout_scale)
	style.content_margin_left = 32.0
	style.content_margin_top = 24.0
	style.content_margin_right = 32.0
	style.content_margin_bottom = 24.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.name = "ContinueLayout"
	vbox.add_theme_constant_override("separation", 14)

	var title_label := Label.new()
	title_label.name = "ContinueTitle"
	title_label.text = "Save Found"
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title_label.add_theme_font_size_override("font_size", int(22.0 * layout_scale))
	title_label.add_theme_color_override("font_color", ACTIVE_BORDER_COLOR)
	vbox.add_child(title_label)

	var body_label := Label.new()
	body_label.name = "ContinueBody"
	body_label.text = "A previous game was saved. Would you like to continue from where you left off?"
	body_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	body_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	body_label.add_theme_color_override("font_color", Color.WHITE)
	vbox.add_child(body_label)

	var actions := HBoxContainer.new()
	actions.name = "ContinueActions"
	actions.alignment = BoxContainer.ALIGNMENT_CENTER
	actions.add_theme_constant_override("separation", 16)

	var continue_btn := Button.new()
	continue_btn.name = "ContinueBtn"
	continue_btn.text = "Continue"
	continue_btn.custom_minimum_size = Vector2(140, 40)
	continue_btn.add_theme_stylebox_override("normal", _button_style(false, layout_scale))
	continue_btn.add_theme_stylebox_override("hover", _button_style(true, layout_scale))
	continue_btn.add_theme_stylebox_override("pressed", _button_style(true, layout_scale))
	actions.add_child(continue_btn)

	var new_game_btn := Button.new()
	new_game_btn.name = "NewGameBtn"
	new_game_btn.text = "New Game"
	new_game_btn.custom_minimum_size = Vector2(140, 40)
	new_game_btn.add_theme_stylebox_override("normal", _button_style(false, layout_scale))
	new_game_btn.add_theme_stylebox_override("hover", _button_style(true, layout_scale))
	new_game_btn.add_theme_stylebox_override("pressed", _button_style(true, layout_scale))
	actions.add_child(new_game_btn)

	vbox.add_child(actions)
	panel.add_child(vbox)
	panel.position = Vector2((BASE_VIEWPORT.x - 480.0) * 0.5, (BASE_VIEWPORT.y - 260.0) * 0.5)
	panel.custom_minimum_size = Vector2(480.0, 260.0)
	panel.size = Vector2(480.0, 260.0)
	overlay.add_child(panel)

	return overlay


func _settings_toggle_button(parent: Container, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	parent.add_child(button)
	return button


func _settings_preset_button(parent: Container, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	parent.add_child(button)
	return button


func _settings_action_button(parent: Container, loc: LocalizationUtils, layout_scale: float) -> Button:
	var button := Button.new()
	parent.add_child(button)
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


func _card_color(card: Dictionary) -> Color:
	if String(card.suit) == "H" or String(card.suit) == "D":
		return Color(1.0, 0.86, 0.86)
	if int(card.rank) >= 16:
		return Color(0.86, 0.9, 1.0)
	return Color.WHITE


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


func _button_style(highlighted: bool, layout_scale: float) -> StyleBoxFlat:
	var style := _box_style(
		Color(0.13, 0.2, 0.17, 1.0) if highlighted else Color(0.09, 0.15, 0.13, 1.0),
		ACTIVE_BORDER_COLOR if highlighted else Color(0.18, 0.26, 0.22, 1.0)
	)
	style.content_margin_left = 14
	style.content_margin_top = 8
	style.content_margin_right = 14
	style.content_margin_bottom = 8
	return style


const TABLE_COLOR := Color(0.04, 0.35, 0.22)
const BASE_VIEWPORT := Vector2(1280, 720)
