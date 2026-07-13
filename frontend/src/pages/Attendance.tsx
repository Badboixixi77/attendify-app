import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusBadge } from './Dashboard';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Attendance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  const fetchData = async () => {
    try {
      const [attRes, usersRes] = await Promise.all([
        api.get(`/attendance?date=${selectedDate}`),
        user?.role === 'admin' ? api.get('/users') : Promise.resolve({ data: [] })
      ]);
      setRecords(attRes.data);
      setUsers(usersRes.data.filter((u: any) => u.role !== 'admin'));
    } catch (err) {
      toast.error('Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: number, status: string, notes: string = '') => {
    try {
      // Optimistic update
      const existing = records.find(r => r.user_id === userId);
      if (existing) {
        setRecords(records.map(r => r.user_id === userId ? { ...r, status, notes } : r));
      } else {
        const u = users.find(u => u.id === userId);
        setRecords([{ user_id: userId, user_name: u.name, department: u.department, date: selectedDate, status, notes }, ...records]);
      }
      
      await api.post('/attendance', { user_id: userId, date: selectedDate, status, notes });
      toast.success('Attendance updated');
    } catch (err) {
      toast.error('Failed to update attendance');
      fetchData(); // Revert
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Records</h1>
          <p className="mt-2 text-sm text-gray-700">Manage and view attendance for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <input 
            type="date" 
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow ring-1 ring-black ring-opacity-5 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
              {user?.role === 'admin' && <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Department</th>}
              <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
              {user?.role === 'admin' && <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {user?.role === 'admin' ? (
              users.map((u) => {
                const record = records.find(r => r.user_id === u.id);
                return (
                  <tr key={u.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{u.name}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{u.department || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {record ? <StatusBadge status={record.status} /> : <span className="text-gray-400 italic">Not marked</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm font-medium space-x-2">
                      <select 
                        className="mt-1 block w-full pl-3 pr-10 py-1 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        value={record?.status || ''}
                        onChange={(e) => handleStatusChange(u.id, e.target.value)}
                      >
                        <option value="" disabled>Select status...</option>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{record.user_name}</td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <StatusBadge status={record.status} />
                  </td>
                </tr>
              ))
            )}
            
            {user?.role !== 'admin' && records.length === 0 && (
              <tr><td colSpan={2} className="py-4 text-center text-sm text-gray-500">No attendance record found for this date.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
