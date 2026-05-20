/**
 * NEON SYSTEM — Full Seed
 * Run: node seed/index.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose  = require('mongoose');
const User      = require('../models/User');
const Ingredient = require('../models/Ingredient');
const MenuItem  = require('../models/MenuItem');
const Settings  = require('../models/Settings');

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected');

  // ── Clear ────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    Ingredient.deleteMany({}),
    MenuItem.deleteMany({}),
    Settings.deleteMany({})
  ]);
  console.log('🗑  Cleared');

  // ── Users ────────────────────────────────────────────────
  await User.create([
    { username: 'abdo',  password: 'Abdo2024!', displayName: 'Abdo',           role: 'superadmin' },
    { username: 'admin', password: 'Admin123',  displayName: 'Администратор',  role: 'admin'      },
    { username: 'cook1', password: 'Cook111',   displayName: 'Повар',          role: 'cook'       },
  ]);
  console.log('👤 Users created');

  // ── Default Settings ─────────────────────────────────────
  await Settings.create([
    { key: 'worker_discount', value: 30   },   // 30%
    { key: 'worker_code',     value: 'STAFF' },
    // All visibility on by default — superadmin can toggle
    { key: 'visibility_menu_management',    value: true },
    { key: 'visibility_inventory_view',     value: true },
    { key: 'visibility_inventory_edit',     value: true },
    { key: 'visibility_reports',            value: true },
    { key: 'visibility_user_management',    value: true },
    { key: 'visibility_worker_orders',      value: true },
    { key: 'visibility_shift_management',   value: true },
    { key: 'visibility_order_history',      value: true },
    { key: 'visibility_ingredient_add',     value: true },
  ]);
  console.log('⚙️  Settings created');

  // ════════════════════════════════════════════════════════
  // INGREDIENTS  (ordered: сыры → мясо → фрукты → хлеб → заморож → молоч → овощи → маринов → соусы → прочее)
  // ════════════════════════════════════════════════════════
  const ingData = [
    // ── СЫРЫ ─────────────────────────────────────── order 1xx
    { name: 'Сыр для пиццы',      unit: 'кг', currentStock: 4.5,   minLevel: 1,   maxLevel: 10,  category: 'сыры',        order: 101 },
    { name: 'Сыр косичка',        unit: 'кг', currentStock: 6.5,   minLevel: 1,   maxLevel: 10,  category: 'сыры',        order: 102 },
    { name: 'Пармезан',           unit: 'кг', currentStock: 1.5,   minLevel: 0.5, maxLevel: 5,   category: 'сыры',        order: 103 },
    { name: 'Гауда',              unit: 'кг', currentStock: 3.0,   minLevel: 0.5, maxLevel: 5,   category: 'сыры',        order: 104 },
    { name: 'Российский сыр',     unit: 'кг', currentStock: 3.0,   minLevel: 0.5, maxLevel: 5,   category: 'сыры',        order: 105 },
    { name: 'Голландский сыр',    unit: 'кг', currentStock: 3.0,   minLevel: 0.5, maxLevel: 5,   category: 'сыры',        order: 106 },
    { name: 'Сыр для сэндвичей', unit: 'кг', currentStock: 0.5,   minLevel: 0.3, maxLevel: 3,   category: 'сыры',        order: 107 },

    // ── МЯСО И КОЛБАСЫ ───────────────────────────── order 2xx
    { name: 'Бекон',                    unit: 'кг', currentStock: 9.0,   minLevel: 1,   maxLevel: 15,  category: 'мясо_колбасы', order: 201 },
    { name: 'Ветчина',                  unit: 'кг', currentStock: 3.0,   minLevel: 1,   maxLevel: 10,  category: 'мясо_колбасы', order: 202 },
    { name: 'Полукопченая колбаса',     unit: 'кг', currentStock: 3.0,   minLevel: 1,   maxLevel: 8,   category: 'мясо_колбасы', order: 203 },
    { name: 'Сырокопченая колбаса',     unit: 'кг', currentStock: 2.0,   minLevel: 0.5, maxLevel: 5,   category: 'мясо_колбасы', order: 204 },
    { name: 'Пастрома',                 unit: 'кг', currentStock: 2.0,   minLevel: 0.5, maxLevel: 5,   category: 'мясо_колбасы', order: 205 },
    { name: 'Буженина',                 unit: 'кг', currentStock: 0.0,   minLevel: 0.5, maxLevel: 5,   category: 'мясо_колбасы', order: 206 },
    { name: 'Рёбра свиные копчёные',   unit: 'кг', currentStock: 5.0,   minLevel: 0.5, maxLevel: 8,   category: 'мясо_колбасы', order: 207 },
    { name: 'Уши свиные',              unit: 'кг', currentStock: 5.0,   minLevel: 0.5, maxLevel: 8,   category: 'мясо_колбасы', order: 208 },
    { name: 'Сосиски',                 unit: 'кг', currentStock: 0.5,   minLevel: 0.3, maxLevel: 3,   category: 'мясо_колбасы', order: 209 },
    { name: 'Чипсы мясные',            unit: 'кг', currentStock: 2.5,   minLevel: 0.5, maxLevel: 5,   category: 'мясо_колбасы', order: 210 },
    { name: 'Куриное филе',            unit: 'кг', currentStock: 2.0,   minLevel: 1,   maxLevel: 10,  category: 'мясо_колбасы', order: 211 },
    { name: 'Рёбрышки свиные',        unit: 'кг', currentStock: 0.5,   minLevel: 0.5, maxLevel: 5,   category: 'мясо_колбасы', order: 212 },
    { name: 'Фарш',                    unit: 'кг', currentStock: 3.0,   minLevel: 1,   maxLevel: 8,   category: 'мясо_колбасы', order: 213 },

    // ── ФРУКТЫ ───────────────────────────────────── order 3xx
    { name: 'Яблоко',   unit: 'кг', currentStock: 2.0,   minLevel: 0.5, maxLevel: 5, category: 'фрукты', order: 301 },
    { name: 'Груша',    unit: 'кг', currentStock: 1.0,   minLevel: 0.5, maxLevel: 5, category: 'фрукты', order: 302 },
    { name: 'Киви',     unit: 'кг', currentStock: 5.0,   minLevel: 0.5, maxLevel: 5, category: 'фрукты', order: 303 },
    { name: 'Виноград', unit: 'кг', currentStock: 0.166, minLevel: 0.5, maxLevel: 3, category: 'фрукты', order: 304 },

    // ── ХЛЕБ И ВЫПЕЧКА ───────────────────────────── order 4xx
    { name: 'Хлеб чёрный',  unit: 'кг',  currentStock: 2.5, minLevel: 0.5, maxLevel: 5,  category: 'хлеб_выпечка', order: 401 },
    { name: 'Тостовый хлеб',unit: 'кг',  currentStock: 1.1, minLevel: 0.3, maxLevel: 3,  category: 'хлеб_выпечка', order: 402 },
    { name: 'Батон',         unit: 'шт',  currentStock: 8,   minLevel: 2,   maxLevel: 15, category: 'хлеб_выпечка', order: 403 },
    { name: 'Штрудель',      unit: 'шт',  currentStock: 1,   minLevel: 2,   maxLevel: 10, category: 'хлеб_выпечка', order: 404 },
    { name: 'Мука',          unit: 'кг',  currentStock: 8.0, minLevel: 3,   maxLevel: 20, category: 'хлеб_выпечка', order: 405 },

    // ── ЗАМОРОЖЕННОЕ ─────────────────────────────── order 5xx
    { name: 'Картофель фри',       unit: 'кг', currentStock: 7.944,  minLevel: 2, maxLevel: 15, category: 'замороженное', order: 501 },
    { name: 'Картофельные дольки', unit: 'кг', currentStock: 12.308, minLevel: 3, maxLevel: 20, category: 'замороженное', order: 502 },
    { name: 'Наггетсы',            unit: 'кг', currentStock: 3.790,  minLevel: 1, maxLevel: 10, category: 'замороженное', order: 503 },
    { name: 'Куриные стрипсы',     unit: 'кг', currentStock: 3.562,  minLevel: 1, maxLevel: 10, category: 'замороженное', order: 504 },
    { name: 'Пельмени',            unit: 'кг', currentStock: 1.5,    minLevel: 0.5, maxLevel: 5, category: 'замороженное', order: 505 },
    { name: 'Картофельные палочки',unit: 'кг', currentStock: 0.5,    minLevel: 0.5, maxLevel: 5, category: 'замороженное', order: 506 },
    { name: 'Картофель бэби',      unit: 'кг', currentStock: 1.8,    minLevel: 0.5, maxLevel: 5, category: 'замороженное', order: 507 },
    { name: 'Мороженое',           unit: 'кг', currentStock: 1.0,    minLevel: 0.5, maxLevel: 5, category: 'замороженное', order: 508 },

    // ── МОЛОЧНОЕ ─────────────────────────────────── order 6xx
    { name: 'Сливки 23%',   unit: 'л',  currentStock: 4.5, minLevel: 1,  maxLevel: 10, category: 'молочное', order: 601 },
    { name: 'Яйцо куриное', unit: 'шт', currentStock: 19,  minLevel: 10, maxLevel: 50, category: 'молочное', order: 602 },

    // ── ОВОЩИ ────────────────────────────────────── order 7xx
    { name: 'Помидоры черри',            unit: 'кг', currentStock: 2.5, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 701 },
    { name: 'Шампиньоны',               unit: 'кг', currentStock: 2.0, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 702 },
    { name: 'Болгарский перец',          unit: 'кг', currentStock: 3.0, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 703 },
    { name: 'Помидоры',                 unit: 'кг', currentStock: 2.0, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 704 },
    { name: 'Огурец',                   unit: 'кг', currentStock: 2.0, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 705 },
    { name: 'Редис',                    unit: 'кг', currentStock: 1.5, minLevel: 0.3, maxLevel: 3, category: 'овощи', order: 706 },
    { name: 'Баклажан',                 unit: 'кг', currentStock: 2.0, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 707 },
    { name: 'Салат айсберг',            unit: 'кг', currentStock: 3.1, minLevel: 0.5, maxLevel: 5, category: 'овощи', order: 708 },
    { name: 'Зелень',                   unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3, category: 'овощи', order: 709 },

    // ── МАРИНОВАННОЕ ─────────────────────────────── order 8xx
    { name: 'Маринованные огурцы',   unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 801 },
    { name: 'Помидоры маринованные', unit: 'кг', currentStock: 1.5, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 802 },
    { name: 'Черемша',               unit: 'кг', currentStock: 1.0, minLevel: 0.2, maxLevel: 2, category: 'маринованное', order: 803 },
    { name: 'Капуста маринованная',  unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 804 },
    { name: 'Морковь маринованная',  unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 805 },
    { name: 'Оливки',               unit: 'кг', currentStock: 2.0, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 806 },
    { name: 'Маслины',              unit: 'кг', currentStock: 2.5, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 807 },
    { name: 'Тунец',                unit: 'кг', currentStock: 0.5, minLevel: 0.2, maxLevel: 2, category: 'маринованное', order: 808 },
    { name: 'Кукуруза',             unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3, category: 'маринованное', order: 809 },

    // ── СОУСЫ ────────────────────────────────────── order 9xx
    { name: 'Чесночный соус',    unit: 'кг', currentStock: 8.0, minLevel: 1,   maxLevel: 15, category: 'соусы', order: 901 },
    { name: 'Соус терияки',      unit: 'кг', currentStock: 4.0, minLevel: 0.5, maxLevel: 8,  category: 'соусы', order: 902 },
    { name: 'Соус сырный',       unit: 'кг', currentStock: 6.0, minLevel: 1,   maxLevel: 10, category: 'соусы', order: 903 },
    { name: 'Кисло-сладкий соус',unit: 'кг', currentStock: 3.0, minLevel: 0.5, maxLevel: 5,  category: 'соусы', order: 904 },
    { name: 'Соус барбекю',      unit: 'кг', currentStock: 1.0, minLevel: 0.5, maxLevel: 5,  category: 'соусы', order: 905 },
    { name: 'Сладкий чили',      unit: 'кг', currentStock: 5.0, minLevel: 0.5, maxLevel: 8,  category: 'соусы', order: 906 },
    { name: 'Хрен',              unit: 'кг', currentStock: 1.0, minLevel: 0.3, maxLevel: 3,  category: 'соусы', order: 907 },
    { name: 'Горчица',           unit: 'кг', currentStock: 7.0, minLevel: 0.5, maxLevel: 10, category: 'соусы', order: 908 },
    { name: 'Майонез',           unit: 'кг', currentStock: 2.0, minLevel: 0.5, maxLevel: 8,  category: 'соусы', order: 909 },
    { name: 'Кетчуп',            unit: 'кг', currentStock: 1.0, minLevel: 0.5, maxLevel: 5,  category: 'соусы', order: 910 },

    // ── ПРОЧЕЕ ───────────────────────────────────── order 10xx
    { name: 'Масло для фритюра', unit: 'л',  currentStock: 1.0, minLevel: 1, maxLevel: 10, category: 'прочее', order: 1001 },
    { name: 'Спагетти',          unit: 'кг', currentStock: 3.0, minLevel: 0.5, maxLevel: 5, category: 'прочее', order: 1002 },
  ];

  const ingDocs = await Ingredient.insertMany(ingData);
  console.log(`🧂 ${ingDocs.length} ingredients created`);

  // Build lookup: name → ObjectId
  const I = {};
  ingDocs.forEach(d => { I[d.name] = d._id; });

  // ════════════════════════════════════════════════════════
  // MENU ITEMS
  // Ingredient quantities: г for кг-items, мл for л-items, шт for шт-items
  // The deduction util converts г→кг and мл→л automatically.
  // ════════════════════════════════════════════════════════
  const menuData = [

    // ═══════════ ХОЛОДНЫЕ ЗАКУСКИ ════════════════════════
    {
      name: 'Нарезка лимона', nameEn: 'Sliced Lemon',
      category: 'холодные_закуски', price: 100, weight: null,
      description: 'Нарезанный лимон', order: 1,
      ingredients: []   // лимон вне учёта
    },
    {
      name: 'Нарезка апельсина', nameEn: 'Sliced Orange',
      category: 'холодные_закуски', price: 100, weight: null,
      description: 'Нарезанный апельсин', order: 2,
      ingredients: []
    },
    {
      name: 'Овощное ассорти', nameEn: 'Vegetable Platter',
      category: 'холодные_закуски', price: 300, weight: '300гр',
      description: 'Помидор, огурец, болгарский перец, редис, маслины, соус песто', order: 3,
      ingredients: [
        { ingredientId: I['Помидоры'],        quantity: 70,  unit: 'г' },
        { ingredientId: I['Огурец'],          quantity: 70,  unit: 'г' },
        { ingredientId: I['Болгарский перец'],quantity: 50,  unit: 'г' },
        { ingredientId: I['Редис'],           quantity: 40,  unit: 'г' },
        { ingredientId: I['Маслины'],         quantity: 40,  unit: 'г' },
      ]
    },
    {
      name: 'Соленья', nameEn: 'Pickled Assortment',
      category: 'холодные_закуски', price: 550, weight: '400гр',
      description: 'Маринованные шампиньоны, томаты, корнишоны, капуста, морковь, черемша', order: 4,
      ingredients: [
        { ingredientId: I['Маринованные огурцы'],  quantity: 70, unit: 'г' },
        { ingredientId: I['Помидоры маринованные'],quantity: 60, unit: 'г' },
        { ingredientId: I['Капуста маринованная'], quantity: 70, unit: 'г' },
        { ingredientId: I['Морковь маринованная'], quantity: 60, unit: 'г' },
        { ingredientId: I['Черемша'],              quantity: 40, unit: 'г' },
      ]
    },
    {
      name: 'Мясное ассорти', nameEn: 'Meat Platter',
      category: 'холодные_закуски', price: 600, weight: '300гр',
      description: 'Колбаса п/к, с/к, ветчина, буженина, пастрома, хрен', order: 5,
      ingredients: [
        { ingredientId: I['Полукопченая колбаса'], quantity: 60, unit: 'г' },
        { ingredientId: I['Сырокопченая колбаса'], quantity: 50, unit: 'г' },
        { ingredientId: I['Ветчина'],              quantity: 50, unit: 'г' },
        { ingredientId: I['Буженина'],             quantity: 40, unit: 'г' },
        { ingredientId: I['Пастрома'],             quantity: 40, unit: 'г' },
        { ingredientId: I['Хрен'],                 quantity: 20, unit: 'г' },
      ]
    },
    {
      name: 'Сырное ассорти', nameEn: 'Cheese Platter',
      category: 'холодные_закуски', price: 600, weight: '300гр',
      description: 'Брынза, голландский, российский, гауда, пармезан, виноград, мёд', order: 6,
      ingredients: [
        { ingredientId: I['Голландский сыр'],  quantity: 50, unit: 'г' },
        { ingredientId: I['Российский сыр'],   quantity: 50, unit: 'г' },
        { ingredientId: I['Гауда'],            quantity: 50, unit: 'г' },
        { ingredientId: I['Пармезан'],         quantity: 30, unit: 'г' },
        { ingredientId: I['Виноград'],         quantity: 60, unit: 'г' },
      ]
    },
    {
      name: 'Фруктовое ассорти', nameEn: 'Fruit Platter',
      category: 'холодные_закуски', price: 550, weight: '400гр',
      description: 'Яблоко, груша, киви, апельсин, виноград, сахарная пудра, мята', order: 7,
      ingredients: [
        { ingredientId: I['Яблоко'],   quantity: 90, unit: 'г' },
        { ingredientId: I['Груша'],    quantity: 80, unit: 'г' },
        { ingredientId: I['Киви'],     quantity: 70, unit: 'г' },
        { ingredientId: I['Виноград'], quantity: 60, unit: 'г' },
      ]
    },
    {
      name: 'Сэндвич с курицей', nameEn: 'Chicken Sandwich',
      category: 'холодные_закуски', price: 300, weight: '180гр',
      description: 'Курица, салат айсберг, помидор, сыр', order: 8,
      ingredients: [
        { ingredientId: I['Куриное филе'],     quantity: 65, unit: 'г' },
        { ingredientId: I['Салат айсберг'],    quantity: 30, unit: 'г' },
        { ingredientId: I['Помидоры'],         quantity: 40, unit: 'г' },
        { ingredientId: I['Сыр для сэндвичей'],quantity: 30, unit: 'г' },
        { ingredientId: I['Тостовый хлеб'],    quantity: 50, unit: 'г' },
      ]
    },
    {
      name: 'Сэндвич с ветчиной и сыром', nameEn: 'Ham & Cheese Sandwich',
      category: 'холодные_закуски', price: 300, weight: '180гр',
      description: 'Ветчина, салат айсберг, помидор, сыр', order: 9,
      ingredients: [
        { ingredientId: I['Ветчина'],           quantity: 65, unit: 'г' },
        { ingredientId: I['Салат айсберг'],     quantity: 30, unit: 'г' },
        { ingredientId: I['Помидоры'],          quantity: 40, unit: 'г' },
        { ingredientId: I['Сыр для сэндвичей'], quantity: 30, unit: 'г' },
        { ingredientId: I['Тостовый хлеб'],     quantity: 50, unit: 'г' },
      ]
    },

    // ═══════════ ПИЦЦА ═══════════════════════════════════
    {
      name: 'Четыре сыра', nameEn: 'Four Cheese Pizza',
      category: 'пицца', price: 500, weight: '600гр',
      description: 'Сыр голландский, моцарелла, пармезан, брынза, соус белый', order: 10,
      ingredients: [
        { ingredientId: I['Мука'],            quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'],   quantity: 100, unit: 'г' },
        { ingredientId: I['Голландский сыр'],  quantity: 40,  unit: 'г' },
        { ingredientId: I['Пармезан'],         quantity: 30,  unit: 'г' },
        { ingredientId: I['Российский сыр'],   quantity: 30,  unit: 'г' },
      ]
    },
    {
      name: 'Маргарита', nameEn: 'Margherita Pizza',
      category: 'пицца', price: 500, weight: '600гр',
      description: 'Помидор, моцарелла, соус красный', order: 11,
      ingredients: [
        { ingredientId: I['Мука'],          quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'], quantity: 150, unit: 'г' },
        { ingredientId: I['Помидоры'],      quantity: 100, unit: 'г' },
      ]
    },
    {
      name: 'Карбонара', nameEn: 'Carbonara Pizza',
      category: 'пицца', price: 600, weight: '600гр',
      description: 'Бекон, ветчина, моцарелла, соус белый, желток', order: 12,
      ingredients: [
        { ingredientId: I['Мука'],          quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'], quantity: 120, unit: 'г' },
        { ingredientId: I['Бекон'],         quantity: 65,  unit: 'г' },
        { ingredientId: I['Ветчина'],       quantity: 45,  unit: 'г' },
        { ingredientId: I['Яйцо куриное'],  quantity: 1,   unit: 'шт' },
      ]
    },
    {
      name: 'Охотская', nameEn: "Hunter's Pizza",
      category: 'пицца', price: 600, weight: '600гр',
      description: 'Колбаса п/к, с/к, моцарелла, соус красный', order: 13,
      ingredients: [
        { ingredientId: I['Мука'],                  quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'],         quantity: 130, unit: 'г' },
        { ingredientId: I['Полукопченая колбаса'],  quantity: 65,  unit: 'г' },
        { ingredientId: I['Сырокопченая колбаса'],  quantity: 45,  unit: 'г' },
      ]
    },
    {
      name: 'Фермерская', nameEn: 'Farm Pizza',
      category: 'пицца', price: 600, weight: '600гр',
      description: 'Курица, ветчина, грибы, моцарелла, соус белый', order: 14,
      ingredients: [
        { ingredientId: I['Мука'],          quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'], quantity: 110, unit: 'г' },
        { ingredientId: I['Куриное филе'],  quantity: 85,  unit: 'г' },
        { ingredientId: I['Ветчина'],       quantity: 45,  unit: 'г' },
        { ingredientId: I['Шампиньоны'],    quantity: 60,  unit: 'г' },
      ]
    },
    {
      name: 'Баварская', nameEn: 'Bavarian Pizza',
      category: 'пицца', price: 600, weight: '600гр',
      description: 'Колбаса с/к, ветчина, курица, пастрома, бекон, соус красный', order: 15,
      ingredients: [
        { ingredientId: I['Мука'],                 quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'],        quantity: 100, unit: 'г' },
        { ingredientId: I['Сырокопченая колбаса'], quantity: 50,  unit: 'г' },
        { ingredientId: I['Ветчина'],              quantity: 40,  unit: 'г' },
        { ingredientId: I['Куриное филе'],         quantity: 60,  unit: 'г' },
        { ingredientId: I['Пастрома'],             quantity: 30,  unit: 'г' },
        { ingredientId: I['Бекон'],                quantity: 30,  unit: 'г' },
      ]
    },
    {
      name: 'Домашняя', nameEn: 'Home-style Pizza',
      category: 'пицца', price: 600, weight: '600гр',
      description: 'Курица, корнишоны, помидоры, соус красный, моцарелла', order: 16,
      ingredients: [
        { ingredientId: I['Мука'],                quantity: 160, unit: 'г' },
        { ingredientId: I['Сыр для пиццы'],       quantity: 110, unit: 'г' },
        { ingredientId: I['Куриное филе'],        quantity: 85,  unit: 'г' },
        { ingredientId: I['Маринованные огурцы'], quantity: 40,  unit: 'г' },
        { ingredientId: I['Помидоры'],            quantity: 60,  unit: 'г' },
      ]
    },

    // ═══════════ САЛАТЫ ══════════════════════════════════
    {
      name: 'Греческий', nameEn: 'Greek Salad',
      category: 'салаты', price: 400, weight: '300гр',
      description: 'Огурец, томаты, болгарский перец, маслины, айсберг, сыр фета, песто', order: 20,
      ingredients: [
        { ingredientId: I['Огурец'],          quantity: 65, unit: 'г' },
        { ingredientId: I['Помидоры'],        quantity: 65, unit: 'г' },
        { ingredientId: I['Болгарский перец'],quantity: 40, unit: 'г' },
        { ingredientId: I['Маслины'],         quantity: 30, unit: 'г' },
        { ingredientId: I['Салат айсберг'],   quantity: 55, unit: 'г' },
      ]
    },
    {
      name: 'Цезарь с курицей', nameEn: 'Caesar with Chicken',
      category: 'салаты', price: 450, weight: '200гр',
      description: 'Курица, гренки, айсберг, черри, пармезан, фирменный соус', order: 21,
      ingredients: [
        { ingredientId: I['Куриное филе'],   quantity: 85, unit: 'г' },
        { ingredientId: I['Батон'],          quantity: 0.25,unit: 'шт' },
        { ingredientId: I['Салат айсберг'], quantity: 50, unit: 'г' },
        { ingredientId: I['Помидоры черри'],quantity: 30, unit: 'г' },
        { ingredientId: I['Пармезан'],      quantity: 20, unit: 'г' },
        { ingredientId: I['Майонез'],       quantity: 20, unit: 'г' },
      ]
    },
    {
      name: 'Салат с хрустящими баклажанами', nameEn: 'Crispy Eggplant Salad',
      category: 'салаты', price: 550, weight: '300гр',
      description: 'Баклажаны, сыр брынза, томаты, соус сладкий чили', order: 22,
      ingredients: [
        { ingredientId: I['Баклажан'],   quantity: 130, unit: 'г' },
        { ingredientId: I['Помидоры'],   quantity: 90,  unit: 'г' },
        { ingredientId: I['Сладкий чили'],quantity: 30, unit: 'г' },
        { ingredientId: I['Мука'],       quantity: 20,  unit: 'г' },
      ]
    },
    {
      name: 'Салат «Нежный»', nameEn: 'Tender Salad',
      category: 'салаты', price: 400, weight: '280гр',
      description: 'Курица, кукуруза, пармезан, листья салата, черри, майонез-горчица', order: 23,
      ingredients: [
        { ingredientId: I['Куриное филе'],   quantity: 85, unit: 'г' },
        { ingredientId: I['Кукуруза'],       quantity: 40, unit: 'г' },
        { ingredientId: I['Пармезан'],       quantity: 20, unit: 'г' },
        { ingredientId: I['Салат айсберг'], quantity: 80, unit: 'г' },
        { ingredientId: I['Помидоры черри'],quantity: 30, unit: 'г' },
        { ingredientId: I['Майонез'],        quantity: 20, unit: 'г' },
        { ingredientId: I['Горчица'],        quantity: 5,  unit: 'г' },
      ]
    },
    {
      name: 'Баварский салат', nameEn: 'Bavarian Salad',
      category: 'салаты', price: 500, weight: '300гр',
      description: 'Колбаса п/к, айдахо, красный лук, корнишоны, майонез', order: 24,
      ingredients: [
        { ingredientId: I['Полукопченая колбаса'], quantity: 110, unit: 'г' },
        { ingredientId: I['Картофельные дольки'],  quantity: 80,  unit: 'г' },
        { ingredientId: I['Маринованные огурцы'],  quantity: 40,  unit: 'г' },
        { ingredientId: I['Майонез'],              quantity: 30,  unit: 'г' },
      ]
    },

    // ═══════════ ПАСТА ═══════════════════════════════════
    {
      name: 'Карбонара', nameEn: 'Carbonara Pasta',
      category: 'паста', price: 500, weight: '300гр',
      description: 'Бекон, ветчина, пармезан, сливки, желток, травы', order: 30,
      ingredients: [
        { ingredientId: I['Спагетти'],      quantity: 100, unit: 'г' },
        { ingredientId: I['Бекон'],         quantity: 65,  unit: 'г' },
        { ingredientId: I['Ветчина'],       quantity: 40,  unit: 'г' },
        { ingredientId: I['Пармезан'],      quantity: 30,  unit: 'г' },
        { ingredientId: I['Сливки 23%'],    quantity: 80,  unit: 'мл' },
        { ingredientId: I['Яйцо куриное'],  quantity: 1,   unit: 'шт' },
      ]
    },
    {
      name: 'Паста с курицей и грибами', nameEn: 'Chicken & Mushroom Pasta',
      category: 'паста', price: 450, weight: '300гр',
      description: 'Курица, грибы, сливки, пармезан, зелень', order: 31,
      ingredients: [
        { ingredientId: I['Спагетти'],    quantity: 100, unit: 'г' },
        { ingredientId: I['Куриное филе'],quantity: 85,  unit: 'г' },
        { ingredientId: I['Шампиньоны'], quantity: 65,  unit: 'г' },
        { ingredientId: I['Сливки 23%'], quantity: 80,  unit: 'мл' },
        { ingredientId: I['Пармезан'],   quantity: 20,  unit: 'г' },
        { ingredientId: I['Зелень'],     quantity: 10,  unit: 'г' },
      ]
    },

    // ═══════════ ГОРЯЧИЕ БЛЮДА ═══════════════════════════
    {
      name: 'Скоблянка', nameEn: 'Skoblyanka',
      category: 'горячие_блюда', price: 500, weight: '400гр',
      description: 'Курица, картофельные дольки, болгарский перец, шампиньоны, сливки, лук', order: 40,
      ingredients: [
        { ingredientId: I['Куриное филе'],        quantity: 130, unit: 'г' },
        { ingredientId: I['Картофельные дольки'], quantity: 100, unit: 'г' },
        { ingredientId: I['Болгарский перец'],    quantity: 60,  unit: 'г' },
        { ingredientId: I['Шампиньоны'],         quantity: 60,  unit: 'г' },
        { ingredientId: I['Сливки 23%'],         quantity: 80,  unit: 'мл' },
        { ingredientId: I['Зелень'],             quantity: 10,  unit: 'г' },
      ]
    },
    {
      name: 'Сковородка с курицей и овощами', nameEn: 'Chicken & Vegetable Pan',
      category: 'горячие_блюда', price: 500, weight: '400гр',
      description: 'Курица, картофельные дольки, помидор, болгарский перец, зелень', order: 41,
      ingredients: [
        { ingredientId: I['Куриное филе'],        quantity: 130, unit: 'г' },
        { ingredientId: I['Картофельные дольки'], quantity: 100, unit: 'г' },
        { ingredientId: I['Помидоры'],            quantity: 65,  unit: 'г' },
        { ingredientId: I['Болгарский перец'],    quantity: 60,  unit: 'г' },
        { ingredientId: I['Зелень'],              quantity: 10,  unit: 'г' },
      ]
    },
    {
      name: 'Сытная сковородка', nameEn: 'Hearty Pan',
      category: 'горячие_блюда', price: 500, weight: '400гр',
      description: 'Айдахо, колбаса п/к, корнишоны, болгарский перец, сыр, яйцо', order: 42,
      ingredients: [
        { ingredientId: I['Картофельные дольки'],  quantity: 110, unit: 'г' },
        { ingredientId: I['Полукопченая колбаса'], quantity: 85,  unit: 'г' },
        { ingredientId: I['Маринованные огурцы'],  quantity: 40,  unit: 'г' },
        { ingredientId: I['Болгарский перец'],     quantity: 60,  unit: 'г' },
        { ingredientId: I['Российский сыр'],       quantity: 30,  unit: 'г' },
        { ingredientId: I['Яйцо куриное'],         quantity: 1,   unit: 'шт' },
      ]
    },
    {
      name: 'Свиные рёбрышки с картофелем бэби', nameEn: 'Pork Ribs with Baby Potatoes',
      category: 'горячие_блюда', price: 600, weight: '400гр',
      description: 'Свиные рёбрышки, картофель бэби', order: 43,
      ingredients: [
        { ingredientId: I['Рёбрышки свиные'],  quantity: 210, unit: 'г' },
        { ingredientId: I['Картофель бэби'],   quantity: 160, unit: 'г' },
      ]
    },

    // ═══════════ ЗАКУСКИ К ПИВУ ══════════════════════════
    {
      name: 'Пивной сет', nameEn: 'Beer Set',
      category: 'закуски_к_пиву', price: 1300, weight: '600гр',
      description: 'Фри, айдахо, стрипсы, наггетсы, гренки чесночные, сыр косичка', order: 50,
      ingredients: [
        { ingredientId: I['Картофель фри'],       quantity: 100, unit: 'г' },
        { ingredientId: I['Картофельные дольки'], quantity: 100, unit: 'г' },
        { ingredientId: I['Куриные стрипсы'],     quantity: 80,  unit: 'г' },
        { ingredientId: I['Наггетсы'],            quantity: 80,  unit: 'г' },
        { ingredientId: I['Батон'],               quantity: 0.3, unit: 'шт' },
        { ingredientId: I['Чесночный соус'],      quantity: 35,  unit: 'г' },
        { ingredientId: I['Сыр косичка'],         quantity: 80,  unit: 'г' },
      ]
    },
    {
      name: 'Мясная закуска к пиву', nameEn: 'Meat Beer Snack',
      category: 'закуски_к_пиву', price: 1500, weight: '800гр',
      description: 'Рёбрышки, уши свиные, охотские колбаски, стрипсы, наггетсы, мясные чипсы', order: 51,
      ingredients: [
        { ingredientId: I['Рёбра свиные копчёные'], quantity: 150, unit: 'г' },
        { ingredientId: I['Уши свиные'],             quantity: 150, unit: 'г' },
        { ingredientId: I['Сосиски'],                quantity: 100, unit: 'г' },
        { ingredientId: I['Куриные стрипсы'],        quantity: 100, unit: 'г' },
        { ingredientId: I['Наггетсы'],               quantity: 100, unit: 'г' },
        { ingredientId: I['Чипсы мясные'],           quantity: 100, unit: 'г' },
      ]
    },
    {
      name: 'Куриные стрипсы', nameEn: 'Chicken Strips',
      category: 'закуски_к_пиву', price: 400, weight: '6шт',
      description: '+соус', order: 52,
      ingredients: [
        { ingredientId: I['Куриные стрипсы'], quantity: 90, unit: 'г' },
      ]
    },
    {
      name: 'Наггетсы', nameEn: 'Chicken Nuggets',
      category: 'закуски_к_пиву', price: 350, weight: '10шт',
      description: '+соус', order: 53,
      ingredients: [
        { ingredientId: I['Наггетсы'], quantity: 150, unit: 'г' },
      ]
    },
    {
      name: 'Картофель фри', nameEn: 'French Fries',
      category: 'закуски_к_пиву', price: 200, weight: '180гр',
      description: '+соус', order: 54,
      ingredients: [
        { ingredientId: I['Картофель фри'], quantity: 180, unit: 'г' },
      ]
    },
    {
      name: 'Картофель айдахо', nameEn: 'Idaho Potatoes',
      category: 'закуски_к_пиву', price: 200, weight: '180гр',
      description: '+соус', order: 55,
      ingredients: [
        { ingredientId: I['Картофельные дольки'], quantity: 180, unit: 'г' },
      ]
    },
    {
      name: 'Гренки чесночные', nameEn: 'Garlic Croutons',
      category: 'закуски_к_пиву', price: 200, weight: '120гр',
      description: '', order: 56,
      ingredients: [
        { ingredientId: I['Батон'],          quantity: 0.4, unit: 'шт' },
        { ingredientId: I['Чесночный соус'], quantity: 40,  unit: 'г' },
      ]
    },
    {
      name: 'Жареные пельмени куриные', nameEn: 'Fried Chicken Dumplings',
      category: 'закуски_к_пиву', price: 300, weight: '200гр',
      description: '+соус', order: 57,
      ingredients: [
        { ingredientId: I['Пельмени'], quantity: 160, unit: 'г' },
      ]
    },
    {
      name: 'Сыр косичка', nameEn: 'String Cheese',
      category: 'закуски_к_пиву', price: 200, weight: '80гр',
      description: '', order: 58,
      ingredients: [
        { ingredientId: I['Сыр косичка'], quantity: 80, unit: 'г' },
      ]
    },
    {
      name: 'Сыр косичка с лимоном', nameEn: 'String Cheese with Lemon',
      category: 'закуски_к_пиву', price: 250, weight: '100гр',
      description: '', order: 59,
      ingredients: [
        { ingredientId: I['Сыр косичка'], quantity: 90, unit: 'г' },
      ]
    },
    {
      name: 'Соус в ассортименте', nameEn: 'Sauce (choice)',
      category: 'закуски_к_пиву', price: 50, weight: '30гр',
      description: 'Чесночный, сырный, кисло-сладкий, терияки, барбекю, сладкий чили', order: 60,
      ingredients: []  // sauce choice is ad-hoc, no fixed deduction
    },

    // ═══════════ ДЕСЕРТЫ ═════════════════════════════════
    {
      name: 'Штрудель в ассортименте', nameEn: 'Strudel (assorted)',
      category: 'десерты', price: 450, weight: null,
      description: '', order: 70,
      ingredients: [
        { ingredientId: I['Штрудель'], quantity: 1, unit: 'шт' },
      ]
    },
    {
      name: 'Мороженое + топпинг', nameEn: 'Ice Cream + Topping',
      category: 'десерты', price: 350, weight: null,
      description: '', order: 71,
      ingredients: [
        { ingredientId: I['Мороженое'], quantity: 120, unit: 'г' },
      ]
    },
  ];

  await MenuItem.insertMany(menuData);
  console.log(`🍕 ${menuData.length} menu items created`);

  await mongoose.disconnect();
  console.log('✅ Seed complete!');
  console.log('');
  console.log('🔑 Login credentials:');
  console.log('   superadmin: abdo  / Abdo2024!');
  console.log('   admin:      admin / Admin123');
  console.log('   cook:       cook1 / Cook111');
}

seed().catch(e => { console.error(e); process.exit(1); });
