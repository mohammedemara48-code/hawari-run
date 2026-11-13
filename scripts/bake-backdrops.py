"""Bake the painted level backdrops (public/bg/*.webp) from /workspace/hawari-art-src.

Each 1024x576 painting is downscaled to the game's 360px height, toned down
(less colour/contrast, darker lower band) so the hero and hazards stay readable,
and mirrored into a 1280x360 seamless horizontal loop.
Usage: python3 scripts/bake-backdrops.py [source-dir]
"""
import os
import sys

from PIL import Image, ImageEnhance, ImageOps

SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/hawari-art-src'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'bg')
# name: (source, brightness, saturation, contrast[, time-of-day grade])
JOBS = {
    'l1': ('bg-l1-lanterns-night', 0.9, 0.9, 0.95),
    'l2': ('bg-l2-khan-market', 0.62, 0.8, 0.78),
    'l3': ('bg-l3-rooftops', 0.8, 0.82, 0.8),
    'l4': ('bg-l4-underground', 0.9, 0.9, 0.95),
    # World 2 (the countryside): one painting graded to four times of day.
    'l5': ('bg-w2-countryside', 0.82, 0.78, 0.82, 'dawn'),
    'l6': ('bg-w2-countryside', 0.92, 0.8, 0.8, 'noon'),
    'l7': ('bg-w2-countryside', 0.78, 0.85, 0.85, 'dusk'),
    'l8': ('bg-w2-countryside', 0.62, 0.7, 0.9, 'night'),
}
# Per-channel multipliers and a lift towards a sky tint for each grade.
GRADES = {
    'dawn': ((0.92, 0.95, 1.08), (120, 140, 190), 0.16),
    'noon': ((1.0, 1.04, 0.98), (236, 228, 196), 0.12),
    'dusk': ((1.0, 1.0, 1.0), (0, 0, 0), 0.0),
    'night': ((0.55, 0.68, 1.05), (20, 30, 70), 0.3),
}


def grade(im, name):
    mul, tint, amount = GRADES[name]
    r, g, b = im.split()
    r = r.point(lambda v: min(255, int(v * mul[0])))
    g = g.point(lambda v: min(255, int(v * mul[1])))
    b = b.point(lambda v: min(255, int(v * mul[2])))
    im = Image.merge('RGB', (r, g, b))
    if amount:
        im = Image.blend(im, Image.new('RGB', im.size, tint), amount)
    if name == 'noon':
        # A high blue midday sky replaces the sunset glow above the horizon.
        w, h = im.size
        mask = Image.new('L', (w, h))
        mask.putdata([int(200 * max(0, 1 - y / (h * 0.42))) for y in range(h) for _ in range(w)])
        im = Image.composite(Image.new('RGB', (w, h), (132, 184, 222)), im, mask)
    return im


os.makedirs(OUT, exist_ok=True)
for key, (name, bright, sat, con, *tod) in JOBS.items():
    im = Image.open(f'{SRC}/{name}.jpg').convert('RGB').resize((640, 360), Image.LANCZOS)
    if tod:
        im = grade(im, tod[0])
    im = ImageEnhance.Color(im).enhance(sat)
    im = ImageEnhance.Contrast(im).enhance(con)
    im = ImageEnhance.Brightness(im).enhance(bright)
    mask = Image.new('L', (640, 360))
    mask.putdata([int(255 * (1 - 0.45 * max(0, (y - 200) / 160))) for y in range(360) for _ in range(640)])
    im = Image.composite(im, Image.new('RGB', (640, 360), (8, 8, 16)), mask)
    loop = Image.new('RGB', (1280, 360))
    loop.paste(im, (0, 0))
    loop.paste(ImageOps.mirror(im), (640, 0))
    loop.save(f'{OUT}/{key}.webp', 'WEBP', quality=80, method=6)
Image.open(f'{SRC}/bg-title-dusk.jpg').convert('RGB').save(f'{OUT}/title.webp', 'WEBP', quality=78, method=6)
print('baked', sorted(os.listdir(OUT)))
