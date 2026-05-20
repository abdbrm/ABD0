const mongoose = require('mongoose');

// Simple key-value store for all app-wide settings.
// Superadmin (abdo) controls:
//   visibility_* keys → show/hide features on Admin page
//   worker_discount  → percentage (number)
//   worker_code      → access code for worker order link
const settingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: mongoose.Schema.Types.Mixed
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
