const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  ingredientId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
  name:            String,
  unit:            String,
  startQuantity:   { type: Number, default: 0 }, // entered at shift start
  theoreticalEnd:  { type: Number, default: 0 }, // startQuantity - auto-deducted
  actualQuantity:  { type: Number, default: null }, // entered by cook at shift end
  difference:      { type: Number, default: 0 },    // actual - theoretical
  reason:          String  // cook explains if difference != 0
}, { _id: false });

const inventoryRecordSchema = new mongoose.Schema({
  shiftId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Shift', required: true },
  type:     { type: String, enum: ['start', 'end'], required: true },

  items: [inventoryItemSchema],

  isCopiedFromPrevious: { type: Boolean, default: false },
  completedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt:  Date
}, { timestamps: true });

module.exports = mongoose.model('InventoryRecord', inventoryRecordSchema);
