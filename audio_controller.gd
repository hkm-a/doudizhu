extends AudioStreamPlayer

## Simple audio controller for Dou Dizhu.
## Supports SFX and music buses.

var sfx_enabled: bool = true
var music_enabled: bool = true
var volume_preset: String = "normal"

var _sfx_bus: int = -1
var _music_bus: int = -1


func _ready() -> void:
	_sfx_bus = AudioServer.get_bus_index("SFX")
	_music_bus = AudioServer.get_bus_index("Music")
	_sfx_bus = 0 if _sfx_bus < 0 else _sfx_bus
	_music_bus = 1 if _music_bus < 0 else _music_bus


func play_event(event: String) -> void:
	if not sfx_enabled:
		return
	# In a full implementation, load and play specific sound files
	# For now, just emit a signal
	print("[Audio] Play: %s" % event)


func toggle_sfx() -> void:
	sfx_enabled = not sfx_enabled


func toggle_music() -> void:
	music_enabled = not music_enabled


func set_volume_preset(preset: String) -> void:
	volume_preset = preset
