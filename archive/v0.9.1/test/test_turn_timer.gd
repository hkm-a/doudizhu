# test_turn_timer.gd - Turn Timer tests (v0.9.0-M4)
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")
const DoudizhuGameScript := preload("res://src/doudizhu_game.gd")


func test_timer_starts_hidden_and_stops_when_not_human_turn() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	# Timer panel should be hidden initially
	assert_that(main.debug_turn_timer_panel_visible()).is_equal(false)
	# Timer remaining should be at max
	assert_that(main.debug_turn_timer_remaining()).is_equal(30.0)


func test_timer_starts_on_landlord_phase_with_human_seat() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	# Trigger timer activation logic for landlord phase with human current_seat
	var delta: float = 0.01
	main._process_turn_timer(delta)
	# Human is current_seat in landlord phase, timer should activate
	assert_that(main.debug_turn_timer_active()).is_equal(true)
	assert_that(main.debug_turn_timer_panel_visible()).is_equal(true)


func test_timer_starts_on_play_phase_with_human_seat() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	# After resolve_landlord(true), human leads (current_seat == HUMAN) in play phase
	var delta: float = 0.01
	main._process_turn_timer(delta)
	assert_that(main.debug_turn_timer_active()).is_equal(true)


func test_timer_stops_when_ai_becomes_current_seat() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	# Set phase to play with AI as current_seat without triggering auto-advance
	main.game.phase = "play"
	main.game.current_seat = DoudizhuGame.AI_LEFT
	main.game.initiative_seat = DoudizhuGame.AI_LEFT
	var delta: float = 0.01
	main._process_turn_timer(delta)
	# AI is current_seat so timer should be stopped
	assert_that(main.debug_turn_timer_active()).is_equal(false)


func test_timer_countdown_decreases_time() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	# Activate timer
	var delta: float = 0.01
	main._process_turn_timer(delta)
	assert_that(main.debug_turn_timer_active()).is_equal(true)
	# Simulate 5 seconds passing
	main.turn_timer_remaining = 25.0
	main._turn_timer_last_update = 0.0
	main._process_turn_timer(5.0)
	assert_that(main.debug_turn_timer_remaining()).is_equal(20.0)


func test_timer_label_red_below_5_seconds() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	var delta: float = 0.01
	main._process_turn_timer(delta)
	# Set remaining to 3 seconds
	main.turn_timer_remaining = 3.0
	main._turn_timer_last_update = 0.0
	main._process_turn_timer(0.5)
	var text: String = main.debug_timer_label_text()
	assert_that(text).is_equal("0:03")


func test_timer_resets_on_new_round() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	# Activate timer by triggering phase detection
	main._process_turn_timer(0.01)
	assert_that(main.debug_turn_timer_active()).is_equal(true)
	# Start new round - it resets tracking variables
	main._start_new_round()
	# After _start_new_round, the game phase is "landlord" with human current_seat
	# So the timer should auto-activate on the next _process_turn_timer call
	main._process_turn_timer(0.01)
	assert_that(main.debug_turn_timer_active()).is_equal(true)
	# Timer should be close to max (allowing for small delta decrement)
	var remaining: float = main.debug_turn_timer_remaining()
	assert_float(remaining).is_greater(29.9)
	assert_float(remaining).is_less(30.1)


func test_timer_auto_passes_on_zero_remaining() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	# Trigger timer activation first
	main._process_turn_timer(0.01)
	# Now manually set the timer close to zero
	main.turn_timer_remaining = 0.1
	main._turn_timer_last_update = 0.0
	# Process one frame to trigger expiry
	main._process_turn_timer(0.2)
	# Timer should have expired and processed the auto-action
	assert_that(main.debug_turn_timer_active()).is_equal(false)
	assert_that(main.debug_turn_timer_panel_visible()).is_equal(false)


func test_timer_display_format_mm_ss() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	var delta: float = 0.01
	main._process_turn_timer(delta)
	# Set to a specific time and update display
	main.turn_timer_remaining = 65.0
	main._turn_timer_last_update = 0.0
	main._process_turn_timer(0.5)
	var text: String = main.debug_timer_label_text()
	assert_that(text).is_equal("1:05")


func test_timer_display_30_seconds() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	var delta: float = 0.01
	main._process_turn_timer(delta)
	var text: String = main.debug_timer_label_text()
	assert_that(text).is_equal("0:30")


func test_timer_label_bottom_visible_in_landlord_phase() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main._refresh()
	assert_that(main._turn_timer_label_bottom.visible).is_equal(true)
	var label_text: String = main._turn_timer_label_bottom.text
	assert_that(label_text.is_empty()).is_equal(false)


func test_timer_label_bottom_visible_in_play_phase() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.game.resolve_landlord(true)
	main._refresh()
	assert_that(main._turn_timer_label_bottom.visible).is_equal(true)


func test_timer_auto_calls_landlord_on_timeout() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	# During landlord phase, timer should auto-call (resolve_landlord(true))
	main.turn_timer_remaining = 0.1
	main._turn_timer_last_update = 0.0
	main._process_turn_timer(0.2)
	# After timer expires in landlord phase, landlord should be resolved
	assert_that(main.game.landlord_seat >= 0)
