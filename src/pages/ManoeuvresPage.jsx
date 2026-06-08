import { Car, Eye, ParkingCircle, Route } from 'lucide-react';
import { Badge, Card, Page, PageHeader, TwoColumnGrid } from '../components/ui.jsx';

const CARDS = [
  [Car,          'vehicleControlTitle', [
    ['seatMirrors',   'green', 'base'],
    ['clutchBrake',   'green', 'base'],
    ['hillStartBrake','warn',  'medium'],
    ['smoothGears',   'green', 'base'],
  ]],
  [ParkingCircle,'parkingTitle', [
    ['parallelStreet',      'red',  'hard'],
    ['angleParking',        'warn', 'medium'],
    ['perpendicularParking','warn', 'medium'],
    ['tightExit',           'red',  'hard'],
  ]],
  [Route,        'roadManoeuvres', [
    ['doubleRoadUTurn',   'red',  'hard'],
    ['turns',             'warn', 'medium'],
    ['slowVehicleOvertake','red', 'hard'],
    ['roundabout',        'warn', 'medium'],
  ]],
  [Eye,          'behaviours', [
    ['systematicMirrors','red',  'critical'],
    ['signalIndicators', 'red',  'critical'],
    ['respectPriority',  'red',  'critical'],
    ['laneKeeping',      'warn', 'medium'],
  ]],
];

export default function ManoeuvresPage({ t }) {
  return (
    <Page>
      <PageHeader
        title={`${t.manoeuvres} & ${t.examReady}`}
        subtitle={t.manoeuvresSub}
      />
      <TwoColumnGrid>
        {CARDS.map(([Icon, titleKey, rows]) => (
          <Card
            key={titleKey}
            title={
              <span className="flex items-center gap-2">
                <Icon size={16} /> {t[titleKey]}
              </span>
            }
          >
            <div className="flex flex-col px-4 py-3 text-[13px]">
              {rows.map(([label, tone, level], i) => (
                <div
                  key={label}
                  className={`flex items-center justify-between gap-3 py-2 ${
                    i < rows.length - 1 ? 'border-b border-line' : ''
                  }`}
                >
                  <span>{t[label]}</span>
                  <Badge tone={tone}>{t[level]}</Badge>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </TwoColumnGrid>
    </Page>
  );
}