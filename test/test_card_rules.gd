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


func test_classifies_expanded_v0_2_patterns() -> void:
	var deck := CardRules.create_deck()
	assert_that(CardRules.classify([deck[0], deck[1], deck[2], deck[4]]).play_type).is_equal(
		CardRules.TYPE_THREE_WITH_ONE
	)
	assert_that(CardRules.classify([deck[0], deck[1], deck[2], deck[4], deck[5]]).play_type).is_equal(
		CardRules.TYPE_THREE_WITH_PAIR
	)
	assert_that(CardRules.classify([deck[0], deck[4], deck[8], deck[12], deck[16]]).play_type).is_equal(
		CardRules.TYPE_STRAIGHT
	)
	assert_that(
		CardRules.classify([deck[0], deck[1], deck[4], deck[5], deck[8], deck[9]]).play_type
	).is_equal(CardRules.TYPE_CONSECUTIVE_PAIRS)
	assert_that(
		CardRules.classify([deck[0], deck[1], deck[2], deck[4], deck[5], deck[6]]).play_type
	).is_equal(CardRules.TYPE_AIRPLANE)


func test_rejects_chains_containing_two_or_jokers() -> void:
	var deck := CardRules.create_deck()
	assert_that(CardRules.classify([deck[44], deck[48], deck[52], deck[0], deck[4]]).valid).is_equal(false)
	assert_that(CardRules.classify([deck[40], deck[44], deck[48], deck[0], deck[4]]).valid).is_equal(false)
	assert_that(
		CardRules.classify([deck[44], deck[45], deck[48], deck[49], deck[0], deck[1]]).valid
	).is_equal(false)


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


func test_expanded_pattern_comparison_requires_type_and_length() -> void:
	var deck := CardRules.create_deck()
	var straight_3_to_7 := CardRules.classify([deck[0], deck[4], deck[8], deck[12], deck[16]])
	var straight_4_to_8 := CardRules.classify([deck[4], deck[8], deck[12], deck[16], deck[20]])
	var straight_3_to_8 := CardRules.classify([deck[0], deck[4], deck[8], deck[12], deck[16], deck[20]])
	var pairs_3_to_5 := CardRules.classify([deck[0], deck[1], deck[4], deck[5], deck[8], deck[9]])
	var pairs_4_to_6 := CardRules.classify([deck[4], deck[5], deck[8], deck[9], deck[12], deck[13]])
	var airplane_3_to_4 := CardRules.classify([deck[0], deck[1], deck[2], deck[4], deck[5], deck[6]])
	var airplane_4_to_5 := CardRules.classify([deck[4], deck[5], deck[6], deck[8], deck[9], deck[10]])
	assert_that(CardRules.can_beat(straight_4_to_8, straight_3_to_7)).is_equal(true)
	assert_that(CardRules.can_beat(straight_3_to_8, straight_3_to_7)).is_equal(false)
	assert_that(CardRules.can_beat(pairs_4_to_6, pairs_3_to_5)).is_equal(true)
	assert_that(CardRules.can_beat(airplane_4_to_5, airplane_3_to_4)).is_equal(true)


func test_find_smallest_legal_can_follow_expanded_patterns() -> void:
	var deck := CardRules.create_deck()
	var active_straight := CardRules.classify([deck[0], deck[4], deck[8], deck[12], deck[16]])
	var hand := [deck[4], deck[8], deck[12], deck[16], deck[20], deck[24]]
	var legal := CardRules.find_smallest_legal(hand, active_straight, false)
	assert_that(CardRules.classify(legal).play_type).is_equal(CardRules.TYPE_STRAIGHT)
	assert_that(CardRules.classify(legal).primary_rank).is_equal(8)


func test_low_cost_candidate_scoring_conserves_bombs_when_single_can_follow() -> void:
	var deck := CardRules.create_deck()
	var active_single := CardRules.classify([deck[0]])
	var hand := [deck[4], deck[0], deck[1], deck[2], deck[3]]
	var candidate := CardRules.find_best_legal_candidate(hand, active_single, false)
	assert_that(CardRules.classify(candidate.cards).play_type).is_equal(CardRules.TYPE_SINGLE)
	assert_that(CardRules.labels(candidate.cards)).is_equal("4S")
	assert_that(String(candidate.reason).contains("bombs conserved")).is_equal(true)


func test_low_cost_candidate_scoring_uses_bomb_when_required() -> void:
	var deck := CardRules.create_deck()
	var active_single := CardRules.classify([deck[44]])
	var hand := [deck[0], deck[1], deck[2], deck[3]]
	var candidate := CardRules.find_best_legal_candidate(hand, active_single, false)
	assert_that(CardRules.classify(candidate.cards).play_type).is_equal(CardRules.TYPE_BOMB)
	assert_that(String(candidate.reason).contains("override")).is_equal(true)
