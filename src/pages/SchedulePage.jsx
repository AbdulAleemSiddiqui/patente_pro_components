import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  Badge, Button, Card, Field, fieldClass,
  Page, PageHeader, Pill, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listLessons } from '../lib/api.js';

export default function SchedulePage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [view, setView] = useState('teacherView');
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const [teacherData, studentData, lessonData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
          listLessons({ tenantId }),
        ]);

        setTeachers(teacherData || []);
        setStudents(studentData || []);
        setLessons((lessonData || []).sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)));
      } catch (error) {
        console.error('Failed to load schedule data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Loading...
        </div>
      </Page>
    );
  }

  const formatTime = (scheduledAt) => new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <Page>
      <PageHeader
        title={t.lessonSchedule}
        subtitle={t.lessonScheduleSub}
        action={
          <div className="flex gap-1">
            <Pill active={view === 'teacherView'} onClick={() => setView('teacherView')}>{t.teacherView}</Pill>
            <Pill active={view === 'studentView'} onClick={() => setView('studentView')}>{t.studentView}</Pill>
          </div>
        }
      />

      <TwoColumnGrid>
        <Card title={t.newScheduledLesson}>
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.date}>
                <input className={fieldClass} type="date" defaultValue="2026-05-22" />
              </Field>
              <Field label={t.duration}>
                <select className={fieldClass}>
                  {[30, 45, 60, 90].map((d) => <option key={d}>{d}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.pickTeacher}>
                <select className={fieldClass}>
                  {teachers.map((teacher) => <option key={teacher.id}>{teacher.full_name}</option>)}
                </select>
              </Field>
              <Field label={t.pickStudent}>
                <select className={fieldClass}>
                  {students.map((student) => <option key={student.id}>{student.full_name}</option>)}
                </select>
              </Field>
            </div>
            <Button primary onClick={() => showToast(`${t.scheduledLessonSaved} ✓`)}>
              <Plus size={16} />{t.newScheduledLesson}
            </Button>
          </div>
        </Card>

        <Card title={t.eligibleTeachers}>
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex items-center justify-between border-b border-line px-4 py-3 text-[13px] last:border-b-0"
            >
              <div>
                <div className="font-medium">{teacher.full_name}</div>
                <div className="text-[11px] text-muted">{teacher.email}</div>
              </div>
              <Badge tone="green">{t.active}</Badge>
            </div>
          ))}
        </Card>
      </TwoColumnGrid>

      <Card title={`${t.calendarView} — ${t[view]}`}>
        <div className="grid border-b border-line bg-[#f5f5f5] px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid-cols-[90px_1.4fr_1.4fr_1fr_1fr]">
          <span>Time</span>
          <span>{t.teacher}</span>
          <span>{t.student}</span>
          <span>{t.duration}</span>
          <span>{t.status}</span>
        </div>
        {lessons.map((lesson) => (
          <div
            key={lesson.id}
            className="grid gap-2 border-b border-line px-4 py-3 text-[13px] last:border-b-0 lg:grid-cols-[90px_1.4fr_1.4fr_1fr_1fr] lg:items-center"
          >
            <div className="font-medium text-brand-mid">{formatTime(lesson.scheduled_at)}</div>
            <div>{view === 'teacherView' ? lesson.teacher?.full_name : lesson.student?.full_name}</div>
            <div className="text-muted">{view === 'teacherView' ? lesson.student?.full_name : lesson.teacher?.full_name}</div>
            <div className="text-muted">{lesson.duration_minutes} min</div>
            <Badge tone={lesson.status === 'completed' ? 'green' : 'blue'}>{t[lesson.status]}</Badge>
          </div>
        ))}
      </Card>
    </Page>
  );
}
