# Sync pipeline: GIORNALIERE Excel → Supabase `lessons` (see supabase-fastapi-sync-plan.md)
#
# First-time setup:
#   1. Run the SQL in the plan's §2 (unique constraint + storage bucket).
#   2. cp .env.example .env   → fill in SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
#   3. supabase link --project-ref YOUR-REF && supabase functions deploy sync-lessons

SHELL := /bin/zsh
-include .env
export

XLSX     := GIORNALIERE FRANCO LADY.xlsx
PAYLOAD  := output/supabase_payload.json
FUNCTION := sync-lessons
ENDPOINT := $(SUPABASE_URL)/functions/v1/$(FUNCTION)

.PHONY: help parse transform upload dry-run sync-lessons sync slice

help:
	@echo "make parse          — run parser.py on the workbook"
	@echo "make transform      — master_data.csv → supabase_payload.json (+ report)"
	@echo "make upload         — upload payload to the sync-sources bucket"
	@echo "make dry-run        — invoke edge function with dry_run=true (writes nothing)"
	@echo "make sync-lessons   — real run: upsert into lessons"
	@echo "make sync           — transform + upload + real run"
	@echo "make slice FROM=2025-01-03 TO=2025-01-03 — transform a date slice"

parse:
	python3 parser.py

transform:
	python3 transform.py

slice:
	python3 transform.py --date-from $(FROM) --date-to $(TO)

upload:
	@curl -sS -X POST \
	  "$(SUPABASE_URL)/storage/v1/object/sync-sources/supabase_payload.json" \
	  -H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" \
	  -H "Content-Type: application/json" \
	  -H "x-upsert: true" \
	  --data-binary @$(PAYLOAD) | jq .

dry-run:
	@curl -sS -X POST "$(ENDPOINT)?dry_run=true" \
	  -H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" | jq .

sync-lessons:
	@curl -sS -X POST "$(ENDPOINT)" \
	  -H "Authorization: Bearer $(SUPABASE_SERVICE_ROLE_KEY)" | jq .

sync: transform upload sync-lessons