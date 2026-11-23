"""Rebuild the twelve game backdrops from the three original art sheets."""
from pathlib import Path
from PIL import Image, ImageEnhance
root=Path(__file__).resolve().parents[2]
for group,name in enumerate(['giza','citadel','rashid']):
    image=Image.open(root/'scripts/art/landmark-source'/f'{name}-four-scenes.png').convert('RGB')
    width,height=image.size
    for index in range(4):
        x=index%2*(width//2)
        y=index//2*(height//2)
        tile=image.crop((x+2,y+2,x+width//2-2,y+height//2-2)).resize((960,360),Image.Resampling.NEAREST)
        ImageEnhance.Color(tile).enhance(.88).save(root/f'public/bg/l{33+group*4+index}.webp',quality=88)
