import { requireSupabase } from './supabase.js';

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

export async function updateUser({ userId, fullName, phone }) {
  const client = requireSupabase();

  // Update public.users table
  const { data, error } = await client
    .from('users')
    .update({
      full_name: fullName,
      phone: phone || null,
    })
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

export async function listLessons({ tenantId, teacherId, studentId } = {}) {
  const client = requireSupabase();
  let query = client
    .from('lessons')
    .select('*, teacher:users!lessons_teacher_id_fkey(*), student:users!lessons_student_id_fkey(*)')
    .order('scheduled_at');

  query = byTenant(query, tenantId);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Lessons with their feedback (notes, general_rating, highways) and maneuver
 * ratings (with maneuver + parent type) nested in. Powers the Progress page.
 */
export async function listLessonsWithFeedback({ tenantId, teacherId, studentId } = {}) {
  const client = requireSupabase();
  let query = client
    .from('lessons')
    .select(
      `id, status, scheduled_at, duration_minutes, student_id, teacher_id,
       teacher:users!lessons_teacher_id_fkey(id, full_name),
       student:users!lessons_student_id_fkey(id, full_name),
       feedback:lesson_feedback(
         notes, general_rating,
         from_highway:highways!lesson_feedback_from_highway_id_fkey(id, name),
         to_highway:highways!lesson_feedback_to_highway_id_fkey(id, name),
         ratings:maneuver_ratings(
           rating,
           maneuver:maneuvers(id, name, order_index, type:maneuver_types(id, name, order_index))
         )
       )`,
    )
    .order('scheduled_at');

  query = byTenant(query, tenantId);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * List teacher availability blocks for a date range
 */
export async function listTeacherAvailability({ tenantId, teacherId, from, to } = {}) {
  const client = requireSupabase();
  let query = client.from('teacher_availability').select('*').order('start_at');

  query = byTenant(query, tenantId);
  if (teacherId) query = query.eq('teacher_id', teacherId);
  if (from) query = query.gte('end_at', from);
  if (to) query = query.lte('start_at', to);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Create a new teacher availability block
 */
export async function createTeacherAvailability({ tenantId, teacherId, startAt, endAt }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('teacher_availability')
    .insert({ tenant_id: tenantId, teacher_id: teacherId, start_at: startAt, end_at: endAt })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a teacher availability block
 */
export async function deleteTeacherAvailability({ id }) {
  const client = requireSupabase();
  const { error } = await client.from('teacher_availability').delete().eq('id', id);
  if (error) throw error;
}

export async function getTenant({ tenantId } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.from('tenants').select('*').eq('id', tenantId).single();
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

export async function createLesson(payload) {
  const client = requireSupabase();
  const { data, error } = await client.from('lessons').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateLesson({ id, scheduled_at, duration_minutes, teacher_id, student_id, status }) {
  const client = requireSupabase();
  const updateData = {};
  if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at;
  if (duration_minutes !== undefined) updateData.duration_minutes = duration_minutes;
  if (teacher_id !== undefined) updateData.teacher_id = teacher_id;
  if (student_id !== undefined) updateData.student_id = student_id;
  if (status !== undefined) updateData.status = status;

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

export async function submitLessonFeedback({ feedback, maneuverRatings, errorTagIds }) {
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
        from_highway_id: feedback.from_highway_id ?? null,
        to_highway_id: feedback.to_highway_id ?? null,
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
