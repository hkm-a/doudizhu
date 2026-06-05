extends GdUnitTestSuite


func test_classifies_supported_plays() -> void:
	var deck := CardRules.create_deck()
	assert_that(CardRules.classify([deck[0]]).play_type).is_equal(CardRules.TYPE_SINGLE)
	assert_that(CardRules.classify([deck[0], deck[1]]).play_type).is_equal(CardRules.TYPE_PAIR)
	assert_that(CardRules.classify([deck[0], deck[1], deck[2]]).play_type).is_equal(CardRules.TYPE_TRIPLE)
	assert_that(CardRules.classify([deck[0], deck[1], deck[2], deck[3]]).play_type).is_equal(CardRules.TYPE_BOMB)
	assert_that(CardRules.classify([deck[52], deck[53]]).play_type).is_equal(CardRules.TYPE_JOKER_BOMB)


func test_rejects_unsupported_patterns() -> void:
	var deck := CardRules.create_deck()
	assert_that(CardRules.classify([deck[0], deck[4]]).valid).is_equal(false)
	assert_that(CardRules.classify([deck[0], deck[1], deck[4], deck[5]]).valid).is_equal(false)


func test_comparison_and_bomb_override() -> void:
	var deck := CardRules.create_deck()
	var single_3 := CardRules.classify([deck[0]])
	var single_4 := CardRules.classify([deck[4]])
	var bomb_3 := CardRules.classify([deck[0], deck[1], deck[2], deck[3]])
	var joker_bomb := CardRules.classify([deck[52], deck[53]])
	assert_that(CardRules.can_beat(single_4, single_3)).is_equal(true)
	assert_that(CardRules.can_beat(single_3, single_4)).is_equal(false)
	assert_that(CardRules.can_beat(bomb_3, single_4)).is_equal(true)
	assert_that(CardRules.can_beat(joker_bomb, bomb_3)).is_equal(true)
	assert_that(CardRules.can_beat(bomb_3, joker_bomb)).is_equal(false)
