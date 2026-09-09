import { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  Badge, Button, Card, Field, Page, PageHeader, fieldClass,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listUsers, listLessons, createLesson, updateLesson, deleteLesson,
  listTeacherAvailability, createTeacherAvailability, deleteTeacherAvailability,
} from '../lib/api.js';

// Only 1-hour and 2-hour lessons are bookable from this page for now.
const DURATIONS = [60, 120];

// Label supported lengths as hours; any legacy duration (edit flow) as minutes
const durationLabel = (d, t) =>
  d === 60 ? t.durationHour : d === 120 ? t.duration2Hours : `${d} min`;

// Format an ISO date for a datetime-local input (YYYY-MM-DDTHH:mm), local time
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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
  startAt: '',
  duration_minutes: 60,
});

const emptyAvailability = () => ({ teacherId: '', startAt: '', endAt: '' });

const statusTone = {
  scheduled: 'blue',
  completed: 'green',
  cancelled: 'red',
};

export default function LessonsAdminPage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [tab, setTab] = useState('lessons');

  const [lessons, setLessons] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lessonModal, setLessonModal] = useState(null); // null | lesson draft
  const [availModal, setAvailModal] = useState(null); // null | availability draft

  const nameById = (list, id) => list.find((u) => u.id === id)?.full_name || '—';

  const loadData = async () => {
    try {
      if (!tenantId) {
        setLoading(false);
        return;
      }
      const [lessonData, availData, teacherData, studentData] = await Promise.all([
        listLessons({ tenantId }),
        listTeacherAvailability({ tenantId }),
        listUsers({ tenantId, role: 'teacher' }),
        listUsers({ tenantId, role: 'student' }),
      ]);
      setLessons(lessonData || []);
      setAvailability(availData || []);
      setTeachers(teacherData || []);
      setStudents(studentData || []);
    } catch (error) {
      console.error('Failed to load lessons/availability', error);
      showToast(t.laFailedLoad.replace('{error}', error.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const sortedLessons = [...lessons].sort(
    (a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at),
  );
  const sortedAvailability = [...availability].sort(
    (a, b) => new Date(b.start_at) - new Date(a.start_at),
  );

  // ── Lesson handlers ──────────────────────────────────────────────────────
  const openCreateLesson = () => setLessonModal(emptyLesson());

  const openEditLesson = (lesson) => {
    setLessonModal({
      id: lesson.id,
      teacherId: lesson.teacher_id,
      studentId: lesson.student_id,
      startAt: toLocalInput(lesson.scheduled_at),
      duration_minutes: lesson.duration_minutes,
    });
  };

  // Only teachers who (a) have availability covering the whole slot and
  // (b) have no conflicting lesson are pickable. Requires date + duration + student first.
  const getAvailableTeachersForSlot = () => {
    const draft = lessonModal;
    if (!draft || !draft.startAt || !draft.duration_minutes || !draft.studentId) return [];

    const slotStart = new Date(draft.startAt).getTime();
    const slotEnd = slotStart + Number(draft.duration_minutes) * 60000;

    return teachers.filter((teacher) => {
      const hasAvailability = availability.some((avail) => {
        if (avail.teacher_id !== teacher.id) return false;
        return new Date(avail.start_at).getTime() <= slotStart
          && new Date(avail.end_at).getTime() >= slotEnd;
      });
      if (!hasAvailability) return false;

      const hasConflict = lessons.some((lesson) => {
        if (lesson.teacher_id !== teacher.id || lesson.status === 'cancelled') return false;
        if (draft.id && lesson.id === draft.id) return false; // skip self when editing
        const lStart = new Date(lesson.scheduled_at).getTime();
        const lEnd = lStart + lesson.duration_minutes * 60000;
        return slotStart < lEnd && slotEnd > lStart;
      });
      return !hasConflict;
    });
  };

  const prerequisitesMet = !!(lessonModal?.startAt && lessonModal?.duration_minutes && lessonModal?.studentId);
  const availableTeachers = getAvailableTeachersForSlot();

  // When editing a legacy lesson whose duration is outside DURATIONS, keep that
  // value visible in the dropdown so the form doesn't silently change it on save.
  const durationOptions = [
    ...new Set([Number(lessonModal?.duration_minutes), ...DURATIONS].filter(Boolean)),
  ].sort((a, b) => a - b);

  const saveLesson = async () => {
    const draft = lessonModal;
    if (!draft.startAt) return showToast(t.laSelectStart);
    if (!draft.duration_minutes) return showToast(t.laSelectDuration);
    if (!draft.studentId) return showToast(t.laSelectStudent);
    if (!draft.teacherId) return showToast(t.laSelectTeacher);

    // Final guard: the chosen teacher must still be available for this slot
    const available = getAvailableTeachersForSlot();
    if (!available.some((tc) => tc.id === draft.teacherId)) {
      return showToast(t.laTeacherUnavailable);
    }

    try {
      const payload = {
        teacher_id: draft.teacherId,
        student_id: draft.studentId,
        scheduled_at: new Date(draft.startAt).toISOString(),
        duration_minutes: Number(draft.duration_minutes),
        // status is auto-computed by the backend
      };

      if (draft.id) {
        await updateLesson({ id: draft.id, ...payload });
        showToast(t.laLessonUpdated);
      } else {
        await createLesson({ tenant_id: tenantId, ...payload });
        showToast(t.laLessonCreated);
      }
      setLessonModal(null);
      await loadData();
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
      await loadData();
    } catch (error) {
      console.error('Failed to delete lesson', error);
      showToast(t.laFailedDelete.replace('{error}', error.message));
    }
  };

  // ── Availability handlers ────────────────────────────────────────────────
  const openCreateAvailability = () => setAvailModal(emptyAvailability());

  const saveAvailability = async () => {
    const draft = availModal;
    if (!draft.teacherId) return showToast(t.laSelectTeacher);
    if (!draft.startAt || !draft.endAt) return showToast(t.laSelectStartEnd);
    if (new Date(draft.endAt) <= new Date(draft.startAt)) {
      return showToast(t.laEndAfterStart);
    }

    try {
      await createTeacherAvailability({
        tenantId,
        teacherId: draft.teacherId,
        startAt: new Date(draft.startAt).toISOString(),
        endAt: new Date(draft.endAt).toISOString(),
      });
      showToast(t.laAvailabilityAdded);
      setAvailModal(null);
      await loadData();
    } catch (error) {
      console.error('Failed to save availability', error);
      showToast(t.laFailedSave.replace('{error}', error.message));
    }
  };

  const removeAvailability = async (id) => {
    if (!confirm(t.laConfirmDeleteAvailability)) return;
    try {
      await deleteTeacherAvailability({ id });
      showToast(t.laAvailabilityDeleted);
      await loadData();
    } catch (error) {
      console.error('Failed to delete availability', error);
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
          tab === 'lessons' ? (
            <Button primary onClick={openCreateLesson}>
              <Plus size={16} />
              {t.addLesson}
            </Button>
          ) : (
            <Button primary onClick={openCreateAvailability}>
              <Plus size={16} />
              {t.addAvailability}
            </Button>
          )
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex rounded-md border border-line bg-white p-0.5 w-fit">
        {[
          { key: 'lessons', label: t.tabLessons },
          { key: 'availability', label: t.tabAvailability },
        ].map((tb) => (
          <button
            key={tb.key}
            type="button"
            onClick={() => setTab(tb.key)}
            className={`px-4 py-1.5 text-[13px] rounded transition ${
              tab === tb.key ? 'bg-brand text-white' : 'text-muted hover:text-ink'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {tab === 'lessons' ? (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">{t.student}</th>
                  <th className="px-4 py-2.5 font-medium">{t.teacher}</th>
                  <th className="px-4 py-2.5 font-medium">{t.date} & {t.time}</th>
                  <th className="px-4 py-2.5 font-medium">{t.duration}</th>
                  <th className="px-4 py-2.5 font-medium">{t.status}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedLessons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted">
                      {t.noLessonsAdmin}
                    </td>
                  </tr>
                ) : (
                  sortedLessons.map((lesson) => (
                    <tr key={lesson.id} className="border-b border-line last:border-0 hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5">{nameById(students, lesson.student_id)}</td>
                      <td className="px-4 py-2.5">{nameById(teachers, lesson.teacher_id)}</td>
                      <td className="px-4 py-2.5">{fmtDateTime(lesson.scheduled_at)}</td>
                      <td className="px-4 py-2.5">{lesson.duration_minutes} min</td>
                      <td className="px-4 py-2.5">
                        <Badge tone={statusTone[lesson.status] || 'blue'}>{t[lesson.status] || lesson.status}</Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
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
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-2.5 font-medium">{t.teacher}</th>
                  <th className="px-4 py-2.5 font-medium">{t.fromLabel}</th>
                  <th className="px-4 py-2.5 font-medium">{t.toLabel}</th>
                  <th className="px-4 py-2.5 font-medium text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {sortedAvailability.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted">
                      {t.noAvailabilityAdmin}
                    </td>
                  </tr>
                ) : (
                  sortedAvailability.map((avail) => (
                    <tr key={avail.id} className="border-b border-line last:border-0 hover:bg-[#fafafa]">
                      <td className="px-4 py-2.5">{nameById(teachers, avail.teacher_id)}</td>
                      <td className="px-4 py-2.5">{fmtDateTime(avail.start_at)}</td>
                      <td className="px-4 py-2.5">{fmtDateTime(avail.end_at)}</td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          onClick={() => removeAvailability(avail.id)}
                          className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                          title={t.laDelete}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Lesson modal */}
      {lessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{lessonModal.id ? t.laEditLesson : t.addLesson}</h2>
              <button onClick={() => setLessonModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label={`${t.date} & ${t.time} *`}>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={lessonModal.startAt}
                  onChange={(e) => setLessonModal({ ...lessonModal, startAt: e.target.value, teacherId: '' })}
                />
              </Field>

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
                  <select
                    className={fieldClass}
                    value={lessonModal.studentId}
                    onChange={(e) => setLessonModal({ ...lessonModal, studentId: e.target.value, teacherId: '' })}
                  >
                    <option value="">{t.laSelectStudentPlaceholder}</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name}</option>
                    ))}
                  </select>
                </Field>
              </div>

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
                <Button primary onClick={saveLesson}>{lessonModal.id ? t.edit : t.laCreate}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability modal */}
      {availModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{t.addAvailability}</h2>
              <button onClick={() => setAvailModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label={`${t.teacher} *`}>
                <select
                  className={fieldClass}
                  value={availModal.teacherId}
                  onChange={(e) => setAvailModal({ ...availModal, teacherId: e.target.value })}
                >
                  <option value="">{t.laSelectTeacherPlaceholder}</option>
                  {teachers.map((tc) => (
                    <option key={tc.id} value={tc.id}>{tc.full_name}</option>
                  ))}
                </select>
              </Field>

              <Field label={`${t.fromLabel} *`}>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={availModal.startAt}
                  onChange={(e) => setAvailModal({ ...availModal, startAt: e.target.value })}
                />
              </Field>

              <Field label={`${t.toLabel} *`}>
                <input
                  type="datetime-local"
                  className={fieldClass}
                  value={availModal.endAt}
                  onChange={(e) => setAvailModal({ ...availModal, endAt: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => setAvailModal(null)}>{t.cancel}</Button>
                <Button primary onClick={saveAvailability}>{t.saveSettings}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
