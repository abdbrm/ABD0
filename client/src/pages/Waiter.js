import { useState, useEffect, useRef, useCallback } from 'react';
import { api, connectSocket, getUser, logout } from '../utils/api';
import ClockBar from '../components/ClockBar';

const CATEGORY_LABELS = {
  холодные_закуски: 'Холодные закуски',
  пицца: 'Пицца',
  салаты: 'Салаты',
  паста: 'Паста',
  горячие_блюда: 'Горячие блюда',
  закуски_к_пиву: 'Закуски к пиву',
  десерты: 'Десерты',
};

export default function Waiter() {
  const user   = getUser();
  const socket = useRef(null);

  const [shift,    setShift]    = useState(null);
  const [myInfo,   setMyInfo]   = useState(null);    // { club, tables }
  const [cookHere, setCookHere] = useState(false);
  const [menu,     setMenu]     = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [tab,      setTab]      = useState('menu');  // menu | orders
  const [selTable, setSelTable] = useState(null);
  const [cart,     setCart]     = useState({});      // menuItemId → { item, qty, note }
  const [sending,  setSending]  = useState(false);
  const [catFilter,setCatFilter]= useState('all');

  const load = useCallback(async () => {
    const [sRes, mRes, oRes] = await Promise.all([
      api.get('/shifts/current').catch(() => ({ data: null })),
      api.get('/menu?active=true').catch(() => ({ data: [] })),
      api.get('/orders/my').catch(() => ({ data: [] })),
    ]);
    const s = sRes.data;
    setShift(s);
    setMenu(Array.isArray(mRes.data) ? mRes.data : []);
    setMyOrders(Array.isArray(oRes.data) ? oRes.data : []);
    if (s) {
      const me = s.waiters?.find(w => w.userId === user?.id);
      setMyInfo(me || null);
      setCookHere(s.cook?.arrived || false);
      if (me?.tables?.length) setSelTable(me.tables[0]);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    socket.current = connectSocket('waiter', user?.id);
    socket.current.on('cook_arrived', () => setCookHere(true));
    socket.current.on('shift_closed', () => { setShift(null); setCookHere(false); });
    socket.current.on('order_status_update', ({ orderId, status }) => {
      setMyOrders(prev => prev.map(o => o._id === orderId ? { ...o, status } : o));
    });
    return () => socket.current?.disconnect();
  }, [user?.id]);

  // ── Cart helpers ─────────────────────────────────────
  function addToCart(item) {
    setCart(c => ({
      ...c,
      [item._id]: { item, qty: (c[item._id]?.qty || 0) + 1, note: c[item._id]?.note || '' }
    }));
  }
  function removeFromCart(id) {
    setCart(c => {
      const n = { ...c };
      if (n[id]?.qty > 1) n[id] = { ...n[id], qty: n[id].qty - 1 };
      else delete n[id];
      return n;
    });
  }
  function setNote(id, note) {
    setCart(c => ({ ...c, [id]: { ...c[id], note } }));
  }

  const cartItems  = Object.values(cart);
  const cartTotal  = cartItems.reduce((s, e) => s + e.item.price * e.qty, 0);
  const cartCount  = cartItems.reduce((s, e) => s + e.qty, 0);

  async function sendOrder() {
    if (!selTable || cartItems.length === 0 || !shift || !myInfo) return;
    setSending(true);
    try {
      const items = cartItems.map(e => ({
        menuItemId: e.item._id,
        name:       e.item.name,
        nameEn:     e.item.nameEn,
        quantity:   e.qty,
        price:      e.item.price,
        note:       e.note || ''
      }));
      const { data: order } = await api.post('/orders', {
        tableNumber: selTable,
        club:        myInfo.club,
        waiter:      { userId: user.id, name: user.displayName },
        items,
        discount:    0
      });
      socket.current?.emit('broadcast_order', order);
      setMyOrders(prev => [order, ...prev]);
      setCart({});
      setTab('orders');
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    } finally { setSending(false); }
  }

  // ── Group menu by category ────────────────────────────
  const grouped = {};
  menu.filter(m => catFilter === 'all' || m.category === catFilter)
      .forEach(m => { (grouped[m.category] = grouped[m.category] || []).push(m); });

  // ── Not in shift ──────────────────────────────────────
  if (!shift || !myInfo) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ClockBar />
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <h2>Ожидание открытия смены</h2>
        <p className="dim" style={{ marginTop: 8 }}>Смена ещё не открыта или вас не добавили</p>
        <button className="btn btn-outline btn-sm mt-16" onClick={logout}>Выйти</button>
      </div>
    </div>
  );

  if (!cookHere) return (
    <div className="page" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <ClockBar />
      <div style={{ textAlign: 'center', padding: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>👨‍🍳</div>
        <h2>Ожидание повара</h2>
        <p className="dim mt-8">Страница откроется когда повар отметится на кухне</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <ClockBar right={
        <div className="flex gap-8 center">
          <span className={`tag tag-${myInfo.club}`}>{myInfo.club?.toUpperCase()}</span>
          <span className="dim">{user?.displayName}</span>
          <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
        </div>
      } />

      {/* Table selector */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 16px' }}>
        <div className="flex gap-8 center wrap">
          <span className="dim">Стол:</span>
          {myInfo.tables.map(t => (
            <button
              key={t}
              className="btn btn-sm"
              style={{ background: selTable === t ? 'var(--accent)' : 'var(--surface2)', color: selTable === t ? '#fff' : 'var(--text)' }}
              onClick={() => setSelTable(t)}
            >{t}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
        <div className="flex">
          <TabBtn active={tab === 'menu'}   onClick={() => setTab('menu')}>Меню</TabBtn>
          <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')}>
            Мои заказы {myOrders.filter(o=>o.status!=='served').length > 0 && `(${myOrders.filter(o=>o.status!=='served').length})`}
          </TabBtn>
        </div>
        {cartCount > 0 && (
          <button
            className="btn btn-sm"
            style={{ margin: '6px 12px', background: 'var(--green)' }}
            onClick={() => setTab('cart')}
          >
            🛒 {cartCount} — {cartTotal} ₽
          </button>
        )}
      </div>

      <div className="page-body">

        {/* ── MENU ──────────────────────────────────── */}
        {tab === 'menu' && (
          <>
            <div className="flex gap-8 mb-16 wrap">
              <button
                className="btn btn-sm"
                style={{ background: catFilter === 'all' ? 'var(--accent)' : 'var(--surface2)' }}
                onClick={() => setCatFilter('all')}
              >Все</button>
              {Object.entries(CATEGORY_LABELS).map(([k,v]) => (
                <button
                  key={k}
                  className="btn btn-sm"
                  style={{ background: catFilter === k ? 'var(--accent)' : 'var(--surface2)', color: catFilter === k ? '#fff' : 'var(--text)' }}
                  onClick={() => setCatFilter(k)}
                >{v}</button>
              ))}
            </div>

            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-16">
                <h3 style={{ color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 }}>
                  {CATEGORY_LABELS[cat] || cat}
                </h3>
                {items.map(item => {
                  const inCart = cart[item._id]?.qty || 0;
                  return (
                    <div key={item._id} className="card mb-8" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px' }}>
                      <div style={{ flex: 1 }}>
                        <div className="bold">{item.name}</div>
                        {item.weight && <span className="dim" style={{ fontSize: 12 }}>{item.weight}</span>}
                        {item.description && <div className="dim" style={{ fontSize: 12, marginTop: 2 }}>{item.description}</div>}
                      </div>
                      <div className="flex gap-8 center" style={{ marginLeft: 16 }}>
                        <span style={{ fontWeight: 700, minWidth: 60, textAlign: 'right' }}>{item.price} ₽</span>
                        {inCart > 0 ? (
                          <div className="flex gap-8 center">
                            <button className="btn btn-outline btn-sm" style={{ width: 30, padding: 0 }} onClick={() => removeFromCart(item._id)}>−</button>
                            <span className="bold">{inCart}</span>
                            <button className="btn btn-sm" style={{ width: 30, padding: 0 }} onClick={() => addToCart(item)}>+</button>
                          </div>
                        ) : (
                          <button className="btn btn-sm" onClick={() => addToCart(item)}>+</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {/* ── CART ──────────────────────────────────── */}
        {tab === 'cart' && (
          <div style={{ maxWidth: 500 }}>
            <h2 className="mb-16">Корзина — Стол {selTable}</h2>
            {cartItems.map(e => (
              <div key={e.item._id} className="card mb-8">
                <div className="flex between center">
                  <div>
                    <span className="bold">{e.item.name}</span>
                    <span className="dim" style={{ marginLeft: 8 }}>{e.item.price} ₽ × {e.qty}</span>
                  </div>
                  <div className="flex gap-8 center">
                    <button className="btn btn-outline btn-sm" onClick={() => removeFromCart(e.item._id)}>−</button>
                    <span className="bold">{e.qty}</span>
                    <button className="btn btn-sm" onClick={() => addToCart(e.item)}>+</button>
                  </div>
                </div>
                <input
                  type="text" placeholder="Примечание (необязательно)"
                  style={{ marginTop: 8, fontSize: 13 }}
                  value={e.note || ''}
                  onChange={ev => setNote(e.item._id, ev.target.value)}
                />
              </div>
            ))}
            <div className="card" style={{ textAlign: 'right', fontSize: 18 }}>
              <span className="bold">Итого: {cartTotal} ₽</span>
            </div>
            <div className="flex gap-8 mt-16">
              <button className="btn btn-outline" onClick={() => setTab('menu')}>← Назад</button>
              <button className="btn btn-green" style={{ flex: 1 }} disabled={sending || !selTable} onClick={sendOrder}>
                {sending ? 'Отправка...' : `Отправить на кухню ▶`}
              </button>
            </div>
          </div>
        )}

        {/* ── MY ORDERS ─────────────────────────────── */}
        {tab === 'orders' && (
          <div>
            <h2 className="mb-16">Мои заказы</h2>
            {myOrders.length === 0 && <p className="dim">Нет заказов</p>}
            {myOrders.map(order => (
              <div key={order._id} className="card mb-8">
                <div className="flex between center mb-8">
                  <span className="bold">Стол {order.tableNumber} #{order.orderNumber}</span>
                  <StatusBadge status={order.status} />
                </div>
                {order.items.map((item, i) => (
                  <div key={i} className="dim" style={{ fontSize: 13 }}>{item.quantity}× {item.name}</div>
                ))}
                <div style={{ textAlign: 'right', marginTop: 8 }}>{order.finalAmount} ₽</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '12px 20px', border: 'none', background: 'none',
      color: active ? 'var(--text)' : 'var(--text-dim)',
      borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
      fontWeight: active ? 700 : 400, cursor: 'pointer'
    }}>{children}</button>
  );
}

function StatusBadge({ status }) {
  const map = { new:'tag-new', cooking:'tag-cooking', ready:'tag-ready', served:'tag-served', cancelled:'tag-cancelled' };
  const labels = { new:'Новый', cooking:'Готовится', ready:'Готово ✓', served:'Подан', cancelled:'Отменён' };
  return <span className={`tag ${map[status]}`}>{labels[status]}</span>;
}
