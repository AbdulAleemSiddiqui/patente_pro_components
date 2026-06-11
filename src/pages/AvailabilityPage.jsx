import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, Clock } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, getTeacherWeeklyAvailability, setTeacherWeeklyAvailability } from '../lib/api.js';

const DAYS = [
  { id: 0, label: 'Mon', fullLabel: 'Monday' },
  { id: 1, label: 'Tue', fullLabel: 'Tuesday' },
  { id: 2, label: 'Wed', fullLabel: 'Wednesday' },
  { id: 3, label: 'Thu', fullLabel: 'Thursday' },
  { id: 4, label: 'Fri', fullLabel: 'Friday' },
  { id: 5, label: 'Sat', fullLabel: 'Saturday' },
  { id: 6, label: 'Sun', fullLabel: 'Sunday' },
];

const TIME_SLOTS = [
  { id: 'morning', label: 'Morning (6AM - 12PM)', start: '06:00', end: '12:00' },
  { id: 'afternoon', label: 'Afternoon (12PM - 6PM)', start: '12:00', end: '18:00' },
  { id: 'evening', label: 'Evening (6PM - 10PM)', start: '18:00', end: '22:00' },
];

export default function AvailabilityPage({ showToast, t }) {
  const { tenantId, role, session } = useAuthStore();
  const [teachers, setTeachers] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const isAdmin = role === 'admin';
  const currentUserId = session?.user?.id;

  // Selected availability for editing (day -> slots)
  const [selectedAvailability, setSelectedAvailability] = useState({});

  useEffect(() => {
    loadAvailability();
  }, [tenantId, role, currentUserId]);

  const loadAvailability = async () => {
    try {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      if (isAdmin) {
        const teacherData = await listUsers({ tenantId, role: 'teacher' });
        setTeachers(teacherData || []);

        // Load availability for all teachers
        const availabilityPromises = (teacherData || []).map(teacher =>
          getTeacherWeeklyAvailability({ teacherId: teacher.id })
        );

        const availabilityResults = await Promise.all(availabilityPromises);
        const grouped = {};
        teacherData.forEach((teacher, index) => {
          grouped[teacher.id] = availabilityResults[index];
        });
        setAvailabilityData(grouped);
        setSelectedAvailability(grouped);
      } else if (role === 'teacher') {
        const weeklyAvailability = await getTeacherWeeklyAvailability({ teacherId: currentUserId });
        setAvailabilityData({ [currentUserId]: weeklyAvailability });
        setSelectedAvailability({ [currentUserId]: weeklyAvailability });
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load availability:', error);
      showToast(`Failed to load availability: ${error.message}`);
      setLoading(false);
    }
  };

  const toggleSlot = (teacherId, dayId, slotId) => {
    setSelectedAvailability(prev => {
      const teacherAvail = prev[teacherId] || {};
      const daySlots = teacherAvail[dayId] || [];

      const slotExists = daySlots.some(
        s => s.start === TIME_SLOTS.find(ts => ts.id === slotId)?.start &&
               s.end === TIME_SLOTS.find(ts => ts.id === slotId)?.end
      );

      let newDaySlots;
      if (slotExists) {
        // Remove the slot
        newDaySlots = daySlots.filter(
          s => s.start !== TIME_SLOTS.find(ts => ts.id === slotId)?.start ||
               s.end !== TIME_SLOTS.find(ts => ts.id === slotId)?.end
        );
      } else {
        // Add the slot
        const timeSlot = TIME_SLOTS.find(ts => ts.id === slotId);
        newDaySlots = [...daySlots, { start: timeSlot.start, end: timeSlot.end }];
      }

      return {
        ...prev,
        [teacherId]: {
          ...teacherAvail,
          [dayId]: newDaySlots,
        },
      };
    });
  };

  const handleSave = async (teacherId) => {
    setSaving(true);

    try {
      const teacherAvail = selectedAvailability[teacherId] || {};
      const availabilityList = [];

      Object.entries(teacherAvail).forEach(([dayId, slots]) => {
        slots.forEach(slot => {
          availabilityList.push({
            dayOfWeek: parseInt(dayId),
            startTime: slot.start,
            endTime: slot.end,
          });
        });
      });

      await setTeacherWeeklyAvailability({
        teacherId,
        availability: availabilityList,
      });

      // Refresh the data
      await loadAvailability();

      showToast('Availability saved successfully');
    } catch (error) {
      console.error('Failed to save availability:', error);
      showToast(`Failed to save: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = (teacherId) => {
    const current = availabilityData[teacherId] || {};
    const selected = selectedAvailability[teacherId] || {};

    // Simple comparison - check if keys match
    const currentKeys = Object.keys(current).sort();
    const selectedKeys = Object.keys(selected).sort();

    if (currentKeys.length !== selectedKeys.length) return true;

    for (const day of currentKeys) {
      const currentSlots = current[day] || [];
      const selectedSlots = selected[day] || [];

      if (currentSlots.length !== selectedSlots.length) return true;

      for (const slot of currentSlots) {
        const exists = selectedSlots.some(
          s => s.start === slot.start && s.end === slot.end
        );
        if (!exists) return true;
      }
    }

    return false;
  };

  const getSlotStatus = (teacherId, dayId, slotId) => {
    const teacherAvail = selectedAvailability[teacherId]?.[dayId] || [];
    const timeSlot = TIME_SLOTS.find(ts => ts.id === slotId);

    return teacherAvail.some(
      s => s.start === timeSlot?.start && s.end === timeSlot?.end
    );
  };

  const getSlotCount = (teacherId, dayId) => {
    const teacherAvail = selectedAvailability[teacherId]?.[dayId] || [];
    return teacherAvail.length;
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

  const teachersToShow = isAdmin ? teachers : [{ id: currentUserId, full_name: 'Your' }];

  return (
    <Page>
      <PageHeader
        title={role === 'teacher' ? 'My Weekly Availability' : 'Teacher Weekly Availability'}
        subtitle={role === 'teacher' ? 'Set your regular weekly teaching schedule' : 'Manage teacher availability for scheduling'}
      />

      {teachersToShow.map((teacher) => {
        const teacherChanged = hasChanges(teacher.id);

        return (
          <Card
            key={teacher.id}
            title={`${teacher.full_name} ${role === 'teacher' ? '' : 'Availability'}`}
            action={
              <Button
                primary
                onClick={() => handleSave(teacher.id)}
                disabled={saving || !teacherChanged}
              >
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="text-sm text-muted">
                {role === 'teacher'
                  ? 'Select the time slots you\'re available each day. This will be your regular weekly schedule.'
                  : 'Select time slots when this instructor is available for lessons.'}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted">Day</th>
                      {TIME_SLOTS.map(slot => (
                        <th key={slot.id} className="px-3 py-2 text-center text-xs font-medium text-muted">
                          {slot.label}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center text-xs font-medium text-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => (
                      <tr key={day.id} className="border-b border-line">
                        <td className="px-3 py-2 text-sm font-medium">{day.label}</td>
                        {TIME_SLOTS.map(slot => (
                          <td key={slot.id} className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => toggleSlot(teacher.id, day.id, slot.id)}
                              className={`mx-auto rounded border px-3 py-1.5 text-xs transition ${
                                getSlotStatus(teacher.id, day.id, slot.id)
                                  ? 'border-brand bg-brand text-white hover:bg-brand-mid'
                                  : 'border-line bg-[#f5f5f5] text-muted hover:border-brand-mid hover:bg-white'
                              }`}
                            >
                              {getSlotStatus(teacher.id, day.id, slot.id) ? '✓' : '+'}
                            </button>
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center">
                          <Badge
                            tone={getSlotCount(teacher.id, day.id) > 0 ? 'green' : 'warn'}
                            className="mx-auto"
                          >
                            {getSlotCount(teacher.id, day.id)} slots
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <div className="rounded border border-brand bg-brand px-2 py-0.5 text-white">✓</div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="rounded border border-line bg-[#f5f5f5] px-2 py-0.5">+</div>
                  <span>Available to select</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </Page>
  );
}
