import copy
import os
from PIL import Image
import shutil

BASE = r"C:\Users\hkm\Documents\Code\doudizhu\assets\img"
BACKUP = os.path.join(BASE, "_cropped_backup")
ALLOWED = {"card_back.png", "table_bg.png", "bomb_explosion.png"}
MARGIN = 12


def crop_image(path):
    img = Image.open(path)
    if img.mode in ("RGBA", "P") and "transparency" in img.info or img.mode == "RGBA":
        alpha = img.split()[-1]
        bbox = alpha.getbbox()
        if not bbox:
            return False, "no alpha content"
    else:
        bg = Image.new(img.mode, img.size, img.getpixel((0, 0)))
        diff = Image.new(img.mode, img.size, (0,) * len(img.mode))
        # RGB delta
        dr = ImageChops.difference(img, bg)
        # threshold to ignore compression noise
        dr = ImageChops.add(dr, ImageChops.invert(dr), 2.0, -32)
        bbox = dr.getbbox()
    if not bbox:
        return False, "empty content"
    left = max(bbox[0] - MARGIN, 0)
    top = max(bbox[1] - MARGIN, 0)
    right = min(bbox[2] + MARGIN, img.width)
    bottom = min(bbox[3] + MARGIN, img.height)
    img.crop((left, top, right, bottom)).save(path)
    return True, f"{(left, top, right, bottom)}"


files = [os.path.join(BASE, f) for f in os.listdir(BASE) if f.lower().endswith(".png")]
summary = {"ok": 0, "skip": 0, "fail": 0}
for path in sorted(files):
    name = os.path.basename(path)
    if name in ALLOWED:
        continue
    if name.startswith("card_") or name in {
        "card_red_joker.png",
        "card_black_joker.png",
        "card_back.png",
    }:
        try:
            ok, msg = crop_image(path)
            summary["ok" if ok else "fail"] += 1
            print(f"{'OK' if ok else 'FAIL'} {name} {msg}")
        except Exception as e:
            summary["fail"] += 1
            print(f"ERR {name}: {e}")
    else:
        summary["skip"] += 1

print("DONE", summary)
