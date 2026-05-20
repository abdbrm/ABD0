const mongoose = require('mongoose');

const ingredientUsageSchema = new mongoose.Schema({
  ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  // quantity in "recipe units" (г for кг-ingredients, мл for л-ingredients, шт for шт-ingredients)
  quantity:     { type: Number, required: true },
  unit:         { type: String, enum: ['г', 'мл', 'шт'], default: 'г' }
}, { _id: false });

const menuItemSchema = new mongoose.Schema({
  name:   { type: String, required: true },   // Russian (display, kitchen)
  nameEn: { type: String, required: true },   // English (print tickets)

  category: {
    type: String,
    enum: [
      'холодные_закуски',
      'пицца',
      'салаты',
      'паста',
      'горячие_блюда',
      'закуски_к_пиву',
      'десерты'
    ],
    required: true
  },

  price:       { type: Number, required: true },
  weight:      String,   // e.g. "300гр" or "6шт"
  description: String,   // ingredient list text

  // Which clubs serve this item (default: all 3)
  clubs:    { type: [String], default: ['neon', 'enot', 'elvis'] },
  isActive: { type: Boolean, default: true },
  order:    { type: Number, default: 0 },

  // Ingredients used — drives automatic inventory deduction
  ingredients: [ingredientUsageSchema]
}, { timestamps: true });

module.exports = mongoose.model('MenuItem', menuItemSchema);
