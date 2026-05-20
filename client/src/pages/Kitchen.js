import { useState, useEffect, useCallback, useRef } from 'react';
import { api, connectSocket, getUser, logout } from '../utils/api';
import ClockBar from '../components/ClockBar';
import SwipeToConfirm from '../components/SwipeToConfirm';

const STATUS_LABELS = { new: 'Новый', cooking: 'Готовится', ready: 'Готово', served: 'Подан', cancelled: 'Отменён' };
const STATUS_NEXT   = { new: 'cooking', cooking: 'ready', ready: 'served' };
const STATUS_BTN    = { new: 'Принять', cooking: 'Готово!', ready: 'Подан' };
const CLUB_TAG      = { neon: 'tag-neon', enot: 'tag-enot', elvis: 'tag-elvis' };

export default function Kitchen() {
  const user   = getUser();
  const socket = useRef(null);

  const [tab,    setTab]    = useState('orders');   // orders | inventory
  const [shift,  setShift]  = useState(null);
  const [orders, setOrders] = useState([]);
  const [invStart, setInvStart] = useState(null);   // start inventory record
  const [invEnd,   setInvEnd]   = useState({});     // { ingredientId: { actual, reason } }
  const [invSubmitted, setInvSubmitted] = useState(false);
  const [closeWarn, setCloseWarn] = useState(false);

  // ── Load shift & orders ──────────────────────────────
  const load = useCallback(async () => {
    const [sRes, oRes, iRes] = await Promise.all([
      api.get('/shifts/current').catch(() => ({ data: null })),
      api.get('/orders?status=new,cooking,ready').catch(() => ({ data: [] })),
      api.get('/inventory/current-start').catch(() => ({ data: null })),
    ]);
    setShift(sRes.data);
    setOrders(Array.isArray(oRes.data) ? oRes.data : []);
    if (iRes.data) {
      setInvStart(iRes.data);
      // Check if end inventory already done
      if (sRes.data) {
        const endRes = await api.get(`/inventory/shift/${sRes.data._id}`).catch(() => ({ data: [] }));
        const endRec = endRes.data?.find(r => r.type === 'end');
        if (endRec) setInvSubmitted(true);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Socket ───────────────────────────────────────────
  useEffect(() => {
    socket.current = connectSocket('kitchen', user?.id);
    socket.current.on('broadcast_order_from_server', (order) => {
      setOrders(prev => [order, ...prev.filter(o => o._id !== order._id)]);
    });
    return () => socket.current?.disconnect();
  }, [user?.id]);

  // ── Arrived button ───────────────────────────────────
  async function markArrived() {
    if (!shift) return;
    await api.patch(`/shifts/${shift._id}/cook-arrived`);
    setShift(s => ({ ...s, cook: { ...s.cook, arrived: true } }));
  }

  // ── Update order status ──────────────────────────────
  async function nextStatus(order) {
    const next = STATUS_NEXT[order.status];
    if (!next) return;
    await api.patch(`/orders/${order._id}/status`, { status: next });
    if (next === 'served') {
      setOrders(prev => prev.filter(o => o._id !== order._id));
    } else {
      setOrders(prev => prev.map(o => o._id === order._id ? { ...o, status: next } : o));
      socket.current?.emit('order_status_update', { orderId: order._id, status: next });
    }
  }

  // ── Inventory: update one item ────────────────────────
  function setActual(ingId, val) {
    setInvEnd(prev => ({ ...prev, [ingId]: { ...prev[ingId], actual: val } }));
  }
  function setReason(ingId, val) {
    setInvEnd(prev => ({ ...prev, [ingId]: { ...prev[ingId], reason: val } }));
  }

  // ── Copy from last shift ──────────────────────────────
  async function copyAllFromLast() {
    await api.post('/inventory/copy-from-last', {});
    load();
  }
  async function copyOneFromLast(ingId) {
    await api.post('/inventory/copy-from-last', { ingredientIds: [ingId] });
    load();
  }

  // ── Submit end inventory ──────────────────────────────
  async function submitInventory() {
    if (!invStart) return;
    const items = invStart.items.map(item => {
      const e = invEnd[item.ingredientId] || {};
      return {
        ingredientId:   item.ingredientId,
        name:           item.name,
        unit:           item.unit,
        actualQuantity: parseFloat(e.actual ?? item.theoreticalEnd ?? 0),
        reason:         e.reason || ''
      };
    });
    await api.post('/inventory/end', { items });
    setInvSubmitted(true);
  }

  // ── Close shift ───────────────────────────────────────
  async function doClose(force = false) {
    if (!shift) return;
    try {
      await api.post(`/shifts/${shift._id}/close`, { force });
      logout();
    } catch (err) {
      if (err.response?.data?.code === 'inventory_required') setCloseWarn(true);
    }
  }

  const activeOrders  = orders.filter(o => o.status !== 'served' && o.status !== 'cancelled');
  const newCount      = orders.filter(o => o.status === 'new').length;

  // ══════════════════════════════════════════════════════
  return (
    <div className="page">
      <ClockBar right={
        <div className="flex gap-8 center">
          {shift && !shift.cook?.arrived && (
            <button className="btn btn-green btn-sm" onClick={markArrived}>✔ Я на месте</button>
          )}
          {shift?.cook?.arrived && <span className="tag tag-ready">На кухне</span>}
          <button className="btn btn-outline btn-sm" onClick={logout}>Выйти</button>
        </div>
      } />

      {/* Tabs */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex' }}>
        <TabBtn active={tab === 'orders'} onClick={() => setTab('orders')}>
          Заказы {newCount > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, marginLeft: 6 }}>{newCount}</span>}
        </TabBtn>
        <TabBtn active={tab === 'inventory'} onClick={() => setTab('inventory')}>Инвентаризация</TabBtn>
        <TabBtn active={tab === 'close'} onClick={() => setTab('close')}>Закрыть смену</TabBtn>
      </div>

      <div className="page-body">

        {/* ── ORDERS TAB ─────────────────────────────── */}
        {tab === 'orders' && (
          <>
            {!shift && <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>Нет открытой смены</div>}
            {shift && !shift.cook?.arrived && (
              <div className="card mb-16" style={{ textAlign: 'center', padding: 32 }}>
                <h2 style={{ marginBottom: 16 }}>Смена открыта. Нажмите чтобы начать принимать заказы</h2>
                <button className="btn btn-green btn-lg" onClick={markArrived}>✔ Я на кухне, готов принимать заказы</button>
              </div>
            )}
            {activeOrders.length === 0 && shift?.cook?.arrived && (
              <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>Нет активных заказов</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
              {activeOrders.map(order => (
                <OrderCard key={order._id} order={order} onNext={() => nextStatus(order)} />
              ))}
            </div>
          </>
        )}

        {/* ── INVENTORY TAB ──────────────────────────── */}
        {tab === 'inventory' && (
          <div>
            <div className="flex between center mb-16">
              <h2>Инвентаризация {invSubmitted && <span className="tag tag-ready" style={{ marginLeft: 8 }}>Завершена ✓</span>}</h2>
              {!invSubmitted && (
                <div className="flex gap-8">
                  <button className="btn btn-outline btn-sm" onClick={copyAllFromLast}>
                    ↑ Всё как вчера
                  </button>
                </div>
              )}
            </div>

            {invStart?.items?.map(item => {
              const e         = invEnd[item.ingredientId] || {};
              const actual    = e.actual !== undefined ? e.actual : '';
              const theoretical = (item.theoreticalEnd ?? 0).toFixed(3);

              return (
                <div key={item.ingredientId} className="card mb-8" style={{ padding: '10px 14px' }}>
                  <div className="flex between center">
                    <div>
                      <span className="bold">{item.name}</span>
                      <span className="dim" style={{ marginLeft: 8 }}>ожид: {theoretical} {item.unit}</span>
                    </div>
                    <div className="flex gap-8 center">
                      {/* Copy single from last */}
                      {!invSubmitted && (
                        <button
                          className="btn btn-outline btn-sm"
                          style={{ padding: '4px 8px', fontSize: 16 }}
                          title="Как вчера (этот)"
                          onClick={() => copyOneFromLast(item.ingredientId)}
                        >↑</button>
                      )}
                      {/* Actual quantity input */}
                      <input
                        type="number"
                        inputMode="decimal"
                        style={{ width: 90, textAlign: 'center' }}
                        placeholder={theoretical}
                        value={actual}
                        disabled={invSubmitted}
                        onChange={e => setActual(item.ingredientId, e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            // Move to next input
                            const inputs = document.querySelectorAll('.inv-input');
                            const idx    = Array.from(inputs).indexOf(e.target);
                            if (inputs[idx + 1]) inputs[idx + 1].focus();
                          }
                        }}
                        className="inv-input"
                      />
                      <span className="dim">{item.unit}</span>
                    </div>
                  </div>
                  {/* Reason field if there's a difference */}
                  {actual !== '' && Math.abs(parseFloat(actual) - parseFloat(theoretical)) > 0.01 && (
                    <input
                      type="text"
                      style={{ marginTop: 6, fontSize: 13 }}
                      placeholder="Причина расхождения..."
                      value={e.reason || ''}
                      disabled={invSubmitted}
                      onChange={ev => setReason(item.ingredientId, ev.target.value)}
                    />
                  )}
                </div>
              );
            })}

            {!invSubmitted && invStart?.items?.length > 0 && (
              <div style={{ marginTop: 20, textAlign: 'center' }}>
                <button className="btn btn-green btn-lg" onClick={submitInventory}>
                  ✓ Подтвердить инвентаризацию
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── CLOSE SHIFT TAB ────────────────────────── */}
        {tab === 'close' && (
          <div className="card" style={{ maxWidth: 480, margin: '40px auto', padding: 32 }}>
            <h2 className="mb-16">Закрыть смену</h2>
            {!invSubmitted && (
              <div style={{ background: '#2d0a0a', border: '1px solid var(--red)', borderRadius: 8, padding: 14, marginBottom: 20, color: '#f56565' }}>
                ⚠ Инвентаризация не завершена. Сначала заполните инвентаризацию, или смена будет закрыта без неё.
              </div>
            )}
            {invSubmitted && (
              <div style={{ background: '#0d3320', border: '1px solid var(--green)', borderRadius: 8, padding: 14, marginBottom: 20, color: '#68d391' }}>
                ✓ Инвентаризация завершена
              </div>
            )}

            {!closeWarn ? (
              <button className="btn btn-red btn-lg" style={{ width: '100%' }} onClick={() => doClose(false)}>
                Закрыть смену
              </button>
            ) : (
              <div>
                <p style={{ color: 'var(--text-dim)', marginBottom: 16, fontSize: 13 }}>
                  Потяните вправо для подтверждения закрытия без инвентаризации:
                </p>
                <SwipeToConfirm label="→ Закрыть без инвентаризации" onConfirm={() => doClose(true)} />
                <button className="btn btn-outline btn-sm mt-16" onClick={() => setCloseWarn(false)}>Отмена</button>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '12px 24px', border: 'none', background: 'none',
        color: active ? 'var(--text)' : 'var(--text-dim)',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        fontWeight: active ? 700 : 400, cursor: 'pointer', display: 'flex', alignItems: 'center'
      }}
    >{children}</button>
  );
}

function OrderCard({ order, onNext }) {
  const clubTag = CLUB_TAG[order.club] || '';
  const next    = STATUS_NEXT[order.status];

  return (
    <div className="card" style={{
      borderLeft: `3px solid ${order.status === 'new' ? 'var(--red)' : order.status === 'cooking' ? 'var(--yellow)' : 'var(--green)'}`,
    }}>
      {/* Header */}
      <div className="flex between center mb-8">
        <div className="flex gap-8 center">
          <span className={`tag ${clubTag}`}>{order.club?.toUpperCase()}</span>
          <span className="bold">Стол {order.tableNumber}</span>
          <span className="dim">#{order.orderNumber}</span>
        </div>
        <span className="dim" style={{ fontSize: 12 }}>
          {new Date(order.createdAt).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="dim mb-8" style={{ fontSize: 13 }}>{order.waiter?.name}</div>

      {/* Items */}
      {order.items.map((item, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 14 }}>
          <span>{item.quantity > 1 && <b>{item.quantity}×</b>} {item.name}</span>
        </div>
      ))}
      {order.isWorkerOrder && (
        <div style={{ marginTop: 6, color: 'var(--yellow)', fontSize: 12 }}>★ Заказ персонала</div>
      )}

      {/* Action */}
      {next && (
        <button
          className={`btn btn-sm mt-16`}
          style={{
            width: '100%',
            background: next === 'cooking' ? 'var(--yellow)' : next === 'ready' ? 'var(--green)' : 'var(--accent)',
            color: next === 'cooking' ? '#000' : '#fff'
          }}
          onClick={onNext}
        >
          {STATUS_BTN[order.status]}
        </button>
      )}
    </div>
  );
}
