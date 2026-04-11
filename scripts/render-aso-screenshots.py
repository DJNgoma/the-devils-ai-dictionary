#!/usr/bin/env python3
"""Render App Store screenshot sets from a release manifest."""

from __future__ import annotations

import argparse
import json
import math
import shutil
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
except ImportError as exc:  # pragma: no cover - tooling path
    raise SystemExit(
        "render-aso-screenshots.py requires Pillow. Install it with `python3 -m pip install Pillow`."
    ) from exc


FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial Black.ttf",
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/HelveticaNeue.ttc",
]

DIRECT_FAMILIES = {"watch"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Render ASO screenshot families from a manifest.")
    parser.add_argument("--manifest", required=True, help="Path to the screenshot manifest JSON file.")
    return parser.parse_args()


def load_manifest(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def ensure_parent(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for candidate in FONT_CANDIDATES:
        font_path = Path(candidate)
        if font_path.exists():
            return ImageFont.truetype(str(font_path), size=size)

    raise SystemExit("No supported font was found on this machine.")


def rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def fit_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def text_bounds(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, spacing: int = 0) -> tuple[int, int]:
    box = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing, align="center")
    return box[2] - box[0], box[3] - box[1]


def choose_font(
    draw: ImageDraw.ImageDraw,
    text: str,
    start_size: int,
    max_width: int,
    spacing: int = 0,
    min_size: int = 36,
) -> ImageFont.FreeTypeFont:
    size = start_size
    while size >= min_size:
        font = load_font(size)
        width, _ = text_bounds(draw, text, font, spacing=spacing)
        if width <= max_width:
            return font
        size -= 4
    return load_font(min_size)


def add_shadow(
    base: Image.Image,
    box: tuple[int, int, int, int],
    radius: int,
    blur: int,
    y_offset: int,
) -> Image.Image:
    shadow = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(shadow)
    x0, y0, x1, y1 = box
    draw.rounded_rectangle((x0, y0 + y_offset, x1, y1 + y_offset), radius=radius, fill=(0, 0, 0, 56))
    shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
    return Image.alpha_composite(base, shadow)


def device_layout(canvas: dict, device: str) -> dict:
    width = canvas["width"]
    height = canvas["height"]

    if device == "phone":
        outer_width = round(width * 0.705)
        outer_height = round(height * 0.704)
        return {
            "outer_width": outer_width,
            "outer_height": outer_height,
            "border": max(18, round(outer_width * 0.024)),
            "radius": round(outer_width * 0.127),
            "top": round(height * 0.241),
            "shadow_blur": 40,
            "shadow_offset": 28,
            "camera": "island",
        }

    if device == "tablet":
        outer_width = round(width * 0.533)
        outer_height = round(height * 0.533)
        return {
            "outer_width": outer_width,
            "outer_height": outer_height,
            "border": max(22, round(outer_width * 0.022)),
            "radius": round(outer_width * 0.067),
            "top": round(height * 0.356),
            "shadow_blur": 44,
            "shadow_offset": 26,
            "camera": "bar",
        }

    raise ValueError(f"Unsupported marketing device: {device}")


def draw_marketing_background(draw: ImageDraw.ImageDraw, canvas: dict, brand: dict) -> None:
    width = canvas["width"]
    height = canvas["height"]
    banner_height = round(height * 0.265)

    draw.rectangle((0, 0, width, banner_height), fill=brand["accent"])
    draw.ellipse((-round(width * 0.16), round(height * 0.19), round(width * 0.26), round(height * 0.39)), fill=brand["shape_light"])
    draw.ellipse((round(width * 0.78), round(height * 0.17), round(width * 1.08), round(height * 0.34)), fill=brand["shape_dark"])


def render_marketing_slide(root: Path, brand: dict, family: dict, slide: dict) -> Path:
    canvas = family["canvas"]
    width = canvas["width"]
    height = canvas["height"]
    output_path = root / slide["output"]
    source_path = root / slide["source"]

    ensure_parent(output_path)
    source = Image.open(source_path).convert("RGBA")
    image = Image.new("RGBA", (width, height), brand["paper"])
    draw = ImageDraw.Draw(image)

    draw_marketing_background(draw, canvas, brand)

    safe_width = round(width * 0.70)
    line1_font = choose_font(draw, slide["line1"], round(height * 0.104), safe_width)
    line2_font = choose_font(draw, slide["line2"], round(height * 0.041), safe_width, spacing=8)

    _, line1_height = text_bounds(draw, slide["line1"], line1_font)
    headline_top = round(height * 0.045)
    center_x = width // 2

    draw.text((center_x, headline_top), slide["line1"], font=line1_font, fill=brand["headline"], anchor="ma")
    draw.multiline_text(
        (center_x, headline_top + line1_height + round(height * 0.01)),
        slide["line2"],
        font=line2_font,
        fill=brand["headline"],
        anchor="ma",
        align="center",
        spacing=8,
    )

    layout = device_layout(canvas, slide["device"])
    outer_width = layout["outer_width"]
    outer_height = layout["outer_height"]
    left = (width - outer_width) // 2
    top = layout["top"]
    box = (left, top, left + outer_width, top + outer_height)
    image = add_shadow(image, box, layout["radius"], blur=layout["shadow_blur"], y_offset=layout["shadow_offset"])

    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle(box, radius=layout["radius"], fill=brand["frame"])
    screen_box = (
        left + layout["border"],
        top + layout["border"],
        left + outer_width - layout["border"],
        top + outer_height - layout["border"],
    )
    screen_size = (screen_box[2] - screen_box[0], screen_box[3] - screen_box[1])
    fitted = fit_image(source, screen_size)
    mask = rounded_mask(screen_size, max(22, layout["radius"] - layout["border"]))
    image.paste(fitted, (screen_box[0], screen_box[1]), mask)

    if layout["camera"] == "island":
        island_width = round(outer_width * 0.236)
        island_height = max(56, round(outer_height * 0.031))
        island_x = left + (outer_width - island_width) // 2
        island_y = top + round(outer_height * 0.017)
        draw.rounded_rectangle(
            (island_x, island_y, island_x + island_width, island_y + island_height),
            radius=island_height // 2,
            fill=brand["frame"],
        )
    else:
        camera_width = round(outer_width * 0.145)
        camera_height = max(18, round(outer_height * 0.015))
        camera_x = left + (outer_width - camera_width) // 2
        camera_y = top + round(outer_height * 0.02)
        draw.rounded_rectangle(
            (camera_x, camera_y, camera_x + camera_width, camera_y + camera_height),
            radius=camera_height // 2,
            fill="#2A2A2A",
        )

    image.convert("RGB").save(output_path, quality=100)
    return output_path


def render_direct_slide(root: Path, family: dict, slide: dict) -> Path:
    canvas = family["canvas"]
    output_path = root / slide["output"]
    source_path = root / slide["source"]
    ensure_parent(output_path)

    source = Image.open(source_path).convert("RGB")
    if source.size == (canvas["width"], canvas["height"]):
        source.save(output_path, quality=100)
        return output_path

    fitted = fit_image(source, (canvas["width"], canvas["height"]))
    fitted.save(output_path, quality=100)
    return output_path


def build_contact_sheet(root: Path, title: str, output_path: Path, images: list[Path], columns: int = 2) -> None:
    ensure_parent(output_path)
    if not images:
        return

    thumbs: list[Image.Image] = []
    thumb_width = 300
    thumb_height = 620
    for image_path in images:
        image = Image.open(image_path).convert("RGB")
        image.thumbnail((thumb_width - 40, thumb_height - 70))
        card = Image.new("RGB", (thumb_width, thumb_height), "white")
        x = (thumb_width - image.width) // 2
        y = 28
        card.paste(image, (x, y))

        draw = ImageDraw.Draw(card)
        label_font = load_font(24)
        draw.text((thumb_width // 2, thumb_height - 24), image_path.stem, font=label_font, fill="#4A3C32", anchor="ms")
        thumbs.append(card)

    rows = math.ceil(len(thumbs) / columns)
    canvas = Image.new("RGB", (columns * thumb_width + (columns + 1) * 24, rows * thumb_height + (rows + 1) * 24 + 90), "#DDD7CF")
    draw = ImageDraw.Draw(canvas)
    title_font = load_font(40)
    draw.text((canvas.width // 2, 56), title, font=title_font, fill="#4A3C32", anchor="ms")

    for index, thumb in enumerate(thumbs):
        row = index // columns
        column = index % columns
        x = 24 + column * (thumb_width + 24)
        y = 90 + 24 + row * (thumb_height + 24)
        canvas.paste(thumb, (x, y))

    canvas.save(output_path, quality=100)


def render_family(root: Path, brand: dict, family_name: str, family: dict, slides: list[dict]) -> list[Path]:
    rendered: list[Path] = []
    for slide in slides:
        mode = slide.get("mode", family.get("mode", "marketing"))
        if mode == "direct":
            output = render_direct_slide(root, family, slide)
        else:
            output = render_marketing_slide(root, brand, family, slide)

        upload_path = root / family["upload_dir"] / output.name
        ensure_parent(upload_path)
        shutil.copy2(output, upload_path)
        rendered.append(output)

    contact_sheet = root / family.get("contact_sheet", f"review/{family_name}-contact-sheet.png")
    build_contact_sheet(root, f"{family_name.title()} ASO Review", contact_sheet, rendered)
    return rendered


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest).resolve()
    root = manifest_path.parent
    manifest = load_manifest(manifest_path)
    brand = manifest["brand"]
    families = manifest["families"]
    slides = manifest["slides"]

    rendered_count = 0
    for family_name, family in families.items():
        family_slides = [slide for slide in slides if slide["family"] == family_name]
        if not family_slides:
            continue
        render_family(root, brand, family_name, family, family_slides)
        rendered_count += len(family_slides)

    print(f"Rendered {rendered_count} screenshot assets from {manifest_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
