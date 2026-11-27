import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import AppShell from './components/AppShell';
import Toast from './components/Toast';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AttendancePage from './pages/AttendancePage';
import PeoplePage from './pages/PeoplePage';
import ResourcesPage from './pages/ResourcesPage';
import { AuditPage, DevicesPage, ReportsPage, SettingsPage } from './pages/AdminPages';
import TabletKioskPage from './pages/TabletKioskPage';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('kiosk') === '1' || params.get('mode') === 'kiosk' ? 'kiosk' : 'dashboard';
  });
  const [toast, setToast] = useState(null);
  const notify = (message, type = 'success') => { setToast({ message, type }); window.setTimeout(() => setToast(null), 4200); };

  if (loading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-white"><div className="text-center"><div className="mx-auto mb-4 grid h-12 w-12 animate-pulse place-items-center rounded-xl bg-blue-600 font-black">N</div><p className="text-sm text-slate-300">Loading Navira School…</p></div></div>;

  // Standalone full-screen Tablet Kiosk reader mode (works with or without login)
  if (page === 'kiosk') {
    return (
      <>
        <TabletKioskPage
          onExit={() => setPage('dashboard')}
          onToast={notify}
        />
        <Toast {...(toast || {})} onClose={() => setToast(null)} />
      </>
    );
  }

  // If not logged in, show login page with Tablet Kiosk launch option
  if (!user) {
    return <LoginPage onOpenKiosk={() => setPage('kiosk')} />;
  }

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

  return (
    <>
      <AppShell page={page} onNavigate={setPage}>
        {pages[page] || pages.dashboard}
      </AppShell>
      <Toast {...(toast || {})} onClose={() => setToast(null)}/>
    </>
  );
}
