class_name CardAssets
extends RefCounted

const ASSET_PATH := "res://assets/img/"

static var _card_images: Dictionary = {}
static var _card_back: Texture2D = null
static var _table_bg: Texture2D = null
static var _initialized := false
static var _all_loaded := true


static func _init() -> void:
	_initialize()


static func initialize() -> void:
	if _initialized:
		return
	_initialized = true
	_all_loaded = true
	_card_images.clear()

	for rank in range(3, 16):
		for suit in ["S", "H", "C", "D"]:
			var filename := _make_filename(rank, suit)
			var path := ASSET_PATH + filename
			var img := _load_image_file(path)
			if img != null:
				var card_id := _card_id_from_rank_suit(rank, suit)
				_card_images[card_id] = img
			else:
				_all_loaded = false

	var red_joker := _load_image_file(ASSET_PATH + "card_red_joker.png")
	if red_joker != null:
		_card_images[52] = red_joker
	else:
		_all_loaded = false

	var black_joker := _load_image_file(ASSET_PATH + "card_black_joker.png")
	if black_joker != null:
		_card_images[53] = black_joker
	else:
		_all_loaded = false

	_card_back = _load_image_file(ASSET_PATH + "card_back.png")
	if _card_back == null:
		_all_loaded = false

	_table_bg = _load_image_file(ASSET_PATH + "table_bg.png")
	if _table_bg == null:
		_all_loaded = false


static func _initialize() -> void:
	pass


static func _load_image_file(path: String) -> Texture2D:
	var res := ResourceLoader.load(path, "Texture2D", ResourceLoader.CACHE_MODE_REUSE)
	if res != null:
		return res as Texture2D
	return null


static func _make_filename(rank: int, suit: String) -> String:
	var rank_str := _rank_to_string(rank)
	var suit_str := _suit_to_filename(suit)
	return "card_%s_%s.png" % [rank_str, suit_str]


static func _rank_to_string(rank: int) -> String:
	match rank:
		3: return "3"
		4: return "4"
		5: return "5"
		6: return "6"
		7: return "7"
		8: return "8"
		9: return "9"
		10: return "10"
		11: return "j"
		12: return "q"
		13: return "k"
		14: return "a"
		15: return "2"
	return "3"


static func _suit_to_filename(suit: String) -> String:
	match suit:
		"S": return "spades"
		"H": return "hearts"
		"C": return "clubs"
		"D": return "diamonds"
	return "clubs"


static func _card_id_from_rank_suit(rank: int, suit: String) -> int:
	var suits := ["S", "H", "C", "D"]
	var suit_index := suits.find(suit)
	var rank_index := rank - 3
	return rank_index * 4 + suit_index


static func get_card_image(card_id: int) -> Texture2D:
	if not _initialized:
		initialize()
	return _card_images.get(card_id, null)


static func get_card_back() -> Texture2D:
	if not _initialized:
		initialize()
	return _card_back


static func get_table_bg() -> Texture2D:
	if not _initialized:
		initialize()
	return _table_bg


static func has_card_image(card_id: int) -> bool:
	if not _initialized:
		initialize()
	return _card_images.has(card_id)


static func card_id_to_suit(card_id: int) -> String:
	var suits := ["S", "H", "C", "D"]
	var rank_index := card_id / 4
	var suit_index := card_id % 4
	if rank_index < 0 or rank_index > 12:
		return ""
	return suits[suit_index]


static func card_id_to_rank(card_id: int) -> int:
	var rank_index := card_id / 4
	return rank_index + 3
