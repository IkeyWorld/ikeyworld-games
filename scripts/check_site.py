"""Check static resources and anchors without dependencies or executing site code."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse, unquote
import re

ROOT = Path(__file__).resolve().parents[1] / 'dist'
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.urls = []; self.ids = set(); self.images = []
    def handle_starttag(self, tag, attrs):
        attr = dict(attrs)
        if 'id' in attr: self.ids.add(attr['id'])
        for key in ['href', 'src', 'data-image']:
            if attr.get(key): self.urls.append(attr[key])
        if tag == 'img': self.images.append(attr)

page = Page(); page.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
errors = []
for url in page.urls:
    parsed = urlparse(url)
    if parsed.scheme: continue
    if parsed.path:
        target = (ROOT / unquote(parsed.path)).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file(): errors.append('Missing resource: ' + url)
    if parsed.fragment and parsed.fragment not in page.ids: errors.append('Missing anchor: ' + url)
for image in page.images:
    if 'alt' not in image: errors.append('Missing image description')
for asset in re.findall(r"url\(['\"]?([^)'\"]+)", (ROOT / 'style.css').read_text(encoding='utf-8')):
    if not (ROOT / asset).is_file(): errors.append('Missing CSS resource: ' + asset)
catalog = (ROOT / 'catalog.js').read_text(encoding='utf-8')
for path in re.findall(r"(?:image|download):\s*'([^']+)'", catalog):
    if not urlparse(path).scheme and not (ROOT / path).is_file(): errors.append('Missing catalog asset: ' + path)
assert not errors, '\n'.join(errors)
assert len(page.ids) == len(set(page.ids))
assert 'lang="ru"' in (ROOT / 'index.html').read_text(encoding='utf-8')
print(f'PASS: {len(page.urls)} resources/links, {len(page.images)} accessible images, all CSS and catalog paths.')
