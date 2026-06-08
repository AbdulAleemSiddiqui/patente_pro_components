import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  Button, Card, Field, fieldClass, Page, PageHeader,
  Stars, Tag, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers } from '../lib/api.js';

const MANOEUVRES = [
  ['hillStart',     'vehicleControlCat', 3],
  ['parallelParking','parking',          2],
  ['uTurn',         'manoeuvresCat',     4],
  ['safeOvertaking','roadCat',           5],
];

const ROUTE_KEYS = ['city', 'extraUrban', 'highway', 'parking', 'night'];
const ERROR_KEYS  = ['belt','mirrors','priority','signs','distances','speed','horn','indicators','brakes','overtaking'];

function toggleSet(setter, key) {
  setter((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });
}

export default function LessonLogPage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [routes, setRoutes] = useState(new Set(['city']));
  const [errors, setErrors] = useState(new Set(['mirrors', 'distances']));
  const [rating, setRating] = useState(3);
  const [selected, setSelected] = useState(new Set());
  const [studentId, setStudentId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [duration, setDuration] = useState(50);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const data = await listUsers({ tenantId, role: 'student' });
        setStudents(data || []);
        setStudentId(data?.[0]?.id || '');
      } catch (error) {
        console.error('Failed to load students', error);
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

  return (
    <Page>
      <PageHeader title={t.log} subtitle={t.logSub} />
      <TwoColumnGrid>
        <Card title={t.lessonDetails}>
          <div className="flex flex-col gap-3 p-4">
            <Field label={t.student}>
              <select
                className={fieldClass}
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <Field label={t.date}>
                <input
                  className={fieldClass}
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </Field>
              <Field label={t.duration}>
                <input
                  className={fieldClass}
                  type="number"
                  value={duration}
                  min="30"
                  max="120"
                  onChange={(event) => setDuration(Number(event.target.value))}
                />
              </Field>
            </div>
            <Field label={t.routeType}>
              <div className="flex flex-wrap gap-1.5">
                {ROUTE_KEYS.map((key) => (
                  <Tag key={key} active={routes.has(key)} onClick={() => toggleSet(setRoutes, key)}>
                    {t[key]}
                  </Tag>
                ))}
              </div>
            </Field>
            <Field label={t.generalRating}>
              <Stars value={rating} onChange={setRating} />
            </Field>
            <Field label={t.instructorNotes}>
              <textarea
                className={`${fieldClass} h-[68px] resize-none`}
                placeholder={t.notesPlaceholder}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Field>
            <Button primary onClick={() => showToast(`${t.lessonSaved} ✓`)}>
              <Save size={16} />
              {t.saveLesson}
            </Button>
          </div>
        </Card>

        <div>
          <Card title={t.performedManoeuvres}>
            <div className="grid gap-2 p-4 sm:grid-cols-2">
              {MANOEUVRES.map(([name, category, stars]) => (
                <button
                  key={name}
                  className={`flex items-center justify-between rounded-md border p-3 text-left transition ${
                    selected.has(name)
                      ? 'border-brand-mid bg-brand-light'
                      : 'border-line bg-white hover:border-brand-mid'
                  }`}
                  onClick={() => toggleSet(setSelected, name)}
                  type="button"
                >
                  <span>
                    <span className="block text-[13px]">{t[name]}</span>
                    <span className="block text-[11px] text-muted">{t[category]}</span>
                  </span>
                  <Stars value={stars} readonly />
                </button>
              ))}
            </div>
          </Card>

          <Card title={t.errors}>
            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {ERROR_KEYS.map((key) => (
                  <Tag key={key} error active={errors.has(key)} onClick={() => toggleSet(setErrors, key)}>
                    {t[key]}
                  </Tag>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </TwoColumnGrid>
    </Page>
  );
}
