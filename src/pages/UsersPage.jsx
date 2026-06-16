import { useEffect, useState } from 'react';
import { Plus, UserPlus, X, Clock } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Field } from '../components/ui.jsx';
import useAuthStore from '../store/useAuthStore.js';
import { listUsers, updateUser } from '../lib/api.js';
import { createUser } from '../lib/adminApi.js';

export default function UsersPage({ showToast, t, lang }) {
  const { tenantId } = useAuthStore();
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userType, setUserType] = useState('teacher'); // 'teacher' or 'student'
  const [editingUser, setEditingUser] = useState(null); // User being edited
  const [newUser, setNewUser] = useState({
    email: '',
    fullName: '',
    phone: '',
    password: '',
  });
  const [editUser, setEditUser] = useState({
    fullName: '',
    phone: '',
  });
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        if (!tenantId) {
          setLoading(false);
          return;
        }
        const [teachersData, studentsData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
        ]);
        setTeachers(teachersData || []);
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Failed to load users', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [tenantId]);

  const handleOpenAddModal = (type) => {
    setUserType(type);
    setNewUser({ email: '', fullName: '', phone: '', password: '' });
    setShowAddUserModal(true);
  };

  const handleCloseModal = () => {
    setShowAddUserModal(false);
    setNewUser({ email: '', fullName: '', phone: '', password: '' });
    setCreating(false);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (!newUser.email || !newUser.fullName || !newUser.password) {
      showToast('Please fill in all required fields');
      return;
    }

    setCreating(true);

    const result = await createUser({
      email: newUser.email,
      password: newUser.password,
      fullName: newUser.fullName,
      phone: newUser.phone,
      role: userType,
      tenantId: tenantId,
    });

    setCreating(false);

    if (result.success) {
      showToast(`${userType === 'teacher' ? 'Teacher' : 'Student'} created successfully`);
      handleCloseModal();

      // Refresh the user lists
      try {
        const [teachersData, studentsData] = await Promise.all([
          listUsers({ tenantId, role: 'teacher' }),
          listUsers({ tenantId, role: 'student' }),
        ]);
        setTeachers(teachersData || []);
        setStudents(studentsData || []);
      } catch (error) {
        console.error('Failed to refresh users', error);
      }
    } else {
      showToast(`Failed to create user: ${result.error}`);
    }
  };

  const handleInputChange = (field) => (e) => {
    setNewUser((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleEditInputChange = (field) => (e) => {
    setEditUser((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleOpenEditModal = (user) => {
    setEditingUser(user);
    setEditUser({
      fullName: user.full_name,
      phone: user.phone || '',
    });
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingUser(null);
    setEditUser({ fullName: '', phone: '' });
    setUpdating(false);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();

    if (!editUser.fullName) {
      showToast('Please enter a name');
      return;
    }

    setUpdating(true);

    try {
      await updateUser({
        userId: editingUser.id,
        fullName: editUser.fullName,
        phone: editUser.phone,
      });

      showToast('User updated successfully');
      handleCloseEditModal();

      // Refresh the user lists
      const [teachersData, studentsData] = await Promise.all([
        listUsers({ tenantId, role: 'teacher' }),
        listUsers({ tenantId, role: 'student' }),
      ]);
      setTeachers(teachersData || []);
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Failed to update user:', error);
      showToast(`Failed to update user: ${error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <Page>
        <div className="flex items-center justify-center py-12 text-sm text-muted">
          Loading�
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <PageHeader
        title={t.userManagement}
        subtitle={t.userManagementSub}
        action={
          <div className="flex gap-2">
            <Button onClick={() => handleOpenAddModal('student')}>
              <Plus size={16} />{t.inviteStudent}
            </Button>
            <Button primary onClick={() => handleOpenAddModal('teacher')}>
              <UserPlus size={16} />{t.inviteTeacher}
            </Button>
          </div>
        }
      />

      <Card title={t.teachers}>
        <div className="hidden grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] gap-3 border-b border-line px-4 py-2 text-[11px] uppercase tracking-wide text-muted lg:grid">
          <span>{t.name}</span><span>Email</span><span>Phone</span>
          <span>{t.status}</span><span>{t.actions}</span>
        </div>
        {teachers.map((teacher) => {
          const initials = teacher.full_name?.split(' ').map((n) => n[0]).join('').toUpperCase() || 'T';
          return (
            <div
              key={teacher.id}
              className="grid gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0 lg:grid-cols-[1.4fr_1.4fr_1fr_1fr_130px] lg:items-center"
            >
              <div className="flex items-center gap-2.5">
                <div className="grid size-8 place-items-center rounded-full bg-brand-light text-xs font-medium text-brand">
                  {initials}
                </div>
                <div>
                  <div className="font-medium">{teacher.full_name}</div>
                </div>
              </div>
              <div className="text-muted">{teacher.email}</div>
              <div className="text-muted">{teacher.phone || 'N/A'}</div>
              <Badge tone={teacher.is_active ? 'green' : 'warn'}>{teacher.is_active ? t.active : 'inactive'}</Badge>
              <div className="flex gap-1.5">
                <Button small onClick={() => handleOpenEditModal(teacher)}>{t.edit}</Button>
                <Button small disabled className="opacity-60">
                  <Clock size={12} />
                </Button>
              </div>
            </div>
          );
        })}
      </Card>

      <Card title={t.studentDirectory}>
        {students.map((student) => (
          <div
            key={student.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 text-[13px] last:border-b-0"
          >
            <div>
              <div className="font-medium">{student.full_name}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone="blue">{t.inProgress}</Badge>
              <Button small onClick={() => handleOpenEditModal(student)}>{t.edit}</Button>
            </div>
          </div>
        ))}
      </Card>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Add New {userType === 'teacher' ? 'Teacher' : 'Student'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <Field label="Full Name *">
                <input
                  type="text"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={newUser.fullName}
                  onChange={handleInputChange('fullName')}
                  placeholder="Enter full name"
                  required
                />
              </Field>

              <Field label="Email *">
                <input
                  type="email"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={newUser.email}
                  onChange={handleInputChange('email')}
                  placeholder="Enter email address"
                  required
                />
              </Field>

              <Field label="Phone (optional)">
                <input
                  type="tel"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={newUser.phone}
                  onChange={handleInputChange('phone')}
                  placeholder="Enter phone number"
                />
              </Field>

              <Field label="Temporary Password *">
                <input
                  type="password"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={newUser.password}
                  onChange={handleInputChange('password')}
                  placeholder="Enter temporary password"
                  required
                  minLength={6}
                />
                <p className="mt-1 text-[11px] text-muted">
                  User will be able to change this after logging in
                </p>
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  primary
                  disabled={creating}
                >
                  {creating ? 'Creating...' : `Create ${userType === 'teacher' ? 'Teacher' : 'Student'}`}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-medium">
                Edit {editingUser.role === 'teacher' ? 'Teacher' : 'Student'}
              </h2>
              <button
                onClick={handleCloseEditModal}
                className="rounded p-1 text-muted transition hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <Field label="Full Name *">
                <input
                  type="text"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editUser.fullName}
                  onChange={handleEditInputChange('fullName')}
                  placeholder="Enter full name"
                  required
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  className="w-full rounded-md border border-line bg-white px-2.5 py-2 text-[13px] outline-none focus:border-brand-mid"
                  value={editUser.phone}
                  onChange={handleEditInputChange('phone')}
                  placeholder="Enter phone number"
                />
              </Field>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={updating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  primary
                  disabled={updating}
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Page>
  );
}
