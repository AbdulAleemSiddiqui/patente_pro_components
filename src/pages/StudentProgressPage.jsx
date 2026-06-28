import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, Award, CheckCircle } from 'lucide-react';
import { Card, Page, PageHeader } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listLessons } from '../lib/api.js';
import { format } from 'date-fns';

export default function StudentProgressPage({ showToast, t, lang }) {
  const { session, role } = useAuthStore();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!session?.user?.id) {
          setLoading(false);
          return;
        }

        // Get lessons for this student with feedback
        const { requireSupabase } = await import('../lib/supabase.js');
        const supabase = requireSupabase();

        const { data: lessonsData, error } = await supabase
          .from('lessons')
          .select(`
            *,
            lesson_feedback (
              general_rating,
              notes,
              submitted_at,
              maneuver_ratings (
                rating,
                maneuvers (
                  name,
                  difficulty,
                  icon
                )
              )
            ),
            users!lessons_teacher_id_fkey (
              full_name
            )
          `)
          .eq('student_id', session.user.id)
          .in('status', ['completed', 'feedback_submitted'])
          .order('scheduled_at', { ascending: false });

        if (error) throw error;
        setLessons(lessonsData || []);
      } catch (error) {
        console.error('Failed to load lessons:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [session]);

  // Calculate statistics
  const completedLessons = lessons.filter(l => l.lesson_feedback);
  const recentFeedback = completedLessons.slice(0, 5);

  // Calculate general average
  const calculateAverage = () => {
    if (completedLessons.length === 0) return null;

    const ratingValues = { poor: 1, fair: 2, good: 3 };
    const sum = completedLessons.reduce((acc, lesson) => {
      const rating = lesson.lesson_feedback?.general_rating;
      return acc + (ratingValues[rating] || 2);
    }, 0);

    const average = sum / completedLessons.length;
    if (average >= 2.5) return { text: 'good', color: 'text-green-500', label: t.excellent };
    if (average >= 1.5) return { text: 'fair', color: 'text-orange-500', label: t.good };
    return { text: 'poor', color: 'text-red-500', label: t.needsImprovement };
  };

  const average = calculateAverage();

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Loading...
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={t.progressTitle} subtitle={t.progressSub} />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card title="">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                <CheckCircle size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold">{completedLessons.length}</div>
                <div className="text-sm text-muted">{t.lessonsCompleted}</div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                <Award size={20} />
              </div>
              <div>
                {average ? (
                  <>
                    <div className={`text-2xl font-bold capitalize ${average.color}`}>
                      {average.label}
                    </div>
                    <div className="text-sm text-muted">{t.generalAverage}</div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold text-muted">—</div>
                    <div className="text-sm text-muted">{t.generalAverage}</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card title="">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-light text-brand">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {completedLessons.length > 0 ? 'Active' : 'Start'}
                </div>
                <div className="text-sm text-muted">Learning status</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Feedback */}
      <Card title={t.recentFeedback}>
        {completedLessons.length === 0 ? (
          <div className="p-8 text-center text-muted">
            <div className="text-sm">{t.noLessonsYet}</div>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {recentFeedback.map((lesson) => (
              <div key={lesson.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-muted" />
                      <span className="text-sm font-medium">
                        {format(new Date(lesson.scheduled_at), 'MMM d, yyyy')}
                      </span>
                      <span className="text-xs text-muted">•</span>
                      <span className="text-xs text-muted">{lesson.duration_minutes} min</span>
                    </div>

                    {lesson.users?.lessons_teacher_id_fkey && (
                      <div className="text-xs text-muted mb-2">
                        Instructor: {lesson.users.lessons_teacher_id_fkey.full_name}
                      </div>
                    )}

                    {lesson.lesson_feedback?.notes && (
                      <div className="text-sm text-muted mb-2 line-clamp-2">
                        "{lesson.lesson_feedback.notes}"
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted">Rating:</span>
                      <div className="flex gap-1">
                        {['poor', 'fair', 'good'].map((rating) => (
                          <div
                            key={rating}
                            className={`w-4 h-4 rounded-full ${
                              lesson.lesson_feedback?.general_rating === rating
                                ? rating === 'poor'
                                  ? 'bg-red-500'
                                  : rating === 'fair'
                                  ? 'bg-orange-500'
                                  : 'bg-green-500'
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {lesson.lesson_feedback?.maneuver_ratings?.length > 0 && (
                      <div className="mt-2">
                        <div className="text-xs text-muted mb-1">Manoeuvres practiced:</div>
                        <div className="flex flex-wrap gap-1">
                          {lesson.lesson_feedback.maneuver_ratings.slice(0, 3).map((mr) => (
                            <span
                              key={mr.id}
                              className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600"
                            >
                              {mr.maneuvers?.name}
                            </span>
                          ))}
                          {lesson.lesson_feedback.maneuver_ratings.length > 3 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              +{lesson.lesson_feedback.maneuver_ratings.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
