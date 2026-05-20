const router   = require('express').Router();
const MenuItem = require('../models/MenuItem');
const auth     = require('../middleware/auth');

// GET /api/menu  — public (waiter, worker, kitchen all read it)
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.club)     filter.clubs    = req.query.club;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.active !== undefined) filter.isActive = req.query.active === 'true';

    const items = await MenuItem.find(filter)
      .populate('ingredients.ingredientId', 'name unit currentStock')
      .sort({ category: 1, order: 1 });
    res.json(items);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id)
      .populate('ingredients.ingredientId', 'name unit');
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/menu
router.post('/', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const item = await MenuItem.create(req.body);
    res.status(201).json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/menu/:id
router.put('/:id', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const item = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PATCH /api/menu/:id/toggle
router.patch('/:id/toggle', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const item = await MenuItem.findById(req.params.id);
    item.isActive = !item.isActive;
    await item.save();
    res.json(item);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/menu/:id
router.delete('/:id', auth(['superadmin']), async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ message: 'Удалено' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
