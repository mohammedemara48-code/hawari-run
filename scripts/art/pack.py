# Packs baked frames (/workspace/art/new/*.png) into public/sprites/creatures.png
# plus a {key: [x, y]} map; the game swaps these in by texture key.
import glob, json, os
from PIL import Image
src = os.environ.get('ART_NEW', '/workspace/art/new')
ims = {os.path.basename(f)[:-4]: Image.open(f).convert('RGBA') for f in sorted(glob.glob(src + '/*.png'))}
W = 1024
order = sorted(ims, key=lambda k: -ims[k].height)
x = y = row = 0; pos = {}
for k in order:
    im = ims[k]
    if x + im.width > W: x, y, row = 0, y + row + 1, 0
    pos[k] = [x, y]; x += im.width + 1; row = max(row, im.height)
H = y + row
sheet = Image.new('RGBA', (W, H))
for k, (px, py) in pos.items(): sheet.paste(ims[k], (px, py))
os.makedirs('public/sprites', exist_ok=True)
sheet.save('public/sprites/creatures.png', optimize=True)
json.dump(pos, open('public/sprites/creatures.json', 'w'), separators=(',', ':'))
print(len(pos), 'frames', W, 'x', H, os.path.getsize('public/sprites/creatures.png') // 1024, 'KB')
