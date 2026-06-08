import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { Badge, Button, Card, Dot, Page, PageHeader, TwoColumnGrid } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listTeacherAvailability, listRouteTypesForTenant } from '../lib/api.js';

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri'];
const DAY_INDEX = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5 };

export default function AvailabilityPage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [teachers, setTeachers] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [routeTypes, setRouteTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const [teacherData, availabilityData, routeData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listTeacherAvailability(),
          listRouteTypesForTenant({ tenantId }),
        ]);

        setTeachers(teacherData || []);
        setAvailability(availabilityData || []);
        setRouteTypes(routeData || []);
      } catch (error) {
        console.error('Failed to load availability data', error);
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

  const availabilityByTeacher = availability.reduce((acc, item) => {
    acc[item.teacher_id] = acc[item.teacher_id] || [];
    acc[item.teacher_id].push(item);
    return acc;
  }, {});

  const getSlotText = (teacherId, day) => {
    const slots = (availabilityByTeacher[teacherId] || []).filter((item) => item.day_of_week === DAY_INDEX[day]);
    if (!slots.length) return '-';
    return slots.map((item) => `${item.start_time}-${item.end_time}`).join(', ');
  };

  return (
    <Page>
      <PageHeader
        title={t.availabilityPlanner}
        subtitle={t.availabilityPlannerSub}
        action={
          <Button primary onClick={() => showToast(`${t.availabilitySaved} ✓`)}>
            <Save size={16} />
            {t.setAvailability}
          </Button>
        }
      />

      <Card title={t.weeklyGrid}>
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted">
              <span>{t.teacher}</span>
              {DAYS.map((d) => <span key={d}>{t[d]}</span>)}
            </div>
            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="grid grid-cols-[180px_repeat(5,1fr)] border-b border-line px-4 py-3 text-[13px] last:border-b-0"
              >
                <div className="font-medium">{teacher.full_name}</div>
                {DAYS.map((day) => (
                  <button
                    key={day}
                    className={`mr-2 rounded-md border px-2 py-1.5 text-left text-xs ${
                      getSlotText(teacher.id, day) === '-'
                        ? 'border-line bg-[#f5f5f5] text-muted'
                        : 'border-success bg-success-light text-success'
                    }`}
                    onClick={() => showToast(t.availabilitySaved)}
                    type="button"
                  >
                    {getSlotText(teacher.id, day)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <TwoColumnGrid>
        <Card title={t.eligibleTeachers}>
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
            >
              <Dot tone="green" />
              <div className="flex-1">
                <div className="font-medium">{teacher.full_name}</div>
                <div className="text-[11px] text-muted">
                  {t.lessonsToday ? `0 ${t.lessonsToday.toLowerCase()}` : '0 lessons'}
                </div>
              </div>
              <Button small onClick={() => showToast(t.contactSent)}>{t.contact}</Button>
            </div>
          ))}
        </Card>

        <Card title={t.routeConfiguration}>
          <div className="p-4 text-[13px] text-muted">
            {routeTypes.length} {t.routeList.toLowerCase()} ·{' '}
            {routeTypes.filter((r) => r.route_sub_types?.length).length} {t.subRoutes.toLowerCase()}
          </div>
        </Card>
      </TwoColumnGrid>
    </Page>
  );
}
