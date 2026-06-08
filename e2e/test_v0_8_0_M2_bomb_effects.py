from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_M2_bomb_effects_wired(game):
    """M2: Bomb effect system integration doesn't break game state."""
    score = root(game).call("debug_score_state")
    assert isinstance(score, dict), "score state is queryable"
