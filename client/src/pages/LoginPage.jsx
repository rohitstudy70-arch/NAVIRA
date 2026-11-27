import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import schoolLogo from '../assets/logo.jpg';

export default function LoginPage({ onOpenKiosk }) {
  const { login } = useAuth();
  // Credentials start empty - never exposed to other devices or phones
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(form.email, form.password);
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const email = window.prompt('Enter your account email:', form.email);
    if (!email) return;
    try {
      const response = await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      setNotice(response.message);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-2">
      {/* LEFT BRANDING PANEL (DESKTOP) */}
      <section className="hidden flex-col justify-between bg-gradient-to-br from-blue-700 via-blue-800 to-slate-950 p-12 text-white lg:flex">
        <div className="flex items-center gap-4">
          <img
            src={schoolLogo}
            alt="Navira English School Logo"
            className="h-16 w-16 rounded-full object-cover border-2 border-white/20 bg-white shadow-xl"
          />
          <div>
            <p className="text-xl font-bold tracking-tight">Navira English School</p>
            <p className="text-xs text-blue-200 font-medium">Gariya Balua (Purnea) • RFID Attendance</p>
          </div>
        </div>
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[.2em] text-blue-200">Secure school operations</p>
          <h1 className="max-w-lg text-5xl font-bold leading-tight">Every arrival, accurately accounted for.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-blue-100">
            Monitor live RFID scans, manage attendance, and keep parents informed from one secure dashboard.
          </p>
        </div>
        <p className="text-sm text-blue-200">© {new Date().getFullYear()} Navira English School, Gariya Balua (Purnea)</p>
      </section>

      {/* RIGHT SIGN IN PANEL */}
      <section className="flex items-center justify-center bg-slate-50 p-5 dark:bg-slate-950">
        <form onSubmit={submit} className="w-full max-w-md" autoComplete="off">
          {/* Logo & School Header */}
          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src={schoolLogo}
              alt="Navira English School Logo"
              className="mb-3.5 h-20 w-20 rounded-full object-cover border-2 border-blue-500/30 bg-white shadow-xl"
            />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Navira English School
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Gariya Balua (Purnea) • Smart RFID Gate & Admin Portal
            </p>
          </div>

          <div className="panel p-7 sm:p-8">
            <h2 className="text-xl font-bold">Sign In</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Enter your credentials to access the administration portal.
            </p>

            {error && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-sm text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300">
                {error}
              </div>
            )}
            {notice && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 text-sm text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300">
                {notice}
              </div>
            )}

            <label className="mt-5 block text-sm font-semibold">
              Email Address
              <input
                className="field mt-1.5"
                type="email"
                placeholder="name@school.edu"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </label>

            <label className="mt-4 block text-sm font-semibold">
              Password
              <div className="relative mt-1.5">
                <input
                  className="field pr-11"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 text-sm select-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </label>

            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={busy || !form.email || !form.password}
              className="btn-primary mt-6 w-full py-3 text-sm font-bold shadow-md disabled:opacity-50"
            >
              {busy ? 'Signing in securely…' : 'Sign In Securely'}
            </button>
          </div>

          {onOpenKiosk && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={onOpenKiosk}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3 text-xs font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-800 transition shadow"
              >
                <span>📱</span>
                <span>Open Gate Tablet Kiosk Mode</span>
              </button>
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
