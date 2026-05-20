const router = require('express').Router();
const Shift  = require('../models/Shift');
const User   = require('../models/User');
const InventoryRecord = require('../models/InventoryRecord');
const Ingredient      = require('../models/Ingredient');
const auth   = require('../middleware/auth');

// GET /api/shifts/current
router.get('/current', auth(), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' });
    res.json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/shifts  — paginated list
router.get('/', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const shifts = await Shift.find()
      .sort({ openedAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    const total = await Shift.countDocuments();
    res.json({ shifts, total, page: +page });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/shifts/open
router.post('/open', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const existing = await Shift.findOne({ status: 'open' });
    if (existing) return res.status(400).json({ message: 'Смена уже открыта' });

    const { cookId, waiters } = req.body;
    // waiters: [{ userId, club, tables: [1,2,3] }]

    const cook = await User.findById(cookId);
    if (!cook) return res.status(404).json({ message: 'Повар не найден' });

    const waiterDetails = await Promise.all(
      (waiters || []).map(async (w) => {
        const u = await User.findById(w.userId);
        return { userId: w.userId, name: u?.displayName || '', club: w.club, tables: w.tables || [] };
      })
    );

    const shift = await Shift.create({
      cook:     { userId: cookId, name: cook.displayName },
      waiters:  waiterDetails,
      openedBy: req.user.id
    });

    // Build start inventory record from current stock
    const ingredients = await Ingredient.find({ isActive: true }).sort({ category: 1, order: 1 });
    const invItems = ingredients.map(ing => ({
      ingredientId:   ing._id,
      name:           ing.name,
      unit:           ing.unit,
      startQuantity:  ing.currentStock,
      theoreticalEnd: ing.currentStock,
      actualQuantity: null,
      difference:     0,
      reason:         ''
    }));

    await InventoryRecord.create({
      shiftId:     shift._id,
      type:        'start',
      items:       invItems,
      completedBy: req.user.id,
      completedAt: new Date()
    });

    // Notify via socket
    req.app.get('io')?.emit('shift_opened', shift);

    res.status(201).json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/shifts/:id/close
router.post('/:id/close', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift)               return res.status(404).json({ message: 'Смена не найдена' });
    if (shift.status === 'closed') return res.status(400).json({ message: 'Смена уже закрыта' });

    const { force = false } = req.body;

    // If inventory not done warn (but allow forced close from admin)
    if (!shift.inventoryCompleted && !force) {
      return res.status(400).json({
        code:    'inventory_required',
        message: 'Повар не завершил инвентаризацию'
      });
    }

    shift.status   = 'closed';
    shift.closedAt = new Date();
    shift.closedBy = req.user.id;
    await shift.save();

    req.app.get('io')?.emit('shift_closed', { shiftId: shift._id });
    res.json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/shifts/staff/cooks   — for admin dropdown
router.get('/staff/cooks', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const cooks = await User.find({ role: 'cook', isActive: true }, 'displayName username');
    res.json(cooks);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/shifts/staff/waiters
router.get('/staff/waiters', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const waiters = await User.find({ role: 'waiter', isActive: true }, 'displayName username');
    res.json(waiters);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/shifts/:id/cook-arrived  (called from cook page)
router.patch('/:id/cook-arrived', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { 'cook.arrived': true, 'cook.arrivedAt': new Date() },
      { new: true }
    );
    req.app.get('io')?.emit('cook_arrived', { shiftId: shift._id, time: new Date() });
    res.json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/shifts/:id/add-waiter  — add waiter mid-shift
router.patch('/:id/add-waiter', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const { userId, club, tables } = req.body;
    const user  = await User.findById(userId);
    const shift = await Shift.findByIdAndUpdate(
      req.params.id,
      { $push: { waiters: { userId, name: user?.displayName, club, tables: tables || [] } } },
      { new: true }
    );
    res.json(shift);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
