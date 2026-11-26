import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import AppShell from './components/AppShell';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import PeoplePage from './pages/PeoplePage';
import ResourcesPage from './pages/ResourcesPage';
import { AuditPage, DevicesPage, ReportsPage, SettingsPage } from './pages/AdminPages';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 4200); };
  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-white"><div className="text-center"><div className="mx-auto mb-4 grid h-12 w-12 animate-pulse place-items-center rounded-xl bg-blue-600 font-black">N</div><p className="text-sm text-slate-300">Loading Navira School…</p></div></div>;
  if (!user) return <LoginPage/>;
  const pages = {
    dashboard: <DashboardPage onToast={notify}/>,
    attendance: <AttendancePage onToast={notify}/>,
    reports: <ReportsPage onToast={notify}/>,
    students: <PeoplePage type="students" onToast={notify}/>,
    staff: <PeoplePage type="staff" onToast={notify}/>,
    classes: <ResourcesPage resource="classes" onToast={notify}/>,
    leaves: <ResourcesPage resource="leaves" onToast={notify}/>,
    devices: <DevicesPage onToast={notify}/>,
    settings: <SettingsPage onToast={notify}/>,
    audit: <AuditPage onToast={notify}/>
  };
  return <><AppShell page={page} onNavigate={setPage}>{pages[page] || pages.dashboard}</AppShell><Toast {...(toast || {})} onClose={() => setToast(null)}/></>;
}
