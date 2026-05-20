const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name:         { type: String, required: true, unique: true },
  unit:         { type: String, enum: ['кг', 'л', 'шт'], default: 'кг' },

  // Live stock — updated automatically as orders come in
  currentStock: { type: Number, default: 0 },

  // Set by superadmin/admin — for colour coding in reports
  minLevel:     { type: Number, default: 0 },   // below this → RED
  maxLevel:     { type: Number, default: 100 },  // above this → GREEN

  category: {
    type: String,
    enum: [
      'сыры',
      'мясо_колбасы',
      'фрукты',
      'хлеб_выпечка',
      'замороженное',
      'молочное',
      'овощи',
      'маринованное',
      'соусы',
      'прочее'
    ],
    default: 'прочее'
  },

  order:    { type: Number, default: 0 },   // display sort order
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Virtual: stock status for colour coding
ingredientSchema.virtual('stockStatus').get(function () {
  if (this.currentStock <= this.minLevel)  return 'red';    // low
  if (this.currentStock >= this.maxLevel)  return 'green';  // plenty
  return 'yellow'; // ok
});

ingredientSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
