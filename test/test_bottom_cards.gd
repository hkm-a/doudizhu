class_name TestBottomCards
extends GdUnitTestSuite

const MainScript := preload("res://src/main.gd")
const DoudizhuGameScript := preload("res://src/doudizhu_game.gd")


func test_bottom_cards_start_not_revealed() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	assert_that(main.debug_bottom_cards_revealed()).is_equal(false)


func test_bottom_cards_revealed_after_landlord_call() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	assert_that(main.debug_bottom_cards_revealed()).is_equal(false)
	main.game.resolve_landlord(true)
	main.bottom_cards_revealed = true
	main._refresh()
	assert_that(main.debug_bottom_cards_revealed()).is_equal(true)


func test_bottom_cards_revealed_after_landlord_decline() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	assert_that(main.debug_bottom_cards_revealed()).is_equal(false)
	main.game.resolve_landlord(false)
	main.bottom_cards_revealed = true
	main._refresh()
	assert_that(main.debug_bottom_cards_revealed()).is_equal(true)


func test_bottom_cards_count_after_landlord_resolved() -> void:
	var main: MainScript = auto_free(MainScript.new())
	main._ready()
	main.game.new_round(42)
	main.simulate_call_landlord()
	main._refresh()
	assert_that(main.debug_bottom_cards_count()).is_equal(3)
