const router   = require('express').Router();
const Settings = require('../models/Settings');
const auth     = require('../middleware/auth');

// Default visibility features (all visible by default)
const VISIBILITY_KEYS = [
  'menu_management',     // admin can edit menu
  'inventory_view',      // admin can see inventory
  'inventory_edit',      // admin can edit ingredient levels
  'reports',             // admin can view/export reports
  'user_management',     // admin can manage staff
  'worker_orders',       // worker order link section
  'shift_management',    // open/close shift
  'order_history',       // view past orders
  'ingredient_add',      // add new ingredients (cook toggle)
];

// GET /api/settings  — all settings as { key: value } map
router.get('/', auth(), async (req, res) => {
  try {
    const all = await Settings.find();
    const map = {};
    all.forEach(s => { map[s.key] = s.value; });
    // Fill defaults for visibility keys
    for (const k of VISIBILITY_KEYS) {
      if (map[`visibility_${k}`] === undefined) map[`visibility_${k}`] = true;
    }
    res.json(map);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// GET /api/settings/visibility — for admin page rendering
router.get('/visibility', async (req, res) => {
  try {
    const all = await Settings.find({ key: /^visibility_/ });
    const map = {};
    for (const k of VISIBILITY_KEYS) map[k] = true; // defaults
    all.forEach(s => { map[s.key.replace('visibility_', '')] = s.value; });
    res.json(map);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/settings/:key  — superadmin only
router.put('/:key', auth(['superadmin']), async (req, res) => {
  try {
    const setting = await Settings.findOneAndUpdate(
      { key: req.params.key },
      { value: req.body.value },
      { new: true, upsert: true }
    );
    res.json(setting);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// PUT /api/settings/visibility/batch  — update many at once
router.put('/visibility/batch', auth(['superadmin']), async (req, res) => {
  try {
    const updates = req.body; // { feature_key: boolean }
    await Promise.all(
      Object.entries(updates).map(([k, v]) =>
        Settings.findOneAndUpdate(
          { key: `visibility_${k}` },
          { value: v },
          { upsert: true }
        )
      )
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
