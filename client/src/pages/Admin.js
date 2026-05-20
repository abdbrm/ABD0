import { useState, useEffect, useRef, useCallback } from 'react';
import { api, connectSocket, getUser, logout } from '../utils/api';
import ClockBar from '../components/ClockBar';
import SwipeToConfirm from '../components/SwipeToConfirm';

export default function Admin({ isSuperAdmin = false }) {
  const user   = getUser();
  const socket = useRef(null);

  const [vis,     setVis]     = useState({});    // visibility settings
  const [shift,   setShift]   = useState(null);
  const [orders,  setOrders]  = useState([]);
  const [cooks,   setCooks]   = useState([]);
  const [waiters, setWaiters] = useState([]);
  const [users,   setUsers]   = useState([]);
  const [tab,     setTab]     = useState('dashboard');

  // Open shift form
  const [openForm, setOpenForm] = useState({ cookId: '', waiters: [] });
  const [opening,  setOpening]  = useState(false);
  const [closeWarn, setCloseWarn] = useState(false);

  // New user form
  const [newUser, setNewUser] = useState({ username:'', password:'', displayName:'', role:'waiter' });

  const load = useCallback(async () => {
    const [vRes, sRes, oRes, cRes, wRes] = await Promise.all([
      api.get('/settings/visibility'),
      api.get('/shifts/current').catch(() => ({ data: null })),
      api.get('/orders').catch(() => ({ data: [] })),
      api.get('/shifts/staff/cooks'),
      api.get('/shifts/staff/waiters'),
    ]);
    setVis(vRes.data || {});
    setShift(sRes.data);
    setOrders(Array.isArray(oRes.data) ? oRes.data : []);
    setCooks(cRes.data || []);
    setWaiters(wRes.data || []);
  }, []);

  const loadUsers = useCallback(async () => {
    const { data } = await api.get('/users');
    setUsers(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'users') loadUsers(); }, [tab, loadUsers]);

  useEffect(() => {
    socket.current = connectSocket(isSuperAdmin ? 'superadmin' : 'admin', user?.id);
    socket.current.on('broadcast_order_from_server', o => setOrders(prev => [o, ...prev.slice(0, 199)]));
    socket.current.on('order_status_update', ({ orderId, status }) =>
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o))
    );
    socket.current.on('shift_opened', s => setShift(s));
    socket.current.on('shift_closed', () => { setShift(null); setOrders([]); });
    socket.current.on('cook_arrived', () => setShift(s => s ? { ...s, cook: { ...s.cook, arrived: true } } : s));
    return () => socket.current?.disconnect();
  }, [user?.id, isSuperAdmin]);

  // ── Open shift ────────────────────────────────────────
  async function openShift() {
    if (!openForm.cookId) return alert('Выберите повара');
    setOpening(true);
    try {
      const { data } = await api.post('/shifts/open', {
        cookId:  openForm.cookId,
        waiters: openForm.waiters
      });
      setShift(data);
    } catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
    finally { setOpening(false); }
  }

  // ── Close shift ───────────────────────────────────────
  async function closeShift(force = false) {
    if (!shift) return;
    try {
      await api.post(`/shifts/${shift._id}/close`, { force });
      setShift(null); setOrders([]); setCloseWarn(false);
    } catch (err) {
      if (err.response?.data?.code === 'inventory_required') setCloseWarn(true);
      else alert(err.response?.data?.message || 'Ошибка');
    }
  }

  // ── Add waiter to open form ───────────────────────────
  function toggleWaiter(userId, club) {
    setOpenForm(f => {
      const exists = f.waiters.find(w => w.userId === userId);
      if (exists) return { ...f, waiters: f.waiters.filter(w => w.userId !== userId) };
      return { ...f, waiters: [...f.waiters, { userId, club: club || 'neon', tables: [] }] };
    });
  }
  function setWaiterClub(userId, club) {
    setOpenForm(f => ({ ...f, waiters: f.waiters.map(w => w.userId === userId ? { ...w, club } : w) }));
  }
  function setWaiterTables(userId, tablesStr) {
    const tables = tablesStr.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    setOpenForm(f => ({ ...f, waiters: f.waiters.map(w => w.userId === userId ? { ...w, tables } : w) }));
  }

  // ── Create user ───────────────────────────────────────
  async function createUser() {
    try {
      await api.post('/users', newUser);
      setNewUser({ username:'', password:'', displayName:'', role:'waiter' });
      loadUsers();
    } catch (err) { alert(err.response?.data?.message || 'Ошибка'); }
  }

  // ── Sales totals from shift ───────────────────────────
  const totals = shift?.totals || { neon: 0, enot: 0, elvis: 0, all: 0 };

  // ── Visibility check ──────────────────────────────────
  const show = (key) => isSuperAdmin || vis[key] !== false;

  const tabs = [
    { key: 'dashboard', label: 'Панель' },
    show('shift_management') ? { key: 'shift', label: 'Смена' } : null,
    show('order_history')    ? { key: 'orders', label: 'Заказы' } : null,
    show('user_management')  ? { key: 'users', label: 'Персонал' } : null,
    show('reports')          ? { key: 'reports', label: 'Отчёты' } : null,
    isSuperAdmin ? { key: 'superadmin', label: '⚙ Настройки' } : null,
  ].filter(Boolean);

  return (
    <div className="page">
      <ClockBar right={
        <div className="flex gap-8 center">
          <span className="dim">{user?.displayName}</span>
          {isSuperAdmin && <span className="tag" style={{ background: '#4f1f7f', color: '#d0a0ff' }}>SUPER ADMIN</span>}
          <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
        </div>
      } />

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '12px 20px', border: 'none', background: 'none', whiteSpace: 'nowrap',
            color: tab === t.key ? 'var(--text)' : 'var(--text-dim)',
            borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            fontWeight: tab === t.key ? 700 : 400, cursor: 'pointer'
          }}>{t.label}</button>
        ))}
      </div>

      <div className="page-body">

        {/* ── DASHBOARD ─────────────────────────────── */}
        {tab === 'dashboard' && (
          <>
            <div className="grid-3 mb-16">
              <StatCard color="var(--accent)"  label="NEON"  value={`${totals.neon.toFixed(0)} ₽`} />
              <StatCard color="var(--red)"     label="ENOT"  value={`${totals.enot.toFixed(0)} ₽`} />
              <StatCard color="var(--yellow)"  label="ELVIS" value={`${totals.elvis.toFixed(0)} ₽`} />
            </div>
            <div className="card mb-16" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>ИТОГО ЗА СМЕНУ</div>
                <div style={{ fontSize: 28, fontWeight: 700 }}>{totals.all.toFixed(0)} ₽</div>
              </div>
              <div>
                {shift ? (
                  <span className="tag tag-ready">Смена открыта</span>
                ) : (
                  <span className="tag tag-cancelled">Смена закрыта</span>
                )}
              </div>
            </div>

            {/* Live orders feed */}
            <h2 className="mb-8">Последние заказы</h2>
            {orders.slice(0, 20).map(o => (
              <div key={o._id} className="card mb-8" style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className="flex gap-8 center">
                  <span className={`tag tag-${o.club}`}>{o.club?.toUpperCase()}</span>
                  <span>Стол {o.tableNumber}</span>
                  <span className="dim">#{o.orderNumber}</span>
                  <span className="dim">{o.waiter?.name}</span>
                  {o.isWorkerOrder && <span className="tag" style={{ background: '#2d2000', color: 'var(--yellow)', fontSize: 11 }}>персонал</span>}
                </div>
                <div className="flex gap-8 center">
                  <span>{o.finalAmount} ₽</span>
                  <StatusBadge status={o.status} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* ── SHIFT MANAGEMENT ──────────────────────── */}
        {tab === 'shift' && show('shift_management') && (
          <div style={{ maxWidth: 600 }}>
            {!shift ? (
              <>
                <h2 className="mb-16">Открыть смену</h2>
                <div className="card mb-16">
                  <label className="dim mb-8" style={{ display: 'block' }}>Повар на смене</label>
                  <select value={openForm.cookId} onChange={e => setOpenForm(f => ({ ...f, cookId: e.target.value }))}>
                    <option value="">— Выберите повара —</option>
                    {cooks.map(c => <option key={c._id} value={c._id}>{c.displayName}</option>)}
                  </select>
                </div>

                <div className="card mb-16">
                  <label className="dim mb-8" style={{ display: 'block' }}>Официанты (выберите + укажите клуб и столы)</label>
                  {waiters.map(w => {
                    const sel = openForm.waiters.find(x => x.userId === w._id);
                    return (
                      <div key={w._id} className="mb-8" style={{ padding: 10, border: `1px solid ${sel ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 8 }}>
                        <div className="flex between center">
                          <div className="flex gap-8 center">
                            <input type="checkbox" checked={!!sel} onChange={() => toggleWaiter(w._id)} style={{ width: 'auto' }} />
                            <span>{w.displayName}</span>
                          </div>
                          {sel && (
                            <div className="flex gap-8 center">
                              <select style={{ width: 100 }} value={sel.club} onChange={e => setWaiterClub(w._id, e.target.value)}>
                                <option value="neon">NEON</option>
                                <option value="enot">ENOT</option>
                                <option value="elvis">ELVIS</option>
                              </select>
                              <input type="text" style={{ width: 120 }} placeholder="Столы: 1,2,3"
                                onChange={e => setWaiterTables(w._id, e.target.value)} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="btn btn-green btn-lg" style={{ width: '100%' }} onClick={openShift} disabled={opening}>
                  {opening ? 'Открытие...' : '▶ Открыть смену'}
                </button>
              </>
            ) : (
              <>
                <h2 className="mb-16">Текущая смена</h2>
                <div className="card mb-16">
                  <div className="flex between mb-8">
                    <span className="dim">Открыта:</span>
                    <span>{new Date(shift.openedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</span>
                  </div>
                  <div className="flex between mb-8">
                    <span className="dim">Повар:</span>
                    <span>{shift.cook?.name} {shift.cook?.arrived ? '✓ на кухне' : '⏳ не прибыл'}</span>
                  </div>
                  <div className="mt-8">
                    <div className="dim mb-8">Официанты:</div>
                    {shift.waiters?.map((w, i) => (
                      <div key={i} className="flex between" style={{ fontSize: 13, marginBottom: 4 }}>
                        <span>{w.name}</span>
                        <span className="dim">{w.club?.toUpperCase()} / столы: {w.tables?.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {!closeWarn ? (
                  <button className="btn btn-red" style={{ width: '100%' }} onClick={() => closeShift(false)}>
                    Закрыть смену
                  </button>
                ) : (
                  <div className="card" style={{ border: '1px solid var(--red)' }}>
                    <p style={{ color: 'var(--red)', marginBottom: 16 }}>⚠ Повар не завершил инвентаризацию</p>
                    <SwipeToConfirm label="→ Всё равно закрыть смену" onConfirm={() => closeShift(true)} />
                    <button className="btn btn-outline btn-sm mt-16" onClick={() => setCloseWarn(false)}>Отмена</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ORDERS ────────────────────────────────── */}
        {tab === 'orders' && show('order_history') && (
          <div>
            <h2 className="mb-16">Все заказы</h2>
            {orders.map(o => (
              <div key={o._id} className="card mb-8" style={{ padding: '10px 14px' }}>
                <div className="flex between center mb-4">
                  <div className="flex gap-8 center">
                    <span className={`tag tag-${o.club}`}>{o.club?.toUpperCase()}</span>
                    <span className="bold">Стол {o.tableNumber}</span>
                    <span className="dim">#{o.orderNumber}</span>
                    <span className="dim">{o.waiter?.name}</span>
                  </div>
                  <div className="flex gap-8 center">
                    <span className="bold">{o.finalAmount} ₽</span>
                    <StatusBadge status={o.status} />
                  </div>
                </div>
                <div className="dim" style={{ fontSize: 12 }}>
                  {o.items.map(i => `${i.quantity}× ${i.name}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── USERS ─────────────────────────────────── */}
        {tab === 'users' && show('user_management') && (
          <div style={{ maxWidth: 600 }}>
            <h2 className="mb-16">Персонал</h2>
            <div className="card mb-16">
              <h3 className="mb-8">Добавить сотрудника</h3>
              <div className="flex-col gap-8">
                <input placeholder="Логин" value={newUser.username} onChange={e => setNewUser(f => ({ ...f, username: e.target.value }))} />
                <input placeholder="Имя" value={newUser.displayName} onChange={e => setNewUser(f => ({ ...f, displayName: e.target.value }))} />
                <input type="password" placeholder="Пароль" value={newUser.password} onChange={e => setNewUser(f => ({ ...f, password: e.target.value }))} />
                <select value={newUser.role} onChange={e => setNewUser(f => ({ ...f, role: e.target.value }))}>
                  <option value="waiter">Официант</option>
                  <option value="cook">Повар</option>
                  {isSuperAdmin && <option value="admin">Администратор</option>}
                </select>
                <button className="btn" onClick={createUser}>Добавить</button>
              </div>
            </div>
            {users.map(u => (
              <div key={u._id} className="card mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px' }}>
                <div>
                  <span className="bold">{u.displayName}</span>
                  <span className="dim" style={{ marginLeft: 8, fontSize: 12 }}>@{u.username}</span>
                </div>
                <span className="tag" style={{ background: 'var(--surface2)' }}>{u.role}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── REPORTS ───────────────────────────────── */}
        {tab === 'reports' && show('reports') && (
          <ReportsTab shift={shift} />
        )}

        {/* ── SUPER ADMIN SETTINGS ──────────────────── */}
        {tab === 'superadmin' && isSuperAdmin && (
          <SuperAdminSettings vis={vis} setVis={setVis} />
        )}

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────
function StatCard({ color, label, value }) {
  return (
    <div className="card" style={{ borderTop: `3px solid ${color}`, padding: 16 }}>
      <div className="dim" style={{ fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { new:'tag-new', cooking:'tag-cooking', ready:'tag-ready', served:'tag-served', cancelled:'tag-cancelled' };
  const lbl = { new:'Новый', cooking:'Готовится', ready:'Готово', served:'Подан', cancelled:'Отменён' };
  return <span className={`tag ${map[status]}`}>{lbl[status]}</span>;
}

function ReportsTab({ shift }) {
  const [summary, setSummary] = useState(null);
  const [shifts,  setShifts]  = useState([]);
  const [selShift,setSelShift]= useState('');

  useEffect(() => {
    api.get('/shifts?limit=30').then(r => {
      setShifts(r.data?.shifts || []);
      if (shift) setSelShift(shift._id);
    });
  }, [shift]);

  useEffect(() => {
    if (!selShift) return;
    api.get(`/reports/sales/${selShift}`).then(r => setSummary(r.data));
  }, [selShift]);

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 className="mb-16">Отчёты</h2>
      <div className="mb-16">
        <select value={selShift} onChange={e => setSelShift(e.target.value)}>
          <option value="">— Выберите смену —</option>
          {shifts.map(s => (
            <option key={s._id} value={s._id}>
              {new Date(s.openedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} {s.status === 'open' ? '(открыта)' : ''}
            </option>
          ))}
        </select>
      </div>

      {summary && selShift && (
        <>
          <div className="card mb-8">
            <div style={{ fontSize: 22, fontWeight: 700 }}>{summary.total?.toFixed(0)} ₽ всего</div>
            <div className="dim">{summary.orderCount} заказов</div>
          </div>
          <div className="grid-3 mb-8">
            {['neon','enot','elvis'].map(c => (
              <div key={c} className="card" style={{ textAlign: 'center' }}>
                <div className="dim" style={{ fontSize: 12 }}>{c.toUpperCase()}</div>
                <div className="bold">{(summary.byClub?.[c] || 0).toFixed(0)} ₽</div>
              </div>
            ))}
          </div>
          <div className="card mb-16">
            <h3 className="mb-8">По официантам</h3>
            {Object.entries(summary.byWaiter || {}).sort((a,b)=>b[1]-a[1]).map(([n,a]) => (
              <div key={n} className="flex between" style={{ marginBottom: 4 }}><span>{n}</span><span className="bold">{a.toFixed(0)} ₽</span></div>
            ))}
          </div>
          <div className="flex gap-8">
            <a href={`/api/reports/sales/${selShift}/pdf`} target="_blank" rel="noreferrer" className="btn">📄 Продажи PDF</a>
            <a href={`/api/reports/inventory/${selShift}/pdf`} target="_blank" rel="noreferrer" className="btn btn-outline">📦 Инвентаризация PDF</a>
          </div>
        </>
      )}
    </div>
  );
}

const VIS_LABELS = {
  menu_management:   'Управление меню',
  inventory_view:    'Просмотр склада',
  inventory_edit:    'Редактирование склада',
  reports:           'Отчёты',
  user_management:   'Управление персоналом',
  worker_orders:     'Заказы персонала',
  shift_management:  'Управление сменой',
  order_history:     'История заказов',
  ingredient_add:    'Добавление ингредиентов',
};

function SuperAdminSettings({ vis, setVis }) {
  const [workerDiscount, setWorkerDiscount] = useState('');
  const [workerCode,     setWorkerCode]     = useState('');
  const [pwdUser,        setPwdUser]        = useState('');
  const [pwdNew,         setPwdNew]         = useState('');
  const [users,          setUsers]          = useState([]);

  useEffect(() => {
    api.get('/settings').then(r => {
      setWorkerDiscount(r.data.worker_discount || 30);
      setWorkerCode(r.data.worker_code || 'STAFF');
    });
    api.get('/users/all').then(r => setUsers(r.data || []));
  }, []);

  async function toggleVis(key) {
    const newVal = !vis[key];
    await api.put('/settings/visibility/batch', { [key]: newVal });
    setVis(v => ({ ...v, [key]: newVal }));
  }

  async function saveSetting(key, val) {
    await api.put(`/settings/${key}`, { value: val });
    alert('Сохранено');
  }

  async function changePassword() {
    if (!pwdUser || !pwdNew) return;
    await api.put('/auth/password', { userId: pwdUser, newPassword: pwdNew });
    setPwdNew(''); alert('Пароль изменён');
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 className="mb-16">Настройки Abdo</h2>

      {/* Visibility toggles */}
      <div className="card mb-16">
        <h3 className="mb-8">Видимость в панели администратора</h3>
        {Object.entries(VIS_LABELS).map(([key, label]) => (
          <div key={key} className="flex between center" style={{ marginBottom: 10 }}>
            <span>{label}</span>
            <button
              className={`btn btn-sm ${vis[key] !== false ? 'btn-green' : 'btn-red'}`}
              onClick={() => toggleVis(key)}
            >
              {vis[key] !== false ? 'Вкл ✓' : 'Выкл ✗'}
            </button>
          </div>
        ))}
      </div>

      {/* Worker discount */}
      <div className="card mb-16">
        <h3 className="mb-8">Скидка персонала</h3>
        <div className="flex gap-8">
          <input type="number" value={workerDiscount} onChange={e => setWorkerDiscount(e.target.value)} style={{ width: 80 }} />
          <span style={{ lineHeight: '38px' }}>%</span>
          <button className="btn btn-sm" onClick={() => saveSetting('worker_discount', +workerDiscount)}>Сохранить</button>
        </div>
        <div className="mt-8">
          <label className="dim" style={{ display: 'block', marginBottom: 4 }}>Код доступа (ссылка /worker?code=...)</label>
          <div className="flex gap-8">
            <input value={workerCode} onChange={e => setWorkerCode(e.target.value)} style={{ maxWidth: 200 }} />
            <button className="btn btn-sm" onClick={() => saveSetting('worker_code', workerCode)}>Сохранить</button>
          </div>
        </div>
      </div>

      {/* Change password */}
      <div className="card mb-16">
        <h3 className="mb-8">Изменить пароль</h3>
        <div className="flex-col gap-8">
          <select value={pwdUser} onChange={e => setPwdUser(e.target.value)}>
            <option value="">— Выберите пользователя —</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.displayName} (@{u.username})</option>)}
          </select>
          <input type="password" placeholder="Новый пароль" value={pwdNew} onChange={e => setPwdNew(e.target.value)} />
          <button className="btn" onClick={changePassword}>Изменить пароль</button>
        </div>
      </div>

      {/* Quick navigation */}
      <div className="card">
        <h3 className="mb-8">Быстрая навигация</h3>
        <div className="flex gap-8 wrap">
          <a href="/admin"    className="btn btn-outline btn-sm">Панель Admin</a>
          <a href="/kitchen"  className="btn btn-outline btn-sm">Кухня</a>
          <a href="/waiter"   className="btn btn-outline btn-sm">Официант</a>
          <a href="/worker"   className="btn btn-outline btn-sm">Персонал</a>
        </div>
      </div>
    </div>
  );
}
