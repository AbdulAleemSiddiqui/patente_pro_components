import { useEffect, useState } from 'react';
import { Check, Pencil, Save, X } from 'lucide-react';
import {
  Button, Card, Field, fieldClass,
  Page, PageHeader, SectionLabel, Tag, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listManeuvers, listErrorTags, updateManeuver,
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

  // Maneuver rename state
  const [editingManeuverId, setEditingManeuverId] = useState(null);
  const [maneuverDraft, setManeuverDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

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
      showToast(t.settingsHighwayAddFailed, 'error');
    }
  };

  const handleDeleteHighway = async (id) => {
    try {
      await deleteHighway({ id });
      await refreshHighways();
      showToast(`${t.highways} ✓`);
    } catch (error) {
      console.error('Failed to delete highway', error);
      showToast(t.settingsHighwayDeleteFailed, 'error');
    }
  };

  const refreshManeuvers = async () => {
    try {
      const data = await listManeuvers({ tenantId });
      setManeuvers(data || []);
    } catch (error) {
      console.error('Failed to reload maneuvers', error);
    }
  };

  const handleManeuverRenameStart = (maneuver) => {
    setEditingManeuverId(maneuver.id);
    setManeuverDraft(maneuver.name);
  };

  const handleManeuverRenameCancel = () => {
    setEditingManeuverId(null);
    setManeuverDraft('');
  };

  const handleManeuverRenameSave = async (maneuver) => {
    const name = maneuverDraft.trim();
    if (!name) {
      showToast(t.settingsManeuverRenameFailed, 'error');
      return;
    }
    if (name === maneuver.name) {
      handleManeuverRenameCancel();
      return;
    }
    // Reject duplicates up-front (maneuvers has a unique (tenant_id, name) constraint)
    const duplicate = maneuvers.some(
      (m) => m.id !== maneuver.id && m.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      showToast(t.settingsManeuverRenameFailed, 'error');
      return;
    }
    setRenaming(true);
    try {
      await updateManeuver({ id: maneuver.id, name });
      setEditingManeuverId(null);
      setManeuverDraft('');
      await refreshManeuvers();
      showToast(`${t.maneuverCatalog}: ${name} ✓`);
    } catch (error) {
      console.error('Failed to rename maneuver', error);
      showToast(t.settingsManeuverRenameFailed, 'error');
    } finally {
      setRenaming(false);
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
      showToast(t.settingsSaveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Group maneuvers by their parent type (FASE 1 / FASE 2 / PERCORSO URBANO),
  // ordered by the type's order_index, then each maneuver's order_index —
  // same grouping as the Log lesson page.
  const getManeuversByType = () => {
    const sorted = [...maneuvers].sort((a, b) => {
      const ta = a.type?.order_index ?? 999;
      const tb = b.type?.order_index ?? 999;
      if (ta !== tb) return ta - tb;
      return (a.order_index ?? 0) - (b.order_index ?? 0);
    });
    return sorted.reduce((acc, maneuver) => {
      const type = maneuver.type?.name || 'Other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(maneuver);
      return acc;
    }, {});
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          {t.loadingDots}
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
                placeholder={t.settingsSchoolNamePlaceholder}
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
                      title={t.settingsRemove}
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
          <div className="space-y-3 p-4">
            {maneuvers.length === 0 ? (
              <span className="text-sm text-muted">—</span>
            ) : (
              Object.entries(getManeuversByType()).map(([typeName, items]) => (
                <div key={typeName}>
                  <SectionLabel>{typeName}</SectionLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((maneuver) =>
                      editingManeuverId === maneuver.id ? (
                        <span
                          key={maneuver.id}
                          className="inline-flex items-center gap-1 rounded-full border border-brand bg-white px-2.5 py-0.5"
                        >
                          <input
                            autoFocus
                            className="w-44 bg-transparent text-xs outline-none"
                            value={maneuverDraft}
                            disabled={renaming}
                            onChange={(e) => setManeuverDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleManeuverRenameSave(maneuver);
                              if (e.key === 'Escape') handleManeuverRenameCancel();
                            }}
                          />
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full text-success hover:opacity-70"
                            title={t.saveChanges}
                            disabled={renaming}
                            onClick={() => handleManeuverRenameSave(maneuver)}
                          >
                            <Check size={12} />
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full text-muted hover:text-accent"
                            title={t.cancel}
                            onClick={handleManeuverRenameCancel}
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : (
                        <span
                          key={maneuver.id}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-mid bg-brand-light px-2.5 py-1 text-xs text-brand-mid"
                        >
                          {maneuver.name}
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-full hover:text-accent"
                            title={t.edit}
                            onClick={() => handleManeuverRenameStart(maneuver)}
                          >
                            <Pencil size={11} />
                          </button>
                        </span>
                      ),
                    )}
                  </div>
                </div>
              ))
            )}
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
