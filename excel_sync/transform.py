#!/usr/bin/env python3
"""
transform.py — Convert parser.py's master CSV into a Supabase-ready payload.

Pipeline (see supabase-fastapi-sync-plan.md):

    parser.py ──► output/master_data.csv ──► [this script]
                                            ├──► output/supabase_payload.json
                                            │      │  (make upload → Storage bucket
                                            │      │   "sync-sources")
                                            │      ▼
                                            │  Edge Function "sync-lessons"
                                            │      │  resolves teacher/student names
                                            │      ▼
                                            └─ Supabase `lessons` table

Rules implemented here:
  * Task classification into `kind` — full-cell keywords, then keyword prefixes
    with a student remainder ("18,00 PASSAGGIO AMELOTTI" → logistics+AMELOTTI),
    trailing annotations ("FALZONE ESP GUIDA" → exam+FALZONE), then fallback
    "lesson" with the cell treated as a student name.
  * Noise handling tuned on the real workbook: leading time prefixes
    ("8,30 NAPPI", "10,00ES GUIDA"), parenthesised annotations
    ("GIANNINI (RINN CQC A2)"), combined cells split on "+" / "/"
    ("DAPINO A3 + PERRONE"), trailing license/course tags ("BELLU A1 AUT" →
    BELLU), phone numbers, and pure junk ("24.0", "NO", "SI", time ranges) →
    kind "note" with student NULL.
  * Cells whose cleaned name matches a known instructor → kind "shadowing"
    (a teacher covering/working with another teacher).
  * Consecutive-hour merging: same teacher + same task on back-to-back hours
    become ONE row with duration_minutes = run_length * 60.
  * Europe/Rome DST-aware ISO timestamps for `scheduled_at`.
  * status default: "completed" for past dates, "scheduled" for today/future.

Stdlib only — no third-party dependencies.
"""

import argparse
import csv
import json
import re
import sys
from collections import Counter, defaultdict
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROME = ZoneInfo("Europe/Rome")
DEFAULT_KIND = "lesson"

# --------------------------------------------------------------------------
# Normalisation helpers
# --------------------------------------------------------------------------

# Leading time prefix: "10,30 ", "8.00 ", "7:45 ", "11-15 ", "9,45-12 ",
# and glued forms like "10,00ES GUIDA" / "9,30CAMPEGGI".
TIME_PREFIX_RE = re.compile(
    r"^\d{1,2}(?:[.,:]\d{2})?(?:[-–]\d{1,2}(?:[.,:]\d{2})?)?(?:\s+|(?=[A-ZÀ-Ù]))"
)
# Trailing time range: "ESPANA 19-20,30"
TRAILING_RANGE_RE = re.compile(r"\s+\d{1,2}[-–]\d{1,2}(?:[.,:]\d{2})?$")
TRAILING_PHONE_RE = re.compile(r"\s+\d{3}[-–/]?\d{5,}$")
TRAILING_NUM_RE = re.compile(r"\s+\d{3,4}$")
PAREN_WHOLE_RE = re.compile(r"^\(([^)]+)\)$")
PAREN_LEADING_RE = re.compile(r"^\(([^)]+)\)[-–]?\s*(.+)$")  # "(RINN CQC A2)-EHSANI"
PAREN_NOTE_RE = re.compile(r"^([A-ZÀ-Ù'’\.\- ]{2,}?)\s*\(([^)]+)\)$")
SPLIT_RE = re.compile(r"\s*[/+]\s*")
HAS_LETTER_RE = re.compile(r"[A-ZÀ-Ù]")

# Trailing license codes: "SOGGIA A2" → "SOGGIA" (dotted initials like G.A. kept)
LICENSE_RE = re.compile(r"\s+(A1|A2|A3|B1|B2|C1|CE|D1|BE|1A|A|B|C|D)$")
# Trailing course/tag tokens, optionally preceded by a license code:
# "BELLU A1 AUT" → "BELLU", "CORDANO PERF." → "CORDANO", "PAGANO A2MECC" → "PAGANO"
TAG_RE = re.compile(
    r"\s+(?:[ABCD]1?2?|CE|BE)?\s*(?:AUT|MAN|MECC|KB|TB|TC|AM|G\.O|GO|0040|0058|"
    r"PERF(?:EZZ?|EZIONAMENTO)?(?:\.\d{1,3})?|PERFEZIONAMENTO|REV)\.?$",
    re.IGNORECASE,
)
# Trailing whole keyword that implies a kind: "VASQUEZ CQC" → cqc + VASQUEZ
TRAILING_KIND_RE = re.compile(r"\s+(CQC|ADR)$")
# Trailing annotations that imply a kind for the name in front of them.
TRAILING_NOTES = [
    (re.compile(r"\s+PRE[.\s-]*ESAM[IE]*$"), "exam"),          # "SCARFO' PRE ESAME"
    (re.compile(r"\s+ESP\.?\s*(?:(?:DI\s+)?(?:GUIDA|CONTR))?$"), "exam"),  # "ESPGUIDA"
    (re.compile(r"\s+NON\s+\S+\s+VENUT.*$"), "note"),          # "DI BLASI NON È VENUTA"
]

# --------------------------------------------------------------------------
# Kind rules
# --------------------------------------------------------------------------

# Full-cell keywords (re.search on the normalised text; first match wins).
KEYWORD_RULES = [
    (r"^FERI[AE]\b|^FERIA\b|^FEFERIE\b|^1/2 FERIA\b", "ferie"),
    (r"^U[F]{1,2}ICIO\b|^LAVORI UFF\b|^UFF\b", "office"),
    (r"^TEI?ORIA\b", "theory"),  # TEORIA + the "TEIORIA" typo
    (r"^QUIZ\b|\bESAM", "exam"),  # bare quiz sessions, "APPUNTAMENTO ESAME"
    (r"^REV", "exam"),  # REV QUIZ / REV GUIDA / REVI / REVISIONE
    (r"^GUIDA\b|^GUIDE\b", "lesson"),  # unnamed driving lesson
    (r"\bADR\b|^CORSO ADR\b", "adr"),
    (r"^DTT\b|^CML\b|^CAM\.?\s*(?:COMM|DI COMM)|^CAMCOM\b", "dtt"),
    (r"^RIUNIONE\b|^CONFERENZA\b|^SOCIAL\b|^FORMAZIONE\b|^ADDESTRAMENTO\b|^SICUREZZA\b", "meeting"),
    (r"^MEDICINA\b|^MEDICA\b|^VISITA\b|^VISITE\b|^OSPEDALE\b|^PSICHIATRICA\b", "medical"),
    (r"^MALAT", "sick"),  # MALATA / MALATTIA
    (r"^NAOMI[E]?\s*(E\s*)?SERENA\b|^LEZ\.?\s*COLLETTIVA\b", "group_lesson"),
    (r"^AFFIANCAMENTO\b|^CON\b", "shadowing"),  # "CON PAOLO" = with teacher
    (r"^AUTOSERVICE\b", "autoservice"),
    (r"^ESP\.?\s*DI\s*(GUIDA|CONTROLLO)|^ESPERIMENTO DI GUIDA\b", "exam"),
    (r"^CORSO\b", "meeting"),
    # Car / garage logistics
    (r"^(PANDA\d?|PRENDERE|PORTARE|RIPORTARE|RIP\.?\s*PANDA|RITIRARE|RITIRO|TAGLIANDO"
     r"|MANUTENZ|GOMMISTA|CARROZZERIA|MECCANICO|NOLEGGIO|TRASF|TRASFERIMENTO|AUTO)\b", "logistics"),
    (r"^MOTO$", "logistics"),
]

# Keyword prefixes: the match may leave a student name behind.
PREFIX_RULES = [
    # exam prefixes: "ES GUIDA", "ES.GUIDA", "ESGUIDA", "ES QUIZ REV", "ES CQC", ...
    (r"^(?:ES|ESAME|ESAMI)\b[\s.:]*|^(?:ES)(?=(?:GUIDA|QUIZ|CQC|ADR|CAP|KB|REV|ES))", "exam"),
    (r"^PRE[.\s-]*(?:ESAM[IE]*|ES|SAME)\b", "exam"),  # PRE-ESAMI, PRE ES, PRE SAME
    (r"^REVISIONE\b", "exam"),
    (r"^(?:REC\.?\s*PUN[IT][IO]?|RECPUNTI|RECUPERO(?:\s+PUNTI)?|R?C\.?\s*PUNT[IO]?|REC)\b",
     "points_recovery"),
    (r"^(?:RINN\.?\s*(?:CQC)?|RIN CQC|RINNCQC|RINNOVO(?:\s+CQC)?|REG(?:ISTR)?\.?\s*CQC)\b",
     "cqc_renewal"),
    (r"^CONS\.?\s*CQC\b", "cqc_consult"),
    (r"^(?:LEZ\.?\s*)?CQC(?:\s*VIDEO)?\b", "cqc"),
    (r"^(?:PASSAGGIO|PRENDERE|PORTARE|RIPORTARE|RITIRARE|RITIRO)\b", "logistics"),
]

# Words that are never student names — bare occurrences become kind "note".
JUNK_WORDS = {
    "NO", "SI", "OK", "PROBABILMENTE", "ANCORA", "ASSENTE", "TUTTI ASSENTI",
    "NO MATTINA", "NO TEORIA", "DA CONF", "DA CONF.", "DA CONFIRMARE", "MOTO",
    "AUTO", "VIDEO", "PANDA", "LADY", "P LADY", "GUIDA", "PUNTI", "RECUPERO",
    "ISTRUTTORE", "INSEGNANTE", "MAPPA", "SITO", "BANCA", "SOCIAL", "TERME",
    "ACQUI", "ACQUI TERME", "ISOLA", "FIERA", "AULA", "AULA 1", "AULA 2",
    "AULA 3", "AULA3", "SPAZIO", "SPAZIOGE", "SPAZIO GENOVA", "INFOPOINT",
    "VITA", "VIA PIACENZA", "GENOVA PARCHEGGI", "MNO", "CON??", "CRONO",
    "B CON", "DE LA ESE", "CCIAA", "CAPITANERIA", "PROVINCIA", "ASL",
    "CONSORZIO", "MILIZIA", "MAGAZZINO", "PTAVANT", "PEC", "APT", "MOD",
    "CUM", "SBRACI", "SAN LORENZO",
}
JUNK_RES = [
    r"^[\d\s.,:;/–-]+$",                                    # pure numbers / ranges
    r"^\d+\s*(ORE)?$",                                      # "9 ORE", "24.0"
    r"^\d{1,2}(?:[.,:]\d{2})?[-–]\d{1,2}(?:[.,:]\d{2})?$",  # time ranges
    r"^[A-ZÀ-Ù]{1,2}$",                                     # fragments: C, DI, JI, CI
    r"^(LUNED[ÌI]|MARTED[ÌI]|MERCOLED[ÌI]|GIOVED[ÌI]|VENERD[ÌI]|SABATO|DOMENICA)",
    r"^ORE\b", r"^\d+ AUTO", r"^SOLO\b", r"^ONLINE\b",
]

WEEKDAYS_IT = {"LUNEDI", "MARTEDI", "MERCOLEDI", "GIOVEDI", "VENERDI", "SABATO", "DOMENICA"}


def normalize(text: str) -> str:
    s = re.sub(r"\s+", " ", str(text).strip().upper())
    return s.lstrip(".,; ").rstrip(" .,;")


def clean_name(s: str) -> str:
    """Strip annotations from a candidate student name."""
    name = s.strip(" .,;?!")
    name = re.sub(r"\s*\([^)]*\)", "", name)  # "(LADY)", "(TB)", "(P3)"...
    name = re.sub(r"\s+(CONI|OBBL)$", "", name)
    for rx in (TRAILING_RANGE_RE, TRAILING_PHONE_RE, TRAILING_NUM_RE):
        name = rx.sub("", name)
    for _ in range(3):  # license then tag, possibly stacked
        m = LICENSE_RE.search(name)
        if m and len(name[: m.start()].strip()) >= 3:
            name = name[: m.start()].strip()
        m = TAG_RE.search(name)
        if m and len(name[: m.start()].strip()) >= 3:
            name = name[: m.start()].strip()
    return name.strip(" .,;?!'")


def is_junk(name: str) -> bool:
    if not name or name in JUNK_WORDS or name in WEEKDAYS_IT:
        return True
    return any(re.search(rx, name) for rx in JUNK_RES)


def plausible_name(name: str) -> bool:
    if is_junk(name) or len(name) < 3:
        return False
    return any(len(w) >= 3 and w.isalpha() for w in re.split(r"\s+", name))


def keyword_for(text: str):
    for pattern, kind in KEYWORD_RULES:
        if re.search(pattern, text):
            return kind
    return None


def parse_single(text: str, teachers: set):
    """One (already split) task cell → (kind, student_name or None)."""
    s = normalize(text)
    if TIME_PREFIX_RE.match(s):
        s = TIME_PREFIX_RE.sub("", s, count=1).strip(" .,:")
    m = PAREN_WHOLE_RE.match(s)
    if m:  # "(RINN CQC A2)" → re-classify the content
        s = normalize(m.group(1))
    m = PAREN_LEADING_RE.match(s)
    if m:  # "(RINN CQC A2)-EHSANI" → keyword kind + trailing name
        k = keyword_for(normalize(m.group(1)))
        if k:
            name = clean_name(m.group(2))
            if plausible_name(name):
                return k, name
            return k, None
    if not s:
        return "note", None

    # 0. trailing annotations: "FALZONE ESP GUIDA" → exam + FALZONE
    for rx, tkind in TRAILING_NOTES:
        m = rx.search(s)
        if m and len(s[: m.start()].strip()) >= 3:
            if tkind == "note":
                return tkind, None
            name = clean_name(s[: m.start()].rstrip(" .,;-"))
            if plausible_name(name):
                return tkind, name

    # 1. full-cell keywords
    kind = keyword_for(s)
    if kind:
        return kind, None

    # 2. keyword prefixes with optional student remainder
    for pattern, pkind in PREFIX_RULES:
        m = re.match(pattern, s)
        if not m:
            continue
        rest = s[m.end():].strip(" .,:")
        if not rest:
            return pkind, None
        name = clean_name(rest)
        # course/vehicle words are not people: "ES GUIDA MOTO"
        if plausible_name(name) and keyword_for(name) is None:
            return pkind, name
        return pkind, None

    # 3. "NAME (keyword note)" → keep the name, adopt the note's kind
    m = PAREN_NOTE_RE.match(s)
    if m:
        base, note = m.group(1).strip(), m.group(2).strip()
        kind = keyword_for(normalize(note))
        name = clean_name(base)
        if plausible_name(name):
            return (kind or DEFAULT_KIND), name

    # 4. trailing kind token: "VASQUEZ CQC" → cqc + VASQUEZ
    m = TRAILING_KIND_RE.search(s)
    if m:
        name = clean_name(s[: m.start()])
        kind = {"CQC": "cqc", "ADR": "adr"}[m.group(1)]
        if plausible_name(name):
            return kind, name

    # 5. plain student name (or teacher name → shadowing, or junk → note)
    name = clean_name(s)
    if not plausible_name(name):
        return "note", None
    if name in teachers or re.split(r"\s+", name)[0] in teachers:
        return "shadowing", None
    return DEFAULT_KIND, name


def parse_task(text: str, teachers: set):
    """A raw task cell → list of (kind, student_name or None) — cells may hold
    several people separated by '+' or '/': 'DAPINO A3 + PERRONE'."""
    s = normalize(text)
    if not s:
        return [("note", None)]
    parts = SPLIT_RE.split(s)
    # only treat it as a combined cell if every part still contains a word
    if not all(HAS_LETTER_RE.search(p) for p in parts):
        parts = [s]
    return [parse_single(p, teachers) for p in parts if p]


def consecutive_runs(hours):
    """[8,9,10,14,15] → [(8,3), (14,2)]  (start_hour, run_length)"""
    runs = []
    start = prev = hours[0]
    for h in hours[1:]:
        if h == prev + 1:
            prev = h
        else:
            runs.append((start, prev - start + 1))
            start = prev = h
    runs.append((start, prev - start + 1))
    return runs


def main():
    ap = argparse.ArgumentParser(description="master_data.csv → supabase_payload.json")
    ap.add_argument("--input", default="output/master_data.csv")
    ap.add_argument("--output", default="output/supabase_payload.json")
    ap.add_argument("--date-from", default=None, help="inclusive YYYY-MM-DD filter")
    ap.add_argument("--date-to", default=None, help="inclusive YYYY-MM-DD filter")
    args = ap.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        sys.exit(f"Input not found: {in_path} — run parser.py first (make parse).")

    with open(in_path, newline="", encoding="utf-8-sig") as f:
        reader = list(csv.DictReader(f))

    # Pass 1: collect the instructor roster (for teacher-in-task detection).
    teachers = {
        re.sub(r"\s+", " ", str(r.get("Instructor", "")).strip().upper())
        for r in reader
    } - {""}

    errors, rows_read, dup_cells = [], 0, 0
    seen_cells = set()
    # (date, teacher, kind, ident) -> set of hours ; ident = student name or raw task
    runs = defaultdict(set)

    for row in reader:
        rows_read += 1
        try:
            d = date.fromisoformat(str(row.get("Date", "")).strip())
        except ValueError:
            errors.append(f"Bad date: {row.get('Date')!r} (row {rows_read})")
            continue
        if args.date_from and str(d) < args.date_from:
            continue
        if args.date_to and str(d) > args.date_to:
            continue

        teacher = re.sub(r"\s+", " ", str(row.get("Instructor", "")).strip().upper())
        task = re.sub(r"\s+", " ", str(row.get("Task", "")).strip().upper())
        try:
            hour = int(str(row.get("Time", ""))[:2])
        except ValueError:
            errors.append(f"Bad time: {row.get('Time')!r} (row {rows_read})")
            continue
        if not teacher or not task:
            continue

        for kind, student in parse_task(task, teachers):
            ident = student if student else f"::{task}"
            cell = (d, teacher, kind, ident, hour)
            if cell in seen_cells:
                dup_cells += 1
                continue
            seen_cells.add(cell)
            runs[(d, teacher, kind, ident)].add(hour)

    # Build merged lesson rows
    today = date.today()
    lessons = []
    for (d, teacher, kind, ident), hours in runs.items():
        for start_hour, length in consecutive_runs(sorted(hours)):
            scheduled = datetime(d.year, d.month, d.day, start_hour, 0, tzinfo=ROME)
            lessons.append({
                "teacher_name": teacher,
                "student_name": None if ident.startswith("::") else ident,
                "scheduled_at": scheduled.isoformat(),
                "duration_minutes": length * 60,
                "status": "completed" if d < today else "scheduled",
                "kind": kind,
                "task": ident.lstrip(":"),
            })
    lessons.sort(key=lambda x: (x["scheduled_at"], x["teacher_name"]))

    if not lessons:
        sys.exit("No lessons produced — check the input CSV / date filters.")

    dates = sorted({l["scheduled_at"][:10] for l in lessons})
    payload = {
        "generated_at": datetime.now(ROME).isoformat(),
        "source": str(in_path),
        "date_from": dates[0],
        "date_to": dates[-1],
        "rows_read": rows_read,
        "lessons": lessons,
    }

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # ---- Report ----
    kind_counts = Counter(l["kind"] for l in lessons)
    teacher_list = sorted({l["teacher_name"] for l in lessons})
    student_list = sorted({l["student_name"] for l in lessons if l["student_name"]})
    print(f"Read {rows_read} CSV rows ({dup_cells} duplicate cells skipped, {len(errors)} errors)")
    if errors:
        for e in errors[:10]:
            print(f"  ! {e}")
    print(f"Date range: {dates[0]} → {dates[-1]}")
    print(f"Lessons emitted (after consecutive-hour merge): {len(lessons)}")
    print("\nBy kind:")
    for k, c in kind_counts.most_common():
        print(f"  {k:18} {c}")
    print(f"\nDistinct teachers ({len(teacher_list)}): {', '.join(teacher_list)}")
    print(f"Distinct students ({len(student_list)}):")
    print("  " + ", ".join(student_list))
    print(f"\nPayload written to: {out_path}")
    print("Next: make upload && make dry-run")


if __name__ == "__main__":
    main()