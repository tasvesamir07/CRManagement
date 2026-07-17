import { useState, useEffect, useCallback } from 'react';
import { adminAPI, coursesAPI } from '../../services/api';
import toast from 'react-hot-toast';
import { confirm } from '../ui/ConfirmDialog';
import { Plus, Loader2, Trash2, X, ChevronDown } from 'lucide-react';
import PasswordInput from '../ui/PasswordInput';
import CourseMemberAssignment from './CourseMemberAssignment';

interface User {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface Course {
  id: string;
  course_id: string;
  course_name: string;
}

interface CourseMember {
  id: string;
  username: string;
  display_name?: string;
  role: string;
}

interface CreateUserForm {
  username: string;
  email: string;
  password: string;
  displayName: string;
  role: string;
}

const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateUserForm>({ username: '', email: '', password: '', displayName: '', role: 'cr' });

  const [activeTab, setActiveTab] = useState<'accounts' | 'assignments'>('accounts');

  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseMembers, setCourseMembers] = useState<CourseMember[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('cr');
  const [assigning, setAssigning] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await adminAPI.listUsers();
      setUsers(data.users || []);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await coursesAPI.list();
      setCourses(data);
    } catch (e) {
      console.error('Failed to fetch courses:', e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchCourses();
  }, [fetchUsers, fetchCourses]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) {
      toast.error('Username, email and password are required');
      return;
    }
    setCreating(true);
    try {
      await adminAPI.createUser(form);
      toast.success('User created');
      setShowCreate(false);
      setForm({ username: '', email: '', password: '', displayName: '', role: 'cr' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!(await confirm(`Deactivate user "${username}"? They can be reactivated later.`, { title: 'Deactivate User', variant: 'danger', confirmLabel: 'Deactivate' }))) return;
    try {
      await adminAPI.deleteUser(id);
      toast.success('User deactivated');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const handleRoleToggle = async (id: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'cr' : 'admin';
    try {
      await adminAPI.updateUser(id, { role: newRole });
      toast.success(`User role changed to ${newRole}`);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to update user');
    }
  };

  const fetchCourseMembers = async (courseId: string) => {
    if (!courseId) {
      setCourseMembers([]);
      return;
    }
    try {
      const data = await coursesAPI.getMembers(courseId);
      setCourseMembers(data);
    } catch {
      toast.error('Failed to load course members');
    }
  };

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    fetchCourseMembers(courseId);
  };

  const handleAssignMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId || !selectedUserId) {
      toast.error('Please select both a course and a user');
      return;
    }
    setAssigning(true);
    try {
      await coursesAPI.assignMember(selectedCourseId, selectedUserId, selectedRole);
      toast.success('User assigned to course');
      setSelectedUserId('');
      setSelectedRole('cr');
      fetchCourseMembers(selectedCourseId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to assign user');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!(await confirm('Remove this user from the course? They will lose access to shared notice history and routines.', {
      title: 'Remove Member',
      confirmLabel: 'Remove Member',
      variant: 'danger'
    }))) return;
    try {
      await coursesAPI.removeMember(selectedCourseId, userId);
      toast.success('User removed from course');
      fetchCourseMembers(selectedCourseId);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-display-md tracking-tight font-sans text-ink">User & Class Management</h1>
          <p className="text-sm text-ink-mute mt-1.5">Manage user credentials and map course members for sharing notice updates.</p>
        </div>
        {activeTab === 'accounts' && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer"
          >
            {showCreate ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            {showCreate ? 'Cancel' : 'Create User'}
          </button>
        )}
      </div>

      <div className="flex border-b border-hairline-cool gap-6 mb-6">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
            activeTab === 'accounts' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          User Accounts
        </button>
        <button
          onClick={() => setActiveTab('assignments')}
          className={`pb-3 text-sm font-semibold cursor-pointer transition-all border-b-2 ${
            activeTab === 'assignments' 
              ? 'border-primary text-primary' 
              : 'border-transparent text-ink-mute hover:text-ink'
          }`}
        >
          Course Assignments
        </button>
      </div>

      {activeTab === 'accounts' ? (
        <div className="space-y-6">
          {showCreate && (
            <div className="bg-canvas border border-hairline rounded-lg p-6 shadow-sm">
              <h3 className="text-sm font-medium text-ink mb-4">Create New User</h3>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Username</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, username: e.target.value })}
                    className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Password</label>
                  <PasswordInput
                    value={form.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Display Name</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-mute uppercase tracking-wider mb-1.5">Role</label>
                  <div className="custom-select-wrapper">
                    <select
                      value={form.role}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm({ ...form, role: e.target.value })}
                      className="custom-select block w-full pl-3 pr-10 py-2 border border-hairline rounded-sm text-sm text-ink bg-canvas focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-hairline-strong transition-all duration-150 cursor-pointer"
                    >
                      <option value="cr">Course Rep (CR)</option>
                      <option value="admin">Admin</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-mute">
                      <ChevronDown className="h-4 w-4" />
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={creating}
                    className="w-full px-4 py-2 bg-primary text-on-primary text-sm font-medium rounded-sm hover:bg-primary-deep transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="w-4 h-4 mx-auto animate-spin" /> : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          )}

            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-hairline-cool">
                  <thead>
                    <tr className="text-left text-xs font-medium text-ink-mute uppercase tracking-wider">
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Created</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-cool text-sm text-ink-secondary">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-canvas-soft transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-hairline-strong flex items-center justify-center text-xs font-bold text-ink-secondary">
                              {(u.display_name || u.username).charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-ink">{u.display_name || u.username}</p>
                              <p className="text-xs text-ink-mute">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">{u.email}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleRoleToggle(u.id, u.role)}
                            className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                              u.role === 'admin'
                                ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20 hover:bg-accent-violet/20'
                                : 'bg-primary/10 text-primary-deep border-primary/20 hover:bg-primary/20'
                            }`}
                          >
                            {u.role}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-xs text-ink-mute">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDelete(u.id, u.username)}
                            className="p-1.5 text-ink-mute hover:text-accent-tomato hover:bg-accent-tomato/10 rounded transition-colors cursor-pointer"
                            title="Deactivate user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-hairline-cool bg-canvas">
                {users.map((u) => (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-hairline-strong flex items-center justify-center text-xs font-bold text-ink-secondary">
                          {(u.display_name || u.username).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-ink">{u.display_name || u.username}</h4>
                          <p className="text-xs text-ink-mute">@{u.username}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleRoleToggle(u.id, u.role)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border cursor-pointer transition-colors ${
                          u.role === 'admin'
                            ? 'bg-accent-violet/10 text-accent-violet border-accent-violet/20 hover:bg-accent-violet/20'
                            : 'bg-primary/10 text-primary-deep border-primary/20 hover:bg-primary/20'
                        }`}
                      >
                        {u.role}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-ink-mute">
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-ink-mute/70">Email</span>
                        <span className="text-ink-secondary break-all">{u.email}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase font-semibold text-ink-mute/70">Created At</span>
                        <span className="text-ink-secondary">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-hairline-cool/40">
                      <button
                        onClick={() => handleDelete(u.id, u.username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border border-accent-tomato/20 rounded text-xs font-semibold text-accent-tomato hover:bg-accent-tomato/5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Deactivate
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
        </div>
      ) : (
        <CourseMemberAssignment
          courses={courses}
          users={users}
          courseMembers={courseMembers}
          selectedCourseId={selectedCourseId}
          selectedUserId={selectedUserId}
          selectedRole={selectedRole}
          assigning={assigning}
          onCourseChange={handleCourseChange}
          onAssign={handleAssignMember}
          onRemoveMember={handleRemoveMember}
          onUserIdChange={setSelectedUserId}
          onRoleChange={setSelectedRole}
        />
      )}
    </div>
  );
};

export default AdminUsers;
