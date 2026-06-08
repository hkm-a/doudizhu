from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, text


def test_v0_1_0_m4_hint_play_applies_legal_supported_play(game):
    call_landlord(game)
    hint_then_play(game)
    expect(game.locator(name="TrickOwner")).to_satisfy(
        lambda node: "Recent" in text(node),
        description="current trick updates after a legal play",
    )
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "played" in text(node).lower(),
        description="status reports the applied play",
    )

