import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase.js';
import { getUserRole, getTenantId, signInWithPassword, signOut as signOutFromSupabase, updateUserMetadata } from '../lib/auth.js';
import { getTenant } from '../lib/api.js';

const useAuthStore = create((set, get) => ({
  error: null,
  session: null,
  role: null,       // 'admin' | 'teacher' | 'student' | null
  tenantId: null,
  tenant: null,     // tenant row { name, logo_url, theme_color, ... }
  full_name: null,  // User's full name from public.users
  loading: true,

  init: async () => {
    if (!isSupabaseConfigured) {
      // Dev mode — mock an admin session so all screens are accessible
      set({ session: null, role: 'admin', tenantId: null, full_name: 'Demo Admin', loading: false, error: null });
      return;
    }

    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      set({ loading: false, error });
      return;
    }

    let tenantId = getTenantId(session);
    const role = getUserRole(session);
    let full_name = session?.user?.user_metadata?.full_name;

    // If tenant_id is missing from metadata, fetch it from public.users
    if (!tenantId && session?.user?.id) {
      try {
        const client = supabase;
        const { data: userData, error: userError } = await client
          .from('users')
          .select('tenant_id, role')
          .eq('id', session.user.id)
          .single();

        if (!userError && userData) {
          tenantId = userData.tenant_id;

          // Update user metadata with tenant_id for future logins
          await updateUserMetadata({
            tenantId,
            role: role || userData.role,
          });

          // Refresh session to get updated metadata
          const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();

          set({
            session: refreshedSession,
            role,
            tenantId,
            full_name: refreshedSession?.user?.user_metadata?.full_name,
            loading: false,
            error: null,
          });

          get().loadTenant(tenantId);

          supabase.auth.onAuthStateChange((_event, newSession) => {
            set({
              session: newSession,
              role: getUserRole(newSession),
              tenantId: getTenantId(newSession),
            });
          });

          return;
        }
      } catch (fetchError) {
        console.error('Failed to fetch tenant_id from database:', fetchError);
      }
    }

    set({
      session,
      role,
      tenantId,
      full_name,
      loading: false,
      error: null,
    });

    get().loadTenant(tenantId);

    supabase.auth.onAuthStateChange((_event, session) => {
      set({
        session,
        role: getUserRole(session),
        tenantId: getTenantId(session),
        full_name: session?.user?.user_metadata?.full_name,
      });
    });
  },

  login: async ({ email, password }) => {
    set({ loading: true, error: null });

    if (!isSupabaseConfigured) {
      set({ session: null, role: 'admin', tenantId: null, full_name: 'Demo Admin', loading: false, error: null });
      return;
    }

    try {
      const { data } = await signInWithPassword({ email, password });
      let tenantId = getTenantId(data.session);
      const role = getUserRole(data.session);
      const full_name = data.session?.user?.user_metadata?.full_name;

      // If tenant_id is missing from metadata, fetch it from public.users
      if (!tenantId && data.session?.user?.id) {
        try {
          const client = supabase;
          const { data: userData, error: userError } = await client
            .from('users')
            .select('tenant_id, role')
            .eq('id', data.session.user.id)
            .single();

          if (!userError && userData) {
            tenantId = userData.tenant_id;

            // Update user metadata with tenant_id for future logins
            await updateUserMetadata({
              tenantId,
              role: role || userData.role,
            });

            // Refresh session to get updated metadata
            const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
            data.session = refreshedSession;
          }
        } catch (fetchError) {
          console.error('Failed to fetch tenant_id from database:', fetchError);
        }
      }

      set({
        session: data.session,
        role,
        tenantId,
        full_name,
        loading: false,
        error: null,
      });

      get().loadTenant(tenantId);

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
    set({ session: null, role: null, tenantId: null, full_name: null, loading: false, error: null });
  },

  setSession: (session) => set({
    session,
    role: getUserRole(session),
    tenantId: getTenantId(session),
    full_name: session?.user?.user_metadata?.full_name,
  }),

  setTenant: (tenant) => set({ tenant }),

  // Fetch the tenant row (school name, logo, theme) so the navbar/sidebar/settings can use it.
  loadTenant: async (tenantIdArg) => {
    const tid = tenantIdArg || get().tenantId;
    if (!tid || !isSupabaseConfigured) return;
    try {
      const data = await getTenant({ tenantId: tid });
      set({ tenant: data });
    } catch (error) {
      console.error('Failed to load tenant', error);
    }
  },

  clearSession: () => set({ session: null, role: null, tenantId: null, tenant: null, full_name: null, error: null }),
}));

export default useAuthStore;