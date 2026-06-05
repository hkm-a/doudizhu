from godot_e2e import expect

from dz_helpers import call_landlord, hint_then_play, text


def test_v0_1_0_m7_ai_turns_update_recent_play_and_counts(game):
    call_landlord(game)
    hint_then_play(game)
    left_recent = game.locator(name="AILeftPanel").locator(name="Recent")
    right_recent = game.locator(name="AIRightPanel").locator(name="Recent")
    expect(game.locator(name="AILeftPanel").locator(name="Count")).to_satisfy(
        lambda node: text(node) != "Cards: 17" or text(right_recent) != "Recent: -" or text(left_recent) != "Recent: -",
        description="AI turn changes a visible count or recent-play label",
    )

