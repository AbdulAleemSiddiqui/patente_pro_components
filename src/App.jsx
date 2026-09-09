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
  const [lang,  setLang]  = useState('en');
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