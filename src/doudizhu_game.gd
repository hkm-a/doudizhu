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
var message := ""
var winner_side := ""
var seed := 7


func new_round(round_seed: int = 7) -> void:
	seed = round_seed
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
	winner_side = ""

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
	var legal := CardRules.find_smallest_legal(hands[HUMAN], active_trick, _has_initiative(HUMAN))
	selected_cards = []
	for card in legal:
		selected_cards.append(int(card.id))
	if selected_cards.is_empty():
		message = "No valid play is available."
	else:
		message = "Hint: %s" % CardRules.labels(legal)


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
	var play_cards := CardRules.find_smallest_legal(hands[seat], active_trick, _has_initiative(seat))
	if play_cards.is_empty():
		_apply_pass(seat)
		return
	_apply_play(seat, play_cards, CardRules.classify(play_cards))


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
	if _finish_if_needed(seat):
		return
	current_seat = (seat + 1) % 3


func _apply_pass(seat: int) -> void:
	recent_plays[seat] = "Pass"
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
		message = "%s win. New Round starts another hand." % winner_side.capitalize()
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
