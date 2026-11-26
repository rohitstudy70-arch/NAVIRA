export default function Toast({ message, type = 'success', onClose }) {
  if (!message) return null;
  return <div className={`fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${type === 'error' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}><span>{type === 'error' ? '!' : '✓'}</span><p>{message}</p><button className="ml-2" onClick={onClose}>×</button></div>;
}
