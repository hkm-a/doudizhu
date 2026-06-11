extends RefCounted

## Deck management: shuffle, deal, and sort cards.
## Uses seeded Fisher-Yates shuffle for reproducibility.

var _rng := RandomNumberGenerator.new()

const TOTAL_CARDS := 54
const CARDS_PER_PLAYER := 17

const SUIT_SYMBOLS := {
	0: "\u2660",
	1: "\u2665",
	2: "\u2666",
	3: "\u2663",
}

const RANK_SYMBOLS := {
	3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8", 9: "9", 10: "10",
	11: "J", 12: "Q", 13: "K", 14: "A", 15: "2", 16: "SJ", 17: "BJ",
}


## Create a shuffled deck and deal cards.
func deal(round_seed: int = 7) -> Dictionary:
	_rng.seed = round_seed
	
	var deck := _create_deck()
	_shuffle(deck)
	
	var hands: Array[Array] = [[], [], []]
	for i in range(CARDS_PER_PLAYER * 3):
		hands[i % 3].append(deck[i])
	
	var bottom_cards := deck.slice(CARDS_PER_PLAYER * 3)
	
	for seat in range(3):
		hands[seat].sort_custom(sort_by_rank)
	
	return {
		"hands": hands,
		"bottom_cards": bottom_cards,
	}


## Fisher-Yates shuffle with seeded RNG
func _shuffle(deck: Array) -> void:
	for i in range(deck.size() - 1, 0, -1):
		var j := _rng.randi_range(0, i)
		var temp := deck[i]
		deck[i] = deck[j]
		deck[j] = temp


## Sort a hand array by rank in place
static func sort_hand(hand: Array) -> void:
	hand.sort_custom(sort_by_rank)


## Create a full 54-card deck.
static func sort_by_rank(a: Dictionary, b: Dictionary) -> bool:
	var ra: int = int(a["rank"])
	var rb: int = int(b["rank"])
	return ra < rb


static func _create_deck() -> Array[Dictionary]:
	var deck: Array[Dictionary] = []
	for i in range(TOTAL_CARDS):
		var r: int
		var s: int
		var j: bool
		if i < 52:
			r = (i % 13) + 3
			s = i / 13
			j = false
		elif i == 52:
			r = 16
			s = -1
			j = true
		else:
			r = 17
			s = -1
			j = true
		var label: String
		if j:
			label = RANK_SYMBOLS[r]
		else:
			label = "%s%s" % [RANK_SYMBOLS[r], SUIT_SYMBOLS[s]]
		deck.append({
			"id": i,
			"rank": r,
			"suit": s,
			"is_joker": j,
			"label": label,
		})
	return deck
