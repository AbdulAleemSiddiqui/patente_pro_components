import { useEffect, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
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
  const [notesModal, setNotesModal] = useState(null);
  const [query, setQuery] = useState('');
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

  // Case-insensitive filter over name and notes
  const filtered = examiners.filter((e) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return e.name.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
  });

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

      {/* Examiner list */}
      <Card>
        {examiners.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted">{t.examinersEmpty}</div>
        ) : (
          <>
            {/* Search */}
            <div className="border-b border-line p-3">
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.search}
                  className="h-9 w-full rounded-md border border-line bg-white pl-9 pr-3 text-sm outline-none transition placeholder:text-muted focus:border-brand"
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted">{t.examinersNotFound}</div>
            ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                <th className="w-1/4 px-4 py-2 text-left font-medium">{t.examinerName}</th>
                <th className="px-4 py-2 text-left font-medium">{t.examinerNotes}</th>
                <th className="w-20 px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((examiner) => (
                <tr
                  key={examiner.id}
                  className={`cursor-pointer align-top transition ${
                    selectedId === examiner.id ? 'bg-brand-light/60' : 'hover:bg-[#fafafa]'
                  }`}
                  onClick={() => { setSelectedId(examiner.id); setNotesModal(examiner); }}
                >
                  <td className="px-4 py-3 font-medium">{examiner.name}</td>
                  <td className="line-clamp-4 whitespace-pre-wrap px-4 py-3 leading-relaxed text-muted">
                    {examiner.notes || <span className="text-muted/60">{t.examinerNoNotes}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEditExaminer(examiner); }}
                        className="rounded p-1.5 text-muted hover:bg-gray-100 hover:text-ink"
                        title={t.edit}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeExaminer(examiner.id); }}
                        className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                        title={t.examinerDelete}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
            )}
          </>
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
      {/* Full notes modal (open on row click) */}
      {notesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setNotesModal(null)}>
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{notesModal.name}</h2>
              <button onClick={() => setNotesModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">
              {notesModal.notes || t.examinerNoNotes}
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}