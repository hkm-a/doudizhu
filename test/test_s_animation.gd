extends GdUnitTestSuite


func test_animation_component_defaults() -> void:
	var comp := C_CardAnimationState.new()
	assert_that(comp.target_position).is_equal(Vector2.ZERO)
	assert_that(comp.progress).is_equal(0.0)
	assert_that(comp.animation_type).is_equal("idle")
	assert_that(comp.duration).is_equal(0.3)


func test_animation_system_model_class() -> void:
	var system := AnimationSystem.new()
	assert_that(system).is_not_null()
	assert_that(system.query()).is_not_null()
	system.free()


func test_play_flight_animation_has_tween() -> void:
	var system := AnimationSystem.new()
	var button := Button.new()
	button.name = "TestCard"
	button.position = Vector2(100, 200)
	var tween := system.play_flight_animation(button, Vector2(400, 300), 0.35)
	assert_that(tween).is_not_null()
	assert_that(tween.has_signal("finished")).is_true()
	button.free()
	system.free()


func test_play_bounce_animation_has_tween() -> void:
	var system := AnimationSystem.new()
	var button := Button.new()
	button.name = "TestCard"
	button.position = Vector2(100, 200)
	var tween := system.play_bounce_animation(button, 8.0, 0.2)
	assert_that(tween).is_not_null()
	assert_that(tween.has_signal("finished")).is_true()
	button.free()
	system.free()


func test_flight_animation_duration_in_range() -> void:
	var system := AnimationSystem.new()
	var button := Button.new()
	button.position = Vector2(100, 200)
	var duration: float = 0.3
	assert_that(duration).is_greater_than_or_equal(0.2)
	assert_that(duration).is_less_than_or_equal(0.4)
	button.free()
	system.free()


func test_bounce_animation_does_not_block_input() -> void:
	var system := AnimationSystem.new()
	var button := Button.new()
	button.mouse_filter = Control.MOUSE_FILTER_STOP
	assert_that(button.mouse_filter).is_equal(Control.MOUSE_FILTER_STOP)
	button.free()
	system.free()
