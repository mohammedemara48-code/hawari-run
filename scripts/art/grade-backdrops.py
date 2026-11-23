"""Readable dark-scene backgrounds, preserving source art and mirrored loops.
Requires Pillow. Rebuild only from the checked-in source, never a graded output.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
SOURCE = Path(__file__).with_name('backdrop-source')
LUT = [round(255 * ((value / 255) ** 0.76)) for value in range(256)]
for source in SOURCE.glob('l*.webp'):
    image = Image.open(source).convert('RGB').point(LUT * 3)
    image.save(ROOT / 'public' / 'bg' / source.name, 'WEBP', quality=92, method=6)
