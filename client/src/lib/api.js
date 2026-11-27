const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const defaultBackend = isLocal ? 'http://localhost:5000' : 'https://navira-attendance-api.onrender.com';

const baseUrl = import.meta.env.VITE_API_URL || `${defaultBackend}/api`;
const socketUrl = import.meta.env.VITE_SOCKET_URL || defaultBackend;

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

export async function api(path, options = {}) {
  const token = localStorage.getItem('navira_token');
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.message || 'Request failed', response.status);
  return data;
}

export { baseUrl, socketUrl };
