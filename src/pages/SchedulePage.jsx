import { useEffect, useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, Views, momentLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS, it } from 'date-fns/locale';
import { Plus, ChevronLeft, ChevronRight, X, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Field } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, listLessons, createLesson, updateLesson, deleteLesson, listTeacherAvailability, createTeacherAvailability, deleteTeacherAvailability } from '../lib/api.js';

// Setup date-fns localizer for react-big-calendar
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales: {
    'en-US': enUS,
    it,
  },
});

// Per-student lesson colors. Assigned by sorted student order (not id-hash) so
// every student gets a distinct color as long as there are fewer than the palette size.
const LESSON_COLORS = [
  'bg-blue-500 text-white',
  'bg-green-500 text-white',
  'bg-purple-500 text-white',
  'bg-orange-500 text-white',
  'bg-pink-500 text-white',
  'bg-teal-500 text-white',
  'bg-indigo-500 text-white',
];

export default function SchedulePage({ showToast, t, lang, navigate }) {
  const { tenantId, role, session } = useAuthStore();
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [teacherAvailability, setTeacherAvailability] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showTypeChoiceModal, setShowTypeChoiceModal] = useState(false);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [conflictInfo, setConflictInfo] = useState(null);
  const [lessonForFeedback, setLessonForFeedback] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [slotInfo, setSlotInfo] = useState(null);
  const [lessonData, setLessonData] = useState({
    teacherId: '',
    studentId: '',
    duration_minutes: 60,
    startAt: '',
  });

  const [availabilityData, setAvailabilityData] = useState({
    teacherId: '',
  });

  const isAdmin = role === 'admin';
  const currentUserId = session?.user?.id;

  // Map each student to a distinct color by sorted name order (avoids id-hash collisions)
  const studentColorMap = useMemo(() => {
    const map = {};
    [...students]
      .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
      .forEach((s, i) => {
        map[s.id] = LESSON_COLORS[i % LESSON_COLORS.length];
      });
    return map;
  }, [students]);

  useEffect(() => {
    loadScheduleData();
  }, [tenantId, isAdmin, role, currentUserId]);

  const loadScheduleData = async () => {
    try {
      if (!tenantId) {
        setLoading(false);
        return;
      }

      // Calculate date range for availability (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);

      if (isAdmin) {
        const [teacherData, studentData, lessonData, availabilityData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
          listLessons({ tenantId }),
          listTeacherAvailability({ tenantId, from: startOfMonth.toISOString(), to: endOfMonth.toISOString() }),
        ]);

        setTeachers(teacherData || []);
        setStudents(studentData || []);
        setLessons(lessonData || []);
        setTeacherAvailability(availabilityData || []);
      } else if (role === 'teacher') {
        const [lessonData, studentData, availabilityData] = await Promise.all([
          listLessons({ tenantId, teacherId: currentUserId }),
          listUsers({ tenantId, role: 'student' }),
          listTeacherAvailability({ tenantId, teacherId: currentUserId, from: startOfMonth.toISOString(), to: endOfMonth.toISOString() }),
        ]);

        setLessons(lessonData || []);
        setStudents(studentData || []);
        setTeachers([{ id: currentUserId, full_name: 'You' }]);
        setTeacherAvailability(availabilityData || []);
      } else if (role === 'student') {
        const [lessonData, teacherData] = await Promise.all([
          listLessons({ tenantId, studentId: currentUserId }),
          listUsers({ tenantId, role: 'teacher' }),
        ]);

        setLessons(lessonData || []);
        setTeachers(teacherData || []);
        setTeacherAvailability([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load schedule data', error);
      showToast(`Failed to load: ${error.message}`);
      setLoading(false);
    }
  };

  // Convert lessons to calendar events
  const lessonEvents = lessons.map((lesson) => {
    const student = students.find(s => s.id === lesson.student_id);
    const teacher = teachers.find(t => t.id === lesson.teacher_id);

    return {
      id: lesson.id,
      title: `${student?.full_name || 'Student'}`,
      start: new Date(lesson.scheduled_at),
      end: new Date(new Date(lesson.scheduled_at).getTime() + lesson.duration_minutes * 60000),
      resource: { ...lesson, type: 'lesson' },
      student,
      teacher,
    };
  });

  // Convert availability to calendar events
  const availabilityEvents = teacherAvailability.map((avail) => {
    const teacher = teachers.find(t => t.id === avail.teacher_id);

    return {
      id: avail.id,
      title: `${teacher?.full_name || 'Teacher'} Available`,
      start: new Date(avail.start_at),
      end: new Date(avail.end_at),
      resource: { ...avail, type: 'availability' },
      teacher,
    };
  });

  const events = [...lessonEvents, ...availabilityEvents];

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

    // For admins, show type choice modal first
    if (isAdmin) {
      setSlotInfo({ start, end });
      setSelectedEvent(null);
      setShowTypeChoiceModal(true);
      return;
    }

    // For teachers, go directly to lesson modal
    const durationMinutes = Math.round((end - start) / 60000);
    const validDurations = [30, 45, 50, 60, 90, 120];

    if (!validDurations.includes(durationMinutes)) {
      showToast(`Duration: ${durationMinutes}min is not allowed. Use: 30, 45, 50, 60, 90, or 120 minutes.`);
      return;
    }

    setSlotInfo({ start, end });
    setSelectedEvent(null);

    setLessonData({
      teacherId: currentUserId,
      studentId: '',
      duration_minutes: durationMinutes,
    });

    setShowLessonModal(true);
  }, [isAdmin, role, currentUserId, showToast]);

  // Handle clicking on an existing event
  const handleSelectEvent = useCallback((event) => {
    if (event.resource.type === 'availability') {
      // For availability events, open modal for viewing/editing
      setSelectedEvent(event);
      setSlotInfo({
        start: event.start,
        end: event.end,
      });
      setAvailabilityData({
        teacherId: event.resource.teacher_id,
      });
      setShowAvailabilityModal(true);
      return;
    }

    // For lessons, check if teacher is clicking to give feedback
    if (role === 'teacher' && event.resource.teacher_id === currentUserId) {
      // Completed lessons already have feedback logged — block re-submitting
      if (event.resource.status === 'completed') {
        showToast('Feedback already submitted for this lesson');
        return;
      }
      // Allow feedback for scheduled lessons (not cancelled)
      if (event.resource.status !== 'cancelled') {
        setLessonForFeedback(event);
        setShowFeedbackModal(true);
      } else {
        showToast('Cannot give feedback for cancelled lessons');
      }
      return;
    }

    // For admins and students, or teachers viewing other's lessons, open edit modal
    setSelectedEvent(event);
    setSlotInfo(null);

    // Format dates for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatForInput = (date) => {
      const d = new Date(date);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setLessonData({
      teacherId: event.resource.teacher_id,
      studentId: event.resource.student_id,
      duration_minutes: event.resource.duration_minutes,
      startAt: formatForInput(event.start),
      endAt: formatForInput(event.end),
    });

    setShowLessonModal(true);
  }, [role, currentUserId]);

  // Close modal
  const handleCloseModal = () => {
    setShowLessonModal(false);
    setShowAvailabilityModal(false);
    setShowTypeChoiceModal(false);
    setShowConflictModal(false);
    setShowFeedbackModal(false);
    setSelectedEvent(null);
    setSlotInfo(null);
    setLessonData({
      teacherId: '',
      studentId: '',
      duration_minutes: 60,
      startAt: '',
    });
    setAvailabilityData({
      teacherId: '',
    });
    setConflictInfo(null);
    setLessonForFeedback(null);
  };

  // Handle type choice (Schedule Lesson vs Add Availability)
  const handleChooseScheduleLesson = () => {
    setShowTypeChoiceModal(false);

    const durationMinutes = Math.round((slotInfo.end - slotInfo.start) / 60000);
    const validDurations = [30, 45, 50, 60, 90, 120];

    if (!validDurations.includes(durationMinutes)) {
      showToast(`Duration: ${durationMinutes}min is not allowed. Use: 30, 45, 50, 60, 90, or 120 minutes.`);
      handleCloseModal();
      return;
    }

    setLessonData({
      teacherId: '',
      studentId: '',
      duration_minutes: durationMinutes,
    });

    setShowLessonModal(true);
  };

  const handleChooseAddAvailability = () => {
    setShowTypeChoiceModal(false);

    setAvailabilityData({
      teacherId: '',
    });

    setShowAvailabilityModal(true);
  };

  // Handle delete availability
  const handleDeleteAvailability = async (id) => {
    // Find the availability being deleted
    const availability = teacherAvailability.find(a => a.id === id);
    if (!availability) {
      showToast('Availability not found');
      return;
    }

    // Check for any lessons scheduled during this availability period
    const availStart = new Date(availability.start_at).getTime();
    const availEnd = new Date(availability.end_at).getTime();

    const conflictingLessons = lessons.filter(lesson => {
      if (lesson.teacher_id !== availability.teacher_id || lesson.status === 'cancelled') return false;
      const lessonStart = new Date(lesson.scheduled_at).getTime();
      const lessonEnd = lessonStart + lesson.duration_minutes * 60000;
      // Check for any overlap
      return (lessonStart < availEnd && lessonEnd > availStart);
    });

    if (conflictingLessons.length > 0) {
      const conflictDetails = conflictingLessons.map(l => {
        const student = students.find(s => s.id === l.student_id);
        return {
          lessonId: l.id,
          studentName: student?.full_name || 'A student',
          scheduledAt: new Date(l.scheduled_at),
          duration: l.duration_minutes,
        };
      });

      setConflictInfo({
        count: conflictingLessons.length,
        lessons: conflictDetails,
        availabilityId: id,
      });
      setShowConflictModal(true);
      return;
    }

    // No conflicts, proceed with deletion
    try {
      await deleteTeacherAvailability({ id });
      showToast('Availability deleted');
      if (showAvailabilityModal) {
        handleCloseModal();
      }
      await loadScheduleData();
    } catch (error) {
      console.error('Failed to delete availability:', error);
      showToast(`Failed to delete: ${error.message}`);
    }
  };

  // Handle delete lesson
  const handleDeleteLesson = async () => {
    if (!selectedEvent?.id) return;

    if (confirm('Are you sure you want to delete this lesson?')) {
      try {
        await deleteLesson({ id: selectedEvent.id });
        showToast('Lesson deleted');
        handleCloseModal();
        await loadScheduleData();
      } catch (error) {
        console.error('Failed to delete lesson:', error);
        showToast(`Failed to delete: ${error.message}`);
      }
    }
  };

  // Handle give feedback - navigate to log page with lesson data
  const handleGiveFeedback = () => {
    if (!lessonForFeedback) return;

    // Store lesson data in sessionStorage for the log page to use
    const lessonData = {
      lessonId: lessonForFeedback.id,
      studentId: lessonForFeedback.resource.student_id,
      studentName: lessonForFeedback.student?.full_name || '',
      teacherId: lessonForFeedback.resource.teacher_id,
      teacherName: lessonForFeedback.teacher?.full_name || '',
      scheduledAt: lessonForFeedback.resource.scheduled_at,
      duration: lessonForFeedback.resource.duration_minutes,
    };

    sessionStorage.setItem('feedbackLesson', JSON.stringify(lessonData));

    handleCloseModal();
    navigate('log');
  };

  // Handle save availability
  const handleSaveAvailability = async () => {
    const teacherId = availabilityData.teacherId?.trim();

    if (!teacherId || teacherId === '') {
      showToast('Please select a teacher');
      return;
    }

    if (!tenantId) {
      showToast('Authentication error: No tenant found');
      return;
    }

    try {
      // If editing, delete the old availability first
      if (selectedEvent?.id) {
        await deleteTeacherAvailability({ id: selectedEvent.id });
      }

      await createTeacherAvailability({
        tenantId: tenantId,
        teacherId: teacherId,
        startAt: slotInfo.start.toISOString(),
        endAt: slotInfo.end.toISOString(),
      });

      showToast(selectedEvent ? 'Availability updated successfully' : 'Availability added successfully');
      handleCloseModal();
      await loadScheduleData();
    } catch (error) {
      console.error('Failed to save availability:', error);
      showToast(`Failed to save: ${error.message}`);
    }
  };

  // Helper: Filter teachers who are available during the selected slot and have no conflicts
  const getAvailableTeachersForSlot = useCallback(() => {
    if (!isAdmin) return teachers;

    // Determine which time range to use
    let slotStart, slotEnd;

    if (selectedEvent && lessonData.startAt && lessonData.duration_minutes) {
      // Editing mode - use start time from lessonData + duration
      slotStart = new Date(lessonData.startAt).getTime();
      slotEnd = slotStart + lessonData.duration_minutes * 60000;
    } else if (slotInfo) {
      // New lesson mode - use slotInfo
      slotStart = slotInfo.start.getTime();
      slotEnd = slotInfo.end.getTime();
    } else {
      // No time info available, return all teachers
      return teachers;
    }

    return teachers.filter(teacher => {
      // Check if teacher has availability covering this slot
      const hasAvailability = teacherAvailability.some(avail => {
        if (avail.teacher_id !== teacher.id) return false;
        const availStart = new Date(avail.start_at).getTime();
        const availEnd = new Date(avail.end_at).getTime();
        return availStart <= slotStart && availEnd >= slotEnd;
      });

      if (!hasAvailability) return false;

      // Check for conflicts with existing lessons (excluding current lesson if editing)
      const hasConflict = lessons.some(lesson => {
        if (lesson.teacher_id !== teacher.id || lesson.status === 'cancelled') return false;
        // Skip the current lesson when editing
        if (selectedEvent && lesson.id === selectedEvent.id) return false;
        const lessonStart = new Date(lesson.scheduled_at).getTime();
        const lessonEnd = lessonStart + lesson.duration_minutes * 60000;
        // Check for overlap
        return (slotStart < lessonEnd && slotEnd > lessonStart);
      });

      return !hasConflict;
    });
  }, [slotInfo, teachers, teacherAvailability, lessons, isAdmin, selectedEvent, lessonData.startAt, lessonData.duration_minutes]);

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

    // For editing, validate teacher availability based on start time + duration
    if (selectedEvent && isAdmin && lessonData.startAt) {
      const startTime = new Date(lessonData.startAt).getTime();
      const endTime = startTime + lessonData.duration_minutes * 60000;

      // Validate teacher availability for the entire lesson duration
      const hasAvailability = teacherAvailability.some(avail => {
        if (avail.teacher_id !== lessonData.teacherId) return false;
        const availStart = new Date(avail.start_at).getTime();
        const availEnd = new Date(avail.end_at).getTime();
        // Check if the ENTIRE lesson duration fits within availability
        return availStart <= startTime && availEnd >= endTime;
      });

      if (!hasAvailability) {
        showToast('Selected teacher is not available for the entire lesson duration');
        return;
      }
    }

    try {
      if (selectedEvent) {
        // Update existing lesson
        let scheduledAt;

        if (isAdmin && lessonData.startAt) {
          // Admin changed the time
          scheduledAt = new Date(lessonData.startAt).toISOString();
        } else {
          // Keep original time
          scheduledAt = selectedEvent.resource.scheduled_at;
        }

        await updateLesson({
          id: selectedEvent.id,
          scheduled_at: scheduledAt,
          teacher_id: lessonData.teacherId,
          student_id: lessonData.studentId,
          duration_minutes: lessonData.duration_minutes,
        });

        showToast('Lesson updated successfully');
      } else {
        // Create new lesson
        const scheduledAt = slotInfo?.start || new Date();

        await createLesson({
          tenant_id: tenantId,
          teacher_id: lessonData.teacherId,
          student_id: lessonData.studentId,
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: lessonData.duration_minutes,
          status: 'scheduled',
        });

        showToast('Lesson scheduled successfully');
      }

      handleCloseModal();
      await loadScheduleData();
    } catch (error) {
      console.error('Failed to save lesson:', error);
      showToast(`Failed to save: ${error.message}`);
    }
  };

  // Custom event component
  const EventComponent = ({ event }) => {
    const isAvailability = event.resource?.type === 'availability';
    const isCompleted = event.resource?.type === 'lesson' && event.resource?.status === 'completed';
    const student = event.student;
    const teacher = event.teacher;

    const initials = student?.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'S';

    const teacherInitials = teacher?.full_name
      ?.split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2) || 'T';

    // Lighter colors for availability (using -200 instead of -500)
    const availabilityColors = [
      'bg-blue-200 text-blue-800',
      'bg-green-200 text-green-800',
      'bg-purple-200 text-purple-800',
      'bg-orange-200 text-orange-800',
      'bg-pink-200 text-pink-800',
      'bg-teal-200 text-teal-800',
      'bg-indigo-200 text-indigo-800',
    ];

    // Lesson color comes from the per-student map (distinct per student); availability
    // falls back to a teacher-id hash over its lighter palette.
    const lessonColor = studentColorMap[student?.id] || LESSON_COLORS[0];
    const availabilityColorIndex = teacher?.id
      ? teacher.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % availabilityColors.length
      : 0;
    const eventColor = isAvailability ? availabilityColors[availabilityColorIndex] : lessonColor;

    // Completed (already logged) lessons: gray in week/day, original per-student color in month.
    // Strikethrough applies in every view.
    if (isCompleted) {
      const completedContainer = view === 'month'
        ? lessonColor
        : 'bg-gray-300 text-gray-600 opacity-70';
      return (
        <div className={`h-full rounded ${completedContainer} p-1.5 text-xs overflow-hidden`}>
          <div className="truncate font-medium line-through">
            {student?.full_name?.split(' ')[0] || 'Student'}
          </div>
          {view !== 'month' && (
            <div className="truncate text-[10px] opacity-90">
              {teacher?.full_name?.split(' ')[0] || ''}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={`h-full rounded ${eventColor} p-1.5 text-xs overflow-hidden ${isAvailability ? 'opacity-80 border-l-2 border-current' : ''}`}>
        <div className="truncate opacity-90 font-medium">
          {isAvailability ? (teacher?.full_name?.split(' ')[0] || 'Available') : (student?.full_name?.split(' ')[0] || 'Student')}
        </div>
        {view !== 'month' && !isAvailability && (
          <div className="truncate text-[10px] opacity-75">
            {teacher?.full_name?.split(' ')[0] || ''}
          </div>
        )}
        {isAvailability && view !== 'month' && (
          <div className="truncate text-[10px] opacity-75">
            Available
          </div>
        )}
      </div>
    );
  };

  const MonthDateHeader = useCallback(({ date: dateProp, label }) => {
  const isToday = dateProp.toDateString() === new Date().toDateString();

  const dayEvents = filteredEvents.filter(event => {
    const eventDate = new Date(event.start);
    return (
      eventDate.getDate() === dateProp.getDate() &&
      eventDate.getMonth() === dateProp.getMonth() &&
      eventDate.getFullYear() === dateProp.getFullYear()
    );
  });

  const dayLessons = dayEvents.filter(e => e.resource?.type !== 'availability');
  const dayAvailability = dayEvents.filter(e => e.resource?.type === 'availability');
  const dayLessonCount = dayLessons.length;

  // Count distinct teachers with availability on this day
  const distinctTeacherCount = new Set(dayAvailability.map(e => e.resource?.teacher_id)).size;

  const handleClick = () => {
    setDate(dateProp);
    setView(Views.DAY);
  };

  // Choose color based on first event of the day (matches EventComponent logic)
  const firstEvent = dayLessons[0];
  const badgeColor = (firstEvent?.student?.id && studentColorMap[firstEvent.student.id]) || LESSON_COLORS[0];

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center py-1 cursor-pointer hover:bg-gray-100 rounded transition"
      onClick={handleClick}
    >
      <div
        className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
          ${isToday ? 'bg-brand text-white' : 'text-ink'}`}
      >
        {dateProp.getDate()}
      </div>
      {dayLessonCount > 0 && (
        <div className={`mt-0.5`}>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeColor}`}>
            {dayLessonCount} {dayLessonCount === 1 ? (t.lesson || 'Lesson') : (t.lessons || 'Lessons')}
          </div>
        </div>
      )}
      {distinctTeacherCount > 0 && (
        <div className={`mt-0.5`}>
          <div className={`text-xs font-medium px-2 py-0.5 rounded-full bg-gray-200 text-gray-700`}>
            {distinctTeacherCount} {distinctTeacherCount === 1 ? 'Teacher' : 'Teachers'}
          </div>
        </div>
      )}
    </div>
  );
}, [filteredEvents, setDate, setView, t, studentColorMap]);

  // Custom toolbar component
  const CustomToolbar = ({ label, onNavigate, onView }) => {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={navigateToPrev}
            className="p-1.5 rounded hover:bg-gray-100 transition"
            title={t.previous || 'Previous'}
          >
            <ChevronLeft size={18} />
          </button>
          {/* <button
            type="button"
            onClick={navigateToToday}
            className="px-3 py-1.5 text-sm rounded hover:bg-gray-100 font-medium transition"
          >
            {t.today || 'Today'}
          </button> */}
        
          <span className="text-lg font-medium">{label}</span>

            <button
            type="button"
            onClick={navigateToNext}
            className="p-1.5 rounded hover:bg-gray-100 transition"
            title={t.next || 'Next'}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && teachers.length > 0 && (
            <select
              className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13px] outline-none focus:border-brand-mid"
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
            >
              <option value="all">{t.allTeachers || 'All Teachers'}</option>
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
                {t[v] || v}
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
              {t.newLesson}
            </Button>
          )
        }
      />

      <Card>
        <div className="p-4">
          <Calendar
            localizer={localizer}
            culture={lang === 'it' ? 'it' : 'en-US'}
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
                dateHeader: MonthDateHeader,
                header: ({ date, localizer }) => (
                  <div className="text-center text-xs font-medium uppercase tracking-wide text-muted">
                    {format(date, 'EEE', { locale: lang === 'it' ? it : enUS })}
                  </div>
                ),
              },
            }}
            messages={{
              date: t.date || 'Date',
              time: t.time || 'Time',
              event: t.event || 'Event',
            }}
            formats={{
              monthHeaderFormat: 'MMMM yyyy',
              weekdayFormat: 'EEE',
              dayFormat: 'EEE',
              agendaTimeRangeFormat: ({ start, end }) => {
                return `${format(start, 'h:mma', { locale: lang === 'it' ? it : enUS })} – ${format(end, 'h:mma', { locale: lang === 'it' ? it : enUS })}`;
              },
              timeGutterFormat: 'ha',
              selectRangeFormat: ({ start, end }) => {
                const formatStr = 'MMM d, h:mma';
                return `${format(start, formatStr, { locale: lang === 'it' ? it : enUS })} – ${format(end, formatStr, { locale: lang === 'it' ? it : enUS })}`;
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

              const swatchColor = studentColorMap[student.id] || LESSON_COLORS[0];

              return (
                <div key={student.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-7 h-7 rounded flex items-center justify-center text-white font-medium ${swatchColor}`}>
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

      {/* Type Choice Modal */}
      {showTypeChoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-medium">What would you like to add?</h2>
              <p className="text-sm text-muted mt-1">
                Selected: {format(slotInfo?.start || new Date(), 'MMM d, h:mma')} - {format(slotInfo?.end || new Date(), 'h:mma')}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleChooseScheduleLesson}
                className="w-full rounded-md border border-line bg-white px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="font-medium">Schedule a Lesson</div>
                <div className="text-sm text-muted">Book a lesson for a student with a teacher</div>
              </button>

              <button
                onClick={handleChooseAddAvailability}
                className="w-full rounded-md border border-line bg-white px-4 py-3 text-left hover:bg-gray-50 transition"
              >
                <div className="font-medium">Add Teacher Availability</div>
                <div className="text-sm text-muted">Set when a teacher is available for lessons</div>
              </button>

              <div className="flex justify-end pt-2">
                <Button onClick={handleCloseModal}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Modal */}
      {showAvailabilityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {selectedEvent ? 'Edit Teacher Availability' : 'Add Teacher Availability'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm text-muted bg-gray-50 p-2 rounded">
                {format(slotInfo?.start || new Date(), 'MMM d, yyyy h:mma')} - {format(slotInfo?.end || new Date(), 'h:mma')}
              </div>

              <div>
                <label className="block text-xs text-muted mb-1">Teacher *</label>
                <select
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={availabilityData.teacherId}
                  onChange={(e) => setAvailabilityData({ ...availabilityData, teacherId: e.target.value })}
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

              <div className="flex justify-end gap-3 pt-2">
                {selectedEvent && (
                  <Button onClick={() => handleDeleteAvailability(selectedEvent.id)} className="border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                )}
                <Button onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button primary onClick={handleSaveAvailability}>
                  Save Availability
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conflict Warning Modal */}
      {showConflictModal && conflictInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium text-orange-600">Cannot Delete Availability</h2>
              <button
                onClick={handleCloseModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium text-ink mb-2">
                  You have {conflictInfo.count} lesson{conflictInfo.count === 1 ? '' : 's'} scheduled during this availability period:
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-md p-3 space-y-2">
                  {conflictInfo.lessons.map((lesson, index) => (
                    <div key={lesson.lessonId} className="text-sm">
                      <div className="font-medium">{index + 1}. {lesson.studentName}</div>
                      <div className="text-muted text-xs">
                        {format(lesson.scheduledAt, 'MMM d, h:mma')} ({lesson.duration} min)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-sm text-muted">
                Please reschedule or cancel these lessons first, then try deleting the availability again.
              </div>

              <div className="flex justify-end pt-2">
                <Button primary onClick={handleCloseModal}>
                  OK, I Understand
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Confirmation Modal */}
      {showFeedbackModal && lessonForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">Give Lesson Feedback</h2>
              <button
                onClick={handleCloseModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-medium text-ink mb-2">
                  Do you want to give feedback for this lesson?
                </p>
                <div className="bg-gray-50 border border-line rounded-md p-3">
                  <div className="text-sm">
                    <div className="text-muted text-xs">Student</div>
                    <div className="font-medium">{lessonForFeedback.student?.full_name || 'Student'}</div>
                  </div>
                  <div className="mt-2 text-sm">
                    <div className="text-muted text-xs">Date & Time</div>
                    <div className="font-medium">
                      {format(new Date(lessonForFeedback.resource.scheduled_at), 'MMM d, yyyy h:mma')}
                    </div>
                    <div className="text-xs text-muted">({lessonForFeedback.resource.duration_minutes} min)</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={handleCloseModal}>
                  Cancel
                </Button>
                <Button primary onClick={handleGiveFeedback}>
                  Yes, Give Feedback
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              {selectedEvent ? (
                // Editing mode - show editable date/time for admins
                isAdmin ? (
                  <>
                    {selectedEvent?.resource?.status === 'completed' && (
                      <div className="text-xs text-muted bg-gray-50 border border-line rounded-md p-2">
                        This lesson is already logged — timing can no longer be changed.
                      </div>
                    )}
                    <div>
                      <label className="block text-xs text-muted mb-1">Start Date & Time *</label>
                      <input
                        type="datetime-local"
                        className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed"
                        value={lessonData.startAt}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          if (newValue === '') return;
                          setLessonData({ ...lessonData, startAt: newValue });
                        }}
                        disabled={selectedEvent?.resource?.status === 'completed'}
                        required
                        autoComplete="off"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted mb-1">Duration *</label>
                      <select
                        className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid disabled:bg-gray-100 disabled:text-muted disabled:cursor-not-allowed"
                        value={lessonData.duration_minutes}
                        onChange={(e) => setLessonData({ ...lessonData, duration_minutes: parseInt(e.target.value) })}
                        disabled={selectedEvent?.resource?.status === 'completed'}
                      >
                        {[30, 45, 50, 60, 90, 120].map((duration) => (
                          <option key={duration} value={duration}>
                            {duration} min
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="text-sm text-muted bg-gray-50 p-2 rounded">
                      End time: {lessonData.startAt && lessonData.duration_minutes ?
                        format(new Date(new Date(lessonData.startAt).getTime() + lessonData.duration_minutes * 60000), 'MMM d, yyyy h:mma')
                        : '—'}
                    </div>
                  </>
                ) : (
                  // Teachers see read-only
                  <div className="text-sm text-muted bg-gray-50 p-2 rounded">
                    {format(selectedEvent.start, 'MMM d, yyyy h:mma')} - {format(selectedEvent.end, 'h:mma')}
                  </div>
                )
              ) : (
                // Creating new lesson
                slotInfo && (
                  <div className="text-sm text-muted bg-gray-50 p-2 rounded">
                    {format(slotInfo.start, 'MMM d, yyyy h:mma')} - {format(slotInfo.end, 'h:mma')}
                  </div>
                )
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
                    {getAvailableTeachersForSlot().map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </option>
                    ))}
                  </select>
                  {slotInfo && getAvailableTeachersForSlot().length === 0 && (
                    <p className="text-xs text-orange-600 mt-1">No teachers available for this time slot</p>
                  )}
                  {slotInfo && getAvailableTeachersForSlot().length > 0 && getAvailableTeachersForSlot().length < teachers.length && (
                    <p className="text-xs text-muted mt-1">
                      Showing {getAvailableTeachersForSlot().length} of {teachers.length} teachers (others unavailable or have conflicts)
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {selectedEvent && (
                  <Button onClick={handleDeleteLesson} className="border-red-300 text-red-600 hover:bg-red-50">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                )}
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
