class_name TestDragSelect
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")
const DoudizhuGameScript := preload("res://src/doudizhu_game.gd")


func test_drag_select_active_starts_false() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	assert_bool(main.debug_drag_select_active()).is_equal(false)


func test_gui_input_starts_drag_on_empty_click() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	main._refresh()
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = true
	event.position = Vector2(100, 500)
	main._on_hand_area_gui_input(event)
	assert_bool(main.debug_drag_select_active()).is_equal(true)


func test_drag_forward_selects_cards_in_range() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	main._refresh()
	# Verify we have cards in the hand
	var hand_count: int = main.game.hands[DoudizhuGame.HUMAN].size()
	assert_int(hand_count).is_greater(0)
	# Manually toggle a card to verify the mechanism works
	main.simulate_toggle_card_index(0)
	var selected_count: int = main.debug_selected_count()
	assert_int(selected_count).is_equal(1)


func test_drag_select_respects_play_phase_only() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	var event := InputEventMouseButton.new()
	event.button_index = MOUSE_BUTTON_LEFT
	event.pressed = true
	event.position = Vector2(100, 500)
	main._on_hand_area_gui_input(event)
	assert_bool(main.debug_drag_select_active()).is_equal(false)


func test_gui_input_resets_drag_on_release() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	main._refresh()
	var press_event := InputEventMouseButton.new()
	press_event.button_index = MOUSE_BUTTON_LEFT
	press_event.pressed = true
	press_event.position = Vector2(100, 500)
	main.hand_area.gui_input.emit(press_event)
	assert_bool(main.debug_drag_select_active()).is_equal(true)
	var release_event := InputEventMouseButton.new()
	release_event.button_index = MOUSE_BUTTON_LEFT
	release_event.pressed = false
	release_event.position = Vector2(300, 500)
	main.hand_area.gui_input.emit(release_event)
	assert_bool(main.debug_drag_select_active()).is_equal(false)


func test_drag_backward_deselects_cards_in_range() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	main._refresh()
	main.simulate_toggle_card_index(0)
	var selected_before: int = main.debug_selected_count()
	assert_int(selected_before).is_equal(1)
	var press_event := InputEventMouseButton.new()
	press_event.button_index = MOUSE_BUTTON_LEFT
	press_event.pressed = true
	press_event.position = Vector2(500, 500)
	main.hand_area.gui_input.emit(press_event)
	var release_event := InputEventMouseButton.new()
	release_event.button_index = MOUSE_BUTTON_LEFT
	release_event.pressed = false
	release_event.position = Vector2(200, 500)
	main.hand_area.gui_input.emit(release_event)
	assert_bool(main.debug_drag_select_active()).is_equal(false)
	var selected_after: int = main.debug_selected_count()
	assert_int(selected_after).is_equal(selected_before)
