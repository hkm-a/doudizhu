import os
from PIL import Image
import shutil

BASE = r"C:\Users\hkm\Documents\Code\doudizhu\assets\img"
BACKUP_DIR = os.path.join(BASE, "_crop_backup")


def process_card(path: str):
    img = Image.open(path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    alpha = img.split()[-1]
    bbox = alpha.getbbox()
    if not bbox:
        return None
    left = max(bbox[0] - 0, 0)
    top = max(bbox[1] - 0, 0)
    right = min(bbox[2] + 0, img.width)
    bottom = min(bbox[3] + 0, img.height)
    cropped = img.crop((left, top, right, bottom))
    return cropped, (left, top, right, bottom)


def main():
    os.makedirs(BACKUP_DIR, exist_ok=True)
    files = sorted(
        f
        for f in os.listdir(BASE)
        if f.startswith("card_") and f.endswith(".png") and os.path.isfile(os.path.join(BASE, f))
    )
    for name in files:
        src = os.path.join(BASE, name)
        out = process_card(src)
        if not out:
            continue
        cropped, box = out
        shutil.move(src, os.path.join(BACKUP_DIR, name))
        cropped.save(src)
        print(f"CROPPED {name} {box} -> {cropped.size}")
    print("DONE")


if __name__ == "__main__":
    main()
