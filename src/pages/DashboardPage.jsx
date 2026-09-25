import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import {
  Button, Card, Page, PageHeader,
  ProgressBar, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listBranches, getStudentProgressStats, getDashboardStats } from '../lib/api.js';

export default function DashboardPage({ navigate, t, lang }) {
  const { tenantId } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [branches, setBranches] = useState([]);
  const [progressByStudent, setProgressByStudent] = useState({});
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const todayLocal = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD, local
        const [studentData, branchData, progressData, dashboardData] = await Promise.all([
          listUsers({ tenantId, role: 'student' }),
          listBranches({ tenantId }),
          getStudentProgressStats({ tenantId }),
          getDashboardStats({ tenantId, day: todayLocal }),
        ]);
        setStudents(studentData || []);
        setBranches(branchData || []);
        const map = {};
        for (const row of progressData || []) map[row.student_id] = row;
        setProgressByStudent(map);
        setStats(dashboardData || {});
      } catch (error) {
        console.error('Failed to load dashboard data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // Real counts — active students excludes deactivated accounts
  const activeStudents = students.filter((s) => s.is_active).length;

  const upcomingLessons = useMemo(() => (
    (stats.upcoming || []).map((l) => ({
      id: l.id,
      time: new Date(l.scheduled_at).toLocaleTimeString(lang === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      student: l.student || '—',
      completed: l.status === 'completed',
    }))
  ), [stats, lang]);

  // Weakest maneuvers across all feedback (computed in the database, lowest first)
  const criticalAreas = stats.critical_areas || [];

  const branchColor = (label) => branches.find((b) => b.label === label)?.color;

  const percentOf = (row) =>
    row?.avg_rating == null ? null : Math.round(((Number(row.avg_rating) - 1) / 2) * 100);

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          {t.loading}
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader title={t.overview} subtitle={t.overviewSub} />

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2">
        <MetricCard label={t.activeStudents} value={String(activeStudents)} />
        <MetricCard
          label={t.lessonsToday}
          value={String(stats.lessons_today ?? 0)}
          badge={t.lessonsTodayBadge.replace('{count}', stats.completed_today ?? 0)}
        />
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
          {students.slice(0, 3).map((s) => {
            const percent = percentOf(progressByStudent[s.id]);
            return (
              <StudentRow
                key={s.id}
                student={s}
                completed={Number(progressByStudent[s.id]?.completed) || 0}
                percent={percent}
                branchColor={branchColor(s.branch)}
                branchLabel={s.branch}
                t={t}
                navigate={navigate}
              />
            );
          })}
        </Card>

        <Card title={t.criticalAreas}>
          <div className="flex flex-col gap-2.5 p-4">
            {criticalAreas.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted">{t.noRatingsYet}</div>
            ) : (
              criticalAreas.map((area) => (
                <div key={area.name} className="flex items-center justify-between gap-4 text-[13px]">
                  <span>{area.name}</span>
                  <div className="flex w-[150px] items-center gap-2">
                    <ProgressBar percent={area.percent} tone={area.percent >= 67 ? 'good' : area.percent >= 34 ? 'warn' : ''} />
                    <span className="w-8 text-right text-[11px] text-muted">{area.percent}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </TwoColumnGrid>

      <Card title={t.upcomingLessons}>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4">
          {upcomingLessons.map((slot) => (
            <LessonSlot key={slot.id} {...slot} t={t} />
          ))}
        </div>
      </Card>
    </Page>
  );
}

function MetricCard({ label, value, badge }) {
  return (
    <div className="rounded-md border border-line bg-white p-3.5">
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-[22px] font-medium">{value}</div>
      {badge && <span className="inline-flex w-fit rounded-full bg-brand-light px-2 py-0.5 text-[11px] text-brand-mid">{badge}</span>}
    </div>
  );
}

function StudentTableHeader({ t }) {
  return (
    <div className="hidden grid-cols-[2fr_1fr_1fr_80px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
      <span>{t.name}</span>
      <span>{t.phoneLabel}</span>
      <span>{t.progress}</span>
      <span />
    </div>
  );
}

function StudentRow({ student, completed, percent, branchColor, branchLabel, t, navigate }) {
  return (
    <button
      className="grid w-full gap-3 border-b border-line px-4 py-3 text-left text-[13px] transition last:border-b-0 hover:bg-[#f5f5f5] lg:grid-cols-[2fr_1fr_1fr_80px] lg:items-center"
      onClick={() => navigate('students')}
    >
      <div>
        <div
          className="font-medium"
          style={branchColor ? { color: branchColor } : undefined}
          title={branchLabel}
        >
          {student.full_name}
        </div>
        <div className="mt-0.5 text-[11px] text-muted">
          {completed} {t.lessons}
        </div>
      </div>
      <div className="text-xs text-muted">{student.phone || '—'}</div>
      <div className="flex items-center gap-2">
        {percent == null ? (
          <span className="text-[11px] text-muted">—</span>
        ) : (
          <>
            <ProgressBar percent={percent} tone={percent >= 67 ? 'good' : percent >= 34 ? 'warn' : ''} />
            <span className="w-8 text-[11px] text-muted">{percent}%</span>
          </>
        )}
      </div>
      <span
        className="inline-flex w-fit items-center rounded-md border border-line bg-white px-2 py-1 text-xs hover:bg-[#f5f5f5]"
        onClick={(e) => { e.stopPropagation(); navigate('log'); }}
      >
        Log
      </span>
    </button>
  );
}

function LessonSlot({ time, student, completed, t }) {
  return (
    <div className="px-3.5 py-3">
      <div className="mb-1.5 text-[11px] text-brand-mid">{time}</div>
      <div className="text-[13px] font-medium">{student}</div>
      <div className={`mt-0.5 text-[11px] ${completed ? 'text-success' : 'text-muted'}`}>
        {completed ? '✓ ' : ''}{t[completed ? 'completed' : 'scheduled']}
      </div>
    </div>
  );
}
