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
# name: (source, brightness, saturation, contrast)
JOBS = {
    'l1': ('bg-l1-lanterns-night', 0.9, 0.9, 0.95),
    'l2': ('bg-l2-khan-market', 0.62, 0.8, 0.78),
    'l3': ('bg-l3-rooftops', 0.8, 0.82, 0.8),
    'l4': ('bg-l4-underground', 0.9, 0.9, 0.95),
}
os.makedirs(OUT, exist_ok=True)
for key, (name, bright, sat, con) in JOBS.items():
    im = Image.open(f'{SRC}/{name}.jpg').convert('RGB').resize((640, 360), Image.LANCZOS)
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
