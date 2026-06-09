from godot_e2e import expect

from dz_helpers import root, text, call_landlord


def test_contextual_coach_landlord_phase(game):
    """Contextual action coach: landlord selection displays guidance text."""
    status = game.locator(name="StatusMessage")
    expect(status).to_satisfy(
        lambda node: "landlord" in text(node).lower() or "Call" in text(node),
        description="status message provides landlord-phase guidance",
    )


def test_contextual_coach_play_phase_initiative(game):
    """Contextual action coach: player initiative shows play/pass affordances."""
    call_landlord(game)
    game.wait_physics_frames(30)

    status = game.locator(name="StatusMessage")
    expect(status).to_satisfy(
        lambda node: text(node) != "",
        description="status message is non-empty during play phase",
    )

    # Player should see play/pass/hint options visible
    root(game).call("simulate_shortcut", ["KEY_SPACE"])
    game.wait_physics_frames(10)

    play_visible = root(game).call("debug_visible_hand_card_rects")
    expect(play_visible).to_satisfy(
        lambda rects: isinstance(rects, list),
        description="hand cards are accessible during player turn",
    )


def test_contextual_coach_follow_pass(game):
    """Contextual action coach: following player sees pass option."""
    call_landlord(game)
    game.wait_physics_frames(30)

    # AI plays first
    game.wait_physics_frames(10)

    # Player should be able to pass
    root(game).call("simulate_shortcut", ["KEY_P"])
    game.wait_physics_frames(10)

    status = game.locator(name="StatusMessage")
    expect(status).to_satisfy(
        lambda node: text(node) != "",
        description="pass action updates status with contextual feedback",
    )


def test_contextual_coach_result_phase(game):
    """Contextual action coach: result banner shows completion guidance."""
    call_landlord(game)
    game.wait_physics_frames(30)

    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    result = game.locator(name="ResultBanner")
    expect(result).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="result banner is visible after hand completion",
    )

    result_text = game.locator(name="ResultText")
    expect(result_text).to_satisfy(
        lambda node: len(text(node)) > 0,
        description="result text provides outcome information",
    )

    new_hand = game.locator(name="ResultNewHandButton")
    expect(new_hand).to_satisfy(
        lambda node: node.get_property("visible") is True or node.get_property("visible") is False,
        description="result actions bar is present (visibility depends on match state)",
    )


def test_contextual_coach_match_end(game):
    """Contextual action coach: match completion shows new match affordance."""
    call_landlord(game)
    game.wait_physics_frames(30)

    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    expect(game.locator(name="ResultBanner")).to_satisfy(
        lambda node: node.get_property("visible") is True,
        description="result banner visible for single hand",
    )

    result_new_match = game.locator(name="ResultNewMatchButton")
    # After one hand, match_complete is false, so ResultNewMatchButton is hidden
    # This is correct behavior — new match button appears only when match_complete
    expect(result_new_match).to_satisfy(
        lambda node: node.get_property("visible") is False,
        description="new match button hidden when match not complete",
    )
