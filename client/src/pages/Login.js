import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

export default function Login() {
  const nav = useNavigate();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ROLE_ROUTES = {
    superadmin: '/superadmin',
    admin:      '/admin',
    cook:       '/kitchen',
    waiter:     '/waiter',
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', form);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      nav(ROLE_ROUTES[data.user.role] || '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--bg)'
    }}>
      <div className="card" style={{ width: 340, padding: 32 }}>
        <h1 style={{ textAlign: 'center', marginBottom: 8 }}>NEON</h1>
        <p style={{ textAlign: 'center', color: 'var(--text-dim)', marginBottom: 28, fontSize: 13 }}>
          Система управления кухней
        </p>

        <form onSubmit={handleSubmit} className="flex-col gap-16">
          <div>
            <label className="dim mb-8" style={{ display: 'block' }}>Логин</label>
            <input
              autoComplete="username"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="dim mb-8" style={{ display: 'block' }}>Пароль</label>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </div>
          {error && <div style={{ color: 'var(--red)', fontSize: 13 }}>{error}</div>}
          <button className="btn btn-lg" type="submit" disabled={loading}>
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
}
