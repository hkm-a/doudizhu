class_name MainUILayout
extends RefCounted

const BASE_VIEWPORT := Vector2(1280, 720)
const CARD_SIZE := Vector2(56, 78)
const CARD_GAP := 8.0

var layout_scale := 1.0
var debug_viewport_override := Vector2.ZERO


func card_size() -> Vector2:
	return CARD_SIZE * layout_scale


func card_gap() -> float:
	return CARD_GAP


func layout_ui(main: Control, ai_left_panel: Panel, ai_right_panel: Panel,
		bottom_cards_box: HBoxContainer, trick_panel: PanelContainer,
		trick_box: HBoxContainer,
		status_label: Label, hand_summary_label: Label,
		scoreboard_panel: PanelContainer, scoreboard_label: Label,
		stats_panel: PanelContainer, stats_label: Label,
		hand_area: Control, action_bar: HBoxContainer,
		call_button: Button, decline_button: Button, play_button: Button,
		pass_button: Button, hint_button: Button, help_button: Button,
		tutorial_button: Button, settings_button: Button, new_round_button: Button,
		result_panel: PanelContainer, result_label: Label,
		result_actions_bar: HBoxContainer,
		result_new_hand_button: Button, result_new_match_button: Button,
		quit_button: Button,
		help_panel: PanelContainer, help_label: Label,
		help_close_button: Button,
		tutorial_panel: PanelContainer,
		tutorial_title_label: Label, tutorial_body_label: Label,
		tutorial_step_label: Label,
		tutorial_back_button: Button, tutorial_next_button: Button,
		tutorial_close_button: Button,
		settings_panel: PanelContainer, settings_label: Label,
		settings_close_button: Button) -> void:

	for control in [
		ai_left_panel, ai_right_panel, bottom_cards_box, trick_panel,
		status_label, hand_summary_label, scoreboard_panel, stats_panel,
		action_bar, hand_area, result_panel,
		help_panel, tutorial_panel, settings_panel,
	]:
		control.set_anchors_preset(Control.PRESET_TOP_LEFT, true)

	var viewport_size := debug_viewport_override
	if viewport_size == Vector2.ZERO:
		viewport_size = BASE_VIEWPORT
	if debug_viewport_override == Vector2.ZERO and main.is_inside_tree():
		viewport_size = main.get_viewport_rect().size
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

	var card_size := CARD_SIZE * layout_scale
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

	var status_size := Vector2(clampf(viewport_size.x * 0.62, 560.0 * layout_scale, 820.0 * layout_scale), 66.0 * layout_scale)
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

	var stats_size := Vector2(clampf(viewport_size.x * 0.48, 560.0 * layout_scale, 720.0 * layout_scale), 30.0 * layout_scale)
	stats_panel.position = Vector2((viewport_size.x - stats_size.x) * 0.5, scoreboard_panel.position.y + scoreboard_size.y + 6.0 * layout_scale)
	stats_panel.custom_minimum_size = stats_size
	stats_panel.size = stats_size
	stats_label.custom_minimum_size = stats_size - Vector2(14.0 * layout_scale, 4.0 * layout_scale)
	stats_label.size = stats_label.custom_minimum_size
	stats_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))

	var hand_size := Vector2(viewport_size.x - (margin * 2.0), 128.0 * layout_scale)
	hand_area.position = Vector2(margin, viewport_size.y - margin - hand_size.y)
	hand_area.custom_minimum_size = hand_size
	hand_area.size = hand_size

	var action_size := Vector2(min(620.0 * layout_scale, viewport_size.x - margin * 2.0), 48.0 * layout_scale)
	action_bar.position = Vector2(viewport_size.x - margin - action_size.x, hand_area.position.y - action_size.y - 14.0 * layout_scale)
	action_bar.custom_minimum_size = action_size
	action_bar.size = action_size
	action_bar.add_theme_constant_override("separation", int(8.0 * layout_scale))
	for button in [call_button, decline_button, play_button, pass_button, hint_button, help_button, tutorial_button, settings_button, new_round_button]:
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

	var tutorial_size := Vector2(clampf(viewport_size.x * 0.42, 420.0 * layout_scale, 560.0 * layout_scale), 250.0 * layout_scale)
	tutorial_panel.position = Vector2(margin, action_bar.position.y - tutorial_size.y - 10.0 * layout_scale)
	tutorial_panel.custom_minimum_size = tutorial_size
	tutorial_panel.size = tutorial_size
	tutorial_title_label.custom_minimum_size = Vector2(tutorial_size.x - 32.0 * layout_scale, 30.0 * layout_scale)
	tutorial_body_label.custom_minimum_size = Vector2(tutorial_size.x - 32.0 * layout_scale, 120.0 * layout_scale)
	tutorial_step_label.custom_minimum_size = Vector2(tutorial_size.x - 32.0 * layout_scale, 26.0 * layout_scale)
	tutorial_title_label.add_theme_font_size_override("font_size", int(18.0 * layout_scale))
	tutorial_body_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))
	tutorial_step_label.add_theme_font_size_override("font_size", int(13.0 * layout_scale))
	for button in [tutorial_back_button, tutorial_next_button, tutorial_close_button]:
		button.custom_minimum_size = Vector2(96.0 * layout_scale, 34.0 * layout_scale)

	var settings_size := Vector2(360.0 * layout_scale, 280.0 * layout_scale)
	settings_panel.position = Vector2(viewport_size.x - margin - settings_size.x, action_bar.position.y - settings_size.y - 10.0 * layout_scale)
	settings_panel.custom_minimum_size = settings_size
	settings_panel.size = settings_size
	settings_label.custom_minimum_size = Vector2(settings_size.x - 32.0 * layout_scale, 54.0 * layout_scale)
	settings_label.add_theme_font_size_override("font_size", int(14.0 * layout_scale))


func calculate_fan_positions(card_count: int, card_size: Vector2, hand_area_size: Vector2, layout_scale: float, card_gap: float) -> Array:
	var positions: Array = []
	if card_count <= 0:
		return positions
	if card_count == 1:
		positions.push_back({
			"position": Vector2((hand_area_size.x - card_size.x) * 0.5, 10.0 * layout_scale),
			"rotation": 0.0
		})
		return positions

	# Fan arc: spread cards horizontally with slight rotation
	var total_width: float = hand_area_size.x - 40.0 * layout_scale
	var step: float = total_width / float(card_count - 1) if card_count > 1 else 0
	var max_rotation: float = 20.0  # degrees
	var rotation_step: float = max_rotation / float(card_count - 1) if card_count > 1 else 0.0

	for i in range(card_count):
		var x: float = 20.0 * layout_scale + i * step
		var y: float = 10.0 * layout_scale
		var rotation: float = 0.0
		if card_count > 1:
			# Cards on edges rotate outward, center stays straight
			var center: float = (card_count - 1) * 0.5
			var offset: float = float(i) - center
			rotation = -offset * rotation_step
		positions.push_back({
			"position": Vector2(x, y),
			"rotation": deg_to_rad(rotation)
		})
	return positions


func _layout_seat_content(panel: Panel, seat_size: Vector2) -> void:
	var box: VBoxContainer = panel.get_node("Content")
	var inset := Vector2(10.0 * layout_scale, 8.0 * layout_scale)
	box.position = inset
	box.custom_minimum_size = seat_size - inset * 2.0
	box.size = box.custom_minimum_size
