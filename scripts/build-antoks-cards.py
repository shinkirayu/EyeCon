"""Builds the Antoks Manoks best-seller cards for level 4.

Specs come from the Figma HTML export (card 300x471, radius 40, #fdfdfd,
photo 252px at 24,20, Lato Bold/Regular 32px in #7e0000). Each card is one
image so the player moves it as a single piece.

Photos: the full-size Figma exports ("1 1.png" etc.) in assets/levels/antoks/.

Run: python scripts/build-antoks-cards.py  (needs Pillow and the Lato fonts
in scripts/fonts/).
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'assets', 'levels', 'antoks')
FIGMA = OUT  # full-size photos exported from Figma sit next to the cards
FONTS = os.path.join(HERE, 'fonts')
S = 2  # render at 2x for sharp text
CARDS = [  # (output, figma photo, name, price)
    ('card1', '1 1.png', 'Lechong Manok', '349 PHP'),
    ('card2', '3 1.png', 'Inihaw na Liempo', '299 PHP'),
    ('card3', '2 1.png', 'Pork Barbeque', '89 PHP'),
    ('card4', '4 2.png', 'Chicken Wings', '149 PHP'),
]
RED = '#7e0000'

def font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size * S)

for out, figma, name, price in CARDS:
    src = os.path.join(FIGMA, figma)
    photo = Image.open(src).convert('RGBA')
    W, H = 300 * S, 471 * S
    card = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((0, 0, W - 1, H - 1), 40 * S, fill='#fdfdfd')
    # Crop to square (object-fit: cover), then round the corners.
    side = min(photo.size)
    photo = photo.crop(((photo.width - side) // 2, (photo.height - side) // 2,
                        (photo.width + side) // 2, (photo.height + side) // 2)).resize((252 * S, 252 * S), Image.LANCZOS)
    mask = Image.new('L', photo.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, photo.width - 1, photo.height - 1), 24 * S, fill=255)
    card.paste(photo, (24 * S, 20 * S), mask)
    for text, y, f in [(name, 293, 'Lato-Bold.ttf'), (price, 347, 'Lato-Regular.ttf')]:
        ft = font(f, 32)
        d.text(((W - d.textlength(text, font=ft)) / 2, y * S), text, font=ft, fill=RED)
    card.save(os.path.join(OUT, out + '.png'))
    print(out, 'built from', figma)
