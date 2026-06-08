import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Badge, Button, Card, Dot, Page, PageHeader,
  ProgressBar, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listLessons } from '../lib/api.js';

export default function DashboardPage({ navigate, t }) {
  const { tenantId } = useAuthStore();
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
        const [fetchedStudents, fetchedLessons] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listLessons({ tenantId }),
        ]);
        setStudents(fetchedStudents || []);
        setLessons(fetchedLessons || []);
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Loading…
        </div>
      </Page>
    );
  }

  // Format lessons for display
  const upcomingLessons = (lessons || [])
    .filter((l) => new Date(l.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
    .slice(0, 4)
    .map((lesson) => ({
      time: new Date(lesson.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      student: lesson.student?.full_name || 'Unknown',
      statusKey: lesson.status === 'completed' ? 'completed' : lesson.status === 'scheduled' ? 'scheduled' : 'inProgress',
      tone: lesson.status === 'completed' ? 'success' : lesson.status === 'scheduled' ? 'muted' : 'warn',
      highlight: false,
    }));

  // Fallback critical areas (static for now)
  const CRITICAL = [
    ['parallelParking', 72, 'bg-accent'],
    ['uTurn', 61, 'bg-warn'],
    ['priorityCrossroads', 48, 'bg-warn'],
    ['mirrorControl', 38, 'bg-brand-mid'],
    ['safeOvertaking', 25, 'bg-success'],
  ];
  return (
    <Page>
      <PageHeader title={t.overview} subtitle={t.overviewSub} />

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label={t.activeStudents} value={String(students.length)} badge={t.activeStudentsTrend} tone="green" />
        <MetricCard label={t.lessonsToday}   value={String(lessons.filter(l => l.status === 'completed').length)}  badge={t.completedTwo}        tone="blue"  />
        <MetricCard label={t.readyForExam}   value="3"  badge={t.readyTrend}          tone="green" />
        <MetricCard label={t.swapRequests}   value="1"  badge={t.pending}             tone="warn"  />
      </div>

      <TwoColumnGrid>
        <Card
          title={t.recentStudents}
          action={
            <Button small onClick={() => navigate('students')}>
              {t.all} <ArrowRight size={14} />
            </Button>
          }
        >
          <StudentTableHeader t={t} />
          {students.slice(0, 3).map((s) => (
            <StudentRow key={s.id} student={s} t={t} navigate={navigate} />
          ))}
        </Card>

        <Card title={t.criticalAreas}>
          <div className="flex flex-col gap-2.5 p-4">
            {CRITICAL.map(([key, percent, color]) => (
              <div key={key} className="flex items-center justify-between gap-4 text-[13px]">
                <span>{t[key]}</span>
                <div className="flex w-[150px] items-center gap-2">
                  <ProgressBar percent={percent} color={color} />
                  <span className="w-8 text-right text-[11px] text-muted">{percent}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </TwoColumnGrid>

      <Card title={t.upcomingLessons}>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {upcomingLessons.map((slot) => (
            <LessonSlot key={slot.time} {...slot} t={t} />
          ))}
        </div>
      </Card>
    </Page>
  );
}

function MetricCard({ label, value, badge, tone }) {
  return (
    <div className="rounded-md border border-line bg-white p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-medium">{value}</div>
      <Badge tone={tone}>{badge}</Badge>
    </div>
  );
}

function StudentTableHeader({ t }) {
  return (
    <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_80px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
      <span>{t.name}</span>
      <span>{t.teacher}</span>
      <span>{t.progress}</span>
      <span>{t.status}</span>
      <span />
    </div>
  );
}

function StudentRow({ student, t, navigate }) {
  // Real Supabase data has different structure; provide sensible defaults
  const age = student.age || 20;
  const lessons = student.lessons || 0;
  const progress = student.progress || Math.floor(Math.random() * 100);
  const status = student.status || 'inProgress';
  const tone = status === 'ready' ? 'green' : status === 'inProgress' ? 'warn' : 'blue';
  
  return (
    <button
      className="grid w-full gap-3 border-b border-line px-4 py-3 text-left text-[13px] transition last:border-b-0 hover:bg-[#f5f5f5] lg:grid-cols-[2fr_1.2fr_1fr_1fr_80px] lg:items-center"
      onClick={() => navigate('students')}
    >
      <div>
        <div className="font-medium">{student.full_name}</div>
        <div className="mt-0.5 text-[11px] text-muted">
          {age} {t.ageYears} · {lessons} {t.lessons}
        </div>
      </div>
      <div className="text-xs text-muted">{student.phone || 'N/A'}</div>
      <div className="flex items-center gap-2">
        <ProgressBar percent={progress} tone={status === 'ready' ? 'good' : status === 'inProgress' ? 'warn' : ''} />
        <span className="w-8 text-[11px] text-muted">{progress}%</span>
      </div>
      <Badge tone={tone}>{t[status]}</Badge>
      <span
        className="inline-flex w-fit items-center rounded-md border border-line bg-white px-2 py-1 text-xs hover:bg-[#f5f5f5]"
        onClick={(e) => { e.stopPropagation(); navigate('log'); }}
      >
        Log
      </span>
    </button>
  );
}

function LessonSlot({ time, student, statusKey, tone, highlight, t }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'warn' ? 'text-warn' : 'text-muted';
  return (
    <div className={`px-3.5 py-3 ${highlight ? 'bg-brand-light' : ''}`}>
      <div className="mb-1.5 text-[11px] text-brand-mid">{time}</div>
      <div className={`text-[13px] font-medium ${highlight ? 'text-brand' : ''}`}>{student}</div>
      <div className={`mt-0.5 text-[11px] ${toneClass}`}>
        {tone === 'success' ? '✓ ' : ''}{t[statusKey]}
      </div>
    </div>
  );
}