import struct
from pathlib import Path


SCREENSHOT_DIR = Path(__file__).parent / "screenshots" / "scene_main"
EXPECTED_SCREENSHOTS = [
    "v0_3_0_01_initial.png",
    "v0_3_0_02_selected.png",
    "v0_3_0_03_result.png",
]


def _png_size(path):
    with path.open("rb") as f:
        header = f.read(24)
    assert header[:8] == b"\x89PNG\r\n\x1a\n"
    return struct.unpack(">II", header[16:24])


def test_v0_3_0_m3_visual_qa_reference_screenshots_exist():
    for filename in EXPECTED_SCREENSHOTS:
        path = SCREENSHOT_DIR / filename
        assert path.exists(), f"missing v0.3.0 visual QA screenshot: {path}"
        assert path.stat().st_size > 10_000
        assert _png_size(path) == (1280, 720)
