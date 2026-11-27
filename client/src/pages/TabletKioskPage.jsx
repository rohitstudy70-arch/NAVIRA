import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { api, baseUrl, socketUrl } from '../lib/api';

// Web Audio sound synthesizer (no external audio files required)
function playTone(type = 'success') {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'success') {
      // Pleasant double-chime (C5 -> E5)
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now); // C5
      gain1.gain.setValueAtTime(0.15, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.3);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(659.25, now + 0.15); // E5
      gain2.gain.setValueAtTime(0.18, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.55);
    } else if (type === 'warning') {
      // Low buzz tone
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } else {
      // Error triple buzz
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.45);
    }
  } catch (e) {
    // Audio context may require initial user gesture
  }
}

// Text to speech voice announcement
function speakVoice(text) {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    // Voice speech unsupported or blocked
  }
}

export default function TabletKioskPage({ onExit, onToast }) {
  const [now, setNow] = useState(new Date());
  const [kioskData, setKioskData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Settings & active reader
  const [deviceId, setDeviceId] = useState(() => localStorage.getItem('navira_kiosk_device') || 'GATE01');
  const [deviceKey, setDeviceKey] = useState(() => localStorage.getItem('navira_kiosk_key') || 'navira-demo-device-key-change-me');
  const [showSettings, setShowSettings] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualCardUID, setManualCardUID] = useState('');
  const [scanning, setScanning] = useState(false);

  // Active scan result popup
  const [scanResult, setScanResult] = useState(null);
  const dismissTimerRef = useRef(null);

  // Live scans feed
  const [recentScans, setRecentScans] = useState([]);

  // Hardware RFID scanner keyboard buffer
  const keyBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  // 1. Clock timer
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Fetch Kiosk Info & initial recent scans
  const loadKioskInfo = async () => {
    try {
      const res = await fetch(`${baseUrl}/attendance/kiosk-info`);
      if (res.ok) {
        const data = await res.json();
        setKioskData(data);
        if (data.recentScans) {
          setRecentScans(data.recentScans);
        }
      }
    } catch (err) {
      console.warn('Failed to load kiosk info', err);
    }
  };

  useEffect(() => {
    loadKioskInfo();
  }, []);

  // 3. Socket.IO listener for live scans across all devices
  useEffect(() => {
    const socket = io(socketUrl);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('attendance:scan', (event) => {
      setRecentScans((prev) => [event.attendance, ...prev.filter((item) => item._id !== event.attendance._id)].slice(0, 10));
      setKioskData((prev) => prev ? { ...prev, totalScansToday: (prev.totalScansToday || 0) + 1 } : prev);
    });

    socket.on('attendance:alert', (event) => {
      if (onToast) onToast(`Unregistered card ${event.cardUID} scanned at ${event.device?.name || 'Gate'}`, 'error');
    });

    return () => socket.close();
  }, [onToast]);

  // 4. Global Hardware RFID Card Reader Listener
  // USB/Bluetooth RFID readers work like high-speed keyboard input ending in 'Enter'
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't intercept if user is typing in a modal text field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        const cardCode = keyBufferRef.current.trim();
        keyBufferRef.current = '';
        if (cardCode.length >= 4) {
          processCardScan(cardCode);
        }
      } else if (e.key.length === 1) {
        // If keys arrive with big delay, reset buffer
        if (diff > 250) {
          keyBufferRef.current = '';
        }
        keyBufferRef.current += e.key;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deviceId, deviceKey, soundEnabled, voiceEnabled]);

  // 5. Card Scan Handler
  async function processCardScan(rawCardUID) {
    const uid = rawCardUID.trim().toUpperCase();
    if (!uid || scanning) return;

    setScanning(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);

    try {
      const response = await fetch(`${baseUrl}/attendance/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-device-api-key': deviceKey
        },
        body: JSON.stringify({
          cardUID: uid,
          deviceId: deviceId,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (data.duplicate) {
          if (soundEnabled) playTone('warning');
          if (voiceEnabled) speakVoice(`${data.person?.name || 'Scan'}, already recorded.`);
          setScanResult({
            type: 'duplicate',
            title: 'Scan Already Recorded',
            subtitle: data.message || 'Duplicate scan ignored within window',
            person: data.person,
            direction: data.direction,
            time: new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' }).format(new Date()),
            cardUID: uid
          });
        } else {
          if (soundEnabled) playTone('success');
          const isEntry = data.direction === 'in';
          if (voiceEnabled) {
            const greeting = isEntry ? `Welcome ${data.person?.name || ''}. Punch in recorded.` : `Goodbye ${data.person?.name || ''}. Punch out recorded.`;
            speakVoice(greeting);
          }
          setScanResult({
            type: 'success',
            title: isEntry ? 'Punch In Successful' : 'Punch Out Successful',
            subtitle: isEntry ? 'Arrival recorded • SMS alert queued for parents' : 'Exit recorded • Safe travel',
            person: data.person,
            direction: data.direction,
            time: new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' }).format(new Date()),
            cardUID: uid
          });
        }
      } else {
        if (soundEnabled) playTone('error');
        if (voiceEnabled) speakVoice('Card not recognized. Please contact administration.');
        setScanResult({
          type: 'error',
          title: 'Card Not Recognized',
          subtitle: data.message || 'This RFID card is not registered to any student or staff member.',
          cardUID: uid,
          time: new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' }).format(new Date())
        });
      }
    } catch (err) {
      if (soundEnabled) playTone('error');
      setScanResult({
        type: 'error',
        title: 'Connection Error',
        subtitle: 'Unable to connect to Attendance Server. Check network.',
        cardUID: uid,
        time: new Intl.DateTimeFormat('en-IN', { timeStyle: 'medium' }).format(new Date())
      });
    } finally {
      setScanning(false);
      // Auto-dismiss result card after 4.5 seconds
      dismissTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 4500);
    }
  }

  // Fullscreen toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  // Format Clock
  const hours = String(now.getHours() % 12 || 12).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
  const fullDateString = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);

  const schoolName = kioskData?.schoolName || 'Navira English School';
  const totalScans = kioskData?.totalScansToday ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 font-sans text-slate-100 select-none overflow-hidden">
      {/* BACKGROUND GLOW EFFECTS */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl" />

      {/* TOP HEADER / APP BAR */}
      <header className="relative z-10 flex h-20 items-center justify-between border-b border-slate-800/80 bg-slate-900/60 px-6 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3.5">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-500 text-2xl font-black text-white shadow-lg shadow-blue-900/40">
            N
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white">{schoolName}</h1>
              <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-bold text-blue-300 border border-blue-400/30">
                Gate Terminal
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">Smart RFID Kiosk Reader • {deviceId}</p>
          </div>
        </div>

        {/* Live Counters & Status Badges */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 border border-slate-700/60 px-3.5 py-1.5 text-xs">
            <span className="font-semibold text-slate-300">Today's Scans:</span>
            <span className="rounded bg-blue-600/30 px-2 py-0.5 font-mono font-bold text-blue-300">{totalScans}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 border border-slate-700/60 px-3.5 py-1.5 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="text-slate-300 font-medium">{connected ? 'Scanner Ready' : 'Connecting…'}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Sound & Voice Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              setVoiceEnabled(!soundEnabled);
            }}
            title={soundEnabled ? 'Mute Audio/Voice' : 'Enable Audio/Voice'}
            className={`rounded-xl border p-2.5 text-sm transition ${
              soundEnabled
                ? 'border-blue-500/40 bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
                : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {soundEnabled ? '🔊 Sound: ON' : '🔇 Sound: OFF'}
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title="Toggle Fullscreen"
            className="hidden sm:inline-flex rounded-xl border border-slate-800 bg-slate-800/60 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700/80 transition"
          >
            {isFullscreen ? 'Exit Fullscreen' : '⛶ Fullscreen'}
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            title="Reader Configuration"
            className="rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-300 hover:bg-slate-700/80 transition"
          >
            ⚙
          </button>

          {/* Back to Admin Portal */}
          {onExit && (
            <button
              onClick={onExit}
              className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-bold text-white transition flex items-center gap-1.5"
            >
              <span>←</span>
              <span>Admin Portal</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN KIOSK BODY (TOUCH ZONE + CLOCK) */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* CLOCK DISPLAY */}
        <div className="mb-6 flex flex-col items-center">
          <div className="flex items-baseline font-mono font-black tracking-tight drop-shadow-md">
            <span className="text-6xl sm:text-7xl md:text-8xl text-white">{hours}:{minutes}</span>
            <span className="text-3xl sm:text-4xl md:text-5xl text-blue-400 font-bold ml-1">:{seconds}</span>
            <span className="text-xl sm:text-2xl text-slate-400 font-bold uppercase ml-3">{ampm}</span>
          </div>
          <p className="mt-2 text-base sm:text-lg font-medium text-slate-300 tracking-wide">
            {fullDateString}
          </p>
        </div>

        {/* TAP RFID SENSOR / TOUCH ZONE */}
        <div className="relative my-4 flex flex-col items-center">
          {/* Pulsing Radar Waves */}
          <div className="absolute inset-0 -m-8 rounded-full border border-blue-500/20 animate-ping pointer-events-none" style={{ animationDuration: '3s' }} />
          <div className="absolute inset-0 -m-16 rounded-full border border-blue-500/10 pointer-events-none animate-pulse" />

          {/* Glowing Interactive Tap Target */}
          <button
            onClick={() => setShowManualModal(true)}
            disabled={scanning}
            className="group relative flex h-44 w-44 sm:h-52 sm:w-52 flex-col items-center justify-center rounded-full bg-gradient-to-b from-blue-600 via-blue-700 to-indigo-900 shadow-2xl shadow-blue-600/40 border-4 border-blue-400/40 hover:scale-105 active:scale-95 transition duration-300 cursor-pointer"
          >
            {/* Wave Rings Inside Target */}
            <div className="absolute inset-2 rounded-full border border-blue-300/20" />
            <div className="absolute inset-6 rounded-full border border-blue-300/30" />
            
            {/* RFID Waves Icon */}
            <svg className="h-16 w-16 text-white drop-shadow group-hover:scale-110 transition duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8.32a7.43 7.43 0 0 1 0 7.36"/>
              <path d="M9.46 6.21a11.76 11.76 0 0 1 0 11.58"/>
              <path d="M12.91 4.1a15.91 15.91 0 0 1 0 15.8"/>
              <rect x="2" y="5" width="20" height="14" rx="2" strokeWidth="1.5"/>
            </svg>

            <span className="mt-2 text-sm sm:text-base font-extrabold tracking-wider text-white uppercase drop-shadow">
              {scanning ? 'Reading…' : 'TAP RFID CARD'}
            </span>
            <span className="text-[10px] sm:text-xs text-blue-200 font-medium">Or Click to Enter UID</span>
          </button>
        </div>

        {/* PROMPT MESSAGE */}
        <div className="mt-4 max-w-md">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Please Hold Card Near Reader
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Hold student ID card or staff smart card to the scanner to register attendance.
          </p>
        </div>

        {/* QUICK TEST DEMO PILLS (FOR EASY TESTING) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1">Quick Tap Test:</span>
          <button
            onClick={() => processCardScan('A1B2C3D4')}
            className="rounded-xl border border-blue-500/30 bg-blue-950/60 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:bg-blue-900/60 transition"
          >
            👨‍🎓 Student Aarav (A1B2C3D4)
          </button>
          <button
            onClick={() => processCardScan('STAFF-A1B2C3D4')}
            className="rounded-xl border border-indigo-500/30 bg-indigo-950/60 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-900/60 transition"
          >
            👩‍🏫 Teacher Anita (STAFF-A1B2C3D4)
          </button>
          <button
            onClick={() => processCardScan('UNKNOWN99')}
            className="rounded-xl border border-rose-500/30 bg-rose-950/60 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 transition"
          >
            ❓ Unregistered Card
          </button>
          <button
            onClick={() => setShowManualModal(true)}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
          >
            ⌨ Type UID / Roll
          </button>
        </div>
      </main>

      {/* RECENT SCANS TICKER / BOTTOM FEED */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-900/80 p-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 shrink-0">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            <span>Live Gate Feed</span>
          </div>

          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center gap-3">
            {recentScans.length === 0 ? (
              <span className="text-xs text-slate-500 italic">No attendance scans recorded yet today.</span>
            ) : (
              recentScans.slice(0, 7).map((scan, idx) => {
                const personName = scan.person?.name || 'Staff/Student';
                const isStudent = scan.personType === 'student';
                const inTimeFormatted = scan.inTime ? new Intl.DateTimeFormat('en-IN', { timeStyle: 'short' }).format(new Date(scan.inTime)) : '--:--';
                const isLate = scan.status === 'late';
                return (
                  <div
                    key={scan._id || idx}
                    className="flex shrink-0 items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-1.5 text-xs"
                  >
                    <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600/20 text-xs font-black text-blue-300">
                      {personName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-white leading-tight">{personName}</p>
                      <p className="text-[10px] text-slate-400">
                        {isStudent ? 'Student' : 'Staff'} • {inTimeFormatted}
                      </p>
                    </div>
                    <span className={`ml-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      isLate ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {isLate ? 'Late' : 'IN'}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </footer>

      {/* SCAN RESULT CELEBRATION MODAL */}
      {scanResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <div
            className={`relative w-full max-w-lg overflow-hidden rounded-3xl border p-7 sm:p-9 shadow-2xl text-center ${
              scanResult.type === 'success'
                ? 'border-emerald-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-emerald-950/30 text-white'
                : scanResult.type === 'duplicate'
                ? 'border-amber-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-amber-950/30 text-white'
                : 'border-rose-500/50 bg-gradient-to-b from-slate-900 via-slate-900 to-rose-950/30 text-white'
            }`}
          >
            {/* Countdown Progress Bar */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-slate-800">
              <div
                className={`h-full animate-[progress_4.5s_linear_forwards] ${
                  scanResult.type === 'success'
                    ? 'bg-emerald-400'
                    : scanResult.type === 'duplicate'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
            </div>

            {/* Avatar / Icon */}
            <div className="mx-auto mb-5 relative flex items-center justify-center">
              {scanResult.type === 'success' ? (
                <div className="relative">
                  <div className="grid h-24 w-24 place-items-center rounded-3xl bg-emerald-500 text-4xl font-black text-slate-950 shadow-xl shadow-emerald-500/30">
                    {scanResult.person?.name ? scanResult.person.name.charAt(0) : '✓'}
                  </div>
                  <span className="absolute -bottom-2 -right-2 rounded-full bg-emerald-400 p-1.5 text-slate-950 font-black text-xs shadow">
                    ✓
                  </span>
                </div>
              ) : scanResult.type === 'duplicate' ? (
                <div className="grid h-24 w-24 place-items-center rounded-3xl bg-amber-500 text-4xl font-black text-slate-950 shadow-xl shadow-amber-500/30">
                  ⚠️
                </div>
              ) : (
                <div className="grid h-24 w-24 place-items-center rounded-3xl bg-rose-500 text-4xl font-black text-white shadow-xl shadow-rose-500/30">
                  ✕
                </div>
              )}
            </div>

            {/* Title / Badge */}
            <div className="mb-2">
              <span
                className={`inline-block rounded-full px-4 py-1 text-xs font-black tracking-wider uppercase ${
                  scanResult.type === 'success'
                    ? scanResult.direction === 'in'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    : scanResult.type === 'duplicate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-400/30'
                }`}
              >
                {scanResult.title}
              </span>
            </div>

            {/* Person Name */}
            <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mt-2">
              {scanResult.person?.name || (scanResult.type === 'error' ? 'Unknown RFID Card' : 'Card Tapped')}
            </h3>

            {/* Role & Class Details */}
            {scanResult.person && (
              <p className="mt-1 text-sm sm:text-base font-medium text-slate-300">
                {scanResult.person.personType === 'student' ? (
                  <>Student • Class {scanResult.person.class?.name || '10'}-{scanResult.person.section || 'A'}</>
                ) : (
                  <>{scanResult.person.designation || 'Staff Member'}</>
                )}
              </p>
            )}

            {/* Time & Card UID Subtitle */}
            <div className="mt-4 rounded-2xl bg-slate-950/60 border border-slate-800 p-3 text-xs text-slate-400">
              <div className="flex justify-between items-center">
                <span>Timestamp: <b className="text-white">{scanResult.time}</b></span>
                <span>Card UID: <b className="font-mono text-white">{scanResult.cardUID}</b></span>
              </div>
              <p className="mt-1 text-slate-400">{scanResult.subtitle}</p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setScanResult(null)}
              className="mt-6 w-full rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-3 text-sm font-bold text-white transition shadow-lg"
            >
              Ready for Next Card (Dismiss)
            </button>
          </div>
        </div>
      )}

      {/* MANUAL RFID CARD UID / TOUCH NUMPAD MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Manual RFID Entry</h3>
                <p className="text-xs text-slate-400">Type card UID or tap preset digits</p>
              </div>
              <button
                onClick={() => setShowManualModal(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowManualModal(false);
                processCardScan(manualCardUID);
                setManualCardUID('');
              }}
              className="mt-4"
            >
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                RFID Card UID
              </label>
              <input
                type="text"
                value={manualCardUID}
                onChange={(e) => setManualCardUID(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3D4"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 font-mono text-lg font-bold tracking-wider text-white uppercase outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-900/40"
                autoFocus
              />

              {/* On-screen touch keypad for tablets */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {['1', '2', '3', 'A', '4', '5', '6', 'B', '7', '8', '9', 'C', '0', 'D', 'E', 'F'].map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setManualCardUID((prev) => prev + ch)}
                    className="rounded-xl border border-slate-800 bg-slate-800/60 py-3 text-base font-bold font-mono text-slate-200 hover:bg-slate-700 active:scale-95 transition"
                  >
                    {ch}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setManualCardUID((prev) => prev.slice(0, -1))}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  ⌫ Backspace
                </button>
                <button
                  type="button"
                  onClick={() => setManualCardUID('')}
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-800 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
                >
                  Clear
                </button>
              </div>

              <button
                type="submit"
                disabled={!manualCardUID.trim()}
                className="btn-primary mt-4 w-full py-3 text-sm font-bold disabled:opacity-50"
              >
                Simulate Card Tap
              </button>
            </form>
          </div>
        </div>
      )}

      {/* KIOSK CONFIGURATION / SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">Tablet Kiosk Settings</h3>
              <button
                onClick={() => setShowSettings(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-sm">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Assigned Reader Device ID</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono uppercase outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">e.g. GATE01, GATE02, RECEPTION</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Reader Device Secret API Key</label>
                <input
                  type="password"
                  value={deviceKey}
                  onChange={(e) => setDeviceKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white font-mono outline-none focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-slate-500">Must match the registered RFID device secret key</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <p className="font-semibold text-white">Voice Greeting</p>
                  <p className="text-xs text-slate-400">Speak student/teacher name on tap</p>
                </div>
                <input
                  type="checkbox"
                  checked={voiceEnabled}
                  onChange={(e) => setVoiceEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-white">Sound Effects</p>
                  <p className="text-xs text-slate-400">Play chimes on successful or invalid scan</p>
                </div>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-700 text-blue-600 focus:ring-0"
                />
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('navira_kiosk_device', deviceId);
                  localStorage.setItem('navira_kiosk_key', deviceKey);
                  setShowSettings(false);
                  if (onToast) onToast('Kiosk settings saved successfully');
                }}
                className="btn-primary w-full mt-4"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
