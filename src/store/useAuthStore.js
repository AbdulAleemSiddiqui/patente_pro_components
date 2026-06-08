import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getUserRole, getTenantId, signInWithPassword, signOut as signOutFromSupabase } from '../lib/auth.js';

const useAuthStore = create((set) => ({
  error: null,
  session: null,
  role: null,       // 'admin' | 'teacher' | 'student' | null
  tenantId: null,
  loading: true,

  init: async () => {
    if (!isSupabaseConfigured) {
      // Dev mode — mock an admin session so all screens are accessible
      set({ session: null, role: 'admin', tenantId: null, loading: false, error: null });
      return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      set({ loading: false, error });
      return;
    }

    set({
      session,
      role: getUserRole(session),
      tenantId: getTenantId(session),
      loading: false,
      error: null,
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        role: getUserRole(session),
        tenantId: getTenantId(session),
      });
    });
  },

  login: async ({ email, password }) => {
    set({ loading: true, error: null });

    if (!isSupabaseConfigured) {
      set({ session: null, role: 'admin', tenantId: null, loading: false, error: null });
      return;
    }

    try {
      const { data } = await signInWithPassword({ email, password });
      set({
        session: data.session,
        role: getUserRole(data.session),
        tenantId: getTenantId(data.session),
        loading: false,
        error: null,
      });
      return data;
    } catch (error) {
      set({ loading: false, error });
      throw error;
    }
  },

  logout: async () => {
    if (isSupabaseConfigured) {
      try {
        await signOutFromSupabase();
      } catch (error) {
        console.error('Supabase sign out failed', error);
      }
    }
    set({ session: null, role: null, tenantId: null, loading: false, error: null });
  },

  setSession: (session) => set({
    session,
    role: getUserRole(session),
    tenantId: getTenantId(session),
  }),

  clearSession: () => set({ session: null, role: null, tenantId: null, error: null }),
}));

export default useAuthStore;