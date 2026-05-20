const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem' },
  name:       String,   // Russian name (snapshot at order time)
  nameEn:     String,   // English name (for printing)
  quantity:   { type: Number, default: 1 },
  price:      Number,
  note:       String    // special note from waiter
}, { _id: false });

const orderSchema = new mongoose.Schema({
  shiftId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  orderNumber: { type: Number, required: true }, // sequential within shift

  tableNumber: { type: Number, required: true },
  club:        { type: String, enum: ['neon', 'enot', 'elvis'], required: true },

  waiter: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:   String
  },

  status: {
    type: String,
    enum: ['new', 'cooking', 'ready', 'served', 'cancelled'],
    default: 'new'
  },

  items:           [orderItemSchema],
  totalAmount:     { type: Number, default: 0 },
  discount:        { type: Number, default: 0 },  // percentage
  finalAmount:     { type: Number, default: 0 },  // after discount

  isWorkerOrder:   { type: Boolean, default: false },
  paymentProofUrl: String,   // uploaded screenshot path

  printed:         { type: Boolean, default: false },
  printedAt:       Date
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
