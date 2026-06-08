from godot_e2e import expect

from dz_helpers import root, text


def test_game_starts(game):
    """Confirm game starts and main scene is accessible."""
    from godot_e2e import expect as expect_fn
    expect_fn(game.locator(name="Main"), timeout=3.0).to_be_visible()


def test_audio_queryable(game):
    """Audio state is accessible."""
    audio = root(game).call("debug_audio_state")
    assert isinstance(audio, dict), "audio state dict"
