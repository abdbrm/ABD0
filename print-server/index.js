/**
 * NEON Print Server — runs locally on kitchen laptop
 * Run: node index.js
 * Connects to Railway server via Socket.io
 * Receives print jobs, translates Russian → English, prints via ESC/POS
 */
require('dotenv').config();
const { io }         = require('socket.io-client');
const { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } = require('node-thermal-printer');

// ── Config (edit .env) ───────────────────────────────────
const SERVER_URL     = process.env.SERVER_URL    || 'https://your-app.railway.app';
const PRINTER_TYPE   = process.env.PRINTER_TYPE  || 'EPSON';   // EPSON or STAR
const PRINTER_IFACE  = process.env.PRINTER_IFACE || 'tcp://192.168.1.100:9100'; // or 'usb' or '//./USB001'
const SECRET         = process.env.PRINT_SECRET  || 'print_server_secret_key';

// ── Russian → English translation map ────────────────────
const TRANSLATE = {
  // Categories
  'холодные_закуски': 'Cold Appetizers',
  'пицца':            'Pizza',
  'салаты':           'Salads',
  'паста':            'Pasta',
  'горячие_блюда':    'Hot Dishes',
  'закуски_к_пиву':   'Beer Snacks',
  'десерты':          'Desserts',
  // Statuses
  'new':     'NEW',
  'cooking': 'COOKING',
  'ready':   'READY',
  'served':  'SERVED',
  // Clubs
  'neon':  'NEON',
  'enot':  'ENOT',
  'elvis': 'ELVIS',
};

// Translate a string: use nameEn if available, else look up map, else keep original
function tr(ruStr, enStr) {
  if (enStr) return enStr;
  return TRANSLATE[ruStr] || transliterate(ruStr);
}

// Simple transliteration fallback for names not in the map
function transliterate(str) {
  if (!str) return '';
  const map = {
    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z',
    'и':'i','й':'y','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r',
    'с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh',
    'щ':'shch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya',
    'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'Yo','Ж':'Zh','З':'Z',
    'И':'I','Й':'Y','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R',
    'С':'S','Т':'T','У':'U','Ф':'F','Х':'Kh','Ц':'Ts','Ч':'Ch','Ш':'Sh',
    'Щ':'Shch','Ъ':'','Ы':'Y','Ь':'','Э':'E','Ю':'Yu','Я':'Ya',
    'ё':'yo','Ё':'Yo'
  };
  return str.split('').map(c => map[c] !== undefined ? map[c] : c).join('');
}

function formatMoscowTime(dateStr) {
  const d = new Date(dateStr || Date.now());
  return d.toLocaleString('en-GB', {
    timeZone: 'Europe/Moscow',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).replace(',', '');
}

// ── Printer setup ─────────────────────────────────────────
let printer;

function setupPrinter() {
  const type = PRINTER_TYPE === 'STAR' ? PrinterTypes.STAR : PrinterTypes.EPSON;
  printer = new ThermalPrinter({
    type,
    interface:     PRINTER_IFACE,
    characterSet:  CharacterSet.PC852_LATIN2,
    breakLine:     BreakLine.WORD,
    options: { timeout: 5000 }
  });
}

async function checkPrinter() {
  try {
    const isConnected = await printer.isPrinterConnected();
    console.log('🖨️  Printer connected:', isConnected);
    return isConnected;
  } catch {
    console.warn('⚠️  Printer not reachable');
    return false;
  }
}

// ── Print a kitchen ticket ────────────────────────────────
async function printKitchenTicket(order) {
  try {
    setupPrinter();

    const club       = (order.club || '').toUpperCase();
    const waiterName = transliterate(order.waiter?.name || 'Waiter');
    const timeStr    = formatMoscowTime(order.createdAt);
    const isWorker   = order.isWorkerOrder;

    // ── Header ──────────────────────────────────────────
    printer.alignCenter();
    printer.bold(true);
    printer.setTextSize(1, 1);
    printer.println(`=== ${club} ===`);
    printer.setTextSize(0, 0);
    printer.bold(false);

    printer.println(`Order #${order.orderNumber}`);
    printer.println(timeStr);
    printer.drawLine();

    // ── Table & Waiter ──────────────────────────────────
    printer.alignLeft();
    printer.bold(true);
    printer.println(`Table: ${order.tableNumber}`);
    printer.println(`Waiter: ${waiterName}`);
    if (isWorker) {
      printer.println(`*** STAFF ORDER ***`);
      if (order.discount) printer.println(`Discount: ${order.discount}%`);
    }
    printer.bold(false);
    printer.drawLine();

    // ── Items ────────────────────────────────────────────
    printer.alignLeft();
    for (const item of (order.items || [])) {
      const itemName = tr(item.name, item.nameEn);
      const qty      = item.quantity || 1;
      const price    = (item.price || 0) * qty;

      printer.bold(qty > 1);
      printer.println(`${qty}x  ${itemName}`);
      printer.bold(false);

      if (item.note) {
        printer.println(`    >> ${item.note}`);
      }

      // right-align price
      printer.alignRight();
      printer.println(`${price} rub`);
      printer.alignLeft();
    }

    printer.drawLine();

    // ── Totals ───────────────────────────────────────────
    printer.alignRight();
    if (order.discount > 0) {
      printer.println(`Subtotal: ${order.totalAmount} rub`);
      printer.println(`Discount: -${order.discount}%`);
      printer.bold(true);
      printer.println(`TOTAL: ${order.finalAmount} rub`);
      printer.bold(false);
    } else {
      printer.bold(true);
      printer.println(`TOTAL: ${order.totalAmount} rub`);
      printer.bold(false);
    }

    printer.alignCenter();
    printer.println('');
    printer.println('- - - - - - - - - -');
    printer.println('');

    printer.cut();
    await printer.execute();

    console.log(`✅ Printed order #${order.orderNumber} [${club}] table ${order.tableNumber}`);
    return true;

  } catch (err) {
    console.error('❌ Print error:', err.message);
    return false;
  }
}

// ── Socket connection to Railway ──────────────────────────
function connect() {
  console.log(`🔌 Connecting to ${SERVER_URL}...`);

  const socket = io(SERVER_URL, {
    auth:          { secret: SECRET },
    reconnection:  true,
    reconnectionDelay: 3000,
    reconnectionAttempts: Infinity,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to server:', socket.id);
    // Register as print server
    socket.emit('register', { role: 'print_server' });
    checkPrinter();
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️  Disconnected:', reason);
  });

  socket.on('reconnect_attempt', (n) => {
    console.log(`🔄 Reconnect attempt #${n}...`);
  });

  // ── Receive print job ──────────────────────────────────
  socket.on('print_job', async (data) => {
    console.log('📄 Print job received:', data.type);

    if (data.type === 'kitchen_ticket') {
      const ok = await printKitchenTicket(data.order);
      socket.emit('print_result', {
        orderId: data.order?._id,
        success: ok
      });
    }
  });

  socket.on('connect_error', (err) => {
    console.error('❌ Connection error:', err.message);
  });

  return socket;
}

// ── Entry point ───────────────────────────────────────────
console.log('🖨️  NEON Print Server starting...');
setupPrinter();
connect();
