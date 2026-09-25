import { useEffect, useMemo, useState } from 'react';
import { Search, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  Badge, Button, Card, Page, PageHeader, ProgressBar,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listBranches, getStudentProgressStats, listLessonsLite } from '../lib/api.js';

// Client-side page size for the student table
const PAGE_SIZE = 25;

function fmtDateTime(iso) {
  try {
    return format(parseISO(iso), 'dd/MM/yyyy · HH:mm');
  } catch {
    return format(new Date(iso), 'dd/MM/yyyy · HH:mm');
  }
}

// Overall stats stay top-level; clicking a student expands their lesson list,
// and picking a feedback-done lesson opens the read-only Log Lessons view.
// Stats come from the get_student_progress SQL function — no heavy payloads.
export default function StudentsPage({ t, navigate }) {
  const { tenantId } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [progressByStudent, setProgressByStudent] = useState({});
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0); // 0-based, client-side
  const [loading, setLoading] = useState(true);

  // Selected student + their lesson list (fetched on selection)
  const [selectedId, setSelectedId] = useState(null);
  const [studentLessons, setStudentLessons] = useState([]);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const [studentData, branchData, progressData] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listBranches({ tenantId }),
          getStudentProgressStats({ tenantId }),
        ]);
        setStudents(studentData || []);
        setBranches(branchData || []);
        const map = {};
        for (const row of progressData || []) {
          map[row.student_id] = row;
        }
        setProgressByStudent(map);
      } catch (error) {
        console.error('Failed to load students', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // Load the selected student's lessons (light query, newest first)
  useEffect(() => {
    if (!selectedId || !tenantId) {
      setStudentLessons([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingLessons(true);
      try {
        const rows = await listLessonsLite({ tenantId, studentId: selectedId });
        if (!cancelled) setStudentLessons(rows || []);
      } catch (error) {
        console.error('Failed to load student lessons', error);
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedId, tenantId]);

  const toggleStudent = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
  };

  const openLessonHistory = (lesson) => {
    sessionStorage.setItem('viewLesson', JSON.stringify({ lessonId: lesson.id }));
    navigate('log');
  };

  const branchColor = (label) => branches.find((b) => b.label === label)?.color;

  // Map the 1–3 rating average onto 0–100 (same formula as before, applied to
  // the server-computed average)
  const percentOf = (row) =>
    row?.avg_rating == null ? null : Math.round(((Number(row.avg_rating) - 1) / 2) * 100);

  // Filter by name or phone, case-insensitive
  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.full_name?.toLowerCase().includes(q) ||
        s.phone?.toLowerCase().includes(q),
    );
  }, [students, query]);

  // Reset to the first page whenever the search narrows the list
  useEffect(() => { setPage(0); }, [query]);

  const pageCount = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const pageStudents = filteredStudents.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">{t.loading}</div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={t.students} subtitle={t.studentsSub} />

      {/* Student table — capped at ~4 rows (scroll for more); horizontal scroll on mobile */}
      <Card>
        {/* Search box */}
        <div className="border-b border-line p-3">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search}
              className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-brand"
            />
          </div>
        </div>
        <div className="max-h-[300px] overflow-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-line bg-white text-left text-[11px] uppercase tracking-wide text-muted">
                <th className="px-4 py-2 font-medium">{t.student}</th>
                <th className="px-4 py-2 font-medium">{t.totalLessons}</th>
                <th className="px-4 py-2 font-medium">{t.completed}</th>
                <th className="px-4 py-2 font-medium">{t.pending}</th>
                <th className="px-4 py-2 font-medium">{t.progress}</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted">{t.studentsNotFound}</td>
                </tr>
              ) : (
                pageStudents.map((s) => {
                  const stats = progressByStudent[s.id] || {};
                  const percent = percentOf(stats);
                  const isSelected = selectedId === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => toggleStudent(s.id)}
                      className={`cursor-pointer border-b border-line last:border-0 transition hover:bg-[#fafafa] ${
                        isSelected ? 'bg-brand-light' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={branchColor(s.branch) ? { color: branchColor(s.branch) } : undefined}
                        >
                          {s.full_name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-muted">{s.phone || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{Number(stats.total) || 0}</td>
                      <td className="px-4 py-3 text-success">{Number(stats.completed) || 0}</td>
                      <td className="px-4 py-3 text-warn">{Number(stats.pending) || 0}</td>
                      <td className="px-4 py-3">
                        {percent == null ? (
                          <span className="text-[11px] text-muted">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ProgressBar
                              percent={percent}
                              tone={percent >= 67 ? 'good' : percent >= 34 ? 'warn' : ''}
                            />
                            <span className="w-9 text-[11px] text-muted">{percent}%</span>
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

        {/* Pager — client-side slice of the loaded students */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
          <span>
            {t.showingRange
              .replace('{from}', filteredStudents.length === 0 ? 0 : page * PAGE_SIZE + 1)
              .replace('{to}', Math.min((page + 1) * PAGE_SIZE, filteredStudents.length))
              .replace('{total}', filteredStudents.length)}
          </span>
          <div className="flex gap-2">
            <Button small disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t.prev}
            </Button>
            <Button small disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
              {t.next}
            </Button>
          </div>
        </div>
      </Card>

      {/* Selected student's lesson list → pick a feedback-done lesson for the read-only view */}
      {selectedId && (
        <Card
          title={`${students.find((s) => s.id === selectedId)?.full_name || ''} — ${t.lessons}`}
          action={
            <button onClick={() => setSelectedId(null)} className="text-xs text-muted hover:text-ink">
              {t.close}
            </button>
          }
        >
          {loadingLessons ? (
            <div className="px-4 py-8 text-center text-sm text-muted">{t.loadingDots}</div>
          ) : studentLessons.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted">{t.noLessonsLogged}</div>
          ) : (
            <div className="max-h-[320px] overflow-auto">
              {studentLessons.map((lesson) => {
                const done = lesson.status === 'completed';
                const cancelled = lesson.status === 'cancelled';
                return (
                  <button
                    key={lesson.id}
                    disabled={!done}
                    onClick={() => openLessonHistory(lesson)}
                    className={`flex w-full items-center justify-between border-b border-line px-4 py-2.5 text-[13px] transition last:border-b-0 ${
                      done ? 'hover:bg-[#fafafa]' : 'cursor-default opacity-70'
                    }`}
                  >
                    <span className={cancelled ? 'line-through text-muted' : 'font-medium'}>
                      {fmtDateTime(lesson.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-2">
                      {done ? (
                        <>
                          <Badge tone="green">{t.feedbackDone}</Badge>
                          <Eye size={14} className="text-muted" />
                        </>
                      ) : cancelled ? (
                        <Badge tone="muted">{t.cancelled}</Badge>
                      ) : (
                        <Badge tone="warn">{t.feedbackPending}</Badge>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </Page>
  );
}
