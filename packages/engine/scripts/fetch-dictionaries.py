"""Refresh public name/word lists; downloads data only, never executes it."""
import ast
import io
import json
from pathlib import Path
import urllib.request
import zipfile
import urllib.error

ROOT = Path(__file__).resolve().parents[1] / 'src' / 'data'
def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()

try:
    archive = zipfile.ZipFile(io.BytesIO(fetch('https://www.ssa.gov/oact/babynames/names.zip')))
except urllib.error.HTTPError:
    archive = None
names = set()
for year in (1980, 1990, 2000, 2010, 2020):
    data = archive.read(f'yob{year}.txt') if archive else fetch(f'https://raw.githubusercontent.com/hackerb9/ssa-baby-names/main/raw-data/yob{year}.txt')
    for row in data.decode().splitlines():
        name, _, count = row.split(',')
        if int(count) >= 100 and len(name) >= 3:
            names.add(name.lower())
source = fetch('https://raw.githubusercontent.com/joke2k/faker/master/faker/providers/person/en_IN/__init__.py').decode()
tree = ast.parse(source)
for node in ast.walk(tree):
    if isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('first_names_male', 'first_names_female') for t in node.targets):
        names.update(s.lower() for s in ast.literal_eval(node.value) if len(s) >= 3 and s.isalpha())
words = fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english.txt').decode().splitlines()
ROOT.mkdir(parents=True, exist_ok=True)
(ROOT / 'first-names.json').write_text(json.dumps(sorted(names), ensure_ascii=False), encoding='utf-8')
(ROOT / 'common-words.json').write_text(json.dumps(words), encoding='utf-8')
(ROOT / 'faker-LICENSE.txt').write_bytes(fetch('https://raw.githubusercontent.com/joke2k/faker/master/LICENSE.txt'))
(ROOT / 'common-words-LICENSE.md').write_bytes(fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/master/LICENSE.md'))
print(f'Saved {len(names)} first names and {len(words)} common words')
