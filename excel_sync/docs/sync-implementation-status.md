# XLSX → Supabase Sync — Implementation Status & Open Questions

*Last updated: 2026-09-11 (after deploy v6 of `sync-lessons`; real sync NOT yet executed — the write run was aborted before writing anything).*

---

## 1. Current State (one paragraph)

The pipeline **Excel → CSV → JSON payload → Storage bucket → Edge Function → `lessons` table** is fully built, deployed, and validated with dry-runs (which write nothing). The last full dry-run reported: **12,198 sheet rows selected → 12,196 lessons planned, 39 teachers + 891 students resolved by name, 0 errors**. The database currently holds only the pre-existing test data (**12 `users`, 16 `lessons**) — the sync itself has never completed a real write. Two earlier real-run attempts failed *before writing anything* (errors were atomic batch failures), each of which surfaced a schema reality that is now handled in code (see §4).

---

## 2. What Lives Where (file map)

| File | Role | Status |
|---|---|---|
| `GIORNALIERE FRANCO LADY.xlsx` | Source workbook (weekly schedule) | Input, unchanged |
| `parser.py` | Parses workbook → `output/master_data.csv` + `output/date_wise/*.csv` | Done, working |
| `transform.py` | `master_data.csv` → `output/supabase_payload.json`. Classifies each cell into `kind` (lesson / note / shadowing / exam / logistics / …), cleans noise (time prefixes, phone numbers, `+`-split cells, annotations), merges consecutive hours into one row with `duration_minutes`, emits **Europe/Rome DST-aware ISO timestamps** (`+01:00`/`+02:00`) and `status` (completed for past, scheduled for today/future). Stdlib only. | Done, working; supports `--date-from/--date-to` slices |
| `output/supabase_payload.json` | The payload (12,198 rows). **Regenerate with `make transform` after any new sheet** | Generated (Sep 11); currently uploaded to bucket |
| `supabase/functions/sync-lessons/index.ts` | Edge Function (deployed **v6**). Auth-gated (service key). Downloads payload from private bucket `sync-sources` (or accepts it inline via POST body). Resolves teacher/student names → `public.users` (case-insensitive `full_name` + `role`, tenant-scoped). Missing people: creates **auth user via Auth Admin API** (`@sync.local` placeholder email, `user_metadata.source = "sheet-sync"`) then a matching `public.users` row (needed because `users.id` FK-references `auth.users`). Lessons: **insert-missing only** — natural key `(tenant_id, teacher_id, student_id, scheduled_at→epoch, kind)`; existing rows are never modified. `dry_run=true` validates without writing. Chunked inserts (500). | Deployed; logic verified by dry-runs; **never executed a real write** |
| `Makefile` | `make parse` / `transform` / `slice FROM=… TO=…` / `upload` (payload → bucket, `x-upsert: true`) / `dry-run` / `sync-lessons` / `sync` (= transform+upload+run) | Done |
| `.env` / `.env.example` | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (real values present; `.env` is git-ignored) | Done |
| `supabase/deno.json` | Deno config for the function | Done |
| `supabase-fastapi-sync-plan.md` | **The original plan — now OUTDATED.** FastAPI was replaced by the Edge Function approach; its §2 schema (`people`, `schedule_slots`) does not exist in this project. Kept for history; do not follow it. | Outdated |
| `sync-implementation-status.md` | This file | Current |

**Live resources:** project `qitrvdyhydcnwxeqrgcl` (linked via CLI, logged in), function `sync-lessons` ACTIVE, private bucket `sync-sources` with `supabase_payload.json` uploaded, tenant `Autoscuola Franco` = `22222222-2222-2222-2222-222222222222` (hardcoded default in the function, overridable via `?tenant=` or `SYNC_TENANT_ID`).

---

## 3. What Has Been Verified

- ✅ One-day inline dry-run (`2025-01-03`, 27 rows): 27 planned, 0 errors.
- ✅ Full dry-run from Storage: 12,198 rows → **12,196 planned lessons** (2 rows collapse into the same natural key), 39 teachers / 891 students resolved, 0 errors.
- ✅ Auth: function rejects non-service keys; works with both legacy JWT and new-format project keys.
- ✅ Failure atomicity: both failed real runs wrote **zero** rows (batch inserts failed as a whole; DB untouched).
- ❌ **Not yet done:** a successful real write; idempotency proof (second run → `lessons_inserted: 0`); post-sync reconciliation against the sheet.

---

## 4. Schema Realities Discovered Along the Way (different from the original plan)

1. There is **no `teacher`/`student`/`people` table**. People live in **`public.users`** (`id, tenant_id, role, full_name, email, phone, is_active, created_at`), role ∈ {admin, student, teacher}.
2. **`users.email` is NOT NULL** → sheet-created people get unique placeholders like `rossi.a1b2c3d4@sync.local` (easy to find and replace later).
3. **`users.id` is a FK (almost certainly → `auth.users`)** → every new person needs a real auth user first; the function does this via the Auth Admin API and inserts the profile with the same id.
4. `lessons` columns: `id, tenant_id, teacher_id, student_id, scheduled_at, duration_minutes, status (default 'scheduled'), created_at, kind (default 'lesson')` — exactly the columns you specified.
5. The project is **multi-tenant**; everything the sync writes is tagged `tenant_id = 22222222-…` (Autoscuola Franco).
6. The §2 SQL from the old plan (unique constraint, etc.) was **never created** — the function's insert-missing logic is currently the *only* duplicate guard (see gap G1).

---

## 5. Open Questions (decisions needed)

**Q1 — Placeholder emails / auth user creation.** The next real run will create **~930 auth users** (`@sync.local`, auto-confirmed). Is that acceptable in this project (auth user limits, dashboard clutter, password-reset emails never used)? Alternative: you provide a CSV of real emails and we pre-seed names→emails before the first sync.
**Q2 — Name variants = separate people.** The 891 student names include obvious near-duplicates from the sheet ("HRUSTIC E" / "HRUSTIC EMIN" / "HRUSTC EMIN", "ESPOSITO V"/"ESPOSITIV", "SAVCHUK"/"SAVCKUK"/"SAVCHUCK"). Each becomes its own person **permanently** (auth users can't be casually merged). Run a fuzzy-match audit and decide the canonical spelling *before* the first real sync.
**Q3 — Update policy / divergence.** Insert-missing means: if a slot is *edited in the sheet* after its first sync (time moved, student swapped, cancelled), the DB keeps the **old** row. This protects manual app edits (chosen earlier) but means sheet corrections never propagate. Options: (a) accept — fix manually in the app; (b) upsert-by-natural-key (overwrites manual app edits); (c) detect-and-report diffs without writing. **Needs a decision before weekly cadence starts.**
**Q4 — Unique constraint.** Should we add a DB-level unique index on `lessons (tenant_id, teacher_id, student_id, scheduled_at, kind)` as defense-in-depth against concurrent syncs double-inserting? (Note: `student_id` is NULL for note rows; a plain unique index won't dedup NULLs — needs an expression index `coalesce(student_id, …)` or making the key NOT NULL.) The function-level guard alone is fine while syncs are serial.
**Q5 — Pre-existing 16 lessons / 12 users.** Are these throwaway test rows? If real: do their `lessons.tenant_id` values match `22222222-…` (otherwise app queries filtered by tenant won't see them together)?
**Q6 — `kind` / `status` vocabularies.** The payload emits `kind` ∈ {lesson, note, shadowing, exam, logistics, …} and `status` ∈ {completed, scheduled}. Confirm the app/frontend expects exactly these values.
**Q7 — Weekly cadence.** Nothing schedules the sync yet. Choose: manual `make sync` each week (simplest), `pg_cron` + `pg_net` inside Supabase, or a GitHub Action cron hitting the function.
**Q8 — New-week workflow.** Current sheet covers Jan–Aug 2025. For each new week: drop the new xlsx in, `make parse && make transform` (full file re-transform; the sync's insert-missing makes re-uploading old weeks harmless), `make upload`, `make sync-lessons`. Confirm this flow, or restrict to the new week via `make slice`/`?date_from=&date_to=`.

---

## 6. No-Data-Loss Checklist (gaps & what to add after this stage)

| # | Gap | Why it matters | Action |
|---|---|---|---|
| G1 | Duplicate guard is application-level only | Two overlapping/concurrent syncs could double-insert | Add unique index (Q4); then even a re-run is safe at the DB level |
| G2 | No pre-sync backup | A bad sheet (or bad parse) becomes irreversible once written | Add `make backup` — export `lessons` + `users` to dated CSVs (or `supabase db dump`) before every real sync; keep N weeks |
| G3 | No audit trail of what a sync wrote | Can't answer "what did last week's sync change?" / can't roll back one sync | Keep dated copies of `master_data.csv` + payload (e.g. `output/archive/2025-W37/…`, upload to bucket as `supabase_payload_YYYYMMDD.json`), and/or a `sync_runs` table (run id, timestamp, rows inserted, payload hash). Minimal version: the function response JSON saved per run |
| G4 | No reconciliation | Silent drift between sheet and DB | After each sync, verify per-week counts: DB lessons in the week's window == planned lessons from the transform report; any mismatch = alert. A small `make verify FROM=… TO=…` target or SQL query suffices |
| G5 | Name-variant people (Q2) | Creates permanent duplicate persons; lessons attach to the wrong one | Fuzzy-duplicate report before first sync; decide canonical names; optionally a manual `alias`/merge mechanism later |
| G6 | Idempotency not yet proven end-to-end | Re-runs must insert 0 | After the first successful real sync, run again and confirm `lessons_inserted: 0` |
| G7 | Rollback path for a bad sync | Currently only manual SQL | Document: `DELETE FROM lessons WHERE tenant_id='2222…' AND scheduled_at BETWEEN '<from>' AND '<to>' AND kind/status …` — or better, tag synced rows (e.g. `source` column, see Q4/G3) so a sync's rows are addressable |
| G8 | Cancelled/removed slots stay in DB | A slot deleted from the sheet remains scheduled in the app | Decide policy (mirror-deletes vs keep); if mirror-deletes are wanted, that's a new function mode comparing sheet-week vs DB-week and deleting the difference — **must** be paired with G3 audit to be safe |
| G9 | Function errors surface only in the JSON response | Weekly automation could fail silently | When cadence is added (Q7): check `errors` array; page/log via `supabase functions logs sync-lessons` |

---

## 7. Immediate Next Steps (ordered)

1. **Answer Q1–Q3** (placeholder emails OK? name cleanup? update policy?) — they gate the first real run.
2. **Name audit (G5/Q2)** — produce a near-duplicates report from `output/supabase_payload.json` and fix canonical spellings in `transform.py` mappings or the sheet.
3. **Optional hardening:** unique index + `source` tag (Q4/G7), `make backup` (G2), payload archiving (G3).
4. **First real sync:** `make sync-lessons` → expect `lessons_inserted ≈ 12,196`, users ≈ 12 + ~930.
5. **Idempotency proof:** run `make sync-lessons` again → expect `lessons_inserted: 0` (G6).
6. **Reconciliation (G4):** compare DB week-counts vs transform report.
7. **App-side check:** open the app calendar for a sample week (e.g. 2025-01-03) and confirm slots, teachers, students, kinds, statuses look right.
8. **Choose and set the weekly cadence (Q7)** and document the new-week workflow (Q8).
9. **Monitor the first live weeks** (G9) and keep backups (G2) until two clean cycles have passed.

---

## 8. Quick reference — commands

```sh
make parse            # xlsx → output/master_data.csv
make transform        # → output/supabase_payload.json (+ report)
make slice FROM=2025-01-03 TO=2025-01-03   # transform a date range only
make upload           # payload → sync-sources bucket (overwrites)
make dry-run          # validate everything, write nothing
make sync-lessons     # REAL run (create missing people + insert missing lessons)
make sync             # transform + upload + real run

supabase functions logs sync-lessons      # inspect function logs
supabase functions deploy sync-lessons    # after editing index.ts
```
