import { useMemo, useState } from 'react';
import {
  Car, CalendarDays, CalendarCheck, ClipboardList, Clock,
  LayoutDashboard, Route, Settings,
  Shuffle, UserPlus, Users, LogOut, User, TrendingUp, Menu, X,
} from 'lucide-react';
import { Toast } from './ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { NAV_ITEMS, getNavItemsForRole } from '../lib/roleAccess.js';

export default function Layout({ page, navigate, lang, setLang, showToast, toast, t, children }) {
  const { session, role, full_name, logout, tenant } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white p-0 sm:p-5 text-ink">
      <div className="flex h-screen min-h-[620px] overflow-hidden border border-line bg-shell sm:h-[calc(100vh-40px)] sm:rounded-[10px]">
        <Sidebar
          page={page}
          navigate={navigate}
          t={t}
          role={role}
          full_name={full_name}
          logout={logout}
          mobileMenuOpen={mobileMenuOpen}
          setMobileMenuOpen={setMobileMenuOpen}
        />
        <main className="flex-1 overflow-y-auto">
          <TopHeader
            lang={lang}
            setLang={setLang}
            t={t}
            tenant={tenant}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
          />
          {children}
        </main>
      </div>
      <Toast message={toast} />
    </div>
  );
}

function Sidebar({ page, navigate, t, role, full_name, logout, mobileMenuOpen, setMobileMenuOpen }) {
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
    CalendarCheck,
    Clock,
    Users,
    UserPlus,
    ClipboardList,
    Settings,
    Route,
    Shuffle,
    User,
    TrendingUp,
  };

  const handleNavClick = (navPage) => {
    navigate(navPage);
    setMobileMenuOpen(false);
  };

  const handleProfileClick = () => {
    navigate('profile');
    setMobileMenuOpen(false);
  };

  const handleLogoutClick = () => {
    logout();
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <>
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
                onClick={() => handleNavClick(item.page)}
              >
                {Icon && <Icon size={16} />}
                <span className="flex-1 text-left">{t[item.page] || item.label}</span>
                {item.comingSoon && (
                  <span className="inline-flex rounded-full bg-[#6eb5f5] px-1.5 py-0.5 text-[10px] font-medium text-white">
                    Coming soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ))}

      <div className="flex-1" />
      <div className="m-3 flex flex-col gap-1">
        <button
          onClick={handleProfileClick}
          className="flex items-center gap-2.5 rounded-md bg-white/10 px-3 py-2.5 transition hover:bg-white/20"
        >
          <div className="grid size-8 place-items-center rounded-full bg-[#6eb5f5] text-xs font-medium text-brand">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="truncate text-xs font-medium text-white">{full_name || 'User'}</div>
            <div className="text-[11px] text-white/45 capitalize">{role || 'Guest'}</div>
          </div>
        </button>
        <button
          onClick={handleLogoutClick}
          className="flex items-center gap-2.5 rounded-md px-3 py-2 transition hover:bg-white/10 text-white/60 hover:text-white"
        >
          <LogOut size={16} />
          <span className="text-xs">Logout</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-[200px] shrink-0 flex-col bg-brand text-white md:flex">
        {sidebarContent}
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[260px] flex-col bg-brand text-white md:hidden shadow-xl">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}

function TopHeader({ lang, setLang, t, tenant, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-5 py-2.5">
      <div className="flex items-center gap-3">
        {/* Hamburger menu button - only shown on mobile */}
        <button
          className="md:hidden flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <span className="text-[15px] text-muted">
          {t.welcomeTo || 'Welcome to'}{' '}
          <span className="font-bold" style={{ color: '#1A3A5C' }}>{tenant?.name || t.appTitle}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <SegmentedLanguage lang={lang} setLang={setLang} t={t} />
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