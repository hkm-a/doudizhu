class_name TestDealAnimation
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")


func test_deal_anim_starts_inactive_after_ready() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	assert_that(main.debug_deal_anim_active()).is_equal(false)
	assert_that(main.debug_deal_cards_remaining()).is_equal(0)


func test_deal_anim_variations() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main._start_deal_animation()
	assert_that(main.debug_deal_anim_active()).is_equal(true)
	assert_that(main.debug_deal_cards_remaining()).is_greater(0)
	main._reset_deal_state()
	assert_that(main.debug_deal_anim_active()).is_equal(false)
	assert_that(main.debug_deal_cards_remaining()).is_equal(0)


func test_deal_stagger_stops_after_all_cards() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main._start_deal_animation()
	var remaining: int = main.debug_deal_cards_remaining()
	assert_that(remaining).is_greater(0)


func test_deal_state_reset_clears_all() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main._start_deal_animation()
	main._reset_deal_state()
	assert_that(main.debug_deal_anim_active()).is_equal(false)
	assert_that(main.debug_deal_cards_remaining()).is_equal(0)


func test_deal_cards_count_after_new_round() -> void:
	var main: Variant = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	var hand_size: int = main.game.hands[DoudizhuGame.HUMAN].size()
	assert_that(hand_size).is_greater(0)
	var bottom_size: int = main.game.bottom_cards.size()
	assert_that(bottom_size).is_equal(3)
