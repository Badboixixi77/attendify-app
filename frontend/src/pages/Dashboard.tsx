import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Users, CheckCircle, XCircle, Clock, QrCode, ScanLine } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { format, parseISO } from 'date-fns';
import QrDisplayModal from '../components/ui/QrDisplayModal';
import QrScannerModal from '../components/ui/QrScannerModal';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showQrDisplay, setShowQrDisplay] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, attendanceRes] = await Promise.all([
        api.get('/stats'),
        api.get('/attendance')
      ]);
      setStats(statsRes.data);
      setRecent(attendanceRes.data.slice(0, 5));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdmin = user?.role === 'admin';

  // Format chart data dates for display
  const chartData = stats?.chartData?.map((d: any) => ({
    ...d,
    displayDate: format(parseISO(d.date), 'MMM d')
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Area */}
      <div className="sm:flex sm:items-center sm:justify-between bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back, {user?.name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-slate-500">Here's your {isAdmin ? 'system' : 'attendance'} overview for today.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          {isAdmin ? (
            <Button onClick={() => setShowQrDisplay(true)} className="w-full sm:w-auto shadow-sm">
              <QrCode className="mr-2 h-5 w-5" />
              Show Check-In QR
            </Button>
          ) : (
            <Button onClick={() => setShowQrScanner(true)} className="w-full sm:w-auto shadow-sm">
              <ScanLine className="mr-2 h-5 w-5" />
              Scan QR Check-In
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} color="bg-indigo-500" />
            <StatCard title="Present Today" value={stats?.todayPresent || 0} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard title="Absent Today" value={stats?.todayAbsent || 0} icon={XCircle} color="bg-rose-500" />
            <StatCard title="Late Today" value={stats?.todayLate || 0} icon={Clock} color="bg-amber-500" />
          </>
        ) : (
          <>
            <StatCard title="Total Records" value={stats?.totalRecords || 0} icon={Users} color="bg-indigo-500" />
            <StatCard title="Days Present" value={stats?.present || 0} icon={CheckCircle} color="bg-emerald-500" />
            <StatCard title="Days Absent" value={stats?.absent || 0} icon={XCircle} color="bg-rose-500" />
            <StatCard title="Attendance Rate" value={`${stats?.attendanceRate || 0}%`} icon={CheckCircle} color="bg-blue-500" />
          </>
        )}
      </div>

      {/* Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Interactive Chart */}
        <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden lg:col-span-2">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900">7-Day Attendance Trend</h3>
          </div>
          <div className="p-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="displayDate" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }} 
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={isAdmin ? "present" : "status"} 
                  name={isAdmin ? "Present Users" : "Attended"}
                  stroke="#6366f1" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPresent)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Attendance List */}
        <div className="bg-white shadow-sm border border-slate-100 rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-base font-semibold text-slate-900">Recent Activity</h3>
          </div>
          {recent.length === 0 ? (
            <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center h-[300px]">
              <Clock className="h-10 w-10 text-slate-300 mb-3" />
              <p>No recent records found.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {recent.map((record) => (
                <li key={record.id} className="px-6 py-4 hover:bg-slate-50/80 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-sm font-medium text-slate-900 truncate">{record.user_name}</p>
                      <p className="flex items-center text-xs text-slate-500 mt-1">
                        {format(parseISO(record.date), 'MMM d, yyyy')}
                      </p>
                      {record.notes && <p className="text-xs text-slate-400 mt-1 truncate max-w-[150px]">{record.notes}</p>}
                    </div>
                    <div className="ml-2 flex-shrink-0">
                      <StatusBadge status={record.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showQrDisplay && <QrDisplayModal onClose={() => setShowQrDisplay(false)} />}
      {showQrScanner && <QrScannerModal onClose={() => setShowQrScanner(false)} onSuccess={fetchData} />}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-xl ${color} bg-opacity-10`}>
            <Icon className={`h-6 w-6 ${color.replace('bg-', 'text-')}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-slate-500 truncate">{title}</dt>
              <dd className="text-2xl font-bold text-slate-900 mt-1">{value}</dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'present': return <Badge variant="success">Present</Badge>;
    case 'absent': return <Badge variant="danger">Absent</Badge>;
    case 'late': return <Badge variant="warning">Late</Badge>;
    case 'excused': return <Badge variant="default">Excused</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}
