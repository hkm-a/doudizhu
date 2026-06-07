class_name LocalizationUtils
extends RefCounted


const STRING_RESOURCE_PATH := "res://src/localization/strings_%s.tres"

var _current_locale := "en"
var _strings: Dictionary = {}


func _init() -> void:
	_detect_and_load_system_language()


func _detect_and_load_system_language() -> void:
	var os_lang := "en"
	if not OS.has_feature("headless") and not OS.has_feature("editor"):
		os_lang = OS.get_locale().substr(0, 2).to_lower()
	if os_lang == "zh":
		load_strings("zh")
	else:
		load_strings("en")


func load_strings(locale: String) -> void:
	var dict := _load_strings_file(locale)
	if not dict.is_empty():
		_strings = dict
		_current_locale = locale
	else:
		_strings = _defaults()
		_current_locale = locale


func _load_strings_file(locale: String) -> Dictionary:
	var dict := {}
	var file_path := STRING_RESOURCE_PATH % locale
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file == null:
		return dict
	var content := file.get_as_text()
	file.close()
	_parse_tres_strings(content, dict)
	return dict


func string(key: String) -> String:
	if _strings.has(key):
		return _strings[key]
	return key


func current_locale() -> String:
	return _current_locale


func set_locale(locale: String) -> void:
	if locale == "en" or locale == "zh":
		load_strings(locale)


func is_zh() -> bool:
	return _current_locale == "zh"


func is_en() -> bool:
	return _current_locale == "en"


func _defaults() -> Dictionary:
	return {
		"seat.player": "Player",
		"seat.ai_left": "AI Left",
		"seat.ai_right": "AI Right",
		"label.role": "Role",
		"label.count": "Cards",
		"label.turn": "TURN",
		"label.recent": "Recent",
		"label.reason": "Why",
		"label.current_trick": "Current trick: %s",
		"label.current_trick_none": "Current trick: none",
		"label.hand_summary": "Hand: %d singles | %d pairs | %d triples | %d bombs | %d chains",
		"message.call_landlord_or_decline": "Call landlord or decline.",
		"message.is_landlord": "%s is landlord. %s leads.",
		"message.no_legal_response": "No valid play is available.",
		"message.hint_prefix": "Hint: ",
		"message.wait_for_turn": "Wait for your turn.",
		"message.must_play_initiative": "You have initiative and must play.",
		"message.invalid_play": "Invalid play or does not beat the active trick.",
		"message.played": "%s played %s.",
		"message.passed": "%s passed.",
		"message.all_passed": "All opponents passed. %s leads.",
		"message.win": "%s wins. New hand to restart.",
		"message.no_valid_play": "Hint is available on your turn.",
		"result.landlord_win": "Landlord Wins",
		"result.farmers_win": "Farmers Win",
		"settings.audio": "Audio settings apply immediately during this hand.",
	}


func _parse_tres_strings(content: String, target: Dictionary) -> void:
	# Parse GDScript Resource .tres text format
	# Format: key = value pairs inside a dictionary
	var in_strings := false
	var current_key := ""
	var buffer := ""
	
	for line in content.split("\n"):
		var trimmed := line.strip_edges()
		if trimmed.begins_with("strings = {"):
			in_strings = true
			continue
		if in_strings:
			if trimmed == "}":
				break
			if trimmed.is_empty():
				continue
			# Each line is: "key": "value",
			# Find key between first pair of quotes
			var first_quote := trimmed.find("\"")
			if first_quote == -1:
				continue
			var open_quote := trimmed.find("\"", first_quote + 1)
			if open_quote == -1:
				continue
			current_key = trimmed.substr(first_quote + 1, open_quote - first_quote - 1)
			
			# Find value after the colon
			var colon_pos := trimmed.find(":", open_quote)
			if colon_pos == -1:
				continue
			var val_str := trimmed.substr(colon_pos + 1).strip_edges()
			# Remove leading quote
			if val_str.begins_with("\""):
				val_str = val_str.substr(1)
			# Remove trailing quote and comma
			if val_str.ends_with("\""):
				val_str = val_str.substr(0, val_str.length() - 1)
			if val_str.ends_with(","):
				val_str = val_str.substr(0, val_str.length() - 1)
			
			target[current_key] = val_str
