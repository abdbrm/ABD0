import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import ClockBar from '../components/ClockBar';

const CATEGORY_LABELS = {
  холодные_закуски:'Холодные закуски', пицца:'Пицца', салаты:'Салаты',
  паста:'Паста', горячие_блюда:'Горячие блюда', закуски_к_пиву:'Закуски к пиву', десерты:'Десерты',
};

export default function Worker() {
  const [params]      = useSearchParams();
  const code          = params.get('code') || '';

  const [allowed,   setAllowed]   = useState(false);
  const [checking,  setChecking]  = useState(true);
  const [discount,  setDiscount]  = useState(0);
  const [menu,      setMenu]      = useState([]);
  const [cart,      setCart]      = useState({});
  const [proof,     setProof]     = useState(null);
  const [name,      setName]      = useState('');
  const [tab,       setTab]       = useState('menu');
  const [sent,      setSent]      = useState(false);
  const [sending,   setSending]   = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => {
      const validCode = r.data.worker_code || 'STAFF';
      const disc      = r.data.worker_discount || 0;
      if (code === validCode) {
        setAllowed(true);
        setDiscount(disc);
        api.get('/menu?active=true').then(mr => setMenu(Array.isArray(mr.data) ? mr.data : []));
      }
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [code]);

  function addItem(item) { setCart(c => ({ ...c, [item._id]: { item, qty: (c[item._id]?.qty||0)+1 } })); }
  function removeItem(id) {
    setCart(c => { const n={...c}; if(n[id]?.qty>1) n[id]={...n[id],qty:n[id].qty-1}; else delete n[id]; return n; });
  }

  const cartItems = Object.values(cart);
  const subtotal  = cartItems.reduce((s,e) => s + e.item.price * e.qty, 0);
  const total     = +(subtotal * (1 - discount / 100)).toFixed(0);

  async function sendOrder() {
    if (!cartItems.length || !proof || !name) return;
    setSending(true);
    try {
      const formData = new FormData();
      const items = cartItems.map(e => ({
        menuItemId: e.item._id,
        name:       e.item.name,
        nameEn:     e.item.nameEn,
        quantity:   e.qty,
        price:      e.item.price,
      }));
      formData.append('orderData', JSON.stringify({
        tableNumber: 0,
        club:        'neon',
        waiter:      { name: `Персонал: ${name}` },
        items,
        discount,
      }));
      formData.append('proof', proof);
      await api.post('/orders/worker', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSent(true);
    } catch(err) { alert(err.response?.data?.message || 'Ошибка'); }
    finally { setSending(false); }
  }

  if (checking) return <div style={{ padding: 40, textAlign: 'center' }}>...</div>;

  if (!allowed) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <h2>Нет доступа</h2>
        <p className="dim mt-8">Неверный код доступа</p>
      </div>
    </div>
  );

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>✓</div>
        <h2 style={{ marginTop: 16 }}>Заказ отправлен!</h2>
        <p className="dim mt-8">Итого к оплате: {total} ₽</p>
        <button className="btn mt-16" onClick={() => { setCart({}); setProof(null); setSent(false); setTab('menu'); }}>
          Новый заказ
        </button>
      </div>
    </div>
  );

  const grouped = {};
  menu.filter(m=>m.isActive).forEach(m => { (grouped[m.category]=grouped[m.category]||[]).push(m); });

  return (
    <div className="page">
      <ClockBar right={<span className="tag" style={{ background: '#2d2000', color: 'var(--yellow)' }}>Скидка {discount}%</span>} />

      <div style={{ background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex' }}>
        <button onClick={()=>setTab('menu')} style={{ padding:'12px 20px', border:'none', background:'none', color: tab==='menu' ? 'var(--text)':'var(--text-dim)', borderBottom: tab==='menu' ? '2px solid var(--accent)':'2px solid transparent', cursor:'pointer', fontWeight: tab==='menu'?700:400 }}>Меню</button>
        {cartItems.length > 0 && (
          <button onClick={()=>setTab('checkout')} style={{ padding:'12px 20px', border:'none', background:'none', color: tab==='checkout'?'var(--text)':'var(--text-dim)', borderBottom: tab==='checkout'?'2px solid var(--green)':'2px solid transparent', cursor:'pointer', fontWeight:700, color:'var(--green)' }}>
            Оформить ({cartItems.reduce((s,e)=>s+e.qty,0)}) — {total} ₽
          </button>
        )}
      </div>

      <div className="page-body">
        {tab === 'menu' && (
          <>
            <div className="card mb-16" style={{ background:'#2d2000', border:'1px solid #f59e0b' }}>
              <span style={{ color:'var(--yellow)' }}>★ Скидка персонала {discount}% применяется автоматически</span>
            </div>
            {Object.entries(grouped).map(([cat, items]) => (
              <div key={cat} className="mb-16">
                <h3 style={{ color:'var(--text-dim)', marginBottom:8, fontSize:12, textTransform:'uppercase', letterSpacing:1 }}>
                  {CATEGORY_LABELS[cat]||cat}
                </h3>
                {items.map(item => {
                  const inCart = cart[item._id]?.qty || 0;
                  const discPrice = Math.round(item.price * (1 - discount/100));
                  return (
                    <div key={item._id} className="card mb-8" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px' }}>
                      <div style={{ flex:1 }}>
                        <div className="bold">{item.name}</div>
                        {item.weight && <span className="dim" style={{ fontSize:12 }}>{item.weight}</span>}
                      </div>
                      <div className="flex gap-8 center" style={{ marginLeft:16 }}>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontWeight:700, color:'var(--green)' }}>{discPrice} ₽</div>
                          <div className="dim" style={{ fontSize:11, textDecoration:'line-through' }}>{item.price} ₽</div>
                        </div>
                        {inCart > 0 ? (
                          <div className="flex gap-8 center">
                            <button className="btn btn-outline btn-sm" style={{ width:30, padding:0 }} onClick={()=>removeItem(item._id)}>−</button>
                            <span className="bold">{inCart}</span>
                            <button className="btn btn-sm" style={{ width:30, padding:0 }} onClick={()=>addItem(item)}>+</button>
                          </div>
                        ) : (
                          <button className="btn btn-sm" onClick={()=>addItem(item)}>+</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {tab === 'checkout' && (
          <div style={{ maxWidth:480 }}>
            <h2 className="mb-16">Оформление заказа</h2>
            {cartItems.map(e => (
              <div key={e.item._id} className="card mb-8" style={{ display:'flex', justifyContent:'space-between', padding:'10px 14px' }}>
                <span>{e.item.name}</span>
                <span className="bold">{e.qty} × {Math.round(e.item.price*(1-discount/100))} ₽</span>
              </div>
            ))}
            <div className="card mb-16" style={{ textAlign:'right' }}>
              <div className="dim">До скидки: {subtotal} ₽</div>
              <div style={{ fontSize:20, fontWeight:700 }}>К оплате: {total} ₽</div>
            </div>

            <div className="card mb-16">
              <label className="dim mb-8" style={{ display:'block' }}>Ваше имя</label>
              <input placeholder="Имя" value={name} onChange={e=>setName(e.target.value)} />
            </div>

            <div className="card mb-16">
              <label className="dim mb-8" style={{ display:'block' }}>Скриншот перевода / подтверждение оплаты</label>
              <input
                type="file" accept="image/*"
                style={{ padding:8 }}
                onChange={e => setProof(e.target.files[0])}
              />
              {proof && <div className="dim mt-8" style={{ fontSize:12 }}>✓ {proof.name}</div>}
            </div>

            <button
              className="btn btn-green btn-lg"
              style={{ width:'100%' }}
              disabled={sending || !proof || !name}
              onClick={sendOrder}
            >
              {sending ? 'Отправка...' : '▶ Отправить заказ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
