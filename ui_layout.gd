extends RefCounted

const BASE_VIEWPORT := Vector2(1280, 720)
const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0

var layout_scale := 1.0


func layout_ui(main: Control, ai_left_panel: Panel, ai_right_panel: Panel,
		bottom_cards_box: HBoxContainer, trick_panel: PanelContainer,
		trick_box: HBoxContainer,
		status_label: Label, hand_summary_label: Label,
		scoreboard_label: Label, stats_label: Label,
		hand_area: Control, action_bar: HBoxContainer,
		call1_button: Button, call2_button: Button, call3_button: Button,
		decline_button: Button, play_button: Button, pass_button: Button,
		hint_button: Button, help_button: Button, settings_button: Button,
		new_round_button: Button,
		result_panel: PanelContainer, result_label: Label,
		result_new_hand_button: Button, result_new_match_button: Button,
		quit_button: Button,
		settings_panel: PanelContainer,
		settings_close_button: Button,
		help_panel: PanelContainer, help_label: Label,
		help_close_button: Button) -> void:

	var viewport_size := main.get_viewport_rect().size
	layout_scale = clampf(min(viewport_size.x / BASE_VIEWPORT.x, viewport_size.y / BASE_VIEWPORT.y), 0.82, 1.14)
	
	var margin := 28.0 * layout_scale
	var card_size := CARD_SIZE * layout_scale
	
	# AI seat panels
	var seat_size := Vector2(min(320.0 * layout_scale, viewport_size.x * 0.28), 132.0 * layout_scale)
	ai_left_panel.position = Vector2(margin, margin * 0.85)
	ai_left_panel.size = seat_size
	_layout_seat_content(ai_left_panel)
	
	ai_right_panel.position = Vector2(viewport_size.x - margin - seat_size.x, margin * 0.85)
	ai_right_panel.size = seat_size
	_layout_seat_content(ai_right_panel)
	
	# Bottom cards
	var bottom_size := Vector2((card_size.x * 1.6) + (16.0 * layout_scale), (card_size.y * 1.6) + 20.0 * layout_scale)
	bottom_cards_box.position = Vector2((viewport_size.x - bottom_size.x) * 0.5, 8.0 * layout_scale)
	bottom_cards_box.size = bottom_size
	bottom_cards_box.add_theme_constant_override("separation", int(8.0 * layout_scale))
	
	# Trick panel
	var trick_size := Vector2(clampf(viewport_size.x * 0.60, 600.0 * layout_scale, 780.0 * layout_scale), 200.0 * layout_scale)
	trick_panel.position = Vector2((viewport_size.x - trick_size.x) * 0.5, viewport_size.y * 0.32)
	trick_panel.size = trick_size
	trick_box.add_theme_constant_override("separation", int(6.0 * layout_scale))
	
	# Status label
	var status_size := Vector2(clampf(viewport_size.x * 0.62, 560.0 * layout_scale, 820.0 * layout_scale), 66.0 * layout_scale)
	status_label.position = Vector2((viewport_size.x - status_size.x) * 0.5, trick_panel.position.y + trick_size.y + 14.0 * layout_scale)
	status_label.size = status_size
	status_label.add_theme_font_size_override("font_size", int(18.0 * layout_scale))
	
	# Hand summary
	var summary_size := Vector2(clampf(viewport_size.x * 0.62, 560.0 * layout_scale, 820.0 * layout_scale), 34.0 * layout_scale)
	hand_summary_label.position = Vector2((viewport_size.x - summary_size.x) * 0.5, status_label.position.y + status_size.y + 4.0 * layout_scale)
	hand_summary_label.size = summary_size
	
	# Score & stats
	var score_size := Vector2(clampf(viewport_size.x * 0.44, 460.0 * layout_scale, 620.0 * layout_scale), 24.0 * layout_scale)
	scoreboard_label.position = Vector2(margin, viewport_size.y - margin - score_size.y)
	scoreboard_label.size = score_size
	
	var stats_size := Vector2(clampf(viewport_size.x * 0.48, 560.0 * layout_scale, 720.0 * layout_scale), 24.0 * layout_scale)
	stats_label.position = Vector2(viewport_size.x - margin - stats_size.x, viewport_size.y - margin - stats_size.y)
	stats_label.size = stats_size
	
	# Hand area
	var hand_size := Vector2(viewport_size.x - margin * 2.0, 128.0 * layout_scale)
	hand_area.position = Vector2(margin, viewport_size.y - margin - hand_size.y)
	hand_area.size = hand_size
	
	# Action bar
	var action_size := Vector2(min(620.0 * layout_scale, viewport_size.x - margin * 2.0), 48.0 * layout_scale)
	action_bar.position = Vector2(viewport_size.x - margin - action_size.x, hand_area.position.y - action_size.y - 14.0 * layout_scale)
	action_bar.size = action_size
	action_bar.add_theme_constant_override("separation", int(8.0 * layout_scale))
	for button in [call1_button, call2_button, call3_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button]:
		button.custom_minimum_size = Vector2(88.0 * layout_scale, 42.0 * layout_scale)
	
	# Result panel
	var result_size := Vector2(clampf(viewport_size.x * 0.48, 560.0 * layout_scale, 700.0 * layout_scale), 270.0 * layout_scale)
	result_panel.position = Vector2((viewport_size.x - result_size.x) * 0.5, (viewport_size.y - result_size.y) * 0.40)
	result_panel.size = result_size
	result_label.add_theme_font_size_override("font_size", int(20.0 * layout_scale))
	
	# Settings panel
	var settings_size := Vector2(360.0 * layout_scale, 280.0 * layout_scale)
	settings_panel.position = Vector2(viewport_size.x - margin - settings_size.x, action_bar.position.y - settings_size.y - 10.0 * layout_scale)
	settings_panel.size = settings_size
	
	# Help panel
	var help_size := Vector2(clampf(viewport_size.x * 0.54, 520.0 * layout_scale, 680.0 * layout_scale), 230.0 * layout_scale)
	help_panel.position = Vector2((viewport_size.x - help_size.x) * 0.5, (viewport_size.y - help_size.y) * 0.38)
	help_panel.size = help_size


func _layout_seat_content(panel: Panel) -> void:
	var box := panel.get_node("Content")
	var inset := Vector2(10.0 * layout_scale, 8.0 * layout_scale)
	box.position = inset
	box.size = panel.size - inset * 2.0


func calculate_fan_positions(card_count: int, card_size: Vector2, hand_area_size: Vector2) -> Array:
	var positions: Array = []
	if card_count <= 0:
		return positions
	if card_count == 1:
		positions.push_back({
			"position": Vector2((hand_area_size.x - card_size.x) * 0.5, 10.0 * layout_scale),
			"rotation": 0.0,
		})
		return positions
	
	var total_width: float = hand_area_size.x - 40.0 * layout_scale
	var step: float = total_width / (card_count - 1)
	var max_rotation: float = 20.0
	var rotation_step: float = max_rotation / (card_count - 1)
	
	for i in range(card_count):
		var x: float = 20.0 * layout_scale + i * step
		var y: float = 10.0 * layout_scale
		var rotation: float = 0.0
		var center: float = (card_count - 1) * 0.5
		var offset: float = float(i) - center
		rotation = -offset * rotation_step
		positions.push_back({
			"position": Vector2(x, y),
			"rotation": deg_to_rad(rotation),
		})
	return positions
