#!/bin/sh
# Rebuild the app icons and the share image from their SVG sources.
# Uses only tools that ship with macOS: qlmanage (Quick Look) renders the
# SVGs and sips resizes and crops them. Run from the repo root:
#
#   sh tools/make-images.sh
#
# Quick Look only renders square images, and centres the drawing, so the
# 1200 x 630 share image is drawn in the middle of a square and cropped.

set -e
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

render() { # render <svg> <size> -> $tmp/<name>.svg.png
  qlmanage -t -s "$2" -o "$tmp" "$1" >/dev/null 2>&1
}

render icon.svg 512
sips -z 512 512 "$tmp/icon.svg.png" --out icons/icon-512.png >/dev/null
sips -z 192 192 "$tmp/icon.svg.png" --out icons/icon-192.png >/dev/null
sips -z 180 180 "$tmp/icon.svg.png" --out icons/apple-touch-icon.png >/dev/null

render icons/icon-maskable.svg 512
sips -z 512 512 "$tmp/icon-maskable.svg.png" --out icons/icon-maskable-512.png >/dev/null

python3 - "$tmp" <<'PY'
import sys
s = open('share.svg').read()
s = s.replace('viewBox="0 0 1200 630" width="1200" height="630">',
              'viewBox="0 0 1200 1200" width="1200" height="1200"><g transform="translate(0 285)">', 1)
s = s.replace('</svg>', '</g></svg>')
open(sys.argv[1] + '/share-square.svg', 'w').write(s)
PY
render "$tmp/share-square.svg" 1200
sips -c 630 1200 --cropOffset 0 0 "$tmp/share-square.svg.png" --out share.png >/dev/null

echo "Made icons/icon-192.png, icons/icon-512.png, icons/icon-maskable-512.png, icons/apple-touch-icon.png, share.png"
