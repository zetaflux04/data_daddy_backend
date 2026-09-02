const express = require('express');
const cors = require('cors');
const { errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/auth.routes');
const shopRoutes = require('./modules/shops/shop.routes');
const customerRoutes = require('./modules/customers/customer.routes');
const orderRoutes = require('./modules/orders/order.routes');
const expenseRoutes = require('./modules/expenses/expense.routes');
const analyticsRoutes = require('./modules/analytics/analytics.routes');
const guideRoutes = require('./modules/guides/guide.routes');
const subscriptionRoutes = require('./modules/subscriptions/subscription.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const notificationRoutes = require('./modules/notifications/notification.routes');
const uploadRoutes = require('./modules/uploads/upload.routes');

const app = express();

// Comprehensive CORS setup
app.use(
  cors({
    origin: true, // Reflect request origin (supports localhost:5173, localhost:3000, mobile, etc.)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  })
);
app.options('*', cors());

app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'RepairShop Manager API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Modules
app.use('/api/auth', authRoutes);
app.use('/api/shops', shopRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/guides', guideRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/uploads', uploadRoutes);

// Error Handling
app.use(errorHandler);

module.exports = app;
