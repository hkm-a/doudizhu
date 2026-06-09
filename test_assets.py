from godot_e2e import GodotE2E

with GodotE2E.launch(".", timeout=15.0) as game:
    game.wait_for_node("/root/Main", timeout=10.0)
    game.wait_seconds(1.5)
    
    main = game.locator(path="/root/Main")
    
    # Check if background exists
    bg = game.locator(name="TableBackground")
    try:
        bg_size = bg.get_property("size")
        bg_visible = bg.get_property("visible")
        print(f"Background: size={bg_size}, visible={bg_visible}")
    except Exception as e:
        print(f"Background error: {e}")
    
    # Check bottom cards
    bottom_box = game.locator(name="BottomCards")
    bottom_children = main.call("debug_bottom_ui_children")
    bottom_names = main.call("debug_bottom_card_names")
    print(f"Bottom cards: count={bottom_children}, names={bottom_names}")
    
    for name in bottom_names:
        try:
            child = bottom_box.locator(name=name)
            print(f"  {name}: size={child.get_property('size')}, disabled={child.get_property('disabled')}")
        except Exception as e:
            print(f"  {name}: error={e}")
    
    # Check action bar
    try:
        call_btn = game.locator(name="CallLandlordButton")
        call_text = call_btn.get_property("text")
        print(f"Call button: text='{call_text}'")
    except Exception as e:
        print(f"Call button error: {e}")
    
    game.screenshot(save_path="test_after_fix.png")
    print("Screenshot saved: test_after_fix.png")
