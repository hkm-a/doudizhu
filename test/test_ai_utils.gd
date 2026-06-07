extends GdUnitTestSuite

const AIUtils := preload("res://src/utils/ai_utils.gd")


func test_normal_ai_uses_basic_strategy() -> void:
	var deck := CardRules.create_deck()
	var hand := [deck[0], deck[4], deck[8], deck[12], deck[16]]
	var candidate := CardRules.find_best_legal_candidate(hand, {}, true)
	assert_that(candidate.is_empty()).is_equal(false)
	assert_that(String(candidate.reason).contains("Low-cost")).is_equal(true)


func test_normal_ai_conserves_bomb_when_not_needed() -> void:
	var deck := CardRules.create_deck()
	var active := CardRules.classify([deck[0]])
	var hand := [deck[4], deck[0], deck[1], deck[2], deck[3]]
	var candidate := CardRules.find_best_legal_candidate(hand, active, false)
	assert_that(String(candidate.reason).contains("bombs conserved")).is_equal(true)


func test_normal_ai_uses_bomb_when_forced() -> void:
	var deck := CardRules.create_deck()
	var active := CardRules.classify([deck[44]])
	var hand := [deck[0], deck[1], deck[2], deck[3]]
	var candidate := CardRules.find_best_legal_candidate(hand, active, false)
	assert_that(String(candidate.reason).contains("override")).is_equal(true)


func test_coordinate_farmer_lead_strong_when_landlord_short() -> void:
	var deck := CardRules.create_deck()
	var triple := CardRules.classify([deck[0], deck[1], deck[2]])
	triple["cards"] = [deck[0], deck[1], deck[2]]
	var result := AIUtils.coordinate_farmer_lead(1, 0, 5, 2, true, triple)
	assert_that(result.is_empty()).is_equal(false)


func test_cards_of_rank_remaining_counts() -> void:
	var seen := {3: 3, 4: 1}
	var remaining := AIUtils.cards_of_rank_remaining(3, seen, 4)
	assert_that(remaining).is_equal(1)
	remaining = AIUtils.cards_of_rank_remaining(4, seen, 4)
	assert_that(remaining).is_equal(3)


func test_card_rank_from_id_basic() -> void:
	var r3 := AIUtils._card_rank_from_id(0)
	assert_that(r3).is_equal(3)
	var r14 := AIUtils._card_rank_from_id(11)
	assert_that(r14).is_equal(14)
	var r16 := AIUtils._card_rank_from_id(52)
	assert_that(r16).is_equal(16)
	var r17 := AIUtils._card_rank_from_id(53)
	assert_that(r17).is_equal(17)


func test_count_total_of_rank() -> void:
	var c4 := AIUtils.count_total_of_rank(4)
	assert_that(c4).is_equal(4)
	var c16 := AIUtils.count_total_of_rank(16)
	assert_that(c16).is_equal(1)
	var c17 := AIUtils.count_total_of_rank(17)
	assert_that(c17).is_equal(1)


func test_is_bomb_like_identifies_bombs() -> void:
	var deck := CardRules.create_deck()
	var bomb := CardRules.classify([deck[0], deck[1], deck[2], deck[3]])
	bomb["cards"] = [deck[0], deck[1], deck[2], deck[3]]
	assert_that(AIUtils._is_bomb_like(bomb)).is_equal(true)
	var single := CardRules.classify([deck[0]])
	single["cards"] = [deck[0]]
	assert_that(AIUtils._is_bomb_like(single)).is_equal(false)


func test_joker_bomb_identified() -> void:
	var deck := CardRules.create_deck()
	var jb := CardRules.classify([deck[52], deck[53]])
	jb["cards"] = [deck[52], deck[53]]
	assert_that(AIUtils._is_bomb_like(jb)).is_equal(true)
