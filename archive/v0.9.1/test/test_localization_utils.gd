class_name TestLocalizationUtils
extends GdUnitTestSuite


var loc: LocalizationUtils


func setup() -> void:
	loc = LocalizationUtils.new()


func teardown() -> void:
	loc.queue_free()


func test_english_strings_loaded_by_default() -> void:
	assert_that(loc.current_locale()).is_equal("en")
	assert_that(loc.string("seat.player")).is_equal("Player")
	assert_that(loc.string("seat.ai_left")).is_equal("AI Left")
	assert_that(loc.string("seat.ai_right")).is_equal("AI Right")
	assert_that(loc.string("action.call_landlord")).is_equal("Call Landlord")
	assert_that(loc.string("action.decline_landlord")).is_equal("Do Not Call")
	assert_that(loc.string("action.play")).is_equal("Play")
	assert_that(loc.string("action.pass")).is_equal("Pass")
	assert_that(loc.string("action.hint")).is_equal("Hint")


func test_zh_strings_after_switch() -> void:
	loc.set_locale("zh")
	assert_that(loc.current_locale()).is_equal("zh")
	assert_that(loc.string("seat.player")).is_equal("玩家")
	assert_that(loc.string("seat.ai_left")).is_equal("AI 左")
	assert_that(loc.string("seat.ai_right")).is_equal("AI 右")
	assert_that(loc.string("action.call_landlord")).is_equal("叫地主")
	assert_that(loc.string("action.decline_landlord")).is_equal("不叫")
	assert_that(loc.string("action.play")).is_equal("出牌")
	assert_that(loc.string("action.pass")).is_equal("不出")
	assert_that(loc.string("action.hint")).is_equal("提示")


func test_switching_back_to_english() -> void:
	loc.set_locale("zh")
	assert_that(loc.current_locale()).is_equal("zh")
	loc.set_locale("en")
	assert_that(loc.current_locale()).is_equal("en")
	assert_that(loc.string("seat.player")).is_equal("Player")


func test_unknown_key_returns_key() -> void:
	assert_that(loc.string("nonexistent.key")).is_equal("nonexistent.key")


func test_format_keys_with_args() -> void:
	loc.set_locale("en")
	var msg := loc.string("message.is_landlord").format(["Player", "Player"])
	assert_that(msg).is_equal("Player is landlord. Player leads.")
	loc.set_locale("zh")
	msg = loc.string("message.is_landlord").format(["玩家", "玩家"])
	assert_that(msg).is_equal("玩家 是地主。玩家 先出。")


func test_is_en_and_is_zh() -> void:
	loc.set_locale("en")
	assert_that(loc.is_en()).is_equal(true)
	assert_that(loc.is_zh()).is_equal(false)
	loc.set_locale("zh")
	assert_that(loc.is_en()).is_equal(false)
	assert_that(loc.is_zh()).is_equal(true)


func test_all_required_en_keys_exist() -> void:
	var required := [
		"seat.player", "seat.ai_left", "seat.ai_right",
		"action.call_landlord", "action.decline_landlord", "action.play", "action.pass", "action.hint",
		"message.call_landlord_or_decline", "message.no_legal_response",
		"label.role", "label.count", "label.turn", "label.recent", "label.reason",
		"result.new_hand", "result.new_match", "result.quit",
		"label.sfx", "label.music", "label.volume", "label.settings",
		"label.close", "label.back", "label.next", "label.on", "label.off",
	]
	loc.set_locale("en")
	for key in required:
		assert_that(loc.string(key) != key).is_equal(true, "Missing EN string for key: %s" % key)


func test_all_required_zh_keys_exist() -> void:
	var required := [
		"seat.player", "seat.ai_left", "seat.ai_right",
		"action.call_landlord", "action.decline_landlord", "action.play", "action.pass", "action.hint",
		"message.call_landlord_or_decline", "message.no_legal_response",
		"label.role", "label.count", "label.turn", "label.recent", "label.reason",
		"result.new_hand", "result.new_match", "result.quit",
		"label.sfx", "label.music", "label.volume", "label.settings",
		"label.close", "label.back", "label.next", "label.on", "label.off",
	]
	loc.set_locale("zh")
	for key in required:
		assert_that(loc.string(key) != key).is_equal(true, "Missing ZH string for key: %s" % key)
