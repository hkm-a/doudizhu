extends RefCounted

## Compares two classified plays to determine if the new play beats the old.
##
## Rules:
## - Same pattern type and structural length: compare by primary_rank
## - Bomb beats any non-bomb
## - Rocket beats everything
## - Different pattern types (except bomb rules): invalid

## Pattern hierarchy for comparison
enum Pattern {
	UNDEFINED,
	SINGLE, PAIR, TRIPLE, TRIPLE_SINGLE, TRIPLE_PAIR,
	STRAIGHT, CONSECUTIVE_PAIRS, AIRPLANE, AIRPLANE_WINGS,
	BOMB, ROCKET,
}

# Pattern levels (higher = more powerful, structurally)
const PATTERN_LEVELS := {
	Pattern.SINGLE: 1,
	Pattern.PAIR: 2,
	Pattern.TRIPLE: 3,
	Pattern.TRIPLE_SINGLE: 4,
	Pattern.TRIPLE_PAIR: 5,
	Pattern.STRAIGHT: 6,
	Pattern.CONSECUTIVE_PAIRS: 7,
	Pattern.AIRPLANE: 8,
	Pattern.AIRPLANE_WINGS: 9,
	Pattern.BOMB: 10,
	Pattern.ROCKET: 11,
}


## Check if `play` beats `trick`.
## If `trick` is empty, any valid play is valid (leading).
## Returns true if `play` is a legal response.
static func can_beat(play: Dictionary, trick: Dictionary) -> bool:
	if trick.is_empty():
		return play.get("is_valid", false)
	
	if not play.get("is_valid", false):
		return false
	
	var play_pattern := play["pattern"]
	var trick_pattern := trick["pattern"]
	
	# Rocket beats everything
	if play_pattern == Pattern.ROCKET:
		return true
	if trick_pattern == Pattern.ROCKET:
		return false
	
	# Bomb beats non-bomb
	if play_pattern == Pattern.BOMB and trick_pattern != Pattern.BOMB:
		return true
	if play_pattern != Pattern.BOMB and trick_pattern == Pattern.BOMB:
		return false
	
	# Same pattern type: compare by primary rank and structural length
	if play_pattern == trick_pattern:
		# Structural length must match (except for triple+single vs triple+single with different attachments)
		# For straights, consecutive pairs, airplanes: structural_length must match
		if play["structural_length"] == trick["structural_length"]:
			return play["primary_rank"] > trick["primary_rank"]
		# For triple+single and triple+pair: only triple rank matters, count must match
		if play_pattern in [Pattern.TRIPLE_SINGLE, Pattern.TRIPLE_PAIR]:
			return play["structural_length"] == trick["structural_length"]
	
	return false
