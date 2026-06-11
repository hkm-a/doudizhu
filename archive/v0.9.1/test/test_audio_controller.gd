extends GdUnitTestSuite

const AudioControllerScript := preload("res://src/audio_controller.gd")


func test_event_constants_exist() -> void:
	assert_that(AudioControllerScript.EVENT_BOMB).is_equal("bomb")
	assert_that(AudioControllerScript.EVENT_JOKER_BOMB).is_equal("joker_bomb")
	assert_that(AudioControllerScript.EVENT_TIMER_TICK).is_equal("timer_tick")
	assert_that(AudioControllerScript.EVENT_TIMER_LOW).is_equal("timer_low")
	assert_that(AudioControllerScript.MIX_RATE).is_equal(22050)
	assert_that(AudioControllerScript.MAX_HISTORY).is_equal(24)


func test_make_saw_burst_produces_valid_stream() -> void:
	# Create a minimal fixture to access private methods
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_saw_burst(440.0, 0.1)
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.format == AudioStreamWAV.FORMAT_16_BITS)
	assert_that(stream.stereo == false)
	assert_that(stream.mix_rate == 22050)
	assert_that(stream.data.size() > 0)
	assert_that(stream.data.size() >= 4400)


func test_make_noise_burst_produces_valid_stream() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_noise_burst(0.1, 0.5)
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)
	assert_that(stream.data.size() >= 2200)


func test_make_chord_produces_valid_stream() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var notes = [440.0, 550.0, 660.0]
	var durs = [0.1, 0.1, 0.1]
	var stream: AudioStreamWAV = fixture.make_chord(notes, durs, 0.02)
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_sweep_produces_valid_stream() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_sweep(1000.0, 500.0, 0.15)
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_select_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("select")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_play_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("play")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_pass_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("pass")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_invalid_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("invalid")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_bomb_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("bomb")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_joker_bomb_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("joker_bomb")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_result_win_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("result_win")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_result_loss_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("result_loss")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_landlord_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("landlord")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_timer_tick_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("timer_tick")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)
	assert_int(stream.data.size()).is_less(2000)


func test_make_waveform_timer_low_event() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("timer_low")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_waveform_unknown_event_falls_back() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("unknown_event")
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.data.size() > 0)


func test_make_tone_produces_valid_stream() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_tone(440.0, 0.1, 0.26)
	assert_that(stream).is_not_null()
	assert_that(stream is AudioStreamWAV)
	assert_that(stream.format == AudioStreamWAV.FORMAT_16_BITS)
	assert_that(stream.data.size() > 0)


func test_waveform_timing_select_short() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("select")
	var duration := float(stream.data.size()) / 2.0 / float(stream.mix_rate)
	assert_float(duration).is_equal_approx(0.05, 0.02)


func test_waveform_timing_bomb_duration() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("bomb")
	var duration := float(stream.data.size()) / 2.0 / float(stream.mix_rate)
	assert_float(duration).is_equal_approx(0.30, 0.05)


func test_waveform_timing_result_win_duration() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("result_win")
	var duration := float(stream.data.size()) / 2.0 / float(stream.mix_rate)
	assert_float(duration).is_equal_approx(0.30, 0.05)


func test_waveform_timing_result_loss_duration() -> void:
	var fixture := _WaveformFixture.new()
	add_child(fixture)
	var stream: AudioStreamWAV = fixture.make_waveform("result_loss")
	var duration := float(stream.data.size()) / 2.0 / float(stream.mix_rate)
	assert_float(duration).is_equal_approx(0.44, 0.05)


class _WaveformFixture extends Node:
	func make_saw_burst(freq: float, duration: float) -> AudioStreamWAV:
		return _make_saw_burst(freq, duration)

	func make_noise_burst(duration: float, amplitude: float) -> AudioStreamWAV:
		return _make_noise_burst(duration, amplitude)

	func make_chord(notes, durs, gap: float) -> AudioStreamWAV:
		return _make_chord(notes, durs, gap)

	func make_sweep(freq_start: float, freq_end: float, duration: float) -> AudioStreamWAV:
		return _make_sweep(freq_start, freq_end, duration)

	func make_waveform(event_name: String) -> AudioStreamWAV:
		return _make_waveform(event_name)

	func make_tone(frequency: float, duration: float, amplitude: float) -> AudioStreamWAV:
		return _make_tone(frequency, duration, amplitude)

	func _make_saw_burst(freq: float, duration: float) -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * duration)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var phase := fmod(float(index) * freq / float(AudioControllerScript.MIX_RATE), 1.0)
			var saw := 2.0 * phase - 1.0
			var envelope := 1.0 - (float(index) / float(max(sample_count - 1, 1)))
			envelope = envelope * envelope
			var sample := saw * 0.6 * envelope
			var harmonics := sin(TAU * 2.0 * freq * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.25 * envelope
			sample += harmonics
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_noise_burst(duration: float, amplitude: float) -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * duration)
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
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_chord(note_freqs, note_durations, gap: float) -> AudioStreamWAV:
		var total_samples := 0
		for dur in note_durations:
			total_samples += int(AudioControllerScript.MIX_RATE * float(dur)) + int(AudioControllerScript.MIX_RATE * gap)
		total_samples = max(total_samples, 1)
		var bytes := PackedByteArray()
		bytes.resize(total_samples * 2)
		var offset := 0
		for i in range(note_freqs.size()):
			var freq: float = float(note_freqs[i])
			var dur: float = float(note_durations[i])
			var count := int(AudioControllerScript.MIX_RATE * dur)
			for j in range(count):
				var envelope := 1.0 - (float(j) / float(max(count - 1, 1)))
				envelope = envelope * envelope
				var sample := sin(TAU * freq * float(offset + j) / float(AudioControllerScript.MIX_RATE)) * 0.3 * envelope
				var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
				bytes[(offset + j) * 2] = value & 0xff
				bytes[(offset + j) * 2 + 1] = (value >> 8) & 0xff
			offset += count + int(AudioControllerScript.MIX_RATE * gap)
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_sweep(freq_start: float, freq_end: float, duration: float) -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * duration)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var freq: float = lerp(freq_start, freq_end, t)
			var envelope := 1.0 - t
			envelope = envelope * envelope
			var sample := sin(TAU * freq * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.5 * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_waveform(event_name: String) -> AudioStreamWAV:
		match event_name:
			"select":
				return _make_saw_burst(880.0, 0.05)
			"play":
				return _make_play_effect()
			"pass":
				return _make_pass_effect()
			"invalid":
				return _make_invalid_effect()
			"bomb":
				return _make_bomb_effect()
			"joker_bomb":
				return _make_joker_bomb_effect()
			"result_win":
				return _make_result_win()
			"result_loss":
				return _make_result_loss()
			"landlord":
				return _make_landlord_fanfare()
			"timer_tick":
				return _make_timer_tick()
			"timer_low":
				return _make_sweep(1000.0, 800.0, 0.15)
			_:
				return _make_tone(440.0, 0.08, 0.26)

	func _make_tone(frequency: float, duration: float, amplitude: float) -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * duration)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var envelope := 1.0 - (float(index) / float(max(sample_count - 1, 1)))
			var sample := sin(TAU * frequency * float(index) / float(AudioControllerScript.MIX_RATE)) * amplitude * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_play_effect() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.12)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var freq: float = lerp(880.0, 440.0, t)
			var env1 := 1.0 - t
			env1 = env1 * env1
			var sine := sin(TAU * freq * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.6 * env1
			var noise_env := 1.0 - t
			var noise := (randf() * 2.0 - 1.0) * 0.15 * noise_env
			var sample := sine + noise
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_pass_effect() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.08)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var envelope := 1.0 - t
			var sample := sin(TAU * 330.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.4 * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_invalid_effect() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.2)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var envelope := 1.0 - t
			var sample := sin(TAU * 140.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.4 * envelope
			sample += sin(TAU * 148.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.3 * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_bomb_effect() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.3)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var env1 := 1.0 - t
			env1 = env1 * env1
			var noise := (randf() * 2.0 - 1.0) * 0.5 * env1
			var sub_env := 1.0 - t
			var sub := sin(TAU * 55.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.7 * sub_env
			var sample := noise + sub
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_joker_bomb_effect() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.35)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var freq: float = lerp(80.0, 300.0, t * t)
			var env1 := 1.0 - t
			var env2 := t
			var noise := (randf() * 2.0 - 1.0) * 0.3 * (1.0 - env2)
			var sweep := sin(TAU * freq * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.4 * (1.0 - env1 * env1)
			var sub := sin(TAU * 55.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.3 * env1
			var sample := noise + sweep + sub
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_result_win() -> AudioStreamWAV:
		return _make_chord([784.0, 988.0, 1175.0], [0.08, 0.08, 0.08], 0.03)

	func _make_result_loss() -> AudioStreamWAV:
		return _make_chord([392.0, 311.0, 261.0], [0.12, 0.12, 0.12], 0.04)

	func _make_landlord_fanfare() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.2)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var env := 1.0 - t
			env = env * env
			var sample := sin(TAU * 523.25 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.3 * env
			sample += sin(TAU * 659.25 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.25 * env
			sample += sin(TAU * 783.99 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.25 * env
			sample += sin(TAU * 1046.5 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.2 * env
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream

	func _make_timer_tick() -> AudioStreamWAV:
		var sample_count := int(AudioControllerScript.MIX_RATE * 0.03)
		var bytes := PackedByteArray()
		bytes.resize(sample_count * 2)
		for index in range(sample_count):
			var t := float(index) / float(max(sample_count - 1, 1))
			var envelope := 1.0 - t
			var sample := sin(TAU * 1200.0 * float(index) / float(AudioControllerScript.MIX_RATE)) * 0.3 * envelope
			var value := int(clampf(sample, -1.0, 1.0) * 32767.0)
			bytes[index * 2] = value & 0xff
			bytes[index * 2 + 1] = (value >> 8) & 0xff
		var stream := AudioStreamWAV.new()
		stream.format = AudioStreamWAV.FORMAT_16_BITS
		stream.mix_rate = AudioControllerScript.MIX_RATE
		stream.stereo = false
		stream.data = bytes
		return stream
