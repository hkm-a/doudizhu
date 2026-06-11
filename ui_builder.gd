extends RefCounted

const PANEL_COLOR := Color(0.05, 0.16, 0.12, 0.9)
const ACTIVE_BORDER_COLOR := Color(0.95, 0.72, 0.25)
const RESULT_PANEL_COLOR := Color(0.08, 0.11, 0.1, 0.96)

const BASE_VIEWPORT := Vector2(1280, 720)


func build_ui(main: Control, layout_scale: float) -> Dictionary:
	# Background
	var bg := _make_background(main)
	main.add_child(bg)
	
	# AI seat panels
	var ai_left_panel := _make_seat_panel(main, "AILeftPanel")
	var ai_right_panel := _make_seat_panel(main, "AIRightPanel")
	main.add_child(ai_left_panel)
	main.add_child(ai_right_panel)
	
	# AI hand card containers
	var ai_left_hand := _make_hand_container()
	var ai_right_hand := _make_hand_container()
	main.add_child(ai_left_hand)
	main.add_child(ai_right_hand)
	
	# Bottom cards display
	var bottom_cards_box := HBoxContainer.new()
	bottom_cards_box.name = "BottomCards"
	main.add_child(bottom_cards_box)
	
	# Trick area
	var trick_panel := PanelContainer.new()
	trick_panel.name = "TrickPanel"
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
	trick_box.add_theme_constant_override("separation", 6)
	trick_vbox.add_child(trick_box)
	
	# Status message
	var status_label := Label.new()
	status_label.name = "StatusMessage"
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	status_label.add_theme_font_size_override("font_size", int(18.0 * layout_scale))
	main.add_child(status_label)
	
	# Hand summary
	var hand_summary_label := Label.new()
	hand_summary_label.name = "HandSummary"
	hand_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hand_summary_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))
	hand_summary_label.add_theme_color_override("font_color", Color(0.92, 0.96, 0.9))
	main.add_child(hand_summary_label)
	
	# Score & stats labels
	var scoreboard_label := Label.new()
	scoreboard_label.name = "ScoreText"
	scoreboard_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	scoreboard_label.add_theme_color_override("font_color", Color(0.96, 0.94, 0.76))
	scoreboard_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))
	main.add_child(scoreboard_label)
	
	var stats_label := Label.new()
	stats_label.name = "StatsText"
	stats_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	stats_label.add_theme_color_override("font_color", Color(0.86, 0.94, 0.84))
	stats_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))
	main.add_child(stats_label)
	
	# Action bar
	var action_bar := HBoxContainer.new()
	action_bar.name = "ActionBar"
	action_bar.add_theme_constant_override("separation", 8)
	main.add_child(action_bar)
	
	var call1_button := _make_button(action_bar, "Call1Button", "1分")
	var call2_button := _make_button(action_bar, "Call2Button", "2分")
	var call3_button := _make_button(action_bar, "Call3Button", "3分")
	var decline_button := _make_button(action_bar, "DeclineButton", "不出")
	var play_button := _make_button(action_bar, "PlayButton", "出牌")
	var pass_button := _make_button(action_bar, "PassButton", "不出")
	var hint_button := _make_button(action_bar, "HintButton", "提示")
	var help_button := _make_button(action_bar, "HelpButton", "?")
	var settings_button := _make_button(action_bar, "SettingsButton", "设置")
	var new_round_button := _make_button(action_bar, "NewHandButton", "新牌局")
	
	# Player hand area
	var hand_area := Control.new()
	hand_area.name = "PlayerHand"
	main.add_child(hand_area)
	
	# Result banner
	var result_panel := PanelContainer.new()
	result_panel.name = "ResultBanner"
	main.add_child(result_panel)
	var result_vbox := VBoxContainer.new()
	result_vbox.name = "ResultLayout"
	result_vbox.add_theme_constant_override("separation", 12)
	result_panel.add_child(result_vbox)
	var result_label := Label.new()
	result_label.name = "ResultText"
	result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	result_label.add_theme_font_size_override("font_size", 24)
	result_vbox.add_child(result_label)
	var result_actions := HBoxContainer.new()
	result_actions.name = "ResultActions"
	result_actions.add_theme_constant_override("separation", 10)
	result_vbox.add_child(result_actions)
	var result_new_hand_button := _make_result_button(result_actions, "新牌局")
	var result_new_match_button := _make_result_button(result_actions, "新比赛")
	var quit_button := _make_result_button(result_actions, "退出")
	
	# Settings panel
	var settings_blocker := ColorRect.new()
	settings_blocker.name = "SettingsBlocker"
	settings_blocker.color = Color(0, 0, 0, 0.28)
	settings_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	settings_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	settings_blocker.visible = false
	main.add_child(settings_blocker)
	
	var settings_panel := PanelContainer.new()
	settings_panel.name = "SettingsPanel"
	settings_panel.visible = false
	main.add_child(settings_panel)
	var settings_vbox := VBoxContainer.new()
	settings_vbox.name = "SettingsLayout"
	settings_vbox.add_theme_constant_override("separation", 8)
	settings_panel.add_child(settings_vbox)
	var settings_label := Label.new()
	settings_label.name = "SettingsText"
	settings_label.add_theme_font_size_override("font_size", 14)
	settings_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	settings_vbox.add_child(settings_label)
	var settings_close_button := _make_button(settings_vbox, "SettingsCloseButton", "关闭")
	
	# Help panel
	var help_blocker := ColorRect.new()
	help_blocker.name = "HelpBlocker"
	help_blocker.color = Color(0, 0, 0, 0.18)
	help_blocker.mouse_filter = Control.MOUSE_FILTER_STOP
	help_blocker.set_anchors_preset(Control.PRESET_FULL_RECT)
	help_blocker.visible = false
	main.add_child(help_blocker)
	
	var help_panel := PanelContainer.new()
	help_panel.name = "HelpPanel"
	help_panel.visible = false
	main.add_child(help_panel)
	var help_vbox := VBoxContainer.new()
	help_vbox.name = "HelpLayout"
	help_vbox.add_theme_constant_override("separation", 10)
	help_panel.add_child(help_vbox)
	var help_label := Label.new()
	help_label.name = "HelpText"
	help_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	help_vbox.add_child(help_label)
	var help_close_button := _make_button(help_vbox, "HelpCloseButton", "关闭")
	
	return {
		"ai_left_panel": ai_left_panel,
		"ai_right_panel": ai_right_panel,
		"ai_left_hand": ai_left_hand,
		"ai_right_hand": ai_right_hand,
		"bottom_cards_box": bottom_cards_box,
		"trick_panel": trick_panel,
		"trick_box": trick_box,
		"trick_owner_label": trick_owner_label,
		"status_label": status_label,
		"hand_summary_label": hand_summary_label,
		"scoreboard_label": scoreboard_label,
		"stats_label": stats_label,
		"action_bar": action_bar,
		"call1_button": call1_button,
		"call2_button": call2_button,
		"call3_button": call3_button,
		"decline_button": decline_button,
		"play_button": play_button,
		"pass_button": pass_button,
		"hint_button": hint_button,
		"help_button": help_button,
		"settings_button": settings_button,
		"new_round_button": new_round_button,
		"hand_area": hand_area,
		"result_panel": result_panel,
		"result_label": result_label,
		"result_actions_bar": result_actions,
		"result_new_hand_button": result_new_hand_button,
		"result_new_match_button": result_new_match_button,
		"quit_button": quit_button,
		"settings_blocker": settings_blocker,
		"settings_panel": settings_panel,
		"settings_label": settings_label,
		"settings_close_button": settings_close_button,
		"help_blocker": help_blocker,
		"help_panel": help_panel,
		"help_label": help_label,
		"help_close_button": help_close_button,
	}


func _make_background(main: Control) -> ColorRect:
	var bg := ColorRect.new()
	bg.name = "TableBackground"
	bg.color = Color(0.04, 0.35, 0.22)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	return bg


func _make_seat_panel(main: Control, name: String) -> Panel:
	var panel := Panel.new()
	panel.name = name
	var box := VBoxContainer.new()
	box.name = "Content"
	box.add_theme_constant_override("separation", 3)
	panel.add_child(box)
	
	for label_name in ["Name", "Role", "Count", "Turn", "Recent", "Reason"]:
		var label := Label.new()
		label.name = label_name
		label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(label)
	
	return panel


func _make_hand_container() -> Control:
	var container := Control.new()
	container.visible = false
	return container


func _make_button(parent: Node, name: String, text: String) -> Button:
	var button := Button.new()
	button.name = name
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.add_theme_stylebox_override("normal", _button_style(false))
	button.add_theme_stylebox_override("hover", _button_style(true))
	button.add_theme_stylebox_override("pressed", _button_style(true))
	parent.add_child(button)
	return button


func _make_result_button(parent: Node, text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.focus_mode = Control.FOCUS_NONE
	button.custom_minimum_size = Vector2(128, 42)
	button.add_theme_stylebox_override("normal", _button_style(false))
	button.add_theme_stylebox_override("hover", _button_style(true))
	button.add_theme_stylebox_override("pressed", _button_style(true))
	parent.add_child(button)
	return button


func _button_style(highlighted: bool) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.13, 0.2, 0.17, 1.0) if highlighted else Color(0.09, 0.15, 0.13, 1.0)
	style.border_color = ACTIVE_BORDER_COLOR if highlighted else Color(0.18, 0.26, 0.22, 1.0)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.content_margin_left = 14
	style.content_margin_top = 8
	style.content_margin_right = 14
	style.content_margin_bottom = 8
	return style
