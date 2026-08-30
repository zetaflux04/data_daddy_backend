import express from 'express';
import cors from 'cors';
import { errorHandler } from './middlewares/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import shopRoutes from './modules/shops/shop.routes';
import customerRoutes from './modules/customers/customer.routes';
import orderRoutes from './modules/orders/order.routes';
import expenseRoutes from './modules/expenses/expense.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import guideRoutes from './modules/guides/guide.routes';
import subscriptionRoutes from './modules/subscriptions/subscription.routes';
import adminRoutes from './modules/admin/admin.routes';
import notificationRoutes from './modules/notifications/notification.routes';

const app = express();

app.use(cors());
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

// Error Handling
app.use(errorHandler);

export default app;
