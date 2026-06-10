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
const AnimationSystemScript := preload("res://src/systems/s_animation.gd")
const AIUtilsScript := preload("res://src/utils/ai_utils.gd")
const SaveLoadUtilsScript := preload("res://src/utils/save_load_utils.gd")
const LocalizationUtilsScript := preload("res://src/utils/localization_utils.gd")
const CardAssetsScript := preload("res://src/utils/card_assets.gd")
const MainUILayoutScript := preload("res://src/main_ui_layout.gd")
const MainUIRefreshScript := preload("res://src/main_ui_refresh.gd")
const MainUICallbacksScript := preload("res://src/main_ui_callbacks.gd")
const MainUIDebugScript := preload("res://src/main_ui_debug.gd")
const MainUIFlowScript := preload("res://src/main_ui_flow.gd")
const TUTORIAL_STEPS := [
	{
		"title": "Table Tour",
		"body": "AI seats, bottom cards, current trick, your hand, scores, and stats all update as the hand progresses.",
	},
	{
		"title": "Landlord Choice",
		"body": "Use Call Landlord (A/Space) or Do Not Call (D). The landlord takes the three bottom cards and plays alone.",
	},
	{
		"title": "Playing Cards",
		"body": "Click cards to select them, then Play (Space). Supported groups include singles, pairs, triples, straights, consecutive pairs, airplanes, bombs, and joker bomb.",
	},
	{
		"title": "Following Tricks",
		"body": "Beat the current trick with the same type and higher rank, or use Pass (P). Hint (H) selects a legal low-cost response when one exists.",
	},
	{
		"title": "Scoring And Match",
		"body": "A landlord win gives that seat +2 and farmers -1. A farmer win gives farmers +1 and landlord -2. New Hand keeps the match score; New Match resets it.",
	},
	{
		"title": "Shortcuts And Stats",
		"body": "Use T for Tutorial, F1 for Help, H for Hint, P for Pass, Space for Play, N for result replay, and Q for Quit. Session stats persist until Reset Stats.",
	},
]

var game := DoudizhuGame.new()
var score_state := ScoreStateScript.new()
var audio_controller := AudioControllerScript.new()
var round_counter := 0
var layout_scale := 1.0
var debug_viewport_override := Vector2.ZERO
var loc := LocalizationUtilsScript.new()

var animation_system: AnimationSystemScript

# UI control references
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
var stats_panel: PanelContainer
var stats_label: Label
var hand_area: Control
var ai_left_hand: Control
var ai_right_hand: Control
var action_bar: HBoxContainer
var call_button: Button
var decline_button: Button
var play_button: Button
var pass_button: Button
var hint_button: Button
var help_button: Button
var tutorial_button: Button
var settings_button: Button
var new_round_button: Button
var quit_button: Button
var sfx_toggle_button: Button
var music_toggle_button: Button
var volume_button: Button
var stats_reset_button: Button
var ai_difficulty_button: Button
var settings_close_button: Button
var result_panel: PanelContainer
var result_label: Label
var result_actions_bar: HBoxContainer
var result_new_hand_button: Button
var result_new_match_button: Button
var help_blocker: ColorRect
var help_panel: PanelContainer
var help_label: Label
var help_close_button: Button
var tutorial_panel: PanelContainer
var tutorial_blocker: ColorRect
var tutorial_title_label: Label
var tutorial_body_label: Label
var tutorial_step_label: Label
var tutorial_back_button: Button
var tutorial_next_button: Button
var tutorial_close_button: Button
var settings_blocker: ColorRect
var settings_panel: PanelContainer
var settings_label: Label
var help_visible := false
var tutorial_visible := false
var tutorial_index := 0
var settings_visible := false
var quit_requested := false
var has_save := false
var continue_overlay: ColorRect

# Module instances
var _layout: MainUILayout
var _ui_refresh: MainUIRefresh
var _callbacks: MainUICallbacks
var _debug: MainUIDebug
var _builder: MainUIBuilder
var _flow: MainUIFlow

func _ready() -> void:
	name = "Main"
	audio_controller.name = "AudioController"
	add_child(audio_controller)
	animation_system = AnimationSystemScript.new()
	add_child(animation_system)
	_layout = MainUILayoutScript.new()
	_ui_refresh = MainUIRefreshScript.new()
	_callbacks = MainUICallbacksScript.new()
	_debug = MainUIDebugScript.new()
	_builder = MainUIBuilderScript.new()
	_flow = MainUIFlowScript.new()
	var controls: Dictionary = _builder.build_ui(self, loc, layout_scale, CardAssetsScript)
	_assign_controls(controls)
	_connect_signals()
	_layout_ui()
	_refresh_all()
	has_save = SaveLoadUtilsScript.save_exists()
	if has_save:
		_show_continue_dialog()
	else:
		_start_new_round()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_node_ready():
		_layout_ui()
		_refresh_all()


func _unhandled_key_input(event: InputEvent) -> void:
	if _callbacks.unhandled_key_input(
		event, self, help_button, tutorial_button,
		call_button, decline_button, play_button, pass_button, hint_button,
		result_new_hand_button, result_new_match_button, quit_button, game, score_state):
		get_viewport().set_input_as_handled()


func _assign_controls(controls: Dictionary) -> void:
	ai_left_panel = controls.ai_left_panel
	ai_right_panel = controls.ai_right_panel
	bottom_cards_box = controls.bottom_cards_box
	trick_panel = controls.trick_panel
	trick_box = controls.trick_box
	trick_owner_label = controls.trick_owner_label
	status_label = controls.status_label
	hand_summary_label = controls.hand_summary_label
	scoreboard_panel = controls.scoreboard_panel
	scoreboard_label = controls.scoreboard_label
	stats_panel = controls.stats_panel
	stats_label = controls.stats_label
	action_bar = controls.action_bar
	call_button = controls.call_button
	decline_button = controls.decline_button
	play_button = controls.play_button
	pass_button = controls.pass_button
	hint_button = controls.hint_button
	help_button = controls.help_button
	tutorial_button = controls.tutorial_button
	settings_button = controls.settings_button
	new_round_button = controls.new_round_button
	hand_area = controls.hand_area
	ai_left_hand = controls.ai_left_hand
	ai_right_hand = controls.ai_right_hand
	result_panel = controls.result_panel
	result_label = controls.result_label
	result_actions_bar = controls.result_actions_bar
	result_new_hand_button = controls.result_new_hand_button
	result_new_match_button = controls.result_new_match_button
	quit_button = controls.quit_button
	help_blocker = controls.help_blocker
	help_panel = controls.help_panel
	help_label = controls.help_label
	help_close_button = controls.help_close_button
	tutorial_panel = controls.tutorial_panel
	tutorial_blocker = controls.tutorial_blocker
	tutorial_title_label = controls.tutorial_title_label
	tutorial_body_label = controls.tutorial_body_label
	tutorial_step_label = controls.tutorial_step_label
	tutorial_back_button = controls.tutorial_back_button
	tutorial_next_button = controls.tutorial_next_button
	tutorial_close_button = controls.tutorial_close_button
	settings_blocker = controls.settings_blocker
	settings_panel = controls.settings_panel
	settings_label = controls.settings_label
	settings_close_button = controls.settings_close_button
	sfx_toggle_button = controls.sfx_toggle_button
	music_toggle_button = controls.music_toggle_button
	volume_button = controls.volume_button
	stats_reset_button = controls.stats_reset_button
	ai_difficulty_button = controls.ai_difficulty_button
	continue_overlay = controls.continue_overlay


func _connect_signals() -> void:
	call_button.pressed.connect(_on_call_pressed)
	decline_button.pressed.connect(_on_decline_pressed)
	play_button.pressed.connect(_on_play_pressed)
	pass_button.pressed.connect(_on_pass_pressed)
	hint_button.pressed.connect(_on_hint_pressed)
	help_button.pressed.connect(_on_help_pressed)
	tutorial_button.pressed.connect(_on_tutorial_pressed)
	settings_button.pressed.connect(_on_settings_pressed)
	new_round_button.pressed.connect(_on_new_hand_pressed)
	sfx_toggle_button.pressed.connect(_on_sfx_toggle_pressed)
	music_toggle_button.pressed.connect(_on_music_toggle_pressed)
	volume_button.pressed.connect(_on_volume_pressed)
	stats_reset_button.pressed.connect(_on_reset_stats_pressed)
	ai_difficulty_button.pressed.connect(_on_ai_difficulty_pressed)
	result_new_hand_button.pressed.connect(_on_new_hand_pressed)
	result_new_match_button.pressed.connect(_on_new_match_pressed)
	quit_button.pressed.connect(_on_quit_pressed)
	help_close_button.pressed.connect(_on_help_close_pressed)
	tutorial_back_button.pressed.connect(_on_tutorial_back_pressed)
	tutorial_next_button.pressed.connect(_on_tutorial_next_pressed)
	tutorial_close_button.pressed.connect(_on_tutorial_close_pressed)
	settings_close_button.pressed.connect(_on_settings_close_pressed)
	hand_area.gui_input.connect(_on_hand_area_gui_input)


# --- Delegate: Layout ---

func _layout_ui() -> void:
	_layout.layout_ui(
		self, ai_left_panel, ai_right_panel,
		bottom_cards_box, trick_panel, trick_box,
		status_label, hand_summary_label,
		scoreboard_panel, scoreboard_label,
		stats_panel, stats_label,
		hand_area, action_bar,
		call_button, decline_button, play_button, pass_button, hint_button, help_button,
		tutorial_button, settings_button, new_round_button,
		result_panel, result_label, result_actions_bar,
		result_new_hand_button, result_new_match_button, quit_button,
		help_panel, help_label, help_close_button,
		tutorial_panel, tutorial_title_label, tutorial_body_label, tutorial_step_label,
		tutorial_back_button, tutorial_next_button, tutorial_close_button,
		settings_panel, settings_label, settings_close_button
	)


# --- Delegate: Refresh ---

func _refresh_all() -> void:
	_ui_refresh.refresh_all(
		game, score_state, audio_controller,
		status_label, hand_summary_label, scoreboard_label, stats_label,
		trick_panel, result_panel, result_label, help_label, help_close_button,
		ai_left_panel, ai_right_panel,
		ai_left_hand, ai_right_hand,
		hand_area, bottom_cards_box, trick_box, trick_owner_label,
		action_bar, call_button, decline_button, play_button, pass_button, hint_button, help_button, settings_button, new_round_button,
		settings_blocker, settings_panel, sfx_toggle_button, music_toggle_button, volume_button, ai_difficulty_button, settings_close_button,
		result_new_hand_button, result_new_match_button, quit_button, help_visible, _layout.layout_scale,
		animation_system, loc, self, self
	)


func _process(_delta: float) -> void:
	_ui_refresh._process_turn_timer(game, self, _layout.layout_scale)


# --- Game flow ---

func _start_new_round() -> void:
	round_counter += 1
	score_state.start_new_hand()
	game.new_round(100 + round_counter)
	_refresh_all()


func _start_new_match() -> void:
	score_state.reset_match()
	round_counter = 0
	_start_new_round()


# --- Keep _refresh() for card button factory ---

func _refresh() -> void:
	_refresh_all()


func _card_button(card: Dictionary, interactive: bool, selected: bool) -> Button:
	return 	_ui_refresh.card_button_factory(card, interactive, selected, self, layout_scale)


func _card_style(card: Dictionary, selected: bool) -> StyleBoxFlat:
	return 	_ui_refresh.card_style(card, selected)


# --- Continue dialog helpers ---

func _show_continue_dialog() -> void:
	_flow.show_continue_dialog(continue_overlay)


func _hide_continue_dialog() -> void:
	_flow.hide_continue_dialog(continue_overlay)


func _load_saved_game() -> void:
	if not _flow.load_saved_game(game, score_state, audio_controller, self):
		_start_new_round()
		return
	_refresh_all()
	game.message = "Game loaded from save."


func _delete_save_and_start() -> void:
	_flow.delete_save_and_start(game, score_state, self)
	_start_new_round()


# --- Callback implementations ---

func _on_call_pressed() -> void:
	_callbacks.on_call_pressed(game, audio_controller)
	_refresh()

func _on_decline_pressed() -> void:
	_callbacks.on_decline_pressed(game, audio_controller)
	_refresh()

func _on_play_pressed() -> void:
	_callbacks.on_play_pressed(game, audio_controller, animation_system, "")
	_refresh()

func _on_pass_pressed() -> void:
	_callbacks.on_pass_pressed(game, audio_controller)
	_refresh()

func _on_hint_pressed() -> void:
	_callbacks.on_hint_pressed(game)
	_refresh()

func _on_help_pressed() -> void:
	_callbacks.on_help_pressed(self)
	_refresh()

func _on_help_close_pressed() -> void:
	_callbacks.on_help_close_pressed(self)
	_refresh()

func _on_tutorial_pressed() -> void:
	_callbacks.on_tutorial_pressed(self)
	_update_tutorial_display()
	_refresh()

func _on_tutorial_close_pressed() -> void:
	_callbacks.on_tutorial_close_pressed(self)
	_refresh()

func _on_tutorial_back_pressed() -> void:
	_callbacks.on_tutorial_back_pressed(self, TUTORIAL_STEPS)
	_refresh()

func _on_tutorial_next_pressed() -> void:
	_callbacks.on_tutorial_next_pressed(self, TUTORIAL_STEPS)
	_refresh()

# --- Delegate: Tutorial display (shared with callbacks module) ---

func _update_tutorial_display() -> void:
	_callbacks._update_tutorial_display(self, TUTORIAL_STEPS)

func _on_settings_pressed() -> void:
	_callbacks.on_settings_pressed(self)
	_refresh()

func _on_settings_close_pressed() -> void:
	_callbacks.on_settings_close_pressed(self)
	_refresh()

func _on_sfx_toggle_pressed() -> void:
	_callbacks.on_sfx_toggle_pressed(audio_controller)
	_refresh()

func _on_music_toggle_pressed() -> void:
	_callbacks.on_music_toggle_pressed(audio_controller)
	_refresh()

func _on_volume_pressed() -> void:
	_callbacks.on_volume_pressed(audio_controller)
	_refresh()

func _on_ai_difficulty_pressed() -> void:
	_callbacks.on_ai_difficulty_pressed(AIUtilsScript)
	_refresh()

func _on_reset_stats_pressed() -> void:
	_callbacks.on_reset_stats_pressed(score_state)
	_refresh()

func _on_quit_pressed() -> void:
	_callbacks.on_quit_pressed(self, audio_controller)
	game.message = "Quit requested. Close the window when ready."
	_refresh()

func _on_new_hand_pressed() -> void:
	_callbacks.on_new_hand_pressed(self, audio_controller, game)
	_start_new_round()

func _on_new_match_pressed() -> void:
	_callbacks.on_new_match_pressed(self, audio_controller, game, score_state)
	_start_new_match()

func _on_save_game_pressed() -> void:
	var ok = _callbacks.on_save_game_pressed(game, score_state, audio_controller)
	if ok:
		game.message = "Game saved successfully."
		audio_controller.play_event("select")
		has_save = true
	else:
		game.message = "Failed to save game."
		audio_controller.play_event("invalid")
	_refresh()

func _on_load_game_pressed() -> void:
	if not SaveLoadUtilsScript.save_exists():
		game.message = "No save file found."
		audio_controller.play_event("invalid")
		_refresh()
		return
	var loaded = _callbacks.on_load_game_pressed(game, score_state, audio_controller, self)
	if loaded:
		_on_settings_close_pressed()
		_refresh()
		game.message = "Game loaded from save."
	else:
		game.message = "Failed to load save."
		_refresh()

func _on_hand_area_gui_input(event: InputEvent) -> void:
	if _callbacks.on_hand_area_gui_input(event, game, hand_area, layout_scale, _callbacks):
		_refresh()

# --- _press_visible_button helper ---

func _press_visible_button(button: Button) -> bool:
	return _callbacks._press_visible_button(self, button)


# --- Debug / simulate methods (signatures preserved) ---

func debug_finish_human_win() -> void:
	_debug.finish_human_win(game, self)

func debug_configure_expanded_rule_fixture() -> void:
	_debug.configure_expanded_rule_fixture(game)

func debug_configure_bomb_conservation_fixture() -> void:
	_debug.configure_bomb_conservation_fixture(game)

func debug_selected_count() -> int:
	return _debug.selected_count(game)

func debug_human_card_count() -> int:
	return _debug.human_card_count(game)

func debug_phase() -> String:
	return _debug.phase(game)

func debug_status_text() -> String:
	return _debug.status_text(game)

func debug_active_trick_type() -> String:
	return _debug.active_trick_type(game)

func debug_hand_summary_text() -> String:
	return _debug.hand_summary_text(game)

func debug_ai_reason(seat: int) -> String:
	return _debug.ai_reason(game, seat)

func debug_help_visible() -> bool:
	return _debug.help_visible(self)

func debug_audio_state() -> Dictionary:
	return _debug.audio_state(audio_controller)

func debug_score_state() -> Dictionary:
	return _debug.score_state(score_state)

func debug_scoreboard_text() -> String:
	return _debug.scoreboard_text(self)

func debug_stats_text() -> String:
	return _debug.stats_text(self)

func debug_result_text() -> String:
	return _debug.result_text(self)

func debug_clear_save() -> void:
	SaveLoadUtilsScript.delete_save()
	await get_tree().process_frame

func debug_settings_visible() -> bool:
	return _debug.settings_visible(self)

func debug_settings_focus_modes() -> Dictionary:
	return _debug.settings_focus_modes(sfx_toggle_button, music_toggle_button, volume_button, settings_close_button)

func debug_result_focus_modes() -> Dictionary:
	return _debug.result_focus_modes(result_new_hand_button, result_new_match_button, quit_button)

func debug_help_close_focus_mode() -> int:
	return help_close_button.focus_mode

func debug_quit_requested() -> bool:
	return _debug.quit_requested(self)

func debug_tutorial_visible() -> bool:
	return _debug.tutorial_visible(self)

func debug_tutorial_index() -> int:
	return _debug.tutorial_index(self)

func debug_tutorial_step_label() -> String:
	return _debug.tutorial_step_label(self)

func debug_layout_snapshot() -> Dictionary:
	return _debug.layout_snapshot(self, debug_viewport_override)

func debug_layout_snapshot_for_viewport(viewport_size: Vector2) -> Dictionary:
	debug_viewport_override = viewport_size
	_layout_ui()
	_refresh_all()
	var snapshot := debug_layout_snapshot()
	debug_viewport_override = Vector2.ZERO
	return snapshot

func debug_visible_hand_card_rects() -> Array:
	return _debug.visible_hand_card_rects(self)

func debug_drag_select_active() -> bool:
	return _callbacks._drag_select_active

func debug_bottom_cards_revealed() -> bool:
	return game.bottom_cards_revealed if game.has_method("bottom_cards_revealed") else false

func debug_bottom_cards_count() -> int:
	return game.bottom_cards.size()

func debug_turn_timer_active() -> bool:
	return _ui_refresh._turn_timer_active

func debug_turn_timer_remaining() -> float:
	return _ui_refresh.turn_timer_remaining

func debug_timer_label_text() -> String:
	return _debug.timer_label_text(self, layout_scale)

func debug_deal_anim_active() -> bool:
	return false

func debug_deal_cards_remaining() -> int:
	return 0

func simulate_apply_result_score() -> Dictionary:
	_ui_refresh._apply_result_score_once(game, score_state, audio_controller, self, layout_scale)
	_refresh()
	return score_state.debug_state()

func simulate_shortcut(keycode) -> bool:
	return _callbacks.simulate_shortcut(keycode, self, help_button, tutorial_button, call_button, decline_button, play_button, pass_button, hint_button, result_new_hand_button, result_new_match_button, quit_button, game, score_state)

func simulate_new_hand() -> void:
	_on_new_hand_pressed()

func simulate_new_match() -> void:
	_on_new_match_pressed()

func simulate_open_settings() -> void:
	_on_settings_pressed()

func simulate_close_settings() -> void:
	_on_settings_close_pressed()

func simulate_select_card(card_index: int) -> void:
	var cards: Array = game.hands[DoudizhuGame.HUMAN]
	if card_index >= 0 and card_index < cards.size():
		var card_id := int(cards[card_index].id)
		game.toggle_selection(card_id)
		_refresh()

func simulate_play_cards(card_indices: Array[int]) -> void:
	for idx in card_indices:
		var cards: Array = game.hands[DoudizhuGame.HUMAN]
		if idx >= 0 and idx < cards.size():
			var card_id := int(cards[idx].id)
			if not game.selected_cards.has(card_id):
				game.toggle_selection(card_id)
	_refresh()
	var played := game.play_selected()
	if played:
		_debug.animate_cards_to_table(game, animation_system, self)
		_refresh()

func simulate_toggle_card_index(card_id: int) -> void:
	var cards: Array = game.hands[DoudizhuGame.HUMAN]
	if card_id >= 0 and card_id < cards.size():
		var cid := int(cards[card_id].id)
		game.toggle_selection(cid)
		_refresh()

func simulate_call_landlord() -> void:
	game.resolve_landlord(true)

func simulate_tutorial_next() -> void:
	_callbacks.on_tutorial_next_pressed(self, TUTORIAL_STEPS)
	_refresh()

func simulate_tutorial_back() -> void:
	_callbacks.on_tutorial_back_pressed(self, TUTORIAL_STEPS)
	_refresh()

func simulate_tutorial_close() -> void:
	_callbacks.on_tutorial_close_pressed(self)
	_refresh()

func simulate_hint() -> void:
	_callbacks.on_hint_pressed(game)
	_refresh()

func simulate_play() -> void:
	var played := game.play_selected()
	if played:
		_debug.animate_cards_to_table(game, animation_system, self)
	_refresh()
	_refresh()

func get_animation_progress() -> Dictionary:
	return animation_system.get_animation_progress()

func _card_size() -> Vector2:
	return CARD_SIZE * layout_scale


func _calculate_fan_positions(card_count: int) -> Array:
	var card_size := CARD_SIZE * layout_scale
	return _layout.calculate_fan_positions(card_count, card_size, hand_area.size, layout_scale, CARD_GAP)
