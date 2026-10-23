"""Lightweight static site checks for PunkPort."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.urls = []
        self.images = []
    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if attr.get("id"):
            self.ids.append(attr["id"])
        for field in ("href", "src"):
            if attr.get(field):
                self.urls.append(attr[field])
        if tag == "img":
            self.images.append(attr)

page = (DIST / "index.html").read_text(encoding="utf8")
parsed = Parser()
parsed.feed(page)
errors = []
for url in parsed.urls:
    parts = urlparse(url)
    if parts.scheme or url.startswith("//") or url.startswith("#") or url.startswith("mailto:"):
        if parts.fragment and not parts.path and parts.fragment not in parsed.ids and parts.fragment not in {"favorites"}:
            errors.append("Missing anchor: " + url)
        continue
    if parts.path:
        file = (DIST / unquote(parts.path)).resolve()
        if not file.is_relative_to(DIST.resolve()) or not file.is_file():
            errors.append("Missing local resource: " + url)
for image in parsed.images:
    if "alt" not in image:
        errors.append("Image missing alt attribute: " + repr(image))
if len(parsed.ids) != len(set(parsed.ids)):
    errors.append("Duplicate id in HTML")
if '<html lang="ru">' not in page:
    errors.append("Set Russian page language")
if "Театр забытых судеб" in "".join(p.read_text(encoding="utf8",errors="ignore") for p in DIST.rglob("*") if p.is_file()):
    errors.append("Removed game's content still present")
for name in ("index.html", "style.css", "catalog.js", "app.js", "assets/favicon.svg", "assets/social.svg", ".nojekyll"):
    if not (DIST / name).is_file():
        errors.append("Missing required file: " + name)
catalog = (DIST / "catalog.js").read_text(encoding="utf8")
for field in ("window.PUNKPORT_GAMES", "status:", "download:"):
    if field not in catalog:
        errors.append("Missing catalog field: " + field)
if not errors:
    print(f"PASS PunkPort — {len(parsed.ids)} ids, {len(parsed.urls)} references, {len(list(DIST.rglob('*')))} assets/directories")
else:
    print("\n".join("FAIL " + error for error in errors), file=sys.stderr)
    raise SystemExit(1)
