import { useEffect, useState } from 'react';
import { Pencil, Plus, Trash2, X } from 'lucide-react';
import {
  Button, Card, Field, fieldClass, Page, PageHeader,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import {
  listExaminers, createExaminer, updateExaminer, deleteExaminer,
} from '../lib/api.js';

const emptyExaminer = () => ({ id: null, name: '', notes: '' });

export default function ExaminersPage({ showToast, t }) {
  const { tenantId } = useAuthStore();
  const [examiners, setExaminers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [examinerModal, setExaminerModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const data = await listExaminers({ tenantId });
        setExaminers(data || []);
        if (data?.length) setSelectedId(data[0].id);
      } catch (error) {
        console.error('Failed to load examiners', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  // Reload the list and keep a sensible selection (the preferred id if it still
  // exists, otherwise the current selection, otherwise the first examiner).
  const refreshExaminers = async (preferredId) => {
    const data = await listExaminers({ tenantId });
    setExaminers(data || []);
    setSelectedId((current) => {
      const wanted = preferredId ?? current;
      return data?.some((e) => e.id === wanted) ? wanted : data?.[0]?.id ?? null;
    });
  };

  const selected = examiners.find((e) => e.id === selectedId) || null;

  const openCreateExaminer = () => setExaminerModal(emptyExaminer());

  const openEditExaminer = (examiner) =>
    setExaminerModal({ id: examiner.id, name: examiner.name, notes: examiner.notes || '' });

  const saveExaminer = async () => {
    const draft = examinerModal;
    const name = draft.name.trim();
    if (!name) return showToast(t.examinerNameRequired);
    // Duplicate guard (examiners has a unique (tenant_id, name) constraint)
    const duplicate = examiners.some(
      (e) => e.id !== draft.id && e.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) return showToast(t.examinerDuplicate);

    setSaving(true);
    try {
      let saved;
      if (draft.id) {
        saved = await updateExaminer({ id: draft.id, name, notes: draft.notes });
        showToast(t.examinerUpdated);
      } else {
        saved = await createExaminer({ tenantId, name, notes: draft.notes });
        showToast(t.examinerCreated);
      }
      setExaminerModal(null);
      await refreshExaminers(saved.id);
    } catch (error) {
      console.error('Failed to save examiner', error);
      showToast(t.examinerSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  const removeExaminer = async (id) => {
    if (!confirm(t.examinerDeleteConfirm)) return;
    try {
      await deleteExaminer({ id });
      showToast(t.examinerDeleted);
      await refreshExaminers();
    } catch (error) {
      console.error('Failed to delete examiner', error);
      showToast(t.examinerDeleteFailed);
    }
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
        title={t.examinersTitle}
        action={
          <Button primary small onClick={openCreateExaminer}>
            <Plus size={14} />
            {t.addExaminerShort}
          </Button>
        }
      />

      {/* Top section — examiner list (select one, edit/delete in the row) */}
      <Card title={t.examinersTitle}>
        {examiners.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">{t.examinersEmpty}</div>
        ) : (
          <div className="max-h-[20vh] divide-y divide-line overflow-y-auto">
            {examiners.map((examiner) => (
              <div
                key={examiner.id}
                className={`flex items-center gap-3 px-4 py-3 transition ${
                  selectedId === examiner.id ? 'bg-brand-light/60' : 'hover:bg-[#fafafa]'
                }`}
              >
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => setSelectedId(examiner.id)}
                >
                  <div className="truncate text-sm font-medium">{examiner.name}</div>
                  {examiner.notes && (
                    <div className="truncate text-xs text-muted">{examiner.notes}</div>
                  )}
                </button>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditExaminer(examiner)}
                    className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-ink"
                    title={t.edit}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeExaminer(examiner.id)}
                    className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                    title={t.examinerDelete}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Bottom section — full-width, multi-line notes of the selected examiner */}
      <Card title={selected ? `${t.examinerNotes} · ${selected.name}` : t.examinerNotes}>
        {selected ? (
          selected.notes ? (
            <div className="max-h-[80vh] overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-relaxed">{selected.notes}</div>
          ) : (
            <div className="p-4 text-sm text-muted">{t.examinerNoNotes}</div>
          )
        ) : (
          <div className="p-4 text-sm text-muted">{t.examinerSelectPrompt}</div>
        )}
      </Card>

      {/* Examiner modal (add / edit) */}
      {examinerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{examinerModal.id ? t.editExaminer : t.addExaminer}</h2>
              <button onClick={() => setExaminerModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <Field label={`${t.examinerName} *`}>
                <input
                  className={fieldClass}
                  value={examinerModal.name}
                  placeholder={t.examinerNamePlaceholder}
                  onChange={(e) => setExaminerModal({ ...examinerModal, name: e.target.value })}
                />
              </Field>

              <Field label={t.examinerNotes}>
                <textarea
                  rows={6}
                  className={`${fieldClass} resize-y`}
                  value={examinerModal.notes || ''}
                  placeholder={t.examinerNotesPlaceholder}
                  onChange={(e) => setExaminerModal({ ...examinerModal, notes: e.target.value })}
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={() => setExaminerModal(null)}>{t.cancel}</Button>
                <Button
                  primary
                  onClick={saveExaminer}
                  className={saving ? 'opacity-60 pointer-events-none' : ''}
                >
                  {examinerModal.id ? t.saveChanges : t.laCreate}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}