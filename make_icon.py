"""Generates simple PNG app icons (mountains + sun) for manifest.json / home-screen use."""
from PIL import Image, ImageDraw

NAVY = (11, 36, 58)
TURQUOISE = (45, 156, 168)
TURQUOISE_DARK = (30, 110, 120)
CREAM = (245, 238, 221)


def make_icon(size):
    img = Image.new("RGB", (size, size), NAVY)
    d = ImageDraw.Draw(img)

    # sun
    sun_r = size * 0.14
    sun_cx, sun_cy = size * 0.72, size * 0.28
    d.ellipse(
        [sun_cx - sun_r, sun_cy - sun_r, sun_cx + sun_r, sun_cy + sun_r],
        fill=CREAM,
    )

    # back mountain range (turquoise dark)
    d.polygon(
        [
            (0, size * 0.72),
            (size * 0.28, size * 0.42),
            (size * 0.5, size * 0.62),
            (size * 0.7, size * 0.38),
            (size, size * 0.68),
            (size, size),
            (0, size),
        ],
        fill=TURQUOISE_DARK,
    )

    # front mountain range (turquoise)
    d.polygon(
        [
            (0, size),
            (0, size * 0.86),
            (size * 0.22, size * 0.58),
            (size * 0.4, size * 0.78),
            (size * 0.58, size * 0.5),
            (size * 0.8, size * 0.82),
            (size, size * 0.7),
            (size, size),
        ],
        fill=TURQUOISE,
    )

    # snow caps
    d.polygon(
        [
            (size * 0.16, size * 0.66),
            (size * 0.22, size * 0.58),
            (size * 0.28, size * 0.66),
            (size * 0.24, size * 0.64),
            (size * 0.2, size * 0.68),
        ],
        fill=CREAM,
    )
    d.polygon(
        [
            (size * 0.52, size * 0.58),
            (size * 0.58, size * 0.5),
            (size * 0.64, size * 0.58),
            (size * 0.6, size * 0.56),
            (size * 0.56, size * 0.6),
        ],
        fill=CREAM,
    )

    return img


for s in (192, 512):
    make_icon(s).save(f"icons/icon-{s}.png")

print("done")
