import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Card, Page, PageHeader, Stars,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listLessonsWithFeedback } from '../lib/api.js';

// Map general_rating (poor/fair/good) onto a 1–5 star scale for display/averaging
const RATING_VALUE = { poor: 1, fair: 3, good: 5 };

function avgGeneralRating(lessons) {
  const vals = lessons
    .map((l) => l.feedback?.general_rating)
    .filter((r) => r && RATING_VALUE[r] != null)
    .map((r) => RATING_VALUE[r]);
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// Per-student summary derived from their lessons
function summarize(lessons) {
  const active = lessons.filter((l) => l.status !== 'cancelled');
  const completed = active.filter((l) => l.status === 'completed');
  const pending = active.filter((l) => l.status === 'scheduled');
  return {
    total: active.length,
    completed: completed.length,
    pending: pending.length,
    avg: avgGeneralRating(completed),
  };
}

function fmtLesson(iso) {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy · HH:mm');
  } catch {
    return format(new Date(iso), 'dd/MM/yyyy · HH:mm');
  }
}

// Average maneuver ratings grouped by their parent type (FASE 1 / FASE 2 / …)
// NB: maneuver_ratings.rating is text ('poor'|'fair'|'good'), mapped to 1/3/5.
// `feedback` is a single object (lesson_feedback.lesson_id is UNIQUE → to-one).
function tipologiaAverages(feedback) {
  const ratings = feedback?.ratings || [];
  const byType = {};
  for (const r of ratings) {
    const type = r.maneuver?.type;
    const val = RATING_VALUE[r.rating];
    if (!type || val == null) continue;
    const key = type.name;
    (byType[key] ||= { name: type.name, order: type.order_index ?? 99, sum: 0, count: 0 });
    byType[key].sum += val;
    byType[key].count += 1;
  }
  return Object.values(byType)
    .map((g) => ({ name: g.name, order: g.order, avg: g.sum / g.count }))
    .sort((a, b) => a.order - b.order);
}

export default function StudentsPage({ t }) {
  const { tenantId } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const [studentData, lessonData] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listLessonsWithFeedback({ tenantId }),
        ]);
        setStudents(studentData || []);
        setLessons(lessonData || []);
      } catch (error) {
        console.error('Failed to load students', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // lessons grouped by student id
  const lessonsByStudent = useMemo(() => {
    const map = {};
    for (const l of lessons) {
      (map[l.student_id] ||= []).push(l);
    }
    return map;
  }, [lessons]);

  const selected = students.find((s) => s.id === selectedId) || null;

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">Loading…</div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={t.students} subtitle={t.studentsSub} />

      {/* Student table — horizontally scrollable so columns are preserved on mobile */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">{t.student}</th>
                <th className="px-4 py-2 font-medium">{t.totalLessons}</th>
                <th className="px-4 py-2 font-medium">{t.completed}</th>
                <th className="px-4 py-2 font-medium">{t.pending}</th>
                <th className="px-4 py-2 font-medium">{t.progress}</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">No students found</td>
                </tr>
              ) : (
                students.map((s) => {
                  const stats = summarize(lessonsByStudent[s.id] || []);
                  const isActive = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setSelectedId(s.id)}
                      className={`cursor-pointer border-b border-line last:border-0 transition hover:bg-[#fafafa] ${
                        isActive ? 'bg-[#f0f6ff]' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.full_name}</div>
                        <div className="mt-0.5 text-[11px] text-muted">{s.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{stats.total}</td>
                      <td className="px-4 py-3 text-success">{stats.completed}</td>
                      <td className="px-4 py-3 text-warn">{stats.pending}</td>
                      <td className="px-4 py-3">
                        {stats.avg == null ? (
                          <span className="text-[11px] text-muted">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Stars value={Math.round(stats.avg)} readonly />
                            <span className="text-[11px] text-muted">{stats.avg.toFixed(1)}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inline detail panel — appears below the list when a student is selected */}
      {selected && (
        <StudentDetail
          student={selected}
          lessons={lessonsByStudent[selected.id] || []}
          t={t}
          onClose={() => setSelectedId(null)}
        />
      )}
    </Page>
  );
}

function StudentDetail({ student, lessons, t, onClose }) {
  // Logged lessons (completed / have feedback), most recent first
  const logged = useMemo(
    () => lessons
      .filter((l) => l.status === 'completed' || l.feedback)
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)),
    [lessons],
  );

  const [activeLessonId, setActiveLessonId] = useState(null);
  const active = logged.find((l) => l.id === activeLessonId) || logged[0] || null;

  return (
    <Card
      title={`${student.full_name} — ${t.profileDetail}`}
      action={
        <button onClick={onClose} className="text-xs text-muted hover:text-ink">Close</button>
      }
    >
      <div className="flex flex-col md:flex-row">
        {/* Left: scrollable lesson list */}
        <aside className="w-full shrink-0 border-b border-line bg-[#fafafa] md:w-1/4 md:border-b-0 md:border-r lg:w-1/5">
          <div className="px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted">
            {t.lessons}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {logged.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted">{t.noLessonsLogged}</div>
            ) : (
              logged.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setActiveLessonId(l.id)}
                  className={`block w-full border-l-2 px-3 py-2 text-left text-xs transition ${
                    active?.id === l.id
                      ? 'border-brand bg-white font-medium text-ink'
                      : 'border-transparent text-muted hover:bg-white/60'
                  }`}
                >
                  {fmtLesson(l.scheduled_at)}
                </button>
              ))
            )}
          </div>
        </aside>

        {/* Right: feedback detail */}
        <section className="min-w-0 flex-1 p-4">
          {!active ? (
            <div className="py-12 text-center text-sm text-muted">{t.selectLesson}</div>
          ) : (
            <LessonFeedback lesson={active} t={t} />
          )}
        </section>
      </div>
    </Card>
  );
}

function LessonFeedback({ lesson, t }) {
  const feedback = lesson.feedback || null;

  if (!feedback) {
    return <div className="py-12 text-center text-sm text-muted">{t.noFeedback}</div>;
  }

  const ratingVal = RATING_VALUE[feedback.general_rating] ?? 0;
  const tipologie = tipologiaAverages(lesson.feedback);

  return (
    <div className="space-y-5">
      {/* General rating */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.generalRating}</div>
        <div className="flex items-center gap-2">
          <Stars value={ratingVal} readonly />
          <span className="text-xs capitalize text-muted">{feedback.general_rating || '—'}</span>
        </div>
      </div>

      {/* Notes */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.instructorNotes}</div>
        <div className="rounded-md border border-line bg-[#fafafa] p-3 text-sm">
          {feedback.notes ? feedback.notes : <span className="text-muted">—</span>}
        </div>
      </div>

      {/* Tipologia */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.tipologia}</div>
        <div className="space-y-1.5">
          {tipologie.length === 0 ? (
            <div className="text-sm text-muted">—</div>
          ) : (
            tipologie.map((g) => (
              <div key={g.name} className="flex items-center justify-between gap-3 text-sm">
                <span>{g.name}</span>
                <div className="flex items-center gap-2">
                  <Stars value={Math.round(g.avg)} readonly />
                  <span className="w-7 text-[11px] text-muted">{g.avg.toFixed(1)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Autostrada */}
      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">{t.autostradaSection}</div>
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-muted">{t.fromLabel}: </span>
            <span className="font-medium">{feedback.from_highway?.name || '—'}</span>
          </div>
          <div>
            <span className="text-muted">{t.toLabel}: </span>
            <span className="font-medium">{feedback.to_highway?.name || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
