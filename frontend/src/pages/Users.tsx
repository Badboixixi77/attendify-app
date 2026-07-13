import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import toast from 'react-hot-toast';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';

export default function Users() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'student', department: '', password: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        toast.success('User updated');
        setUsers(users.map(u => u.id === editingUser.id ? { ...u, ...formData } : u));
      } else {
        const res = await api.post('/users', formData);
        toast.success('User created');
        setUsers([...users, res.data]);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setUsers(users.filter(u => u.id !== id));
      toast.success('User deleted');
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const openEdit = (user: any) => {
    setEditingUser(user);
    setFormData({ name: user.name, email: user.email, role: user.role, department: user.department || '', password: '' });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'student', department: '', password: '' });
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users & Employees</h1>
          <p className="mt-2 text-sm text-gray-700">A list of all users including their name, email, role, and department.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button onClick={() => { resetForm(); setIsModalOpen(true); }}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Role</th>
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Department</th>
              <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{user.name}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.email}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">{user.role}</td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.department || '-'}</td>
                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                  <button onClick={() => openEdit(user)} className="text-blue-600 hover:text-blue-900"><Edit2 className="h-4 w-4" /></button>
                  {user.role !== 'admin' && (
                    <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-900"><Trash2 className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsModalOpen(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">{editingUser ? 'Edit User' : 'New User'}</h3>
                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  {!editingUser && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <select className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                      <option value="student">Student</option>
                      <option value="employee">Employee</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Department / Class</label>
                    <Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                  </div>
                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse">
                    <Button type="submit" className="w-full sm:w-auto sm:ml-3">Save</Button>
                    <Button type="button" variant="outline" className="mt-3 w-full sm:w-auto sm:mt-0" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
