#!/usr/bin/env python3
"""Scrape Forza Horizon 6 car data from forza.fandom.com via MediaWiki API."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, asdict
from html import unescape
from pathlib import Path
from typing import Any

API = "https://forza.fandom.com/api.php"
UA = "ForzaEventsResearch/1.0 (local spreadsheet; contact: dev)"

RARITY = {
    "c": "Common",
    "common": "Common",
    "r": "Rare",
    "rare": "Rare",
    "e": "Epic",
    "epic": "Epic",
    "l": "Legendary",
    "leg": "Legendary",
    "legendary": "Legendary",
    "b": "Barn Find",
    "barn": "Barn Find",
    "barnfind": "Barn Find",
    "tr": "Treasure Car",
    "treasure": "Treasure Car",
    "h": "Forza Edition",
    "fe": "Forza Edition",
    "forza": "Forza Edition",
    "hor": "Forza Edition",
    "horizon": "Forza Edition",
}

UNLOCK = {
    "auto": "Autoshow",
    "w": "Wristband reward",
    "whw": "Wheelspin + Wristband",
    "wh": "Wheelspin",
    "barn": "Barn Find",
    "treasure": "Treasure Car",
    "cm": "Car Mastery",
    "htf": "Hard to Find",
    "awh": "Autoshow, Wheelspin",
    "as": "Autoshow, Prologue",
    "awhs": "Autoshow, Wheelspin, Prologue",
    "ay": "Autoshow, Yellow Wristband",
    "awhy": "Autoshow, Wheelspin, Yellow Wristband",
    "awhl": "Autoshow, Wheelspin, Loyalty Reward",
    "af": "Aftermarket Car",
    "aaf": "Autoshow, Aftermarket Car",
    "awhaf": "Autoshow, Wheelspin, Aftermarket Car",
    "j": "Collection Journal",
    "aj": "Autoshow, Collection Journal",
    "whj": "Wheelspin, Collection Journal",
    "awhj": "Autoshow, Wheelspin, Collection Journal",
    "aafj": "Autoshow, Aftermarket, Collection Journal",
    "whafj": "Wheelspin, Aftermarket, Collection Journal",
    "awhafj": "Autoshow, Wheelspin, Aftermarket, Collection Journal",
    "pass": "Car Pass (DLC)",
    "wtac": "Time Attack Car Pack (DLC)",
    "ita": "Italian Passion Car Pack (DLC)",
    "wp": "Welcome Pack (DLC)",
    "vip": "VIP Membership (DLC)",
    "preorder": "Pre-order (DLC)",
    "promo": "Promotional",
    "apromo": "Autoshow (Promotional)",
    "un": "Unobtainable",
}

COUNTRY = {
    "ast": "Australia",
    "oz": "Australia",
    "australia": "Australia",
    "aus": "Austria",
    "austria": "Austria",
    "can": "Canada",
    "canada": "Canada",
    "ch": "China",
    "china": "China",
    "cro": "Croatia",
    "croatia": "Croatia",
    "den": "Denmark",
    "denmark": "Denmark",
    "fr": "France",
    "fra": "France",
    "france": "France",
    "ger": "Germany",
    "germany": "Germany",
    "it": "Italy",
    "ita": "Italy",
    "italy": "Italy",
    "jp": "Japan",
    "jpn": "Japan",
    "japan": "Japan",
    "kor": "South Korea",
    "korea": "South Korea",
    "mx": "Mexico",
    "mex": "Mexico",
    "mexico": "Mexico",
    "net": "Netherlands",
    "netherlands": "Netherlands",
    "spn": "Spain",
    "spain": "Spain",
    "swe": "Sweden",
    "sweden": "Sweden",
    "uae": "UAE",
    "uk": "United Kingdom",
    "us": "United States",
    "usa": "United States",
}

LAYOUT = {
    "ff": "FWD",
    "fr": "RWD",
    "rr": "RWD",
    "awd": "AWD",
    "mr": "MR",
    "mf": "MF",
}


def api_get(params: dict[str, str]) -> dict[str, Any]:
    q = {"format": "json", **params}
    url = API + "?" + urllib.parse.urlencode(q)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def split_template_args(raw: str) -> list[str]:
    parts: list[str] = []
    cur: list[str] = []
    depth = 0
    for ch in raw:
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
        elif ch == "|" and depth == 0:
            parts.append("".join(cur).strip())
            cur = []
            continue
        cur.append(ch)
    parts.append("".join(cur).strip())
    return parts


def parse_named(args: list[str]) -> tuple[list[str], dict[str, str]]:
    positional: list[str] = []
    named: dict[str, str] = {}
    for a in args:
        if "=" in a and not a.startswith("="):
            k, v = a.split("=", 1)
            named[k.strip().lower()] = v.strip()
        else:
            positional.append(a)
    return positional, named


@dataclass
class ListRow:
    wiki_title: str
    wiki_url: str
    vehicle: str
    display_name: str
    year: str
    rarity: str
    value_cr: str
    unlock_code: str
    unlock: str
    speed: str
    handling: str
    acceleration: str
    launch: str
    braking: str
    offroad: str
    pi: str
    country_code: str
    country: str
    unlock_extra: str


def parse_car_list_stats(raw: str, wiki_slug: str) -> ListRow:
    args = split_template_args(raw)
    pos, named = parse_named(args)
    while len(pos) < 14:
        pos.append("")
    vehicle = pos[0]
    display = pos[1] or vehicle
    year = pos[2]
    rarity_raw = pos[3].lower()
    value = pos[4].replace(",", "")
    unlock_code = pos[5].lower()
    stats = pos[6:12]
    pi = pos[12] if len(pos) > 12 else ""
    country_code = pos[13].lower() if len(pos) > 13 else ""
    extras = []
    for key in ("band", "barn", "treasure", "cm", "location", "points", "cat", "promo"):
        if key in named:
            extras.append(f"{key}={named[key]}")
    title = wiki_slug.replace("_", " ")
    return ListRow(
        wiki_title=title,
        wiki_url=f"https://forza.fandom.com/wiki/{wiki_slug}",
        vehicle=vehicle,
        display_name=display,
        year=year,
        rarity=RARITY.get(rarity_raw, rarity_raw or ""),
        value_cr=value,
        unlock_code=unlock_code,
        unlock=UNLOCK.get(unlock_code, unlock_code or ""),
        speed=stats[0] if len(stats) > 0 else "",
        handling=stats[1] if len(stats) > 1 else "",
        acceleration=stats[2] if len(stats) > 2 else "",
        launch=stats[3] if len(stats) > 3 else "",
        braking=stats[4] if len(stats) > 4 else "",
        offroad=stats[5] if len(stats) > 5 else "",
        pi=pi,
        country_code=country_code,
        country=COUNTRY.get(country_code, country_code),
        unlock_extra="; ".join(extras),
    )


def extract_car_slugs_from_html(html: str) -> list[str]:
    # First column vehicle links in sortable table (skip header/nav links)
    pattern = re.compile(
        r'<td[^>]*style="text-align: left[^"]*"[^>]*>.*?href="/wiki/([^"#]+)"',
        re.DOTALL | re.IGNORECASE,
    )
    slugs: list[str] = []
    seen: set[str] = set()
    for m in pattern.finditer(html):
        slug = unescape(m.group(1))
        if slug.startswith("Forza_Horizon") or slug.startswith("Category:"):
            continue
        if slug in seen:
            continue
        seen.add(slug)
        slugs.append(slug)
    return slugs


def parse_car_infobox(wt: str) -> dict[str, str]:
    m = re.search(r"\{\{CarInfobox\s*\n(.*?)\n\}\}", wt, re.DOTALL | re.IGNORECASE)
    if not m:
        return {}
    body = m.group(1)
    out: dict[str, str] = {}
    for line in body.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        line = line.lstrip("|").strip()
        if "|" in line and "=" in line.split("|", 1)[0]:
            line = line.split("|", 1)[0].strip()
        if "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip().lower()
        v = re.sub(r"<[^>]+>", "", v).strip()
        v = re.sub(r"\{\{[^}]+\}\}", "", v).strip()
        out[k] = v
    return out


def parse_fh6_car_stats(wt: str) -> dict[str, str]:
    m = re.search(r"\{\{CarStats\|fh6\s*\n(.*?)\n\}\}", wt, re.DOTALL | re.IGNORECASE)
    if not m:
        # inline variant
        m = re.search(r"\{\{CarStats\|fh6\|([^}]+)\}\}", wt, re.IGNORECASE)
        if not m:
            return {}
        chunk = m.group(1)
    else:
        chunk = m.group(1)
    lines = [ln.strip() for ln in chunk.split("|") if ln.strip()]
    # first line may be ratings: 6.8|5.9|...
    ratings = lines[0].split("|") if lines else []
    out: dict[str, str] = {}
    if len(ratings) >= 7:
        out.update(
            {
                "page_speed": ratings[0],
                "page_handling": ratings[1],
                "page_acceleration": ratings[2],
                "page_launch": ratings[3],
                "page_braking": ratings[4],
                "page_offroad": ratings[5],
                "page_pi": ratings[6],
            }
        )
    for part in lines[1:]:
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip().lower()] = v.strip()
    return out


def parse_manufacturer_nav(wt: str) -> str:
    m = re.search(r"\{\{(\w+)Nav\}\}", wt)
    return m.group(1) if m else ""


def fetch_wikitext_batch(titles: list[str]) -> dict[str, str]:
    result: dict[str, str] = {}
    for i in range(0, len(titles), 40):
        batch = titles[i : i + 40]
        data = api_get(
            {
                "action": "query",
                "prop": "revisions",
                "rvprop": "content",
                "rvslots": "main",
                "titles": "|".join(batch),
            }
        )
        pages = data.get("query", {}).get("pages", {})
        for page in pages.values():
            if "missing" in page:
                continue
            title = page.get("title", "")
            revs = page.get("revisions") or []
            if not revs:
                continue
            content = revs[0].get("slots", {}).get("main", {}).get("*") or revs[0].get("*", "")
            result[title] = content
        time.sleep(0.35)
    return result


def main() -> None:
    print("Fetching index page...")
    index = api_get(
        {"action": "parse", "page": "Forza_Horizon_6/Cars", "prop": "wikitext|text"}
    )
    wt = index["parse"]["wikitext"]["*"]
    html = index["parse"]["text"]["*"]

    templates = re.findall(r"\{\{CarListStatsFH6\|([^}]+)\}\}", wt)
    slugs = extract_car_slugs_from_html(html)
    print(f"Templates: {len(templates)}, HTML slugs: {len(slugs)}")

    if len(slugs) != len(templates):
        # fallback: derive slug from vehicle name
        print("WARNING: slug/template count mismatch; pairing by index (min length)")
    titles_for_fetch: list[str] = []
    list_rows: list[ListRow] = []
    for i in range(len(templates)):
        vehicle = templates[i].split("|", 1)[0].strip()
        slug = vehicle.replace(" ", "_")
        if i < len(slugs) and slugs[i].replace("_", " ").lower() == vehicle.lower():
            slug = slugs[i]
        row = parse_car_list_stats(templates[i], slug)
        list_rows.append(row)
        titles_for_fetch.append(row.wiki_title)

    rows = [asdict(r) for r in list_rows]

    print(f"Fetching {len(titles_for_fetch)} car pages...")
    wikitexts = fetch_wikitext_batch(titles_for_fetch)

    for row in rows:
        wt_page = wikitexts.get(row["wiki_title"], "")
        if not wt_page:
            continue
        box = parse_car_infobox(wt_page)
        stats = parse_fh6_car_stats(wt_page)
        layout_code = box.get("layout", "").lower()
        row.update(
            {
                "manufacturer_code": box.get("manufacturer", ""),
                "make": "",  # filled by normalize_car after scrape
                "model": box.get("model", ""),
                "origin": box.get("origin", ""),
                "layout_raw": layout_code,
                "body_type": box.get("type", ""),
                "aspiration": box.get("aspiration", ""),
                "displacement_l": box.get("disp", ""),
                "engine": box.get("engine", ""),
                "engine_extra": box.get("extra", ""),
                "power_hp": box.get("power", ""),
                "torque_lbft": box.get("torque", ""),
                "drivetrain": "",
                "weight_lb": box.get("weight", ""),
                "gears": box.get("gears", ""),
                "in_fh6": "fh6=y" in wt_page or "{{CarStats|fh6" in wt_page.lower(),
                **{f"detail_{k}": v for k, v in stats.items()},
            }
        )

    from fh6_fandom_normalize import duplicate_vehicle_names, normalize_car

    dup_vehicles = duplicate_vehicle_names(rows)
    rows = [normalize_car(r, dup_vehicles) for r in rows]

    out_path = Path(__file__).resolve().parents[1] / "data" / "fh6_fandom_cars.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "source": "https://forza.fandom.com/wiki/Forza_Horizon_6/Cars",
                "scraped_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "count": len(rows),
                "cars": rows,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )
    print(f"Wrote {len(rows)} cars to {out_path}")

    # Excel export + app catalog (supabase/seed/fh6cars.json).
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from build_fh6_fandom_xlsx import build_xlsx, validate_xlsx, XLSX_PATH

    build_xlsx(out_path)
    problems = validate_xlsx(XLSX_PATH)
    if problems:
        raise RuntimeError("XLSX validation failed:\n  " + "\n  ".join(problems))
    print(f"Wrote {XLSX_PATH}")

    import subprocess

    subprocess.run(
        ["node", str(Path(__file__).resolve().parent / "build-fh6-app-catalog.mjs"), str(out_path)],
        check=True,
        cwd=str(Path(__file__).resolve().parents[1]),
    )


if __name__ == "__main__":
    main()
