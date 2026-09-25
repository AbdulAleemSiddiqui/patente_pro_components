import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, X, Eye } from 'lucide-react';
import {
  Badge, Button, Card, Field, Page, PageHeader, fieldClass, Combobox,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listUsers, listLessonsLite, listBranches, createLesson, updateLesson, deleteLesson,
} from '../lib/api.js';

// Only 1-hour and 2-hour lessons are bookable from this page.
const DURATIONS = [60, 120];

// Server-side page size for the lessons table
const PAGE_SIZE = 25;

// Bookable start hours (no minute selection — lessons start on the hour)
const HOUR_OPTIONS = [];
for (let h = 6; h <= 22; h += 1) HOUR_OPTIONS.push(`${String(h).padStart(2, '0')}:00`);

// Label supported lengths as hours; any legacy duration (edit flow) as minutes
const durationLabel = (d, t) =>
  d === 60 ? t.durationHour : d === 120 ? t.duration2Hours : `${d} min`;

function fmtDateTime(iso) {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'dd MMM yyyy, HH:mm');
  } catch {
    return format(new Date(iso), 'dd MMM yyyy, HH:mm');
  }
}

const emptyLesson = () => ({
  id: null,
  teacherId: '',
  studentId: '',
  date: '',
  hour: '09:00',
  duration_minutes: 60,
  kind: 'lesson',
});

const statusTone = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
};

export default function LessonsAdminPage({ showToast, t, navigate }) {
  const { tenantId } = useAuthStore();

  const [lessons, setLessons] = useState([]); // current page (server-side)
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0); // 0-based
  const [allSlots, setAllSlots] = useState([]); // light: teacher conflict checks
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lessonModal, setLessonModal] = useState(null); // null | lesson draft

  // List filters: student / teacher / date (client request 2026-09-23)
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const hasFilters = !!(filterStudent || filterTeacher || filterDate);

  // Reference data (small) + the light slot list for conflict checks
  const loadData = async () => {
    try {
      if (!tenantId) {
        setLoading(false);
        return;
      }
      const [teacherData, studentData, slotData, branchData] = await Promise.all([
        listUsers({ tenantId, role: 'teacher' }),
        listUsers({ tenantId, role: 'student' }),
        // teacher_id + times only — kept light so conflict checks stay fast
        listLessonsLite({ tenantId }),
        listBranches({ tenantId }),
      ]);
      setTeachers(teacherData || []);
      setStudents(studentData || []);
      setAllSlots(slotData || []);
      setBranches(branchData || []);
    } catch (error) {
      console.error('Failed to load lessons', error);
      showToast(t.laFailedLoad.replace('{error}', error.message));
    } finally {
      setLoading(false);
    }
  };

  // One server-side page of lessons with the active filters applied in the query
  const loadLessonPage = async () => {
    try {
      const filters = { tenantId, limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (filterStudent) filters.studentId = filterStudent;
      if (filterTeacher) filters.teacherId = filterTeacher;
      if (filterDate) {
        const [y, m, d] = filterDate.split('-').map(Number);
        // local calendar day → UTC instants for the timestamptz range
        filters.from = new Date(y, m - 1, d).toISOString();
        filters.to = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
      }
      const { rows, count } = await listLessonsLite(filters);
      setLessons(rows);
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to load lessons', error);
      showToast(t.laFailedLoad.replace('{error}', error.message));
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) loadLessonPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, page, filterStudent, filterTeacher, filterDate]);

  const changeFilter = (setter) => (value) => {
    setPage(0); // any filter change restarts paging
    setter(value);
  };

  // Branch color for a student name (branches managed in Settings)
  const branchColorOf = (studentId) => {
    const branch = students.find((s) => s.id === studentId)?.branch;
    return branches.find((b) => b.label === branch)?.color;
  };

  // "Feedback done" = lesson completed (feedback submit flips the status);
  // "pending" = still scheduled. Cancelled lessons never receive feedback.
  const feedbackDone = (lesson) => lesson.status === 'completed';

  const viewLessonHistory = (lesson) => {
    sessionStorage.setItem('viewLesson', JSON.stringify({ lessonId: lesson.id }));
    navigate('log');
  };

  // ── Lesson handlers ──────────────────────────────────────────────────────
  const openCreateLesson = () => setLessonModal(emptyLesson());

  const openEditLesson = (lesson) => {
    const d = new Date(lesson.scheduled_at);
    const pad = (n) => String(n).padStart(2, '0');
    const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setLessonModal({
      id: lesson.id,
      teacherId: lesson.teacher_id,
      studentId: lesson.student_id,
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      // Legacy lessons may start off the hour — hourOptions() keeps that exact time selectable
      hour: hhmm,
      duration_minutes: lesson.duration_minutes,
      kind: lesson.kind || 'lesson',
    });
  };

  // Hour options for the picker: standard hours plus the lesson's own
  // (possibly off-the-hour) start time when editing
  const hourOptions = () => {
    const opts = [...HOUR_OPTIONS];
    if (lessonModal?.hour && !opts.includes(lessonModal.hour)) {
      opts.push(lessonModal.hour);
      opts.sort();
    }
    return opts;
  };

  // Compose the local ISO instant from date + hour (no minutes/seconds)
  const startAtISO = (draft) => new Date(`${draft.date}T${draft.hour}:00`).toISOString();

  // Teachers are assumed available 24/7 (client model, 2026-09-24) — the only
  // conflict is another engagement at the same time (lesson, ferie, …).
  const getAvailableTeachersForSlot = () => {
    const draft = lessonModal;
    if (!draft || !draft.date || !draft.duration_minutes || !draft.studentId) return [];

    const slotStart = new Date(`${draft.date}T${draft.hour}:00`).getTime();
    const slotEnd = slotStart + Number(draft.duration_minutes) * 60000;

    return teachers.filter((teacher) => {
      const hasConflict = allSlots.some((lesson) => {
        if (lesson.teacher_id !== teacher.id || lesson.status === 'cancelled') return false;
        if (draft.id && lesson.id === draft.id) return false; // skip self when editing
        const lStart = new Date(lesson.scheduled_at).getTime();
        const lEnd = lStart + lesson.duration_minutes * 60000;
        return slotStart < lEnd && slotEnd > lStart;
      });
      return !hasConflict;
    });
  };

  const prerequisitesMet = !!(lessonModal?.date && lessonModal?.duration_minutes && lessonModal?.studentId);
  const availableTeachers = getAvailableTeachersForSlot();

  // When editing a legacy lesson whose duration is outside DURATIONS, keep that
  // value visible in the dropdown so the form doesn't silently change it on save.
  const durationOptions = [
    ...new Set([Number(lessonModal?.duration_minutes), ...DURATIONS].filter(Boolean)),
  ].sort((a, b) => a - b);

  const saveLesson = async () => {
    const draft = lessonModal;
    if (!draft.date) return showToast(t.laSelectStart);
    if (!draft.duration_minutes) return showToast(t.laSelectDuration);
    if (!draft.studentId) return showToast(t.laSelectStudent);
    if (!draft.teacherId) return showToast(t.laSelectTeacher);

    // Final guard: the chosen teacher must still be free for this slot
    const available = getAvailableTeachersForSlot();
    if (!available.some((tc) => tc.id === draft.teacherId)) {
      return showToast(t.laTeacherUnavailable);
    }

    try {
      const payload = {
        teacher_id: draft.teacherId,
        student_id: draft.studentId,
        scheduled_at: startAtISO(draft),
        duration_minutes: Number(draft.duration_minutes),
        kind: draft.kind || 'lesson',
      };

      if (draft.id) {
        await updateLesson({ id: draft.id, ...payload });
        showToast(t.laLessonUpdated);
      } else {
        await createLesson({ tenant_id: tenantId, ...payload });
        showToast(t.laLessonCreated);
      }
      setLessonModal(null);
      await Promise.all([loadData(), loadLessonPage()]);
    } catch (error) {
      console.error('Failed to save lesson', error);
      showToast(t.laFailedSave.replace('{error}', error.message));
    }
  };

  const removeLesson = async (id) => {
    if (!confirm(t.laConfirmDeleteLesson)) return;
    try {
      await deleteLesson({ id });
      showToast(t.laLessonDeleted);
      await Promise.all([loadData(), loadLessonPage()]);
    } catch (error) {
      console.error('Failed to delete lesson', error);
      showToast(t.laFailedDelete.replace('{error}', error.message));
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">{t.loading}</div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t.lessonsAdminTitle}
        subtitle={t.lessonsAdminSub}
        action={
          <Button primary onClick={openCreateLesson}>
            <Plus size={16} />
            {t.add}
          </Button>
        }
      />

      <Card>
        {/* Filters: student / teacher / date */}
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-3">
          <div className="min-w-[160px] flex-1">
            <Field label={t.student}>
              <Combobox
                value={filterStudent}
                onChange={changeFilter(setFilterStudent)}
                options={students.map((s) => ({ value: s.id, label: s.full_name }))}
                placeholder={t.laSelectStudentPlaceholder}
              />
            </Field>
          </div>
          <div className="min-w-[160px] flex-1">
            <Field label={t.teacher}>
              <select
                className={fieldClass}
                value={filterTeacher}
                onChange={(e) => changeFilter(setFilterTeacher)(e.target.value)}
              >
                <option value="">{t.laSelectTeacherPlaceholder}</option>
                {teachers.map((tc) => (
                  <option key={tc.id} value={tc.id}>{tc.full_name}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="w-[160px]">
            <Field label={t.date}>
              <input
                type="date"
                className={fieldClass}
                value={filterDate}
                onChange={(e) => changeFilter(setFilterDate)(e.target.value)}
              />
            </Field>
          </div>
          {hasFilters && (
            <Button
              small
              onClick={() => { setPage(0); setFilterStudent(''); setFilterTeacher(''); setFilterDate(''); }}
            >
              <X size={14} />
              {t.clearFilters}
            </Button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-2.5 font-medium">{t.student}</th>
                <th className="px-4 py-2.5 font-medium">{t.teacher}</th>
                <th className="px-4 py-2.5 font-medium">{t.date} & {t.time}</th>
                <th className="px-4 py-2.5 font-medium">{t.duration}</th>
                <th className="px-4 py-2.5 font-medium">{t.laKind}</th>
                <th className="px-4 py-2.5 font-medium">{t.feedback}</th>
                <th className="px-4 py-2.5 font-medium text-right">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {lessons.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-muted">
                    {hasFilters ? t.laNoLessonsForFilters : t.noLessonsAdmin}
                  </td>
                </tr>
              ) : (
                lessons.map((lesson) => (
                  <tr key={lesson.id} className="border-b border-line last:border-0 hover:bg-[#fafafa]">
                    <td
                      className="px-4 py-2.5"
                      style={branchColorOf(lesson.student_id) ? { color: branchColorOf(lesson.student_id) } : undefined}
                    >
                      {lesson.student?.full_name || '—'}
                    </td>
                    <td className="px-4 py-2.5">{lesson.teacher?.full_name || '—'}</td>
                    <td className="px-4 py-2.5">{fmtDateTime(lesson.scheduled_at)}</td>
                    <td className="px-4 py-2.5">{durationLabel(lesson.duration_minutes, t)}</td>
                    <td className="px-4 py-2.5">
                      <Badge tone={lesson.kind === 'simulation' ? 'warn' : 'blue'}>
                        {lesson.kind === 'simulation' ? t.laKindSimulation : t.laKindLesson}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      {lesson.status === 'cancelled' ? (
                        <Badge tone="muted">{t.cancelled}</Badge>
                      ) : feedbackDone(lesson) ? (
                        <Badge tone="green">{t.feedbackDone}</Badge>
                      ) : (
                        <Badge tone="warn">{t.feedbackPending}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {feedbackDone(lesson) && (
                          <button
                            onClick={() => viewLessonHistory(lesson)}
                            className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-ink"
                            title={t.viewHistory}
                          >
                            <Eye size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => openEditLesson(lesson)}
                          className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-ink"
                          title={t.edit}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => removeLesson(lesson.id)}
                          className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                          title={t.laDelete}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pager — server-side, one page of PAGE_SIZE rows at a time */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
          <span>
            {t.showingRange
              .replace('{from}', totalCount === 0 ? 0 : page * PAGE_SIZE + 1)
              .replace('{to}', Math.min((page + 1) * PAGE_SIZE, totalCount))
              .replace('{total}', totalCount)}
          </span>
          <div className="flex gap-2">
            <Button small disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t.prev}
            </Button>
            <Button
              small
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage((p) => p + 1)}
            >
              {t.next}
            </Button>
          </div>
        </div>
      </Card>

      {/* Lesson modal */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{lessonModal.id ? t.laEditLesson : t.add}</h2>
              <button onClick={() => setLessonModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t.date} *`}>
                  <input
                    type="date"
                    className={fieldClass}
                    value={lessonModal.date}
                    onChange={(e) => setLessonModal({ ...lessonModal, date: e.target.value, teacherId: '' })}
                  />
                </Field>

                <Field label={`${t.time} *`}>
                  {/* Hours only — lessons always start on the hour */}
                  <select
                    className={fieldClass}
                    value={lessonModal.hour}
                    onChange={(e) => setLessonModal({ ...lessonModal, hour: e.target.value, teacherId: '' })}
                  >
                    {hourOptions().map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label={`${t.duration} *`}>
                  <select
                    className={fieldClass}
                    value={lessonModal.duration_minutes}
                    onChange={(e) => setLessonModal({ ...lessonModal, duration_minutes: e.target.value, teacherId: '' })}
                  >
                    {durationOptions.map((d) => (
                      <option key={d} value={d}>{durationLabel(d, t)}</option>
                    ))}
                  </select>
                </Field>

                <Field label={`${t.student} *`}>
                  <Combobox
                    value={lessonModal.studentId}
                    onChange={(v) => setLessonModal({ ...lessonModal, studentId: v, teacherId: '' })}
                    options={students.map((s) => ({ value: s.id, label: s.full_name }))}
                    placeholder={t.laSelectStudentPlaceholder}
                  />
                </Field>
              </div>

              <Field label={`${t.laKind}`}>
                <select
                  className={fieldClass}
                  value={lessonModal.kind || 'lesson'}
                  onChange={(e) => setLessonModal({ ...lessonModal, kind: e.target.value })}
                >
                  <option value="lesson">{t.laKindLesson}</option>
                  <option value="simulation">{t.laKindSimulation}</option>
                </select>
              </Field>

              <Field label={`${t.teacher} *`}>
                <select
                  className={`${fieldClass} disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed`}
                  value={lessonModal.teacherId}
                  onChange={(e) => setLessonModal({ ...lessonModal, teacherId: e.target.value })}
                  disabled={!prerequisitesMet}
                >
                  <option value="">
                    {!prerequisitesMet
                      ? t.laSelectDateFirst
                      : availableTeachers.length === 0
                        ? t.laNoTeachersAvailable
                        : t.laSelectTeacherPlaceholder}
                  </option>
                  {availableTeachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.full_name}</option>
                  ))}
                </select>
                {prerequisitesMet && availableTeachers.length === 0 && (
                  <p className="text-xs text-orange-600 mt-1">{t.laNoTeachersForSlot}</p>
                )}
                {prerequisitesMet && availableTeachers.length > 0 && availableTeachers.length < teachers.length && (
                  <p className="text-xs text-muted mt-1">
                    {t.laShowingTeachers.replace('{shown}', availableTeachers.length).replace('{total}', teachers.length)}
                  </p>
                )}
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => setLessonModal(null)}>{t.cancel}</Button>
                <Button primary onClick={saveLesson}>{lessonModal.id ? t.edit : t.add}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
