extends GdUnitTestSuite

const AudioControllerScript := preload("res://src/audio_controller.gd")


func test_audio_controller_records_sfx_events() -> void:
	var audio = auto_free(AudioControllerScript.new())
	audio.play_event(AudioControllerScript.EVENT_SELECT)
	audio.play_event(AudioControllerScript.EVENT_PLAY)
	var state: Dictionary = audio.debug_state()
	assert_that(state.last_event).is_equal(AudioControllerScript.EVENT_PLAY)
	assert_that(state.event_history).contains([AudioControllerScript.EVENT_SELECT, AudioControllerScript.EVENT_PLAY])


func test_audio_controller_mute_keeps_debug_history() -> void:
	var audio = auto_free(AudioControllerScript.new())
	audio.set_sfx_enabled(false)
	audio.play_event(AudioControllerScript.EVENT_INVALID)
	var state: Dictionary = audio.debug_state()
	assert_that(state.sfx_enabled).is_equal(false)
	assert_that(state.last_event).is_equal(AudioControllerScript.EVENT_INVALID)
	assert_that(state.event_history).contains(["sfx_off", AudioControllerScript.EVENT_INVALID])


func test_audio_controller_music_and_volume_state() -> void:
	var audio = auto_free(AudioControllerScript.new())
	assert_that(audio.toggle_music()).is_equal(true)
	audio.set_volume_preset("quiet")
	var state: Dictionary = audio.debug_state()
	assert_that(state.music_enabled).is_equal(true)
	assert_that(state.volume_preset).is_equal("quiet")
	assert_that(state.event_history).contains(["music_on", "volume_quiet"])


func test_audio_controller_limits_history() -> void:
	var audio = auto_free(AudioControllerScript.new())
	for index in range(AudioControllerScript.MAX_HISTORY + 4):
		audio.play_event("event_%d" % index)
	var state: Dictionary = audio.debug_state()
	assert_that(state.event_history.size()).is_equal(AudioControllerScript.MAX_HISTORY)
	assert_that(state.event_history[0]).is_equal("event_4")