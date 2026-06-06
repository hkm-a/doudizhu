class_name AudioController
extends Node

const EVENT_SELECT := "select"
const EVENT_PLAY := "play"
const EVENT_PASS := "pass"
const EVENT_INVALID := "invalid"
const EVENT_LANDLORD := "landlord"
const EVENT_RESULT_WIN := "result_win"
const EVENT_RESULT_LOSS := "result_loss"
const EVENT_MUSIC := "music"
const MAX_HISTORY := 24
const MIX_RATE := 22050

var sfx_enabled := true
var music_enabled := false
var volume_preset := "normal"
var event_history: Array[String] = []
var last_event := ""
var sfx_player: AudioStreamPlayer
var music_player: AudioStreamPlayer

var _sfx_streams := {}
var _music_stream: AudioStreamWAV


func _ready() -> void:
	_setup_players()


func play_event(event_name: String) -> void:
	last_event = event_name
	_record_event(event_name)
	if not sfx_enabled:
		return
	_setup_players()
	if not _sfx_streams.has(event_name):
		_sfx_streams[event_name] = _make_tone(_frequency_for_event(event_name), 0.08, 0.26)
	sfx_player.stream = _sfx_streams[event_name]
	sfx_player.volume_db = _volume_db()
	if is_inside_tree():
		sfx_player.play()


func set_sfx_enabled(enabled: bool) -> void:
	sfx_enabled = enabled
	_record_event("sfx_on" if enabled else "sfx_off")


func set_music_enabled(enabled: bool) -> void:
	music_enabled = enabled
	_setup_players()
	_record_event("music_on" if enabled else "music_off")
	if enabled:
		if _music_stream == null:
			_music_stream = _make_tone(174.0, 0.45, 0.08)
		music_player.stream = _music_stream
		music_player.volume_db = _volume_db() - 10.0
		if is_inside_tree():
			music_player.play()
	else:
		music_player.stop()


func toggle_sfx() -> bool:
	set_sfx_enabled(not sfx_enabled)
	return sfx_enabled


func toggle_music() -> bool:
	set_music_enabled(not music_enabled)
	return music_enabled


func set_volume_preset(preset: String) -> void:
	if not ["quiet", "normal", "loud"].has(preset):
		preset = "normal"
	volume_preset = preset
	_record_event("volume_%s" % volume_preset)
	if sfx_player != null:
		sfx_player.volume_db = _volume_db()
	if music_player != null:
		music_player.volume_db = _volume_db() - 10.0


func debug_state() -> Dictionary:
	return {
		"sfx_enabled": sfx_enabled,
		"music_enabled": music_enabled,
		"volume_preset": volume_preset,
		"last_event": last_event,
		"event_history": event_history.duplicate(),
	}


func clear_history() -> void:
	event_history = []
	last_event = ""


func _setup_players() -> void:
	if sfx_player == null:
		sfx_player = AudioStreamPlayer.new()
		sfx_player.name = "SfxPlayer"
		add_child(sfx_player)
	if music_player == null:
		music_player = AudioStreamPlayer.new()
		music_player.name = "MusicPlayer"
		add_child(music_player)


func _record_event(event_name: String) -> void:
	event_history.append(event_name)
	while event_history.size() > MAX_HISTORY:
		event_history.pop_front()


func _frequency_for_event(event_name: String) -> float:
	match event_name:
		EVENT_SELECT:
			return 880.0
		EVENT_PLAY:
			return 660.0
		EVENT_PASS:
			return 330.0
		EVENT_INVALID:
			return 140.0
		EVENT_LANDLORD:
			return 523.25
		EVENT_RESULT_WIN:
			return 784.0
		EVENT_RESULT_LOSS:
			return 196.0
		_:
			return 440.0


func _volume_db() -> float:
	match volume_preset:
		"quiet":
			return -18.0
		"loud":
			return -4.0
		_:
			return -10.0


func _make_tone(frequency: float, duration: float, amplitude: float) -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var envelope := 1.0 - (float(index) / float(max(sample_count - 1, 1)))
		var sample := sin(TAU * frequency * float(index) / float(MIX_RATE)) * amplitude * envelope
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream