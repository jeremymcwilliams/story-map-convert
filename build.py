#!/usr/bin/env python3
"""Crosswalk the retired ArcGIS Map Journal export (data.json) into content.json
consumed by the static rebuild (index.html / app.js). Rewrites every
arcgis.com resource URL to a local media/ path so the site has no external
dependency other than the live ArcGIS web map embed."""
import json
import re
import urllib.parse

ITEM_ID = "4ff73663758342d8a3258b3c4745235a"
RESOURCE_PREFIX = f"https://www.arcgis.com/sharing/rest/content/items/{ITEM_ID}/resources/"


def localize(html_or_url):
    def repl(match):
        fname = urllib.parse.unquote(match.group(1))
        return f"media/{fname}"

    pattern = re.escape(RESOURCE_PREFIX) + r"([^\"'\s)]+)"
    return re.sub(pattern, repl, html_or_url)


def main():
    with open("data.json") as f:
        raw = json.load(f)
    v = raw["values"]

    out = {
        "title": v["title"].strip(),
        "header": {
            "linkText": v["settings"]["header"]["linkText"],
            "linkURL": v["settings"]["header"]["linkURL"],
            "logoURL": localize(v["settings"]["header"]["logoURL"]),
            "logoTarget": v["settings"]["header"]["logoTarget"],
        },
        "theme": v["settings"]["theme"]["colors"],
        "webmapId": None,
        "sections": [],
    }

    for s in v["story"]["sections"]:
        media = s.get("media", {})
        mtype = media.get("type")
        section = {
            "title": localize(s["title"]),
            "content": localize(s["content"]),
            "mediaType": mtype,
        }
        if mtype == "webmap":
            wm = media["webmap"]
            section["extent"] = wm["extent"]
            if out["webmapId"] is None:
                out["webmapId"] = wm["id"]
        elif mtype == "image":
            img = media["image"]
            section["image"] = localize(img["url"])
            section["imageAlt"] = img.get("altText", "")
        out["sections"].append(section)

    with open("content.json", "w") as f:
        json.dump(out, f, indent=2)

    print(f"Wrote content.json: {len(out['sections'])} sections, webmap {out['webmapId']}")


if __name__ == "__main__":
    main()
