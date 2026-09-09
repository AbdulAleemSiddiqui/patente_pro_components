import { useState } from 'react';
import { User, Mail, Phone, Building, Lock, Clock } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Field } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { updateUser } from '../lib/api.js';

export default function ProfilePage({ showToast, t, lang }) {
  const { session, role, full_name, setSession } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [editData, setEditData] = useState({
    full_name: full_name || '',
    phone: '',
  });

  // User metadata from auth
  const userEmail = session?.user?.email;

  const handleEdit = () => {
    setEditing(true);
    setEditData({
      full_name: full_name || '',
      phone: session?.user?.user_metadata?.phone || '',
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setEditData({
      full_name: full_name || '',
      phone: '',
    });
  };

  const handleSave = async () => {
    if (!editData.full_name) {
      showToast(t.profileNameRequired);
      return;
    }

    setUpdating(true);

    try {
      await updateUser({
        userId: session.user.id,
        fullName: editData.full_name,
        phone: editData.phone || null,
      });

      showToast(t.profileUpdated);
      setEditing(false);

      // Refresh session to get updated metadata
      const { requireSupabase } = await import('../lib/supabase.js');
      const supabase = requireSupabase();

      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (setSession) {
        setSession(newSession);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showToast(t.profileUpdateFailed.replace('{error}', error.message));
    } finally {
      setUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { requireSupabase } = await import('../lib/supabase.js');
      const supabase = requireSupabase();

      const { error } = await supabase.auth.resetPasswordForEmail(userEmail);

      if (error) throw error;

      showToast(t.profileResetSent);
    } catch (error) {
      console.error('Failed to send reset email:', error);
      showToast(t.profileResetFailed.replace('{error}', error.message));
    }
  };

  const handleInputChange = (field) => (e) => {
    setEditData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!session) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          {t.profileLoginRequired}
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t.profileTitle}
        subtitle={t.profileSubtitle}
        action={
          !editing && (
            <Button onClick={handleEdit}>
              {t.profileEditButton}
            </Button>
          )
        }
      />

      <Card title={t.profileAccountInfo}>
        <div className="space-y-4 p-4">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-light text-2xl font-medium text-brand">
              {full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-medium">{full_name || t.userFallback}</h3>
              <p className="text-sm text-muted capitalize">{role}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4 pt-4">
              <Field label={t.profileFullName}>
                <input
                  type="text"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editData.full_name}
                  onChange={handleInputChange('full_name')}
                  placeholder={t.profileFullNamePlaceholder}
                />
              </Field>

              <Field label={t.profileEmailLabel}>
                <input
                  type="email"
                  className="w-full rounded-md border border-line bg-gray-100 px-2.5 py-2 text-[13px] text-muted outline-none"
                  value={userEmail}
                  disabled
                />
                <p className="mt-1 text-[11px] text-muted">{t.profileEmailLocked}</p>
              </Field>

              <Field label={t.profilePhoneLabel}>
                <input
                  type="tel"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder={t.profilePhonePlaceholder}
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={handleCancel} disabled={updating}>
                  {t.cancel}
                </Button>
                <Button primary onClick={handleSave} disabled={updating}>
                  {updating ? t.saving : t.saveChanges}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <User size={16} />
                  <span>{t.profileNameColon}</span>
                </div>
                <span className="font-medium">{full_name || t.notSet}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={16} />
                  <span>{t.profileEmailColon}</span>
                </div>
                <span className="font-medium break-all">{userEmail}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Building size={16} />
                  <span>{t.profileRoleColon}</span>
                </div>
                <Badge tone="blue" className="w-fit capitalize">{role}</Badge>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title={t.profileAccountSettings}>
        <div className="space-y-4 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-muted" />
              <div>
                <div className="text-sm font-medium">{t.profilePasswordLabel}</div>
                <div className="text-[13px] text-muted">{t.profileResetDescription}</div>
              </div>
            </div>
            <Button small disabled className="opacity-60" title={t.comingSoon}>
              <Clock size={12} />
              <span className="ml-1">{t.comingSoon}</span>
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
