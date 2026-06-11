extends RefCounted

## Generates all legal plays for a given hand, given the current trick.
## Uses CardClassifier to identify all valid pattern matches.

# Import pattern types from CardComparer
const _PATTERN = load("res://comparer.gd").new().Pattern


## Find all legal plays from `hand` that can beat `trick`.
## If `has_initiative` is true, any pattern is allowed (leading play).
## Returns Array[Dictionary], each with classification + cards array.
static func find_legal_plays(hand: Array[Dictionary], trick: Dictionary, has_initiative: bool) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	
	# Always consider passing
	# (Pass is handled by the caller, not included in results)
	
	if has_initiative:
		# Can lead any legal pattern
		results = _find_all_patterns(hand)
	else:
		# Must beat the current trick
		var classified := load("res://classifier.gd").new().classify(trick.get("cards", []))
		results = _find_beating_patterns(hand, classified, trick)
	
	return results


## Find all possible patterns in a hand (for leading)
static func _find_all_patterns(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	
	# Single cards
	for card in hand:
		if int(card["rank"]) < 16.JOKER_SMALL:
			var classified := load("res://classifier.gd").new().classify([card])
			results.append(classified)
	
	# Pairs
	results.append_array(_find_pairs(hand))
	
	# Triples
	results.append_array(_find_triples(hand))
	
	# Triple+Single
	results.append_array(_find_triple_plus_single(hand))
	
	# Triple+Pair
	results.append_array(_find_triple_plus_pair(hand))
	
	# Straights
	results.append_array(_find_straights(hand))
	
	# Consecutive pairs
	results.append_array(_find_consecutive_pairs(hand))
	
	# Airplanes
	results.append_array(_find_airplanes(hand))
	
	# Bombs (4-of-a-kind)
	results.append_array(_find_bombs(hand))
	
	# Rocket
	results.append_array(_find_rocket(hand))
	
	return results


## Find all pair patterns
static func _find_pairs(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var rank_counts := _count_ranks(hand)
	
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 2:
			var pair_cards := _take_cards(hand, rank, 2)
			var classified := load("res://classifier.gd").new().classify(pair_cards)
			results.append(classified)
	
	return results


## Find all triple patterns
static func _find_triples(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var rank_counts := _count_ranks(hand)
	
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 3:
			var triple_cards := _take_cards(hand, rank, 3)
			var classified := load("res://classifier.gd").new().classify(triple_cards)
			results.append(classified)
	
	return results


## Find all triple+single patterns
static func _find_triple_plus_single(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var rank_counts := _count_ranks(hand)
	
	var triple_ranks := []
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 3:
			triple_ranks.append(rank)
	
	for triple_rank in triple_ranks:
		var triple_cards := _take_cards(hand, triple_rank, 3)
		# Find singles (any card not in the triple)
		var remaining := _remove_cards(hand, triple_rank, 3)
		for card in remaining:
			if int(card["rank"]) < 16.JOKER_SMALL:
				var combo := triple_cards.duplicate()
				combo.append(card)
				var classified := load("res://classifier.gd").new().classify(combo)
				if classified["is_valid"]:
					results.append(classified)
	
	return results


## Find all triple+pair patterns
static func _find_triple_plus_pair(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var rank_counts := _count_ranks(hand)
	
	var triple_ranks := []
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 3:
			triple_ranks.append(rank)
	
	for triple_rank in triple_ranks:
		var triple_cards := _take_cards(hand, triple_rank, 3)
		var remaining := _remove_cards(hand, triple_rank, 3)
		var pair_rank_counts := _count_ranks(remaining)
		
		for pair_rank in pair_rank_counts.keys():
			if pair_rank_counts[pair_rank] >= 2:
				var pair_cards := _take_cards_from_list(remaining, pair_rank, 2)
				var combo := triple_cards.duplicate()
				combo.append_array(pair_cards)
				var classified := load("res://classifier.gd").new().classify(combo)
				if classified["is_valid"]:
					results.append(classified)
	
	return results


## Find all straight patterns (5-12 consecutive singles, no 2/jokers)
static func _find_straights(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	
	# Get available ranks (excluding 2 and jokers)
	var available_ranks := _get_available_ranks(hand, false)  # exclude_2=true
	
	var runs := _find_consecutive_runs_simple(available_ranks)
	for run in runs:
		for length in range(5, run + 1):
			if length > 12:
				break
			var start_rank := run["start"]
			if start_rank + length - 1 > run["end"]:
				break
			var straight_cards := []
			for r in range(start_rank, start_rank + length):
				var cards := _take_cards(hand, r, 1)
				if not cards.is_empty():
					straight_cards.append(cards[0])
			if straight_cards.size() == length:
				var classified := load("res://classifier.gd").new().classify(straight_cards)
				results.append(classified)
	
	return results


## Find all consecutive pair patterns (3+ consecutive pairs, no 2/jokers)
static func _find_consecutive_pairs(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	
	var rank_counts := _count_ranks(hand)
	var pair_ranks := []
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 2 and rank < 16.TWO:
			pair_ranks.append(rank)
	
	var runs := _find_consecutive_runs_simple(pair_ranks)
	for run in runs:
		for num_pairs in range(3, run["length"] + 1):
			var start_rank := run["start"]
			if start_rank + num_pairs - 1 > run["end"]:
				break
			var pair_cards := []
			for r in range(start_rank, start_rank + num_pairs):
				var cards := _take_cards(hand, r, 2)
				pair_cards.append_array(cards)
			if pair_cards.size() == num_pairs * 2:
				var classified := load("res://classifier.gd").new().classify(pair_cards)
				results.append(classified)
	
	return results


## Find all airplane patterns
static func _find_airplanes(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	
	var rank_counts := _count_ranks(hand)
	var triple_ranks := []
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 3:
			triple_ranks.append(rank)
	
	var runs := _find_consecutive_runs_simple(triple_ranks)
	for run in runs:
		for num_triples in range(2, run["length"] + 1):
			var start_rank := run["start"]
			if start_rank + num_triples - 1 > run["end"]:
				break
			
			# Airplane without wings
			var airplane_cards := []
			for r in range(start_rank, start_rank + num_triples):
				var cards := _take_cards(hand, r, 3)
				airplane_cards.append_array(cards)
			var classified := load("res://classifier.gd").new().classify(airplane_cards)
			if classified["is_valid"]:
				results.append(classified)
			
			# Airplane with singles
			var remaining_after_triples := _remove_cards(hand, start_rank, num_triples * 3, true)
			var single_wings := _try_wing_cards(remaining_after_triples, num_triples, 1)
			for wing_cards in single_wings:
				var combo := airplane_cards.duplicate()
				combo.append_array(wing_cards)
				classified = load("res://classifier.gd").new().classify(combo)
				if classified["is_valid"]:
					results.append(classified)
			
			# Airplane with pairs
			var double_wings := _try_wing_cards(hand, num_triples, 2, start_rank, num_triples)
			for wing_cards in double_wings:
				var combo := airplane_cards.duplicate()
				combo.append_array(wing_cards)
				classified = load("res://classifier.gd").new().classify(combo)
				if classified["is_valid"]:
					results.append(classified)
	
	return results


## Find all bomb patterns
static func _find_bombs(hand: Array[Dictionary]) -> Array[Dictionary]:
	var results: Array[Dictionary] = []
	var rank_counts := _count_ranks(hand)
	
	for rank in rank_counts.keys():
		if rank_counts[rank] >= 4:
			var bomb_cards := _take_cards(hand, rank, 4)
			var classified := load("res://classifier.gd").new().classify(bomb_cards)
			results.append(classified)
	
	return results


## Find rocket (if both jokers present)
static func _find_rocket(hand: Array[Dictionary]) -> Array[Dictionary]:
	var has_small := false
	var has_big := false
	
	for card in hand:
		var r := int(card["rank"])
		if r == 16.JOKER_SMALL:
			has_small = true
		if r == 16.JOKER_BIG:
			has_big = true
	
	if has_small and has_big:
		var rocket_cards := []
		for card in hand:
			if int(card["rank"]) >= 16.JOKER_SMALL:
				rocket_cards.append(card)
				if rocket_cards.size() == 2:
					break
		return [load("res://classifier.gd").new().classify(rocket_cards)]
	
	return []


## Try to find wing cards for airplanes
static func _try_wing_cards(hand: Array[Dictionary], num_wings: int, per_triple: int, exclude_start: int = -1, exclude_length: int = -1) -> Array[Array]:
	var results: Array[Array] = []
	
	if per_triple == 1:
		# Need num_wings singles
		var available := []
		for card in hand:
			if exclude_start >= 0:
				var r = int(card["rank"])
				if r >= exclude_start and r < exclude_start + exclude_length:
					continue
			available.append(card)
		
		# Take first num_wings cards
		if available.size() >= num_wings:
			results.append(available.slice(0, num_wings))
	elif per_triple == 2:
		# Need num_wings pairs
		var rank_counts := _count_ranks(hand)
		var pair_candidates := []
		for card in hand:
			if exclude_start >= 0:
				var r = int(card["rank"])
				if r >= exclude_start and r < exclude_start + exclude_length:
					continue
			pair_candidates.append(card)
		
		var pair_count := _count_ranks(pair_candidates)
		var wings := []
		for rank in pair_count.keys():
			if pair_count[rank] >= 2:
				var pair_cards := _take_cards_from_list(pair_candidates, rank, 2)
				wings.append_array(pair_cards)
				if wings.size() >= num_wings * 2:
					break
		
		if wings.size() >= num_wings * 2:
			results.append(wings.slice(0, num_wings * 2))
	
	return results


## Helper: count cards of each rank in hand
static func _count_ranks(hand: Array[Dictionary]) -> Dictionary:
	var counts := {}
	for card in hand:
		var r := int(card["rank"])
		counts[r] = counts.get(r, 0) + 1
	return counts


## Helper: take N cards of a specific rank from hand
static func _take_cards(hand: Array[Dictionary], rank: int, count: int) -> Array[Dictionary]:
	var result := []
	var needed := count
	for card in hand:
		if needed <= 0:
			break
		if int(card["rank"]) == rank:
			result.append(card)
			needed -= 1
	return result


## Helper: remove N cards of specific ranks from hand
static func _remove_cards(hand: Array[Dictionary], start_rank: int, triple_count: int, exclude_ranks_only: bool = false) -> Array[Dictionary]:
	var result := []
	var exclude_end := start_rank + triple_count
	for card in hand:
		var r := int(card["rank"])
		if exclude_ranks_only and r >= start_rank and r < exclude_end:
			continue
		result.append(card)
	return result


## Helper: take N cards of a rank from a list
static func _take_cards_from_list(hand: Array[Dictionary], rank: int, count: int) -> Array[Dictionary]:
	var result := []
	var needed := count
	for card in hand:
		if needed <= 0:
			break
		if int(card["rank"]) == rank:
			result.append(card)
			needed -= 1
	return result


## Helper: find consecutive runs in a sorted list of ranks
static func _find_consecutive_runs_simple(ranks: Array) -> Array:
	if ranks.is_empty():
		return []
	
	ranks.sort()
	var results: Array = []
	
	var start := ranks[0]
	var end := ranks[0]
	
	for i in range(1, ranks.size()):
		if ranks[i] == end + 1:
			end = ranks[i]
		else:
			if end - start + 1 >= 2:
				results.append({
					"start": start,
					"end": end,
					"length": end - start + 1,
				})
			start = ranks[i]
			end = ranks[i]
	
	if end - start + 1 >= 2:
		results.append({
			"start": start,
			"end": end,
			"length": end - start + 1,
		})
	
	return results


## Helper: get available ranks (excluding 2 and jokers if specified)
static func _get_available_ranks(hand: Array[Dictionary], exclude_2: bool = true) -> Array:
	var ranks := {}
	for card in hand:
		var r := int(card["rank"])
		if exclude_2 and r >= 16.TWO:
			continue
		if r >= 16.JOKER_SMALL:
			continue
		ranks[r] = true
	var result := ranks.keys()
	result.sort()
	return result
