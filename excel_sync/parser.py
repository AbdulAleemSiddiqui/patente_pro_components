"""
Parser for 'GIORNALIERE FRANCO LADY.xlsx'.

Each sheet contains repeated day-blocks:
    [date row]   -> weekday label (LUNEDI', MARTEDI', ...) + a real datetime cell
    [header row] -> instructor names (PINO, PAOLO, AGNESE, ...) aligned with data columns
    [hour rows]  -> hour in column A, task/student text under each instructor column

Every task cell also carries a fill color that encodes its type
(e.g. blue = booking, yellow = exam, pink = theory). Empty cells filled
with gray/black/dark-gray are extracted as "FERIE" (vacation) entries.
This parser extracts records (sheet, date, weekday, time, instructor,
task) together with the hex color code and a human-readable color name,
then writes CSV files:
    output/master_data.csv         - all records
    output/date_wise/*.csv         - one file per date
    output/instructor_wise/*.csv   - one file per instructor
    output/color_summary.csv       - color code legend + usage counts
    output/instructors_summary.csv - instructor roster + task counts
"""

import re
from datetime import datetime
from pathlib import Path

import pandas as pd
from openpyxl import load_workbook

DAYS = ["LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO", "DOMENICA"]

# Hex (without alpha) -> human readable color name
COLOR_NAMES = {
    "FFFF00": "Yellow",
    "C9DAF8": "Light Blue",
    "CFE2F3": "Pale Blue",
    "F4CCCC": "Light Pink",
    "B6D7A8": "Light Green",
    "FCE5CD": "Light Orange",
    "00FF00": "Green",
    "00FFFF": "Cyan",
    "FF0000": "Red",
    "0000FF": "Blue",
    "434343": "Dark Gray",
    "666666": "Gray",
    "999999": "Light Gray",
    "B7B7B7": "Silver Gray",
    "FFFFFF": "White",
    "000000": "Black",
}

# Fill colors that mark vacation/leave ("ferie") on EMPTY cells
FERIE_COLOR_HEX = {"434343", "666666", "000000"}  # Dark Gray, Gray, Black

# Instructor header cells look like pure uppercase names (allow spaces, apostrophes)
NAME_CELL_RE = re.compile(r"^[A-ZÀ-Ù][A-ZÀ-Ù'’\.\- ]{1,30}$")

# Task/keyword labels that must never be treated as instructor names
NON_NAME_KEYWORDS = {
    "TEORIA", "CQC", "ADR", "DTT", "UFFICIO", "UFF", "ESAMI", "ESAMI A", "ESAMI B",
    "ES GUIDA", "ES QUIZ", "ES REV QUIZ", "REC PUNTI", "RINN CQC", "RINN CQC A",
    "RINN CQC A1", "RINN CQC A2", "RINN CQC B2", "RINN CQC C", "PRE-ESAMI", "PRE ESAMI",
    "MALATA", "MALATTIA", "FERIA", "AUTOSERVICE", "LEZ COLLETTIVA", "CONS CQC",
    "AFFIANCAMENTO", "RIUNIONE", "MEDICINA", "NAOMI E SERENA",
}

# Manual aliases to unify known spelling variants
INSTRUCTOR_ALIASES = {
    "DEVINCENZI": "DE VINCENZI",
}


def get_year_from_sheet_name(sheet_name, fallback):
    """Sheet names embed the year: 'AGENDA 26'->2026, 'DICEMBRE 25'->2025,
    'MARZO2025'->2025. Avoid false hits like '1-15 MARZO' (1 and 15)."""
    m = re.search(r"(20\d{2})", sheet_name)  # explicit 4-digit year
    if m:
        return int(m.group(1))
    m = re.search(r"(?<!\d)(2[4-9])(?!\d)", sheet_name)  # 2-digit shorthand 24-29
    if m:
        return 2000 + int(m.group(1))
    return fallback


def is_day_label(text):
    t = str(text).strip().upper().rstrip("'’")
    return any(t.startswith(d) for d in DAYS)


def cell_color(cell):
    """Return (hex6, color_name) of a cell's solid fill, ('', 'No Fill') otherwise."""
    fill = cell.fill
    if fill is not None and fill.patternType == "solid" and fill.fgColor is not None:
        fg = fill.fgColor
        if fg.type == "rgb" and isinstance(fg.rgb, str) and len(fg.rgb) >= 6:
            hex6 = fg.rgb[-6:].upper()
            return hex6, COLOR_NAMES.get(hex6, f"#{hex6}")
        if fg.type == "theme":
            return f"THEME{fg.theme}", f"Theme {fg.theme}"
    return "", "No Fill"


def normalize_instructor(name):
    """Clean header name: collapse whitespace, strip honorific prefixes
    (DOTT./DOTT.SA/DR.), drop trailing SI/NO/OK/'DA CONF' availability
    markers, and apply aliases (e.g. 'CORRADO SI' -> 'CORRADO')."""
    n = re.sub(r"\s+", " ", str(name).strip().upper().rstrip(".,"))
    # strip honorifics iteratively: 'DOTT. SA GUNGI' -> 'SA GUNGI' -> 'GUNGI'
    for _ in range(2):
        stripped = re.sub(r"^(DOTTORESSA|DOTT\.?\s*SA|DOTT|DR|SSA|SA)\.?\s*", "", n)
        if stripped == n:
            break
        n = stripped
    n = re.sub(r"\s+(DA CONF(ERMARE)?)$", "", n)
    n = re.sub(r"\s+(SI|NO|OK)$", "", n)
    return INSTRUCTOR_ALIASES.get(n, n)


def is_instructor_name(text):
    t = re.sub(r"\s+", " ", str(text).strip().upper())
    return (
        bool(NAME_CELL_RE.match(t))
        and not is_day_label(t)
        and t not in NON_NAME_KEYWORDS
    )


def parse_hour(value):
    """Parse column A of an hour row into an int hour, else None."""
    if value is None:
        return None
    if isinstance(value, (int, float)):
        h = int(value)
        return h if 6 <= h <= 23 else None
    s = str(value).strip()
    if re.fullmatch(r"\d{1,2}(\.0)?", s):
        h = int(float(s))
        return h if 6 <= h <= 23 else None
    return None


def parse_and_split_agenda(input_file, output_dir="output"):
    output_path = Path(output_dir)
    date_dir = output_path / "date_wise"
    instr_dir = output_path / "instructor_wise"
    date_dir.mkdir(parents=True, exist_ok=True)
    instr_dir.mkdir(parents=True, exist_ok=True)

    wb = load_workbook(input_file, data_only=True)
    all_records = []

    for sheet_name in wb.sheetnames:
        ws = wb[sheet_name]
        year_hint = None
        current_date = None
        day_label = ""
        instructors = {}

        for row in ws.iter_rows():
            cells = list(row)
            values = [c.value for c in cells]

            # --- 1. Date row: contains a datetime cell ---
            dt_cell = next((v for v in values if isinstance(v, datetime)), None)
            if dt_cell is not None:
                year = get_year_from_sheet_name(sheet_name, dt_cell.year)
                try:
                    current_date = datetime(year, dt_cell.month, dt_cell.day).date()
                except ValueError:  # e.g. Feb 29 mismatch
                    current_date = dt_cell.date()
                # capture weekday label on the same row if present
                lbl = next((str(v).strip() for v in values
                            if isinstance(v, str) and is_day_label(v)), "")
                day_label = lbl.rstrip("'’").capitalize() if lbl else ""
                instructors = {}  # wait for the fresh header row
                continue

            # --- 2. Hour (data) row: column A holds the hour ---
            hour = parse_hour(values[0]) if values else None
            if hour is not None and current_date and instructors:
                for col_idx, instructor in instructors.items():
                    if col_idx >= len(cells):
                        continue
                    v = cells[col_idx].value
                    s = str(v).strip() if v is not None else ""
                    hex6, color_name = cell_color(cells[col_idx])

                    # Empty cells with gray/black/dark-gray fill -> FERIE
                    if not s:
                        if hex6 in FERIE_COLOR_HEX:
                            all_records.append({
                                "Sheet": sheet_name,
                                "Date": current_date,
                                "Weekday": day_label or current_date.strftime("%A"),
                                "Time": f"{hour:02d}:00",
                                "Instructor": instructor,
                                "Task": "FERIE",
                                "ColorHex": hex6,
                                "ColorName": color_name,
                            })
                        continue

                    # skip placeholders and duplicated hour markers
                    if s in ("*", "nan", "None") or parse_hour(s) is not None:
                        continue
                    all_records.append({
                        "Sheet": sheet_name,
                        "Date": current_date,
                        "Weekday": day_label or current_date.strftime("%A"),
                        "Time": f"{hour:02d}:00",
                        "Instructor": instructor,
                        "Task": s,
                        "ColorHex": hex6 if hex6 else "",
                        "ColorName": color_name,
                    })
                continue

            # --- 3. Instructor header row: >= 4 uppercase name-like cells ---
            name_cells = {
                i: normalize_instructor(v)
                for i, v in enumerate(values)
                if isinstance(v, str) and is_instructor_name(v)
            }
            if len(name_cells) >= 4:
                instructors = name_cells

    if not all_records:
        print("No data extracted. Please check the file format.")
        return

    df = pd.DataFrame(all_records)
    df = df.sort_values(by=["Date", "Time", "Instructor"]).reset_index(drop=True)
    # Dates as ISO strings for clean CSV output
    df["Date"] = df["Date"].astype(str)

    # Master file
    master_path = output_path / "master_data.csv"
    df.to_csv(master_path, index=False, encoding="utf-8-sig")

    # Date-wise split
    for date_val, group in df.groupby("Date"):
        group.to_csv(date_dir / f"{date_val}.csv", index=False, encoding="utf-8-sig")

    # Instructor-wise split
    for instructor, group in df.groupby("Instructor"):
        safe_name = re.sub(r"[^\w\-]", "_", instructor)
        group.to_csv(instr_dir / f"{safe_name}.csv", index=False, encoding="utf-8-sig")

    # Color summary (legend + usage counts)
    color_summary = (
        df.groupby(["ColorHex", "ColorName"])
        .agg(Task_Count=("Task", "size"),
             Distinct_Days=("Date", "nunique"),
             Example_Tasks=("Task", lambda x: ", ".join(sorted(set(x))[:3])))
        .reset_index()
        .sort_values("Task_Count", ascending=False)
    )
    color_summary.to_csv(output_path / "color_summary.csv", index=False, encoding="utf-8-sig")

    # Instructor roster summary
    instr_summary = (
        df.groupby("Instructor")
        .agg(Task_Count=("Task", "size"),
             Distinct_Days=("Date", "nunique"),
             First_Date=("Date", "min"),
             Last_Date=("Date", "max"))
        .reset_index()
        .sort_values("Task_Count", ascending=False)
    )
    instr_summary.to_csv(output_path / "instructors_summary.csv", index=False, encoding="utf-8-sig")

    print(f"Successfully processed {len(df)} records from {df['Sheet'].nunique()} sheets!")
    print(f"Date range: {df['Date'].min()} -> {df['Date'].max()}")
    print(f"Master file saved to: {master_path}")
    print(f"Date-wise files ({df['Date'].nunique()} days) saved in: {date_dir}")
    print(f"Instructor-wise files ({df['Instructor'].nunique()}) saved in: {instr_dir}")
    print(f"Color summary saved to: {output_path / 'color_summary.csv'}")
    print(f"Instructor summary saved to: {output_path / 'instructors_summary.csv'}")
    print("\nTop colors used:")
    print(color_summary[["ColorHex", "ColorName", "Task_Count"]].head(10).to_string(index=False))


if __name__ == "__main__":
    parse_and_split_agenda("GIORNALIERE FRANCO LADY.xlsx")