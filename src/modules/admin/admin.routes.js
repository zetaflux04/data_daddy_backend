const { Router } = require('express');
const { adminAuthController } = require('./admin.auth.controller');
const { adminController } = require('./admin.controller');
const { authenticateSuperAdmin } = require('./admin.middleware');

const router = Router();

// Public Admin Auth
router.post('/auth/login', adminAuthController.login);

// Guarded Admin Endpoints
router.use(authenticateSuperAdmin);

// Auth Me
router.get('/auth/me', adminAuthController.getMe);

// Overview / Dashboard KPIs
router.get('/overview', adminController.getOverview);

// Shops Management
router.get('/shops', adminController.getShops);
router.get('/shops/:id', adminController.getShopById);
router.post('/shops', adminController.createShop);
router.put('/shops/:id', adminController.updateShop);
router.patch('/shops/:id/subscription', adminController.updateShopSubscription);
router.delete('/shops/:id', adminController.deleteShop);

// Technicians & Staff Management
router.get('/technicians', adminController.getTechnicians);
router.post('/technicians', adminController.createTechnician);
router.put('/technicians/:id', adminController.updateTechnician);

// Customers Directory
router.get('/customers', adminController.getCustomers);
router.get('/customers/:id', adminController.getCustomerById);

// Orders & Customer Issues Control
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderById);
router.put('/orders/:id', adminController.editOrder);
router.delete('/orders/:id', adminController.deleteOrder);
router.patch('/orders/:id/status', adminController.updateOrderStatus);
router.patch('/orders/:id/assign', adminController.assignTechnician);
router.post('/orders/:id/payments', adminController.addOrderPayment);

// Revenue & Financial Analytics
router.get('/revenue/analytics', adminController.getRevenueAnalytics);

// Notifications Management
router.get('/notifications', adminController.getNotifications);
router.post('/notifications', adminController.createNotification);
router.delete('/notifications/:id', adminController.deleteNotification);

// Demo / Multi-Tenant Seeding
router.post('/seed', adminController.seedData);

module.exports = router;
