import { useEffect, useState } from 'react';
import { Plus, UserPlus } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers } from '../lib/api.js';

export default function UsersPage({ showToast, t, lang }) {
  const { tenantId } = useAuthStore();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const [teachersData, studentsData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
        ]);
        setTeachers(teachersData || []);
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Failed to load users', error);
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

  return (
    <Page>
      <PageHeader
        title={t.userManagement}
        subtitle={t.userManagementSub}
        action={
          <div className="flex gap-2">
            <Button onClick={() => showToast(t.inviteSent)}>
              <Plus size={16} />{t.inviteStudent}
            </Button>
            <Button primary onClick={() => showToast(t.inviteSent)}>
              <UserPlus size={16} />{t.inviteTeacher}
            </Button>
          </div>
        }
      />

      <Card title={t.teachers}>
        <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
          <span>{t.name}</span><span>Email</span><span>Phone</span>
          <span>{t.status}</span><span>{t.actions}</span>
        </div>
        {teachers.map((teacher) => {
          const initials = teacher.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'T';
          return (
            <div
              key={teacher.id}
              className="grid gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] lg:items-center"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-full bg-brand-light text-xs font-medium text-brand">
                  {initials}
                </div>
                <div>
                  <div className="font-medium">{teacher.full_name}</div>
                  <div className="text-[11px] text-muted">0 {t.lessonsToday.toLowerCase()}</div>
                </div>
              </div>
              <div className="text-muted">{teacher.email}</div>
              <div className="text-muted">{teacher.phone || 'N/A'}</div>
              <Badge tone={teacher.is_active ? 'green' : 'warn'}>{teacher.is_active ? t.active : 'inactive'}</Badge>
              <div className="flex gap-1.5">
                <Button small>{t.edit}</Button>
                <Button small>{t.deactivate}</Button>
              </div>
            </div>
          );
        })}
      </Card>

      <Card title={t.studentDirectory}>
        {students.map((student) => (
          <div
            key={student.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
          >
            <div>
              <div className="font-medium">{student.full_name}</div>
              <div className="text-[11px] text-muted">
                — · 0 {t.lessons} · {t.last}: recent
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="blue">{t.inProgress}</Badge>
              <Button small>{t.edit}</Button>
            </div>
          </div>
        ))}
      </Card>
    </Page>
  );
}
