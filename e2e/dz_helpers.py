from godot_e2e import expect


def text(locator):
    return locator.get_property("text")


def root(game):
    return game.locator(path="/root/Main")


def human_count(game):
    return root(game).call("debug_human_card_count")


def selected_count(game):
    return root(game).call("debug_selected_count")


def call_landlord(game):
    root(game).call("simulate_call_landlord")
    # Wait until phase changes from "landlord" to "play" (landlord resolved)
    for _ in range(100):
        import time
        time.sleep(0.05)
        try:
            phase = root(game).call("debug_phase")
            if phase is not None and phase != "landlord":
                return
        except Exception:
            pass
    raise Exception("Call landlord phase not reached")


def hint_then_play(game):
    before = human_count(game)
    root(game).call("simulate_hint")
    expect(game.locator(name="StatusMessage")).to_satisfy(
        lambda node: text(node).startswith("Hint:"),
        description="hint selects a response",
    )
    root(game).call("simulate_play")
    expect(root(game)).to_satisfy(
        lambda node: node.call("debug_human_card_count") < before,
        description="play reduces human hand",
    )

