class_name CardRules
extends RefCounted

const TYPE_INVALID := "invalid"
const TYPE_SINGLE := "single"
const TYPE_PAIR := "pair"
const TYPE_TRIPLE := "triple"
const TYPE_THREE_WITH_ONE := "three_with_one"
const TYPE_THREE_WITH_PAIR := "three_with_pair"
const TYPE_STRAIGHT := "straight"
const TYPE_CONSECUTIVE_PAIRS := "consecutive_pairs"
const TYPE_AIRPLANE := "airplane"
const TYPE_BOMB := "bomb"
const TYPE_JOKER_BOMB := "joker_bomb"

const RANK_LABELS := {
	3: "3",
	4: "4",
	5: "5",
	6: "6",
	7: "7",
	8: "8",
	9: "9",
	10: "10",
	11: "J",
	12: "Q",
	13: "K",
	14: "A",
	15: "2",
	16: "SJ",
	17: "BJ",
}


static func create_deck() -> Array[Dictionary]:
	var deck: Array[Dictionary] = []
	var id := 0
	for rank in range(3, 16):
		for suit in ["S", "H", "C", "D"]:
			deck.append({
				"id": id,
				"rank": rank,
				"suit": suit,
				"label": "%s%s" % [RANK_LABELS[rank], suit],
			})
			id += 1
	deck.append({"id": id, "rank": 16, "suit": "Joker", "label": "SJ"})
	id += 1
	deck.append({"id": id, "rank": 17, "suit": "Joker", "label": "BJ"})
	return deck


static func card_sort(a: Dictionary, b: Dictionary) -> bool:
	if int(a.rank) == int(b.rank):
		return int(a.id) < int(b.id)
	return int(a.rank) < int(b.rank)


static func classify(cards: Array[Dictionary]) -> Dictionary:
	if cards.is_empty():
		return _invalid()
	var counts := {}
	var ranks: Array[int] = []
	for card in cards:
		var rank := int(card.rank)
		if not counts.has(rank):
			counts[rank] = 0
			ranks.append(rank)
		counts[rank] += 1
	ranks.sort()

	if cards.size() == 1:
		return _result(TYPE_SINGLE, ranks[0], 1)
	if cards.size() == 2:
		if ranks == [16, 17]:
			return _result(TYPE_JOKER_BOMB, 17, 2)
		if ranks.size() == 1 and int(counts[ranks[0]]) == 2:
			return _result(TYPE_PAIR, ranks[0], 2)
	if cards.size() == 3 and ranks.size() == 1 and int(counts[ranks[0]]) == 3:
		return _result(TYPE_TRIPLE, ranks[0], 3)
	if cards.size() == 4 and ranks.size() == 1 and int(counts[ranks[0]]) == 4:
		return _result(TYPE_BOMB, ranks[0], 4)
	if cards.size() == 4:
		for rank in ranks:
			if int(counts[rank]) == 3:
				return _result(TYPE_THREE_WITH_ONE, rank, 4)
	if cards.size() == 5:
		var triple_rank := _rank_with_count(counts, 3)
		var pair_rank := _rank_with_count(counts, 2)
		if triple_rank != -1 and pair_rank != -1:
			return _result(TYPE_THREE_WITH_PAIR, triple_rank, 5)
	if _is_straight(ranks, counts, cards.size()):
		return _result(TYPE_STRAIGHT, ranks.back(), cards.size())
	if _is_consecutive_pairs(ranks, counts, cards.size()):
		return _result(TYPE_CONSECUTIVE_PAIRS, ranks.back(), cards.size())
	if _is_airplane(ranks, counts, cards.size()):
		return _result(TYPE_AIRPLANE, ranks.back(), cards.size())
	return _invalid()


static func can_beat(candidate: Dictionary, active: Dictionary) -> bool:
	if not bool(candidate.valid):
		return false
	if active.is_empty() or not bool(active.get("valid", false)):
		return true
	if String(candidate.play_type) == TYPE_JOKER_BOMB:
		return String(active.play_type) != TYPE_JOKER_BOMB
	if String(active.play_type) == TYPE_JOKER_BOMB:
		return false
	if String(candidate.play_type) == TYPE_BOMB and String(active.play_type) != TYPE_BOMB:
		return true
	if String(candidate.play_type) != String(active.play_type):
		return false
	if int(candidate.length) != int(active.length):
		return false
	return int(candidate.primary_rank) > int(active.primary_rank)


static func find_smallest_legal(hand: Array, active: Dictionary, has_initiative: bool) -> Array[Dictionary]:
	var candidate := find_best_legal_candidate(hand, active, has_initiative)
	if candidate.is_empty():
		return []
	return candidate.cards


static func find_best_legal_candidate(hand: Array, active: Dictionary, has_initiative: bool) -> Dictionary:
	var candidates := find_legal_candidates(hand, active, has_initiative)
	if candidates.is_empty():
		return {}
	return candidates[0]


static func find_legal_candidates(hand: Array, active: Dictionary, has_initiative: bool) -> Array[Dictionary]:
	var sorted_hand := hand.duplicate()
	sorted_hand.sort_custom(CardRules.card_sort)
	var search_sets: Array[Array] = []
	search_sets.append(_group_by_size(sorted_hand, 1))
	search_sets.append(_group_by_size(sorted_hand, 2))
	search_sets.append(_group_by_size(sorted_hand, 3))
	search_sets.append(_three_with_one(sorted_hand))
	search_sets.append(_three_with_pair(sorted_hand))
	search_sets.append(_straights(sorted_hand))
	search_sets.append(_consecutive_pairs(sorted_hand))
	search_sets.append(_airplanes(sorted_hand))
	search_sets.append(_group_by_size(sorted_hand, 4))
	search_sets.append(_joker_bomb(sorted_hand))

	var active_play := {} if has_initiative else active
	var candidates: Array[Dictionary] = []
	for groups in search_sets:
		for group in groups:
			var typed_group: Array[Dictionary] = []
			for card in group:
				typed_group.append(card)
			var classification := classify(typed_group)
			if can_beat(classification, active_play):
				candidates.append(_candidate(typed_group, classification, active_play, has_initiative))
	candidates.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
		if int(a.score) == int(b.score):
			return int(a.classification.primary_rank) < int(b.classification.primary_rank)
		return int(a.score) < int(b.score)
	)
	return candidates


static func describe_play_type(play_type: String) -> String:
	match play_type:
		TYPE_SINGLE:
			return "single"
		TYPE_PAIR:
			return "pair"
		TYPE_TRIPLE:
			return "triple"
		TYPE_THREE_WITH_ONE:
			return "three with one"
		TYPE_THREE_WITH_PAIR:
			return "three with pair"
		TYPE_STRAIGHT:
			return "straight"
		TYPE_CONSECUTIVE_PAIRS:
			return "consecutive pairs"
		TYPE_AIRPLANE:
			return "airplane"
		TYPE_BOMB:
			return "bomb"
		TYPE_JOKER_BOMB:
			return "joker bomb"
	return "invalid"


static func labels(cards: Array[Dictionary]) -> String:
	var parts: Array[String] = []
	for card in cards:
		parts.append(String(card.label))
	return " ".join(parts)


static func _candidate(
	cards: Array[Dictionary],
	classification: Dictionary,
	active: Dictionary,
	has_initiative: bool
) -> Dictionary:
	var score := _candidate_score(classification, active, has_initiative)
	return {
		"cards": cards,
		"classification": classification,
		"score": score,
		"reason": _candidate_reason(classification, active, has_initiative),
	}


static func _candidate_score(classification: Dictionary, active: Dictionary, has_initiative: bool) -> int:
	var play_type := String(classification.play_type)
	var score := int(classification.primary_rank) * 10 + int(classification.length)
	if play_type == TYPE_JOKER_BOMB:
		score += 20000
	elif play_type == TYPE_BOMB:
		score += 10000
	elif play_type in [TYPE_STRAIGHT, TYPE_CONSECUTIVE_PAIRS, TYPE_AIRPLANE]:
		score += 20
	elif play_type in [TYPE_THREE_WITH_ONE, TYPE_THREE_WITH_PAIR]:
		score += 40
	if not has_initiative and not active.is_empty():
		score += 100
	return score


static func _candidate_reason(classification: Dictionary, active: Dictionary, has_initiative: bool) -> String:
	var play_type := describe_play_type(String(classification.play_type))
	if String(classification.play_type) in [TYPE_BOMB, TYPE_JOKER_BOMB]:
		return "%s used because it is the cheapest legal override" % play_type.capitalize()
	if has_initiative or active.is_empty():
		return "Low-cost %s lead" % play_type
	return "Lowest legal %s response; bombs conserved" % play_type


static func _group_by_size(hand: Array, size: int) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var ranks := by_rank.keys()
	ranks.sort()
	var result: Array[Array] = []
	for rank in ranks:
		var group: Array = by_rank[rank]
		if group.size() >= size:
			result.append(group.slice(0, size))
	return result


static func _three_with_one(hand: Array) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var ranks := by_rank.keys()
	ranks.sort()
	var result: Array[Array] = []
	for triple_rank in ranks:
		if by_rank[triple_rank].size() < 3:
			continue
		for kicker_rank in ranks:
			if kicker_rank == triple_rank:
				continue
			result.append(by_rank[triple_rank].slice(0, 3) + [by_rank[kicker_rank][0]])
			break
	return result


static func _three_with_pair(hand: Array) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var ranks := by_rank.keys()
	ranks.sort()
	var result: Array[Array] = []
	for triple_rank in ranks:
		if by_rank[triple_rank].size() < 3:
			continue
		for pair_rank in ranks:
			if pair_rank == triple_rank or by_rank[pair_rank].size() < 2:
				continue
			result.append(by_rank[triple_rank].slice(0, 3) + by_rank[pair_rank].slice(0, 2))
			break
	return result


static func _straights(hand: Array) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var runs := _consecutive_rank_runs(_eligible_chain_ranks(by_rank, 1))
	var result: Array[Array] = []
	for run in runs:
		for length in range(5, run.size() + 1):
			for start in range(0, run.size() - length + 1):
				var group: Array = []
				for rank in run.slice(start, start + length):
					group.append(by_rank[rank][0])
				result.append(group)
	return result


static func _consecutive_pairs(hand: Array) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var runs := _consecutive_rank_runs(_eligible_chain_ranks(by_rank, 2))
	var result: Array[Array] = []
	for run in runs:
		for pair_count in range(3, run.size() + 1):
			for start in range(0, run.size() - pair_count + 1):
				var group: Array = []
				for rank in run.slice(start, start + pair_count):
					group.append_array(by_rank[rank].slice(0, 2))
				result.append(group)
	return result


static func _airplanes(hand: Array) -> Array[Array]:
	var by_rank := _cards_by_rank(hand)
	var runs := _consecutive_rank_runs(_eligible_chain_ranks(by_rank, 3))
	var result: Array[Array] = []
	for run in runs:
		for triple_count in range(2, run.size() + 1):
			for start in range(0, run.size() - triple_count + 1):
				var group: Array = []
				for rank in run.slice(start, start + triple_count):
					group.append_array(by_rank[rank].slice(0, 3))
				result.append(group)
	return result


static func _cards_by_rank(hand: Array) -> Dictionary:
	var by_rank := {}
	for card in hand:
		var rank := int(card.rank)
		if not by_rank.has(rank):
			by_rank[rank] = []
		by_rank[rank].append(card)
	return by_rank


static func _rank_with_count(counts: Dictionary, count: int) -> int:
	for rank in counts.keys():
		if int(counts[rank]) == count:
			return int(rank)
	return -1


static func _is_straight(ranks: Array[int], counts: Dictionary, card_count: int) -> bool:
	if card_count < 5 or ranks.size() != card_count:
		return false
	return _is_valid_chain(ranks, counts, 1)


static func _is_consecutive_pairs(ranks: Array[int], counts: Dictionary, card_count: int) -> bool:
	if card_count < 6 or card_count % 2 != 0 or ranks.size() != card_count / 2:
		return false
	return _is_valid_chain(ranks, counts, 2)


static func _is_airplane(ranks: Array[int], counts: Dictionary, card_count: int) -> bool:
	if card_count < 6 or card_count % 3 != 0 or ranks.size() != card_count / 3:
		return false
	return _is_valid_chain(ranks, counts, 3)


static func _is_valid_chain(ranks: Array[int], counts: Dictionary, count_per_rank: int) -> bool:
	for index in range(ranks.size()):
		var rank := ranks[index]
		if rank >= 15 or int(counts[rank]) != count_per_rank:
			return false
		if index > 0 and ranks[index - 1] + 1 != rank:
			return false
	return true


static func _eligible_chain_ranks(by_rank: Dictionary, count_per_rank: int) -> Array[int]:
	var ranks := by_rank.keys()
	ranks.sort()
	var result: Array[int] = []
	for rank in ranks:
		if int(rank) < 15 and by_rank[rank].size() >= count_per_rank:
			result.append(int(rank))
	return result


static func _consecutive_rank_runs(ranks: Array[int]) -> Array[Array]:
	var runs: Array[Array] = []
	var current: Array[int] = []
	for rank in ranks:
		if current.is_empty() or current.back() + 1 == rank:
			current.append(rank)
		else:
			runs.append(current)
			current = [rank]
	if not current.is_empty():
		runs.append(current)
	return runs


static func _joker_bomb(hand: Array) -> Array[Array]:
	var small := {}
	var big := {}
	for card in hand:
		if int(card.rank) == 16:
			small = card
		elif int(card.rank) == 17:
			big = card
	if small.is_empty() or big.is_empty():
		return []
	return [[small, big]]


static func _result(play_type: String, primary_rank: int, length: int) -> Dictionary:
	return {
		"valid": true,
		"play_type": play_type,
		"primary_rank": primary_rank,
		"length": length,
	}


static func _invalid() -> Dictionary:
	return {
		"valid": false,
		"play_type": TYPE_INVALID,
		"primary_rank": -1,
		"length": 0,
	}
