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

export async function listTeacherAvailability({ teacherId } = {}) {
  const client = requireSupabase();
  let query = client.from('teacher_availability').select('*').order('day_of_week').order('start_time');
  if (teacherId) query = query.eq('teacher_id', teacherId);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

/**
 * Set weekly availability for a teacher
 * Replaces all existing availability with the new set
 */
export async function setTeacherWeeklyAvailability({ teacherId, availability }) {
  const client = requireSupabase();

  // First, delete existing availability for this teacher
  const { error: deleteError } = await client
    .from('teacher_availability')
    .delete()
    .eq('teacher_id', teacherId);

  if (deleteError) throw deleteError;

  // Insert new availability slots
  if (availability && availability.length > 0) {
    const { error: insertError } = await client
      .from('teacher_availability')
      .insert(
        availability.map(slot => ({
          teacher_id: teacherId,
          day_of_week: slot.dayOfWeek,
          start_time: slot.startTime,
          end_time: slot.endTime,
        }))
      );

    if (insertError) throw insertError;
  }

  return { success: true };
}

/**
 * Get availability grouped by day for a teacher
 */
export async function getTeacherWeeklyAvailability({ teacherId }) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('teacher_availability')
    .select('*')
    .eq('teacher_id', teacherId)
    .order('day_of_week')
    .order('start_time');

  if (error) throw error;

  // Group by day of week
  const grouped = (data || []).reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) {
      acc[slot.day_of_week] = [];
    }
    acc[slot.day_of_week].push({
      startTime: slot.start_time,
      endTime: slot.end_time,
    });
    return acc;
  }, {});

  return grouped;
}

export async function getTenant({ tenantId } = {}) {
  const client = requireSupabase();
  const { data, error } = await client.from('tenants').select('*').eq('id', tenantId).single();
  if (error) throw error;
  return data;
}

export async function listRouteTypesForTenant({ tenantId } = {}) {
  const client = requireSupabase();
  const tenant = await getTenant({ tenantId });
  const { data, error } = await client
    .from('route_types')
    .select('*, route_sub_types(*)')
    .eq('city_id', tenant.city_id)
    .order('name');

  if (error) throw error;
  return data;
}

export async function listManeuvers({ tenantId } = {}) {
  const client = requireSupabase();
  let query = client.from('maneuvers').select('*').order('order_index');
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
