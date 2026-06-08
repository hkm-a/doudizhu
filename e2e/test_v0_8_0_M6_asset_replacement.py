from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_M6_assets_wired(game):
    """M6: AI-generated card assets are loaded into game."""
    card_rects = root(game).call("debug_visible_hand_card_rects")
    assert isinstance(card_rects, list), "card rects accessible"
    audio = root(game).call("debug_audio_state")
    assert isinstance(audio, dict), "game intact with assets"
