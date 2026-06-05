extends GdUnitTestSuite


func test_new_round_deals_expected_counts() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	assert_that(game.phase).is_equal("landlord")
	assert_that(game.hands[0].size()).is_equal(17)
	assert_that(game.hands[1].size()).is_equal(17)
	assert_that(game.hands[2].size()).is_equal(17)
	assert_that(game.bottom_cards.size()).is_equal(3)


func test_landlord_receives_bottom_cards_and_play_starts() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.resolve_landlord(true)
	assert_that(game.phase).is_equal("play")
	assert_that(game.landlord_seat).is_equal(DoudizhuGame.HUMAN)
	assert_that(game.roles[DoudizhuGame.HUMAN]).is_equal("landlord")
	assert_that(game.hands[DoudizhuGame.HUMAN].size()).is_equal(20)
	assert_that(game.current_seat).is_equal(DoudizhuGame.HUMAN)


func test_invalid_play_does_not_mutate_hand_or_turn() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.resolve_landlord(true)
	var before_hand := game.get_hand_ids(DoudizhuGame.HUMAN)
	var before_turn := game.current_seat
	var by_rank := {}
	for card in game.hands[DoudizhuGame.HUMAN]:
		var rank := int(card.rank)
		if not by_rank.has(rank):
			by_rank[rank] = []
		by_rank[rank].append(int(card.id))
	for rank in by_rank.keys():
		if by_rank[rank].size() == 1:
			game.toggle_selection(by_rank[rank][0])
			break
	for rank in by_rank.keys():
		if by_rank[rank].size() == 1 and not game.selected_cards.has(by_rank[rank][0]):
			game.toggle_selection(by_rank[rank][0])
			break
	assert_that(game.play_selected()).is_equal(false)
	assert_that(game.get_hand_ids(DoudizhuGame.HUMAN)).is_equal(before_hand)
	assert_that(game.current_seat).is_equal(before_turn)


func test_hint_selects_a_legal_play() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.resolve_landlord(true)
	game.hint()
	assert_that(game.selected_cards.is_empty()).is_equal(false)
	assert_that(CardRules.classify(game.selected_card_dicts()).valid).is_equal(true)


func test_result_and_replay_state() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.resolve_landlord(true)
	game.force_finish_for_human_win()
	assert_that(game.phase).is_equal("result")
	assert_that(game.winner_side).is_equal("landlord")
	game.new_round(43)
	assert_that(game.phase).is_equal("landlord")
	assert_that(game.winner_side).is_equal("")
