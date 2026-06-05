import { requireSupabase, supabase } from './supabase.js';

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword({ email, password }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

export function getUserRole(session) {
  return session?.user?.app_metadata?.role || session?.user?.user_metadata?.role || null;
}

export function getTenantId(session) {
  return session?.user?.app_metadata?.tenant_id || session?.user?.user_metadata?.tenant_id || null;
}
