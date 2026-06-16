import { useEffect, useState } from 'react';
import { Save, Car } from 'lucide-react';
import { format } from 'date-fns';
import {
  Button, Card, Field, fieldClass, Page, PageHeader,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listRouteTypes, listManeuvers, submitLessonFeedback } from '../lib/api.js';

function toggleSet(setter, key) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

const ICON_MAP = {
  car: '🚗',
  local_parking: '🅿️',
  arrows_left_right: '↔️',
  eye: '👁️',
  check_circle: '✓',
};

export default function LessonLogPage({ showToast, t, navigate }) {
  const { tenantId, role, session } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [routeTypes, setRouteTypes] = useState([]);
  const [manoeuvres, setManoeuvres] = useState([]);

  // Form state
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(50);
  const [notes, setNotes] = useState('');
  const [generalRating, setGeneralRating] = useState('good'); // 'poor', 'fair', 'good'
  const [prefilledLesson, setPrefilledLesson] = useState(null);

  // Selections
  const [selectedRouteType, setSelectedRouteType] = useState(null);
  const [selectedSubType, setSelectedSubType] = useState(null);
  const [selectedManoeuvres, setSelectedManoeuvres] = useState(new Set());
  const [manoeuvreRatings, setManoeuvreRatings] = useState({});

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const [studentsData, routeTypesData, manoeuvresData] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listRouteTypes({ tenantId }),
          listManeuvers({ tenantId }),
        ]);

        setStudents(studentsData || []);
        setRouteTypes(routeTypesData || []);
        setManoeuvres(manoeuvresData || []);

        // Set first student as default if no prefilled lesson
        if (!prefilledLesson && studentsData?.length > 0) {
          setStudentId(studentsData[0].id);
        }
      } catch (error) {
        console.error('Failed to load data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId, prefilledLesson]);

  // Load pre-filled lesson data from sessionStorage
  useEffect(() => {
    const feedbackLesson = sessionStorage.getItem('feedbackLesson');
    if (feedbackLesson) {
      try {
        const lessonData = JSON.parse(feedbackLesson);
        setPrefilledLesson(lessonData);

        // Populate fields with lesson data
        if (lessonData.studentId) setStudentId(lessonData.studentId);
        if (lessonData.scheduledAt) {
          const lessonDate = new Date(lessonData.scheduledAt);
          setDate(lessonDate.toISOString().slice(0, 10));
        }
        if (lessonData.duration) setDuration(lessonData.duration);

        sessionStorage.removeItem('feedbackLesson');
      } catch (error) {
        console.error('Failed to parse feedback lesson data:', error);
      }
    }
  }, []);

  const handleRouteTypeChange = (routeType) => {
    setSelectedRouteType(routeType);
    setSelectedSubType(null); // Reset sub-type when route type changes
  };

  const handleManoeuvreRating = (manoeuvreId, rating) => {
    setManoeuvreRatings(prev => ({
      ...prev,
      [manoeuvreId]: rating,
    }));
    // Auto-select the manoeuvre if rating is given
    if (rating && !selectedManoeuvres.has(manoeuvreId)) {
      setSelectedManoeuvres(new Set([...selectedManoeuvres, manoeuvreId]));
    }
  };

  const getRatingColor = (rating) => {
    if (rating === 'poor') return 'bg-red-500';
    if (rating === 'fair') return 'bg-[#d4820a]';
    if (rating === 'good') return 'bg-green-500';
    return 'bg-gray-300';
  };

  const getRatingBorderColor = (rating) => {
    if (rating === 'poor') return 'border-red-500';
    if (rating === 'fair') return 'border-[#d4820a]';
    if (rating === 'good') return 'border-green-500';
    return 'border-gray-300';
  };

  const handleSubmit = async () => {
    try {
      if (!prefilledLesson?.lessonId) {
        showToast('No lesson selected', 'error');
        return;
      }

      if (!selectedRouteType) {
        showToast('Please select a route type', 'error');
        return;
      }

      // Prepare maneuver ratings data
      const maneuverRatingsData = Array.from(selectedManoeuvres).map((manoeuvreId) => ({
        maneuver_id: manoeuvreId,
        rating: manoeuvreRatings[manoeuvreId] || 'good',
      }));

      // Prepare feedback data
      const feedbackData = {
        lesson_id: prefilledLesson.lessonId,
        route_type_id: selectedRouteType,
        route_sub_type_id: selectedSubType || null,
        notes: notes || '',
        general_rating: generalRating,
      };

      await submitLessonFeedback({
        feedback: feedbackData,
        maneuverRatings: maneuverRatingsData,
      });

      showToast('Feedback saved successfully!');

      // Clear sessionStorage and navigate back
      sessionStorage.removeItem('feedbackLesson');
      navigate('/schedule');

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

  const selectedRouteTypeData = routeTypes.find(rt => rt.id === selectedRouteType);

  const ICON_LABELS = {
    car: 'Vehicle Check',
    local_parking: 'Parking',
    arrows_left_right: 'Road maneuvers',
    eye: 'Behaviors',
    check_circle: 'Other',
  };

  const getDifficultyBadgeColor = (difficulty) => {
    switch (difficulty) {
      case 'Base': return 'badge-green';
      case 'Medium': return 'badge-orange';
      case 'Difficult': return 'badge-red';
      case 'Critic': return 'badge-purple';
      default: return 'badge-gray';
    }
  };

  // Group manoeuvres by icon/category
  const getManoeuvresByCategory = () => {
    return manoeuvres.reduce((acc, manoeuvre) => {
      const icon = manoeuvre.icon || 'check_circle';
      if (!acc[icon]) acc[icon] = [];
      acc[icon].push(manoeuvre);
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
              {prefilledLesson && (
                <div className="mb-2">
                  <div className="text-xs text-muted mb-1">Instructor</div>
                  <div className="text-sm font-medium">{prefilledLesson.teacherName}</div>
                </div>
              )}

              <Field label={t.student}>
                {prefilledLesson ? (
                  <div className="text-sm font-medium py-2">
                    {prefilledLesson.studentName}
                  </div>
                ) : (
                  <select
                    className={fieldClass}
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                  >
                    <option value="">Select a student</option>
                    {students.map((student) => (
                      <option key={student.id} value={student.id}>
                        {student.full_name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              <div className="grid gap-2.5 sm:grid-cols-2">
                <Field label={t.date}>
                  {prefilledLesson ? (
                    <div className="text-sm font-medium py-2">
                      {format(new Date(prefilledLesson.scheduledAt), 'MMM d, yyyy')}
                    </div>
                  ) : (
                    <input
                      className={fieldClass}
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  )}
                </Field>
                <Field label={t.duration}>
                  {prefilledLesson ? (
                    <div className="text-sm font-medium py-2">
                      {prefilledLesson.duration} min
                    </div>
                  ) : (
                    <input
                      className={fieldClass}
                      type="number"
                      value={duration}
                      min="30"
                      max="120"
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  )}
                </Field>
              </div>

              <Field label="Route Type">
                <select
                  className={fieldClass}
                  value={selectedRouteType || ''}
                  onChange={(e) => handleRouteTypeChange(e.target.value)}
                >
                  <option value="">Select route type</option>
                  {routeTypes.map((routeType) => (
                    <option key={routeType.id} value={routeType.id}>
                      {routeType.name}
                    </option>
                  ))}
                </select>
              </Field>

              {selectedRouteTypeData?.requires_sub_selection && selectedRouteTypeData?.route_sub_types && (
                <Field label="Route Sub-Type">
                  <select
                    className={fieldClass}
                    value={selectedSubType || ''}
                    onChange={(e) => setSelectedSubType(e.target.value)}
                  >
                    <option value="">Select sub-type</option>
                    {selectedRouteTypeData.route_sub_types.map((subType) => (
                      <option key={subType.id} value={subType.id}>
                        {subType.label}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <Field label={t.generalRating}>
                <div className="flex gap-2">
                  {['poor', 'fair', 'good'].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setGeneralRating(rating)}
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
                />
              </Field>

              <div className="flex justify-end pt-2">
                <Button primary onClick={handleSubmit} className="max-w-fit">
                  <Save size={16} />
                  {t.saveLesson}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column - Manoeuvres */}
        <div className="lg:col-span-2 space-y-4">
          <Card title="Performed Manoeuvres">
            <div className="p-4">
              {manoeuvres.length === 0 ? (
                <div className="text-sm text-muted py-4">No manoeuvres available</div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(getManoeuvresByCategory()).map(([iconKey]) => {
                    const Icon = ICON_MAP[iconKey] || (() => '✓');
                    return (
                      <div key={iconKey} className="border-b border-line pb-3">
                        <div className="flex items-center gap-2 mb-2">
                          {typeof Icon === 'string' ? (
                            <span className="text-lg">{Icon}</span>
                          ) : (
                            <Icon size={18} />
                          )}
                          <span className="text-sm font-medium">{ICON_LABELS[iconKey] || 'Other'}</span>
                        </div>

                        {getManoeuvresByCategory()[iconKey].map((manoeuvre) => {
                          const isSelected = selectedManoeuvres.has(manoeuvre.id);
                          const currentRating = manoeuvreRatings[manoeuvre.id];
                          const badgeColor = getDifficultyBadgeColor(manoeuvre.difficulty);

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
                                <span className={`metric-badge text-xs px-2 py-0.5 rounded-full ${
                                  badgeColor === 'badge-green' ? 'bg-green-100 text-green-700' :
                                  badgeColor === 'badge-orange' ? 'bg-orange-100 text-orange-700' :
                                  badgeColor === 'badge-red' ? 'bg-red-100 text-red-700' :
                                  badgeColor === 'badge-purple' ? 'bg-purple-100 text-purple-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {manoeuvre.difficulty}
                                </span>
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
