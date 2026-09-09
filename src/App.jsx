import { useState } from 'react';
import Layout from './components/Layout.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import StudentsPage     from './pages/StudentsPage.jsx';
import LessonLogPage    from './pages/LessonLogPage.jsx';
import SettingsPage     from './pages/SettingsPage.jsx';
import UsersPage        from './pages/UsersPage.jsx';
import SchedulePage     from './pages/SchedulePage.jsx';
import LessonsAdminPage from './pages/LessonsAdminPage.jsx';
import ProfilePage      from './pages/ProfilePage.jsx';
import StudentProgressPage from './pages/StudentProgressPage.jsx';
import en from './translations/en.json';
import it from './translations/it.json';

const COPY = { en, it };

export default function App() {
  const [page,  setPage]  = useState('dashboard');
  // Language preference persists across visits (localStorage is safest here —
  // the app has no per-user profile field for it and RLS/db changes aren't wanted).
  const [lang,  setLangState] = useState(() => {
    try { return localStorage.getItem('lang') === 'it' ? 'it' : 'en'; } catch { return 'en'; }
  });
  const setLang = (next) => {
    setLangState(next);
    try { localStorage.setItem('lang', next); } catch { /* private mode etc. — ignore */ }
  };
  const [toast, setToast] = useState('');
  const t = COPY[lang];

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast._timer);
    showToast._timer = window.setTimeout(() => setToast(''), 2500);
  };

  const navigate = (nextPage) => setPage(nextPage);

  const pageProps = { navigate, showToast, t, lang };

  return (
    <Layout page={page} navigate={navigate} lang={lang} setLang={setLang} showToast={showToast} toast={toast} t={t}>
      {page === 'students'          && <StudentsPage     {...pageProps} />}
      {page === 'log'                && <LessonLogPage    {...pageProps} />}
      {page === 'settings'           && <SettingsPage     {...pageProps} />}
      {page === 'users'              && <UsersPage        {...pageProps} />}
      {page === 'schedule'           && <SchedulePage     {...pageProps} />}
      {page === 'lessonsAdmin'       && <LessonsAdminPage {...pageProps} />}
      {page === 'profile'            && <ProfilePage      {...pageProps} />}
      {page === 'progress'           && <StudentProgressPage {...pageProps} />}
      {page === 'student_progress'    && <StudentProgressPage {...pageProps} />}
      {!['students','log','settings','users','schedule','lessonsAdmin','profile','progress','student_progress'].includes(page) && (
        <DashboardPage {...pageProps} />
      )}
    </Layout>
  );
}