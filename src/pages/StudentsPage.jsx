import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  Badge, Card, Dot, IconButton, Page, PageHeader,
  Pill, ProgressBar, SectionLabel, Stars, Tag,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers } from '../lib/api.js';

export default function StudentsPage({ navigate, t, lang }) {
  const { tenantId } = useAuthStore();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
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
          Loading…
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t.students}
        subtitle={t.studentsSub}
        action={
          <div className="flex flex-wrap gap-1">
            <Pill active>{t.allStudents} ({students.length})</Pill>
            <Pill>{t.myStudents} (8)</Pill>
            <Pill>{t.examReady} (3)</Pill>
          </div>
        }
      />
      <Card>
        <TableHeader t={t} />
        {students.map((s) => (
          <StudentRow
            key={s.id}
            student={s}
            t={t}
            lang={lang}
            onClick={() => setSelected(s)}
            onLog={() => navigate('log')}
          />
        ))}
      </Card>
      {selected && (
        <DetailPanel student={selected} t={t} onClose={() => setSelected(null)} />
      )}
    </Page>
  );
}

function TableHeader({ t }) {
  return (
    <div className="hidden grid-cols-[2fr_1.2fr_1fr_1fr_80px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
      <span>{t.student}</span>
      <span>{t.teacher}</span>
      <span>{t.progress}</span>
      <span>{t.status}</span>
      <span>{t.actions}</span>
    </div>
  );
}

function StudentRow({ student, t, lang, onClick, onLog }) {
  const progress = Math.floor(Math.random() * 100);
  const status = progress > 80 ? 'ready' : progress > 40 ? 'inProgress' : 'start';
  const tone = status === 'ready' ? 'green' : status === 'inProgress' ? 'warn' : 'blue';
  
  return (
    <button
      className="grid w-full gap-3 border-b border-line px-4 py-3 text-left text-[13px] transition last:border-b-0 hover:bg-[#f5f5f5] lg:grid-cols-[2fr_1.2fr_1fr_1fr_80px] lg:items-center"
      onClick={onClick}
    >
      <div>
        <div className="font-medium">{student.full_name}</div>
        <div className="mt-0.5 text-[11px] text-muted">
          — · {Math.floor(Math.random() * 20) + 1} {t.lessons} · {t.last}: {lang === 'it' ? 'recente' : 'recent'}
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
        onClick={(e) => { e.stopPropagation(); onLog(); }}
      >
        {t.logAction}
      </span>
    </button>
  );
}

function DetailPanel({ student, t, onClose }) {
  const mockManoeuvres = [['hillStart',3],['parallelParking',4],['uTurn',5],['overtaking',4],['motorway',3]];
  
  return (
    <Card
      title={`${student.full_name} — ${t.profileDetail}`}
      action={<IconButton label="Close" onClick={onClose}><X size={16} /></IconButton>}
    >
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <section>
          <SectionLabel>{t.manoeuvreEvaluation}</SectionLabel>
          <div className="flex flex-col gap-2 text-xs">
            {mockManoeuvres.map(([name, stars]) => (
              <div key={name} className="flex items-center justify-between gap-3">
                <span>{t[name]}</span>
                <Stars value={stars} readonly />
              </div>
            ))}
          </div>
        </section>
        <section>
          <SectionLabel>{t.latestNotes}</SectionLabel>
          <div className="py-1">
            {[
              { tone: 'good', title: 'cityGood',      meta: 'M. Rossi - 21 May',  tags: [['mirrorsOk','green'],['priorityOk','green']] },
              { tone: 'warn', title: 'parkingImprove',meta: 'F. Marino - 18 May', tags: [['steeringWarn','warn']] },
            ].map((note, i) => (
              <div key={`${note.title}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                {i < 1 && (
                  <div className="absolute left-[4px] top-3 h-[calc(100%-8px)] w-px bg-line" />
                )}
                <Dot tone={note.tone === 'good' ? 'green' : 'warn'} />
                <div>
                  <div className="text-[13px] font-medium">{t[note.title]}</div>
                  <div className="mt-0.5 text-[11px] text-muted">{note.meta}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {note.tags.map(([label, tone]) => (
                      <Tag key={label} passive active tone={tone}>{t[label]}</Tag>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}