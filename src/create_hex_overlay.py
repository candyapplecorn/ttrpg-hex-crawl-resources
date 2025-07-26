#!/usr/bin/env python3
import argparse
import os
import sys
import math
from PIL import Image, ImageDraw

def count_hexes(width, height, pixels_per_mile, hex_miles):
    hex_radius = pixels_per_mile * hex_miles
    hex_height = math.sqrt(3) * hex_radius
    hex_width = 2 * hex_radius
    h_spacing = 0.75 * hex_width
    v_spacing = hex_height

    count = 0
    row = 0
    y = 0.0
    while y < height + v_spacing:
        x_offset = 0 if (row % 2 == 0) else h_spacing / 2
        x = x_offset
        while x < width + h_spacing:
            count += 1
            x += h_spacing
        y += v_spacing
        row += 1
    return count

def overlay_hex_grid(img, pixels_per_mile, hex_miles, outline_color):
    draw = ImageDraw.Draw(img)
    width, height = img.size

    hex_radius = pixels_per_mile * hex_miles
    hex_height = math.sqrt(3) * hex_radius
    hex_width = 2 * hex_radius
    h_spacing = 0.75 * hex_width
    v_spacing = hex_height

    row = 0 - 1
    y = 0.0 - v_spacing / 2
    while y < height + v_spacing:
        x = 0
        y_offset = 0 if (y % 2 == 0) else v_spacing / 2
        half_height_offset_counter = 0
        while x < width + h_spacing:
            half_height_offset_counter += 1
            points = []
            for angle in range(0, 360, 60):
                theta = math.radians(angle)
                px = x + hex_radius * math.cos(theta)
                py = y_offset + y + hex_radius * math.sin(theta) + (
                    hex_height / 2 if half_height_offset_counter % 2 == 0 else 0
                )
                points.append((int(px), int(py)))
            draw.polygon(points, outline=outline_color)
            x += h_spacing
        y += v_spacing
        row += 1

    return img


def main():
    p = argparse.ArgumentParser(
        description=(
            "Overlay a hexagonal grid on a map image for tabletop roleplaying hexcrawls."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""Examples:
  # Default 6-mile black-outline grid:
  hexgrid.py map.png

  # 2-mile hexes at 30 px/mi, red outline:
  hexgrid.py map.jpg --ppm 30 --hex-miles 2 --outline red

  # Dry-run only (no image written):
  hexgrid.py map.png --dry-run
""",
    )
    p.add_argument(
        "image",
        help="Path to input image (e.g. .jpg, .png)"
    )
    p.add_argument(
        "--ppm",
        type=float,
        default=22.56,
        help="Pixels per mile (default: 22.56)"
    )
    p.add_argument(
        "--hex-miles",
        type=float,
        default=6.0,
        help="Hex radius in miles (default: 6)"
    )
    p.add_argument(
        "--outline",
        default="black",
        help="Outline color for hexes (default: black)"
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print how many hexes would be drawn and exit"
    )
    args = p.parse_args()

    # Load image (we need size even for dry-run)
    try:
        img = Image.open(args.image)
    except Exception as e:
        print(f"❌ Error loading image: {e}", file=sys.stderr)
        sys.exit(1)

    width, height = img.size

    if args.dry_run:
        total = count_hexes(width, height, args.ppm, args.hex_miles)
        print(
            f"Dry run: image size {width}×{height}, "
            f"{args.ppm:.2f} px/mi, {args.hex_miles:.1f} mi hex → "
            f"{total} hexagons would be drawn."
        )
        sys.exit(0)

    out_path = os.path.splitext(args.image)[0] + "_hexed" + os.path.splitext(args.image)[1]

    print(f"→ Loading image: {args.image}")
    print(
        f"→ Applying {args.hex_miles:.1f}-mile hex grid at "
        f"{args.ppm:.2f} px/mi, outline={args.outline}..."
    )
    result = overlay_hex_grid(img, args.ppm, args.hex_miles, args.outline)
    print(f"→ Saving overlaid image to: {out_path}")
    result.save(out_path)
    print("✅ Done!")

if __name__ == "__main__":
    main()
