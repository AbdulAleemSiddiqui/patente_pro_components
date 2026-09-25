import { useEffect, useState } from 'react';
import { Eye, EyeOff, Plus, Search, X, Trash2 } from 'lucide-react';
import {
  Badge, Button, Field, fieldClass, Page, PageHeader,
} from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, updateUser, listCategories, listBranches } from '../lib/api.js';
import { createUser, deleteUserWithData, updateUserPassword } from '../lib/adminApi.js';

// Client-side page size for both directories
const PAGE_SIZE = 25;

/**
 * Students and Teachers are separate pages sharing this directory
 * (client feedback 2026-09-24: simple naming, "+ Add" per page, search).
 */
export function UserDirectoryPage({ role: directoryRole, showToast, t, lang }) {
  const { tenantId, role: adminRole } = useAuthStore();
  const role = directoryRole; // 'student' | 'teacher' — the directory being viewed
  const noun = role === 'teacher' ? t.usersTeacherNoun : t.usersStudentNoun;
  const nounLower = noun.toLowerCase();

  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [branches, setBranches] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [newUser, setNewUser] = useState({ email: '', fullName: '', phone: '', password: '', category: '', branch: '' });
  const [editUser, setEditUser] = useState({ fullName: '', phone: '', category: '', branch: '' });
  const [passwordModal, setPasswordModal] = useState(null); // { userId, name, current, next }
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const [usersData, categoriesData, branchesData] = await Promise.all([
      listUsers({ tenantId, role }),
      role === 'student' ? listCategories({ tenantId }) : Promise.resolve([]),
      role === 'student' ? listBranches({ tenantId }) : Promise.resolve([]),
    ]);
    setUsers(usersData || []);
    setCategories(categoriesData || []);
    setBranches(branchesData || []);
  };

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        await refresh();
      } catch (error) {
        console.error('Failed to load users', error);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  // Filter by name, phone or email, case-insensitive
  const filtered = (() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q),
    );
  })();

  useEffect(() => { setPage(0); }, [query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageUsers = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const branchColor = (label) => branches.find((b) => b.label === label)?.color;

  // ── Add ────────────────────────────────────────────────────────────────
  const openAdd = () => {
    setNewUser({ email: '', fullName: '', phone: '', password: '', category: '', branch: '' });
    setShowAddModal(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.fullName || !newUser.password) {
      showToast(t.usersFillRequired);
      return;
    }
    // Category and Branch are required for students (client spec, 2026-09-23)
    if (role === 'student' && (!newUser.category || !newUser.branch)) {
      showToast(t.usersFillRequired);
      return;
    }
    setBusy(true);
    const result = await createUser({
      email: newUser.email,
      password: newUser.password,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role,
      tenantId,
      category: role === 'student' ? newUser.category : undefined,
      branch: role === 'student' ? newUser.branch : undefined,
    });
    setBusy(false);
    if (result.success) {
      showToast(t.usersCreatedSuccess.replace('{role}', noun));
      setShowAddModal(false);
      try {
        await refresh();
      } catch (error) {
        console.error('Failed to refresh users', error);
      }
    } else {
      showToast(t.usersCreateFailed.replace('{error}', result.error));
    }
  };

  // ── Edit ───────────────────────────────────────────────────────────────
  const openEdit = (user) => {
    setEditingUser(user);
    setEditUser({
      fullName: user.full_name,
      phone: user.phone || '',
      category: user.category || '',
      branch: user.branch || '',
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editUser.fullName) {
      showToast(t.usersNameRequired);
      return;
    }
    if (role === 'student' && (!editUser.category || !editUser.branch)) {
      showToast(t.usersFillRequired);
      return;
    }
    setBusy(true);
    try {
      await updateUser({
        userId: editingUser.id,
        fullName: editUser.fullName,
        phone: editUser.phone,
        category: role === 'student' ? editUser.category : undefined,
        branch: role === 'student' ? editUser.branch : undefined,
      });
      showToast(t.usersUpdated);
      setEditingUser(null);
      await refresh();
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast(t.usersUpdateFailed.replace('{error}', error.message));
    } finally {
      setBusy(false);
    }
  };

  // ── Password reset (admin only, opened from the edit modal) ────────────
  // Admin sets the new password directly (no current password needed).
  // Stage 1 shows the user + last-change date; "Reset password" reveals
  // stage 2: new password + confirmation, both with show/hide toggles.
  const openPasswordModal = (user) => {
    setPasswordModal({
      userId: user.id,
      name: user.full_name,
      lastChange: user.last_password_change || null,
      stage: 'info',
      next: '',
      confirm: '',
      showNew: false,
      showConfirm: false,
    });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordModal.next.length < 6) {
      showToast(t.usersPasswordTooShort);
      return;
    }
    if (passwordModal.next !== passwordModal.confirm) {
      showToast(t.usersPasswordMismatch);
      return;
    }
    setBusy(true);
    try {
      const result = await updateUserPassword({ userId: passwordModal.userId, password: passwordModal.next });
      if (result.success) {
        showToast(t.usersPasswordUpdated.replace('{name}', passwordModal.name));
        setPasswordModal(null);
        try {
          await refresh();
        } catch (error) {
          console.error('Failed to refresh users', error);
        }
      } else {
        showToast(t.usersPasswordUpdateFailed.replace('{error}', result.error));
      }
    } finally {
      setBusy(false);
    }
  };

  // ── Delete (modal asks how) ────────────────────────────────────────────
  const handleDeactivate = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await updateUser({ userId: deleteTarget.id, fullName: deleteTarget.full_name, isActive: false });
      showToast(t.usersDeactivatedSuccess.replace('{role}', noun));
      setDeleteTarget(null);
      await refresh();
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      showToast(t.usersDeactivateFailed.replace('{error}', error.message));
    } finally {
      setBusy(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    const result = await deleteUserWithData({ userId: deleteTarget.id });
    setBusy(false);
    if (result.success) {
      showToast(t.usersDeletedSuccess.replace('{role}', noun));
      setDeleteTarget(null);
      try {
        await refresh();
      } catch (error) {
        console.error('Failed to refresh users', error);
      }
    } else {
      showToast(t.usersDeleteFailed.replace('{error}', result.error));
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">{t.loading}</div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={role === 'teacher' ? t.teachers : t.students}
        subtitle={role === 'teacher' ? t.teachersSub : t.studentsAdminSub}
        action={
          <Button primary onClick={openAdd}>
            <Plus size={16} />
            {t.add}
          </Button>
        }
      />

      <div className="mb-3.5 overflow-hidden rounded-[10px] border border-line bg-white">
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

        <div>
          {pageUsers.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted">{t.studentsNotFound}</div>
          ) : (
            pageUsers.map((user) => {
              const initials = user.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U';
              return (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-light text-xs font-medium text-brand">
                      {initials}
                    </div>
                    <div>
                      <div
                        className="font-medium"
                        style={role === 'student' && branchColor(user.branch) ? { color: branchColor(user.branch) } : undefined}
                      >
                        {user.full_name}
                      </div>
                      {role === 'student' && (user.category || user.branch) && (
                        <div className="text-[11px] text-muted">
                          {[user.category, user.branch].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 truncate text-muted">{user.email}</div>
                  <div className="text-muted">{user.phone || t.notApplicable}</div>
                  <div className="flex items-center gap-2">
                    <Badge tone={user.is_active ? 'green' : 'muted'}>
                      {user.is_active ? t.active : t.inactive}
                    </Badge>
                    <Button small onClick={() => openEdit(user)}>{t.edit}</Button>
                    <button
                      onClick={() => setDeleteTarget(user)}
                      className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-accent"
                      title={t.delete}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pager */}
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-muted">
          <span>
            {t.showingRange
              .replace('{from}', filtered.length === 0 ? 0 : page * PAGE_SIZE + 1)
              .replace('{to}', Math.min((page + 1) * PAGE_SIZE, filtered.length))
              .replace('{total}', filtered.length)}
          </span>
          <div className="flex gap-2">
            <Button small disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              {t.prev}
            </Button>
            <Button small disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>
              {t.next}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{t.usersAddNewTitle.replace('{role}', noun)}</h2>
              <button onClick={() => setShowAddModal(false)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <Field label={t.usersFullNameRequired}>
                <input
                  type="text"
                  className={fieldClass}
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  placeholder={t.usersFullNamePlaceholder}
                  required
                />
              </Field>

              <Field label={t.usersEmailRequired}>
                <input
                  type="email"
                  className={fieldClass}
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder={t.usersEmailPlaceholder}
                  required
                />
              </Field>

              <Field label={t.usersPhoneOptional}>
                <input
                  type="tel"
                  className={fieldClass}
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  placeholder={t.usersPhonePlaceholder}
                />
              </Field>

              <Field label={t.usersTempPassword}>
                <input
                  type="password"
                  className={fieldClass}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder={t.usersTempPasswordPlaceholder}
                  required
                  minLength={6}
                />
                <p className="mt-1 text-[11px] text-muted">{t.usersTempPasswordHint}</p>
              </Field>

              {role === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.usersCategory}>
                    <select
                      className={fieldClass}
                      value={newUser.category}
                      onChange={(e) => setNewUser({ ...newUser, category: e.target.value })}
                      required
                    >
                      <option value="">{t.usersSelectCategory}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t.usersBranch}>
                    <select
                      className={fieldClass}
                      value={newUser.branch}
                      onChange={(e) => setNewUser({ ...newUser, branch: e.target.value })}
                      required
                    >
                      <option value="">{t.usersSelectBranch}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.label}>{b.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" onClick={() => setShowAddModal(false)} disabled={busy}>
                  {t.cancel}
                </Button>
                <Button type="submit" primary disabled={busy}>
                  {busy ? t.usersCreating : t.usersCreateButton.replace('{role}', noun)}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                {t.usersEditTitle.replace('{role}', noun)}
              </h2>
              <button onClick={() => setEditingUser(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              <Field label={t.usersFullNameRequired}>
                <input
                  type="text"
                  className={fieldClass}
                  value={editUser.fullName}
                  onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })}
                  placeholder={t.usersFullNamePlaceholder}
                  required
                />
              </Field>

              <Field label={t.phoneLabel}>
                <input
                  type="tel"
                  className={fieldClass}
                  value={editUser.phone}
                  onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })}
                  placeholder={t.usersPhonePlaceholder}
                />
              </Field>

              {role === 'student' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.usersCategory}>
                    <select
                      className={fieldClass}
                      value={editUser.category}
                      onChange={(e) => setEditUser({ ...editUser, category: e.target.value })}
                      required
                    >
                      <option value="">{t.usersSelectCategory}</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.label}>{c.label}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t.usersBranch}>
                    <select
                      className={fieldClass}
                      value={editUser.branch}
                      onChange={(e) => setEditUser({ ...editUser, branch: e.target.value })}
                      required
                    >
                      <option value="">{t.usersSelectBranch}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.label}>{b.label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {adminRole === 'admin' && (
                  <Button type="button" className="mr-auto" onClick={() => openPasswordModal(editingUser)} disabled={busy}>
                    {t.usersChangePassword}
                  </Button>
                )}
                <Button type="button" onClick={() => setEditingUser(null)} disabled={busy}>
                  {t.cancel}
                </Button>
                <Button type="submit" primary disabled={busy}>
                  {busy ? t.usersUpdating : t.saveChanges}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal — two stages: info → new password + confirm */}
      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{t.usersChangePassword}</h2>
              <button onClick={() => setPasswordModal(null)} className="rounded p-1 text-muted hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>

            <p className="text-[13px] text-muted">
              {t.usersPasswordFor.replace('{name}', passwordModal.name)}
            </p>
            <p className="mt-0.5 text-[11px] text-brand">
              {passwordModal.lastChange
                ? t.usersLastPasswordChange.replace(
                    '{date}',
                    new Date(passwordModal.lastChange).toLocaleString(lang === 'it' ? 'it-IT' : 'en-GB', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }),
                  )
                : t.usersPasswordNeverChanged}
            </p>

            {passwordModal.stage === 'info' ? (
              <div className="mt-5 flex justify-end">
                <Button primary onClick={() => setPasswordModal({ ...passwordModal, stage: 'reset' })}>
                  {t.usersResetPasswordButton}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="mt-4 space-y-4">
                <Field label={t.usersPasswordNewLabel}>
                  <div className="relative">
                    <input
                      type={passwordModal.showNew ? 'text' : 'password'}
                      className={fieldClass}
                      value={passwordModal.next}
                      onChange={(e) => setPasswordModal({ ...passwordModal, next: e.target.value })}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordModal({ ...passwordModal, showNew: !passwordModal.showNew })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      title={passwordModal.showNew ? t.hide : t.show}
                    >
                      {passwordModal.showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{t.usersTempPasswordHint}</p>
                </Field>

                <Field label={t.usersPasswordConfirmLabel}>
                  <div className="relative">
                    <input
                      type={passwordModal.showConfirm ? 'text' : 'password'}
                      className={fieldClass}
                      value={passwordModal.confirm}
                      onChange={(e) => setPasswordModal({ ...passwordModal, confirm: e.target.value })}
                      autoComplete="new-password"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordModal({ ...passwordModal, showConfirm: !passwordModal.showConfirm })}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                      title={passwordModal.showConfirm ? t.hide : t.show}
                    >
                      {passwordModal.showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </Field>

                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" onClick={() => setPasswordModal(null)} disabled={busy}>
                    {t.cancel}
                  </Button>
                  <Button type="submit" primary disabled={busy}>
                    {busy ? t.usersUpdating : t.saveChanges}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Modal — asks how to handle the removal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">{t.usersDeleteTitle.replace('{role}', noun)}</h2>
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
                disabled={busy}
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-[13px] text-muted">
              {t.usersDeleteQuestion.replace('{role}', nounLower)}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={busy}
                className="w-full rounded-md border border-line p-3 text-left transition hover:bg-gray-50 disabled:opacity-50"
              >
                <div className="text-[13px] font-medium">{t.usersDeactivateButton}</div>
                <div className="mt-0.5 text-[11px] text-muted">{t.usersDeleteDeactivateHint}</div>
              </button>

              <button
                type="button"
                onClick={handlePermanentDelete}
                disabled={busy}
                className="w-full rounded-md border border-red-200 p-3 text-left transition hover:bg-red-50 disabled:opacity-50"
              >
                <div className="text-[13px] font-medium text-accent">{t.usersDeletePermanentButton}</div>
                <div className="mt-0.5 text-[11px] text-muted">{t.usersDeletePermanentHint}</div>
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              <Button onClick={() => setDeleteTarget(null)} disabled={busy}>
                {t.cancel}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}

export function StudentsAdminPage(props) {
  return <UserDirectoryPage role="student" {...props} />;
}

export function TeachersPage(props) {
  return <UserDirectoryPage role="teacher" {...props} />;
}
