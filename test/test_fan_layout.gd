class_name TestFanLayout
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")
const LayoutScript := preload("res://src/main_ui_layout.gd")
const BASE_VIEWPORT := Vector2(1280, 720)


func test_fan_positions_single_card_centered() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var positions: Array[Vector2] = layout.calculate_fan_positions(1, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(1)
	var expected_x: float = (hand_area_size.x - card_size.x) * 0.5
	var diff: float = abs(expected_x - positions[0].x)
	assert_that(diff < 0.01).is_equal(true)


func test_fan_positions_multiple_cards_overlap() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var card_count: int = 5
	var positions: Array[Vector2] = layout.calculate_fan_positions(card_count, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(card_count)
	var expected_step: float = MainScript.CARD_SIZE.x * 0.6 * layout.layout_scale
	expected_step = maxf(expected_step, MainScript.CARD_SIZE.x * layout.layout_scale * 0.35)
	expected_step = minf(expected_step, card_size.x + (MainScript.CARD_GAP * layout.layout_scale))
	for i in range(1, card_count):
		var actual_step: float = positions[i].x - positions[i - 1].x
		var step_diff: float = abs(expected_step - actual_step)
		assert_that(step_diff < 0.01).is_equal(true)


func test_fan_positions_min_step_respected() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var card_count: int = 50
	var positions: Array[Vector2] = layout.calculate_fan_positions(card_count, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(card_count)
	var min_step: float = MainScript.CARD_SIZE.x * layout.layout_scale * 0.35
	for i in range(1, positions.size()):
		var step: float = positions[i].x - positions[i - 1].x
		assert_that(step > min_step * 0.99).is_equal(true)


func test_fan_positions_fan_is_centered() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var card_count: int = 7
	var positions: Array[Vector2] = layout.calculate_fan_positions(card_count, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(card_count)
	var total_width: float = 0.0
	if card_count > 1:
		total_width = (card_count - 1) * (positions[1].x - positions[0].x) + card_size.x
	else:
		total_width = card_size.x
	var expected_start: float = (hand_area_size.x - total_width) * 0.5
	var diff: float = abs(expected_start - positions[0].x)
	assert_that(diff < 0.01).is_equal(true)


func test_fan_positions_y_is_consistent() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var card_count: int = 10
	var positions: Array[Vector2] = layout.calculate_fan_positions(card_count, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(card_count)
	var expected_y: float = 18.0 * layout.layout_scale
	for pos in positions:
		var y_diff: float = abs(expected_y - pos.y)
		assert_that(y_diff < 0.01).is_equal(true)


func test_fan_positions_zero_cards_empty() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var card_size: Vector2 = MainScript.CARD_SIZE * layout.layout_scale
	var hand_area_size := Vector2(800.0, 128.0)
	var positions: Array[Vector2] = layout.calculate_fan_positions(0, card_size, hand_area_size, layout.layout_scale, MainScript.CARD_GAP)
	assert_that(positions.size()).is_equal(0)


func test_card_size_returns_scaled_value() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 1.0
	var size := layout.card_size()
	assert_that(size.x).is_equal(MainScript.CARD_SIZE.x)
	assert_that(size.y).is_equal(MainScript.CARD_SIZE.y)


func test_card_size_scales_with_layout_scale() -> void:
	var layout := LayoutScript.new()
	layout.layout_scale = 0.9
	var size := layout.card_size()
	var expected := MainScript.CARD_SIZE * 0.9
	assert_that(size.x).is_equal(expected.x)
	assert_that(size.y).is_equal(expected.y)
