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
    # World 3 (Damietta): the workshop quay by morning, inside a carpenter's
    # workshop (its own painting), at sunset over the harbour and in the blue
    # hour at Ras El Bar.
    'l9': ('bg-w3-damietta', 0.84, 0.86, 0.9, 'morning'),
    'l10': ('bg-w3-workshop-interior', 0.74, 0.8, 0.88),
    'l11': ('bg-w3-damietta', 0.8, 0.85, 0.85, 'dusk'),
    'l12': ('bg-w3-damietta', 0.66, 0.72, 0.92, 'bluehour'),
    # World 4 (Alexandria): the corniche on a bright morning, the tram ride
    # at hot noon, Stanley at sunset and Qaitbay in a winter storm (نوة).
    'l13': ('bg-w4-alexandria', 0.86, 0.84, 0.88, 'morning'),
    'l14': ('bg-w4-alexandria', 0.96, 0.95, 0.9, 'noon'),
    'l15': ('bg-w4-alexandria', 0.8, 0.86, 0.86, 'sunset'),
    'l16': ('bg-w4-alexandria', 0.8, 0.6, 0.95, 'storm'),
}
# Per-channel multipliers and a lift towards a sky tint for each grade.
GRADES = {
    'dawn': ((0.92, 0.95, 1.08), (120, 140, 190), 0.16),
    'noon': ((1.0, 1.04, 0.98), (236, 228, 196), 0.12),
    'dusk': ((1.0, 1.0, 1.0), (0, 0, 0), 0.0),
    'night': ((0.55, 0.68, 1.05), (20, 30, 70), 0.3),
    'morning': ((1.0, 1.02, 1.08), (200, 214, 230), 0.05),
    'lamplight': ((1.08, 0.82, 0.55), (60, 30, 10), 0.3),
    'bluehour': ((0.6, 0.75, 1.1), (30, 50, 90), 0.26),
    'sunset': ((1.12, 0.9, 0.72), (240, 130, 70), 0.18),
    'storm': ((0.66, 0.74, 0.86), (52, 62, 78), 0.38),
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
    if name in ('noon', 'morning'):
        # A high blue midday sky replaces the sunset glow above the horizon.
        w, h = im.size
        mask = Image.new('L', (w, h))
        mask.putdata([int(200 * max(0, 1 - y / (h * 0.42))) for y in range(h) for _ in range(w)])
        sky = (132, 184, 222) if name == 'noon' else (176, 200, 220)
        im = Image.composite(Image.new('RGB', (w, h), sky), im, mask)
    if name == 'storm':
        # A low bruised cloud deck rolls over the sky, and slanting rain.
        w, h = im.size
        mask = Image.new('L', (w, h))
        mask.putdata([int(170 * max(0, 1 - y / (h * 0.5))) for y in range(h) for _ in range(w)])
        im = Image.composite(Image.new('RGB', (w, h), (44, 50, 62)), im, mask)
        from PIL import ImageDraw
        d = ImageDraw.Draw(im, 'RGBA')
        import random
        rnd = random.Random(4)
        for _ in range(520):
            x, y = rnd.randrange(-60, w), rnd.randrange(-20, h)
            d.line([(x, y), (x + 7, y + 22)], fill=(200, 214, 230, 46), width=1)
    if name == 'sunset':
        w, h = im.size
        mask = Image.new('L', (w, h))
        mask.putdata([int(110 * max(0, 1 - y / (h * 0.45))) for y in range(h) for _ in range(w)])
        im = Image.composite(Image.new('RGB', (w, h), (232, 120, 84)), im, mask)
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
