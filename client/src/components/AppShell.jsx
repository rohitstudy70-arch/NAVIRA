import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const nav = [
  ['dashboard', '⌂', 'Dashboard'], ['kiosk', '📱', 'Tablet Kiosk'], ['attendance', '✓', 'Attendance'], ['reports', '↗', 'Reports'], ['students', '◎', 'Students'], ['staff', '♙', 'Staff'], ['classes', '▦', 'Classes'], ['leaves', '◫', 'Leave requests'], ['devices', '◉', 'RFID Devices'], ['settings', '⚙', 'Settings'], ['audit', '◷', 'Audit log']
];
const restricted = { devices: ['super_admin'], settings: ['super_admin'], audit: ['super_admin'] };

export default function AppShell({ page, onNavigate, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('navira_theme') === 'dark');
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); localStorage.setItem('navira_theme', dark ? 'dark' : 'light'); }, [dark]);
  const allowedNav = nav.filter(([id]) => !restricted[id] || restricted[id].includes(user.role));
  const currentTitle = nav.find(([id]) => id === page)?.[2] || 'Navira School';
  const side = <aside className="flex h-full w-72 flex-col bg-slate-950 text-slate-300">
    <div className="flex items-center gap-3 border-b border-slate-800 px-6 py-5">
      <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-600 text-xl font-black text-white">N</div>
      <div><p className="font-bold text-white">Navira School</p><p className="text-xs text-blue-300">RFID Attendance</p></div>
    </div>
    <nav className="flex-1 space-y-1 p-3">
      {allowedNav.map(([id, icon, label]) => <button key={id} onClick={() => { onNavigate(id); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition ${page === id ? 'bg-blue-600 text-white shadow-lg shadow-blue-950/40' : 'hover:bg-slate-800 hover:text-white'}`}><span className="w-5 text-center text-base">{icon}</span>{label}</button>)}
    </nav>
    <div className="border-t border-slate-800 p-4"><div className="mb-3 rounded-xl bg-slate-900 px-3 py-2"><p className="truncate text-sm font-semibold text-white">{user.name}</p><p className="capitalize text-xs text-slate-400">{user.role.replace('_', ' ')}</p></div><button onClick={logout} className="w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">Sign out</button></div>
  </aside>;
  return <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">{side}</div>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close navigation" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-950/60"/><div className="relative h-full">{side}</div></div>}
    <main className="lg:pl-72"><header className="sticky top-0 z-30 flex h-18 items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 sm:px-7"><div className="flex items-center gap-3"><button onClick={() => setOpen(true)} className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800">☰</button><div><h1 className="font-bold text-slate-900 dark:text-white">{currentTitle}</h1><p className="hidden text-xs text-slate-500 sm:block">{new Intl.DateTimeFormat('en-IN', { dateStyle: 'full' }).format(new Date())}</p></div></div><div className="flex items-center gap-2"><button onClick={() => onNavigate('kiosk')} className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:from-blue-700 hover:to-indigo-700 transition"><span>📱</span><span>Tablet Kiosk</span></button><span className="hidden rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 sm:block dark:bg-emerald-950/40 dark:text-emerald-300">● System online</span><button onClick={() => setDark((value) => !value)} aria-label="Toggle color mode" className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">{dark ? '☀' : '◐'}</button><div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">{user.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div></div></header><div className="mx-auto max-w-7xl p-4 sm:p-7">{children}</div></main>
  </div>;
}
