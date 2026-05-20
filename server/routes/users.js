const router = require('express').Router();
const User   = require('../models/User');
const auth   = require('../middleware/auth');

// GET /api/users
router.get('/', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.role) filter.role = req.query.role;
    const users = await User.find(filter).sort({ role: 1, displayName: 1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/users/all (including inactive, superadmin only)
router.get('/all', auth(['superadmin']), async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, displayName: 1 });
    res.json(users);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// POST /api/users
router.post('/', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    // Admin can only create waiter/cook
    if (req.user.role === 'admin' && !['waiter', 'cook'].includes(req.body.role))
      return res.status(403).json({ message: 'Нет прав' });

    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ message: 'Логин уже занят' });
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/users/:id
router.put('/:id', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const { password, ...data } = req.body; // don't allow updating password here
    const user = await User.findByIdAndUpdate(req.params.id, data, { new: true });
    res.json(user);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// DELETE /api/users/:id — soft delete (deactivate)
router.delete('/:id', auth(['superadmin']), async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Деактивирован' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
