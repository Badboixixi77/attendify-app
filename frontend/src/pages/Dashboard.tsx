import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import { Users, CheckCircle, XCircle, Clock, QrCode, ScanLine } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { format } from 'date-fns';
import QrDisplayModal from '../components/ui/QrDisplayModal';
import QrScannerModal from '../components/ui/QrScannerModal';

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
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name}</h1>
          <p className="mt-1 text-sm text-gray-500">Here's your {isAdmin ? 'system' : 'attendance'} overview.</p>
        </div>
        <div className="mt-4 sm:mt-0">
          {isAdmin ? (
            <Button onClick={() => setShowQrDisplay(true)}>
              <QrCode className="mr-2 h-4 w-4" />
              Show Check-In QR
            </Button>
          ) : (
            <Button onClick={() => setShowQrScanner(true)}>
              <ScanLine className="mr-2 h-4 w-4" />
              Scan QR Check-In
            </Button>
          )}
        </div>
      </div>

      {showQrDisplay && <QrDisplayModal onClose={() => setShowQrDisplay(false)} />}
      {showQrScanner && <QrScannerModal onClose={() => setShowQrScanner(false)} onSuccess={fetchData} />}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard title="Total Users" value={stats?.totalUsers || 0} icon={Users} color="bg-blue-500" />
            <StatCard title="Present Today" value={stats?.todayPresent || 0} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Absent Today" value={stats?.todayAbsent || 0} icon={XCircle} color="bg-red-500" />
            <StatCard title="Late Today" value={stats?.todayLate || 0} icon={Clock} color="bg-yellow-500" />
          </>
        ) : (
          <>
            <StatCard title="Total Records" value={stats?.totalRecords || 0} icon={Users} color="bg-blue-500" />
            <StatCard title="Days Present" value={stats?.present || 0} icon={CheckCircle} color="bg-green-500" />
            <StatCard title="Days Absent" value={stats?.absent || 0} icon={XCircle} color="bg-red-500" />
            <StatCard title="Attendance Rate" value={`${stats?.attendanceRate || 0}%`} icon={CheckCircle} color="bg-indigo-500" />
          </>
        )}
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Attendance</h3>
        </div>
        {recent.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No recent records found.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {recent.map((record) => (
              <li key={record.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-sm font-medium text-blue-600 truncate">{record.user_name}</p>
                    <p className="flex items-center text-sm text-gray-500 mt-1">
                      {format(new Date(record.date), 'MMMM d, yyyy')}
                      {record.notes && <span className="ml-2 text-gray-400">- {record.notes}</span>}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 text-white p-1 rounded-md ${color}`} />
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
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
