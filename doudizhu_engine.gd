extends RefCounted

## Core game engine for Dou Dizhu.
## Pure data model — zero Godot node references.
##
## Phases:
##   SETUP → DEAL → BIDDING → PLAY → RESULT

enum Phase { SETUP, DEAL, BIDDING, PLAY, RESULT }
enum Seat { HUMAN = 0, AI_LEFT = 1, AI_RIGHT = 2 }

const SEAT_NAMES := ["Player", "AI Left", "AI Right"]
const SEAT_COUNT := 3
const CARDS_PER_PLAYER := 17
const BOTTOM_CARDS := 3
const BID_TIMEOUT := 15.0
const PLAY_TIMEOUT := 30.0

# Lazy-loaded helpers (class_name types not available at parse time)
var _deck: RefCounted
var _classifier: RefCounted
var _comparer: RefCounted
var _validator: RefCounted
var _card: RefCounted
var _card_script: RefCounted

func _init() -> void:
	_deck = load("res://deck.gd").new()
	_classifier = load("res://classifier.gd").new()
	_comparer = load("res://comparer.gd").new()
	_validator = load("res://validator.gd").new()
	_card_script = load("res://card.gd")
	_card = load("res://card.gd").new()


# --- State ---
var phase: Phase = Phase.SETUP
var current_seat: int = Seat.HUMAN
var landlord_seat: int = -1
var hands: Array[Array] = [[], [], []]
var bottom_cards: Array[Dictionary] = []
var roles: Array[String] = ["", "", ""]
var selected_cards: Array[int] = []
var active_trick: Dictionary = {}
var recent_plays: Array[String] = ["", "", ""]
var ai_reasons: Array[String] = ["", "", ""]

# Bidding state
var bid_amount: int = 0
var bid_counter: int = 0
var highest_bid: int = 0
var highest_bidder: int = -1
var bid_passed: Array[bool] = [false, false, false]

# Play state
var initiative_seat: int = -1
var consecutive_passes: int = 0
var winner_side: String = ""
var winner_seat: int = -1
var hand_number: int = 0
var multiplier: int = 1  # 1 base, x2 per bomb, x4 for rocket

# Timer state
var timer_remaining: float = 0.0
var timer_active: bool = false

# Seed for reproducibility
var seed: int = 7


func new_round(round_seed: int = 7) -> void:
	seed = round_seed
	hand_number += 1
	
	# Reset all state
	hands = [[], [], []]
	bottom_cards = []
	roles = ["", "", ""]
	selected_cards = []
	active_trick = {}
	recent_plays = ["", "", ""]
	ai_reasons = ["", "", ""]
	
	bid_amount = 0
	bid_counter = 0
	highest_bid = 0
	highest_bidder = -1
	bid_passed = [false, false, false]
	
	initiative_seat = -1
	consecutive_passes = 0
	winner_side = ""
	winner_seat = -1
	multiplier = 1
	
	# Deal cards
	var result := _self._deck.deal(round_seed)
	hands = result["hands"]
	bottom_cards = result["bottom_cards"]
	
	# Transition to bidding
	phase = Phase.BIDDING
	current_seat = Seat.HUMAN
	timer_remaining = BID_TIMEOUT
	timer_active = true


## Call a bid for the current player.
## points: 1, 2, or 3. Returns true if valid.
func call_bid(player_seat: int, points: int) -> bool:
	if phase != Phase.BIDDING:
		return false
	if player_seat != current_seat:
		return false
	if bid_passed[player_seat]:
		return false
	if points < 1 or points > 3:
		return false
	
	# Must be higher than current highest (unless first bid)
	if bid_counter > 0 and points <= highest_bid:
		return false
	
	bid_amount = points
	highest_bid = points
	highest_bidder = player_seat
	bid_counter += 1
	
	_next_bidder()
	return true


## Player passes on their bidding turn.
func pass_bid(player_seat: int) -> bool:
	if phase != Phase.BIDDING:
		return false
	if player_seat != current_seat:
		return false
	if bid_passed[player_seat]:
		return false
	
	bid_passed[player_seat] = true
	bid_counter += 1
	
	# Check if bidding is complete
	if _bidding_complete():
		_resolve_landlord()
		return true
	
	_next_bidder()
	return true


## Play selected cards.
## Returns true if the play was valid and executed.
func play_selected() -> bool:
	if phase != Phase.PLAY:
		return false
	if current_seat != Seat.HUMAN:
		return false
	
	var play_cards := _get_selected_card_dicts()
	if play_cards.is_empty():
		return false
	
	var classified := _classifier.classify(play_cards)
	if not classified["is_valid"]:
		return false
	
	# Check if this play beats the current trick
	if not active_trick.is_empty():
		if not self._comparer.can_beat(classified, active_trick):
			return false
	else:
		# Leading: any valid pattern is fine
		pass
	
	_execute_play(Seat.HUMAN, play_cards, classified)
	return true


## Pass on play turn.
func pass_turn() -> bool:
	if phase != Phase.PLAY:
		return false
	if current_seat != Seat.HUMAN:
		return false
	if initiative_seat == Seat.HUMAN:
		return false  # Has initiative, must play
	
	_execute_pass(Seat.HUMAN)
	return true


## Get all legal plays for the current hand (for AI or hint).
func get_legal_plays() -> Array[Dictionary]:
	if phase != Phase.PLAY:
		return []
	
	var has_init := initiative_seat == current_seat
	return self._validator.find_legal_plays(hands[current_seat], active_trick, has_init)


## Tick the game timer. Returns true if timer expired and action was taken.
func tick_timer(delta: float) -> bool:
	if not timer_active:
		return false
	
	timer_remaining -= delta
	if timer_remaining <= 0.0:
		timer_remaining = 0.0
		timer_active = false
		
		if phase == Phase.BIDDING:
			# Auto-pass on bid timeout
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
				# Has initiative but no time — auto-play smallest card
				var smallest := _find_smallest_single()
				if not smallest.is_empty():
					var classified := self._classifier.classify(smallest)
					_execute_play(current_seat, smallest, classified)
					return true
			else:
				# No initiative, time's up — pass
				_execute_pass(current_seat)
				return true
	
	return false


## Process AI turns until it reaches the human player.
func process_ai_turns(max_steps: int = 6) -> bool:
	var steps := 0
	while phase == Phase.PLAY and current_seat != Seat.HUMAN and steps < max_steps:
		_ai_step(current_seat)
		steps += 1
	return phase == Phase.PLAY and current_seat == Seat.HUMAN


## Get current trick cards as display strings.
func get_trick_display() -> String:
	if active_trick.is_empty():
		return ""
	var labels := []
	for card in active_trick.get("cards", []):
		var c := load("res://card.gd").new(int(card["id"]))
		labels.append(c.get_display_label())
	return " ".join(labels)


## Get hand summary text for the human player.
func get_hand_summary() -> String:
	var rank_counts := _count_ranks_in_hand(Seat.HUMAN)
	var singles := 0
	var pairs := 0
	var triples := 0
	var bombs := 0
	
	for rank in rank_counts.keys():
		var count := rank_counts[rank]
		if count == 1:
			singles += 1
		elif count == 2:
			pairs += 1
		elif count == 3:
			triples += 1
		elif count >= 4:
			bombs += 1
	
	return "Hand: %d cards | singles %d | pairs %d | triples %d | bombs %d" % [
		hands[Seat.HUMAN].size(), singles, pairs, triples, bombs
	]


# --- Private methods ---

func _next_bidder() -> void:
	if _bidding_complete():
		return
	
	current_seat = (current_seat + 1) % SEAT_COUNT
	# Skip passed players
	var attempts := 0
	while bid_passed[current_seat] and attempts < SEAT_COUNT:
		current_seat = (current_seat + 1) % SEAT_COUNT
		attempts += 1
	
	if bid_counter >= 3:
		# All three have had a chance
		if bid_counter >= 3 and highest_bidder >= 0:
			# Check if all others passed after the highest bidder
			if bid_counter >= SEAT_COUNT:
				_resolve_landlord()
				return
	# Restart bidding if all passed
	if bid_counter >= 3:
		var all_passed := bid_passed[0] and bid_passed[1] and bid_passed[2]
		if all_passed:
			_resolve_landlord()
			return
	
	timer_remaining = BID_TIMEOUT
	timer_active = true


func _bidding_complete() -> bool:
	if bid_counter >= 3 and highest_bidder >= 0:
		return true
	# All three have passed
	if bid_counter >= 3:
		var all_passed := bid_passed[0] and bid_passed[1] and bid_passed[2]
		return all_passed
	return false


func _resolve_landlord() -> void:
	if highest_bidder >= 0:
		landlord_seat = highest_bidder
	else:
		# No one called — default to human
		landlord_seat = Seat.HUMAN
	
	roles[landlord_seat] = "地主"
	roles[(landlord_seat + 1) % SEAT_COUNT] = "农民"
	roles[(landlord_seat + 2) % SEAT_COUNT] = "农民"
	
	# Give bottom cards to landlord
	bottom_cards = []
	hands[landlord_seat].append_array(bottom_cards)
	self._deck.sort_hand(hands[landlord_seat])
	
	# Transition to play
	phase = Phase.PLAY
	current_seat = landlord_seat
	initiative_seat = landlord_seat
	consecutive_passes = 0
	active_trick = {}
	
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _execute_play(seat: int, play_cards: Array[Dictionary], classified: Dictionary) -> void:
	# Remove played cards from hand
	for card in play_cards:
		_remove_card(seat, int(card["id"]))
	
	# Update trick state
	active_trick = classified.duplicate()
	active_trick["owner_seat"] = seat
	recent_plays[seat] = classified["pattern_name"]
	selected_cards = []
	consecutive_passes = 0
	initiative_seat = seat
	
	# Track multiplier for bombs
	if classified["pattern"] == self._comparer.Pattern.BOMB:
		multiplier *= 2
	elif classified["pattern"] == self._comparer.Pattern.ROCKET:
		multiplier = 4
	
	# Check win condition
	if hands[seat].is_empty():
		phase = Phase.RESULT
		winner_seat = seat
		if seat == landlord_seat:
			winner_side = "landlord"
		else:
			winner_side = "farmers"
		return
	
	# Advance to next seat
	current_seat = (seat + 1) % SEAT_COUNT
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _execute_pass(seat: int) -> void:
	recent_plays[seat] = "Pass"
	consecutive_passes += 1
	
	if consecutive_passes >= 2 and not active_trick.is_empty():
		# All opponents passed — last player regains initiative
		current_seat = int(active_trick["owner_seat"])
		initiative_seat = current_seat
		consecutive_passes = 0
	else:
		current_seat = (seat + 1) % SEAT_COUNT
	
	timer_remaining = PLAY_TIMEOUT
	timer_active = true


func _ai_step(seat: int) -> void:
	var has_init := initiative_seat == seat
	var legal_plays := self._validator.find_legal_plays(hands[seat], active_trick, has_init)
	
	if legal_plays.is_empty():
		# No legal play — must pass
		_ai_reason(seat, "No legal response")
		_execute_pass(seat)
		return
	
	# Simple AI: pick smallest valid play
	var best_play := _ai_select_play(legal_plays, seat, has_init)
	var classified := self._classifier.classify(best_play)
	
	_ai_reason(seat, classified["pattern_name"])
	_execute_play(seat, best_play, classified)


func _ai_select_play(legal_plays: Array[Dictionary], seat: int, has_init: bool) -> Array[Dictionary]:
	# Filter out bombs and rockets unless necessary
	var safe_plays := []
	var bombs := []
	var rocket := []
	
	for play in legal_plays:
		if play["pattern"] == self._comparer.Pattern.BOMB:
			bombs.append(play)
		elif play["pattern"] == self._comparer.Pattern.ROCKET:
			rocket.append(play)
		else:
			safe_plays.append(play)
	
	if has_init:
		# Leading: prefer non-bomb plays, pick smallest
		if not safe_plays.is_empty():
			safe_plays.sort_custom(_ai_play_compare)
			return safe_plays[0]["cards"]
		elif not bombs.is_empty():
			bombs.sort_custom(_ai_play_compare)
			return bombs[0]["cards"]
		elif not rocket.is_empty():
			return rocket[0]["cards"]
	else:
		# Following: beat trick minimally, save bombs
		if not safe_plays.is_empty():
			safe_plays.sort_custom(_ai_play_compare)
			return safe_plays[0]["cards"]
		elif not bombs.is_empty() and _should_use_bomb(seat, bombs):
			bombs.sort_custom(_ai_play_compare)
			return bombs[0]["cards"]
		elif not rocket.is_empty() and _should_use_rocket(seat):
			return rocket[0]["cards"]
	
	# Fallback
	return legal_plays[0]["cards"]


func _ai_play_compare(a: Dictionary, b: Dictionary) -> bool:
	# Lower rank first
	var ra := int(a["primary_rank"])
	var rb := int(b["primary_rank"])
	if ra != rb:
		return ra < rb
	return a["structural_length"] < b["structural_length"]


func _should_use_bomb(seat: int, bombs: Array[Dictionary]) -> bool:
	# Use bomb if opponent has <= 5 cards
	var opponent_seat := (seat + 1) % SEAT_COUNT
	var opponent_cards := hands[opponent_seat].size()
	return opponent_cards <= 5


func _should_use_rocket(seat: int) -> bool:
	# Always use rocket if opponent has <= 3 cards
	for i in range(SEAT_COUNT):
		if i != seat and hands[i].size() <= 3:
			return true
	return false


func _ai_reason(seat: int, reason: String) -> void:
	ai_reasons[seat] = reason


func _find_smallest_single() -> Array[Dictionary]:
	for card in hands[Seat.HUMAN]:
		var r := int(card["rank"])
		if r < 16:
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
