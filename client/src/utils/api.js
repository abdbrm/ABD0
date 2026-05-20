import axios from 'axios';
import { io } from 'socket.io-client';

const BASE = process.env.REACT_APP_API_URL || '';

// ── Axios instance ────────────────────────────────────────
export const api = axios.create({ baseURL: BASE + '/api' });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Socket singleton ──────────────────────────────────────
let _socket = null;

export function getSocket() {
  if (!_socket) {
    _socket = io(BASE || window.location.origin, { autoConnect: false });
  }
  return _socket;
}

export function connectSocket(role, userId) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit('register', { role, userId });
  return s;
}

// ── Moscow time ───────────────────────────────────────────
export function moscowTime() {
  return new Date().toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
export function moscowDateTime() {
  return new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ── Auth helpers ──────────────────────────────────────────
export function getUser()  { try { return JSON.parse(localStorage.getItem('user')); } catch { return null; } }
export function getToken() { return localStorage.getItem('token'); }
export function logout()   { localStorage.clear(); window.location.href = '/login'; }

// ── Club colours ──────────────────────────────────────────
export const CLUB_COLORS = {
  neon:  { bg: '#0d1b4b', accent: '#4f8eff', text: '#e0eaff', badge: '#1e3a8a' },
  enot:  { bg: '#2d0a0a', accent: '#e53e3e', text: '#ffe0e0', badge: '#7f1d1d' },
  elvis: { bg: '#2a1a0a', accent: '#c9a04a', text: '#fff3dc', badge: '#78350f' },
};
