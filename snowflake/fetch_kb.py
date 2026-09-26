"""Download official AI-tool policy pages listed in sources.json. Review extracted text before upload."""
import json
import re
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup
from load_kb import DOMAINS
from urllib.parse import urlparse
ROOT=Path(__file__).resolve().parent

def main():
    sources=json.loads((ROOT/"sources.json").read_text())
    failed=0
    for entry in sources:
        try:
            response=requests.get(entry["url"],timeout=30,headers={"User-Agent":"PromptShieldPolicyCollector/1.0"})
            response.raise_for_status()
            host=urlparse(response.url).hostname or ""
            if not any(host==d or host.endswith("."+d) for d in DOMAINS[entry["tool"]]):
                raise ValueError("Unexpected redirect")
            soup=BeautifulSoup(response.text,"html.parser")
            for element in soup.select("script, style, nav, header, footer, form, aside"):
                element.decompose()
            body=soup.select_one("article") or soup.select_one("main")
            if body is None:
                raise ValueError("No article body")
            text=body.get_text("\n",strip=True)
            # Rejoin sentences that inline links split across lines.
            text=re.sub(r" +([.,;:!?)\]’])",r"\1",re.sub(r"\n(?=[a-z.,;:!?)\]’])"," ",text))
            if len(text)<300 or "verify you are human" in text.lower():
                raise ValueError("No readable policy")
            title=soup.title.get_text(strip=True) if soup.title else entry["title"]
            dest=ROOT/"kb"/entry["tool"]/f'{entry["slug"]}.txt'
            dest.parent.mkdir(parents=True,exist_ok=True)
            dest.write_text(f'URL: {response.url}\nTITLE: {title}\nRETRIEVED: {datetime.now(timezone.utc).isoformat()}\n\n{text}\n')
            print(f'{entry["tool"]}/{entry["slug"]}: fetched; review before upload')
        except Exception:
            failed+=1
            print(f'{entry["tool"]}/{entry["slug"]}: fetch failed; existing file preserved')
    raise SystemExit(1 if failed else 0)

if __name__=="__main__":main()
