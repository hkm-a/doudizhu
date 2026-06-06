from godot_e2e import expect

from dz_helpers import root


def _rect(snapshot, name):
    rect = snapshot[name]
    return {
        "x": rect.x,
        "y": rect.y,
        "w": rect.w,
        "h": rect.h,
        "right": rect.x + rect.w,
        "bottom": rect.y + rect.h,
    }


def test_v0_3_0_m1_table_layout_has_clear_vertical_bands(game):
    snapshot = root(game).call("debug_layout_snapshot")
    viewport = snapshot["viewport"]
    trick = _rect(snapshot, "trick_rect")
    status = _rect(snapshot, "status_rect")
    action = _rect(snapshot, "action_rect")
    hand = _rect(snapshot, "hand_rect")
    ai_left = _rect(snapshot, "ai_left_rect")
    ai_right = _rect(snapshot, "ai_right_rect")

    assert viewport.x >= 1200
    assert viewport.y >= 670
    assert ai_left["bottom"] < hand["y"]
    assert ai_right["bottom"] < hand["y"]
    assert trick["bottom"] < status["y"]
    assert status["bottom"] < action["y"]
    assert action["bottom"] < hand["y"]
    assert hand["right"] <= viewport.x
    assert hand["bottom"] <= viewport.y


def test_v0_3_0_m1_hand_cards_stay_visible_after_selection_animation(game):
    first_card = game.locator(name="PlayerHand").locator(name="Card_*").first()
    first_card.click()
    game.wait_seconds(0.15)
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_human_card_count") == 17,
        description="full dealt hand remains visible after selected-card animation",
    )
    expect(root(game)).to_satisfy(
        lambda node: len(node.call("debug_visible_hand_card_rects")) == 17,
        description="all dealt hand card buttons are visible",
    )
    snapshot = root(game).call("debug_layout_snapshot")
    viewport = snapshot["viewport"]
    for card_rect in root(game).call("debug_visible_hand_card_rects"):
        assert card_rect.x >= 0
        assert card_rect.y >= 0
        assert card_rect.x + card_rect.w <= viewport.x
        assert card_rect.y + card_rect.h <= viewport.y
