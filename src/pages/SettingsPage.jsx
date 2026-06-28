import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import {
  Button, Card, Field, fieldClass,
  Page, PageHeader, Tag, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listManeuvers, listErrorTags,
  listHighways, createHighway, deleteHighway,
  updateTenant,
} from '../lib/api.js';

export default function SettingsPage({ showToast, t }) {
  const { tenantId, tenant, loadTenant } = useAuthStore();
  const [maneuvers, setManeuvers] = useState([]);
  const [errorTags, setErrorTags] = useState([]);
  const [highways, setHighways] = useState([]);
  const [newHighway, setNewHighway] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // School profile (editable)
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }

        const [maneuverData, errorData, highwayData] = await Promise.all([
          listManeuvers({ tenantId }),
          listErrorTags({ tenantId }),
          listHighways({ tenantId }),
        ]);

        setManeuvers(maneuverData || []);
        setErrorTags(errorData || []);
        setHighways(highwayData || []);
      } catch (error) {
        console.error('Failed to load settings data', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // Populate the profile form once the tenant is loaded
  useEffect(() => {
    if (!tenant && tenantId) loadTenant(tenantId);
    if (tenant) {
      setSchoolName(tenant.name || '');
    }
  }, [tenant, tenantId, loadTenant]);

  const refreshHighways = async () => {
    try {
      const data = await listHighways({ tenantId });
      setHighways(data || []);
    } catch (error) {
      console.error('Failed to reload highways', error);
    }
  };

  const handleAddHighway = async () => {
    const name = newHighway.trim();
    if (!name) return;
    try {
      await createHighway({ tenantId, name });
      setNewHighway('');
      await refreshHighways();
      showToast(`${t.highways}: ${name} ✓`);
    } catch (error) {
      console.error('Failed to add highway', error);
      showToast('Failed to add highway', 'error');
    }
  };

  const handleDeleteHighway = async (id) => {
    try {
      await deleteHighway({ id });
      await refreshHighways();
      showToast(`${t.highways} ✓`);
    } catch (error) {
      console.error('Failed to delete highway', error);
      showToast('Failed to delete highway', 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateTenant({
        tenantId,
        name: schoolName.trim(),
      });
      await loadTenant(tenantId);
      showToast(`${t.settingsSaved} ✓`);
    } catch (error) {
      console.error('Failed to save settings', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
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
        title={t.schoolSettings}
        subtitle={t.schoolSettingsSub}
        action={
          <Button primary onClick={handleSaveProfile} className={saving ? 'opacity-60 pointer-events-none' : ''}>
            <Save size={16} />
            {t.saveSettings}
          </Button>
        }
      />

      <TwoColumnGrid>
        <Card title={t.schoolProfile}>
          <div className="grid gap-3 p-4">
            <Field label={t.schoolName}>
              <input
                className={fieldClass}
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="School name"
              />
            </Field>
          </div>
        </Card>

        <Card title={t.highways}>
          <div className="p-4">
            <div className="mb-3 flex flex-wrap gap-1.5">
              {highways.length === 0 ? (
                <span className="text-sm text-muted">—</span>
              ) : (
                highways.map((hw) => (
                  <span
                    key={hw.id}
                    className="inline-flex items-center gap-1 rounded-full border border-brand-mid bg-brand-light px-2.5 py-1 text-xs text-brand-mid"
                  >
                    {hw.name}
                    <button
                      type="button"
                      className="ml-0.5 inline-flex items-center justify-center rounded-full hover:text-accent"
                      title="Remove"
                      onClick={() => handleDeleteHighway(hw.id)}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                className={fieldClass}
                placeholder={t.addHighwayPlaceholder}
                value={newHighway}
                onChange={(e) => setNewHighway(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddHighway(); }}
              />
              <Button primary onClick={handleAddHighway}>
                <span>+</span>
                {t.addHighway}
              </Button>
            </div>
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
