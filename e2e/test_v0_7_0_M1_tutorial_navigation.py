from godot_e2e import expect

from dz_helpers import root, text


def test_tutorial_opens_closes_and_displays_content(game):
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="tutorial is not visible on fresh load",
    )

    game.locator(name="TutorialButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is True,
        description="tutorial opens from the action bar button",
    )
    expect(game.locator(name="TutorialTitle")).to_satisfy(
        lambda node: "Table Tour" in text(node),
        description="tutorial title shows the first step",
    )
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 1 of 6" in text(node),
        description="tutorial step label shows correct position",
    )
    expect(game.locator(name="TutorialBody")).to_satisfy(
        lambda node: len(text(node)) > 0,
        description="tutorial body contains explanatory text",
    )

    game.locator(name="TutorialCloseButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="tutorial closes from its close button",
    )


def test_tutorial_navigation_next_and_back(game):
    game.locator(name="TutorialButton").click()
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 1 of 6" in text(node),
        description="starts at step 1 of 6",
    )
    expect(game.locator(name="TutorialBackButton")).to_satisfy(
        lambda node: node.get_property("disabled") is True,
        description="back button is disabled on the first step",
    )

    game.locator(name="TutorialNextButton").click()
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 2 of 6" in text(node),
        description="next advances to step 2 of 6",
    )
    expect(game.locator(name="TutorialBackButton")).to_satisfy(
        lambda node: node.get_property("disabled") is False,
        description="back button is enabled after advancing",
    )

    game.locator(name="TutorialBackButton").click()
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 1 of 6" in text(node),
        description="back returns to step 1 of 6",
    )

    for _i in range(4):
        game.locator(name="TutorialNextButton").click()

    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 6 of 6" in text(node),
        description="next navigates all the way to the final step",
    )
    expect(game.locator(name="TutorialNextButton")).to_satisfy(
        lambda node: node.get_property("disabled") is True,
        description="next button is disabled on the last step",
    )


def test_tutorial_shortcut_keys(game):
    game.locator(name="TutorialButton").click()
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is True,
        description="tutorial opens from button",
    )

    game.call("simulate_shortcut", ["KEY_T"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="KEY_T shortcut closes the tutorial",
    )

    game.locator(name="TutorialButton").click()
    game.call("simulate_shortcut", ["KEY_T"])
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_tutorial_visible") is False,
        description="second KEY_T shortcut also closes the tutorial",
    )


def test_tutorial_keyboard_navigation(game):
    game.locator(name="TutorialButton").click()

    game.call("simulate_shortcut", ["KEY_RIGHT"])
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 2 of 6" in text(node),
        description="KEY_RIGHT advances tutorial step",
    )

    game.call("simulate_shortcut", ["KEY_LEFT"])
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 1 of 6" in text(node),
        description="KEY_LEFT retreats tutorial step",
    )

    game.call("simulate_shortcut", ["KEY_RIGHT"])
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 2 of 6" in text(node),
        description="KEY_RIGHT advances again after retreat",
    )

    game.call("simulate_shortcut", ["KEY_B"])
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 1 of 6" in text(node),
        description="KEY_B shortcut retreats tutorial step",
    )

    game.call("simulate_shortcut", ["KEY_SPACE"])
    expect(game.locator(name="TutorialStep")).to_satisfy(
        lambda node: "Step 2 of 6" in text(node),
        description="KEY_SPACE advances tutorial step",
    )
