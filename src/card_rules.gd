class_name CardRules
extends RefCounted

const TYPE_INVALID := "invalid"
const TYPE_SINGLE := "single"
const TYPE_PAIR := "pair"
const TYPE_TRIPLE := "triple"
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
	return int(candidate.primary_rank) > int(active.primary_rank)


static func find_smallest_legal(hand: Array, active: Dictionary, has_initiative: bool) -> Array[Dictionary]:
	var sorted_hand := hand.duplicate()
	sorted_hand.sort_custom(CardRules.card_sort)
	var search_sets: Array[Array] = []
	for size in [1, 2, 3, 4]:
		search_sets.append(_group_by_size(sorted_hand, size))
	search_sets.append(_joker_bomb(sorted_hand))

	var active_play := {} if has_initiative else active
	for groups in search_sets:
		for group in groups:
			var typed_group: Array[Dictionary] = []
			for card in group:
				typed_group.append(card)
			if can_beat(classify(typed_group), active_play):
				return typed_group
	return []


static func labels(cards: Array[Dictionary]) -> String:
	var parts: Array[String] = []
	for card in cards:
		parts.append(String(card.label))
	return " ".join(parts)


static func _group_by_size(hand: Array, size: int) -> Array[Array]:
	var by_rank := {}
	for card in hand:
		var rank := int(card.rank)
		if not by_rank.has(rank):
			by_rank[rank] = []
		by_rank[rank].append(card)
	var ranks := by_rank.keys()
	ranks.sort()
	var result: Array[Array] = []
	for rank in ranks:
		var group: Array = by_rank[rank]
		if group.size() >= size:
			result.append(group.slice(0, size))
	return result


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
