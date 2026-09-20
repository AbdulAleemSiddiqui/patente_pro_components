# GIORNALIERE (Excel) → Supabase `lessons` Sync — Execution Plan (Edge Function)

> **Amended version.** The original plan targeted FastAPI + a Google Sheet + a new `schedule_slots` table. The architecture is now: **local `parser.py` output → `transform.py` → Supabase Storage → Edge Function `sync-lessons` → existing `lessons` table.** No FastAPI, no Google Sheets API.

## Context

- Source of truth is the local workbook `GIORNALIERE FRANCO LADY.xlsx` (weekly instructor agenda, hour rows × instructor columns, color-coded task cells).
- `parser.py` (already built) extracts every cell into `output/master_data.csv` with columns: `Sheet, Date, Weekday, Time, Instructor, Task, ColorHex, ColorName`.
- Target is the **existing** Supabase table `lessons` with columns: `teacher_id`, `student_id`, `scheduled_at`, `duration_minutes`, `status`, `created_at`, `kind`.
- `teacher_id` / `student_id` are FKs to the existing `teacher` / `student` tables. Person matching is **name-based** (first name is sufficient for now — the sheet only carries first names for instructors).
- The sync runs as a **Supabase Edge Function** (Deno), not a FastAPI service.

---

## 1. Resolved Decisions

| Decision | Resolution |
|---|---|
| Event model | **Dated one-offs** — each row is a specific `scheduled_at` timestamp; no recurring-pattern table needed. |
| Person matching | Name-based get-or-create: instructor first names (e.g. `LINO`) → `teacher`; task names → `student`. New names create new rows. |
| License suffixes | Trailing license tokens (`A1`, `A2`, `A3`, `B1`, `B2`, `C1`, `CE`, `D1`, `BE`, `A`, `B`, `C`, `D`) are **stripped before student name matching** (`SOGGIA A2` → `SOGGIA`). Dotted initials like `G.A.` are preserved. |
| Non-student tasks | `FERIE`, `UFFICIO`, `TEORIA`, `DTT`, `PRE ESAME`, … are inserted with **`student_id = NULL`** and a derived `kind`. |
| Duration | **Consecutive hours merged**: same teacher + same task on back-to-back hours become one row (e.g. `PETROV` 14:00 & 15:00 → one row, `120` minutes). Applies to `FERIE` blocks too. |
| Timezone | `scheduled_at` is stored as timestamptz built with **Europe/Rome** (DST-aware, `+01:00`/`+02:00` offsets). |
| `status` | Free-text/user-defined; importer defaults to `completed` for past dates, `scheduled` for today/future (configurable in `transform.py`). |
| `kind` | Free-text; derived from task text via a keyword mapping (table below), fully editable. |
| Overwrite behavior | New functionality — sync upserts freely. The unique constraint makes re-runs idempotent instead of duplicating. |
| Idempotency | Upsert on `(teacher_id, student_id, scheduled_at, kind)` backed by a `unique nulls not distinct` constraint (SQL in §2). |

---

## 2. Database Setup (one-time SQL)

Run in the Supabase SQL editor:

```sql
-- 1. Natural key so repeated syncs update instead of duplicating.
--    NULLS NOT DISTINCT makes (teacher, NULL student, time, kind) a duplicate too (PG 15+, enabled on Supabase).
alter table lessons
  add constraint lessons_natural_key
  unique nulls not distinct (teacher_id, student_id, scheduled_at, kind);

-- 2. Private bucket holding the generated JSON payload (Edge Function reads it from here).
insert into storage.buckets (id, name, public)
values ('sync-sources', 'sync-sources', false)
on conflict (id) do nothing;
```

> Assumes `teacher` and `student` have a `name` column and only nullable columns besides it. Adjust the insert in the Edge Function if their schemas differ.

---

## 3. Column Mapping (`output/master_data.csv` → `lessons`)

| `lessons` column | Source / rule |
|---|---|
| `teacher_id` | Get-or-create `teacher` by normalized `Instructor` name |
| `student_id` | Get-or-create `student` by task text with license suffix stripped; `NULL` for keyword tasks |
| `scheduled_at` | `Date` + `Time` → ISO timestamptz, e.g. `2025-01-03T08:00:00+01:00` |
| `duration_minutes` | Consecutive-hour run length × 60 |
| `status` | `completed` (date in the past) / `scheduled` (today or future) |
| `created_at` | DB default `now()` |
| `kind` | Keyword classification below |

### `kind` classification (ordered — first match wins)

| Task text pattern | `kind` |
|---|---|
| `FERIE*` | `ferie` |
| `UFFICIO` / `UFF*` | `office` |
| `TEORIA*` | `theory` |
| contains `ESAM`, starts with `ES ` (`ES GUIDA`, `ES QUIZ`, …) | `exam` |
| `DTT*` | `dtt` |
| `REC PUNTI*` | `points_recovery` |
| `RINN*` / `CONS*` / `CQC*` | `cqc_renewal` / `cqc_consult` / `cqc` |
| `MALATA` / `MALATTIA` | `sick` |
| `RIUNIONE` / `MEDICINA` | `meeting` / `medical` |
| `AFFIANCAMENTO` / `LEZ COLLETTIVA` / `AUTOSERVICE` / `NAOMI E SERENA` | `shadowing` / `group_lesson` / `autoservice` / `group_lesson` |
| anything else | `lesson` (treated as a **student name**) |

All keyword tasks → `student_id = NULL`.

---

## 4. Architecture & Components

```
GIORNALIERE FRANCO LADY.xlsx
        │  parser.py (unchanged)
        ▼
output/master_data.csv
        │  transform.py            (local, stdlib only: merge hours, classify kind,
        ▼                          strip suffixes, Rome tz, status defaults)
output/supabase_payload.json
        │  make upload             (curl → Supabase Storage, private bucket)
        ▼
Storage bucket "sync-sources"
        │  Edge Function sync-lessons   (Deno, service-role secret)
        │    1. download payload
        │    2. filter by date_from/date_to (optional)
        │    3. get-or-create teacher/student rows by name
        │    4. upsert lessons on natural key
        ▼
lessons (teacher_id, student_id, scheduled_at, duration_minutes, status, kind)
```

| Component | File | Purpose |
|---|---|---|
| Excel parser | `parser.py` | **Unchanged** — extracts the workbook to CSVs |
| Transformer | `transform.py` | CSV → validated `supabase_payload.json`; prints a report (per-kind counts, distinct people, slices via `--date-from/--date-to`) |
| Upload + trigger | `Makefile` | `make transform` / `make upload` / `make dry-run` / `make sync` / `make slice FROM=… TO=…` |
| Secrets template | `.env.example` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Edge Function | `supabase/functions/sync-lessons/index.ts` | Payload download, name resolution, batch upsert (chunks of 500), dry-run mode |

### Edge Function API

```
GET|POST https://<project>.supabase.co/functions/v1/sync-lessons
Headers: Authorization: Bearer <SERVICE_ROLE_KEY>
Query:   dry_run=true          → resolve + validate, write NOTHING
         path=<storage path>   → default supabase_payload.json
         date_from=YYYY-MM-DD  → inclusive filter on scheduled_at date
         date_to=YYYY-MM-DD    → inclusive filter on scheduled_at date
Response: { rows_total, lessons_planned, teachers_created, students_created,
            lessons_upserted, errors[], dry_run, sample[] }
```

---

## 5. Execution Steps

1. **Apply the SQL from §2** (unique constraint + storage bucket) in the SQL editor.
2. **Set secrets** — copy `.env.example` to `.env`, fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role key never leaves server-side tooling / your machine; do not commit).
3. **Deploy the function**:
   ```bash
   supabase functions deploy sync-lessons
   # local dev alternative:
   supabase functions serve sync-lessons --env-file .env
   ```
   (Requires the Supabase CLI and a linked project: `supabase link --project-ref <ref>`.)
4. **Parse + transform** — `make parse` then `make transform`; review the printed report (unexpected kinds usually mean a new task keyword).
5. **Upload the payload** — `make upload` → writes `output/supabase_payload.json` to `sync-sources/supabase_payload.json`.
6. **Dry-run first** — `make dry-run`; verify `lessons_planned`, the name lists, and the 10-row sample.
7. **Real run** — `make sync-lessons`; check `lessons_upserted` and `errors[]`.
8. **Idempotency check** — run `make sync-lessons` again; `lessons_upserted` should stay the same and `select count(*) from lessons` must not grow.
9. **Verify in SQL editor**:
   ```sql
   select kind, count(*) from lessons group by kind order by 2 desc;
   select count(*) as dupes from (
     select teacher_id, student_id, scheduled_at, kind
     from lessons group by 1,2,3,4 having count(*) > 1
   ) d;
   ```

### Weekly cadence

The workbook lives on a local machine, so the "trigger" is a one-command manual flow: update the `.xlsx` → `make sync` (transform → upload → invoke). If the file ever lands in cloud storage or a Sheet, the same Edge Function can be scheduled with `pg_cron` + `pg_net`, or Supabase's scheduled functions — no code changes needed since the function is already HTTP-triggered.

---

## 6. Testing Strategy

- **Local transform tests** (no Supabase needed): run `python3 transform.py --date-from 2025-01-03 --date-to 2025-01-03` and inspect `output/supabase_payload.json` against the matching date CSV — consecutive FERIE hours should be merged, suffixes stripped, kinds correct.
- **Dry-run against live DB**: `make dry-run` resolves every name and reports what *would* happen without writing. Repeat after real sync to confirm resolution is stable.
- **Idempotency**: re-run step 8 above; count must not change.
- **Rollback safety**: a bad import is contained by `delete from lessons where kind in (...)` or by date range on `scheduled_at` — the natural key prevents accidental re-duplication after cleanup.
- If a **staging project** is available, point `.env` at it first and only switch to production after the dry-run + first run look right.

---

## 7. Known Risks / Watch-Outs

- **Duplicate people from name typos** ("Jon Smith" vs "John Smith", `GIANNI` vs `GIANI`) — matching is name-only; sheet hygiene matters. The transform report surfaces distinct names each run for a quick eyeball.
- **Same first name, different people** — instructors are matched by first name only (per current decision); a second "PAOLO" would collide. Add a secondary identifier later if needed.
- **`teacher`/`student` schema assumptions** — get-or-create inserts `{ name }` only; if those tables have other NOT NULL columns, the insert step fails with a clear error returned by the function.
- **Missing unique constraint** — without §2's constraint the upsert errors out (PostgREST `on_conflict` needs it); the function returns the underlying message so it's obvious.
- **New task keywords** — unknown task text is silently treated as a student name (`kind = lesson`). Check the transform report's `lesson` count/name list before each sync.
- **Service role key exposure** — required for the upload + function invocation; keep it in `.env` only, never in frontend code or git (`.env` is git-ignored by convention).
- **Storage path collisions** — each `make upload` overwrites `supabase_payload.json` (upsert=true); keep dated copies (`path=` param) if you need history.

---

## 8. Future / Open Items

- Secondary identifier (email/phone) for person matching once data quality demands it.
- Move the workbook to Google Drive/Sheets so the whole pipeline can be scheduled server-side.
- Sync `ColorHex`/`ColorName` into `lessons` (e.g. a `source_color` column) if the app ever needs the color semantics — currently dropped because `kind` supersedes it.