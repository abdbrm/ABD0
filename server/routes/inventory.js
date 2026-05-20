const router    = require('express').Router();
const Ingredient     = require('../models/Ingredient');
const InventoryRecord = require('../models/InventoryRecord');
const Shift     = require('../models/Shift');
const auth      = require('../middleware/auth');

/* ── GET /api/inventory/ingredients ─────────────────────── */
router.get('/ingredients', auth(), async (req, res) => {
  try {
    const ingredients = await Ingredient.find({ isActive: true }).sort({ category: 1, order: 1 });
    res.json(ingredients);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── POST /api/inventory/ingredients — add new ingredient ── */
router.post('/ingredients', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const ing = await Ingredient.create(req.body);
    // If there is an open shift, append to its start inventory record
    const shift = await Shift.findOne({ status: 'open' });
    if (shift) {
      await InventoryRecord.updateOne(
        { shiftId: shift._id, type: 'start' },
        { $push: { items: {
          ingredientId:   ing._id,
          name:           ing.name,
          unit:           ing.unit,
          startQuantity:  ing.currentStock,
          theoreticalEnd: ing.currentStock,
          actualQuantity: null,
          difference:     0
        }}}
      );
    }
    res.status(201).json(ing);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── PUT /api/inventory/ingredients/:id ─────────────────── */
router.put('/ingredients/:id', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const ing = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(ing);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── GET /api/inventory/last — last end-of-shift record ──── */
router.get('/last', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const record = await InventoryRecord.findOne({ type: 'end' }).sort({ createdAt: -1 });
    res.json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── GET /api/inventory/shift/:shiftId ──────────────────── */
router.get('/shift/:shiftId', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const records = await InventoryRecord.find({ shiftId: req.params.shiftId });
    res.json(records);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── GET /api/inventory/current-start ─────────────────────
   Cook page: get start inventory for open shift (to show/edit) */
router.get('/current-start', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' });
    if (!shift) return res.json(null);
    const record = await InventoryRecord.findOne({ shiftId: shift._id, type: 'start' });
    res.json(record);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── PUT /api/inventory/start-item — cook updates one item ─ */
router.put('/start-item', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const { ingredientId, startQuantity } = req.body;
    const shift = await Shift.findOne({ status: 'open' });
    if (!shift) return res.status(400).json({ message: 'Нет смены' });

    await InventoryRecord.updateOne(
      { shiftId: shift._id, type: 'start', 'items.ingredientId': ingredientId },
      { $set: {
        'items.$.startQuantity':  startQuantity,
        'items.$.theoreticalEnd': startQuantity   // reset; deductions will re-apply
      }}
    );
    await Ingredient.findByIdAndUpdate(ingredientId, { currentStock: startQuantity });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── POST /api/inventory/copy-from-last — "как вчера" button */
router.post('/copy-from-last', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' });
    if (!shift) return res.status(400).json({ message: 'Нет смены' });

    // optionally copy only specific ids
    const { ingredientIds } = req.body; // if undefined → copy all

    const lastEnd = await InventoryRecord.findOne({ type: 'end' }).sort({ createdAt: -1 });
    if (!lastEnd) return res.status(404).json({ message: 'Нет предыдущей инвентаризации' });

    const current = await InventoryRecord.findOne({ shiftId: shift._id, type: 'start' });
    if (!current) return res.status(404).json({ message: 'Нет стартовой записи' });

    for (const lastItem of lastEnd.items) {
      const id = lastItem.ingredientId?.toString();
      if (ingredientIds && !ingredientIds.includes(id)) continue;

      await InventoryRecord.updateOne(
        { shiftId: shift._id, type: 'start', 'items.ingredientId': lastItem.ingredientId },
        { $set: {
          'items.$.startQuantity':  lastItem.actualQuantity ?? 0,
          'items.$.theoreticalEnd': lastItem.actualQuantity ?? 0
        }}
      );
      await Ingredient.findByIdAndUpdate(lastItem.ingredientId, {
        currentStock: lastItem.actualQuantity ?? 0
      });
    }

    const updated = await InventoryRecord.findOne({ shiftId: shift._id, type: 'start' });
    res.json({ ok: true, record: updated });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── POST /api/inventory/end — cook submits end inventory ── */
router.post('/end', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const shift = await Shift.findOne({ status: 'open' });
    if (!shift) return res.status(400).json({ message: 'Нет открытой смены' });

    const startRecord = await InventoryRecord.findOne({ shiftId: shift._id, type: 'start' });

    const endItems = (req.body.items || []).map(item => {
      const startItem = startRecord?.items.find(
        i => i.ingredientId?.toString() === item.ingredientId
      );
      const theoretical = startItem?.theoreticalEnd ?? 0;
      const actual      = item.actualQuantity ?? 0;
      const diff        = +(actual - theoretical).toFixed(4);

      return {
        ingredientId:   item.ingredientId,
        name:           item.name,
        unit:           item.unit,
        startQuantity:  startItem?.startQuantity ?? 0,
        theoreticalEnd: +theoretical.toFixed(4),
        actualQuantity: actual,
        difference:     diff,
        reason:         diff !== 0 ? (item.reason || '') : ''
      };
    });

    // Upsert end record
    let endRecord = await InventoryRecord.findOne({ shiftId: shift._id, type: 'end' });
    if (endRecord) {
      endRecord.items       = endItems;
      endRecord.completedBy = req.user.id;
      endRecord.completedAt = new Date();
      await endRecord.save();
    } else {
      endRecord = await InventoryRecord.create({
        shiftId:      shift._id,
        type:         'end',
        items:        endItems,
        completedBy:  req.user.id,
        completedAt:  new Date()
      });
    }

    // Mark shift inventory done
    await Shift.findByIdAndUpdate(shift._id, {
      inventoryCompleted:   true,
      inventoryCompletedAt: new Date()
    });

    res.json(endRecord);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
