#!/usr/bin/env python3
# scripts/procesar-marca.py
# ============================================================
# Procesa los originales de assets/brand/ y genera los assets
# que consume la app en public/brand/ y public/icons/.
#
# Requiere: Python 3 + Pillow + numpy  (pip install pillow numpy)
#
# Sello: la foto tiene el papel gris y la tinta encima. Se separa
# "cuanta tinta hay" (alpha) de "de que color es la tinta", y se
# vuelve a componer sobre blanco puro. Asi desaparece el fondo sin
# perder el morado de la firma ni aclarar el texto.
#
# Logo: se recorta el margen muerto y se lleva el fondo a blanco.
#
# Uso:  python scripts/procesar-marca.py
# ============================================================
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets" / "brand"
OUT = ROOT / "public" / "brand"
ICONS = ROOT / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)
ICONS.mkdir(parents=True, exist_ok=True)

# --- parametros del sello (validados en previews) ---
SELLO_CUTOFF = 0.08   # debajo de esto es ruido de papel
SELLO_POWER = 0.55    # < 1 = mas densidad de tinta
SELLO_WHITE = (215, 245)  # rampa suave a blanco puro
LOGO_BG = (247, 247, 247)
LOGO_PAD = 0.03
MARK_FRACTION = 0.62  # parte alta del logo, sin el wordmark
JPEG_Q = 92


def load(path):
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))


def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def bg_lum(a, size=9, blur=30):
    """Estimacion del papel: dilata la tinta y difumina, para que el
    fondo sea el papel y no una mezcla papel+tinta."""
    im = to_img(a)
    mx = im.filter(ImageFilter.MaxFilter(size))
    soft = mx.filter(ImageFilter.GaussianBlur(blur))
    return lum(np.asarray(soft, dtype=np.float32))


def unblend(a, bgl, cutoff, power):
    """Separa alpha (tinta) del color de la tinta y recompone sobre blanco."""
    t = np.clip(lum(a) / np.maximum(bgl, 1.0), 0, 1)
    alpha = np.where((1.0 - t) < cutoff, 0.0, 1.0 - t)
    safe = np.maximum(alpha, 1e-3)[..., None]
    ink = np.clip((a - (1.0 - alpha[..., None]) * bgl[..., None]) / safe, 0, 255)
    ap = (alpha ** power)[..., None]
    return np.clip(ap * ink + (1.0 - ap) * 255.0, 0, 255)


def soft_white(a, lo, hi):
    """Lleva la nube gris restante a blanco puro sin tocar la tinta."""
    Lo = lum(a)
    ramp = np.clip((Lo - lo) / (hi - lo), 0, 1)
    gain = 1.0 + ramp * (255.0 / np.maximum(Lo, 1.0) - 1.0)
    return np.clip(a * gain[..., None], 0, 255)


def crop_logo(a, bg, pad_ratio):
    d = np.abs(a - np.array(bg, dtype=np.float32)).sum(axis=2)
    ys, xs = np.where(d > 30)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    pad = int(pad_ratio * (x1 - x0))
    return a[max(0, y0 - pad):y1 + pad, max(0, x0 - pad):x1 + pad].copy()


def white_matte(a):
    hi = a.max(axis=2)
    sat = a.max(axis=2) - a.min(axis=2)
    a[(hi > 232) & (sat < 12)] = 255.0
    return a


def icon_tile(img, size, pad_ratio, rounded, radius_ratio=0.28):
    """Tile claro con el mark adentro. rounded=False = cuadrado pleno."""
    if rounded:
        mask = Image.new("L", (size, size), 0)
        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, size - 1, size - 1], radius=int(size * radius_ratio), fill=255
        )
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(Image.new("RGB", (size, size), "white"), (0, 0), mask)
    else:
        out = Image.new("RGB", (size, size), "white")
    inner = int(size * (1 - pad_ratio * 2))
    li = img.copy()
    li.thumbnail((inner, inner), Image.LANCZOS)
    pos = ((size - li.size[0]) // 2, (size - li.size[1]) // 2)
    if rounded:
        out.paste(li, pos)
    else:
        out.paste(li, pos)
    return out


def main():
    sello = load(SRC / "sello-origen.jpg")
    limpio = soft_white(
        unblend(sello, bg_lum(sello), SELLO_CUTOFF, SELLO_POWER), *SELLO_WHITE
    )
    to_img(limpio).save(OUT / "katdoc-sello.jpg", quality=JPEG_Q, optimize=True)

    logo = white_matte(crop_logo(load(SRC / "logo-origen.jpg"), LOGO_BG, LOGO_PAD))
    logo_img = to_img(logo)
    logo_img.save(OUT / "katdoc-logo.jpg", quality=JPEG_Q, optimize=True)

    w, h = logo_img.size
    mark = logo_img.crop((0, 0, w, int(h * MARK_FRACTION)))
    # recorte fino al contenido: el mark tiene que llenar el tile
    ma = np.asarray(mark, dtype=np.float32)
    d = np.abs(ma - 255.0).sum(axis=2)
    ys, xs = np.where(d > 30)
    pad = int(0.02 * (xs.max() - xs.min()))
    mark = mark.crop((
        max(0, int(xs.min()) - pad),
        max(0, int(ys.min()) - pad),
        min(mark.size[0], int(xs.max()) + pad),
        min(mark.size[1], int(ys.max()) + pad),
    ))
    mark.save(OUT / "katdoc-mark.jpg", quality=JPEG_Q, optimize=True)

    icon_tile(mark, 32, 0.10, True).save(ICONS / "icon-32.png")
    icon_tile(mark, 192, 0.10, True).save(ICONS / "icon-192.png")
    icon_tile(mark, 512, 0.10, True).save(ICONS / "icon-512.png")
    icon_tile(mark, 180, 0.10, False).save(ICONS / "apple-180.png")
    icon_tile(mark, 512, 0.20, False).save(ICONS / "maskable-512.png")

    for p in ["katdoc-sello.jpg", "katdoc-logo.jpg", "katdoc-mark.jpg"]:
        f = OUT / p
        print(f"{f.name:24s} {Image.open(f).size}  {f.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
