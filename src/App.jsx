import { useState } from 'react';
import Layout from './components/Layout.jsx';
import DashboardPage    from './pages/DashboardPage.jsx';
import StudentsPage     from './pages/StudentsPage.jsx';
import LessonLogPage    from './pages/LessonLogPage.jsx';
import SettingsPage     from './pages/SettingsPage.jsx';
import { StudentsAdminPage, TeachersPage } from './pages/UserDirectoryPages.jsx';
import LessonsAdminPage from './pages/LessonsAdminPage.jsx';
import ExaminersPage    from './pages/ExaminersPage.jsx';
import ProfilePage      from './pages/ProfilePage.jsx';
import StudentProgressPage from './pages/StudentProgressPage.jsx';
import en from './translations/en.json';
import it from './translations/it.json';
import useAuthStore from './store/useAuthStore.js';
import { canAccessPage } from './lib/roleAccess.js';

const COPY = { en, it };

export default function App() {
  const { role } = useAuthStore();
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

  // Central role guard: the sidebar hides pages a role can't use, but direct
  // navigations (e.g. a back button) must not land on them either.
  const navigate = (nextPage) => {
    if (role && !canAccessPage(role, nextPage)) {
      showToast(t.accessDenied);
      return;
    }
    setPage(nextPage);
  };

  const pageProps = { navigate, showToast, t, lang };

  return (
    <Layout page={page} navigate={navigate} lang={lang} setLang={setLang} showToast={showToast} toast={toast} t={t}>
      {page === 'students'          && <StudentsPage     {...pageProps} />}
      {page === 'log'                && <LessonLogPage    {...pageProps} />}
      {page === 'settings'           && <SettingsPage     {...pageProps} />}
      {page === 'studentsAdmin'      && <StudentsAdminPage {...pageProps} />}
      {page === 'teachers'           && <TeachersPage     {...pageProps} />}
      {page === 'lessonsAdmin'       && <LessonsAdminPage {...pageProps} />}
      {page === 'examiners'          && <ExaminersPage    {...pageProps} />}
      {page === 'profile'            && <ProfilePage      {...pageProps} />}
      {page === 'progress'           && <StudentProgressPage {...pageProps} />}
      {page === 'student_progress'    && <StudentProgressPage {...pageProps} />}
      {!['students','log','settings','studentsAdmin','teachers','lessonsAdmin','examiners','profile','progress','student_progress'].includes(page) && (
        <DashboardPage {...pageProps} />
      )}
    </Layout>
  );
}