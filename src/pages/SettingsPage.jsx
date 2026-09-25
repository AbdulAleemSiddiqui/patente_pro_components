import { useRef, useState, useEffect } from 'react';
import { Car, Check, ImagePlus, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import {
  Button, Card, Field, fieldClass,
  Page, PageHeader, SectionLabel, TwoColumnGrid,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { fileToLogoDataUrl, isImageFileTooLarge } from '../lib/logo.js';
import {
  listManeuvers, listManeuverTypes, createManeuver, deleteManeuver, updateManeuver,
  listHighways, createHighway, deleteHighway,
  listCategories, createCategory, deleteCategory,
  listBranches, createBranch, updateBranch, deleteBranch,
  updateTenant,
} from '../lib/api.js';

// Small inline form under a catalog card: text input (+ optional color) + Add
function CatalogAddRow({ placeholder, withColor, color, onColorChange, onAdd, addLabel }) {
  const [value, setValue] = useState('');
  const submit = () => {
    if (!value.trim()) return;
    onAdd(value.trim());
    setValue('');
  };
  return (
    <div className="flex items-center gap-2">
      {withColor && (
        <input
          type="color"
          className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-line bg-white p-0.5"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          title={addLabel}
        />
      )}
      <input
        className={fieldClass}
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
      />
      <Button primary onClick={submit}>
        <Plus size={14} />
        {addLabel}
      </Button>
    </div>
  );
}

// Chip with delete — same interface for every catalog item
function CatalogChip({ label, color, onRename, onDelete, t, children }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-brand-mid bg-brand-light px-2.5 py-1 text-xs text-brand-mid"
      style={color ? { backgroundColor: `${color}22`, borderColor: color, color: '#000000d0' } : undefined}
    >
      {children || label}
      {onRename && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full hover:text-accent"
          title={t.edit}
          onClick={onRename}
        >
          <Pencil size={11} />
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full hover:text-accent"
          title={t.delete}
          onClick={onDelete}
        >
          <Trash2 size={11} />
        </button>
      )}
    </span>
  );
}

export default function SettingsPage({ showToast, t }) {
  const { tenantId, tenant, loadTenant } = useAuthStore();
  const [maneuvers, setManeuvers] = useState([]);
  const [maneuverTypes, setManeuverTypes] = useState([]);
  const [highways, setHighways] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Maneuver add state
  const [newManeuverType, setNewManeuverType] = useState('');
  const [newManeuverName, setNewManeuverName] = useState('');
  // Branch add color
  const [newBranchColor, setNewBranchColor] = useState('#2563eb');

  // Maneuver rename state
  const [editingManeuverId, setEditingManeuverId] = useState(null);
  const [maneuverDraft, setManeuverDraft] = useState('');
  const [renaming, setRenaming] = useState(false);

  // School profile (editable)
  const [schoolName, setSchoolName] = useState('');
  // Logo draft (data URL) — saved together with the profile via Save settings
  const [logoUrl, setLogoUrl] = useState(null);
  const logoInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const [maneuverData, typesData, highwayData, categoryData, branchData] = await Promise.all([
          listManeuvers({ tenantId }),
          listManeuverTypes({ tenantId }),
          listHighways({ tenantId }),
          listCategories({ tenantId }),
          listBranches({ tenantId }),
        ]);
        setManeuvers(maneuverData || []);
        setManeuverTypes(typesData || []);
        setHighways(highwayData || []);
        setCategories(categoryData || []);
        setBranches(branchData || []);
        if (typesData?.length) setNewManeuverType(typesData[0].id);
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
      setLogoUrl(tenant.logo_url || null);
    }
  }, [tenant, tenantId, loadTenant]);

  const refreshManeuvers = async () => {
    const data = await listManeuvers({ tenantId });
    setManeuvers(data || []);
  };

  const handleAddManeuver = async () => {
    const name = newManeuverName.trim();
    if (!name || !newManeuverType) return;
    try {
      await createManeuver({ tenantId, typeId: newManeuverType, name });
      setNewManeuverName('');
      await refreshManeuvers();
      showToast(`${t.maneuverCatalog}: ${name} ✓`);
    } catch (error) {
      console.error('Failed to add maneuver', error);
      showToast(t.settingsManeuverAddFailed, 'error');
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

  const handleDeleteManeuver = async (id) => {
    if (!confirm(t.settingsManeuverDeleteConfirm)) return;
    try {
      await deleteManeuver({ id });
      await refreshManeuvers();
      showToast(`${t.maneuverCatalog} ✓`);
    } catch (error) {
      console.error('Failed to delete maneuver', error);
      showToast(t.settingsManeuverDeleteFailed, 'error');
    }
  };

  const refreshHighways = async () => {
    const data = await listHighways({ tenantId });
    setHighways(data || []);
  };

  const handleAddHighway = async (name) => {
    try {
      await createHighway({ tenantId, name });
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

  const refreshCategories = async () => {
    const data = await listCategories({ tenantId });
    setCategories(data || []);
  };

  const handleAddCategory = async (label) => {
    try {
      await createCategory({ tenantId, label });
      await refreshCategories();
      showToast(`${t.categories}: ${label} ✓`);
    } catch (error) {
      console.error('Failed to add category', error);
      showToast(t.settingsCategoryAddFailed, 'error');
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!confirm(t.settingsCategoryDeleteConfirm)) return;
    try {
      await deleteCategory({ id });
      await refreshCategories();
      showToast(`${t.categories} ✓`);
    } catch (error) {
      console.error('Failed to delete category', error);
      showToast(t.settingsCategoryDeleteFailed, 'error');
    }
  };

  const refreshBranches = async () => {
    const data = await listBranches({ tenantId });
    setBranches(data || []);
  };

  const handleAddBranch = async (label) => {
    try {
      await createBranch({ tenantId, label, color: newBranchColor });
      setNewBranchColor('#2563eb');
      await refreshBranches();
      showToast(`${t.branches}: ${label} ✓`);
    } catch (error) {
      console.error('Failed to add branch', error);
      showToast(t.settingsBranchAddFailed, 'error');
    }
  };

  const handleBranchColor = async (branch, color) => {
    // Optimistic update, then persist
    setBranches((prev) => prev.map((b) => (b.id === branch.id ? { ...b, color } : b)));
    try {
      await updateBranch({ id: branch.id, color });
    } catch (error) {
      console.error('Failed to update branch color', error);
      showToast(t.settingsBranchUpdateFailed, 'error');
      await refreshBranches();
    }
  };

  const handleDeleteBranch = async (id) => {
    if (!confirm(t.settingsBranchDeleteConfirm)) return;
    try {
      await deleteBranch({ id });
      await refreshBranches();
      showToast(`${t.branches} ✓`);
    } catch (error) {
      console.error('Failed to delete branch', error);
      showToast(t.settingsBranchDeleteFailed, 'error');
    }
  };

  // Pick an image and store it uncropped (aspect preserved, downscaled to
  // fit 512px) as a draft — it is persisted with "Save settings". The app
  // also letterboxes it into an .ico for the browser tab.
  const handleLogoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!file) return;
    if (isImageFileTooLarge(file)) {
      showToast(t.logoFileTooLarge, 'error');
      return;
    }
    try {
      setLogoUrl(await fileToLogoDataUrl(file));
    } catch (error) {
      console.error('Failed to read logo file', error);
      showToast(t.logoFileInvalid, 'error');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await updateTenant({
        tenantId,
        name: schoolName.trim(),
        logoUrl,
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

            {/* Logo — shown in the menu and as the browser (.ico) icon */}
            <Field label={t.logoUpload}>
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={t.logoUpload}
                    className="h-14 min-w-0 flex-1 rounded-lg border border-line object-contain"
                  />
                ) : (
                  <div className="grid h-14 min-w-0 flex-1 place-items-center rounded-lg border border-dashed border-line text-muted">
                    <Car size={20} />
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <div>
                    <Button small onClick={() => logoInputRef.current?.click()}>
                      <ImagePlus size={14} />
                      {logoUrl ? t.logoChangeAction : t.logoUploadAction}
                    </Button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFile}
                    />
                  </div>
                  {logoUrl && (
                    <Button small onClick={() => setLogoUrl(null)}>
                      <Trash2 size={14} />
                      {t.delete}
                    </Button>
                  )}
                  <span className="text-[11px] text-muted">{t.logoUploadHint}</span>
                </div>
              </div>
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
                  <CatalogChip key={hw.id} label={hw.name} t={t} onDelete={() => handleDeleteHighway(hw.id)} />
                ))
              )}
            </div>
            <CatalogAddRow
              placeholder={t.addHighwayPlaceholder}
              onAdd={handleAddHighway}
              addLabel={t.add}
            />
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
                        <CatalogChip
                          key={maneuver.id}
                          label={maneuver.name}
                          t={t}
                          onRename={() => handleManeuverRenameStart(maneuver)}
                          onDelete={() => handleDeleteManeuver(maneuver.id)}
                        />
                      ),
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Add maneuver: type + name */}
            <div className="flex items-center gap-2 border-t border-line pt-3">
              <select
                className={`${fieldClass} w-auto`}
                value={newManeuverType}
                onChange={(e) => setNewManeuverType(e.target.value)}
              >
                {maneuverTypes.map((type) => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              <input
                className={fieldClass}
                placeholder={t.settingsManeuverNamePlaceholder}
                value={newManeuverName}
                onChange={(e) => setNewManeuverName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddManeuver(); }}
              />
              <Button primary onClick={handleAddManeuver}>
                <Plus size={14} />
                {t.add}
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-3.5">
          <Card title={t.categories}>
            <div className="p-4">
              <div className="mb-3 flex flex-wrap gap-1.5">
                {categories.length === 0 ? (
                  <span className="text-sm text-muted">—</span>
                ) : (
                  categories.map((cat) => (
                    <CatalogChip key={cat.id} label={cat.label} t={t} onDelete={() => handleDeleteCategory(cat.id)} />
                  ))
                )}
              </div>
              <CatalogAddRow
                placeholder={t.settingsCategoryPlaceholder}
                onAdd={handleAddCategory}
                addLabel={t.add}
              />
            </div>
          </Card>

          <Card title={t.branches}>
            <div className="p-4">
              <div className="mb-3 space-y-1.5">
                {branches.length === 0 ? (
                  <span className="text-sm text-muted">—</span>
                ) : (
                  branches.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2">
                      <input
                        type="color"
                        className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-line bg-white p-0.5"
                        value={branch.color || '#2563eb'}
                        onChange={(e) => handleBranchColor(branch, e.target.value)}
                        title={t.colorLabel}
                      />
                      <span className="text-sm font-medium">{branch.label}</span>
                      <button
                        type="button"
                        className="ml-auto rounded p-1 text-muted hover:bg-red-50 hover:text-accent"
                        title={t.delete}
                        onClick={() => handleDeleteBranch(branch.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <CatalogAddRow
                placeholder={t.settingsBranchPlaceholder}
                withColor
                color={newBranchColor}
                onColorChange={setNewBranchColor}
                onAdd={handleAddBranch}
                addLabel={t.add}
              />
            </div>
          </Card>
        </div>
      </TwoColumnGrid>
    </Page>
  );
}
