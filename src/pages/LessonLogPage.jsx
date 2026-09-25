import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { format, addMinutes, parseISO } from 'date-fns';
import {
  Button, Card, Field, fieldClass, Page, PageHeader, Combobox,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listUsers, listLessonsLite, listManeuvers, listHighways, submitLessonFeedback,
  listLessonsWithFeedback, listBranches,
} from '../lib/api.js';

function toggleSet(setter, key) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

// One empty From/To row for the highway (Autostrada) picker
const emptyHighwayRow = () => ({ from: '', to: '' });

// Format a lesson as "dd/MM/yyyy - HH:mm to HH:mm"
function formatLessonLabel(lesson) {
  const start = typeof lesson.scheduled_at === 'string' ? parseISO(lesson.scheduled_at) : new Date(lesson.scheduled_at);
  const end = addMinutes(start, lesson.duration_minutes);
  return `${format(start, 'dd/MM/yyyy')} - ${format(start, 'HH:mm')} to ${format(end, 'HH:mm')}`;
}

export default function LessonLogPage({ showToast, t, navigate }) {
  const { tenantId, role, session } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [manoeuvres, setManoeuvres] = useState([]);
  const [highways, setHighways] = useState([]);
  const [branches, setBranches] = useState([]);
  const [lessons, setLessons] = useState([]); // lessons for the selected student

  // Cascading selection state
  const [studentId, setStudentId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null); // full lesson object
  const [prefilled, setPrefilled] = useState(false); // opened with a lesson preset
  const [readOnly, setReadOnly] = useState(false); // history view — no editing

  // Feedback state
  const [notes, setNotes] = useState('');
  const [generalRating, setGeneralRating] = useState('good'); // 'poor', 'fair', 'good'
  // A single lesson can cover several highway segments (client request 2026-09-23)
  const [highwayRows, setHighwayRows] = useState([emptyHighwayRow()]);

  // Manoeuvre state
  const [selectedManoeuvres, setSelectedManoeuvres] = useState(new Set());
  const [manoeuvreRatings, setManoeuvreRatings] = useState({});

  const [loading, setLoading] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  // Load catalog data
  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const isTeacher = role === 'teacher';
        const teacherId = isTeacher ? session?.user?.id : undefined;

        const [studentsData, manoeuvresData, highwaysData, branchData, teacherLessons] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listManeuvers({ tenantId }),
          listHighways({ tenantId }),
          listBranches({ tenantId }),
          // Teachers only see students who have at least one loggable lesson
          // with them — light query, ids are all we need here
          teacherId
            ? listLessonsLite({ tenantId, teacherId, status: 'scheduled', kind: 'lesson' })
            : Promise.resolve(null),
        ]);

        if (teacherId) {
          // Only students with a still-scheduled lesson with this teacher are pickable
          const eligibleStudentIds = new Set(
            (teacherLessons || []).map((l) => l.student_id),
          );
          setStudents((studentsData || []).filter((s) => eligibleStudentIds.has(s.id)));
        } else {
          setStudents(studentsData || []);
        }
        setManoeuvres(manoeuvresData || []);
        setHighways(highwaysData || []);
        setBranches(branchData || []);
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, role, session]);

  // Case a: opened from calendar — read prefilled lesson from sessionStorage
  useEffect(() => {
    const feedbackLesson = sessionStorage.getItem('feedbackLesson');
    if (!feedbackLesson) return;
    try {
      const lessonData = JSON.parse(feedbackLesson);
      setPrefilled(true);
      setStudentId(lessonData.studentId || '');
      setSelectedLesson({
        id: lessonData.lessonId,
        student_id: lessonData.studentId,
        teacher_id: lessonData.teacherId,
        scheduled_at: lessonData.scheduledAt,
        duration_minutes: lessonData.duration,
        teacherName: lessonData.teacherName,
        studentName: lessonData.studentName,
      });
      sessionStorage.removeItem('feedbackLesson');
    } catch (error) {
      console.error('Failed to parse feedback lesson data:', error);
    }
  }, []);

  // Case b: opened as a read-only history view from the lessons list.
  // NB: the sessionStorage key is removed only AFTER the load completes —
  // StrictMode runs effects twice, and removing it up-front blanked the view.
  useEffect(() => {
    const viewLesson = sessionStorage.getItem('viewLesson');
    if (!viewLesson || !tenantId) return;
    let cancelled = false;
    (async () => {
      try {
        const lessonData = JSON.parse(viewLesson);
        const [lesson] = await listLessonsWithFeedback({ tenantId, lessonId: lessonData.lessonId });
        if (cancelled) return;
        sessionStorage.removeItem('viewLesson');
        if (!lesson) {
          showToast(t.llLessonNotFound, 'error');
          return;
        }
        setReadOnly(true);
        setPrefilled(true);
        setStudentId(lesson.student_id || '');
        setSelectedLesson({
          id: lesson.id,
          student_id: lesson.student_id,
          teacher_id: lesson.teacher_id,
          scheduled_at: lesson.scheduled_at,
          duration_minutes: lesson.duration_minutes,
          teacherName: lesson.teacher?.full_name,
          studentName: lesson.student?.full_name,
        });
        setNotes(lesson.feedback?.notes || '');
        setGeneralRating(lesson.feedback?.general_rating || 'good');
        const segments = [...(lesson.feedback?.segments || [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
        setHighwayRows(segments.length
          ? segments.map((s) => ({ from: s.from_highway?.id || '', to: s.to_highway?.id || '' }))
          : [emptyHighwayRow()]);
        const ratings = {};
        const selected = new Set();
        for (const r of lesson.feedback?.ratings || []) {
          ratings[r.maneuver_id] = r.rating;
          selected.add(r.maneuver_id);
        }
        setManoeuvreRatings(ratings);
        setSelectedManoeuvres(selected);
      } catch (error) {
        console.error('Failed to load lesson history:', error);
        showToast(t.llLessonNotFound, 'error');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // When student changes, fetch that student's lessons
  useEffect(() => {
    // Skip fetch in prefilled/read-only mode — lesson is already known
    if (prefilled || readOnly || !studentId || !tenantId) return;
    let cancelled = false;
    (async () => {
      setLoadingLessons(true);
      try {
        // Teachers only see their own lessons; admins see all.
        // Filtered + sorted server-side via the light query.
        const teacherId = role === 'teacher' ? session?.user?.id : undefined;
        const data = await listLessonsLite({
          tenantId, studentId, teacherId, status: 'scheduled', kind: 'lesson',
        });
        if (cancelled) return;
        setLessons(data || []);
      } catch (error) {
        console.error('Failed to load lessons', error);
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, tenantId, prefilled, readOnly, role, session]);

  const handleStudentChange = (id) => {
    if (readOnly) return;
    setStudentId(id);
    setSelectedLesson(null); // reset downstream selection
  };

  const handleLessonChange = (lessonId) => {
    if (readOnly) return;
    const lesson = lessons.find((l) => l.id === lessonId) || null;
    setSelectedLesson(lesson);
    setHighwayRows([emptyHighwayRow()]); // reset segments for the new lesson
  };

  const handleHighwayRowChange = (index, side, value) => {
    setHighwayRows((prev) => prev.map((row, i) => (i === index ? { ...row, [side]: value } : row)));
  };

  const addHighwayRow = () => setHighwayRows((prev) => [...prev, emptyHighwayRow()]);

  const removeHighwayRow = (index) => {
    setHighwayRows((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyHighwayRow()];
    });
  };

  const handleManoeuvreRating = (manoeuvreId, rating) => {
    setManoeuvreRatings((prev) => ({ ...prev, [manoeuvreId]: rating }));
    if (rating && !selectedManoeuvres.has(manoeuvreId)) {
      setSelectedManoeuvres(new Set([...selectedManoeuvres, manoeuvreId]));
    }
  };

  const lessonLocked = !!selectedLesson; // gates the rest of the form
  const duration = selectedLesson?.duration_minutes ?? '';

  // Branch color for a student (branches managed in Settings)
  const branchColorOf = (studentId) => {
    const branch = students.find((s) => s.id === studentId)?.branch;
    return branches.find((b) => b.label === branch)?.color;
  };

  const handleSubmit = async () => {
    try {
      if (!selectedLesson?.id) {
        showToast(t.llSelectLessonFirst, 'error');
        return;
      }

      const maneuverRatingsData = Array.from(selectedManoeuvres).map((manoeuvreId) => ({
        maneuver_id: manoeuvreId,
        rating: manoeuvreRatings[manoeuvreId] || 'good',
      }));

      const feedbackData = {
        lesson_id: selectedLesson.id,
        notes: notes || '',
        general_rating: generalRating,
      };

      await submitLessonFeedback({
        feedback: feedbackData,
        highwaySegments: highwayRows.map((row) => ({
          from_highway_id: row.from || null,
          to_highway_id: row.to || null,
        })),
        maneuverRatings: maneuverRatingsData,
      });

      showToast(t.llFeedbackSaved);
      sessionStorage.removeItem('feedbackLesson');
      navigate('dashboard');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      showToast(t.llFeedbackSaveFailed, 'error');
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          {t.loadingDots}
        </div>
      </Page>
    );
  }

  // Group manoeuvres by their parent type (FASE 1 / FASE 2 / PERCORSO URBANO),
  // ordered by the type's order_index, then each maneuver's order_index.
  const getManoeuvresByType = () => {
    const sorted = [...manoeuvres].sort((a, b) => {
      const ta = a.type?.order_index ?? 999;
      const tb = b.type?.order_index ?? 999;
      if (ta !== tb) return ta - tb;
      return (a.order_index ?? 0) - (b.order_index ?? 0);
    });
    return sorted.reduce((acc, manoeuvre) => {
      const type = manoeuvre.type?.name || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(manoeuvre);
      return acc;
    }, {});
  };

  return (
    <Page>
      <PageHeader
        title={readOnly ? t.llHistoryTitle : t.log}
        subtitle={readOnly ? t.llHistorySub : t.logSub}
        action={readOnly ? (
          <Button onClick={() => navigate(role === 'admin' ? 'lessonsAdmin' : 'students')}>
            <ArrowLeft size={16} />
            {t.back}
          </Button>
        ) : undefined}
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Lesson Details */}
        <div className="lg:col-span-3 space-y-4">
          <Card title={t.lessonDetails}>
            <div className="flex flex-col gap-3 p-4">
              {prefilled && selectedLesson?.teacherName && (
                <div className="mb-2">
                  <div className="text-xs text-muted mb-1">{t.llInstructorLabel}</div>
                  <div className="text-sm font-medium">{selectedLesson.teacherName}</div>
                </div>
              )}

              <Field label={t.student}>
                <Combobox
                  value={studentId}
                  onChange={handleStudentChange}
                  options={students.map((student) => ({
                    value: student.id,
                    label: student.full_name,
                    color: branchColorOf(student.id),
                  }))}
                  placeholder={t.llSelectStudent}
                  disabled={prefilled || readOnly}
                />
              </Field>

              <Field label={t.llLessonLabel}>
                <Combobox
                  value={selectedLesson?.id || ''}
                  onChange={handleLessonChange}
                  options={
                    prefilled && selectedLesson
                      ? [{ value: selectedLesson.id, label: formatLessonLabel(selectedLesson) }]
                      : lessons.map((lesson) => ({ value: lesson.id, label: formatLessonLabel(lesson) }))
                  }
                  placeholder={
                    loadingLessons ? t.loadingDots : !studentId ? t.llSelectStudentFirst : t.llSelectLesson
                  }
                  disabled={prefilled || readOnly || !studentId || loadingLessons}
                />
              </Field>

              <Field label={t.duration}>
                <input
                  className={fieldClass}
                  type="text"
                  value={duration === '' ? '' : `${duration} min`}
                  disabled
                  placeholder="—"
                />
              </Field>

              {/* Autostrada (highway segments) picker — one lesson can cover several */}
              <div className="rounded-md border border-line p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted">
                    {t.highway}
                  </div>
                  {!readOnly && (
                    <Button small primary onClick={addHighwayRow} disabled={!lessonLocked} aria-label={t.add}>
                      <Plus size={13} />
                    </Button>
                  )}
                </div>
                <div className="space-y-3">
                  {highwayRows.map((row, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <div key={index} className="flex items-end gap-2">
                      <Field label={index === 0 ? `${t.highway}: ${t.fromLabel}` : undefined}>
                        <select
                          className={fieldClass}
                          value={row.from}
                          onChange={(e) => handleHighwayRowChange(index, 'from', e.target.value)}
                          disabled={!lessonLocked || readOnly}
                        >
                          <option value="">—</option>
                          {highways.map((hw) => (
                            <option key={hw.id} value={hw.id}>{hw.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label={index === 0 ? `${t.highway}: ${t.toLabel}` : undefined}>
                        <select
                          className={fieldClass}
                          value={row.to}
                          onChange={(e) => handleHighwayRowChange(index, 'to', e.target.value)}
                          disabled={!lessonLocked || readOnly}
                        >
                          <option value="">—</option>
                          {highways.map((hw) => (
                            <option key={hw.id} value={hw.id}>{hw.name}</option>
                          ))}
                        </select>
                      </Field>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => removeHighwayRow(index)}
                          disabled={!lessonLocked}
                          className="mb-0.5 rounded p-2 text-muted transition hover:bg-red-50 hover:text-accent disabled:opacity-40"
                          title={t.delete}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Field label={t.generalRating}>
                <div className="flex gap-2">
                  {['poor', 'fair', 'good'].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => !readOnly && setGeneralRating(rating)}
                      disabled={!lessonLocked || readOnly}
                      className={`w-8 h-8 rounded-full border-2 transition ${
                        generalRating === rating
                          ? rating === 'poor' ? 'border-red-500 bg-red-500'
                            : rating === 'fair' ? 'border-[#d4820a] bg-[#d4820a]'
                            : 'border-green-500 bg-green-500'
                          : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                      style={
                        generalRating === rating
                          ? rating === 'poor'
                            ? { boxShadow: '0 0 8px rgba(239, 68, 68, 0.6), 0 0 4px rgba(239, 68, 68, 0.4)' }
                            : rating === 'fair'
                            ? { boxShadow: '0 0 8px rgba(212, 130, 10, 0.6), 0 0 4px rgba(212, 130, 10, 0.4)' }
                            : { boxShadow: '0 0 8px rgba(34, 197, 94, 0.6), 0 0 4px rgba(34, 197, 94, 0.4)' }
                          : { boxShadow: '0 0 4px rgba(0, 0, 0, 0.1)' }
                      }
                      title={rating === 'poor' ? t.llRatingPoor : rating === 'fair' ? t.llRatingFair : t.llRatingGood}
                    />
                  ))}
                </div>
              </Field>

              <Field label={t.instructorNotes}>
                <textarea
                  className={`${fieldClass} h-[68px] resize-none`}
                  placeholder={t.notesPlaceholder}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={!lessonLocked || readOnly}
                />
              </Field>

              {/* Save button — desktop only; on mobile it sits at the end of tipologia instead */}
              {!readOnly && (
                <div className="hidden justify-end pt-2 lg:flex">
                  <Button primary onClick={handleSubmit} className="max-w-fit" >
                    <Save size={16} />
                    {t.saveLesson}
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Manoeuvres */}
        <div className="lg:col-span-2 space-y-4">
          <Card title={t.tipologia}>
            <div className="p-4">
              {!lessonLocked ? (
                <div className="text-sm text-muted py-4">{t.llSelectLessonToEvaluate}</div>
              ) : manoeuvres.length === 0 ? (
                <div className="text-sm text-muted py-4">{t.llNoManoeuvres}</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(getManoeuvresByType()).map(([typeName, items]) => {
                    return (
                      <div key={typeName} className="border-b border-line pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">{typeName}</span>
                        </div>

                        {items.map((manoeuvre) => {
                          const isSelected = selectedManoeuvres.has(manoeuvre.id);
                          const currentRating = manoeuvreRatings[manoeuvre.id];

                          return (
                            <div
                              key={manoeuvre.id}
                              className={`man-item flex items-center justify-between py-2 px-3 rounded-lg cursor-pointer transition border border-black mb-2 ${
                                isSelected ? 'border-l-4 border-l-[#d4820a] bg-gray-50' : 'hover:bg-gray-50'
                              }`}
                              onClick={() => !readOnly && toggleSet(setSelectedManoeuvres, manoeuvre.id)}
                            >
                              <div className="flex items-center gap-2 flex-1">
                                <div className="">
                                  <div className="text-sm">{manoeuvre.name}</div>
                                </div>
                              </div>

                              <div className="traffic-light flex gap-2 ml-4">
                                {['poor', 'fair', 'good'].map((rating) => (
                                  <span
                                    key={rating}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!readOnly) handleManoeuvreRating(manoeuvre.id, rating);
                                    }}
                                    className={`tl-circle rounded-full cursor-pointer transition ${
                                      currentRating === rating
                                        ? rating === 'poor' ? 'bg-red-500'
                                          : rating === 'fair' ? 'bg-[#d4820a]'
                                          : 'bg-green-500'
                                        : 'bg-gray-200 hover:bg-gray-300'
                                    }`}
                                    style={{
                                      width: '24px',
                                      height: '24px',
                                      boxShadow: currentRating === rating
                                        ? rating === 'poor'
                                          ? '0 0 8px rgba(239, 68, 68, 0.6), 0 0 4px rgba(239, 68, 68, 0.4)'
                                          : rating === 'fair'
                                          ? '0 0 8px rgba(212, 130, 10, 0.6), 0 0 4px rgba(212, 130, 10, 0.4)'
                                          : '0 0 8px rgba(34, 197, 94, 0.6), 0 0 4px rgba(34, 197, 94, 0.4)'
                                        : '0 0 4px rgba(0, 0, 0, 0.1)'
                                    }}
                                    title={rating === 'poor' ? t.llRatingPoor : rating === 'fair' ? t.llRatingFair : t.llRatingGood}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Save button — mobile only: end of tipologia instead of after instructor notes */}
              {!readOnly && (
                <div className="mt-4 flex justify-center lg:hidden">
                  <Button primary onClick={handleSubmit} className="max-w-fit" >
                    <Save size={16} />
                    {t.saveLesson}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card title={t.llSummary}>
            <div className="p-4 text-sm text-muted">
              <div className="flex justify-between mb-2">
                <span>{t.llSelectedManoeuvres}</span>
                <span className="font-medium">{selectedManoeuvres.size}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.llGeneralRatingColon}</span>
                <span className="font-medium capitalize">{generalRating}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
