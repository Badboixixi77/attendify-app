import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { StatusBadge } from './Dashboard';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Calendar, Download } from 'lucide-react';
import { saveAs } from 'file-saver';

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
      setLoading(true);
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

  const exportToCSV = () => {
    if (records.length === 0 && users.length === 0) {
      toast.error("No data to export");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Name,Department,Status,Notes\n";

    if (user?.role === 'admin') {
      users.forEach(u => {
        const record = records.find(r => r.user_id === u.id);
        const status = record ? record.status : "Not marked";
        const notes = record?.notes ? `"${record.notes.replace(/"/g, '""')}"` : "";
        csvContent += `"${u.name}","${u.department || ''}",${status},${notes}\n`;
      });
    } else {
      records.forEach(r => {
        const notes = r.notes ? `"${r.notes.replace(/"/g, '""')}"` : "";
        csvContent += `"${r.user_name}","${r.department || ''}",${r.status},${notes}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Attendance_Export_${selectedDate}.csv`);
    toast.success("Export downloaded!");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="sm:flex sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Attendance Log</h1>
          <p className="mt-1 text-sm text-slate-500">Viewing records for {format(new Date(selectedDate), 'MMMM d, yyyy')}</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input 
              type="date" 
              className="block w-full h-11 rounded-xl border-slate-300 pl-10 pr-4 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border bg-slate-50/50 cursor-pointer transition-colors hover:bg-slate-100"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          
          <Button variant="outline" onClick={exportToCSV} className="h-11 border-slate-300">
            <Download className="h-4 w-4 mr-2 text-slate-500" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="py-4 pl-6 pr-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  {user?.role === 'admin' && <th className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>}
                  <th className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  {user?.role === 'admin' && <th className="px-3 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">Admin Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {user?.role === 'admin' ? (
                  users.map((u) => {
                    const record = records.find(r => r.user_id === u.id);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="whitespace-nowrap py-4 pl-6 pr-3">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs mr-3">
                              {u.name.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-slate-900">{u.name}</span>
                              {record?.notes && <span className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]" title={record.notes}>{record.notes}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">{u.department || '-'}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                          {record ? <StatusBadge status={record.status} /> : <span className="text-slate-400 italic text-sm">Not marked</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium">
                          <select 
                            className="block w-full py-1.5 pl-3 pr-8 text-sm border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md border bg-slate-50"
                            value={record?.status || ''}
                            onChange={(e) => handleStatusChange(u.id, e.target.value)}
                          >
                            <option value="" disabled>Select status...</option>
                            <option value="present">Mark Present</option>
                            <option value="absent">Mark Absent</option>
                            <option value="late">Mark Late</option>
                            <option value="excused">Mark Excused</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  records.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="whitespace-nowrap py-4 pl-6 pr-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">{record.user_name}</span>
                          {record.notes && <span className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{record.notes}</span>}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                        <StatusBadge status={record.status} />
                      </td>
                    </tr>
                  ))
                )}
                
                {user?.role !== 'admin' && records.length === 0 && (
                  <tr>
                    <td colSpan={2} className="py-12 text-center">
                      <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-sm text-slate-500">No attendance record found for this date.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
