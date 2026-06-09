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
	assert_that(game.message.contains("Hint")).is_equal(true)
	assert_that(game.hint_reason.length() > 0).is_equal(true)


func test_ai_policy_conserves_bomb_and_records_reason() -> void:
	var game := DoudizhuGame.new()
	game.debug_configure_bomb_conservation_fixture()
	# Manually set up the AI to play: current_seat is AI_LEFT, tick delay then play
	game._start_ai_delay(DoudizhuGame.AI_LEFT)
	game.tick_ai_delay(1.0)
	game._ai_step()
	assert_that(game.recent_plays[DoudizhuGame.AI_LEFT]).is_equal("4S")
	var reason := game.ai_reasons[DoudizhuGame.AI_LEFT].to_lower()
	assert_that(reason.contains("conserv")).is_equal(true)


func test_hand_summary_reports_count_groups_and_chains() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	var summary := game.hand_summary_text()
	assert_that(summary.contains("Hand: 17 cards")).is_equal(true)
	assert_that(summary.contains("singles")).is_equal(true)
	assert_that(summary.contains("chains")).is_equal(true)


func test_rules_help_describes_supported_flow() -> void:
	var game := DoudizhuGame.new()
	var help := game.rules_help_text()
	assert_that(help.contains("Supported: single")).is_equal(true)
	assert_that(help.contains("Hint selects")).is_equal(true)
	assert_that(help.contains("New Hand")).is_equal(true)


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


func test_ai_delay_starts_when_ai_turn() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	# Set landlord to AI_LEFT without triggering auto-advance
	game.phase = "play"
	game.current_seat = DoudizhuGame.AI_LEFT
	game.initiative_seat = DoudizhuGame.HUMAN
	game.landlord_seat = DoudizhuGame.AI_LEFT
	game.roles = ["farmer", "landlord", "farmer"]
	assert_that(game.get_ai_delay_active()).is_equal(false)
	assert_that(game.get_ai_delay_seat()).is_equal(-1)
	assert_that(game.get_ai_delay_remaining()).is_equal(0.0)
	game.process_ai_until_human(1)
	assert_that(game.get_ai_delay_active()).is_equal(true)
	assert_that(game.get_ai_delay_seat()).is_equal(DoudizhuGame.AI_LEFT)
	assert_that(game.get_ai_delay_remaining()).is_greater(0.0)


func test_ai_delay_ticks_down_and_completes() -> void:
	var game := DoudizhuGame.new()
	game.new_round(42)
	game.phase = "play"
	game.current_seat = DoudizhuGame.AI_LEFT
	game.initiative_seat = DoudizhuGame.HUMAN
	game.landlord_seat = DoudizhuGame.HUMAN
	game.roles = ["landlord", "farmer", "farmer"]
	game.process_ai_until_human(1)
	assert_that(game.get_ai_delay_active()).is_equal(true)
	var initial_remaining := game.get_ai_delay_remaining()
	var completed := game.tick_ai_delay(initial_remaining + 0.01)
	assert_that(completed).is_equal(true)
	assert_that(game.get_ai_delay_active()).is_equal(false)
	assert_that(game.get_ai_delay_seat()).is_equal(-1)
	assert_that(game.get_ai_delay_remaining()).is_equal(0.0)
	assert_that(game.current_seat != DoudizhuGame.AI_LEFT).is_equal(true)

