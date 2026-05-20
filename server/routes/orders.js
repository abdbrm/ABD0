const router  = require('express').Router();
const multer  = require('multer');
const path    = require('path');
const Order   = require('../models/Order');
const Shift   = require('../models/Shift');
const Settings = require('../models/Settings');
const auth    = require('../middleware/auth');
const { deductIngredients, restoreIngredients } = require('../utils/inventory');

// Multer for payment proof uploads
const storage = multer.diskStorage({
  destination: './uploads/proofs',
  filename: (req, file, cb) => cb(null, `proof_${Date.now()}${path.extname(file.originalname)}`)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

/* ── Helpers ────────────────────────────────────────────── */
async function getOpenShift() {
  return Shift.findOne({ status: 'open' });
}

async function calcTotals(order) {
  const total   = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const disc    = order.discount || 0;
  const final_  = +(total * (1 - disc / 100)).toFixed(2);
  return { totalAmount: total, finalAmount: final_ };
}

/* ── GET /api/orders ───────────────────────────────────── */
router.get('/', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const filter = {};
    if (req.query.shiftId) filter.shiftId = req.query.shiftId;
    if (req.query.status)  filter.status  = req.query.status;
    if (req.query.club)    filter.club    = req.query.club;
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── GET /api/orders/my — waiter sees own current-shift orders */
router.get('/my', auth(['waiter']), async (req, res) => {
  try {
    const shift = await getOpenShift();
    if (!shift) return res.json([]);
    const orders = await Order.find({ shiftId: shift._id, 'waiter.userId': req.user.id })
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── POST /api/orders — waiter creates order ──────────── */
router.post('/', auth(['superadmin', 'admin', 'cook', 'waiter']), async (req, res) => {
  try {
    const shift = await getOpenShift();
    if (!shift) return res.status(400).json({ message: 'Нет открытой смены' });
    if (!shift.cook.arrived) return res.status(400).json({ message: 'Повар ещё не отметился' });

    const count = await Order.countDocuments({ shiftId: shift._id });
    const { totalAmount, finalAmount } = await calcTotals(req.body);

    const order = await Order.create({
      ...req.body,
      shiftId:     shift._id,
      orderNumber: count + 1,
      totalAmount,
      finalAmount
    });

    // Auto-deduct ingredients
    await deductIngredients(shift._id, order.items);

    // Update shift totals
    const club = order.club;
    await Shift.findByIdAndUpdate(shift._id, {
      $inc: {
        [`totals.${club}`]: finalAmount,
        'totals.all':        finalAmount
      }
    });

    // Broadcast via socket
    const io = req.app.get('io');
    io?.emit('broadcast_order_from_server', order);

    res.status(201).json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── PATCH /api/orders/:id/status — kitchen updates ────── */
router.patch('/:id/status', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const prev  = await Order.findById(req.params.id);
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    // If cancelled, restore ingredients
    if (req.body.status === 'cancelled' && prev?.status !== 'cancelled') {
      const shift = await Shift.findById(order.shiftId);
      if (shift?.status === 'open') {
        await restoreIngredients(order.shiftId, order.items);
        await Shift.findByIdAndUpdate(shift._id, {
          $inc: {
            [`totals.${order.club}`]: -order.finalAmount,
            'totals.all':             -order.finalAmount
          }
        });
      }
    }

    const io = req.app.get('io');
    io?.emit('order_status_update', { orderId: order._id, status: order.status });

    res.json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── POST /api/orders/worker — worker link order with proof */
router.post('/worker', upload.single('proof'), async (req, res) => {
  try {
    const shift = await getOpenShift();
    if (!shift) return res.status(400).json({ message: 'Нет открытой смены' });

    const discSetting = await Settings.findOne({ key: 'worker_discount' });
    const discount = discSetting?.value || 0;

    const orderData = JSON.parse(req.body.orderData);
    const count     = await Order.countDocuments({ shiftId: shift._id });
    const { totalAmount, finalAmount } = await calcTotals({ ...orderData, discount });

    const order = await Order.create({
      ...orderData,
      shiftId:         shift._id,
      orderNumber:     count + 1,
      discount,
      totalAmount,
      finalAmount,
      isWorkerOrder:   true,
      paymentProofUrl: req.file ? `/uploads/proofs/${req.file.filename}` : null
    });

    await deductIngredients(shift._id, order.items);

    const io = req.app.get('io');
    io?.emit('broadcast_order_from_server', order);

    res.status(201).json(order);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
