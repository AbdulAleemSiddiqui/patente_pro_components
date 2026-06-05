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

export async function listTeacherAvailability({ teacherId } = {}) {
  const client = requireSupabase();
  let query = client.from('teacher_availability').select('*').order('day_of_week').order('start_time');
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function listRoutesForCity(cityId) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('route_types')
    .select('*, route_sub_types(*)')
    .eq('city_id', cityId)
    .order('name');

  if (error) throw error;
  return data;
}

export async function createLesson(payload) {
  const client = requireSupabase();
  const { data, error } = await client.from('lessons').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function submitLessonFeedback({ feedback, maneuverRatings, errorTagIds }) {
  const client = requireSupabase();
  const { data: savedFeedback, error: feedbackError } = await client
    .from('lesson_feedback')
    .insert(feedback)
    .select()
    .single();

  if (feedbackError) throw feedbackError;

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

  return savedFeedback;
}
