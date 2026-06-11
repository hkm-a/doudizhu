class_name AIUtils
extends RefCounted

const DIFFICULTY_KEY := "user://ai_difficulty.cfg"

var _difficulty: int = 0


func get_difficulty() -> int:
	var cfg := ConfigFile.new()
	if cfg.load(DIFFICULTY_KEY) == OK:
		_difficulty = cfg.get_value("ai", "difficulty", 0)
	return _difficulty


func save_difficulty(level: int) -> void:
	_difficulty = level
	var cfg := ConfigFile.new()
	cfg.set_value("ai", "difficulty", level)
	cfg.save(DIFFICULTY_KEY)
