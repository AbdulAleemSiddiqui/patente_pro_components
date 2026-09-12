// Supabase Edge Function: sync-lessons
// Reads the JSON payload produced by transform.py (inline body, or from the
// private Storage bucket "sync-sources"), resolves teacher/student names
// against the tenant-scoped `users` table (get-or-create by case-insensitive
// full_name match + role), and inserts lessons that don't exist yet into
// `lessons` (natural key: teacher_id, student_id, scheduled_at, kind).
//
// Existing rows are NEVER modified: re-running is idempotent (inserts only
// new slots) and manual edits made in the app are preserved.
//
// Invoke (service role key required):
//   curl -X POST "https://<ref>.supabase.co/functions/v1/sync-lessons" \
//        -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
//
// Query params:
//   dry_run=true          resolve + validate only, write nothing
//   path=<storage path>   default: supabase_payload.json
//   date_from=YYYY-MM-DD  inclusive lower bound on scheduled_at date
//   date_to=YYYY-MM-DD    inclusive upper bound on scheduled_at date
//   tenant=<uuid>         overrides the default tenant id
//
// Alternatively POST the payload directly as the JSON body (skips Storage) —
// handy for local testing:  --data @output/supabase_payload.json

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const USERS_TABLE = "users";
const LESSONS_TABLE = "lessons";
const BUCKET = "sync-sources";
const INSERT_CHUNK = 500;
const FETCH_PAGE = 1000;
// Autoscuola Franco (the single tenant in this project); override with the
// `tenant` query param or SYNC_TENANT_ID env var if that ever changes.
const DEFAULT_TENANT_ID = "22222222-2222-2222-2222-222222222222";

interface PayloadRow {
  teacher_name: string;
  student_name: string | null;
  scheduled_at: string; // ISO with offset
  duration_minutes: number;
  status: string;
  kind: string;
  task?: string;
}

interface Payload {
  generated_at?: string;
  date_from?: string;
  date_to?: string;
  rows_read?: number;
  lessons: PayloadRow[];
}

/** Natural-key string for a lesson row (epoch ms so UTC/offset forms agree). */
function keyOf(t: string, s: string | null, at: string, kind: string): string {
  return `${t}|${s ?? ""}|${new Date(at).getTime()}|${kind}`;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const dryRun = ["1", "true", "yes"].includes(
    (url.searchParams.get("dry_run") ?? "").toLowerCase(),
  );
  const storagePath = url.searchParams.get("path") ?? "supabase_payload.json";
  const dateFrom = url.searchParams.get("date_from");
  const dateTo = url.searchParams.get("date_to");
  const tenantId =
    url.searchParams.get("tenant") ??
    Deno.env.get("SYNC_TENANT_ID") ??
    DEFAULT_TENANT_ID;

  // --- Auth check: only the service role key may call this -----------------
  // Accepts either the runtime env key (legacy JWT or new sb_secret_*) or any
  // service_role JWT (its signature is already verified by the platform).
  const auth = req.headers.get("Authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const isServiceToken = (t: string): boolean => {
    if (!t) return false;
    if (serviceKey && t === serviceKey) return true;
    try {
      const payload = JSON.parse(
        atob(t.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      );
      return payload?.role === "service_role";
    } catch {
      return false;
    }
  };
  if (!isServiceToken(token)) {
    return json({ error: "unauthorized: service role key required" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    serviceKey || token,
    { auth: { persistSession: false } },
  );

  const errors: string[] = [];

  try {
    // --- 1. Obtain the payload (inline body) or from Storage ---------------
    let payload: Payload;
    if (req.method === "POST" && req.headers.get("content-type")?.includes("application/json")) {
      const body = JSON.parse(await req.text());
      payload = Array.isArray(body) ? { lessons: body } : body;
      if (!Array.isArray(payload.lessons)) {
        return json({ error: "payload.lessons must be an array" }, 400);
      }
    } else {
      const { data, error } = await supabase.storage.from(BUCKET).download(storagePath);
      if (error) {
        return json(
          { error: `storage download failed for ${BUCKET}/${storagePath}: ${error.message}` },
          404,
        );
      }
      payload = JSON.parse(await data.text());
      if (!Array.isArray(payload.lessons)) {
        return json({ error: "payload.lessons must be an array" }, 400);
      }
    }

    // --- 2. Date filters ----------------------------------------------------
    let rows = payload.lessons;
    if (dateFrom) rows = rows.filter((r) => r.scheduled_at.slice(0, 10) >= dateFrom);
    if (dateTo) rows = rows.filter((r) => r.scheduled_at.slice(0, 10) <= dateTo);

    // --- 3. Resolve teachers & students (get-or-create in `users`) ---------
    const isStr = (v: string | null): v is string => typeof v === "string" && v.length > 0;
    const teacherNames = [...new Set(rows.map((r) => r.teacher_name).filter(isStr))];
    const studentNames = [...new Set(rows.map((r) => r.student_name).filter(isStr))];

    const teacherId = await resolveUsers(supabase, tenantId, "teacher", teacherNames, errors, dryRun);
    const studentId = await resolveUsers(supabase, tenantId, "student", studentNames, errors, dryRun);

    // --- 4. Map rows onto lessons rows (deduped by natural key) ------------
    const lessonRows = new Map<string, Record<string, unknown>>();
    for (const r of rows) {
      const t_id = teacherId.get(r.teacher_name);
      if (!t_id) {
        errors.push(`unresolved teacher: ${r.teacher_name} @ ${r.scheduled_at}`);
        continue;
      }
      const s_id = r.student_name ? (studentId.get(r.student_name) ?? null) : null;
      if (r.student_name && !s_id) {
        errors.push(`unresolved student: ${r.student_name} @ ${r.scheduled_at}`);
      }
      lessonRows.set(keyOf(t_id, s_id, r.scheduled_at, r.kind), {
        tenant_id: tenantId,
        teacher_id: t_id,
        student_id: s_id,
        scheduled_at: r.scheduled_at,
        duration_minutes: r.duration_minutes,
        status: r.status,
        kind: r.kind,
      });
    }

    // --- 5. Fetch existing lessons' keys within the payload's time window --
    let existingKeys = new Set<string>();
    if (lessonRows.size > 0) {
      const times = rows.map((r) => new Date(r.scheduled_at).getTime());
      const from = new Date(Math.min(...times)).toISOString();
      const to = new Date(Math.max(...times)).toISOString();
      existingKeys = await fetchExistingKeys(supabase, tenantId, from, to, errors);
    }
    const toInsert = [...lessonRows.entries()]
      .filter(([k]) => !existingKeys.has(k))
      .map(([, v]) => v);

    const summary = {
      dry_run: dryRun,
      tenant_id: tenantId,
      rows_total: payload.lessons.length,
      rows_selected: rows.length,
      lessons_planned: lessonRows.size,
      lessons_already_present: lessonRows.size - toInsert.length,
      lessons_to_insert: toInsert.length,
      teachers_total: teacherNames.length,
      students_total: studentNames.length,
      errors,
      sample: toInsert.slice(0, 10),
    };
    if (dryRun) return json(summary, 200);

    // --- 6. Insert the missing lessons in chunks ---------------------------
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += INSERT_CHUNK) {
      const chunk = toInsert.slice(i, i + INSERT_CHUNK);
      const { error } = await supabase.from(LESSONS_TABLE).insert(chunk);
      if (error) {
        errors.push(`insert chunk ${i / INSERT_CHUNK}: ${error.message}`);
      } else {
        inserted += chunk.length;
      }
    }

    return json({ ...summary, lessons_inserted: inserted }, errors.length ? 207 : 200);
  } catch (err) {
    return json({ error: `unexpected failure: ${(err as Error).message ?? String(err)}` }, 500);
  }
});

/**
 * Get-or-create people in the `users` table for one role, scoped to the
 * tenant. Matching is case-insensitive on full_name. Missing names are
 * inserted with a fresh UUID (unless dryRun, which uses placeholders).
 */
async function resolveUsers(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  role: string,
  names: string[],
  errors: string[],
  dryRun: boolean,
): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  if (names.length === 0) return ids;

  const sameName = (a: string, b: string) =>
    a.localeCompare(b, "en", { sensitivity: "base" }) === 0;

  // fetch current users of this role/tenant (paged)
  const existing: { id: string; full_name: string }[] = [];
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select("id,full_name")
      .eq("role", role)
      .eq("tenant_id", tenantId)
      .order("id")
      .range(from, from + FETCH_PAGE - 1) as { data: { id: string; full_name: string }[] | null; error: { message: string } | null };
    if (error) {
      errors.push(`${USERS_TABLE}(${role}) fetch failed: ${error.message}`);
      return ids;
    }
    existing.push(...(data ?? []));
    if (!data || data.length < FETCH_PAGE) break;
  }
  for (const u of existing) {
    if (!u.full_name) continue; // null names can never match
    const match = names.find((n) => sameName(n, u.full_name));
    if (match) ids.set(match, u.id);
  }

  const missing = names.filter((n) => !ids.has(n));
  if (missing.length === 0) return ids;

  if (dryRun) {
    for (const n of missing) ids.set(n, `new_${role}_${slug(n)}`); // placeholder, never written
    return ids;
  }

  // users.id references auth.users, so each new person needs an auth user
  // first (Auth Admin API), then a public.users profile with that same id.
  // Placeholder emails are unique (@sync.local) and can be replaced later.
  const AUTH_CONCURRENCY = 20;
  type Created = { name: string; id: string; email: string; err: string | null };
  const authUsers: Created[] = [];
  for (let i = 0; i < missing.length; i += AUTH_CONCURRENCY) {
    const batch = missing.slice(i, i + AUTH_CONCURRENCY);
    const results = await Promise.all(batch.map(async (name): Promise<Created> => {
      const email = `${slug(name)}.${crypto.randomUUID().slice(0, 8)}@sync.local`;
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name, tenant_role: role, source: "sheet-sync" },
      });
      return {
        name,
        id: data?.user?.id ?? "",
        email,
        err: error ? `${name}: ${error.message}` : null,
      };
    }));
    authUsers.push(...results);
  }
  const failures = authUsers.filter((u) => u.err).map((u) => u.err!);
  if (failures.length > 0) {
    errors.push(
      `auth user creation (${role}) failed: ${failures.slice(0, 5).join("; ")}` +
        (failures.length > 5 ? ` (+${failures.length - 5} more)` : ""),
    );
  }
  const ready = authUsers.filter((u) => !u.err && u.id);
  if (ready.length === 0) return ids;

  const { data: created, error: insertErr } = await supabase
    .from(USERS_TABLE)
    .insert(
      ready.map((u) => ({
        id: u.id,
        tenant_id: tenantId,
        role,
        full_name: u.name,
        email: u.email,
        is_active: true,
      })),
    )
    .select("id,full_name");
  if (insertErr) {
    errors.push(`${USERS_TABLE}(${role}) insert failed for [${ready.map((u) => u.name).join(", ")}]: ${insertErr.message}`);
    return ids;
  }
  for (const u of created ?? []) {
    const match = missing.find((n) => sameName(n, u.full_name));
    if (match) ids.set(match, u.id);
  }
  return ids;
}

/** All existing lesson natural keys (epoch-based) in [from, to] for a tenant. */
async function fetchExistingKeys(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  fromIso: string,
  toIso: string,
  errors: string[],
): Promise<Set<string>> {
  const keys = new Set<string>();
  for (let from = 0; ; from += FETCH_PAGE) {
    const { data, error } = await supabase
      .from(LESSONS_TABLE)
      .select("teacher_id,student_id,scheduled_at,kind")
      .eq("tenant_id", tenantId)
      .gte("scheduled_at", fromIso)
      .lte("scheduled_at", toIso)
      .order("scheduled_at", { ascending: true })
      .range(from, from + FETCH_PAGE - 1);
    if (error) {
      errors.push(`lessons fetch failed: ${error.message}`);
      break;
    }
    for (const r of data ?? []) {
      keys.add(keyOf(r.teacher_id, r.student_id, r.scheduled_at, r.kind));
    }
    if (!data || data.length < FETCH_PAGE) break;
  }
  return keys;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "_");
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}