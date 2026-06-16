import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import {
  Badge, Button, Card, Field, fieldClass,
  Page, PageHeader, Tag, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listRouteTypesForTenant, listManeuvers, listErrorTags } from '../lib/api.js';

export default function SettingsPage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [routeTypes, setRouteTypes] = useState([]);
  const [maneuvers, setManeuvers] = useState([]);
  const [errorTags, setErrorTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const [routeData, maneuverData, errorData] = await Promise.all([
          listRouteTypesForTenant({ tenantId }),
          listManeuvers({ tenantId }),
          listErrorTags({ tenantId }),
        ]);

        setRouteTypes(routeData || []);
        setManeuvers(maneuverData || []);
        setErrorTags(errorData || []);
      } catch (error) {
        console.error('Failed to load settings data', error);
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
      <PageHeader
        title={t.schoolSettings}
        subtitle={t.schoolSettingsSub}
        action={
          <Button primary onClick={() => showToast(`${t.settingsSaved} ✓`)}>
            <Save size={16} />
            {t.saveSettings}
          </Button>
        }
      />

      <div className="mb-4 rounded-md bg-[#6eb5f5] px-4 py-2.5 text-center">
        <span className="text-sm font-medium text-white">Coming soon - This feature is under development</span>
      </div>

      <TwoColumnGrid>
        <Card title={t.schoolProfile}>
          <div className="grid gap-3 p-4">
            <Field label={t.schoolName}>
              <input className={fieldClass} defaultValue="Autoscuola Genova Centro" />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t.cityLabel}>
                <select className={fieldClass} defaultValue="Genova">
                  <option>Genova</option>
                  <option>Milano</option>
                  <option>Torino</option>
                </select>
              </Field>
              <Field label={t.themeColor}>
                <input className={fieldClass} type="color" defaultValue="#1a3a5c" />
              </Field>
            </div>
            <Field label={t.logoUpload}>
              <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line bg-[#f5f5f5] text-sm text-muted">
                {t.logoUploadHint}
              </div>
            </Field>
          </div>
        </Card>

        <Card title={t.routeConfiguration}>
          <div className="divide-y divide-line">
            {routeTypes.map((route) => (
              <div key={route.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-medium">{route.name}</div>
                  <Badge tone={route.route_sub_types?.length ? 'warn' : 'green'}>
                    {route.route_sub_types?.length ? t.requiresSubSelection : t.noSubSelection}
                  </Badge>
                </div>
                {route.route_sub_types?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {route.route_sub_types.map((sub) => (
                      <Tag key={sub.id} passive active>{sub.label}</Tag>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </TwoColumnGrid>

      <TwoColumnGrid>
        <Card title={t.maneuverCatalog}>
          <div className="flex flex-wrap gap-1.5 p-4">
            {maneuvers.map((maneuver) => (
              <Tag key={maneuver.id} passive active>{maneuver.name}</Tag>
            ))}
          </div>
        </Card>
        <Card title={t.errorTagCatalog}>
          <div className="flex flex-wrap gap-1.5 p-4">
            {errorTags.map((tag) => (
              <Tag key={tag.id} passive error active>{tag.label}</Tag>
            ))}
          </div>
        </Card>
      </TwoColumnGrid>
    </Page>
  );
}
