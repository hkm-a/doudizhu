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
const EVENT_BOMB := "bomb"
const EVENT_JOKER_BOMB := "joker_bomb"
const EVENT_TIMER_TICK := "timer_tick"
const EVENT_TIMER_LOW := "timer_low"
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
		_sfx_streams[event_name] = _make_waveform(event_name)
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


func _make_waveform(event_name: String) -> AudioStreamWAV:
	match event_name:
		EVENT_SELECT:
			return _make_saw_burst(880.0, 0.05)
		EVENT_PLAY:
			return _make_play_effect()
		EVENT_PASS:
			return _make_pass_effect()
		EVENT_INVALID:
			return _make_invalid_effect()
		EVENT_BOMB:
			return _make_bomb_effect()
		EVENT_JOKER_BOMB:
			return _make_joker_bomb_effect()
		EVENT_RESULT_WIN:
			return _make_result_win()
		EVENT_RESULT_LOSS:
			return _make_result_loss()
		EVENT_LANDLORD:
			return _make_landlord_fanfare()
		EVENT_TIMER_TICK:
			return _make_timer_tick()
		EVENT_TIMER_LOW:
			return _make_timer_low()
		_:
			return _make_tone(440.0, 0.08, 0.26)


func _make_saw_burst(freq: float, duration: float) -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var phase := fmod(float(index) * freq / float(MIX_RATE), 1.0)
		var saw := 2.0 * phase - 1.0
		var envelope := 1.0 - (float(index) / float(max(sample_count - 1, 1)))
		envelope = envelope * envelope
		var sample := saw * 0.6 * envelope
		var harmonics := sin(TAU * 2.0 * freq * float(index) / float(MIX_RATE)) * 0.25 * envelope
		sample += harmonics
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_noise_burst(duration: float, amplitude: float) -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var envelope := 1.0 - (float(index) / float(max(sample_count - 1, 1)))
		envelope = envelope * envelope
		var noise := (randf() * 2.0 - 1.0) * amplitude * envelope
		var value := int(clampf(noise, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_chord(note_freqs, note_durations, gap: float) -> AudioStreamWAV:
	var total_samples := 0
	for dur in note_durations:
		total_samples += int(MIX_RATE * float(dur)) + int(MIX_RATE * gap)
	total_samples = max(total_samples, 1)
	var bytes := PackedByteArray()
	bytes.resize(total_samples * 2)
	var offset := 0
	for i in range(note_freqs.size()):
		var freq: float = float(note_freqs[i])
		var dur: float = float(note_durations[i])
		var count := int(MIX_RATE * dur)
		for j in range(count):
			var envelope := 1.0 - (float(j) / float(max(count - 1, 1)))
			envelope = envelope * envelope
			var sample := sin(TAU * freq * float(offset + j) / float(MIX_RATE)) * 0.3 * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[(offset + j) * 2] = value & 0xff
			bytes[(offset + j) * 2 + 1] = (value >> 8) & 0xff
		offset += count + int(MIX_RATE * gap)
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_sweep(freq_start: float, freq_end: float, duration: float) -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * duration)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var freq: float = lerp(freq_start, freq_end, t)
		var envelope := 1.0 - t
		envelope = envelope * envelope
		var sample := sin(TAU * freq * float(index) / float(MIX_RATE)) * 0.5 * envelope
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_play_effect() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.12)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var freq: float = lerp(880.0, 440.0, t)
		var env1 := 1.0 - t
		env1 = env1 * env1
		var sine := sin(TAU * freq * float(index) / float(MIX_RATE)) * 0.6 * env1
		var noise_env := 1.0 - t
		var noise := (randf() * 2.0 - 1.0) * 0.15 * noise_env
		var sample := sine + noise
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_pass_effect() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.08)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var envelope := 1.0 - t
		var sample := sin(TAU * 330.0 * float(index) / float(MIX_RATE)) * 0.4 * envelope
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_invalid_effect() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.2)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var envelope := 1.0 - t
		var sample := sin(TAU * 140.0 * float(index) / float(MIX_RATE)) * 0.4 * envelope
		sample += sin(TAU * 148.0 * float(index) / float(MIX_RATE)) * 0.3 * envelope
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_bomb_effect() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.3)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var env1 := 1.0 - t
		env1 = env1 * env1
		var noise := (randf() * 2.0 - 1.0) * 0.5 * env1
		var sub_env := 1.0 - t
		var sub := sin(TAU * 55.0 * float(index) / float(MIX_RATE)) * 0.7 * sub_env
		var sample := noise + sub
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_joker_bomb_effect() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.35)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var freq: float = lerp(80.0, 300.0, t * t)
		var env1 := 1.0 - t
		var env2 := t
		var noise := (randf() * 2.0 - 1.0) * 0.3 * (1.0 - env2)
		var sweep := sin(TAU * freq * float(index) / float(MIX_RATE)) * 0.4 * (1.0 - env1 * env1)
		var sub := sin(TAU * 55.0 * float(index) / float(MIX_RATE)) * 0.3 * env1
		var sample := noise + sweep + sub
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_result_win() -> AudioStreamWAV:
	var notes := PackedFloat64Array([784.0, 988.0, 1175.0])
	var durs := PackedFloat64Array([0.08, 0.08, 0.08])
	return _make_chord(notes, durs, 0.03)


func _make_result_loss() -> AudioStreamWAV:
	var notes := PackedFloat64Array([392.0, 311.0, 261.0])
	var durs := PackedFloat64Array([0.12, 0.12, 0.12])
	return _make_chord(notes, durs, 0.04)


func _make_landlord_fanfare() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.2)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var env := 1.0 - t
		env = env * env
		var sample := sin(TAU * 523.25 * float(index) / float(MIX_RATE)) * 0.3 * env
		sample += sin(TAU * 659.25 * float(index) / float(MIX_RATE)) * 0.25 * env
		sample += sin(TAU * 783.99 * float(index) / float(MIX_RATE)) * 0.25 * env
		sample += sin(TAU * 1046.5 * float(index) / float(MIX_RATE)) * 0.2 * env
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_timer_tick() -> AudioStreamWAV:
	var sample_count := int(MIX_RATE * 0.03)
	var bytes := PackedByteArray()
	bytes.resize(sample_count * 2)
	for index in range(sample_count):
		var t := float(index) / float(max(sample_count - 1, 1))
		var envelope := 1.0 - t
		var sample := sin(TAU * 1200.0 * float(index) / float(MIX_RATE)) * 0.3 * envelope
		var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
		bytes[index * 2] = value & 0xff
		bytes[index * 2 + 1] = (value >> 8) & 0xff
	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = bytes
	return stream


func _make_timer_low() -> AudioStreamWAV:
	return _make_sweep(1000.0, 800.0, 0.15)
