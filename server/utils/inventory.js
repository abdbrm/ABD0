const Ingredient = require('../models/Ingredient');
const MenuItem   = require('../models/MenuItem');
const InventoryRecord = require('../models/InventoryRecord');

/**
 * Convert recipe quantity to ingredient's base unit.
 *   recipe unit 'г'  → ingredient unit 'кг'  : divide by 1000
 *   recipe unit 'мл' → ingredient unit 'л'   : divide by 1000
 *   recipe unit 'шт' → ingredient unit 'шт'  : direct
 */
function toBaseUnit(quantity, recipeUnit) {
  if (recipeUnit === 'г' || recipeUnit === 'мл') return quantity / 1000;
  return quantity; // шт
}

/**
 * Deduct ingredients from currentStock and update theoreticalEnd
 * in the open shift's start inventory record.
 * Called when an order is placed.
 */
async function deductIngredients(shiftId, orderItems) {
  for (const item of orderItems) {
    const menuItem = await MenuItem.findById(item.menuItemId);
    if (!menuItem) continue;

    for (const ing of menuItem.ingredients) {
      const deduct = toBaseUnit(ing.quantity, ing.unit) * item.quantity;

      // Update live stock
      await Ingredient.findByIdAndUpdate(
        ing.ingredientId,
        { $inc: { currentStock: -deduct } }
      );

      // Update theoreticalEnd in start inventory record
      await InventoryRecord.updateOne(
        { shiftId, type: 'start', 'items.ingredientId': ing.ingredientId },
        { $inc: { 'items.$.theoreticalEnd': -deduct } }
      );
    }
  }
}

/**
 * Restore ingredients (order cancelled)
 */
async function restoreIngredients(shiftId, orderItems) {
  for (const item of orderItems) {
    const menuItem = await MenuItem.findById(item.menuItemId);
    if (!menuItem) continue;

    for (const ing of menuItem.ingredients) {
      const amount = toBaseUnit(ing.quantity, ing.unit) * item.quantity;

      await Ingredient.findByIdAndUpdate(
        ing.ingredientId,
        { $inc: { currentStock: amount } }
      );

      await InventoryRecord.updateOne(
        { shiftId, type: 'start', 'items.ingredientId': ing.ingredientId },
        { $inc: { 'items.$.theoreticalEnd': amount } }
      );
    }
  }
}

module.exports = { deductIngredients, restoreIngredients, toBaseUnit };
