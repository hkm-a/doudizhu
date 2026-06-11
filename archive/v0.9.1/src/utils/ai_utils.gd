class_name AIUtils extends RefCounted

const AI_DIFFICULTY_KEY := "ai_difficulty"
const SEEN_CARDS_KEY := "ai_seen_cards"
const BOMB_COUNT_KEY := "ai_bomb_count"


static func get_difficulty() -> int:
	var config := ConfigFile.new()
	var err := config.load("user://settings.cfg")
	if err != OK:
		return 1
	var difficulty: Variant = config.get_value("ai", AI_DIFFICULTY_KEY, 1)
	if difficulty is int:
		return difficulty
	return 1


static func save_difficulty(level: int) -> void:
	var config := ConfigFile.new()
	var err := config.load("user://settings.cfg")
	if err != OK:
		pass
	config.set_value("ai", AI_DIFFICULTY_KEY, level)
	config.save("user://settings.cfg")


static func build_seen_cards_map(hand_ids: Array, bottom_cards: Array[Dictionary]) -> Dictionary:
	var seen := {}
	for cid in hand_ids:
		var rank := _card_rank_from_id(cid)
		if not seen.has(rank):
			seen[rank] = 0
		seen[rank] += 1
	for card in bottom_cards:
		if not card.is_empty() and card.has("rank"):
			var rank := int(card.rank)
			if not seen.has(rank):
				seen[rank] = 0
			seen[rank] += 1
	return seen


static func count_total_of_rank(rank: int) -> int:
	if rank >= 16 and rank <= 17:
		return 1
	return 4


static func cards_of_rank_remaining(rank: int, seen: Dictionary, total_in_play: int) -> int:
	var seen_count := 0
	if seen.has(rank):
		seen_count = seen[rank]
	return maxf(total_in_play - seen_count, 0)


static func should_conserve_bomb(seat: int, hands: Array[Array], landlord_seat: int,
		my_hands_remaining: int, has_joker_bomb: bool, active_trick: Dictionary,
		candidate: Dictionary, hands_history: Array) -> bool:
	if not _is_bomb_like(candidate):
		return false
	if my_hands_remaining > 8:
		return false
	if _is_landlord_winning(seat, hands, landlord_seat, hands_history):
		return false
	if not _trick_is_threatening(active_trick, landlord_seat, seat):
		return false
	return true


static func should_play_bomb_for_farmer(farmer_seat: int, landlord_seat: int,
	farmer_hands_remaining: int, landlord_hands_remaining: int,
	active_trick: Dictionary, candidate: Dictionary) -> bool:
	if not _is_bomb_like(candidate):
		return false
	if landlord_seat == -1 or landlord_hands_remaining <= 0:
		return false
	if landlord_hands_remaining <= 3 and farmer_hands_remaining > 5:
		return true
	if landlord_hands_remaining <= 5 and not active_trick.is_empty():
		if int(active_trick.owner_seat) == landlord_seat:
			return true
	return false


static func coordinate_farmer_lead(farmer_seat: int, landlord_seat: int,
	farmer_hands_remaining: int, landlord_hands_remaining: int,
	has_initiative: bool, candidate: Dictionary) -> Dictionary:
	if not has_initiative:
		return {}
	var play_type := ""
	if candidate.has("classification"):
		var classification: Dictionary = candidate["classification"]
		play_type = String(classification.get("play_type", ""))
	else:
		play_type = String(candidate.get("play_type", ""))
	if landlord_hands_remaining <= 3:
		var strong_types := [CardRules.TYPE_BOMB, CardRules.TYPE_JOKER_BOMB]
		if play_type in strong_types:
			return candidate
	if landlord_hands_remaining <= 5 and not _triple_exists_in_hand(candidate):
		if _is_triple_or_strong(candidate):
			return candidate
	return candidate


static func apply_memory_tracking(seen_cards: Array, hand_ids: Array,
	bottom_cards: Array[Dictionary], trick_cards: Array[Dictionary]) -> Array[int]:
	var seen := Array(seen_cards)
	for cid in hand_ids:
		if not seen.has(cid):
			seen.append(cid)
	for card in bottom_cards:
		if not card.is_empty() and card.has("id"):
			var cid := int(card.id)
			if not seen.has(cid):
				seen.append(cid)
	for card in trick_cards:
		if not card.is_empty() and card.has("id"):
			var cid := int(card.id)
			if not seen.has(cid):
				seen.append(cid)
	return seen


static func _is_bomb_like(candidate: Dictionary) -> bool:
	var play_type := ""
	if candidate.has("classification"):
		var classification: Dictionary = candidate["classification"]
		play_type = String(classification.get("play_type", ""))
	else:
		play_type = String(candidate.get("play_type", ""))
	return play_type == CardRules.TYPE_BOMB or play_type == CardRules.TYPE_JOKER_BOMB


static func _is_landlord_winning(seat: int, hands: Array[Array], landlord_seat: int,
	hands_history: Array) -> bool:
	if landlord_seat == seat:
		return false
	var landlord_hand := hands[landlord_seat]
	return landlord_hand.size() <= 3


static func _trick_is_threatening(active_trick: Dictionary, landlord_seat: int, seat: int) -> bool:
	if active_trick.is_empty():
		return false
	if int(active_trick.owner_seat) == landlord_seat:
		return true
	return false


static func _is_triple_or_strong(candidate: Dictionary) -> bool:
	var play_type := ""
	if candidate.has("classification"):
		var classification: Dictionary = candidate["classification"]
		play_type = String(classification.get("play_type", ""))
	else:
		play_type = String(candidate.get("play_type", ""))
	return play_type == CardRules.TYPE_TRIPLE or play_type == CardRules.TYPE_JOKER_BOMB


static func _triple_exists_in_hand(candidate: Dictionary) -> bool:
	var pt := String(candidate.classification.play_type) if candidate.has("classification") else ""
	return pt == CardRules.TYPE_TRIPLE


static func _card_rank_from_id(card_id: int) -> int:
	if card_id >= 52:
		if card_id == 52:
			return 16
		if card_id == 53:
			return 17
		return card_id
	var rank := (card_id % 13) + 3
	return rank
