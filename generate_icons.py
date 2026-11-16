import os
import subprocess
from PIL import Image, ImageDraw

html_content = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body, html {
    margin: 0;
    padding: 0;
    width: 512px;
    height: 512px;
    overflow: hidden;
    background: transparent;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  svg {
    width: 512px;
    height: 512px;
  }
</style>
</head>
<body>
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tf-brand-gradient" x1="10%" y1="10%" x2="90%" y2="90%">
        <stop offset="0%" stop-color="#38BDF8" />
        <stop offset="45%" stop-color="#2563EB" />
        <stop offset="100%" stop-color="#7C3AED" />
      </linearGradient>
      <linearGradient id="tf-shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.35" />
        <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0" />
        <stop offset="100%" stop-color="#000000" stop-opacity="0.2" />
      </linearGradient>
      <filter id="tf-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1.5" dy="3" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.35" />
      </filter>
    </defs>
    <circle cx="50" cy="50" r="48" fill="url(#tf-brand-gradient)" />
    <circle cx="50" cy="50" r="48" fill="url(#tf-shimmer-gradient)" />
    <g filter="url(#tf-shadow)">
      <path 
        d="M 28 29 C 26.5 29 25.5 30 26 31.5 L 27.5 36.5 C 28 38 29.2 39 30.5 39 L 44.5 39 L 34.5 67 C 33.8 69 34.8 71 36.8 71 L 43.5 71 C 45.2 71 46.5 69.8 47.2 68 L 57 39 L 70.5 39 C 72 39 73 38 72.5 36.5 L 71 31.5 C 70.5 30 69.2 29 67.8 29 Z" 
        fill="#FFFFFF" 
      />
      <path 
        d="M 47.5 48 C 46.2 48 45.2 49 45.5 50.3 L 46.5 54.5 C 46.8 55.8 48 57 49.3 57 L 66 57 C 67.8 57 69 55.8 69.5 54 L 70.2 51 C 70.5 49.5 69.5 48 67.8 48 Z" 
        fill="#FFFFFF"
        fill-opacity="0.95"
      />
    </g>
  </svg>
</body>
</html>
"""

with open("temp_icon.html", "w", encoding="utf-8") as f:
    f.write(html_content)

edge_path = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
cwd = os.path.abspath(os.getcwd())
temp_html = os.path.join(cwd, "temp_icon.html")
out_png = os.path.join(cwd, "tradeforge_logo_512.png")

cmd = [
    edge_path,
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=512,512",
    f"--screenshot={out_png}",
    f"file:///{temp_html}"
]

subprocess.run(cmd, check=True)

# Generate Android mipmaps
base_img = Image.open(out_png).convert("RGBA")

densities = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

res_dir = r"android-app\app\src\main\res"

for folder, size in densities.items():
    folder_path = os.path.join(res_dir, folder)
    os.makedirs(folder_path, exist_ok=True)
    
    # Standard square / squircle icon
    resized = base_img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(os.path.join(folder_path, "ic_launcher.png"))
    
    # Round icon (circular crop)
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size - 1, size - 1), fill=255)
    round_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    round_img.paste(resized, (0, 0), mask=mask)
    round_img.save(os.path.join(folder_path, "ic_launcher_round.png"))

print("Successfully generated all Android app icons!")

