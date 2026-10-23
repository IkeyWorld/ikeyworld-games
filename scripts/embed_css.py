"""Inline site CSS into HTML for reliable rendering in restrictive browsers.
Keep dist/style.css as the single editable source and reproduce the same published HTML.
"""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[1] / "dist"
html = root / "index.html"
css = (root / "style.css").read_text(encoding="utf-8")
content = html.read_text(encoding="utf-8")
block = '<style id="punkport-styles">\n' + css + '\n</style>'
pattern = re.compile(r'<style id="punkport-styles">.*?</style>', re.DOTALL)
if not pattern.search(content):
    raise SystemExit("FAIL: inline CSS block not found")
content = pattern.sub(lambda _: block, content, count=1)
html.write_text(content, encoding="utf-8")
print("Inlined CSS into PunkPort HTML:",len(css),"characters")
