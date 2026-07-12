#!/usr/bin/env python3
"""Build Excel export for FH6 Fandom car data.

Column A: in-cell checkboxes (Excel 365+). Data columns match COLUMNS below.
Wiki column: hyperlink styled as a compact button. Column widths auto-fit (capped).
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

try:
    import xlsxwriter
except ImportError as e:
    raise SystemExit(
        "xlsxwriter is required: pip install -r scripts/requirements-data.txt"
    ) from e

ROOT = Path(__file__).resolve().parents[1]
JSON_PATH = ROOT / "data" / "fh6_fandom_cars.json"
XLSX_PATH = ROOT / "data" / "Forza_Horizon_6_Cars_Fandom.xlsx"

CHECKBOX_HEADER = ""

# (field key, header, kind) — kind: text | int | dec1 | cr
COLUMNS: list[tuple[str, str, str]] = [
    ("_vehicle", "Vehicle", "text"),
    ("year", "Year", "int"),
    ("make", "Make", "text"),
    ("model", "Model", "text"),
    ("_country", "Country", "text"),
    ("car_type", "Type", "text"),
    ("body_type_label", "Body", "text"),
    ("rarity", "Rarity", "text"),
    ("pi", "PI", "int"),
    ("_class", "Class", "text"),
    ("_cr", "CR", "cr"),
    ("_unlock", "Unlock", "text"),
    ("speed", "Spd", "dec1"),
    ("handling", "Hnd", "dec1"),
    ("acceleration", "Acc", "dec1"),
    ("launch", "Lch", "dec1"),
    ("braking", "Brk", "dec1"),
    ("offroad", "Off", "dec1"),
    ("engine", "Engine", "text"),
    ("displacement_l", "L", "dec1"),
    ("aspiration_label", "Aspiration", "text"),
    ("power_hp", "hp", "int"),
    ("torque_lbft", "lb-ft", "int"),
    ("weight_lb", "lb", "int"),
    ("gears", "Gears", "int"),
    ("drive_wheels", "Drive", "text"),
    ("engine_layout", "Engine layout", "text"),
    ("wiki_url", "Wiki", "text"),
]

DATA_COL_OFFSET = 1  # column A = checkboxes

# Max width caps (Excel character units) — keep sheet readable
_WIDTH_CAP: dict[str, float] = {
    "text": 36,
    "int": 10,
    "dec1": 8,
    "cr": 12,
}
_HEADER_MIN: dict[str, float] = {
    CHECKBOX_HEADER: 4,
    "Vehicle": 22,
    "Year": 5,
    "PI": 5,
    "Class": 6,
    "Wiki": 7,
    "Spd": 5,
    "Hnd": 5,
    "Acc": 5,
    "Lch": 5,
    "Brk": 5,
    "Off": 5,
    "hp": 5,
    "lb-ft": 7,
    "lb": 6,
    "Gears": 6,
    "Drive": 7,
    "L": 4,
}


def pi_class(pi: object) -> str:
    try:
        p = int(str(pi).strip())
    except (TypeError, ValueError):
        return ""
    if p >= 900:
        return "R"
    if p >= 800:
        return "S2"
    if p >= 700:
        return "S1"
    if p >= 600:
        return "A"
    if p >= 500:
        return "B"
    if p >= 400:
        return "C"
    if p >= 100:
        return "D"
    return ""


def vehicle_name(car: dict) -> str:
    return (car.get("catalog_model") or car.get("vehicle") or car.get("display_name") or "").strip()


def list_country(car: dict) -> str:
    return (car.get("list_country") or car.get("country") or "").strip()


def resolve_cr(car: dict) -> int | None:
    raw = car.get("value_cr")
    if raw not in (None, ""):
        try:
            return int(str(raw).replace(",", ""))
        except ValueError:
            pass
    price = car.get("detail_price")
    if price not in (None, ""):
        digits = re.sub(r"[^0-9]", "", str(price))
        if digits:
            return int(digits)
    return None


def unlock_display(car: dict) -> str:
    base = (car.get("unlock") or "").strip()
    edition = (car.get("edition") or "").strip()
    extra = (car.get("unlock_extra") or "").strip()
    parts = [base] if base else []
    if edition and edition.lower() not in base.lower():
        parts.append(edition)
    if extra:
        parts.append(extra)
    return " · ".join(parts)


def prepare_car(car: dict) -> dict:
    out = dict(car)
    out["_vehicle"] = vehicle_name(car)
    out["_country"] = list_country(car)
    out["_class"] = pi_class(car.get("pi"))
    out["_cr"] = resolve_cr(car)
    out["_unlock"] = unlock_display(car)
    return out


def cell_value(car: dict, key: str, kind: str):
    raw = car.get(key, "")
    if raw in (None, ""):
        return None if kind in ("int", "dec1", "cr") else ""
    if kind == "int":
        try:
            return int(str(raw).replace(",", ""))
        except ValueError:
            return raw
    if kind == "dec1":
        try:
            return float(raw)
        except ValueError:
            return raw
    if kind == "cr":
        return raw if isinstance(raw, int) else int(str(raw).replace(",", ""))
    return raw


def row_from_car(car: dict) -> list:
    car = prepare_car(car)
    return [cell_value(car, key, kind) for key, _, kind in COLUMNS]


def _display_len(value: object) -> int:
    if value is None:
        return 0
    if isinstance(value, float) and value == int(value):
        return len(str(int(value)))
    return len(str(value))


def column_width(header: str, kind: str, values: list[object]) -> float:
    if header in _HEADER_MIN:
        floor = _HEADER_MIN[header]
    else:
        floor = 6 if kind == "text" else 5
    cap = _WIDTH_CAP.get(kind, 28)
    longest = len(header)
    for v in values:
        longest = max(longest, _display_len(v))
    # Slight padding; Excel width ≈ character count for default Calibri 11
    return min(max(longest * 1.08 + 1, floor), cap)


def build_xlsx(json_path: Path = JSON_PATH, xlsx_path: Path = XLSX_PATH) -> None:
    data = json.loads(json_path.read_text(encoding="utf-8"))
    cars = sorted(data["cars"], key=lambda x: (x.get("make") or "zzz", vehicle_name(x)))

    headers = [CHECKBOX_HEADER] + [label for _, label, _ in COLUMNS]
    rows = [row_from_car(c) for c in cars]
    n_data_cols = len(COLUMNS)
    last_row = len(cars)  # 0-based row index of last data row (header is row 0)
    last_col = DATA_COL_OFFSET + n_data_cols - 1

    wb = xlsxwriter.Workbook(str(xlsx_path), {"strings_to_urls": False})
    ws = wb.add_worksheet("Cars")

    wiki_fmt = wb.add_format(
        {
            "font_color": "#0563C1",
            "underline": False,
            "align": "center",
            "valign": "vcenter",
            "border": 1,
            "border_color": "#B4B4B4",
            "bg_color": "#F2F2F2",
            "bold": True,
        }
    )

    ws.write(0, 0, CHECKBOX_HEADER)
    for col_idx, label in enumerate(headers[1:], start=DATA_COL_OFFSET):
        ws.write(0, col_idx, label)

    col_values: list[list[object]] = [[] for _ in range(n_data_cols)]
    for row_idx, (car, values) in enumerate(zip(cars, rows), start=1):
        ws.insert_checkbox(row_idx, 0, False)
        for data_col, (val, (key, _, kind)) in enumerate(zip(values, COLUMNS)):
            sheet_col = DATA_COL_OFFSET + data_col
            col_values[data_col].append(val)
            if key == "wiki_url":
                url = (val or "").strip() if isinstance(val, str) else ""
                if url:
                    ws.write_url(row_idx, sheet_col, url, wiki_fmt, string="Wiki")
                else:
                    ws.write(row_idx, sheet_col, "")
            elif val is None or val == "":
                ws.write(row_idx, sheet_col, "")
            elif kind == "dec1" and isinstance(val, float):
                ws.write_number(row_idx, sheet_col, round(val, 1))
            elif kind in ("int", "cr") and isinstance(val, int):
                ws.write_number(row_idx, sheet_col, val)
            else:
                ws.write(row_idx, sheet_col, val)

    for data_col, (_, header, kind) in enumerate(COLUMNS):
        sheet_col = DATA_COL_OFFSET + data_col
        w = column_width(header, kind, col_values[data_col])
        ws.set_column(sheet_col, sheet_col, w)

    ws.set_column(0, 0, _HEADER_MIN[CHECKBOX_HEADER])

    ws.autofilter(0, 0, last_row, last_col)
    ws.freeze_panes(1, 1)

    wb.close()
    print(f"Wrote {xlsx_path} ({len(cars)} cars, {len(headers)} columns)")


def validate_xlsx(path: Path) -> list[str]:
    import zipfile

    issues: list[str] = []
    with zipfile.ZipFile(path) as z:
        sheet = z.read("xl/worksheets/sheet1.xml").decode()
        if "table" in sheet.lower() and "tableParts" in sheet:
            issues.append("worksheet contains an Excel table (expected plain sheet)")
        if "<autoFilter" not in sheet:
            issues.append("worksheet missing autoFilter")
    return issues


if __name__ == "__main__":
    build_xlsx()
    problems = validate_xlsx(XLSX_PATH)
    if problems:
        print("VALIDATION FAILED:", *problems, sep="\n  ")
        sys.exit(1)
    print("Validation OK")
