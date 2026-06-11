extends Control

const BASE_VIEWPORT := Vector2(1280, 720)

# Layer references
var engine
var _layout
var _builder
var _callbacks
var _ui_refresh
var audio_controller
var _has_engine := false

# UI references
var ai_left_panel: Panel
var ai_right_panel: Panel
var ai_left_hand: Control
var ai_right_hand: Control
var bottom_cards_box: HBoxContainer
var trick_panel: PanelContainer
var trick_box: HBoxContainer
var trick_owner_label: Label
var status_label: Label
var hand_summary_label: Label
var scoreboard_label: Label
var stats_label: Label
var hand_area: Control
var action_bar: HBoxContainer
var call1_button: Button
var call2_button: Button
var call3_button: Button
var decline_button: Button
var play_button: Button
var pass_button: Button
var hint_button: Button
var help_button: Button
var settings_button: Button
var new_round_button: Button
var result_panel: PanelContainer
var result_label: Label
var result_new_hand_button: Button
var result_new_match_button: Button
var quit_button: Button
var settings_panel: PanelContainer
var settings_close_button: Button
var settings_blocker: ColorRect
var help_panel: PanelContainer
var help_label: Label
var help_close_button: Button
var help_blocker: ColorRect
var help_visible := false
var has_save := false


func _ready() -> void:
	name = "Main"
	
	engine = load("res://game.gd").new()
	_layout = load("res://ui_layout.gd").new()
	_builder = load("res://ui_builder.gd").new()
	_callbacks = load("res://ui_callbacks.gd").new()
	_ui_refresh = load("res://ui_refresh.gd").new()
	
	# Create audio controller
	audio_controller = load("res://audio_controller.gd").new()
	add_child(audio_controller)
	
	# Build UI
	var controls: Dictionary = _builder.build_ui(self, 1.0)
	_assign_controls(controls)
	_connect_signals()
	
	# Layout
	_layout_ui()
	_refresh()
	
	# Start first round
	engine.new_round(7)
	_refresh()


func _process(delta: float) -> void:
	if not is_node_ready() or engine == null:
		return


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_node_ready():
		_layout_ui()
		_refresh()


func _unhandled_key_input(event: InputEvent) -> void:
	if _callbacks.handle_shortcut(event, engine, call1_button, call2_button, call3_button, decline_button, play_button, pass_button, hint_button, result_new_hand_button, result_new_match_button, quit_button, self):
		get_viewport().set_input_as_handled()


# --- Signal handlers ---

func _on_call_1_pressed() -> void:
	_callbacks.on_call_1_pressed(engine, audio_controller)
	_refresh()


func _on_call_2_pressed() -> void:
	_callbacks.on_call_2_pressed(engine, audio_controller)
	_refresh()


func _on_call_3_pressed() -> void:
	_callbacks.on_call_3_pressed(engine, audio_controller)
	_refresh()


func _on_decline_pressed() -> void:
	_callbacks.on_decline_pressed(engine, audio_controller)
	_refresh()


func _on_play_pressed() -> void:
	if _callbacks.on_play_pressed(engine, audio_controller):
		pass  # animation would go here
	_refresh()


func _on_pass_pressed() -> void:
	_callbacks.on_pass_pressed(engine, audio_controller)
	_refresh()


func _on_hint_pressed() -> void:
	_callbacks.on_hint_pressed(engine)
	_refresh()


func _on_help_pressed() -> void:
	help_visible = true
	help_panel.visible = true
	help_blocker.visible = true
	_refresh()


func _on_help_close_pressed() -> void:
	help_visible = false
	help_panel.visible = false
	help_blocker.visible = false
	_refresh()


func _on_settings_pressed() -> void:
	_refresh()


func _on_settings_close_pressed() -> void:
	_refresh()


func _on_new_hand_pressed() -> void:
	engine.new_round(7)
	_refresh()


func _on_quit_pressed() -> void:
	get_tree().quit()


func _on_hand_area_gui_input(event: InputEvent) -> void:
	if _callbacks.on_hand_area_gui_input(event, engine, hand_area, 1.0, _callbacks):
		_refresh()


# --- Delegate methods ---

func _layout_ui() -> void:
	_layout.layout_ui(
		self, ai_left_panel, ai_right_panel,
		bottom_cards_box, trick_panel, trick_box,
		status_label, hand_summary_label,
		scoreboard_label, stats_label,
		hand_area, action_bar,
		call1_button, call2_button, call3_button,
		decline_button, play_button, pass_button,
		hint_button, help_button, settings_button,
		new_round_button,
		result_panel, result_label,
		result_new_hand_button, result_new_match_button, quit_button,
		settings_panel,
		settings_close_button,
		help_panel, help_label,
		help_close_button,
	)


func _refresh() -> void:
	_ui_refresh.refresh_all(
		engine, audio_controller,
		status_label, hand_summary_label,
		scoreboard_label, stats_label,
		trick_panel, result_panel, result_label,
		ai_left_panel, ai_right_panel,
		ai_left_hand, ai_right_hand,
		hand_area, bottom_cards_box, trick_box, trick_owner_label,
		action_bar,
		call1_button, call2_button, call3_button,
		decline_button, play_button, pass_button,
		hint_button, help_button, settings_button,
		new_round_button,
		result_new_hand_button, result_new_match_button, quit_button,
		settings_panel, help_panel, help_label, help_close_button,
		settings_close_button,
		settings_blocker, help_blocker,
		help_visible, 1.0, null, self,
	)


func _assign_controls(controls: Dictionary) -> void:
	ai_left_panel = controls["ai_left_panel"]
	ai_right_panel = controls["ai_right_panel"]
	ai_left_hand = controls["ai_left_hand"]
	ai_right_hand = controls["ai_right_hand"]
	bottom_cards_box = controls["bottom_cards_box"]
	trick_panel = controls["trick_panel"]
	trick_box = controls["trick_box"]
	trick_owner_label = controls["trick_owner_label"]
	status_label = controls["status_label"]
	hand_summary_label = controls["hand_summary_label"]
	scoreboard_label = controls["scoreboard_label"]
	stats_label = controls["stats_label"]
	hand_area = controls["hand_area"]
	action_bar = controls["action_bar"]
	call1_button = controls["call1_button"]
	call2_button = controls["call2_button"]
	call3_button = controls["call3_button"]
	decline_button = controls["decline_button"]
	play_button = controls["play_button"]
	pass_button = controls["pass_button"]
	hint_button = controls["hint_button"]
	help_button = controls["help_button"]
	settings_button = controls["settings_button"]
	new_round_button = controls["new_round_button"]
	result_panel = controls["result_panel"]
	result_label = controls["result_label"]
	result_new_hand_button = controls["result_new_hand_button"]
	result_new_match_button = controls["result_new_match_button"]
	quit_button = controls["quit_button"]
	settings_panel = controls["settings_panel"]
	settings_close_button = controls["settings_close_button"]
	settings_blocker = controls["settings_blocker"]
	help_panel = controls["help_panel"]
	help_label = controls["help_label"]
	help_close_button = controls["help_close_button"]
	help_blocker = controls["help_blocker"]


func _connect_signals() -> void:
	call1_button.pressed.connect(_on_call_1_pressed)
	call2_button.pressed.connect(_on_call_2_pressed)
	call3_button.pressed.connect(_on_call_3_pressed)
	decline_button.pressed.connect(_on_decline_pressed)
	play_button.pressed.connect(_on_play_pressed)
	pass_button.pressed.connect(_on_pass_pressed)
	hint_button.pressed.connect(_on_hint_pressed)
	help_button.pressed.connect(_on_help_pressed)
	help_close_button.pressed.connect(_on_help_close_pressed)
	settings_button.pressed.connect(_on_settings_pressed)
	settings_close_button.pressed.connect(_on_settings_close_pressed)
	new_round_button.pressed.connect(_on_new_hand_pressed)
	result_new_hand_button.pressed.connect(_on_new_hand_pressed)
	result_new_match_button.pressed.connect(_on_new_hand_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	hand_area.gui_input.connect(_on_hand_area_gui_input)
