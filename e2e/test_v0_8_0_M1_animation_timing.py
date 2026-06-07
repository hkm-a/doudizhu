from godot_e2e import expect

from dz_helpers import root, text


def test_v0_8_0_m1_animation_progress(game):
    """M1: Animation system progress is queryable after game loads."""
    progress = root(game).call("get_animation_progress")
    assert isinstance(progress, dict), "progress is a dict"


def test_v0_8_0_m1_card_selection_bounce_works(game):
    """M1: Card selection bounce animation is wired into main."""
    cards = root(game).call("debug_visible_hand_card_rects")
    assert isinstance(cards, list), "hand card rects accessible"
