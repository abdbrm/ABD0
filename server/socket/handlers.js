const Order  = require('../models/Order');
const Shift  = require('../models/Shift');

// Connected client registry
const registry = {
  kitchen:     null,   // socket.id of kitchen
  printServer: null,   // socket.id of print server
  admins:      new Set(),
  waiters:     new Map()  // userId → socket.id
};

module.exports = (io) => {
  io.on('connection', (socket) => {

    /* ── REGISTER ─────────────────────────────────────────── */
    socket.on('register', ({ role, userId }) => {
      socket.role   = role;
      socket.userId = userId;

      switch (role) {
        case 'kitchen':
          registry.kitchen = socket.id;
          socket.join('kitchen');
          socket.join('staff');
          break;

        case 'print_server':
          registry.printServer = socket.id;
          console.log('🖨️  Print server connected');
          break;

        case 'superadmin':
        case 'admin':
          registry.admins.add(socket.id);
          socket.join('admin');
          socket.join('staff');
          break;

        case 'waiter':
          registry.waiters.set(userId, socket.id);
          socket.join(`waiter_${userId}`);
          socket.join('staff');
          break;
      }
    });

    /* ── COOK ARRIVED → unlock waiter pages ──────────────── */
    socket.on('cook_arrived', async ({ shiftId }) => {
      await Shift.findByIdAndUpdate(shiftId, {
        'cook.arrived': true,
        'cook.arrivedAt': new Date()
      });
      io.emit('cook_arrived', { shiftId, time: new Date() });
    });

    /* ── NEW ORDER (from waiter page, already saved in DB) ── */
    socket.on('broadcast_order', (order) => {
      // Send to kitchen display
      io.to('kitchen').emit('new_order', order);
      // Send to all admin views
      io.to('admin').emit('new_order', order);
      // Send print job to local print server
      if (registry.printServer) {
        io.to(registry.printServer).emit('print_job', {
          type: 'kitchen_ticket',
          order
        });
      }
    });

    /* ── ORDER STATUS UPDATE (from kitchen) ──────────────── */
    socket.on('order_status_update', async ({ orderId, status }) => {
      const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });
      if (!order) return;

      // Notify waiter
      const waiterId = order.waiter?.userId?.toString();
      if (waiterId && registry.waiters.has(waiterId)) {
        io.to(`waiter_${waiterId}`).emit('order_status_update', { orderId, status, tableNumber: order.tableNumber });
      }
      // Notify admin
      io.to('admin').emit('order_status_update', { orderId, status });
    });

    /* ── WORKER ORDER (with payment proof) ───────────────── */
    socket.on('worker_order', (order) => {
      io.to('kitchen').emit('new_order', { ...order, isWorkerOrder: true });
      io.to('admin').emit('new_worker_order', order);
      if (registry.printServer) {
        io.to(registry.printServer).emit('print_job', {
          type: 'kitchen_ticket',
          order: { ...order, isWorkerOrder: true }
        });
      }
    });

    /* ── SHIFT TOTALS UPDATE ─────────────────────────────── */
    socket.on('shift_totals_update', (totals) => {
      io.to('admin').emit('shift_totals_update', totals);
    });

    /* ── PRINT REQUEST (manual reprint) ─────────────────── */
    socket.on('print_request', (data) => {
      if (registry.printServer) {
        io.to(registry.printServer).emit('print_job', data);
      } else {
        socket.emit('print_error', { message: 'Сервер печати недоступен' });
      }
    });

    /* ── DISCONNECT ──────────────────────────────────────── */
    socket.on('disconnect', () => {
      if (socket.role === 'kitchen')      registry.kitchen = null;
      if (socket.role === 'print_server') { registry.printServer = null; console.log('🖨️  Print server disconnected'); }
      if (socket.role === 'admin' || socket.role === 'superadmin') registry.admins.delete(socket.id);
      if (socket.role === 'waiter' && socket.userId) registry.waiters.delete(socket.userId);
    });
  });
};
