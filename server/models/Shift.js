const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  status: { type: String, enum: ['open', 'closed'], default: 'open' },

  cook: {
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:      String,
    arrived:   { type: Boolean, default: false },
    arrivedAt: Date
  },

  waiters: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:   String,
    club:   { type: String, enum: ['neon', 'enot', 'elvis'] },
    tables: [Number]   // table numbers assigned to this waiter
  }],

  openedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  openedAt:  { type: Date, default: Date.now },
  closedAt:  Date,

  inventoryCompleted:   { type: Boolean, default: false },
  inventoryCompletedAt: Date,

  // Running totals (updated as orders come in, for fast dashboard reads)
  totals: {
    neon:  { type: Number, default: 0 },
    enot:  { type: Number, default: 0 },
    elvis: { type: Number, default: 0 },
    all:   { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Shift', shiftSchema);
