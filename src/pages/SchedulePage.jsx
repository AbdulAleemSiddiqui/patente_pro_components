import { useEffect, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views, momentLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Field } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listLessons, createLesson } from '../lib/api.js';

// Setup date-fns localizer for react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: {
    'en-US': enUS,
  },
});

export default function SchedulePage({ showToast, t }) {
  const { tenantId, role, session } = useAuthStore();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [lessonData, setLessonData] = useState({
    teacherId: '',
    studentId: '',
    duration_minutes: 60,
  });

  const isAdmin = role === 'admin';
  const currentUserId = session?.user?.id;

  useEffect(() => {
    loadScheduleData();
  }, [tenantId, isAdmin, role, currentUserId]);

  const loadScheduleData = async () => {
    try {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      if (isAdmin) {
        const [teacherData, studentData, lessonData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
          listLessons({ tenantId }),
        ]);

        setTeachers(teacherData || []);
        setStudents(studentData || []);
        setLessons(lessonData || []);
      } else if (role === 'teacher') {
        const [lessonData, studentData] = await Promise.all([
          listLessons({ tenantId, teacherId: currentUserId }),
          listUsers({ tenantId, role: 'student' }),
        ]);

        setLessons(lessonData || []);
        setStudents(studentData || []);
        setTeachers([{ id: currentUserId, full_name: 'You' }]);
      } else if (role === 'student') {
        const [lessonData, teacherData] = await Promise.all([
          listLessons({ tenantId, studentId: currentUserId }),
          listUsers({ tenantId, role: 'teacher' }),
        ]);

        setLessons(lessonData || []);
        setTeachers(teacherData || []);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load schedule data', error);
      showToast(`Failed to load: ${error.message}`);
      setLoading(false);
    }
  };

  // Convert lessons to calendar events
  const events = lessons.map((lesson) => {
    const student = students.find(s => s.id === lesson.student_id);
    const teacher = teachers.find(t => t.id === lesson.teacher_id);

    return {
      id: lesson.id,
      title: `${student?.full_name || 'Student'}`,
      start: new Date(lesson.scheduled_at),
      end: new Date(new Date(lesson.scheduled_at).getTime() + lesson.duration_minutes * 60000),
      resource: lesson,
      student,
      teacher,
    };
  });

  // Filter lessons based on selected teacher
  const filteredEvents = isAdmin && selectedTeacher && selectedTeacher !== 'all'
    ? events.filter(event => event.resource.teacher_id === selectedTeacher)
    : events;

  // Navigate functions
  const navigateToPrev = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(newDate.getDate() - 7);
    } else if (view === Views.DAY) {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === Views.AGENDA) {
      newDate.setDate(newDate.getDate() - 7);
    }
    setDate(new Date(newDate));
  };

  const navigateToNext = () => {
    const newDate = new Date(date);
    if (view === Views.MONTH) {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (view === Views.WEEK) {
      newDate.setDate(newDate.getDate() + 7);
    } else if (view === Views.DAY) {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === Views.AGENDA) {
      newDate.setDate(newDate.getDate() + 7);
    }
    setDate(new Date(newDate));
  };

  const navigateToToday = () => {
    setDate(new Date());
  };

  const handleNavigate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  const handleViewChange = useCallback((newView) => {
    setView(newView);
  }, []);

  // Handle clicking on a date slot
  const handleSelectSlot = useCallback(({ start, end }) => {
    if (!isAdmin && role !== 'teacher') {
      showToast('Only teachers and admins can schedule lessons');
      return;
    }

    const durationMinutes = Math.round((end - start) / 60000);
    const validDurations = [30, 45, 50, 60, 90, 120];

    if (!validDurations.includes(durationMinutes)) {
      showToast(`Duration: ${durationMinutes}min is not allowed. Use: 30, 45, 50, 60, 90, or 120 minutes.`);
      return;
    }

    setSlotInfo({ start, end });
    setSelectedEvent(null);

    const teacherId = role === 'teacher' ? currentUserId : '';
    setLessonData({
      teacherId: teacherId || '',
      studentId: '',
      duration_minutes: durationMinutes,
    });

    setShowLessonModal(true);
  }, [isAdmin, role, currentUserId, showToast]);

  // Handle clicking on an existing event
  const handleSelectEvent = useCallback((event) => {
    setSelectedEvent(event);
    setSlotInfo(null);

    setLessonData({
      teacherId: event.resource.teacher_id,
      studentId: event.resource.student_id,
      duration_minutes: event.resource.duration_minutes,
    });

    setShowLessonModal(true);
  }, []);

  // Close modal
  const handleCloseModal = () => {
    setShowLessonModal(false);
    setSelectedEvent(null);
    setSlotInfo(null);
    setLessonData({
      teacherId: '',
      studentId: '',
      duration_minutes: 60,
    });
  };

  // Handle create/update lesson
  const handleSaveLesson = async () => {
    if (!lessonData.studentId) {
      showToast('Please select a student');
      return;
    }

    if (!lessonData.teacherId) {
      showToast('Please select a teacher');
      return;
    }

    try {
      const scheduledAt = slotInfo?.start || selectedEvent?.start || new Date();

      await createLesson({
        tenant_id: tenantId,
        teacher_id: lessonData.teacherId,
        student_id: lessonData.studentId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: lessonData.duration_minutes,
        status: 'scheduled',
      });

      showToast('Lesson scheduled successfully');
      handleCloseModal();
      await loadScheduleData();
    } catch (error) {
      console.error('Failed to save lesson:', error);
      showToast(`Failed to save: ${error.message}`);
    }
  };

  // Custom event component
  const EventComponent = ({ event }) => {
    const student = event.student;
    const teacher = event.teacher;

    const initials = student?.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'S';

    const colors = [
      'bg-blue-500 text-white',
      'bg-green-500 text-white',
      'bg-purple-500 text-white',
      'bg-orange-500 text-white',
      'bg-pink-500 text-white',
      'bg-teal-500 text-white',
      'bg-indigo-500 text-white',
    ];
    const colorIndex = student?.id
      ? student.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
      : 0;

    return (
      <div className={`h-full rounded ${colors[colorIndex]} p-1.5 text-xs overflow-hidden`}>
        <div className="font-bold truncate">{initials}</div>
        <div className="truncate opacity-90">{student?.full_name?.split(' ')[0]}</div>
        {view !== 'month' && (
          <div className="truncate text-[10px] opacity-75">
            {teacher?.full_name?.split(' ')[0] || ''}
          </div>
        )}
      </div>
    );
  };

  // Custom day cell for month view
  const MonthDateCell = ({ date: dateProp, ...props }) => {
    const date = new Date(dateProp);
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const isCurrentMonth = date.getMonth() === currentMonth && date.getFullYear() === currentYear;

    const dayEvents = filteredEvents.filter(event => {
      const eventDate = new Date(event.start);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });

    const isToday = date.toDateString() === new Date().toDateString();

    return (
      <div
        className={`h-full flex flex-col items-center justify-center p-2 ${
          isCurrentMonth ? 'hover:bg-gray-50 cursor-pointer' : 'opacity-30 cursor-not-allowed'
        }`}
        onClick={() => isCurrentMonth && handleViewChange(Views.DAY)}
      >
        <div className={`text-xl font-bold ${isToday ? 'bg-brand text-white rounded-full w-10 h-10 flex items-center justify-center' : ''}`}>
          {date.getDate()}
        </div>
        {isCurrentMonth && dayEvents.length > 0 && (
          <div className="text-xs text-muted text-center mt-1">
            {dayEvents.length} {dayEvents.length === 1 ? 'lesson' : 'lessons'}
          </div>
        )}
      </div>
    );
  };

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView }) => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={navigateToPrev}
            className="p-1.5 rounded hover:bg-gray-100 transition"
            title="Previous"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={navigateToToday}
            className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 font-medium transition"
          >
            Today
          </button>
          <button
            type="button"
            onClick={navigateToNext}
            className="p-1.5 rounded hover:bg-gray-100 transition"
            title="Next"
          >
            <ChevronRight size={18} />
          </button>
          <span className="text-lg font-medium">{label}</span>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && teachers.length > 0 && (
            <select
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-brand-mid"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="all">All Teachers</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.full_name}
                </option>
              ))}
            </select>
          )}

          <div className="flex rounded-md border border-line bg-white p-0.5">
            {['month', 'week', 'day', 'agenda'].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => onView(v)}
                className={`px-3 py-1.5 text-xs capitalize rounded transition ${
                  view === v
                    ? 'bg-brand text-white'
                    : 'text-muted hover:text-ink'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
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

  return (
    <Page>
      <PageHeader
        title={role === 'student' ? 'My Schedule' : t.lessonSchedule}
        subtitle={role === 'student' ? 'View your upcoming lessons' : t.lessonScheduleSub}
        action={
          (isAdmin || role === 'teacher') && (
            <Button primary onClick={() => {
              setView(Views.DAY);
              setDate(new Date());
            }}>
              <Plus size={16} />
              New Lesson
            </Button>
          )
        }
      />

      <Card>
        <div className="p-4">
          <Calendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            date={date}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable={view !== Views.MONTH}
            components={{
              event: EventComponent,
              toolbar: CustomToolbar,
              month: {
                dateCell: MonthDateCell,
                header: ({ date, localizer }) => {
                  return (
                    <div className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                      {format(date, 'EEE')}
                    </div>
                  );
                },
              },
            }}
            formats={{
              monthHeaderFormat: 'MMMM yyyy',
              weekdayFormat: 'EEE',
              dayFormat: 'EEE',
              agendaTimeRangeFormat: ({ start, end }) => {
                return `${format(start, 'h:mma')} – ${format(end, 'h:mma')}`;
              },
              timeGutterFormat: 'ha',
              selectRangeFormat: ({ start, end }) => {
                const formatStr = 'MMM d, h:mma';
                return `${format(start, formatStr)} – ${format(end, formatStr)}`;
              },
              dateFormat: 'MMM d, yyyy',
              timeGutterFormat: 'ha',
            }}
            className="w-full"
            startAccessor="start"
            endAccessor="end"
            style={{
              height: view === Views.MONTH ? 'auto' : 700,
              minHeight: 500,
            }}
          />
        </div>
      </Card>

      {/* Legend */}
      {students.length > 0 && (
        <Card title="Students" className="mt-3.5">
          <div className="flex flex-wrap gap-3 p-4">
            {students.slice(0, 10).map((student) => {
              const initials = student.full_name
                ?.split(' ')
                .map(n => n[0])
                .join('')
                .toUpperCase()
                .substring(0, 2) || 'S';

              const colors = [
                'bg-blue-500',
                'bg-green-500',
                'bg-purple-500',
                'bg-orange-500',
                'bg-pink-500',
                'bg-teal-500',
                'bg-indigo-500',
              ];
              const colorIndex = student.id
                ? student.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length
                : 0;

              return (
                <div key={student.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-7 h-7 rounded flex items-center justify-center text-white font-medium ${colors[colorIndex]}`}>
                    {initials}
                  </div>
                  <span className="text-muted">{student.full_name}</span>
                </div>
              );
            })}
            {students.length > 10 && (
              <div className="text-xs text-muted">
                +{students.length - 10} more
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-3.5">
        <Card>
          <div className="p-4">
            <div className="text-2xl font-medium">{filteredEvents.length}</div>
            <div className="text-sm text-muted">Total Lessons</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-2xl font-medium">
              {filteredEvents.filter(e => e.resource.status === 'scheduled').length}
            </div>
            <div className="text-sm text-muted">Scheduled</div>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <div className="text-2xl font-medium">
              {filteredEvents.filter(e => e.resource.status === 'completed').length}
            </div>
            <div className="text-sm text-muted">Completed</div>
          </div>
        </Card>
      </div>

      {/* Lesson Modal */}
      {showLessonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {selectedEvent ? 'Edit Lesson' : 'Schedule New Lesson'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {slotInfo && (
                <div className="text-sm text-muted bg-gray-50 p-2 rounded">
                  {format(slotInfo.start, 'MMM d, yyyy h:mma')} - {format(slotInfo.end, 'h:mma')}
                </div>
              )}

              <div>
                <label className="block text-xs text-muted mb-1">Student *</label>
                <select
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={lessonData.studentId}
                  onChange={(e) => setLessonData({ ...lessonData, studentId: e.target.value })}
                  required
                >
                  <option value="">Select a student</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name}
                    </option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-xs text-muted mb-1">Teacher *</label>
                  <select
                    className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                    value={lessonData.teacherId}
                    onChange={(e) => setLessonData({ ...lessonData, teacherId: e.target.value })}
                    required
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs text-muted mb-1">Duration (minutes)</label>
                <select
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={lessonData.duration_minutes}
                  onChange={(e) => setLessonData({ ...lessonData, duration_minutes: parseInt(e.target.value) })}
                >
                  {[30, 45, 50, 60, 90, 120].map((duration) => (
                    <option key={duration} value={duration}>
                      {duration} min
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button primary onClick={handleSaveLesson}>
                  {selectedEvent ? 'Update' : 'Schedule'} Lesson
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
