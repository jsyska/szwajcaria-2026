#!/usr/bin/env python3
"""
Build script: enriches trip-data.json with Wikipedia thumbnails and verified
links, then writes the final data.json consumed by the static site.
Run once locally (`python build.py`) whenever trip-data.json changes.
Does NOT run in the browser - no live requests happen when visitors load the page.
"""
import json
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "trip-data.json"
DEST = ROOT / "data.json"

WIKI_API = "https://en.wikipedia.org/api/rest_v1/page/summary/{}"
HEADERS = {"User-Agent": "TripPlanBaselBuildScript/1.0 (personal trip site build tool)"}

# (day_id, stop index) -> list of Wikipedia page titles to try, in order
WIKI_LOOKUPS = {
    ("day1", 2): ["Staubbach_Falls"],
    ("day1", 5): ["Kandersteg"],
    ("day1", 6): ["Oeschinen_Lake"],
    ("day2", 3): ["First_(Grindelwald)"],
    ("day2", 4): ["First_Cliff_Walk"],
    ("day2", 5): ["Bachalpsee"],
    ("day2", 8): ["Iseltwald"],
    ("day2", 10): ["Giessbachbahn"],
    ("day3", 2): ["Lucerne"],
    ("day3", 4): ["Z\u00fcrich"],
    ("day3", 6): ["Basel"],
}

# Links verified by hand against the official sites (see chat/build notes)
LINK_OVERRIDES = {
    ("day3", 2): "https://www.luzern.com/en/",
    ("day3", 4): "https://www.zuerich.com/en",
}

# Pure logistics stops (airport / check-in-out / drives / breaks) never get a photo or placeholder card
LOGISTICS_ONLY = {
    ("day1", 0),
    ("day1", 1),
    ("day1", 3),
    ("day1", 4),
    ("day1", 7),
    ("day1", 8),
    ("day2", 0),
    ("day2", 1),
    ("day2", 2),
    ("day2", 6),
    ("day2", 7),
    ("day2", 9),
    ("day2", 11),
    ("day3", 0),
    ("day3", 1),
    ("day3", 3),
    ("day3", 5),
    ("day3", 7),
    ("day3", 8),
    ("day4", 0),
    ("day4", 1),
    ("day4", 2),
}

# Purchased-ticket photos (e.g. boarding pass QR screenshots) attached to a specific stop
TICKET_IMAGES = {
    ("day1", 5): "bilet-oeschinese.jpg",
}


def fetch_wiki_image(titles):
    for title in titles:
        url = WIKI_API.format(urllib.parse.quote(title, safe=""))
        req = urllib.request.Request(url, headers=HEADERS)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.load(resp)
        except (urllib.error.HTTPError, urllib.error.URLError):
            continue
        thumb = data.get("thumbnail", {}).get("source")
        original = data.get("originalimage", {}).get("source")
        image = thumb or original
        if image:
            return {
                "source": image,
                "page_url": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
            }
    return None


def main():
    trip = json.loads(SRC.read_text(encoding="utf-8"))

    for day in trip["days"]:
        day_id = day["id"]
        for idx, stop in enumerate(day["stops"]):
            key = (day_id, idx)
            if key in LINK_OVERRIDES:
                stop["link"] = LINK_OVERRIDES[key]
            if key in LOGISTICS_ONLY:
                stop["skip_photo"] = True
            if key in TICKET_IMAGES:
                stop["ticket_image"] = TICKET_IMAGES[key]
            if key in WIKI_LOOKUPS:
                image = fetch_wiki_image(WIKI_LOOKUPS[key])
                if image:
                    stop["image"] = image["source"]
                    print(f"[ok]   {day_id} stop {idx} ({stop['name']}) -> image found")
                else:
                    print(f"[miss] {day_id} stop {idx} ({stop['name']}) -> no image, using placeholder card")

    DEST.write_text(json.dumps(trip, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote {DEST}")


if __name__ == "__main__":
    main()
