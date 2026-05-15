#!/usr/bin/env python3
"""
Generate Chrome Web Store marketing assets.

  * 5 × 1280x800 screenshot tiles   (headline + body + popup inset)
  * 1 × 440x280 small promo tile     (logo + tagline, compact)
  * 1 × 1400x560 marquee promo tile  (hero — full-bleed wordmark + popup)

All output is 24-bit RGB PNG (no alpha) as required by the Store.

Run:
    python3 screenshots/gen-store-assets.py
Output: docs/stores/ChromeWebStore/05-icons-and-screenshots/screenshots/store/*.png
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POPUP = ROOT / "screenshots"
OUT = ROOT / "docs/stores/ChromeWebStore/05-icons-and-screenshots/screenshots/store"
OUT.mkdir(parents=True, exist_ok=True)

# Theme
MAUVE_LIGHT = (0xC4, 0xA0, 0xC1)
MAUVE = (0x8D, 0x6A, 0x8A)
MAUVE_DARK = (0x74, 0x54, 0x72)
DEEP = (0x50, 0x38, 0x4E)
INK = (0x16, 0x15, 0x1A)
WHITE = (0xFF, 0xFF, 0xFF)
WHITE_DIM = (0xEC, 0xE0, 0xEA)

# Fonts — fall back gracefully
def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def gradient(w, h, c1, c2, vertical=False):
    """Linear gradient image (RGB, no alpha)."""
    base = Image.new("RGB", (w, h), c1)
    px = base.load()
    if vertical:
        for y in range(h):
            t = y / (h - 1)
            r = int(c1[0] + (c2[0] - c1[0]) * t)
            g = int(c1[1] + (c2[1] - c1[1]) * t)
            b = int(c1[2] + (c2[2] - c1[2]) * t)
            for x in range(w):
                px[x, y] = (r, g, b)
    else:
        # Diagonal 135° gradient — same look as the popup header
        diag = (w + h) - 1
        for y in range(h):
            for x in range(w):
                t = (x + y) / diag
                r = int(c1[0] + (c2[0] - c1[0]) * t)
                g = int(c1[1] + (c2[1] - c1[1]) * t)
                b = int(c1[2] + (c2[2] - c1[2]) * t)
                px[x, y] = (r, g, b)
    return base


def drop_shadow(img, blur=24, offset=(0, 12), color=(0, 0, 0), opacity=80):
    """Composite img with a soft shadow on a transparent canvas."""
    w, h = img.size
    pad = blur * 2
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2 + offset[1]), (0, 0, 0, 0))
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rectangle(
        (pad + offset[0], pad + offset[1], pad + offset[0] + w, pad + offset[1] + h),
        fill=color + (opacity,),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(img, (pad, pad), img if img.mode == "RGBA" else None)
    return canvas


def rounded_corners(img, radius=24):
    """Round the corners of an RGB or RGBA image."""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    mask = Image.new("L", img.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, img.size[0], img.size[1]), radius=radius, fill=255)
    img.putalpha(mask)
    return img


def draw_wordmark(draw, x, y, scale=1.0):
    """Stitch Export logo lockup — small download icon + wordmark."""
    box = int(36 * scale)
    pad = int(8 * scale)
    # Icon container (white round)
    draw.rounded_rectangle(
        (x, y, x + box, y + box),
        radius=int(8 * scale),
        fill=WHITE,
    )
    # Up-arrow icon (simplified)
    cx, cy = x + box // 2, y + box // 2
    arrow_h = int(box * 0.45)
    sw = max(2, int(2.5 * scale))
    # Vertical line
    draw.line(
        (cx, cy + arrow_h // 2, cx, cy - arrow_h // 2),
        fill=DEEP, width=sw,
    )
    # Arrow head
    head = int(arrow_h * 0.45)
    draw.line(
        (cx - head, cy - arrow_h // 2 + head, cx, cy - arrow_h // 2),
        fill=DEEP, width=sw,
    )
    draw.line(
        (cx + head, cy - arrow_h // 2 + head, cx, cy - arrow_h // 2),
        fill=DEEP, width=sw,
    )
    # Tray (bracket below)
    bracket_y = cy + arrow_h // 2 + int(4 * scale)
    bw = int(box * 0.55)
    draw.line(
        (cx - bw // 2, bracket_y, cx - bw // 2, bracket_y + int(6 * scale)),
        fill=DEEP, width=sw,
    )
    draw.line(
        (cx + bw // 2, bracket_y, cx + bw // 2, bracket_y + int(6 * scale)),
        fill=DEEP, width=sw,
    )
    draw.line(
        (cx - bw // 2, bracket_y + int(6 * scale), cx + bw // 2, bracket_y + int(6 * scale)),
        fill=DEEP, width=sw,
    )

    # Wordmark
    f = font(int(28 * scale), bold=True)
    draw.text((x + box + pad, y + int(2 * scale)), "Stitch Export", font=f, fill=WHITE)


def wrap_text(text, font, max_width):
    """Word-wrap into lines that fit within max_width pixels."""
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        bbox = font.getbbox(test)
        if bbox[2] - bbox[0] <= max_width:
            line = test
        else:
            if line:
                lines.append(line)
            line = w
    if line:
        lines.append(line)
    return lines


def compose_screenshot(out_path, headline, body, popup_file, eyebrow="STITCH EXPORT v1.2.0"):
    """1280x800 marketing screenshot — left text, right popup with shadow."""
    W, H = 1280, 800
    bg = gradient(W, H, DEEP, MAUVE, vertical=False)
    draw = ImageDraw.Draw(bg)

    # Soft highlight wash on bottom-right (optical depth)
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W * 0.55, H * 0.55, W * 1.1, H * 1.15), fill=MAUVE_LIGHT + (60,))
    glow = glow.filter(ImageFilter.GaussianBlur(80))
    bg.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(bg)

    # === LEFT: text ===
    pad_x = 72
    text_x = pad_x
    text_w = 640

    draw_wordmark(draw, text_x, 64, scale=0.9)

    # Eyebrow
    f_eye = font(13, bold=True)
    draw.text((text_x, 64 + 56), eyebrow, font=f_eye, fill=MAUVE_LIGHT)

    # Headline
    f_h = font(56, bold=True)
    lines = wrap_text(headline, f_h, text_w)
    y = 64 + 96
    for line in lines:
        draw.text((text_x, y), line, font=f_h, fill=WHITE)
        bbox = f_h.getbbox(line)
        y += (bbox[3] - bbox[1]) + 18

    # Body
    f_b = font(22)
    body_lines = wrap_text(body, f_b, text_w)
    y += 24
    for line in body_lines:
        draw.text((text_x, y), line, font=f_b, fill=WHITE_DIM)
        bbox = f_b.getbbox(line)
        y += (bbox[3] - bbox[1]) + 12

    # === RIGHT: popup screenshot ===
    popup = Image.open(popup_file).convert("RGBA")
    # Source is 800x1200 (DPR 2). Scale to fit ~720h with margin.
    target_h = 700
    ratio = target_h / popup.size[1]
    target_w = int(popup.size[0] * ratio)
    popup = popup.resize((target_w, target_h), Image.LANCZOS)
    popup = rounded_corners(popup, radius=20)

    shadow = drop_shadow(popup, blur=40, offset=(0, 18), opacity=110)
    # Position: right-aligned
    sx = W - shadow.size[0] // 2 - target_w // 2 - 60
    sy = (H - shadow.size[1]) // 2 + 30
    # Simplify: paste shadow first, then popup
    # Actually drop_shadow already returns a single canvas with both — just paste it
    sx2 = W - target_w - 100 - 40  # leave 100px right margin, account for shadow padding
    sy2 = (H - shadow.size[1]) // 2
    bg.paste(shadow, (sx2, sy2), shadow)

    bg.save(out_path, "PNG", optimize=True)
    print(f"  {out_path.name:42s} 1280x800")


def compose_small_promo(out_path):
    """440x280 small promo tile — logo + tagline, vertically centered."""
    W, H = 440, 280
    bg = gradient(W, H, DEEP, MAUVE, vertical=False)
    draw = ImageDraw.Draw(bg)

    # Glow accent
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W * 0.4, H * 0.4, W * 1.1, H * 1.2), fill=MAUVE_LIGHT + (60,))
    glow = glow.filter(ImageFilter.GaussianBlur(40))
    bg.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(bg)

    # Center content vertically
    draw_wordmark(draw, 32, 40, scale=1.1)

    f_h = font(28, bold=True)
    f_b = font(15)

    headline_y = 130
    headline = "Archive every Stitch design"
    draw.text((32, headline_y), headline, font=f_h, fill=WHITE)

    body_y = headline_y + 44
    body = "Batch export + chat history + per-turn refs"
    draw.text((32, body_y), body, font=f_b, fill=WHITE_DIM)

    # Bottom rib
    f_meta = font(11, bold=True)
    draw.text((32, H - 32), "FREE · OPEN SOURCE", font=f_meta, fill=MAUVE_LIGHT)

    bg.save(out_path, "PNG", optimize=True)
    print(f"  {out_path.name:42s} 440x280")


def compose_marquee(out_path, popup_file):
    """1400x560 marquee — hero promo with popup floating right."""
    W, H = 1400, 560
    bg = gradient(W, H, DEEP, MAUVE, vertical=False)
    draw = ImageDraw.Draw(bg)

    # Big diagonal glow
    glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse((W * 0.45, -H * 0.3, W * 1.2, H * 1.3), fill=MAUVE_LIGHT + (65,))
    glow = glow.filter(ImageFilter.GaussianBlur(90))
    bg.paste(glow, (0, 0), glow)
    draw = ImageDraw.Draw(bg)

    # === LEFT: hero text ===
    pad_x = 80
    draw_wordmark(draw, pad_x, 64, scale=1.0)

    f_eye = font(14, bold=True)
    draw.text((pad_x, 64 + 60), "CHROME EXTENSION · v1.2.0", font=f_eye, fill=MAUVE_LIGHT)

    f_h = font(64, bold=True)
    headline_lines = ["Archive every Stitch design", "in 30 seconds."]
    y = 64 + 100
    for line in headline_lines:
        draw.text((pad_x, y), line, font=f_h, fill=WHITE)
        bbox = f_h.getbbox(line)
        y += (bbox[3] - bbox[1]) + 16

    f_b = font(20)
    body = "Pure-API batch export · per-turn chat history · toolbar count badge"
    draw.text((pad_x, y + 12), body, font=f_b, fill=WHITE_DIM)

    # CTA chip
    chip_y = H - 90
    chip_h = 44
    chip_text = "github.com/nsozturk/stitch-export"
    f_chip = font(14, bold=True)
    bbox = f_chip.getbbox(chip_text)
    chip_w = (bbox[2] - bbox[0]) + 36
    draw.rounded_rectangle(
        (pad_x, chip_y, pad_x + chip_w, chip_y + chip_h),
        radius=22,
        fill=(255, 255, 255, 30),
        outline=MAUVE_LIGHT,
        width=1,
    )
    draw.text((pad_x + 18, chip_y + 14), chip_text, font=f_chip, fill=WHITE)

    # === RIGHT: popup screenshot, smaller, floating ===
    popup = Image.open(popup_file).convert("RGBA")
    target_h = 460
    ratio = target_h / popup.size[1]
    target_w = int(popup.size[0] * ratio)
    popup = popup.resize((target_w, target_h), Image.LANCZOS)
    popup = rounded_corners(popup, radius=18)

    shadow = drop_shadow(popup, blur=44, offset=(0, 22), opacity=120)
    sx = W - target_w - 120 - 40
    sy = (H - shadow.size[1]) // 2
    bg.paste(shadow, (sx, sy), shadow)

    bg.save(out_path, "PNG", optimize=True)
    print(f"  {out_path.name:42s} 1400x560")


def main():
    print("Generating Chrome Web Store assets:")

    # 5 screenshots — each pairs a popup state with a headline/body
    shots = [
        {
            "out": "screenshot-01-overview.png",
            "popup": "01-popup-ready-on-stitch.png",
            "eyebrow": "STITCH EXPORT · v1.2.0",
            "headline": "Archive every Stitch design — in 30 seconds.",
            "body": "Pure-API batch export. No DOM clicks. 70+ projects bundled into a single ZIP, sub-minute runtime.",
        },
        {
            "out": "screenshot-02-batch-progress.png",
            "popup": "04-popup-batch-progress.png",
            "eyebrow": "BATCH EXPORT",
            "headline": "Parallel by design.",
            "body": "10 concurrent API calls + 6 parallel HTML downloads. Watch every project tick by in real time.",
        },
        {
            "out": "screenshot-03-toolbar-badge.png",
            "popup": "07-popup-loading-counting.png",
            "eyebrow": "TOOLBAR BADGE",
            "headline": "Live project count, always visible.",
            "body": "Mauve badge on the dashboard shows how many Stitch projects you have. EXP reminder on every project page.",
        },
        {
            "out": "screenshot-04-success.png",
            "popup": "05-popup-success.png",
            "eyebrow": "ONE ZIP",
            "headline": "Final designs + full history.",
            "body": "screens/ for the current state. history/turn-NNN/ for every design generated in each conversation turn.",
        },
        {
            "out": "screenshot-05-formats.png",
            "popup": "02-popup-custom-format.png",
            "eyebrow": "EXPORT FORMATS",
            "headline": "Claude · ChatGPT · custom roles.",
            "body": "JSON output drops straight into any LLM. Configure user/assistant role names yourself for custom pipelines.",
        },
    ]
    for s in shots:
        compose_screenshot(
            OUT / s["out"],
            s["headline"],
            s["body"],
            POPUP / s["popup"],
            eyebrow=s["eyebrow"],
        )

    # Promo tiles
    compose_small_promo(OUT / "promo-small-440x280.png")
    compose_marquee(OUT / "promo-marquee-1400x560.png", POPUP / "01-popup-ready-on-stitch.png")

    print(f"\nOutput dir: {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
