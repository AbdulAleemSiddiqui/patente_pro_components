import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { format, addMinutes, parseISO } from 'date-fns';
import {
  Button, Card, Field, fieldClass, Page, PageHeader,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listUsers, listLessons, listManeuvers, listHighways, submitLessonFeedback,
} from '../lib/api.js';

function toggleSet(setter, key) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

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
  const [lessons, setLessons] = useState([]); // lessons for the selected student

  // Cascading selection state
  const [studentId, setStudentId] = useState('');
  const [selectedLesson, setSelectedLesson] = useState(null); // full lesson object
  const [prefilled, setPrefilled] = useState(false); // opened from calendar

  // Feedback state
  const [notes, setNotes] = useState('');
  const [generalRating, setGeneralRating] = useState('good'); // 'poor', 'fair', 'good'
  const [fromHighwayId, setFromHighwayId] = useState('');
  const [toHighwayId, setToHighwayId] = useState('');

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

        const [studentsData, manoeuvresData, highwaysData, teacherLessons] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listManeuvers({ tenantId }),
          listHighways({ tenantId }),
          // Teachers only see students who have at least one loggable lesson with them
          teacherId ? listLessons({ tenantId, teacherId }) : Promise.resolve(null),
        ]);

        if (teacherId) {
          // Only students with a still-scheduled lesson with this teacher are pickable
          const eligibleStudentIds = new Set(
            (teacherLessons || []).filter((l) => l.status === 'scheduled').map((l) => l.student_id),
          );
          setStudents((studentsData || []).filter((s) => eligibleStudentIds.has(s.id)));
        } else {
          setStudents(studentsData || []);
        }
        setManoeuvres(manoeuvresData || []);
        setHighways(highwaysData || []);
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

  // When student changes (case b), fetch that student's lessons
  useEffect(() => {
    // Skip fetch in prefilled mode — lesson is already known
    if (prefilled || !studentId || !tenantId) return;
    let cancelled = false;
    (async () => {
      setLoadingLessons(true);
      try {
        // Teachers only see their own lessons; admins see all (matches calendar behaviour)
        const teacherId = role === 'teacher' ? session?.user?.id : undefined;
        const data = await listLessons({ tenantId, studentId, teacherId });
        if (cancelled) return;
        const visible = (data || [])
          .filter((l) => l.status === 'scheduled')
          .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
        setLessons(visible);
      } catch (error) {
        console.error('Failed to load lessons', error);
      } finally {
        if (!cancelled) setLoadingLessons(false);
      }
    })();
    return () => { cancelled = true; };
  }, [studentId, tenantId, prefilled, role, session]);

  const handleStudentChange = (id) => {
    setStudentId(id);
    setSelectedLesson(null); // reset downstream selection
  };

  const handleLessonChange = (lessonId) => {
    const lesson = lessons.find((l) => l.id === lessonId) || null;
    setSelectedLesson(lesson);
  };

  const handleManoeuvreRating = (manoeuvreId, rating) => {
    setManoeuvreRatings((prev) => ({ ...prev, [manoeuvreId]: rating }));
    if (rating && !selectedManoeuvres.has(manoeuvreId)) {
      setSelectedManoeuvres(new Set([...selectedManoeuvres, manoeuvreId]));
    }
  };

  const lessonLocked = !!selectedLesson; // gates the rest of the form
  const duration = selectedLesson?.duration_minutes ?? '';

  const handleSubmit = async () => {
    try {
      if (!selectedLesson?.id) {
        showToast('Select a lesson first', 'error');
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
        from_highway_id: fromHighwayId || null,
        to_highway_id: toHighwayId || null,
      };

      await submitLessonFeedback({
        feedback: feedbackData,
        maneuverRatings: maneuverRatingsData,
      });

      showToast('Feedback saved successfully!');
      sessionStorage.removeItem('feedbackLesson');
      navigate(prefilled ? 'schedule' : 'dashboard');
    } catch (error) {
      console.error('Failed to save feedback:', error);
      showToast('Failed to save feedback', 'error');
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Loading...
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
      <PageHeader title={t.log} subtitle={t.logSub} />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column - Lesson Details */}
        <div className="lg:col-span-3 space-y-4">
          <Card title={t.lessonDetails}>
            <div className="flex flex-col gap-3 p-4">
              {prefilled && selectedLesson?.teacherName && (
                <div className="mb-2">
                  <div className="text-xs text-muted mb-1">Instructor</div>
                  <div className="text-sm font-medium">{selectedLesson.teacherName}</div>
                </div>
              )}

              <Field label={t.student}>
                <select
                  className={fieldClass}
                  value={studentId}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  disabled={prefilled}
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Lesson">
                <select
                  className={fieldClass}
                  value={selectedLesson?.id || ''}
                  onChange={(e) => handleLessonChange(e.target.value)}
                  disabled={prefilled || !studentId || loadingLessons}
                >
                  <option value="">
                    {loadingLessons ? 'Loading...' : !studentId ? 'Select a student first' : 'Select a lesson'}
                  </option>
                  {prefilled && selectedLesson ? (
                    <option value={selectedLesson.id}>{formatLessonLabel(selectedLesson)}</option>
                  ) : (
                    lessons.map((lesson) => (
                      <option key={lesson.id} value={lesson.id}>
                        {formatLessonLabel(lesson)}
                      </option>
                    ))
                  )}
                </select>
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

              {/* Autostrada (highways) picker */}
              <div className="rounded-md border border-line p-3">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  {t.highway}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={`${t.highway}: ${t.toLabel}`}>
                    <select
                      className={fieldClass}
                      value={toHighwayId}
                      onChange={(e) => setToHighwayId(e.target.value)}
                      disabled={!lessonLocked}
                    >
                      <option value="">—</option>
                      {highways.map((hw) => (
                        <option key={hw.id} value={hw.id}>{hw.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label={`${t.highway}: ${t.fromLabel}`}>
                    <select
                      className={fieldClass}
                      value={fromHighwayId}
                      onChange={(e) => setFromHighwayId(e.target.value)}
                      disabled={!lessonLocked}
                    >
                      <option value="">—</option>
                      {highways.map((hw) => (
                        <option key={hw.id} value={hw.id}>{hw.name}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              </div>

              <Field label={t.generalRating}>
                <div className="flex gap-2">
                  {['poor', 'fair', 'good'].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setGeneralRating(rating)}
                      disabled={!lessonLocked}
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
                      title={rating.charAt(0).toUpperCase() + rating.slice(1)}
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
                  disabled={!lessonLocked}
                />
              </Field>

              <div className="flex justify-end pt-2">
                <Button primary onClick={handleSubmit} className="max-w-fit" >
                  <Save size={16} />
                  {t.saveLesson}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Manoeuvres */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="TIPOLOGIA">
            <div className="p-4">
              {!lessonLocked ? (
                <div className="text-sm text-muted py-4">Select a lesson to evaluate manoeuvres</div>
              ) : manoeuvres.length === 0 ? (
                <div className="text-sm text-muted py-4">No manoeuvres available</div>
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
                              onClick={() => toggleSet(setSelectedManoeuvres, manoeuvre.id)}
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
                                      handleManoeuvreRating(manoeuvre.id, rating);
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
                                    title={rating.charAt(0).toUpperCase() + rating.slice(1)}
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
            </div>
          </Card>

          <Card title="Summary">
            <div className="p-4 text-sm text-muted">
              <div className="flex justify-between mb-2">
                <span>Selected Manoeuvres:</span>
                <span className="font-medium">{selectedManoeuvres.size}</span>
              </div>
              <div className="flex justify-between">
                <span>General Rating:</span>
                <span className="font-medium capitalize">{generalRating}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
