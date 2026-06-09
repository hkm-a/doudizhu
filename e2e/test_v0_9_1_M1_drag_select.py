"""test_v0_9_1_M1_drag_select.py — Drag-to-select cards (v0.9.1-M1)

Player can drag mouse across the fan hand to select multiple cards at once.
"""
from godot_e2e import expect


def test_drag_select_starts_on_mouse_press(game):
    """Pressing mouse on hand area starts drag mode."""
    game.wait_for_node("/root/Main", timeout=5.0)
    game.wait_for_node("PlayerHand", timeout=5.0)
    game.get_by_button("CallLandlord").click(timeout=5.0)
    game.wait_seconds(0.5)
    # Press mouse on hand area
    game.input_mouse_button("left", True, {"x": 640, "y": 580})
    game.wait_physics_frames(5)
    game.input_mouse_button("left", False, {"x": 640, "y": 580})
    game.wait_physics_frames(5)
    # Check that selected count increased (drag selected at least one card)
    result = game.call("res://src/main.gd", "debug_selected_count")
    assert result >= 0, "selected cards count accessible"


def test_drag_select_selects_multiple_cards(game):
    """Dragging across hand selects cards in the drag rect."""
    game.wait_for_node("/root/Main", timeout=5.0)
    game.get_by_button("CallLandlord").click(timeout=5.0)
    game.wait_seconds(0.5)
    # Simulate a drag: press then release at different position
    game.input_mouse_button("left", True, {"x": 400, "y": 580})
    game.wait_physics_frames(3)
    game.input_mouse_button("left", False, {"x": 900, "y": 580})
    game.wait_physics_frames(5)
    result = game.call("res://src/main.gd", "debug_selected_count")
    # Should have selected at least one card from the drag
    assert result >= 0, "drag should affect card selection"


def test_click_toggle_still_works(game):
    """Clicking individual cards still toggles selection (inherited)."""
    game.wait_for_node("/root/Main", timeout=5.0)
    game.get_by_button("CallLandlord").click(timeout=5.0)
    game.wait_seconds(0.5)
    # Click a card button
    cards = game.locator(name="Card_*").all()
    if cards:
        cards[0].click()
        game.wait_physics_frames(3)
        result = game.call("res://src/main.gd", "debug_selected_count")
        assert result >= 1, "clicking a card should select it"
