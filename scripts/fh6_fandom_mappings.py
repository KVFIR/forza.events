"""Lookup tables for Forza Fandom FH6 car export (wiki codes → readable labels)."""

from __future__ import annotations

# Country codes from main car list + CarInfobox origin field.
COUNTRY: dict[str, str] = {
    "ast": "Australia",
    "oz": "Australia",
    "australia": "Australia",
    "aus": "Australia",
    "aut": "Austria",
    "austria": "Austria",
    "can": "Canada",
    "canada": "Canada",
    "ch": "China",
    "chn": "China",
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
    "gbr": "United Kingdom",
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
    "sw": "Sweden",
    "sweden": "Sweden",
    "uae": "UAE",
    "uk": "United Kingdom",
    "us": "United States",
    "usa": "United States",
}

# CarInfobox layout: engine position + driven wheels (see Template:CarInfobox).
LAYOUT_DRIVE = {
    "ff": "FWD",
    "mf": "FWD",
    "rf": "FWD",
    "fr": "RWD",
    "mr": "RWD",
    "rr": "RWD",
    "f4": "AWD",
    "fa": "AWD",
    "m4": "AWD",
    "ma": "AWD",
    "r4": "AWD",
    "ra": "AWD",
}

LAYOUT_ENGINE = {
    "ff": "Front",
    "fr": "Front",
    "f4": "Front",
    "fa": "Front",
    "mf": "Mid",
    "mr": "Mid",
    "m4": "Mid",
    "ma": "Mid",
    "rf": "Rear",
    "rr": "Rear",
    "r4": "Rear",
    "ra": "Rear",
}


def format_drivetrain(layout_code: str) -> tuple[str, str, str]:
    code = (layout_code or "").strip().lower()
    if not code:
        return "", "", ""
    drive = LAYOUT_DRIVE.get(code, "")
    engine = LAYOUT_ENGINE.get(code, "")
    if engine and drive:
        combined = f"{engine}-engine {drive}"
    elif drive:
        combined = drive
    else:
        combined = code.upper()
    return combined, drive, engine


# CarStats fh6 `div` = Horizon **car type** (not Motorsport division).
FH6_CAR_TYPE: dict[str, str] = {
    "b": "Buggies",
    "cc": "Cult Cars",
    "cm": "Classic Muscle",
    "crc": "Classic Racers",
    "crl": "Classic Rally",
    "csc": "Classic Sports Cars",
    "dc": "Drift Cars",
    "ecd": "Eclectic Domestics",
    "ett": "Extreme Track Toys",
    "gtc": "GT Cars",
    "h": "Hypercars",
    "hh": "Hot Hatch",
    "mm": "Modern Muscle",
    "mr": "Modern Rally",
    "msp": "Modern Sports Cars",
    "mss": "Modern Super Saloons",
    "msu": "Modern Super Cars",
    "o": "Offroad",
    "p4": "Pickups & 4x4's",
    "rac": "Rods & Customs",
    "rc": "Rare Classics",
    "rhh": "Retro Hot Hatch",
    "ram": "Rally Monsters",
    "rem": "Retro Muscle",
    "rrc": "Retro Racers",
    "rra": "Retro Rally",
    "rss": "Retro Super Saloons",
    "rsp": "Retro Sports Cars",
    "rsu": "Retro Super Cars",
    "sgt": "Super GT",
    "shh": "Super Hot Hatch",
    "suh": "Sports Utility Heroes",
    "tt": "Track Toys",
    "ub": "Unlimited Buggies",
    "uo": "Unlimited Offroad",
    "uh": "Utility Heroes",
    "utv": "UTV's",
    "vr": "Vintage Racers",
}

BODY_TYPE: dict[str, str] = {
    "p": "Production",
    "r": "Race",
    "t": "Truck/SUV",
    "f": "Fictional",
    "c": "Concept",
}

ASPIRATION: dict[str, str] = {
    "na": "Naturally aspirated",
    "t": "Turbo",
    "tt": "Twin-turbo",
    "t2": "Twin-turbo",
    "t2h": "Twin-turbo hybrid",
    "tth": "Turbo hybrid",
    "th": "Turbo hybrid",
    "s": "Supercharged",
    "sc": "Supercharged",
    "pds": "Positive displacement supercharger",
    "st": "Single turbo",
    "e": "Electric",
    "nah": "Naturally aspirated hybrid",
}

EDITION_LABEL: dict[str, str] = {
    "wp": "Welcome Pack",
    "pass": "Car Pass",
    "wtac": "Time Attack Car Pack",
    "ita": "Italian Passion Car Pack",
    "vip": "VIP Membership",
    "preorder": "Pre-order bonus",
    "fe": "Forza Edition (stats row)",
    "promo": "Promotional",
    "apromo": "Promotional (Autoshow)",
    "un": "Unobtainable",
}

# Nav-template slugs (legacy scrape) → display name.
NAV_MAKE: dict[str, str] = {
    "alfaromeo": "Alfa Romeo",
    "astonmartin": "Aston Martin",
    "austinhealey": "Austin-Healey",
    "amgtd": "AMG Transport Dynamics",
    "bmw": "BMW",
    "can-am": "Can-Am",
    "caseycurrie": "Casey Currie Motorsports",
    "deberti": "DeBerti",
    "delorean": "DeLorean",
    "formuladrift": "Formula Drift",
    "gmc": "GMC",
    "gr": "GR",
    "hsv": "HSV",
    "landrover": "Land Rover",
    "mclaren": "McLaren",
    "mercedesamg": "Mercedes-AMG",
    "mercedesbenz": "Mercedes-Benz",
    "mg": "MG",
    "mini": "MINI",
    "rjanderson": "RJ Anderson",
    "sierra": "SIERRA Cars",
    "srt": "SRT",
}
