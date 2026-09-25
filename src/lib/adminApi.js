import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.warn('VITE_SUPABASE_SERVICE_ROLE_KEY not found. Admin functions will not work.');
}

// Create admin client with service role key (bypasses RLS)
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Create a new user with auth + public.users record
 * This function uses the service role key to bypass RLS and create auth users
 *
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.password - Temporary password (user should change on first login)
 * @param {string} params.fullName - Display name
 * @param {string} params.phone - Optional phone number
 * @param {'teacher'|'student'} params.role - User role
 * @param {string} params.tenantId - Current tenant ID
 * @param {string} [params.category] - License category (students only)
 * @param {string} [params.branch] - Branch (students only)
 * @returns {Promise<{success: boolean, userId?: string, error?: string}>}
 */
export async function createUser({ email, password, fullName, phone, role, tenantId, category, branch }) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Service role key not configured' };
  }

  try {
    // Step 1: Create auth user (using admin API)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email (user can login immediately)
      user_metadata: {
        full_name: fullName,
        role,
        tenant_id: tenantId, // Store tenant_id in metadata for auth store
      },
      app_metadata: {
        role,
        tenant_id: tenantId, // Also store in app_metadata for RLS policies
      },
    });

    if (authError) {
      console.error('Auth user creation failed:', authError);
      return { success: false, error: authError.message };
    }

    const userId = authData.user.id;
    console.log('Auth user created:', userId);

    // Step 2: Create public.users record
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId, // This references auth.users.id
        tenant_id: tenantId,
        role,
        full_name: fullName,
        email,
        phone: phone || null,
        category: category || null,
        branch: branch || null,
        is_active: true,
      });

    if (userError) {
      console.error('Public user creation failed:', userError);
      // Cleanup auth user if public.users insert fails
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return { success: false, error: userError.message };
    }

    console.log('User created successfully:', { userId, email, role });
    return { success: true, userId };
  } catch (error) {
    console.error('Failed to create user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set a new password for a user (admin password reset)
 * Uses the service role key, so no email confirmation is needed
 *
 * @param {string} userId - User ID whose password changes
 * @param {string} password - New password (min 6 chars, Supabase default)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateUserPassword({ userId, password }) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Service role key not configured' };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });

    if (error) {
      return { success: false, error: error.message };
    }

    // Stamp public.users so the directory can show when it last changed
    const { error: stampError } = await supabaseAdmin
      .from('users')
      .update({ last_password_change: new Date().toISOString() })
      .eq('id', userId);
    if (stampError) {
      // Password was changed; the stamp is secondary — report success but log
      console.error('Failed to stamp last_password_change:', stampError);
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to update password:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a password reset email to a user
 * Use this when you want to invite users to set their own password
 *
 * @param {string} email - User email
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPasswordResetEmail(email) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Service role key not configured' };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a user (both auth.users and public.users)
 * The public.users entry will cascade delete due to the FK constraint
 *
 * @param {string} userId - User ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUser(userId) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Service role key not configured' };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to delete user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a user together with everything that references them.
 * lessons.teacher_id / student_id and swap_requests have no ON DELETE
 * cascade, so their rows must be removed first (feedback and maneuver
 * ratings cascade from lessons).
 *
 * @param {string} userId - User ID to delete
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteUserWithData({ userId }) {
  if (!supabaseAdmin) {
    return { success: false, error: 'Service role key not configured' };
  }

  try {
    // swap_requests reference users directly (no cascade)
    for (const column of ['requesting_teacher_id', 'target_teacher_id']) {
      const { error } = await supabaseAdmin
        .from('swap_requests')
        .delete()
        .eq(column, userId);
      if (error) return { success: false, error: error.message };
    }

    // lessons reference users directly; feedback/ratings cascade from lessons
    for (const column of ['student_id', 'teacher_id']) {
      const { error } = await supabaseAdmin
        .from('lessons')
        .delete()
        .eq(column, userId);
      if (error) return { success: false, error: error.message };
    }

    return deleteUser(userId);
  } catch (error) {
    console.error('Failed to delete user with data:', error);
    return { success: false, error: error.message };
  }
}
