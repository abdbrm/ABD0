const router = require('express').Router();
const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');
const Order = require('../models/Order');
const Shift = require('../models/Shift');
const InventoryRecord = require('../models/InventoryRecord');
const auth  = require('../middleware/auth');
const { fmt, fmtDate } = require('../utils/time');

// Path to bundled Cyrillic font (DejaVu — place in server/fonts/)
const FONT_PATH = path.join(__dirname, '../fonts/DejaVuSans.ttf');
const FONT_BOLD = path.join(__dirname, '../fonts/DejaVuSans-Bold.ttf');
const HAS_FONT  = fs.existsSync(FONT_PATH);

function applyFont(doc, bold = false) {
  if (HAS_FONT) {
    doc.font(bold ? (fs.existsSync(FONT_BOLD) ? FONT_BOLD : FONT_PATH) : FONT_PATH);
  } else {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica'); // fallback (no Cyrillic)
  }
}

/* ── SALES SUMMARY — JSON ──────────────────────────────── */
router.get('/sales/:shiftId', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const orders = await Order.find({
      shiftId: req.params.shiftId,
      status:  { $ne: 'cancelled' }
    });

    const summary = {
      total:      0,
      byClub:     { neon: 0, enot: 0, elvis: 0 },
      byWaiter:   {},
      byTable:    {},
      orderCount: orders.length,
      workerTotal: 0
    };

    orders.forEach(o => {
      const amt = o.finalAmount ?? o.totalAmount;
      summary.total += amt;
      summary.byClub[o.club] = (summary.byClub[o.club] || 0) + amt;

      const wName = o.waiter?.name || '—';
      summary.byWaiter[wName] = (summary.byWaiter[wName] || 0) + amt;

      const tKey = `${o.club.toUpperCase()} стол ${o.tableNumber}`;
      summary.byTable[tKey] = (summary.byTable[tKey] || 0) + amt;

      if (o.isWorkerOrder) summary.workerTotal += amt;
    });

    res.json(summary);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── SALES PDF ─────────────────────────────────────────── */
router.get('/sales/:shiftId/pdf', auth(['superadmin', 'admin']), async (req, res) => {
  try {
    const shift  = await Shift.findById(req.params.shiftId);
    const orders = await Order.find({ shiftId: req.params.shiftId, status: { $ne: 'cancelled' } });

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="sales_${req.params.shiftId}.pdf"`);
    doc.pipe(res);

    // Totals
    const byClub    = { neon: 0, enot: 0, elvis: 0 };
    const byWaiter  = {};
    const byTable   = {};
    let total = 0;

    orders.forEach(o => {
      const amt = o.finalAmount ?? o.totalAmount;
      total += amt;
      byClub[o.club]  = (byClub[o.club] || 0) + amt;
      const wn = o.waiter?.name || '—';
      byWaiter[wn] = (byWaiter[wn] || 0) + amt;
      const tk = `${o.club.toUpperCase()} стол ${o.tableNumber}`;
      byTable[tk]  = (byTable[tk] || 0) + amt;
    });

    const openStr  = shift ? fmt(shift.openedAt) : '—';
    const closeStr = shift?.closedAt ? fmt(shift.closedAt) : 'не закрыта';

    // Header
    applyFont(doc, true);
    doc.fontSize(18).text('ОТЧЁТ ПО ПРОДАЖАМ', { align: 'center' });
    applyFont(doc);
    doc.fontSize(11).text(`Смена: ${openStr} — ${closeStr}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Grand total — big
    applyFont(doc, true);
    doc.fontSize(16).text(`ИТОГО: ${total.toFixed(0)} руб.`, { align: 'right' });
    doc.moveDown(1);

    // By club
    applyFont(doc, true);
    doc.fontSize(13).text('По клубам:');
    applyFont(doc);
    doc.fontSize(11);
    Object.entries(byClub).forEach(([club, amt]) => {
      doc.text(`  ${club.toUpperCase()}: ${amt.toFixed(0)} руб.`);
    });
    doc.moveDown(1);

    // By waiter
    applyFont(doc, true);
    doc.fontSize(13).text('По официантам:');
    applyFont(doc);
    doc.fontSize(11);
    Object.entries(byWaiter).sort((a,b)=>b[1]-a[1]).forEach(([name, amt]) => {
      doc.text(`  ${name}: ${amt.toFixed(0)} руб.`);
    });
    doc.moveDown(1);

    // By table (sorted desc)
    applyFont(doc, true);
    doc.fontSize(13).text('По столам (топ 20):');
    applyFont(doc);
    doc.fontSize(10);
    Object.entries(byTable).sort((a,b)=>b[1]-a[1]).slice(0,20).forEach(([tbl, amt]) => {
      doc.text(`  ${tbl}: ${amt.toFixed(0)} руб.`);
    });

    doc.end();
  } catch (e) { res.status(500).json({ message: e.message }); }
});

/* ── INVENTORY PDF ─────────────────────────────────────── */
router.get('/inventory/:shiftId/pdf', auth(['superadmin', 'admin', 'cook']), async (req, res) => {
  try {
    const record = await InventoryRecord.findOne({ shiftId: req.params.shiftId, type: 'end' });
    if (!record) return res.status(404).json({ message: 'Инвентаризация не найдена' });

    const shift = await Shift.findById(req.params.shiftId);
    const doc   = new PDFDocument({ margin: 40, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_${req.params.shiftId}.pdf"`);
    doc.pipe(res);

    applyFont(doc, true);
    doc.fontSize(18).text('ИНВЕНТАРИЗАЦИЯ', { align: 'center' });
    applyFont(doc);
    doc.fontSize(11).text(`Смена: ${shift ? fmt(shift.openedAt) : '—'}`, { align: 'center' });
    if (record.completedAt) doc.text(`Завершена: ${fmt(record.completedAt)}`, { align: 'center' });
    doc.moveDown(0.5);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.5);

    // Sort: biggest negative diff first (RED items on top)
    const sorted = [...record.items].sort((a, b) => (a.difference ?? 0) - (b.difference ?? 0));

    // Colour indicators (text-only since PDF colours may vary)
    sorted.forEach(item => {
      const diff   = item.difference ?? 0;
      const status = diff < -0.01 ? '⚠ ' : diff > 0.01 ? '+ ' : '✓ ';
      const diffStr = diff !== 0 ? ` (${diff > 0 ? '+' : ''}${diff.toFixed(3)})` : '';
      const reasonStr = item.reason ? ` → ${item.reason}` : '';

      applyFont(doc, diff < -0.01); // bold for problem items
      doc.fontSize(10).text(
        `${status}${item.name}: факт ${(item.actualQuantity ?? 0).toFixed(3)} ${item.unit}` +
        ` | ожид ${(item.theoreticalEnd ?? 0).toFixed(3)} ${item.unit}` +
        diffStr + reasonStr
      );
    });

    doc.end();
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
