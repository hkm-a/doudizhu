from godot_e2e import expect


def _text(locator):
    return locator.get_property("text")


def test_main_scene_landlord_play_result_replay(game):
    status = game.locator(name="StatusMessage")
    expect(status).to_satisfy(
        lambda node: "Call landlord" in _text(node),
        description="landlord prompt is visible",
    )

    game.locator(name="CallLandlordButton").click()
    expect(status).to_satisfy(
        lambda node: "landlord" in _text(node).lower(),
        description="landlord assignment updates status",
    )
    expect(game.locator(name="AILeftPanel").locator(name="Count")).to_satisfy(
        lambda node: _text(node) == "Cards: 17",
        description="AI left count remains visible after landlord selection",
    )

    first_card = game.locator(name="PlayerHand").locator(name="Card_*").first()
    first_card.click()
    expect(game.locator(path="/root/Main")).to_satisfy(
        lambda node: node.call("debug_selected_count") == 1,
        description="clicking a hand card selects it",
    )

    game.locator(name="HintButton").click()
    expect(status).to_satisfy(
        lambda node: _text(node).startswith("Hint:"),
        description="hint selects a legal play",
    )
    before_model_count = game.locator(path="/root/Main").call("debug_human_card_count")
    game.locator(name="PlayButton").click()
    expect(game.locator(path="/root/Main")).to_satisfy(
        lambda node: node.call("debug_human_card_count") < before_model_count,
        description="playing selected cards reduces the human hand",
    )
    expect(game.locator(name="TrickOwner")).to_satisfy(
        lambda node: "Current trick:" in _text(node),
        description="current trick owner label remains visible",
    )

    game.locator(path="/root/Main").call("debug_finish_human_win")
    expect(game.locator(name="ResultBanner")).to_be_visible()
    expect(game.locator(name="ResultText")).to_satisfy(
        lambda node: "win" in _text(node).lower(),
        description="result banner shows the winner",
    )
    game.locator(name="ResultNewRoundButton").click()
    expect(status).to_satisfy(
        lambda node: "Call landlord" in _text(node),
        description="new round returns to landlord phase",
    )
