from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, text


def test_v0_1_0_m5_pass_advances_turn_when_legal(game):
    call_landlord(game)
    hint_then_play(game)
    game.locator(name="PassButton").click()
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "passed" in text(node).lower() or "played" in text(node).lower(),
        description="pass action advances into the next visible turn outcome",
    )

