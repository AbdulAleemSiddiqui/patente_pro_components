import { useState } from 'react';
import { User, Mail, Phone, Building, Lock, LogOut } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Field } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { updateUser } from '../lib/api.js';

export default function ProfilePage({ showToast, t, lang }) {
  const { session, role, full_name, logout, setSession } = useAuthStore();
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
      showToast('Name is required');
      return;
    }

    setUpdating(true);

    try {
      await updateUser({
        userId: session.user.id,
        fullName: editData.full_name,
        phone: editData.phone || null,
      });

      showToast('Profile updated successfully');
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
      showToast(`Failed to update: ${error.message}`);
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

      showToast('Password reset email sent! Check your inbox.');
    } catch (error) {
      console.error('Failed to send reset email:', error);
      showToast(`Failed to send reset email: ${error.message}`);
    }
  };

  const handleInputChange = (field) => (e) => {
    setEditData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!session) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Please login to view your profile
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title="My Profile"
        subtitle="Manage your account settings"
        action={
          !editing && (
            <Button onClick={handleEdit}>
              Edit Profile
            </Button>
          )
        }
      />

      <Card title="Account Information">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-light text-2xl font-medium text-brand">
              {full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-medium">{full_name || 'User'}</h3>
              <p className="text-sm text-muted capitalize">{role}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4 pt-4">
              <Field label="Full Name">
                <input
                  type="text"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editData.full_name}
                  onChange={handleInputChange('full_name')}
                  placeholder="Enter your full name"
                />
              </Field>

              <Field label="Email">
                <input
                  type="email"
                  className="w-full rounded-md border border-line bg-gray-100 px-2.5 py-2 text-[13px] text-muted outline-none"
                  value={userEmail}
                  disabled
                />
                <p className="mt-1 text-[11px] text-muted">Email cannot be changed</p>
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editData.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="Enter your phone number"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button onClick={handleCancel} disabled={updating}>
                  Cancel
                </Button>
                <Button primary onClick={handleSave} disabled={updating}>
                  {updating ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <User size={16} />
                  <span>Name:</span>
                </div>
                <span className="font-medium">{full_name || 'Not set'}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Mail size={16} />
                  <span>Email:</span>
                </div>
                <span className="font-medium break-all">{userEmail}</span>
              </div>
              <div className="grid grid-cols-[120px_1fr] gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted">
                  <Building size={16} />
                  <span>Role:</span>
                </div>
                <Badge tone="blue" className="w-fit capitalize">{role}</Badge>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card title="Account Settings">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div className="flex items-center gap-3">
              <Lock size={16} className="text-muted" />
              <div>
                <div className="text-sm font-medium">Password</div>
                <div className="text-[13px] text-muted">Send password reset email</div>
              </div>
            </div>
            <Button small onClick={handlePasswordReset}>
              Reset
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LogOut size={16} className="text-muted" />
              <div>
                <div className="text-sm font-medium">Logout</div>
                <div className="text-[13px] text-muted">Sign out of your account</div>
              </div>
            </div>
            <Button small onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </Page>
  );
}
