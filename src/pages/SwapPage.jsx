import { Plus } from 'lucide-react';
import { Button, Card, Dot, Page, PageHeader, TwoColumnGrid } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';

const INCOMING = [
  {
    from: 'Federica Marino',
    to: 'Marco Rossi',
    date: 'Friday, 24 May',
    time: '10:00',
    student: 'Sara Conti',
    reasonKey: 'medicalVisit',
  },
];

const HISTORY = [
  'swap1',
  'swap2',
];

const AVAILABLE = [
  { name: 'Federica Marino', availKey: 'freeMonWed',       tone: 'green' },
  { name: 'Luigi Costa',     availKey: 'freeThu',          tone: 'green' },
  { name: 'Giorgio Esposito',availKey: 'partlyAvailable',  tone: 'warn'  },
];

export default function SwapPage({ showToast, t }) {
  const { role } = useAuthStore();
  const isAdmin = role === 'admin';

  return (
    <Page>
      <PageHeader
        title={t.swapTitle}
        subtitle={t.swapSub}
        action={
          !isAdmin && (
            <Button primary onClick={() => showToast(`${t.newSwapSent} ✓`)}>
              <Plus size={16} />{t.newSwap}
            </Button>
          )
        }
      />

      <TwoColumnGrid>
        <Card title={t.incomingRequests} action={<span className="inline-flex w-fit rounded-full bg-warn-light px-2 py-0.5 text-[11px] text-warn">{t.oneNew}</span>}>
          {INCOMING.map((req) => (
            <div
              key={`${req.from}-${req.date}`}
              className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
            >
              <Dot tone="warn" />
              <div className="flex-1">
                <div className="font-medium">{req.from} → {req.to}</div>
                <div className="mt-0.5 text-[11px] text-muted">
                  {req.date} · {req.time} · {t.student}: {req.student}
                </div>
                <div className="mt-0.5 text-[11px] text-warn">
                  {t.reason}: {t[req.reasonKey]}
                </div>
              </div>
              {!isAdmin && (
                <div className="flex gap-1.5">
                  <Button small success onClick={() => showToast(`${t.accepted} ✓`)}>{t.accept}</Button>
                  <Button small onClick={() => showToast(t.rejected)}>{t.reject}</Button>
                </div>
              )}
            </div>
          ))}
        </Card>

        {!isAdmin && (
          <Card title={t.availability}>
            {AVAILABLE.map((inst) => (
              <div
                key={inst.name}
                className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
              >
                <Dot tone={inst.tone} />
                <div className="flex-1">
                  <div className="font-medium">{inst.name}</div>
                  <div className="text-[11px] text-muted">{t[inst.availKey]}</div>
                </div>
                <Button small onClick={() => showToast(t.contactSent)}>{t.contact}</Button>
              </div>
            ))}
          </Card>
        )}
      </TwoColumnGrid>

      <Card title={t.swapHistory}>
        {[
          `16 May · Marco Rossi ↔ Luigi Costa · ${t.student}: Anna Moretti · ${t.completedStatus}`,
          `10 May · Federica Marino ↔ Marco Rossi · ${t.student}: Luca Bianchi · ${t.completedStatus}`,
        ].map((text) => (
          <div
            key={text}
            className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
          >
            <Dot tone="green" />
            <div className="flex-1">{text}</div>
          </div>
        ))}
      </Card>
    </Page>
  );
}