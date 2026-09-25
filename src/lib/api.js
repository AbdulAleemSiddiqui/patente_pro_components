import { requireSupabase } from './supabase.js';

// PostgREST caps a single request at 1000 rows (Supabase default) — page at 1000.
const LESSONS_PAGE = 1000;

function byTenant(query, tenantId) {
  return tenantId ? query.eq('tenant_id', tenantId) : query;
}

export async function listUsers({ tenantId, role } = {}) {
  const client = requireSupabase();
  let query = client.from('users').select('*').order('full_name');
  query = byTenant(query, tenantId);
  if (role) query = query.eq('role', role);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateUser({ userId, fullName, phone, category, branch, isActive }) {
  const client = requireSupabase();

  // Update public.users table
  const updateData = {
    full_name: fullName,
    phone: phone || null,
  };
  if (category !== undefined) updateData.category = category || null;
  if (branch !== undefined) updateData.branch = branch || null;
  if (isActive !== undefined) updateData.is_active = isActive;

  const { data, error } = await client
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  // Also update auth metadata so the change reflects immediately
  const { error: authError } = await client.auth.updateUser({
    data: {
      full_name: fullName,
      phone: phone || null,
    },
  });

  if (authError) {
    console.warn('Failed to update auth metadata:', authError);
    // Don't throw - the main update succeeded
  }

  return data;
}

/**
 * Lightweight lesson fetch — names and (optionally) ratings only, never the
 * full nested feedback payload. Powers lists, counts and conflict checks.
 * Pass `limit`/`offset` for one server-side page; the result is then
 * { rows, count }, otherwise a plain array (all rows, paged internally).
 */
export async function listLessonsLite({
  tenantId, teacherId, studentId, status, kind, from, to,
  withRatings = false, limit, offset = 0,
} = {}) {
  const client = requireSupabase();
  const select = `id, status, scheduled_at, duration_minutes, student_id, teacher_id,
    teacher:users!lessons_teacher_id_fkey(full_name),
    student:users!lessons_student_id_fkey(full_name)
    ${
      withRatings
        ? ', feedback:lesson_feedback(general_rating, ratings:maneuver_ratings(rating, maneuver:maneuvers(name)))'
        : ', feedback:lesson_feedback(general_rating)'
    }`;

  const pageQuery = (rangeFrom, wantCount) => {
    let q = client
      .from('lessons')
      .select(select, wantCount ? { count: 'exact' } : undefined)
      // newest first; id as tiebreaker for stable range paging
      .order('scheduled_at', { ascending: false })
      .order('id');
    q = byTenant(q, tenantId);
    if (teacherId) q = q.eq('teacher_id', teacherId);
    if (studentId) q = q.eq('student_id', studentId);
    if (status) q = q.eq('status', status);
    if (kind) q = q.eq('kind', kind);
    if (from) q = q.gte('scheduled_at', from);
    if (to) q = q.lte('scheduled_at', to);
    const size = limit ?? LESSONS_PAGE;
    const start = limit !== undefined ? offset + rangeFrom : rangeFrom;
    return q.range(start, start + size - 1);
  };

  if (limit !== undefined) {
    const { data, error, count } = await pageQuery(0, true);
    if (error) throw error;
    return { rows: data ?? [], count: count ?? 0 };
  }

  // PostgREST silently caps single requests (Supabase default: 1000 rows) —
  // the sheet import puts thousands of lessons in this table, so page through.
  const all = [];
  for (let r = 0; ; r += LESSONS_PAGE) {
    const { data, error } = await pageQuery(r, false);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < LESSONS_PAGE) break;
  }
  return all;
}

/**
 * Lessons with their feedback (notes, general_rating, highway segments) and
 * maneuver ratings (with maneuver + parent type) nested in. Powers the
 * Progress page and the read-only lesson history view.
 */
export async function listLessonsWithFeedback({ tenantId, teacherId, studentId, lessonId } = {}) {
  const client = requireSupabase();
  const SELECT = `id, status, scheduled_at, duration_minutes, student_id, teacher_id,
    teacher:users!lessons_teacher_id_fkey(id, full_name),
    student:users!lessons_student_id_fkey(id, full_name),
    feedback:lesson_feedback(
      notes, general_rating,
      segments:lesson_feedback_highways(
        sort_order,
        from_highway:highways!lesson_feedback_highways_from_fkey(id, name),
        to_highway:highways!lesson_feedback_highways_to_fkey(id, name)
      ),
      ratings:maneuver_ratings(
        rating, maneuver_id,
        maneuver:maneuvers(id, name, order_index, type:maneuver_types(id, name, order_index))
      )
    )`;

  const pageQuery = (from) => {
    let q = client
      .from('lessons')
      .select(SELECT)
      // id as tiebreaker: stable order is required for range paging
      .order('scheduled_at')
      .order('id');
    q = byTenant(q, tenantId);
    if (teacherId) q = q.eq('teacher_id', teacherId);
    if (studentId) q = q.eq('student_id', studentId);
    if (lessonId) q = q.eq('id', lessonId);
    return q.range(from, from + LESSONS_PAGE - 1);
  };

  // PostgREST silently caps single requests (Supabase default: 1000 rows) —
  // the sheet import puts thousands of lessons in this table, so page through.
  const all = [];
  for (let from = 0; ; from += LESSONS_PAGE) {
    const { data, error } = await pageQuery(from);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < LESSONS_PAGE) break;
  }
  return all;
}

/**
 * List branch catalogs (label + color) for tenant
 */
export async function listBranches({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('branches').select('*').order('label');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createBranch({ tenantId, label, color }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('branches')
    .insert({ tenant_id: tenantId, label, color: color || '#2563eb' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBranch({ id, label, color }) {
  const client = requireSupabase();
  const updateData = {};
  if (label !== undefined) updateData.label = label;
  if (color !== undefined) updateData.color = color;
  const { data, error } = await client
    .from('branches')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBranch({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('branches').delete().eq('id', id);
  if (error) throw error;
}

/**
 * List category catalogs (label + color) for tenant
 */
export async function listCategories({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('categories').select('*').order('label');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createCategory({ tenantId, label, color }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('categories')
    .insert({ tenant_id: tenantId, label, color: color || '#1a3a5c' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('categories').delete().eq('id', id);
  if (error) throw error;
}

export async function getTenant({ tenantId } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.from('tenants').select('*').eq('id', tenantId).single();
  if (error) throw error;
  return data;
}

export async function updateTenant({ tenantId, name, logoUrl }) {
  const client = requireSupabase();
  const updateData = {};
  if (name !== undefined) updateData.name = name;
  // null clears the logo (back to the default icon)
  if (logoUrl !== undefined) updateData.logo_url = logoUrl;

  const { data, error } = await client
    .from('tenants')
    .update(updateData)
    .eq('id', tenantId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listManeuvers({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client
    .from('maneuvers')
    .select('*, type:maneuver_types(*)')
    .order('order_index');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listManeuverTypes({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('maneuver_types').select('*').order('order_index');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function updateManeuver({ id, name }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('maneuvers')
    .update({ name })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createManeuver({ tenantId, typeId, name }) {
  const client = requireSupabase();
  // Append after the last maneuver of the same type
  const { data: last, error: maxError } = await client
    .from('maneuvers')
    .select('order_index')
    .eq('tenant_id', tenantId)
    .eq('maneuver_type_id', typeId)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw maxError;

  const { data, error } = await client
    .from('maneuvers')
    .insert({
      tenant_id: tenantId,
      maneuver_type_id: typeId,
      name,
      order_index: (last?.order_index ?? 0) + 1,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteManeuver({ id }) {
  const client = requireSupabase();
  // Ratings cascade from the maneuver
  const { error } = await client.from('maneuvers').delete().eq('id', id);
  if (error) throw error;
}

export async function listErrorTags({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('error_tags').select('*').order('label');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listHighways({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('highways').select('*').order('name');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createHighway({ tenantId, name }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('highways')
    .insert({ tenant_id: tenantId, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHighway({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('highways').delete().eq('id', id);
  if (error) throw error;
}

export async function listExaminers({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('examiners').select('*').order('name');
  query = byTenant(query, tenantId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createExaminer({ tenantId, name, notes }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('examiners')
    .insert({ tenant_id: tenantId, name, notes: notes || '' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateExaminer({ id, name, notes }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('examiners')
    .update({ name, notes: notes || '' })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExaminer({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('examiners').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Server-side aggregates — keep the Progress and Database pages fast by
 * never downloading every lesson with its feedback payload.
 */
export async function getStudentProgressStats({ tenantId } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_student_progress', { p_tenant: tenantId });
  if (error) throw error;
  return data || [];
}

export async function getDashboardStats({ tenantId, day } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.rpc('get_dashboard_stats', {
    p_tenant: tenantId,
    p_day: day, // client-local date (YYYY-MM-DD)
  });
  if (error) throw error;
  return data || {};
}

export async function createLesson(payload) {
  const client = requireSupabase();
  const { data, error } = await client.from('lessons').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLesson({ id, scheduled_at, duration_minutes, teacher_id, student_id, status, kind }) {
  const client = requireSupabase();
  const updateData = {};
  if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
  if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
  if (student_id !== undefined) updateData.student_id = student_id;
  if (status !== undefined) updateData.status = status;
  if (kind !== undefined) updateData.kind = kind;

  const { data, error } = await client
    .from('lessons')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLesson({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('lessons').delete().eq('id', id);
  if (error) throw error;
}

export async function submitLessonFeedback({ feedback, highwaySegments, maneuverRatings, errorTagIds }) {
  const client = requireSupabase();

  // First check if feedback already exists for this lesson
  const { data: existingFeedback, error: checkError } = await client
    .from('lesson_feedback')
    .select('id')
    .eq('lesson_id', feedback.lesson_id)
    .maybeSingle();

  if (checkError) throw checkError;

  let savedFeedback;

  if (existingFeedback) {
    // Update existing feedback
    const { data, error: updateError } = await client
      .from('lesson_feedback')
      .update({
        notes: feedback.notes,
        general_rating: feedback.general_rating,
      })
      .eq('id', existingFeedback.id)
      .select()
      .single();

    if (updateError) throw updateError;
    savedFeedback = data;

    // Delete existing maneuver ratings for this feedback
    const { error: deleteError } = await client
      .from('maneuver_ratings')
      .delete()
      .eq('lesson_feedback_id', existingFeedback.id);

    if (deleteError) throw deleteError;
  } else {
    // Insert new feedback
    const { data, error: feedbackError } = await client
      .from('lesson_feedback')
      .insert(feedback)
      .select()
      .single();

    if (feedbackError) throw feedbackError;
    savedFeedback = data;
  }

  // Replace highway segments (delete + reinsert, same pattern as ratings)
  const { error: segDeleteError } = await client
    .from('lesson_feedback_highways')
    .delete()
    .eq('lesson_feedback_id', savedFeedback.id);
  if (segDeleteError) throw segDeleteError;

  const segments = (highwaySegments || [])
    .map((seg, index) => ({
      lesson_feedback_id: savedFeedback.id,
      from_highway_id: seg.from_highway_id || null,
      to_highway_id: seg.to_highway_id || null,
      sort_order: index,
    }))
    .filter((seg) => seg.from_highway_id || seg.to_highway_id);

  if (segments.length) {
    const { error: segError } = await client
      .from('lesson_feedback_highways')
      .insert(segments);
    if (segError) throw segError;
  }

  // Insert maneuver ratings
  if (maneuverRatings?.length) {
    const { error } = await client.from('maneuver_ratings').insert(
      maneuverRatings.map((rating) => ({
        ...rating,
        lesson_feedback_id: savedFeedback.id,
      })),
    );
    if (error) throw error;
  }

  if (errorTagIds?.length) {
    const { error } = await client.from('lesson_feedback_error_tags').insert(
      errorTagIds.map((error_tag_id) => ({
        lesson_feedback_id: savedFeedback.id,
        error_tag_id,
      })),
    );
    if (error) throw error;
  }

  // Mark the lesson as completed so it no longer appears in the loggable dropdown
  try {
    await client.from('lessons').update({ status: 'completed' }).eq('id', feedback.lesson_id);
  } catch (statusError) {
    // Feedback was saved; a status-update failure is non-fatal but should be logged
    console.error('Failed to mark lesson as completed:', statusError);
  }

  return savedFeedback;
}
