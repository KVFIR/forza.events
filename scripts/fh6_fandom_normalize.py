#!/usr/bin/env python3
"""Normalize scraped FH6 Fandom car dicts for export."""

from __future__ import annotations

import re
from html import unescape

from fh6_fandom_mappings import (
    ASPIRATION,
    BODY_TYPE,
    COUNTRY,
    EDITION_LABEL,
    FH6_CAR_TYPE,
    NAV_MAKE,
    format_drivetrain,
)

# Keep in sync with parseWikiAbbreviations in supabase/functions/_shared/carAbbreviation.ts
_ABBREV_LEAD = re.compile(
    r"abbreviated\s+as\s+(.+?)(?:\s*[-–—]\s+is\b|\s+is\s+an?\s)",
    re.IGNORECASE | re.DOTALL,
)
_ABBREV_QUOTED = re.compile(r'"([^"]+)"|“([^”]+)”')
_ABBREV_REF = re.compile(r"<ref\b[^>]*>.*?</ref>|<ref\b[^>]*/>", re.IGNORECASE | re.DOTALL)
_ABBREV_LINK = re.compile(r"\[\[(?:[^\]]+\|)?([^\]]+)\]\]")


def parse_abbreviated_as(wt: str) -> list[str]:
    """Quoted in-game names from the wiki lead: abbreviated as "X" or "Y"."""
    if not wt:
        return []
    m = _ABBREV_LEAD.search(wt)
    if not m:
        return []
    blob = _ABBREV_REF.sub("", m.group(1))
    aliases: list[str] = []
    seen: set[str] = set()
    for a, b in _ABBREV_QUOTED.findall(blob):
        s = unescape((a or b).strip())
        s = _ABBREV_LINK.sub(r"\1", s)
        s = re.sub(r"'{2,}", "", s).strip()
        key = s.lower()
        if s and key not in seen:
            seen.add(key)
            aliases.append(s)
    return aliases


# Longest-first prefix match for Make from Vehicle title.
_MANUFACTURER_PREFIXES: tuple[str, ...] = tuple(
    sorted(
        {
            "AMG Transport Dynamics",
            "Casey Currie Motorsports",
            "Mercedes-AMG",
            "Mercedes-Benz",
            "Formula Drift",
            "Aston Martin",
            "Alfa Romeo",
            "Land Rover",
            "Austin-Healey",
            "DeBerti",
            "DeLorean",
            "McLaren",
            "SIERRA Cars",
            "RJ Anderson",
            "Alumicraft",
            "Volkswagen",
            "Chevrolet",
            "Mitsubishi",
            "Lamborghini",
            "Koenigsegg",
            "Pagani",
            "Bugatti",
            "Ferrari",
            "Porsche",
            "Bentley",
            "Cadillac",
            "Datsun",
            "Toyota",
            "Honda",
            "Nissan",
            "Mazda",
            "Subaru",
            "Lexus",
            "Acura",
            "Infiniti",
            "Hyundai",
            "Genesis",
            "Kia",
            "Ford",
            "Dodge",
            "Ram",
            "Jeep",
            "GMC",
            "Buick",
            "Pontiac",
            "Shelby",
            "Saleen",
            "Rivian",
            "Lucid",
            "Tesla",
            "Rimac",
            "Apollo",
            "Ariel",
            "BAC",
            "Noble",
            "Caterham",
            "Lotus",
            "Jaguar",
            "Maserati",
            "Pagani",
            "Peugeot",
            "Renault",
            "Opel",
            "Vauxhall",
            "MINI",
            "BMW",
            "Audi",
            "Abarth",
            "Lancia",
            "Peel",
            "Radical",
            "Ultima",
            "Zenvo",
            "Can-Am",
            "Polaris",
            "Jimco",
            "Funco",
            "Hennessey",
            "Holden",
            "HSV",
            "Volvo",
            "Plymouth",
            "Reliant",
            "TVR",
            "MG",
            "GR",
            "Gordon Murray Automotive",
            "Autozam",
            "Wuling",
            "Penhall",
            "Schuppan",
            *NAV_MAKE.values(),
        },
        key=len,
        reverse=True,
    )
)


def country_label(code: str) -> str:
    c = (code or "").strip().lower()
    return COUNTRY.get(c, c.replace("_", " ").title() if c else "")


def resolve_make(car: dict) -> str:
    raw = (car.get("make") or "").strip()
    key = raw.lower().replace(" ", "")
    if key in NAV_MAKE:
        return NAV_MAKE[key]
    if raw and raw[0].isupper() and " " in raw and not raw.islower():
        return raw  # already human-readable
    slug_key = re.sub(r"[^a-z0-9]", "", raw.lower())
    if slug_key in NAV_MAKE:
        return NAV_MAKE[slug_key]
    vehicle = (car.get("vehicle") or "").strip()
    for prefix in _MANUFACTURER_PREFIXES:
        if vehicle == prefix or vehicle.startswith(prefix + " "):
            return prefix
    return vehicle.split()[0] if vehicle else raw


def edition_label(unlock_code: str) -> str:
    code = (unlock_code or "").strip().lower()
    if code in EDITION_LABEL:
        return EDITION_LABEL[code]
    if code.endswith("wp") or code == "wp":
        return EDITION_LABEL["wp"]
    return ""


def duplicate_vehicle_names(cars: list[dict]) -> frozenset[str]:
    from collections import Counter

    counts = Counter((c.get("vehicle") or "").strip() for c in cars)
    return frozenset(v for v, n in counts.items() if v and n > 1)


def vehicle_display_title(car: dict) -> str:
    """Prefer wiki display_name when the list title omits the race # (e.g. Ford 2 GT40 → Ford #2 GT40)."""
    vehicle = (car.get("vehicle") or "").strip()
    display = (car.get("display_name") or "").strip()
    if display and "#" in display and "#" not in vehicle:
        return display
    return vehicle or display or (car.get("model") or "").strip()


def catalog_model_name(car: dict, duplicate_vehicles: frozenset[str] | None = None) -> str:
    """Edition suffix only when the wiki list has multiple rows for the same vehicle name."""
    base = vehicle_display_title(car)
    vehicle = (car.get("vehicle") or "").strip()
    if duplicate_vehicles is not None and vehicle not in duplicate_vehicles:
        return base
    edition = (car.get("edition") or "").strip() or edition_label(car.get("unlock_code") or "")
    if not edition or edition.lower() in base.lower():
        return base
    suffix = f"'{edition}'"
    if base.endswith(suffix):
        return base
    return f"{base} {suffix}"


_LEGACY_DRIVE_LABELS = {"fwd": "FWD", "rwd": "RWD", "awd": "AWD"}
_LAYOUT_CODES = frozenset(
    {"fa", "ma", "ra", "ff", "fr", "mr", "rr", "f4", "m4", "r4", "mf", "rf", "awd"}
)


def normalize_car(car: dict, duplicate_vehicles: frozenset[str] | None = None) -> dict:
    out = dict(car)
    layout_raw = (car.get("layout_raw") or car.get("_layout_raw") or "").strip().lower()
    legacy_dt = (car.get("drivetrain") or "").strip()
    if not layout_raw:
        dt = legacy_dt.lower()
        if dt in _LAYOUT_CODES:
            layout_raw = dt

    combined, drive, engine_pos = format_drivetrain(layout_raw)
    if not combined and legacy_dt:
        leg = legacy_dt.lower()
        if leg in _LEGACY_DRIVE_LABELS:
            combined = _LEGACY_DRIVE_LABELS[leg]
            drive = combined
            engine_pos = ""
        elif legacy_dt.upper() in ("FWD", "RWD", "AWD"):
            combined = legacy_dt.upper()
            drive = combined
            engine_pos = ""
    out["make"] = resolve_make(car)
    out["list_country"] = car.get("country") or ""
    out["built_in"] = country_label(car.get("origin") or "")
    out["country_mismatch"] = (
        "Yes"
        if out["list_country"] and out["built_in"] and out["list_country"] != out["built_in"]
        else ""
    )
    out["drivetrain"] = combined
    out["drive_wheels"] = drive
    out["engine_layout"] = engine_pos
    out["car_type"] = FH6_CAR_TYPE.get((car.get("detail_div") or "").strip().lower(), car.get("detail_div") or "")
    out["body_type_label"] = BODY_TYPE.get((car.get("body_type") or "").strip().lower(), car.get("body_type") or "")
    asp = (car.get("aspiration") or "").strip().lower()
    out["aspiration_label"] = ASPIRATION.get(asp, car.get("aspiration") or "")
    out["edition"] = edition_label(car.get("unlock_code") or "")
    aliases = [str(a).strip() for a in (car.get("abbreviated_as") or []) if str(a).strip()]
    seen_alias: set[str] = set()
    unique_aliases: list[str] = []
    for a in aliases:
        k = a.lower()
        if k in seen_alias:
            continue
        seen_alias.add(k)
        unique_aliases.append(a)
    out["abbreviated_as"] = unique_aliases
    out["catalog_model"] = catalog_model_name(out, duplicate_vehicles)
    out["row_key"] = "|".join(
        [
            car.get("vehicle") or "",
            str(car.get("year") or ""),
            (car.get("unlock_code") or "").lower(),
            str(car.get("pi") or ""),
        ]
    )
    return out


if __name__ == "__main__":
    import json
    import sys
    from pathlib import Path

    if sys.argv[1:2] == ["--selfcheck"]:
        assert parse_abbreviated_as(
            'The 2016 \'\'\'Abarth 695 Biposto\'\'\' - abbreviated as "Abarth 695 \'16" - is a track'
        ) == ["Abarth 695 '16"]
        assert parse_abbreviated_as(
            'abbreviated as "Lambo Huracán P" or "L. Huracán \'18" - is an all-wheel'
        ) == ["Lambo Huracán P", "L. Huracán '18"]
        assert parse_abbreviated_as("The 2016 '''Ariel Nomad''' is a rear-wheel") == []
        print("parse_abbreviated_as ok")
        raise SystemExit(0)

    path = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).resolve().parents[1] / "data" / "fh6_fandom_cars.json")
    payload = json.loads(path.read_text(encoding="utf-8"))
    cars = payload["cars"] if isinstance(payload.get("cars"), list) else payload
    dup = duplicate_vehicle_names(cars)
    payload["cars"] = [normalize_car(c, dup) for c in cars]
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Normalized {len(cars)} cars in {path}")
