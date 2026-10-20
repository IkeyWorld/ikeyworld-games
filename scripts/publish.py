"""Publish only this site's files. Uses Git Credential Manager; never saves tokens."""
import json, os, subprocess, sys, urllib.request, urllib.error, hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OWNER, REPO = 'IkeyWorld', 'ikeyworld-games'
TAG = 'demo-v0.8.1'
ARCHIVE = ROOT / 'dist/downloads/Teatr_Zabytyh_Sudeb_v0.8.1_Windows.zip'
EXPECTED = 'c08a090b82e7677fc799fa1fe80f82d357e9967a597b522dad7f80b4a7debee6'

def git(*args):
    result = subprocess.run(['git', *args], cwd=ROOT, capture_output=True, text=True, encoding='utf-8')
    if result.returncode and not (args[:1] == ('config',) and len(args) == 2): raise RuntimeError('git ' + ' '.join(args) + ': ' + result.stderr.strip())
    return result.stdout.strip()

def main():
    if not ARCHIVE.exists() or hashlib.sha256(ARCHIVE.read_bytes()).hexdigest() != EXPECTED:
        raise RuntimeError('The verified Windows ZIP is missing or its checksum differs.')
    env = dict(os.environ, GCM_INTERACTIVE='Never', GIT_TERMINAL_PROMPT='0')
    credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', capture_output=True, text=True, env=env, timeout=20)
    values = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
    token = values.get('password')
    if not token:
        print('AUTH_REQUIRED: Sign in to GitHub through Git Credential Manager or GitHub CLI. No token was saved.'); return 2

    def api(method, path, data=None, binary=None):
        url = path if path.startswith('https://') else 'https://api.github.com' + path
        payload = binary if binary is not None else (json.dumps(data).encode() if data is not None else None)
        request = urllib.request.Request(url, data=payload, method=method, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/zip' if binary is not None else 'application/json', 'User-Agent': 'IkeyWorld-site-publisher'})
        try:
            with urllib.request.urlopen(request, timeout=180) as response:
                raw = response.read()
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as error:
            if error.code != 404:
                info = json.loads(error.read())
                print(json.dumps({'operation': method + ' ' + url, 'message': info.get('message'), 'errors': info.get('errors')}, ensure_ascii=False))
            raise

    me = api('GET', '/user')
    if me['login'].lower() != OWNER.lower(): raise RuntimeError('The signed-in GitHub account is not IkeyWorld.')
    try: repo = api('GET', f'/repos/{OWNER}/{REPO}')
    except urllib.error.HTTPError as error:
        if error.code != 404: raise
        repo = api('POST', '/user/repos', {'name': REPO, 'description': 'Каталог игр IkeyWorld · Театр забытых судеб — бесплатное демо', 'private': False, 'auto_init': False})
    if repo['owner']['login'].lower() != OWNER.lower(): raise RuntimeError('Unexpected repository owner.')
    if not (ROOT / '.git').exists(): git('init', '-b', 'main')
    if not git('config', 'user.name'): git('config', 'user.name', OWNER)
    if not git('config', 'user.email'): git('config', 'user.email', f"{me['id']}+{OWNER}@users.noreply.github.com")
    if not git('remote'): git('remote', 'add', 'origin', repo['clone_url'])
    if git('remote', 'get-url', 'origin') != repo['clone_url']: raise RuntimeError('Unexpected Git remote; refusing to push.')
    if repo.get('size', 0) == 0:
        git('add', '--all')
        if git('status', '--porcelain'): git('commit', '-m', 'Prepare IkeyWorld game catalog')
        git('push', '-u', 'origin', 'main')
    try: release = api('GET', f'/repos/{OWNER}/{REPO}/releases/tags/{TAG}')
    except urllib.error.HTTPError as error:
        if error.code != 404: raise
        release = api('POST', f'/repos/{OWNER}/{REPO}/releases', {'tag_name': TAG, 'name': 'Театр забытых судеб · демо 0.8.1', 'body': 'Бесплатная демоверсия для Windows 64 бит.\n\nРаспакуйте архив целиком и запустите TeatrZabytyhSudeb.exe. Файл .pck должен остаться рядом.\n\n20 историй, четыре главы, русский язык.\n\nSHA-256: `' + EXPECTED + '`', 'draft': False, 'prerelease': True})
    asset = next((a for a in release['assets'] if a['name'] == ARCHIVE.name), None)
    if not asset:
        url = release['upload_url'].split('{')[0] + '?name=' + ARCHIVE.name
        asset = api('POST', url, binary=ARCHIVE.read_bytes())
    if asset['size'] != ARCHIVE.stat().st_size: raise RuntimeError('Release asset has the wrong size.')
    local = 'downloads/' + ARCHIVE.name
    remote = asset['browser_download_url']
    for file in ['dist/index.html', 'dist/catalog.js']:
        path = ROOT / file
        path.write_text(path.read_text(encoding='utf-8').replace(local, remote), encoding='utf-8')
    if not (ROOT / '.git').exists(): git('init', '-b', 'main')
    if not git('config', 'user.name'): git('config', 'user.name', OWNER)
    if not git('config', 'user.email'): git('config', 'user.email', f"{me['id']}+{OWNER}@users.noreply.github.com")
    if not git('remote'): git('remote', 'add', 'origin', repo['clone_url'])
    if git('remote', 'get-url', 'origin') != repo['clone_url']: raise RuntimeError('Unexpected Git remote; refusing to push.')
    git('add', '--all')
    if git('status', '--porcelain'): git('commit', '-m', 'Build IkeyWorld game catalog and Windows demo download')
    git('push', '-u', 'origin', 'main')
    try: pages = api('GET', f'/repos/{OWNER}/{REPO}/pages')
    except urllib.error.HTTPError as error:
        if error.code != 404: raise
        pages = api('POST', f'/repos/{OWNER}/{REPO}/pages', {'build_type': 'workflow'})
    if pages.get('build_type') != 'workflow': api('PUT', f'/repos/{OWNER}/{REPO}/pages', {'build_type': 'workflow'})
    print(json.dumps({'repository': repo['html_url'], 'release': release['html_url'], 'download': remote, 'site': pages.get('html_url', f'https://{OWNER}.github.io/{REPO}/')}, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    try: sys.exit(main())
    except Exception as error:
        # HTTP error strings contain status and URL only, never Authorization headers.
        print(type(error).__name__ + ': ' + str(error)); sys.exit(1)
