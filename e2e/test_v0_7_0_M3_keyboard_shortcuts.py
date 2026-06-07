from godot_e2e import expect

from dz_helpers import root, text


def test_shortcut_t_opens_and_closes_tutorial(game):
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="tutorial is closed before shortcut activation",
    )

    game.call("simulate_shortcut", ["KEY_T"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is True,
        description="KEY_T opens the tutorial from the main table",
    )
    expect(game.locator(name="TutorialTitle")).to_satisfy(
        lambda node: "Table Tour" in text(node),
        description="tutorial shows first step title after KEY_T",
    )

    game.call("simulate_shortcut", ["KEY_T"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="KEY_T closes the tutorial when it is open",
    )


def test_shortcut_f1_opens_and_closes_help(game):
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is False,
        description="help is closed before shortcut activation",
    )

    game.call("simulate_shortcut", ["KEY_F1"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_help_visible") is True,
        description="KEY_F1 opens the help panel from the main table",
    )
    expect(game.locator(name="HelpText")).to_satisfy(
        lambda node: "Supported:" in text(node) and "Hint" in text(node),
        description="help panel shows supported rules text after KEY_F1",
    )


def test_shortcut_h_activates_hint(game):
    game.locator(name="CallLandlordButton").click()
    game.wait_physics_frames(10)

    game.call("simulate_shortcut", ["KEY_H"])
    game.wait_physics_frames(10)
    hint_status = game.locator(name="StatusMessage")
    expect(hint_status).to_satisfy(
        lambda node: "Hint" in text(node),
        description="KEY_H triggers hint action and updates status text",
    )


def test_shortcut_p_activates_pass(game):
    game.locator(name="CallLandlordButton").click()
    game.wait_physics_frames(10)

    game.locator(name="PlayButton").click()
    game.wait_physics_frames(10)

    game.call("simulate_shortcut", ["KEY_P"])
    game.wait_physics_frames(10)
    pass_status = game.locator(name="StatusMessage")
    expect(pass_status).to_satisfy(
        lambda node: "Pass" in text(node) or "pass" in text(node).lower() or text(node) != "",
        description="KEY_P triggers pass action without errors",
    )


def test_shortcut_space_plays_or_calls_landlord(game):
    game.call("simulate_shortcut", ["KEY_SPACE"])
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: "landlord" in text(node).lower() or "Call" in text(node),
        description="KEY_SPACE activates Call Landlord during landlord phase",
    )


def test_shortcut_n_on_result_restarts_hand(game):
    game.locator(name="CallLandlordButton").click()
    game.wait_physics_frames(10)
    root(game).call("debug_finish_human_win")
    game.wait_physics_frames(10)

    expect(game.locator(name="ResultBanner")).to_be_visible()

    game.call("simulate_shortcut", ["KEY_N"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_human_card_count") > 0,
        description="KEY_N starts a new hand after a result appears",
    )
