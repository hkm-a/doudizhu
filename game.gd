extends RefCounted

const SEAT_NAMES := ["Player", "AI Left", "AI Right"]
const SEAT_COUNT := 3
const CARDS_PER_PLAYER := 17
const BOTTOM_CARDS_COUNT := 3
const BID_TIMEOUT := 15.0
const PLAY_TIMEOUT := 30.0

enum Phase { SETUP, DEAL, BIDDING, PLAY, RESULT }
enum Seat { HUMAN = 0, AI_LEFT = 1, AI_RIGHT = 2 }
enum Rank { THREE = 3, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, ACE = 14, TWO = 15, JOKER_SMALL = 16, JOKER_BIG = 17 }
enum Suit { SPADES = 0, HEARTS, DIAMONDS, CLUBS }

# Rank display symbols
const RANK_SYMBOLS := {
	Rank.THREE: "3", Rank.FOUR: "4", Rank.FIVE: "5", Rank.SIX: "6", Rank.SEVEN: "7",
	Rank.EIGHT: "8", Rank.NINE: "9", Rank.TEN: "10", Rank.JACK: "J", Rank.QUEEN: "Q",
	Rank.KING: "K", Rank.ACE: "A", Rank.TWO: "2", Rank.JOKER_SMALL: "SJ", Rank.JOKER_BIG: "BJ",
}

const SUIT_SYMBOLS := {
	Suit.SPADES: "\u2660", Suit.HEARTS: "\u2665", Suit.DIAMONDS: "\u2666", Suit.CLUBS: "\u2663",
}

# --- State ---
var phase: int = Phase.SETUP
var current_seat: int = Seat.HUMAN
var landlord_seat: int = -1
var hands: Array[Array] = [[], [], []]
var bottom_cards: Array[Dictionary] = []
var roles: Array[String] = ["", "", ""]
var selected_cards: Array[int] = []
var active_trick: Dictionary = {}
var recent_plays: Array[String] = ["", "", ""]
var ai_reasons: Array[String] = ["", "", ""]
var bid_amount: int = 0
var bid_counter: int = 0
var highest_bid: int = 0
var highest_bidder: int = -1
var bid_passed: Array[bool] = [false, false, false]
var initiative_seat: int = -1
var consecutive_passes: int = 0
var winner_side: String = ""
var winner_seat: int = -1
var hand_number: int = 0
var multiplier: int = 1
var timer_remaining: float = 0.0
var timer_active: bool = false
var seed: int = 7


func new_round(round_seed: int = 7) -> void:
	seed = round_seed
	hand_number += 1
	hands = [[], [], []]
	bottom_cards = []
	roles = ["", "", ""]
	selected_cards = []
	active_trick = {}
	recent_plays = ["", "", ""]
	ai_reasons = ["", "", ""]
	bid_amount = 0; bid_counter = 0; highest_bid = 0; highest_bidder = -1
	bid_passed = [false, false, false]
	initiative_seat = -1; consecutive_passes = 0
	winner_side = ""; winner_seat = -1; multiplier = 1
	
	var rng := RandomNumberGenerator.new()
	rng.seed = round_seed
	
	var deck: Array[Dictionary] = _create_full_deck()
	_shuffle(deck)
	
	var hands: Array[Array] = [[], [], []]
	for i in range(CARDS_PER_PLAYER * 3):
		hands[i % 3].append(deck[i])
	bottom_cards = deck.slice(CARDS_PER_PLAYER * 3)
	for seat in range(3):
		hands[seat].sort_custom(_sort_by_rank)
	
	phase = Phase.BIDDING
	current_seat = Seat.HUMAN
	timer_remaining = BID_TIMEOUT
	timer_active = true


func call_bid(player_seat: int, points: int) -> bool:
	if phase != Phase.BIDDING or player_seat != current_seat: return false
	if bid_passed[player_seat]: return false
	if points < 1 or points > 3: return false
	if bid_counter > 0 and points <= highest_bid: return false
	
	bid_amount = points; highest_bid = points; highest_bidder = player_seat
	bid_counter += 1
	_next_bidder()
	return true


func pass_bid(player_seat: int) -> bool:
	if phase != Phase.BIDDING or player_seat != current_seat: return false
	if bid_passed[player_seat]: return false
	bid_passed[player_seat] = true
	bid_counter += 1
	if _bidding_complete():
		_resolve_landlord()
		return true
	_next_bidder()
	return true


func play_selected() -> bool:
	if phase != Phase.PLAY or current_seat != Seat.HUMAN: return false
	var play_cards := _get_selected_card_dicts()
	if play_cards.is_empty(): return false
	var classified := classify_cards(play_cards)
	if classified["pattern"] == "INVALID": return false
	if not active_trick.is_empty():
		if not can_beat(classified, active_trick): return false
	
	_execute_play(Seat.HUMAN, play_cards, classified)
	return true


func pass_turn() -> bool:
	if phase != Phase.PLAY or current_seat != Seat.HUMAN: return false
	if initiative_seat == Seat.HUMAN: return false
	_execute_pass(Seat.HUMAN)
	return true


func get_legal_plays() -> Array[Dictionary]:
	if phase != Phase.PLAY: return []
	var has_init := initiative_seat == current_seat
	return find_legal_plays(hands[current_seat], active_trick, has_init)


func tick_timer(delta: float) -> bool:
	if not timer_active: return false
	timer_remaining -= delta
	if timer_remaining <= 0.0:
		timer_remaining = 0.0
		timer_active = false
		if phase == Phase.BIDDING:
			if not bid_passed[current_seat]:
				bid_passed[current_seat] = true
				bid_counter += 1
				if _bidding_complete():
					_resolve_landlord()
					return true
				_next_bidder()
			return true
		elif phase == Phase.PLAY:
			if initiative_seat == current_seat:
				var smallest := _find_smallest_single()
				if not smallest.is_empty():
					var classified := classify_cards(smallest)
					_execute_play(current_seat, smallest, classified)
					return true
			else:
				_execute_pass(current_seat)
				return true
	return false


func process_ai_turns(max_steps: int = 6) -> bool:
	var steps := 0
	while phase == Phase.PLAY and current_seat != Seat.HUMAN and steps < max_steps:
		_ai_step(current_seat)
		steps += 1
	return phase == Phase.PLAY and current_seat == Seat.HUMAN


func get_trick_display() -> String:
	if active_trick.is_empty(): return ""
	var labels := []
	for card in active_trick.get("cards", []):
		labels.append(_card_label(int(card["id"])))
	return " ".join(labels)


func get_hand_summary() -> String:
	var rank_counts := _count_ranks_in_hand(Seat.HUMAN)
	var singles := 0; var pairs := 0; var triples := 0; var bombs := 0
	for rank in rank_counts.keys():
		var count: int = rank_counts[rank]
		if count == 1: singles += 1
		elif count == 2: pairs += 1
		elif count == 3: triples += 1
		elif count >= 4: bombs += 1
	return "Hand: %d cards | singles %d | pairs %d | triples %d | bombs %d" % [
		hands[Seat.HUMAN].size(), singles, pairs, triples, bombs
	]


# ==================== PRIVATE ====================

func _create_full_deck() -> Array[Dictionary]:
	var deck: Array[Dictionary] = []
	for i in range(54):
		var rank := (i % 13) + 3
		var suit := i / 13
		var is_joker := false
		var label := ""
		if i < 52:
			label = "%s%s" % [RANK_SYMBOLS[rank], SUIT_SYMBOLS[suit]]
		elif i == 52:
			rank = Rank.JOKER_SMALL; label = "SJ"; is_joker = true
		elif i == 53:
			rank = Rank.JOKER_BIG; label = "BJ"; is_joker = true
		deck.append({"id": i, "rank": rank, "suit": suit, "is_joker": is_joker, "label": label})
	return deck


func _shuffle(deck: Array) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed
	for i in range(deck.size() - 1, 0, -1):
		var j := rng.randi_range(0, i)
		var temp: Variant = deck[i]
		deck[i] = deck[j]
		deck[j] = temp


func _next_bidder() -> void:
	if _bidding_complete(): return
	current_seat = (current_seat + 1) % SEAT_COUNT
	var attempts := 0
	while bid_passed[current_seat] and attempts < SEAT_COUNT:
		current_seat = (current_seat + 1) % SEAT_COUNT
		attempts += 1
	if bid_counter >= 3 and highest_bidder >= 0:
		if bid_counter >= SEAT_COUNT:
			_resolve_landlord()
			return
	if bid_counter >= 3:
		if bid_passed[0] and bid_passed[1] and bid_passed[2]:
			_resolve_landlord()
			return
	timer_remaining = BID_TIMEOUT
	timer_active = true


func _bidding_complete() -> bool:
	if bid_counter >= 3 and highest_bidder >= 0: return true
	if bid_counter >= 3 and bid_passed[0] and bid_passed[1] and bid_passed[2]: return true
	return false


func _resolve_landlord() -> void:
	landlord_seat = highest_bidder if highest_bidder >= 0 else Seat.HUMAN
	roles[landlord_seat] = "地主"
	roles[(landlord_seat + 1) % SEAT_COUNT] = "农民"
	roles[(landlord_seat + 2) % SEAT_COUNT] = "农民"
	hands[landlord_seat].append_array(bottom_cards)
	hands[landlord_seat].sort_custom(_sort_by_rank)
	phase = Phase.PLAY
	current_seat = landlord_seat
	initiative_seat = landlord_seat
	consecutive_passes = 0
	active_trick = {}
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _execute_play(seat: int, play_cards: Array[Dictionary], classified: Dictionary) -> void:
	for card in play_cards:
		_remove_card(seat, int(card["id"]))
	active_trick = classified.duplicate()
	active_trick["owner_seat"] = seat
	recent_plays[seat] = classified["pattern_name"]
	selected_cards = []
	consecutive_passes = 0
	initiative_seat = seat
	if classified["pattern"] == "Bomb":
		multiplier *= 2
	elif classified["pattern"] == "Rocket":
		multiplier = 4
	if hands[seat].is_empty():
		phase = Phase.RESULT
		winner_seat = seat
		winner_side = "landlord" if seat == landlord_seat else "farmers"
		return
	current_seat = (seat + 1) % SEAT_COUNT
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _execute_pass(seat: int) -> void:
	recent_plays[seat] = "Pass"
	consecutive_passes += 1
	if consecutive_passes >= 2 and not active_trick.is_empty():
		current_seat = int(active_trick["owner_seat"])
		initiative_seat = current_seat
		consecutive_passes = 0
	else:
		current_seat = (seat + 1) % SEAT_COUNT
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _ai_step(seat: int) -> void:
	var has_init := initiative_seat == seat
	var legal_plays := find_legal_plays(hands[seat], active_trick, has_init)
	if legal_plays.is_empty():
		ai_reasons[seat] = "No legal response"
		_execute_pass(seat)
		return
	var best_play := _ai_select_play(legal_plays, seat, has_init)
	var classified := classify_cards(best_play)
	ai_reasons[seat] = classified["pattern_name"]
	_execute_play(seat, best_play, classified)


func _ai_select_play(legal_plays: Array[Dictionary], seat: int, has_init: bool) -> Array[Dictionary]:
	var safe_plays := []
	var bombs := []
	var rocket := []
	for play in legal_plays:
		if play["pattern"] == "Bomb": bombs.append(play)
		elif play["pattern"] == "Rocket": rocket.append(play)
		else: safe_plays.append(play)
	
	if has_init:
		if not safe_plays.is_empty():
			safe_plays.sort_custom(_ai_play_compare)
			return safe_plays[0]["cards"]
		elif not bombs.is_empty():
			bombs.sort_custom(_ai_play_compare)
			return bombs[0]["cards"]
		elif not rocket.is_empty():
			return rocket[0]["cards"]
	else:
		if not safe_plays.is_empty():
			safe_plays.sort_custom(_ai_play_compare)
			return safe_plays[0]["cards"]
		elif not bombs.is_empty() and _should_use_bomb(seat):
			bombs.sort_custom(_ai_play_compare)
			return bombs[0]["cards"]
		elif not rocket.is_empty() and _should_use_rocket(seat):
			return rocket[0]["cards"]
	return legal_plays[0]["cards"]


func _ai_play_compare(a: Dictionary, b: Dictionary) -> bool:
	var ra := int(a["primary_rank"])
	var rb := int(b["primary_rank"])
	if ra != rb: return ra < rb
	return a["structural_length"] < b["structural_length"]


func _should_use_bomb(seat: int) -> bool:
	var opponent := (seat + 1) % SEAT_COUNT
	return hands[opponent].size() <= 5


func _should_use_rocket(seat: int) -> bool:
	for i in range(SEAT_COUNT):
		if i != seat and hands[i].size() <= 3: return true
	return false


func _find_smallest_single() -> Array[Dictionary]:
	for card in hands[Seat.HUMAN]:
		if int(card["rank"]) < Rank.JOKER_SMALL:
			return [card]
	return []


func _count_ranks_in_hand(seat: int) -> Dictionary:
	var counts := {}
	for card in hands[seat]:
		var r := int(card["rank"])
		counts[r] = counts.get(r, 0) + 1
	return counts


func _remove_card(seat: int, card_id: int) -> void:
	for i in range(hands[seat].size()):
		if int(hands[seat][i]["id"]) == card_id:
			hands[seat].remove_at(i)
			return


func _get_selected_card_dicts() -> Array[Dictionary]:
	var result := []
	for card_id in selected_cards:
		for card in hands[Seat.HUMAN]:
			if int(card["id"]) == card_id:
				result.append(card)
				break
	return result


func _card_label(card_id: int) -> String:
	if card_id >= 52:
		return "SJ" if card_id == 52 else "BJ"
	var r := card_id % 13 + 3
	var s := card_id / 13
	return "%s%s" % [RANK_SYMBOLS[r], SUIT_SYMBOLS[s]]


func _sort_by_rank(a: Dictionary, b: Dictionary) -> bool:
	return int(a["rank"]) < int(b["rank"])


# ==================== PATTERN RECOGNITION ====================

func classify_cards(cards: Array) -> Dictionary:
	if cards.is_empty():
		return {"pattern": "INVALID", "primary_rank": -1, "count": 0, "pattern_name": "无效牌"}
	var count := cards.size()
	var sorted := _sort_by_rank_arr(cards)
	var ranks := _extract_ranks(sorted)
	var rank_counts := _count_map(ranks)
	var max_count: int = 0
	for v in rank_counts.values():
		if v > max_count: max_count = v
	
	if max_count == 4 and count == 4: return _mk("Bomb", ranks[0], count, "炸弹")
	if max_count == 4 and count == 6: return _mk("Rocket", -1, count, "火箭")
	if max_count == 4 and count == 8: return _mk("Bomb", ranks[0], count, "炸弹")
	
	if max_count == 3:
		var triple_rank := _find_rank_count(rank_counts, 3)
		if count == 3: return _mk("Triple", triple_rank, count, "三不带")
		elif count == 4: return _mk("Triple+1", triple_rank, count, "三带一")
		elif count == 5: return _mk("Triple+2", triple_rank, count, "三带二")
		elif count >= 6 and count % 3 == 0:
			if _is_consecutive_map(rank_counts, count / 3, ranks):
				return _mk("Airplane", triple_rank, count, "飞机")
	
	if max_count == 2 and count == 2: return _mk("Pair", ranks[0], count, "对子")
	if max_count == 1 and count >= 5:
		if _is_straight(ranks, count): return _mk("Straight", ranks[0], count, "顺子")
	if max_count == 2 and count >= 6 and count % 2 == 0:
		var pair_count := count / 2
		if pair_count >= 3 and _is_consecutive_map(rank_counts, pair_count, ranks):
			return _mk("Consecutive Pairs", ranks[0], count, "连对")
	if max_count == 1 and count >= 5 and count % 2 == 0:
		if _is_consecutive_map(rank_counts, count, ranks):
			return _mk("Straight", ranks[0], count, "顺子")
	
	return {"pattern": "INVALID", "primary_rank": -1, "count": count, "pattern_name": "无效牌"}


func _mk(pattern: String, pr: int, count: int, name: String) -> Dictionary:
	return {"pattern": pattern, "primary_rank": pr, "count": count, "pattern_name": name, "structural_length": _struct_len(pattern, count)}


func _struct_len(pattern: String, count: int) -> int:
	match pattern:
		"Straight": return count
		"Consecutive Pairs": return count / 2
		"Airplane": return count / 3
		_: return 1


func _sort_by_rank_arr(cards: Array) -> Array:
	var s := cards.duplicate()
	s.sort_custom(_sort_by_rank)
	return s


func _extract_ranks(cards: Array) -> Array:
	var r := []
	for c in cards: r.append(int(c["rank"]))
	return r


func _count_map(ranks: Array) -> Dictionary:
	var m := {}
	for r in ranks: m[r] = m.get(r, 0) + 1
	return m


func _find_rank_count(m: Dictionary, target: int) -> int:
	for k in m:
		if m[k] == target: return k
	return -1


func _is_consecutive_map(counts: Dictionary, expected: int, ranks: Array) -> bool:
	var unique := _unique_sorted(ranks)
	if unique.size() < expected: return false
	for i in range(unique.size() - 1):
		if unique[i + 1] - unique[i] != 1: return false
	return true


func _is_straight(ranks: Array, length: int) -> bool:
	var unique := _unique_sorted(ranks)
	if unique.size() < length: return false
	if unique[unique.size() - 1] > 14: return false  # No A+2+3 straight
	for i in range(unique.size() - 1):
		if unique[i + 1] - unique[i] != 1: return false
	return true


func _unique_sorted(arr: Array) -> Array:
	var u := []
	for a in arr:
		if not u.has(a): u.append(a)
	u.sort()
	return u


# ==================== COMPARISON ====================

func can_beat(classified: Dictionary, trick: Dictionary) -> bool:
	if trick.is_empty(): return true
	var trick_pattern: String = trick["pattern"]
	var trick_pr: int = trick["primary_rank"]
	var trick_count: int = trick["count"]
	
	if classified["pattern"] == "Bomb" and trick_pattern != "Bomb" and trick_pattern != "Rocket":
		return true
	if classified["pattern"] == "Rocket": return true
	if classified["pattern"] != trick_pattern: return false
	if classified["count"] != trick_count: return false
	return classified["primary_rank"] > trick_pr


# ==================== VALIDATOR ====================

func find_legal_plays(hand: Array[Dictionary], trick: Dictionary, has_init: bool) -> Array[Dictionary]:
	var results := []
	if has_init or trick.is_empty():
		# Can play anything: single, pair, triple, etc.
		results.append_array(_all_patterns(hand))
	else:
		var trick_count: int = trick["count"]
		var trick_pattern: String = trick["pattern"]
		var trick_pr: int = trick["primary_rank"]
		# Find matching patterns of same type but higher rank
		results.append_array(_matching_patterns(hand, trick_pattern, trick_pr, trick_count))
		# Add bombs
		results.append_array(_bombs_greater(hand, trick_pr))
		# Add rocket
		if _has_rocket(hand):
			results.append({"cards": _find_rocket(hand), "pattern": "Rocket", "primary_rank": 17, "pattern_name": "火箭", "structural_length": 1})
	return results


func _all_patterns(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results := []
	var rank_counts := _count_map(_extract_ranks(hand))
	
	# Singles
	for card in hand:
		if int(card["rank"]) < Rank.JOKER_SMALL:
			results.append({"cards": [card], "pattern": "Single", "primary_rank": int(card["rank"]), "pattern_name": "单张", "structural_length": 1})
	
	# Pairs
	for rank in rank_counts:
		if rank_counts[rank] >= 2:
			var pair := []
			var count := 0
			for card in hand:
				if count >= 2: break
				if int(card["rank"]) == rank: pair.append(card); count += 1
			results.append({"cards": pair, "pattern": "Pair", "primary_rank": rank, "pattern_name": "对子", "structural_length": 1})
	
	# Triples
	for rank in rank_counts:
		if rank_counts[rank] >= 3:
			var triple := []
			var count := 0
			for card in hand:
				if count >= 3: break
				if int(card["rank"]) == rank: triple.append(card); count += 1
			results.append({"cards": triple, "pattern": "Triple", "primary_rank": rank, "pattern_name": "三条", "structural_length": 1})
	
	# Triple+1
	for rank in rank_counts:
		if rank_counts[rank] >= 3:
			var triple := []; var t_count := 0
			for card in hand:
				if t_count >= 3: break
				if int(card["rank"]) == rank: triple.append(card); t_count += 1
			for card in hand:
				if int(card["rank"]) != rank:
					results.append({"cards": triple + [card], "pattern": "Triple+1", "primary_rank": rank, "pattern_name": "三带一", "structural_length": 1})
					break
	
	# Triple+2
	for rank in rank_counts:
		if rank_counts[rank] >= 3:
			var triple := []; var t_count := 0
			for card in hand:
				if t_count >= 3: break
				if int(card["rank"]) == rank: triple.append(card); t_count += 1
			for card1 in hand:
				if int(card1["rank"]) != rank:
					for card2 in hand:
						if int(card2["rank"]) != rank and int(card2["rank"]) == int(card1["rank"]):
							results.append({"cards": triple + [card1, card2], "pattern": "Triple+2", "primary_rank": rank, "pattern_name": "三带对", "structural_length": 1})
							break
					break
	
	# Bombs
	for rank in rank_counts:
		if rank_counts[rank] >= 4 and rank < Rank.JOKER_SMALL:
			var bomb := []; var b_count := 0
			for card in hand:
				if b_count >= 4: break
				if int(card["rank"]) == rank: bomb.append(card); b_count += 1
			results.append({"cards": bomb, "pattern": "Bomb", "primary_rank": rank, "pattern_name": "炸弹", "structural_length": 1})
	
	# Rocket
	if _has_rocket(hand):
		results.append({"cards": _find_rocket(hand), "pattern": "Rocket", "primary_rank": 17, "pattern_name": "火箭", "structural_length": 1})
	
	# Straights
	_results_straights(hand, results)
	
	# Consecutive pairs
	_results_consec_pairs(hand, results)
	
	# Airplanes
	_results_airplanes(hand, results)
	
	return results


func _matching_patterns(hand: Array[Dictionary], trick_pattern: String, trick_pr: int, trick_count: int) -> Array[Dictionary]:
	var results := []
	match trick_pattern:
		"Single":
			for card in hand:
				if int(card["rank"]) > trick_pr and int(card["rank"]) < Rank.JOKER_SMALL:
					results.append({"cards": [card], "pattern": "Single", "primary_rank": int(card["rank"]), "pattern_name": "单张", "structural_length": 1})
		"Pair":
			var rc := _count_map(_extract_ranks(hand))
			for rank in rc:
				if rc[rank] >= 2 and rank > trick_pr:
					var pair := []; var c := 0
					for card in hand:
						if c >= 2: break
						if int(card["rank"]) == rank: pair.append(card); c += 1
					results.append({"cards": pair, "pattern": "Pair", "primary_rank": rank, "pattern_name": "对子", "structural_length": 1})
		"Triple":
			var rc := _count_map(_extract_ranks(hand))
			for rank in rc:
				if rc[rank] >= 3 and rank > trick_pr:
					var triple := []; var c := 0
					for card in hand:
						if c >= 3: break
						if int(card["rank"]) == rank: triple.append(card); c += 1
					results.append({"cards": triple, "pattern": "Triple", "primary_rank": rank, "pattern_name": "三条", "structural_length": 1})
		"Triple+1":
			var rc := _count_map(_extract_ranks(hand))
			for rank in rc:
				if rc[rank] >= 3 and rank > trick_pr:
					var triple := []; var c := 0
					for card in hand:
						if c >= 3: break
						if int(card["rank"]) == rank: triple.append(card); c += 1
					for card in hand:
						if int(card["rank"]) != rank:
							results.append({"cards": triple + [card], "pattern": "Triple+1", "primary_rank": rank, "pattern_name": "三带一", "structural_length": 1})
							break
		"Triple+2":
			var rc := _count_map(_extract_ranks(hand))
			for rank in rc:
				if rc[rank] >= 3 and rank > trick_pr:
					var triple := []; var c := 0
					for card in hand:
						if c >= 3: break
						if int(card["rank"]) == rank: triple.append(card); c += 1
					for card1 in hand:
						if int(card1["rank"]) != rank:
							for card2 in hand:
								if int(card2["rank"]) != rank and int(card2["rank"]) == int(card1["rank"]):
									results.append({"cards": triple + [card1, card2], "pattern": "Triple+2", "primary_rank": rank, "pattern_name": "三带对", "structural_length": 1})
									break
							break
		"Straight":
			var rc := _count_map(_extract_ranks(hand))
			var len := trick_count
			for start_rank in rc:
				if start_rank > trick_pr:
					var straight := []; var ok := true
					for offset in range(len):
						var found := false
						for card in hand:
							if int(card["rank"]) == start_rank + offset:
								straight.append(card); found = true; break
						if not found: ok = false; break
					if ok and straight.size() == len:
						results.append({"cards": straight, "pattern": "Straight", "primary_rank": start_rank, "pattern_name": "顺子", "structural_length": len})
		"Consecutive Pairs":
			var rc := _count_map(_extract_ranks(hand))
			var pcount := trick_count / 2
			for start_rank in rc:
				if start_rank > trick_pr:
					var consec := []; var ok := true
					for offset in range(pcount):
						var pair := []
						for card in hand:
							if int(card["rank"]) == start_rank + offset and pair.size() < 2:
								pair.append(card)
						if pair.size() < 2: ok = false; break
						consec.append_array(pair)
					if ok and consec.size() == trick_count:
						results.append({"cards": consec, "pattern": "Consecutive Pairs", "primary_rank": start_rank, "pattern_name": "连对", "structural_length": pcount})
		"Airplane":
			var rc := _count_map(_extract_ranks(hand))
			var triple_count := trick_count / 3
			for start_rank in rc:
				if start_rank > trick_pr:
					var combo := []; var ok := true
					for offset in range(triple_count):
						var rank: int = start_rank + offset
						if rc.get(rank, 0) < 3: ok = false; break
						for card in hand:
							if int(card["rank"]) == rank: combo.append(card)
					if ok:
						results.append({"cards": combo, "pattern": "Airplane", "primary_rank": start_rank, "pattern_name": "飞机", "structural_length": triple_count})
	return results


func _bombs_greater(hand: Array[Dictionary], trick_pr: int) -> Array[Dictionary]:
	var results := []
	var rc := _count_map(_extract_ranks(hand))
	for rank in rc:
		if rc[rank] >= 4 and rank > trick_pr and rank < Rank.JOKER_SMALL:
			var bomb := []; var c := 0
			for card in hand:
				if c >= 4: break
				if int(card["rank"]) == rank: bomb.append(card); c += 1
			results.append({"cards": bomb, "pattern": "Bomb", "primary_rank": rank, "pattern_name": "炸弹", "structural_length": 1})
	return results


func _has_rocket(hand: Array[Dictionary]) -> bool:
	var has_small := false
	var has_big := false
	for card in hand:
		if int(card["rank"]) == Rank.JOKER_SMALL: has_small = true
		if int(card["rank"]) == Rank.JOKER_BIG: has_big = true
	return has_small and has_big


func _find_rocket(hand: Array[Dictionary]) -> Array[Dictionary]:
	var rocket := []
	for card in hand:
		if int(card["rank"]) >= Rank.JOKER_SMALL:
			rocket.append(card)
			if rocket.size() == 2: break
	return rocket


func _results_straights(hand: Array[Dictionary], results: Array) -> void:
	var rc := _count_map(_extract_ranks(hand))
	var max_len := 0
	var run_start := 0
	var run_len := 1
	for rank in rc:
		if rank >= Rank.JOKER_SMALL: break
		if rank < run_start + run_len: continue
	var sorted_ranks := []
	for r in rc:
		if r < Rank.JOKER_SMALL: sorted_ranks.append(r)
	sorted_ranks.sort()
	
	var best_start: int = 0
	var best_len: int = 0
	var cur_start: int = sorted_ranks[0] if not sorted_ranks.is_empty() else 0
	var cur_len: int = 0
	for r in sorted_ranks:
		if cur_len == 0:
			cur_start = r; cur_len = 1
		elif r == sorted_ranks[sorted_ranks.find(r) - 1] + 1 and sorted_ranks.find(r) > 0:
			cur_len += 1
		else:
			if cur_len > best_len: best_len = cur_len; best_start = cur_start
			cur_start = r; cur_len = 1
	if cur_len > best_len: best_len = cur_len; best_start = cur_start
	
	if best_len >= 5:
		for start in range(sorted_ranks[0], best_start + best_len - 4):
			var straight := []
			var ok := true
			for offset in range(5):
				var found := false
				for card in hand:
					if int(card["rank"]) == start + offset: straight.append(card); found = true; break
				if not found: ok = false; break
			if ok and start + 4 <= best_start + best_len - 1:
				results.append({"cards": straight, "pattern": "Straight", "primary_rank": start, "pattern_name": "顺子", "structural_length": 5})


func _results_consec_pairs(hand: Array[Dictionary], results: Array) -> void:
	var rc := _count_map(_extract_ranks(hand))
	var valid_ranks := []
	for r in rc:
		if rc[r] >= 2 and r < Rank.JOKER_SMALL: valid_ranks.append(r)
	valid_ranks.sort()
	
	var cur_start := 0; var cur_len := 0
	for i in range(valid_ranks.size()):
		if i == 0: cur_start = valid_ranks[0]; cur_len = 1
		elif valid_ranks[i] == valid_ranks[i - 1] + 1: cur_len += 1
		else:
			if cur_len >= 3:
				for s in range(cur_start, cur_start + cur_len - 2):
					var pairs := []
					for offset in range(3):
						for card in hand:
							if int(card["rank"]) == s + offset and pairs.size() < 6: pairs.append(card)
					if pairs.size() == 6:
						results.append({"cards": pairs, "pattern": "Consecutive Pairs", "primary_rank": s, "pattern_name": "连对", "structural_length": 3})
			cur_start = valid_ranks[i]; cur_len = 1
	if cur_len >= 3:
		for s in range(cur_start, cur_start + cur_len - 2):
			var pairs := []
			for offset in range(3):
				for card in hand:
					if int(card["rank"]) == s + offset and pairs.size() < 6: pairs.append(card)
			if pairs.size() == 6:
				results.append({"cards": pairs, "pattern": "Consecutive Pairs", "primary_rank": s, "pattern_name": "连对", "structural_length": 3})


func _results_airplanes(hand: Array[Dictionary], results: Array) -> void:
	var rc := _count_map(_extract_ranks(hand))
	var valid_ranks := []
	for r in rc:
		if rc[r] >= 3 and r < Rank.JOKER_SMALL: valid_ranks.append(r)
	valid_ranks.sort()
	
	if valid_ranks.size() < 2: return
	
	var cur_start := 0; var cur_len := 0
	for i in range(valid_ranks.size()):
		if i == 0: cur_start = valid_ranks[0]; cur_len = 1
		elif valid_ranks[i] == valid_ranks[i - 1] + 1: cur_len += 1
		else:
			if cur_len >= 2:
				for s in range(cur_start, cur_start + cur_len - 1):
					var combo := []
					for offset in range(2):
						var count := 0
						for card in hand:
							if int(card["rank"]) == s + offset and count < 3: combo.append(card); count += 1
					if combo.size() == 6:
						results.append({"cards": combo, "pattern": "Airplane", "primary_rank": s, "pattern_name": "飞机", "structural_length": 2})
			cur_start = valid_ranks[i]; cur_len = 1
	if cur_len >= 2:
		for s in range(cur_start, cur_start + cur_len - 1):
			var combo := []
			for offset in range(2):
				var count := 0
				for card in hand:
					if int(card["rank"]) == s + offset and count < 3: combo.append(card); count += 1
			if combo.size() == 6:
				results.append({"cards": combo, "pattern": "Airplane", "primary_rank": s, "pattern_name": "飞机", "structural_length": 2})
