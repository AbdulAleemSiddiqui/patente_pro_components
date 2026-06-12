import { useMemo } from 'react';
import {
  Bell, Car, CalendarDays, ClipboardList, Clock,
  LayoutDashboard, Plus, Route, Search, Settings,
  Shuffle, UserPlus, Users, LogOut, User,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase.js';
import { Badge, Button, IconButton, Toast } from './ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { NAV_ITEMS, getNavItemsForRole } from '../lib/roleAccess.js';

export default function Layout({ page, navigate, lang, setLang, showToast, toast, t, children }) {
  const { session, role, full_name, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-white p-0 sm:p-5 text-ink">
      <div className="flex h-screen min-h-[620px] overflow-hidden border border-line bg-shell sm:h-[calc(100vh-40px)] sm:rounded-[10px]">
        <Sidebar page={page} navigate={navigate} t={t} role={role} full_name={full_name} />
        <main className="flex-1 overflow-y-auto">
          <TopHeader
            lang={lang}
            setLang={setLang}
            navigate={navigate}
            showToast={showToast}
            t={t}
            session={session}
            role={role}
            full_name={full_name}
            logout={logout}
          />
          {children}
        </main>
      </div>
      <Toast message={toast} />
    </div>
  );
}

function Sidebar({ page, navigate, t, role, full_name }) {
  const sections = useMemo(() => {
    const allowedItems = getNavItemsForRole(role);

    return allowedItems.reduce((acc, item) => {
      if (!acc[item.section]) {
        acc[item.section] = [];
      }
      acc[item.section].push(item);
      return acc;
    }, {});
  }, [role]);

  // Get initials from full name
  const initials = full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';

  // Icon mapping
  const iconMap = {
    LayoutDashboard,
    CalendarDays,
    Clock,
    Users,
    UserPlus,
    ClipboardList,
    Settings,
    Route,
    Shuffle,
    User,
  };

  return (
    <aside className="hidden w-[200px] shrink-0 flex-col bg-brand text-white md:flex">
      <div className="border-b border-white/10 px-4 pb-3 pt-[18px]">
        <div className="flex items-center gap-2 text-[15px] font-medium">
          <Car size={17} />
          {t.appTitle}
        </div>
        <div className="mt-0.5 text-[11px] text-white/50">{t.appSubtitle}</div>
      </div>

      {Object.entries(sections).map(([section, items]) => (
        <div key={section}>
          <div className="pb-1 pl-3 pt-2.5 text-[10px] uppercase tracking-[0.8px] text-white/35">
            {t[section] || section}
          </div>
          {items.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <button
                key={item.page}
                className={`flex w-full items-center gap-2.5 border-l-2 px-4 py-2.5 text-left text-[13px] transition ${
                  page === item.page
                    ? 'border-[#6eb5f5] bg-white/10 text-white'
                    : 'border-transparent text-white/65 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => navigate(item.page)}
              >
                {Icon && <Icon size={16} />}
                {t[item.page] || item.label}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex-1" />
      <button
        onClick={() => navigate('profile')}
        className="m-3 flex w-full items-center gap-2.5 rounded-md bg-white/10 px-3 py-2.5 transition hover:bg-white/20"
      >
        <div className="grid size-8 place-items-center rounded-full bg-[#6eb5f5] text-xs font-medium text-brand">
          {initials}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="truncate text-xs font-medium text-white">{full_name || 'User'}</div>
          <div className="text-[11px] text-white/45 capitalize">{role || 'Guest'}</div>
        </div>
      </button>
    </aside>
  );
}

function TopHeader({ lang, setLang, navigate, showToast, t, session, role, full_name, logout }) {
  // Only show "New Lesson" button for admin and teacher roles
  const canCreateLesson = role === 'admin' || role === 'teacher';

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-2.5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
          size={15}
        />
        <input
          className="w-[200px] rounded-md border border-line bg-[#f5f5f5] py-2 pl-8 pr-3 text-[13px] outline-none focus:border-brand-mid"
          placeholder={t.search}
        />
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={isSupabaseConfigured ? 'green' : 'warn'}>
          {isSupabaseConfigured ? t.databaseConnected : t.databaseMock}
        </Badge>
        <SegmentedLanguage lang={lang} setLang={setLang} t={t} />
        <IconButton label="Notifications" onClick={() => showToast(t.notificationsNone)}>
          <Bell size={16} />
        </IconButton>
        {canCreateLesson && (
          <Button primary onClick={() => navigate('log')}>
            <Plus size={16} />
            {t.newLesson}
          </Button>
        )}
        {session && (
          <Button onClick={logout}>
            <LogOut size={16} />
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}

function SegmentedLanguage({ lang, setLang, t }) {
  return (
    <div className="flex rounded-full border border-line bg-white p-0.5" aria-label={t.language}>
      {['en', 'it'].map((code) => (
        <button
          key={code}
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            lang === code ? 'bg-brand text-white' : 'text-muted hover:text-ink'
          }`}
          onClick={() => setLang(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}