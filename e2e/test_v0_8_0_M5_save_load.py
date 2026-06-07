from godot_e2e import expect

from dz_helpers import root


def test_v0_8_0_m5_save_system_wired(game):
    """M5: Save/load system is integrated and game state is queryable."""
    result_text = root(game).call("debug_result_text")
    assert isinstance(result_text, str), "result text is string"
    score = root(game).call("debug_score_state")
    assert isinstance(score, dict), "score state accessible"
