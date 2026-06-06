class_name DoudizhuGame
extends RefCounted

const HUMAN := 0
const AI_LEFT := 1
const AI_RIGHT := 2
const SEAT_NAMES := ["Player", "AI Left", "AI Right"]

var cards_by_id: Dictionary = {}
var hands: Array[Array] = [[], [], []]
var bottom_cards: Array[Dictionary] = []
var roles: Array[String] = ["undecided", "undecided", "undecided"]
var selected_cards: Array[int] = []
var phase := "setup"
var current_seat := HUMAN
var initiative_seat := -1
var consecutive_passes := 0
var landlord_seat := -1
var active_trick := {}
var recent_plays: Array[String] = ["", "", ""]
var ai_reasons: Array[String] = ["", "", ""]
var hint_reason := ""
var message := ""
var winner_side := ""
var winner_seat := -1
var hand_number := 0
var result_key := ""
var seed := 7


func new_round(round_seed: int = 7) -> void:
	seed = round_seed
	hand_number += 1
	cards_by_id.clear()
	hands = [[], [], []]
	bottom_cards = []
	roles = ["undecided", "undecided", "undecided"]
	selected_cards = []
	phase = "landlord"
	current_seat = HUMAN
	initiative_seat = -1
	consecutive_passes = 0
	landlord_seat = -1
	active_trick = {}
	recent_plays = ["", "", ""]
	ai_reasons = ["", "", ""]
	hint_reason = ""
	winner_side = ""
	winner_seat = -1
	result_key = ""

	var deck := CardRules.create_deck()
	for card in deck:
		cards_by_id[int(card.id)] = card
	_shuffle(deck, round_seed)
	for i in range(51):
		hands[i % 3].append(deck[i])
	bottom_cards = [deck[51], deck[52], deck[53]]
	for seat in range(3):
		_sort_hand(seat)
	message = "Call landlord or decline."


func resolve_landlord(player_calls: bool) -> void:
	if phase != "landlord":
		return
	landlord_seat = HUMAN if player_calls else AI_LEFT
	for seat in range(3):
		roles[seat] = "landlord" if seat == landlord_seat else "farmer"
	for card in bottom_cards:
		hands[landlord_seat].append(card)
	_sort_hand(landlord_seat)
	phase = "play"
	current_seat = landlord_seat
	initiative_seat = landlord_seat
	message = "%s is landlord. %s leads." % [SEAT_NAMES[landlord_seat], SEAT_NAMES[current_seat]]
	if current_seat != HUMAN:
		process_ai_until_human()


func toggle_selection(card_id: int) -> void:
	if phase != "play" or current_seat != HUMAN:
		return
	if selected_cards.has(card_id):
		selected_cards.erase(card_id)
	else:
		selected_cards.append(card_id)
	_sort_selection()


func hint() -> void:
	if phase != "play" or current_seat != HUMAN:
		message = "Hint is available on your turn."
		return
	var candidate := CardRules.find_best_legal_candidate(hands[HUMAN], active_trick, _has_initiative(HUMAN))
	selected_cards = []
	if candidate.is_empty():
		hint_reason = "No valid play is available."
		message = hint_reason
		return
	var legal: Array = candidate.cards
	for card in legal:
		selected_cards.append(int(card.id))
	hint_reason = "%s: %s" % [String(candidate.reason), CardRules.labels(legal)]
	message = "Hint: %s" % hint_reason


func play_selected() -> bool:
	if phase != "play" or current_seat != HUMAN:
		message = "Wait for your turn."
		return false
	var play_cards := _selected_card_dicts()
	var candidate := CardRules.classify(play_cards)
	var comparison_trick := {} if _has_initiative(HUMAN) else active_trick
	if not CardRules.can_beat(candidate, comparison_trick):
		message = "Invalid play or does not beat the active trick."
		return false
	_apply_play(HUMAN, play_cards, candidate)
	process_ai_until_human()
	return true


func pass_turn() -> bool:
	if phase != "play" or current_seat != HUMAN:
		message = "Wait for your turn."
		return false
	if _has_initiative(HUMAN):
		message = "You have initiative and must play."
		return false
	_apply_pass(HUMAN)
	process_ai_until_human()
	return true


func force_finish_for_human_win() -> void:
	if phase != "play":
		return
	hands[HUMAN] = []
	_finish_if_needed(HUMAN)


func result_summary() -> Dictionary:
	return {
		"phase": phase,
		"winner_side": winner_side,
		"winner_seat": winner_seat,
		"landlord_seat": landlord_seat,
		"landlord_name": SEAT_NAMES[landlord_seat] if landlord_seat >= 0 else "",
		"winner_name": SEAT_NAMES[winner_seat] if winner_seat >= 0 else "",
		"hand_number": hand_number,
		"result_key": result_key,
	}


func debug_configure_expanded_rule_fixture() -> void:
	cards_by_id.clear()
	for card in CardRules.create_deck():
		cards_by_id[int(card.id)] = card
	roles = ["farmer", "landlord", "farmer"]
	landlord_seat = AI_LEFT
	phase = "play"
	current_seat = HUMAN
	initiative_seat = AI_LEFT
	consecutive_passes = 0
	selected_cards = []
	winner_side = ""
	winner_seat = -1
	result_key = ""
	hands[HUMAN] = [
		cards_by_id[5],
		cards_by_id[9],
		cards_by_id[13],
		cards_by_id[17],
		cards_by_id[21],
		cards_by_id[24],
	]
	hands[AI_LEFT] = [cards_by_id[48], cards_by_id[49], cards_by_id[50]]
	hands[AI_RIGHT] = [cards_by_id[44], cards_by_id[45], cards_by_id[46]]
	bottom_cards = [cards_by_id[47], cards_by_id[52], cards_by_id[53]]
	var active_cards: Array[Dictionary] = [
		cards_by_id[0],
		cards_by_id[4],
		cards_by_id[8],
		cards_by_id[12],
		cards_by_id[16],
	]
	active_trick = CardRules.classify(active_cards)
	active_trick["cards"] = active_cards
	active_trick["owner_seat"] = AI_LEFT
	recent_plays = ["", CardRules.labels(active_cards), ""]
	ai_reasons = ["", "Fixture straight lead", ""]
	hint_reason = ""
	message = "Expanded rule fixture: beat the straight."


func debug_configure_bomb_conservation_fixture() -> void:
	cards_by_id.clear()
	for card in CardRules.create_deck():
		cards_by_id[int(card.id)] = card
	roles = ["landlord", "farmer", "farmer"]
	landlord_seat = HUMAN
	phase = "play"
	current_seat = AI_LEFT
	initiative_seat = HUMAN
	consecutive_passes = 0
	selected_cards = []
	winner_side = ""
	winner_seat = -1
	result_key = ""
	hands[HUMAN] = [cards_by_id[48], cards_by_id[49], cards_by_id[50]]
	hands[AI_LEFT] = [
		cards_by_id[4],
		cards_by_id[8],
		cards_by_id[9],
		cards_by_id[0],
		cards_by_id[1],
		cards_by_id[2],
		cards_by_id[3],
	]
	hands[AI_RIGHT] = [cards_by_id[12], cards_by_id[13], cards_by_id[14]]
	bottom_cards = [cards_by_id[20], cards_by_id[21], cards_by_id[22]]
	var active_cards: Array[Dictionary] = [cards_by_id[0]]
	active_trick = CardRules.classify(active_cards)
	active_trick["cards"] = active_cards
	active_trick["owner_seat"] = HUMAN
	recent_plays = ["3S", "", ""]
	ai_reasons = ["", "", ""]
	hint_reason = ""
	message = "Bomb conservation fixture: AI should answer with 4S, not bomb."


func hand_summary_text() -> String:
	return _hand_summary_for(DoudizhuGame.HUMAN)


func rules_help_text() -> String:
	return "Supported: single, pair, triple, three with one, three with pair, straight, consecutive pairs, airplane, bomb, joker bomb.\nPass only when following another play. If both opponents pass, the last player leads.\nHint selects the lowest-cost legal play and conserves bombs unless needed.\nFirst side to empty a hand wins; New Hand preserves scores; New Match clears them."


func get_hand_ids(seat: int) -> Array[int]:
	var ids: Array[int] = []
	for card in hands[seat]:
		ids.append(int(card.id))
	return ids


func selected_card_dicts() -> Array[Dictionary]:
	return _selected_card_dicts()


func process_ai_until_human(max_steps: int = 12) -> void:
	var steps := 0
	while phase == "play" and current_seat != HUMAN and steps < max_steps:
		_ai_step()
		steps += 1


func _ai_step() -> void:
	var seat := current_seat
	var candidate := CardRules.find_best_legal_candidate(hands[seat], active_trick, _has_initiative(seat))
	if candidate.is_empty():
		ai_reasons[seat] = "No legal response"
		_apply_pass(seat)
		return
	ai_reasons[seat] = String(candidate.reason)
	_apply_play(seat, candidate.cards, candidate.classification)


func _apply_play(seat: int, play_cards: Array[Dictionary], candidate: Dictionary) -> void:
	for card in play_cards:
		_remove_card(seat, int(card.id))
	active_trick = candidate.duplicate()
	active_trick["cards"] = play_cards.duplicate()
	active_trick["owner_seat"] = seat
	recent_plays[seat] = CardRules.labels(play_cards)
	selected_cards = []
	consecutive_passes = 0
	initiative_seat = seat
	message = "%s played %s." % [SEAT_NAMES[seat], CardRules.labels(play_cards)]
	if seat != HUMAN and ai_reasons[seat] != "":
		message = "%s %s" % [message, ai_reasons[seat]]
	if _finish_if_needed(seat):
		return
	current_seat = (seat + 1) % 3


func _apply_pass(seat: int) -> void:
	recent_plays[seat] = "Pass"
	if seat != HUMAN and ai_reasons[seat] == "":
		ai_reasons[seat] = "No low-cost legal play"
	consecutive_passes += 1
	message = "%s passed." % SEAT_NAMES[seat]
	if consecutive_passes >= 2 and not active_trick.is_empty():
		current_seat = int(active_trick.owner_seat)
		initiative_seat = current_seat
		consecutive_passes = 0
		message = "All opponents passed. %s leads." % SEAT_NAMES[current_seat]
	else:
		current_seat = (seat + 1) % 3


func _finish_if_needed(seat: int) -> bool:
	if hands[seat].is_empty():
		phase = "result"
		winner_side = "landlord" if seat == landlord_seat else "farmers"
		winner_seat = seat
		result_key = "hand_%d_%s_%d" % [hand_number, winner_side, winner_seat]
		message = "%s win. New Hand starts another hand." % winner_side.capitalize()
		return true
	return false


func _selected_card_dicts() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for card_id in selected_cards:
		if not _hand_has_card(HUMAN, card_id):
			continue
		result.append(cards_by_id[card_id])
	result.sort_custom(CardRules.card_sort)
	return result


func _hand_has_card(seat: int, card_id: int) -> bool:
	for card in hands[seat]:
		if int(card.id) == card_id:
			return true
	return false


func _remove_card(seat: int, card_id: int) -> void:
	for index in range(hands[seat].size()):
		if int(hands[seat][index].id) == card_id:
			hands[seat].remove_at(index)
			return


func _sort_selection() -> void:
	selected_cards.sort_custom(func(a: int, b: int) -> bool:
		return int(cards_by_id[a].rank) < int(cards_by_id[b].rank)
	)


func _hand_summary_for(seat: int) -> String:
	var by_rank := {}
	for card in hands[seat]:
		var rank := int(card.rank)
		if not by_rank.has(rank):
			by_rank[rank] = 0
		by_rank[rank] += 1
	var singles := 0
	var pairs := 0
	var triples := 0
	var bombs := 0
	for rank in by_rank.keys():
		var count := int(by_rank[rank])
		if count == 1:
			singles += 1
		elif count == 2:
			pairs += 1
		elif count == 3:
			triples += 1
		elif count >= 4:
			bombs += 1
	var chains := _chain_count(hands[seat])
	return "Hand: %d cards | singles %d | pairs %d | triples %d | bombs %d | chains %d" % [
		hands[seat].size(),
		singles,
		pairs,
		triples,
		bombs,
		chains,
	]


func _chain_count(hand: Array) -> int:
	var ranks: Array[int] = []
	for card in hand:
		var rank := int(card.rank)
		if rank >= 15 or ranks.has(rank):
			continue
		ranks.append(rank)
	ranks.sort()
	var chains := 0
	var run := 0
	var previous := -99
	for rank in ranks:
		if rank == previous + 1:
			run += 1
		else:
			if run >= 5:
				chains += 1
			run = 1
		previous = rank
	if run >= 5:
		chains += 1
	return chains


func _sort_hand(seat: int) -> void:
	hands[seat].sort_custom(CardRules.card_sort)


func _has_initiative(seat: int) -> bool:
	return initiative_seat == seat or active_trick.is_empty()


func _shuffle(deck: Array[Dictionary], round_seed: int) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = round_seed
	for i in range(deck.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var temp := deck[i]
		deck[i] = deck[j]
		deck[j] = temp

