class_name TestFanLayout
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")


func test_fan_positions_single_card_centered() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var positions: Array[Vector2] = main._calculate_fan_positions(1, card_size)
	assert_that(positions.size()).is_equal(1)
	var expected_x: float = (main.hand_area.size.x - card_size.x) * 0.5
	var diff: float = abs(expected_x - positions[0].x)
	assert_that(diff < 0.01).is_equal(true)


func test_fan_positions_multiple_cards_overlap() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var card_count: int = 5
	var positions: Array[Vector2] = main._calculate_fan_positions(card_count, card_size)
	assert_that(positions.size()).is_equal(card_count)
	var expected_step: float = MainScript.CARD_SIZE.x * 0.6 * main.layout_scale
	expected_step = maxf(expected_step, MainScript.CARD_SIZE.x * main.layout_scale * 0.35)
	expected_step = minf(expected_step, card_size.x + (MainScript.CARD_GAP * main.layout_scale))
	for i in range(1, card_count):
		var actual_step: float = positions[i].x - positions[i - 1].x
		var step_diff: float = abs(expected_step - actual_step)
		assert_that(step_diff < 0.01).is_equal(true)


func test_fan_positions_min_step_respected() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var card_count: int = 50
	var positions: Array[Vector2] = main._calculate_fan_positions(card_count, card_size)
	assert_that(positions.size()).is_equal(card_count)
	var min_step: float = MainScript.CARD_SIZE.x * main.layout_scale * 0.35
	for i in range(1, positions.size()):
		var step: float = positions[i].x - positions[i - 1].x
		assert_that(step > min_step * 0.99).is_equal(true)


func test_fan_positions_fan_is_centered() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var card_count: int = 7
	var positions: Array[Vector2] = main._calculate_fan_positions(card_count, card_size)
	assert_that(positions.size()).is_equal(card_count)
	var total_width: float = 0.0
	if card_count > 1:
		total_width = (card_count - 1) * (positions[1].x - positions[0].x) + card_size.x
	else:
		total_width = card_size.x
	var expected_start: float = (main.hand_area.size.x - total_width) * 0.5
	var diff: float = abs(expected_start - positions[0].x)
	assert_that(diff < 0.01).is_equal(true)


func test_fan_positions_y_is_consistent() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var card_count: int = 10
	var positions: Array[Vector2] = main._calculate_fan_positions(card_count, card_size)
	assert_that(positions.size()).is_equal(card_count)
	var expected_y: float = 18.0 * main.layout_scale
	for pos in positions:
		var y_diff: float = abs(expected_y - pos.y)
		assert_that(y_diff < 0.01).is_equal(true)


func test_fan_positions_zero_cards_empty() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	var card_size: Vector2 = main._card_size()
	var positions: Array[Vector2] = main._calculate_fan_positions(0, card_size)
	assert_that(positions.size()).is_equal(0)
