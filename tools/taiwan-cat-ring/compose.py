"""
Composes the Taiwan theme's cat ring: a thin red lacquer rim with a gold line on the sector
side (no outer wall, so the kittens do not look caged) and many sleeping kittens lying on it.

    python tools/taiwan-cat-ring/compose.py

Needs Python 3 with Pillow and numpy. Reads the kitten sprites from `kittens/` next to this
file and writes `public/themes/taiwan/cat-ring.webp`. The picture is centred on the wheel and
spans EXTENT wheel radii, so kittens may peek over the edge. If INNER or EXTENT change, update
CAT_RING_INNER / CAT_RING_EXTENT (and LABEL_OUTER, INLAY_INNER) in taiwanTokens.ts.
"""

import math
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE.parent.parent / 'public' / 'themes' / 'taiwan' / 'cat-ring.webp'

SIZE = 1400  # output side, px
EXTENT = 1.03  # the picture spans this many wheel radii from the centre
INNER = 0.895  # rim (and its gold line) starts here, fraction of the wheel radius
BAND_OUT = 0.985  # the lacquer band fades out here; nothing is drawn over the kittens
COUNT = 54  # kittens around the rim
KITTEN = 0.11  # kitten size, fraction of the wheel radius
KITTEN_RADIUS = 0.952  # where the kitten centres lie
SEED = 11

R = SIZE / 2 / EXTENT
C = SIZE / 2


def rim() -> Image.Image:
    yy, xx = np.mgrid[0:SIZE, 0:SIZE]
    r = np.hypot(xx + 0.5 - C, yy + 0.5 - C) / R
    out = np.zeros((SIZE, SIZE, 4), float)

    # red lacquer, darker at both edges, soft fall-off on the outside instead of a gold wall
    glow = np.sin(np.clip((r - INNER) / (BAND_OUT - INNER), 0, 1) * math.pi)
    out[..., :3] = np.stack([110 + 80 * glow, 8 + 14 * glow, 16 + 14 * glow], -1)
    out[..., 3] = np.clip((r - INNER) * R / 1.2 + 0.5, 0, 1) * np.clip((BAND_OUT - r) * R / 2.5 + 0.5, 0, 1) * 255

    # gold line on the sector side only, lit from the top-left
    line = np.clip(1 - np.abs(r - (INNER + 0.006)) * R / 5.5, 0, 1)
    shade = 0.75 + 0.25 * np.cos(np.arctan2(yy - C, xx - C) + math.pi / 4)
    gold = np.stack([236 * shade, 196 * shade, 104 * shade], -1)
    out[..., :3] = out[..., :3] * (1 - line[..., None]) + gold * line[..., None]
    out[..., 3] = np.maximum(out[..., 3], line * 255)

    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


def main() -> None:
    kittens = [Image.open(path).convert('RGBA') for path in sorted((HERE / 'kittens').glob('*.webp'))]
    rng = random.Random(SEED)
    order = list(range(len(kittens)))
    rng.shuffle(order)

    ring = rim()
    layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    shadow = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    size = KITTEN * R

    for index in range(COUNT):
        angle = 2 * math.pi * index / COUNT + rng.uniform(-0.01, 0.01)
        kitten = kittens[order[index % len(order)]]
        if rng.random() < 0.5:
            kitten = kitten.transpose(Image.FLIP_LEFT_RIGHT)
        scale = size / max(kitten.size) * rng.uniform(0.95, 1.05)
        kitten = kitten.resize((max(1, int(kitten.width * scale)), max(1, int(kitten.height * scale))), Image.LANCZOS)
        # back to the outside, give or take, so the row does not look stamped
        kitten = kitten.rotate(-math.degrees(angle) - 90 + rng.uniform(-30, 30), resample=Image.BICUBIC, expand=True)

        x = C + math.cos(angle) * KITTEN_RADIUS * R
        y = C + math.sin(angle) * KITTEN_RADIUS * R
        position = (int(round(x - kitten.width / 2)), int(round(y - kitten.height / 2)))

        # soft shadow towards the centre and a little down
        drop = Image.new('RGBA', kitten.size, (20, 4, 4, 0))
        drop.putalpha(kitten.getchannel('A').point(lambda value: int(value * 0.5)))
        offset = (int(-math.cos(angle) * 0.006 * R), int(-math.sin(angle) * 0.006 * R + 0.004 * R))
        shadow.alpha_composite(drop, (position[0] + offset[0], position[1] + offset[1]))
        layer.alpha_composite(kitten, position)

    ring.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(R * 0.008)))
    ring.alpha_composite(layer)
    ring.save(OUT, quality=88, method=6)

    alpha = np.asarray(ring.getchannel('A'))
    ys, xs = np.nonzero(alpha > 20)
    reach = np.hypot(xs - C, ys - C).max() / R
    print(f'{OUT.name}: {COUNT} kittens, rim from {INNER} R, outermost pixel at {reach:.3f} R')


if __name__ == '__main__':
    main()
