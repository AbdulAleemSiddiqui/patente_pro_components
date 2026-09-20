# Excel → Supabase sync — usage guide

How to import a new GIORNALIERE workbook into the `lessons` table.

```
workbook.xlsx ──parser.py──► output/master_data.csv ──transform.py──► payload.json ──edge function──► lessons
```

**Key fact:** the sync is **insert-only and idempotent**. A lesson is identified by
`teacher + student + time + kind`; rows that already exist are skipped, and
existing rows are NEVER modified. Re-running is always safe — but corrections
made in the Excel *after* a lesson was imported will NOT update that lesson.

## One-time setup (already done — only needed on a new machine)

1. `python -m pip install tzdata` (Windows only; parser needs Europe/Rome)
2. Root `.env` with:
   ```
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service_role JWT — NOT the anon key>
   ```
3. Edge function deployed (from repo root):
   ```
   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."        # dashboard → Account → Access Tokens
   npx supabase functions deploy sync-lessons
   ```
4. SQL migrations applied in the dashboard SQL editor:
   - `supabase/migrations/202609180001_relax_lessons_for_sheet_sync.sql` (durations, nullable student, 19 kinds)
   - `supabase/migrations/202609200001_disable_rls_lessons.sql`

## Every new Excel — step by step

All commands run from `excel_sync/`. To load env vars in PowerShell first:

```powershell
Get-Content ..\.env | ForEach-Object { if ($_ -match '^([^#=]+)=(.*)$') { Set-Item -Path "env:$($matches[1])" -Value $matches[2].Trim() } }
```

### 1. Replace the workbook

Overwrite `GIORNALIERE FRANCO LADY.xlsx` in this folder (or drop a new file and
adjust `XLSX` in the Makefile / the name in `parser.py`'s last line).

### 2. Parse → CSV

```bash
make parse            # or: python parser.py
```

Check the printed summary (record count, date range) and `output/color_summary.csv`.

### 3. Transform → payload JSON

```bash
python transform.py --output output/payload.json                        # everything
python transform.py --kinds lesson,exam --output output/payload.json    # phase-1 scope only
python transform.py --date-from 2025-01-01 --date-to 2025-01-31 ...     # one month slice
```

### 4. Dry-run — always first, writes nothing

```powershell
curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/sync-lessons?dry_run=true" -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" --data "@output/payload.json"
```

Read the summary: `lessons_to_insert`, and especially `errors` — every
unresolved name becomes a NEW user on the real run, so check for people who
exist under a different spelling (duplicates).

### 5. Real run

Same command without `?dry_run=true`. For payloads of several thousand rows,
the edge function can hit its compute limit in one shot — run it **month by
month** instead (the function accepts `date_from` / `date_to`):

```powershell
$cur = Get-Date '2025-01-01'
while ($cur -le (Get-Date '2026-12-31')) {
  $from = $cur.ToString('yyyy-MM-01'); $to = $cur.AddMonths(1).AddDays(-1).ToString('yyyy-MM-dd')
  curl.exe -sS -X POST "$env:SUPABASE_URL/functions/v1/sync-lessons?date_from=$from&date_to=$to" -H "Authorization: Bearer $env:SUPABASE_SERVICE_ROLE_KEY" -H "Content-Type: application/json" --data "@output/payload.json"
  $cur = $cur.AddMonths(1)
}
```

(Also available: `make upload` + `make sync-lessons` via the Storage bucket —
the direct POST body used above skips Storage entirely.)

### 6. Verify

Re-run the dry-run: expect `lessons_to_insert: 0`. Or in SQL:

```sql
select count(*) from lessons;
```

## Reference

- `docs/keyword-reference.md` — every reserved keyword and how tasks are classified
- `docs/supabase-fastapi-sync-plan.md` — original design plan
- `docs/sync-implementation-status.md` — implementation status
- Edge function: `supabase/functions/sync-lessons/index.ts` (redeploy after changes)
- `output/` is gitignored — everything in it is regenerable with steps 2–3
