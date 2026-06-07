class_name C_AIDifficulty extends Component

@export var level: int = 1  # 0=normal, 1=hard
@export var card_memory_active: bool = false

var seen_cards: Array[int] = []


func mark_card_seen(card_id: int) -> void:
	if not seen_cards.has(card_id):
		seen_cards.append(card_id)


func is_card_likely_remaining(card_rank: int) -> bool:
	var remaining_count := 0
	for seat_id in [0, 1, 2, 51, 52, 53]:
		if seat_id <= 50:
			var rank := seat_id % 13 + 3
			if rank == card_rank:
				remaining_count += 1
		elif seat_id >= 51:
			remaining_count += 1
	if card_rank == 16:
		remaining_count = 2
	elif card_rank == 17:
		remaining_count = 1
	for seen_id in seen_cards:
		var seen_rank := (seen_id % 13) + 3
		if seen_rank == card_rank:
			remaining_count -= 1
	if card_rank == 16:
		remaining_count = mini(remaining_count, 2)
	elif card_rank == 17:
		remaining_count = mini(remaining_count, 1)
	return remaining_count > 0


func reset() -> void:
	seen_cards.clear()
