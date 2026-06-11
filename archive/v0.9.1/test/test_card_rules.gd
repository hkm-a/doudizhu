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


func test_airplane_with_wings_classification_with_singles() -> void:
	var deck := CardRules.create_deck()
	var aaa = [deck[0], deck[1], deck[2]]
	var bbb = [deck[4], deck[5], deck[6]]
	var kicker_a = [deck[8]]
	var combined = aaa + bbb + kicker_a
	assert_that(CardRules.classify(combined).valid).is_equal(true)
	assert_that(CardRules.classify(combined).play_type).is_equal(CardRules.TYPE_AIRPLANE_WITH_WINGS)
	assert_that(CardRules.classify(combined).primary_rank).is_equal(4)
	assert_that(CardRules.classify(combined).length).is_equal(8)


func test_airplane_with_wings_classification_with_pairs() -> void:
	var deck := CardRules.create_deck()
	var aaa = [deck[0], deck[1], deck[2]]
	var bbb = [deck[4], deck[5], deck[6]]
	var kicker_a_pair = [deck[8], deck[9]]
	var combined = aaa + bbb + kicker_a_pair
	assert_that(CardRules.classify(combined).valid).is_equal(true)
	assert_that(CardRules.classify(combined).play_type).is_equal(CardRules.TYPE_AIRPLANE_WITH_WINGS)
	assert_that(CardRules.classify(combined).primary_rank).is_equal(4)
	assert_that(CardRules.classify(combined).length).is_equal(8)


func test_airplane_with_wings_comparison() -> void:
	var deck := CardRules.create_deck()
	var low_triplets = [
		deck[0], deck[1], deck[2], deck[4], deck[5], deck[6], deck[8]
	]
	var high_triplets = [
		deck[8], deck[9], deck[10], deck[12], deck[13], deck[14], deck[16]
	]
	assert_that(CardRules.can_beat(
		CardRules.classify(high_triplets),
		CardRules.classify(low_triplets)
	)).is_equal(true)
	assert_that(CardRules.can_beat(
		CardRules.classify(low_triplets),
		CardRules.classify(high_triplets)
	)).is_equal(false)


func test_airplane_with_wings_rejects_non_consecutive() -> void:
	var deck := CardRules.create_deck()
	var aaa = [deck[0], deck[1], deck[2]]
	var ccc = [deck[8], deck[9], deck[10]]
	var kicker = [deck[12]]
	var combined = aaa + ccc + kicker
	assert_that(CardRules.classify(combined).valid).is_equal(false)


func test_airplane_with_wings_requires_minimum_two_triplets() -> void:
	var deck := CardRules.create_deck()
	var aaa = [deck[0], deck[1], deck[2]]
	var kicker = [deck[4]]
	var combined = aaa + kicker
	assert_that(CardRules.classify(combined).valid).is_equal(false)


func test_airplane_with_wings_uses_quad_as_triplet_plus_kicker() -> void:
	var deck := CardRules.create_deck()
	var aaaa = [deck[0], deck[1], deck[2], deck[3]]
	var bbb = [deck[4], deck[5], deck[6]]
	var kicker = [deck[8]]
	var combined = aaaa + bbb + kicker
	assert_that(CardRules.classify(combined).valid).is_equal(true)
	assert_that(CardRules.classify(combined).play_type).is_equal(CardRules.TYPE_AIRPLANE_WITH_WINGS)


func test_four_with_two_classification() -> void:
	var deck := CardRules.create_deck()
	var aaaa = [deck[0], deck[1], deck[2], deck[3]]
	var kicker1 = [deck[8]]
	var kicker2 = [deck[12]]
	var combined = aaaa + kicker1 + kicker2
	assert_that(CardRules.classify(combined).valid).is_equal(true)
	assert_that(CardRules.classify(combined).play_type).is_equal(CardRules.TYPE_FOUR_WITH_TWO)
	assert_that(CardRules.classify(combined).primary_rank).is_equal(3)
	assert_that(CardRules.classify(combined).length).is_equal(6)


func test_four_with_two_with_pair() -> void:
	var deck := CardRules.create_deck()
	var aaaa = [deck[0], deck[1], deck[2], deck[3]]
	var pair = [deck[8], deck[9]]
	var combined = aaaa + pair
	assert_that(CardRules.classify(combined).valid).is_equal(true)
	assert_that(CardRules.classify(combined).play_type).is_equal(CardRules.TYPE_FOUR_WITH_TWO)
	assert_that(CardRules.classify(combined).primary_rank).is_equal(3)
	assert_that(CardRules.classify(combined).length).is_equal(6)


func test_four_with_two_comparison() -> void:
	var deck := CardRules.create_deck()
	var low_four = [
		deck[0], deck[1], deck[2], deck[3], deck[8], deck[12]
	]
	var high_four = [
		deck[40], deck[41], deck[42], deck[43], deck[8], deck[12]
	]
	assert_that(CardRules.can_beat(
		CardRules.classify(high_four),
		CardRules.classify(low_four)
	)).is_equal(true)
	assert_that(CardRules.can_beat(
		CardRules.classify(low_four),
		CardRules.classify(high_four)
	)).is_equal(false)


func test_four_with_two_rejects_without_attached() -> void:
	var deck := CardRules.create_deck()
	var aaaa = [deck[0], deck[1], deck[2], deck[3]]
	assert_that(CardRules.classify(aaaa).play_type).is_equal(CardRules.TYPE_BOMB)
	assert_that(CardRules.classify(aaaa).play_type).is_not_equal(CardRules.TYPE_FOUR_WITH_TWO)


func test_four_with_two_bombs_beat_four_with_two() -> void:
	var deck := CardRules.create_deck()
	var four_with_two = [
		deck[0], deck[1], deck[2], deck[3], deck[8], deck[12]
	]
	var bomb = [deck[20], deck[24], deck[28], deck[32]]
	assert_that(CardRules.can_beat(
		CardRules.classify(bomb),
		CardRules.classify(four_with_two)
	)).is_equal(true)


func test_find_legal_candidates_includes_airplane_with_wings() -> void:
	var deck := CardRules.create_deck()
	var hand = [
		deck[0], deck[1], deck[2], deck[4], deck[5], deck[6],
		deck[12], deck[13]
	]
	var candidates = CardRules.find_legal_candidates(hand, {}, true)
	var has_aws := false
	for c in candidates:
		if String(c.classification.play_type) == CardRules.TYPE_AIRPLANE_WITH_WINGS:
			has_aws = true
			break
	assert_that(has_aws).is_equal(true)


func test_find_legal_candidates_includes_four_with_two() -> void:
	var deck := CardRules.create_deck()
	var hand = deck.slice(0, 6)
	var candidates = CardRules.find_legal_candidates(hand, {}, true)
	var has_4w2 := false
	for c in candidates:
		if String(c.classification.play_type) == CardRules.TYPE_FOUR_WITH_TWO:
			has_4w2 = true
			break
	assert_that(has_4w2).is_equal(true)
