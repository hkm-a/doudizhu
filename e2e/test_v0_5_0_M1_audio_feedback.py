from godot_e2e import expect

from dz_helpers import call_landlord, root


def _audio_state(game):
    return root(game).call("debug_audio_state")


def test_v0_5_0_m1_action_sfx_events_are_observable(game):
    call_landlord(game)
    game.locator(name="PlayerHand").locator(name="Card_*").first().click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_audio_state")["last_event"] == "select",
        description="card selection records select SFX event",
    )

    game.locator(name="PlayerHand").locator(name="Card_*").first().click()
    root(game).call("simulate_play")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_audio_state")["last_event"] in ["play", "invalid", "result_win", "result_loss"],
        description="play attempt records a semantic SFX event",
    )