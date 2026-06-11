extends RefCounted

## Card data model for Dou Dizhu.
## Each card has a unique ID (0-53), rank, and suit.
## Jokers have no suit.

# --- Constants ---
const TOTAL_CARDS := 54
const BOTTOM_CARDS_COUNT := 3
const CARDS_PER_PLAYER := 17

# Rank values: 3=3 .. Ace=14, Two=15, Small Joker=16, Big Joker=17
enum Rank {
	THREE = 3,
	FOUR,
	FIVE,
	SIX,
	SEVEN,
	EIGHT,
	NINE,
	TEN,
	JACK,
	QUEEN,
	KING,
	ACE = 14,
	TWO = 15,
	JOKER_SMALL = 16,
	JOKER_BIG = 17,
}

# Suit values
enum Suit {
	SPADES = 0,
	HEARTS,
	DIAMONDS,
	CLUBS,
}

# Suit symbols for display
const SUIT_SYMBOLS := {
	Suit.SPADES: "\u2660",
	Suit.HEARTS: "\u2665",
	Suit.DIAMONDS: "\u2666",
	Suit.CLUBS: "\u2663",
}

# Rank symbols for display (abbreviations)
const RANK_SYMBOLS := {
	Rank.THREE: "3",
	Rank.FOUR: "4",
	Rank.FIVE: "5",
	Rank.SIX: "6",
	Rank.SEVEN: "7",
	Rank.EIGHT: "8",
	Rank.NINE: "9",
	Rank.TEN: "10",
	Rank.JACK: "J",
	Rank.QUEEN: "Q",
	Rank.KING: "K",
	Rank.ACE: "A",
	Rank.TWO: "2",
	Rank.JOKER_SMALL: "SJ",
	Rank.JOKER_BIG: "BJ",
}

# --- Fields ---
var id: int = 0
var rank: int = Rank.THREE
var suit: int = Suit.SPADES
var is_joker: bool = false

# --- Constructor ---
func _init(card_id: int = 0) -> void:
	id = card_id
	_decode_id(card_id)


## Decode card ID into rank and suit.
func _decode_id(card_id: int) -> void:
	if card_id < 52:
		rank = (card_id % 13) + 3
		suit = card_id / 13
		is_joker = false
	elif card_id == 52:
		rank = Rank.JOKER_SMALL
		suit = -1
		is_joker = true
	elif card_id == 53:
		rank = Rank.JOKER_BIG
		suit = -1
		is_joker = true


## Create a full 54-card deck.
static func create_deck() -> Array[Dictionary]:
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
			r = Rank.JOKER_SMALL
			s = -1
			j = true
		else:
			r = Rank.JOKER_BIG
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


## Get display label like "3\u2660", "AJ", "SJ", "BJ"
func get_display_label() -> String:
	if is_joker:
		return RANK_SYMBOLS[rank]
	return "%s%s" % [RANK_SYMBOLS[rank], SUIT_SYMBOLS[suit]]


## Get rank symbol only (no suit)
func get_rank_symbol() -> String:
	return RANK_SYMBOLS[rank]


## Compare two cards by rank (for sorting)
static func sort_by_rank(a: Dictionary, b: Dictionary) -> bool:
	var ra: int = int(a["rank"])
	var rb: int = int(b["rank"])
	return ra < rb


## Check if card is a joker
static func is_joker_card(card: Dictionary) -> bool:
	return int(card["rank"]) >= Rank.JOKER_SMALL
