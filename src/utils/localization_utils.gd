class_name LocalizationUtils
extends RefCounted


const STRING_RESOURCE_PATH := "res://src/localization/strings_%s.tres"

var _current_locale := "en"
var _strings: Dictionary = {}


func _init() -> void:
	_detect_and_load_system_language()


func _detect_and_load_system_language() -> void:
	var os_lang := OS.get_locale().substr(0, 2).to_lower()
	if os_lang == "zh":
		load_strings("zh")
	else:
		load_strings("en")


func load_strings(locale: String) -> void:
	var dict := {}
	var file_path := STRING_RESOURCE_PATH % locale
	var file := FileAccess.open(file_path, FileAccess.READ)
	if file != null:
		var content := file.get_as_text()
		file.close()
		_parse_tres_strings(content, dict)
	if not dict.is_empty():
		_strings = dict
		_current_locale = locale


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


func _parse_tres_strings(content: String, target: Dictionary) -> void:
	# Extract the strings dictionary from a .tres text format
	var in_strings := false
	var depth := 0
	var current_key := ""
	for line in content.split("\n"):
		var trimmed := line.strip_edges()
		if trimmed.begins_with("strings = {"):
			in_strings = true
			depth = 1
			continue
		if in_strings:
			for ch in trimmed:
				if ch == "{":
					depth += 1
				elif ch == "}":
					depth -= 1
					if depth <= 0:
						in_strings = false
						break
			if not in_strings:
				break
			if depth == 1 and ":" in trimmed:
				# Key line
				var parts := trimmed.split(":", false, 1)
				if parts.size() == 2:
					current_key = parts[0].strip_edges().replace("\"", "")
			elif depth == 2 and ":" in trimmed and not trimmed.begins_with("\""):
				# Value line
				var parts := trimmed.split(":", false, 1)
				if parts.size() == 2:
					var val := parts[1].strip_edges().replace("\"", "")
					target[current_key] = val
