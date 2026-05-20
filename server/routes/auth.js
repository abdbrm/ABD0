const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, isActive: true });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ message: 'Неверный логин или пароль' });

    const token = jwt.sign(
      { id: user._id, role: user.role, displayName: user.displayName },
      process.env.JWT_SECRET,
      { expiresIn: '48h' }
    );
    res.json({ token, user: { id: user._id, role: user.role, displayName: user.displayName } });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/auth/verify
router.get('/verify', auth(), (req, res) => res.json({ user: req.user }));

// PUT /api/auth/password  — change own password (or any user if superadmin)
router.put('/password', auth(), async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    const targetId = (req.user.role === 'superadmin' && userId) ? userId : req.user.id;
    const user = await User.findById(targetId);
    if (!user) return res.status(404).json({ message: 'Пользователь не найден' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Пароль изменён' });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
