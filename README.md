# Create Hex Overlay

**Create Hex Overlay** is a Python script that draws a hexagon overlay over an input image (e.g., a map), letting you easily generate flat‑topped hex grids for tabletop roleplaying hexcrawls.

## Background Information About This Tool

Create hex overlay is a Python script which draws a hexagon overlay over the input image.

Plainly: it draws a hex grid over your map.

A critical input is the pixels per mile. If your map has a superimposed distance scale ruler, you can open it in a photo editing or viewing tool and use the ruler or selection tools to determine exactly how many pixels there are on the scale icon.

Once you know how many pixels there are per mile, the tool can calculate exactly how many pixels there are for your desired hexagon size.

The tool defaults to 6 mile hexagons but other common hexagons are 3 mile hexagons, 2 mile hexagons and 30 mile hexagons.

You want to choose your hexagon size for the intent of your map. If your party of travelers can travel about 30 miles a day, and you don't want to make multiple dice rolls for a days travel, then 30 miles hexagons might make sense.

I'm trying to run a more survival and exploration focused game, so I will be using 6 mile hexes, and that's the default for the program.

An example output can be found in the assets directory.

**Pro Tip:** Use an AI image upscaling service to increase the resolution of your map! I used https://letsenhance.io/ to _quadruple_ my map's resolution!

## How it works

1. You supply an image (e.g. a map) with a known **pixels‑per‑mile** scale.
2. The script computes the pixel radius for your chosen hex size (default **6 miles**).
3. It draws a flat‑topped hex grid over the image and writes out `*_hexed.*` in the same folder.

## Prerequisites

* **Python 3.6+** installed.
* The `venv` module (bundled with modern Python).

### Installing `venv` (if missing)

* **Debian/Ubuntu:**

  ```bash
  sudo apt update && sudo apt install python3-venv
  ```

* **CentOS/Fedora:**

  ```bash
  sudo dnf install python3-venv
  ```

* **macOS (Homebrew):**

  ```bash
  brew install python
  ```

## Setup

From the project root:

1. **Create** a new virtual environment named `venv`:

   ```bash
   python3 -m venv venv
   ```
2. **Activate** it:

    * **macOS/Linux:**

      ```bash
      source venv/bin/activate
      ```
    * **Windows (PowerShell):**

      ```powershell
      .\venv\Scripts\Activate.ps1
      ```
    * **Windows (CMD):**

      ```cmd
      venv\\Scripts\\activate.bat
      ```
3. **Install** dependencies from the top‑level `requirements.txt`:

   ```bash
   pip install -r requirements.txt
   ```

## Usage Examples

* **Basic** (6‑mile hexes, default 22.56 px/mi, black outline):

  ```bash
  (venv) $ python src/create_hex_overlay.py assets/moonshae_isles_x4_upscaled.JPG
  → Loading image: assets/moonshae_isles_x4_upscaled.JPG
  → Applying 6.0-mile hex grid at 22.56 px/mi, outline=black...
  → Saving overlaid image to: assets/moonshae_isles_x4_upscaled_hexed.JPG
  ✅ Done!
  ```

* **Custom hex size, px/mi, outline color:**

  ```bash
  (venv) $ python src/create_hex_overlay.py assets/map.png --hex-miles 2 --ppm 30 --outline red
  ```

* **Dry run** (no output file—just count hexes):

  ```bash
  (venv) $ python src/create_hex_overlay.py assets/map.png --dry-run
  # Dry run: image size 2000×1500, 22.56 px/mi, 6.0 mi hex → 400 hexagons would be drawn.
  ```

---

For full options and flags, run:

```bash
(venv) $ python src/create_hex_overlay.py --help
```
