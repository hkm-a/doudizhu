extends RefCounted

const MIN_STRAIGHT_LENGTH := 5
const MIN_CONSEC_PAIRS := 3
const MAX_STRAIGHT_END := 12  # Q


func classify(cards: Array) -> Dictionary:
	if cards.is_empty():
		return {"pattern": "INVALID", "primary_rank": -1, "count": 0}
	
	var count := cards.size()
	var sorted_cards := _sort_by_rank(cards)
	var ranks := _extract_ranks(sorted_cards)
	var rank_counts := _count_ranks(ranks)
	var max_count := rank_counts.values().max()
	
	if max_count == 4 and count == 4:
		return _make_result("Bomb", ranks[0], count)
	if max_count == 4 and count == 6:
		return _make_result("Rocket", -1, count)
	if max_count == 4 and count == 8:
		# 4+2 or 4+2+2: Bomb
		return _make_result("Bomb", ranks[0], count)
	
	if max_count == 3:
		triple_rank := _find_rank_with_count(rank_counts, 3)
		if count == 3:
			return _make_result("Triple", triple_rank, count)
		elif count == 4:
			return _make_result("Triple+1", triple_rank, count)
		elif count == 5:
			return _make_result("Triple+2", triple_rank, count)
		elif count >= 6 and count % 3 == 0:
			triple_count := count / 3
			if _is_consecutive_triples(ranks, triple_count):
				return _make_result("Airplane", triple_rank, count)
	
	if max_count == 2 and count == 2:
		return _make_result("Pair", ranks[0], count)
	
	if max_count == 1 and count >= MIN_STRAIGHT_LENGTH:
		if count <= MAX_STRAIGHT_END + 1:
			return _make_result("Straight", ranks[0], count)
	
	if max_count == 2:
		pair_count := count / 2
		if pair_count >= MIN_CONSEC_PAIRS:
			if _is_consecutive_pairs(ranks, pair_count):
				return _make_result("Consecutive Pairs", ranks[0], count)
	
	if max_count == 1 and count >= MIN_STRAIGHT_LENGTH and count % 2 == 0:
		single_count := count
		if _is_consecutive_singles(ranks, single_count):
			return _make_result("Straight", ranks[0], count)
	
	return {"pattern": "INVALID", "primary_rank": -1, "count": count}


func _make_result(pattern: String, primary_rank: int, count: int) -> Dictionary:
	return {
		"pattern": pattern,
		"primary_rank": primary_rank,
		"count": count,
		"structural_length": _structural_length(pattern, count),
	}


func _sort_by_rank(cards: Array) -> Array:
	var sorted := cards.duplicate()
	sorted.sort_custom(func(a, b): return int(a["id"]) < int(b["id"]))
	return sorted


func _extract_ranks(sorted_cards: Array) -> Array:
	var ranks := []
	for card in sorted_cards:
		ranks.append(int(card["primary_rank"]))
	return ranks


func _count_ranks(ranks: Array) -> Dictionary:
	var counts := {}
	for r in ranks:
		counts[r] = (counts[r] if r in counts else 0) + 1
	return counts


func _find_rank_with_count(rank_counts: Dictionary, target_count: int) -> int:
	for key in rank_counts:
		if rank_counts[key] == target_count:
			return key
	return -1


func _is_consecutive_triples(ranks: Array, triple_count: int) -> bool:
	var unique_ranks := _unique_sorted(ranks)
	if unique_ranks.size() < triple_count:
		return false
	for i in range(unique_ranks.size() - 1):
		if unique_ranks[i + 1] - unique_ranks[i] != 1:
			return false
	return true


func _is_consecutive_pairs(ranks: Array, pair_count: int) -> bool:
	var unique_ranks := _unique_sorted(ranks)
	if unique_ranks.size() < pair_count:
		return false
	for i in range(unique_ranks.size() - 1):
		if unique_ranks[i + 1] - unique_ranks[i] != 1:
			return false
	return true


func _is_consecutive_singles(ranks: Array, single_count: int) -> bool:
	var unique_ranks := _unique_sorted(ranks)
	if unique_ranks.size() < single_count:
		return false
	for i in range(unique_ranks.size() - 1):
		if unique_ranks[i + 1] - unique_ranks[i] != 1:
			return false
	return true


func _unique_sorted(arr: Array) -> Array:
	var unique := arr.duplicate()
	unique = unique.map(func(x): return x)
	unique = _remove_duplicates(unique)
	unique.sort()
	return unique


func _remove_duplicates(arr: Array) -> Array:
	var unique := []
	for item in arr:
		if not unique.has(item):
			unique.append(item)
	return unique


func _structural_length(pattern: String, count: int) -> int:
	match pattern:
		"Straight":
			return count
		"Consecutive Pairs":
			return count / 2
		"Airplane":
			return count / 3
		_:
			return 1
