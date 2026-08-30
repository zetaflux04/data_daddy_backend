import { Response } from 'express';
import { AdminRequest } from './admin.middleware';
import { Shop } from '../../models/Shop';
import { User } from '../../models/User';
import { Customer } from '../../models/Customer';
import { Order } from '../../models/Order';
import { Expense } from '../../models/Expense';
import { Notification } from '../../models/Notification';
import { seedMultiTenantData } from './admin.seed';
import mongoose from 'mongoose';

export const adminController = {
  /**
   * Executive Overview & Global KPIs
   * GET /api/admin/overview
   */
  async getOverview(req: AdminRequest, res: Response): Promise<void> {
    try {
      const [
        totalShops,
        activeShops,
        proShops,
        totalTechnicians,
        totalCustomers,
        totalOrders,
        statusAgg,
        financeAgg,
        recentOrders,
      ] = await Promise.all([
        Shop.countDocuments(),
        Shop.countDocuments({ 'subscription.status': 'active' }),
        Shop.countDocuments({ 'subscription.plan': 'pro' }),
        User.countDocuments({ role: { $in: ['technician', 'staff'] } }),
        Customer.countDocuments(),
        Order.countDocuments(),
        Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Order.aggregate([
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$cost.advancePaid' },
              totalDues: { $sum: '$cost.due' },
              totalValue: { $sum: '$cost.final' },
            },
          },
        ]),
        Order.find()
          .populate('shopId', 'name phone address')
          .populate('assignedTechnicianId', 'name phone')
          .sort({ createdAt: -1 })
          .limit(10),
      ]);

      const statusCounts: Record<string, number> = {
        pending: 0,
        in_progress: 0,
        parts_delayed: 0,
        repaired: 0,
        delivered: 0,
        canceled: 0,
      };
      statusAgg.forEach((item) => {
        if (item._id in statusCounts) statusCounts[item._id] = item.count;
      });

      const finances = financeAgg[0] || {
        totalRevenue: 0,
        totalDues: 0,
        totalValue: 0,
      };

      // Top shops by revenue
      const topShopsAgg = await Order.aggregate([
        {
          $group: {
            _id: '$shopId',
            revenue: { $sum: '$cost.advancePaid' },
            ordersCount: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'shops',
            localField: '_id',
            foreignField: '_id',
            as: 'shop',
          },
        },
        { $unwind: '$shop' },
        {
          $project: {
            shopId: '$_id',
            name: '$shop.name',
            ownerName: '$shop.ownerName',
            city: '$shop.address.city',
            plan: '$shop.subscription.plan',
            revenue: 1,
            ordersCount: 1,
          },
        },
      ]);

      res.json({
        success: true,
        data: {
          kpis: {
            totalShops,
            activeShops,
            proShops,
            totalTechnicians,
            totalCustomers,
            totalOrders,
            totalRevenue: finances.totalRevenue,
            totalDues: finances.totalDues,
            totalValue: finances.totalValue,
          },
          statusCounts,
          recentOrders,
          topShops: topShopsAgg,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * List All Shops with Aggregated Metrics
   * GET /api/admin/shops
   */
  async getShops(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { search, plan, status, limit = 50, page = 1 } = req.query;
      const filter: any = {};

      if (plan && plan !== 'all') {
        filter['subscription.plan'] = plan;
      }
      if (status && status !== 'all') {
        filter['subscription.status'] = status;
      }
      if (search && typeof search === 'string') {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [
          { name: regex },
          { ownerName: regex },
          { phone: regex },
          { 'address.city': regex },
        ];
      }

      const shops = await Shop.find(filter)
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Shop.countDocuments(filter);

      // Enhance shops with live counts
      const shopIds = shops.map((s) => s._id);
      const [orderStats, staffCounts, customerCounts] = await Promise.all([
        Order.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          {
            $group: {
              _id: '$shopId',
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$cost.advancePaid' },
              totalDues: { $sum: '$cost.due' },
            },
          },
        ]),
        User.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } },
        ]),
        Customer.aggregate([
          { $match: { shopId: { $in: shopIds } } },
          { $group: { _id: '$shopId', count: { $sum: 1 } } },
        ]),
      ]);

      const orderStatMap = new Map(orderStats.map((item) => [item._id.toString(), item]));
      const staffCountMap = new Map(staffCounts.map((item) => [item._id.toString(), item.count]));
      const customerCountMap = new Map(customerCounts.map((item) => [item._id.toString(), item.count]));

      const enrichedShops = shops.map((shop) => {
        const sid = shop._id.toString();
        const stats = orderStatMap.get(sid) || { totalOrders: 0, totalRevenue: 0, totalDues: 0 };
        return {
          ...shop.toObject(),
          stats: {
            totalOrders: stats.totalOrders,
            totalRevenue: stats.totalRevenue,
            totalDues: stats.totalDues,
            totalStaff: staffCountMap.get(sid) || 0,
            totalCustomers: customerCountMap.get(sid) || 0,
          },
        };
      });

      res.json({ success: true, shops: enrichedShops, total });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Get Single Shop Profile & Details
   * GET /api/admin/shops/:id
   */
  async getShopById(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findById(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      const [staff, customers, recentOrders, revenueStats] = await Promise.all([
        User.find({ shopId: shop._id }).sort({ role: 1 }),
        Customer.find({ shopId: shop._id }).sort({ totalOrdersCount: -1 }).limit(10),
        Order.find({ shopId: shop._id }).populate('assignedTechnicianId', 'name').sort({ createdAt: -1 }).limit(10),
        Order.aggregate([
          { $match: { shopId: shop._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalRevenue: { $sum: '$cost.advancePaid' },
              totalDues: { $sum: '$cost.due' },
            },
          },
        ]),
      ]);

      res.json({
        success: true,
        shop,
        staff,
        customers,
        recentOrders,
        financials: revenueStats[0] || { totalOrders: 0, totalRevenue: 0, totalDues: 0 },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Create Shop from Admin
   * POST /api/admin/shops
   */
  async createShop(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { name, ownerName, phone, address, plan = 'free' } = req.body;
      if (!name || !ownerName || !phone) {
        res.status(400).json({ success: false, message: 'Shop name, owner name, and phone are required' });
        return;
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const existingUser = await User.findOne({ phone: cleanPhone });
      if (existingUser) {
        res.status(400).json({ success: false, message: 'A user with this phone number already exists' });
        return;
      }

      const shop = await Shop.create({
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: cleanPhone,
        address: address || {},
        subscription: {
          plan: plan === 'pro' ? 'pro' : 'free',
          status: 'active',
        },
        settings: {
          currency: 'INR',
          smsNotificationsEnabled: true,
          nextJobNumber: 1001,
        },
      });

      const user = await User.create({
        shopId: shop._id,
        name: ownerName.trim(),
        phone: cleanPhone,
        role: 'owner',
        isActive: true,
      });

      res.status(201).json({ success: true, shop, owner: user });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Update Shop
   * PUT /api/admin/shops/:id
   */
  async updateShop(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, ownerName, phone, address, settings } = req.body;
      const shop = await Shop.findByIdAndUpdate(
        id,
        {
          $set: {
            ...(name && { name: name.trim() }),
            ...(ownerName && { ownerName: ownerName.trim() }),
            ...(phone && { phone: phone.trim() }),
            ...(address && { address }),
            ...(settings && { settings }),
          },
        },
        { new: true }
      );

      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      res.json({ success: true, shop });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Update Shop Subscription Plan
   * PATCH /api/admin/shops/:id/subscription
   */
  async updateShopSubscription(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { plan, status, expiresAt } = req.body;

      const shop = await Shop.findById(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      if (plan) shop.subscription.plan = plan;
      if (status) shop.subscription.status = status;
      if (expiresAt !== undefined) shop.subscription.expiresAt = expiresAt ? new Date(expiresAt) : undefined;

      await shop.save();
      res.json({ success: true, subscription: shop.subscription });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * List Technicians & Staff Across All Shops
   * GET /api/admin/technicians
   */
  async getTechnicians(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { shopId, role, search } = req.query;
      const filter: any = {};

      if (shopId && shopId !== 'all') {
        filter.shopId = shopId;
      }
      if (role && role !== 'all') {
        filter.role = role;
      }
      if (search && typeof search === 'string') {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [{ name: regex }, { phone: regex }];
      }

      const users = await User.find(filter)
        .populate('shopId', 'name phone address')
        .sort({ shopId: 1, role: 1 });

      // Count active assigned jobs per technician
      const userIds = users.map((u) => u._id);
      const assignedJobsAgg = await Order.aggregate([
        {
          $match: {
            assignedTechnicianId: { $in: userIds },
            status: { $in: ['pending', 'in_progress', 'parts_delayed'] },
          },
        },
        { $group: { _id: '$assignedTechnicianId', activeJobsCount: { $sum: 1 } } },
      ]);

      const activeJobsMap = new Map(assignedJobsAgg.map((item) => [item._id.toString(), item.activeJobsCount]));

      const enrichedUsers = users.map((u) => ({
        ...u.toObject(),
        activeJobsCount: activeJobsMap.get(u._id.toString()) || 0,
      }));

      res.json({ success: true, technicians: enrichedUsers, total: enrichedUsers.length });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Create Technician under a Shop
   * POST /api/admin/technicians
   */
  async createTechnician(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { shopId, name, phone, role = 'technician' } = req.body;
      if (!shopId || !name || !phone) {
        res.status(400).json({ success: false, message: 'Shop ID, name, and phone are required' });
        return;
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const existing = await User.findOne({ shopId, phone: cleanPhone });
      if (existing) {
        res.status(400).json({ success: false, message: 'Staff member already registered in this shop' });
        return;
      }

      const technician = await User.create({
        shopId,
        name: name.trim(),
        phone: cleanPhone,
        role,
        isActive: true,
      });

      const populated = await User.findById(technician._id).populate('shopId', 'name');
      res.status(201).json({ success: true, technician: populated });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Update Technician
   * PUT /api/admin/technicians/:id
   */
  async updateTechnician(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, phone, role, isActive } = req.body;

      const technician = await User.findByIdAndUpdate(
        id,
        {
          $set: {
            ...(name && { name: name.trim() }),
            ...(phone && { phone: phone.trim() }),
            ...(role && { role }),
            ...(isActive !== undefined && { isActive }),
          },
        },
        { new: true }
      ).populate('shopId', 'name');

      if (!technician) {
        res.status(404).json({ success: false, message: 'Technician not found' });
        return;
      }

      res.json({ success: true, technician });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * List Customers Across All Shops
   * GET /api/admin/customers
   */
  async getCustomers(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { shopId, search, limit = 50, page = 1 } = req.query;
      const filter: any = {};

      if (shopId && shopId !== 'all') {
        filter.shopId = shopId;
      }
      if (search && typeof search === 'string') {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [{ name: regex }, { phone: regex }, { email: regex }];
      }

      const customers = await Customer.find(filter)
        .populate('shopId', 'name phone address')
        .sort({ totalOrdersCount: -1, createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Customer.countDocuments(filter);

      res.json({ success: true, customers, total });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Get Single Customer Details and Repair History
   * GET /api/admin/customers/:id
   */
  async getCustomerById(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const customer = await Customer.findById(id).populate('shopId', 'name phone address');
      if (!customer) {
        res.status(404).json({ success: false, message: 'Customer not found' });
        return;
      }

      const orders = await Order.find({ customerId: customer._id })
        .populate('assignedTechnicianId', 'name phone')
        .sort({ createdAt: -1 });

      res.json({ success: true, customer, orders });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * List All Orders Across All Shops (with prominent Customer Issue)
   * GET /api/admin/orders
   */
  async getOrders(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { shopId, status, deviceType, search, limit = 50, page = 1 } = req.query;
      const filter: any = {};

      if (shopId && shopId !== 'all') {
        filter.shopId = shopId;
      }
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (deviceType && deviceType !== 'all') {
        filter.deviceType = deviceType;
      }
      if (search && typeof search === 'string') {
        const regex = { $regex: search.trim(), $options: 'i' };
        filter.$or = [
          { jobId: regex },
          { brand: regex },
          { model: regex },
          { 'customerSnapshot.name': regex },
          { 'customerSnapshot.phone': regex },
          { problemDescription: regex }, // Customer issue search!
        ];
      }

      const orders = await Order.find(filter)
        .populate('shopId', 'name phone address')
        .populate('assignedTechnicianId', 'name phone')
        .sort({ createdAt: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit);

      const total = await Order.countDocuments(filter);

      res.json({ success: true, orders, total });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Get Single Order Details
   * GET /api/admin/orders/:id
   */
  async getOrderById(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await Order.findById(id)
        .populate('shopId', 'name phone address')
        .populate('assignedTechnicianId', 'name phone')
        .populate('customerId');

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      // Also fetch technicians for this order's shop for easy reassignment
      const availableTechnicians = await User.find({
        shopId: order.shopId,
        role: { $in: ['technician', 'owner', 'staff'] },
      }).select('name phone role isActive');

      res.json({ success: true, order, availableTechnicians });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Update Order Status
   * PATCH /api/admin/orders/:id/status
   */
  async updateOrderStatus(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['pending', 'in_progress', 'parts_delayed', 'repaired', 'delivered', 'canceled'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid status' });
        return;
      }

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      order.status = status;
      if (status === 'delivered') {
        order.dates.deliveredAt = new Date();
      }
      await order.save();

      const populated = await Order.findById(id)
        .populate('shopId', 'name')
        .populate('assignedTechnicianId', 'name phone');

      res.json({ success: true, order: populated });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Reassign Technician to Order
   * PATCH /api/admin/orders/:id/assign
   */
  async assignTechnician(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { technicianId } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      if (technicianId) {
        const tech = await User.findById(technicianId);
        if (!tech) {
          res.status(404).json({ success: false, message: 'Technician not found' });
          return;
        }
        order.assignedTechnicianId = tech._id;
      } else {
        order.assignedTechnicianId = undefined;
      }

      await order.save();

      const populated = await Order.findById(id)
        .populate('shopId', 'name')
        .populate('assignedTechnicianId', 'name phone');

      res.json({ success: true, order: populated });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Add Payment to Order
   * POST /api/admin/orders/:id/payments
   */
  async addOrderPayment(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, mode = 'cash', transactionRef } = req.body;

      const payAmount = Number(amount);
      if (!payAmount || payAmount <= 0) {
        res.status(400).json({ success: false, message: 'Valid payment amount is required' });
        return;
      }

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      order.payments.push({
        amount: payAmount,
        mode,
        transactionRef,
        paidAt: new Date(),
      });

      const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
      order.cost.advancePaid = totalPaid;
      order.cost.due = Math.max(0, order.cost.final - totalPaid);

      await order.save();

      res.json({ success: true, order });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Revenue Analytics
   * GET /api/admin/revenue/analytics
   */
  async getRevenueAnalytics(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { shopId } = req.query;
      const matchStage: any = {};
      if (shopId && shopId !== 'all') {
        matchStage.shopId = new mongoose.Types.ObjectId(shopId as string);
      }

      const [overallFinance, revenueByShop, paymentsByMode, statusFinancials] = await Promise.all([
        Order.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$cost.advancePaid' },
              totalDues: { $sum: '$cost.due' },
              totalGrossValue: { $sum: '$cost.final' },
              ordersCount: { $sum: 1 },
            },
          },
        ]),
        Order.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$shopId',
              revenue: { $sum: '$cost.advancePaid' },
              dues: { $sum: '$cost.due' },
              ordersCount: { $sum: 1 },
            },
          },
          { $sort: { revenue: -1 } },
          {
            $lookup: {
              from: 'shops',
              localField: '_id',
              foreignField: '_id',
              as: 'shop',
            },
          },
          { $unwind: '$shop' },
          {
            $project: {
              shopId: '$_id',
              shopName: '$shop.name',
              ownerName: '$shop.ownerName',
              plan: '$shop.subscription.plan',
              revenue: 1,
              dues: 1,
              ordersCount: 1,
            },
          },
        ]),
        Order.aggregate([
          { $match: matchStage },
          { $unwind: '$payments' },
          {
            $group: {
              _id: '$payments.mode',
              totalAmount: { $sum: '$payments.amount' },
              count: { $sum: 1 },
            },
          },
        ]),
        Order.aggregate([
          { $match: matchStage },
          {
            $group: {
              _id: '$status',
              revenue: { $sum: '$cost.advancePaid' },
              dues: { $sum: '$cost.due' },
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      res.json({
        success: true,
        data: {
          summary: overallFinance[0] || { totalRevenue: 0, totalDues: 0, totalGrossValue: 0, ordersCount: 0 },
          revenueByShop,
          paymentsByMode,
          statusFinancials,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Delete Shop
   * DELETE /api/admin/shops/:id
   */
  async deleteShop(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const shop = await Shop.findByIdAndDelete(id);
      if (!shop) {
        res.status(404).json({ success: false, message: 'Shop not found' });
        return;
      }

      // Clean up users and orders linked to this shop
      await Promise.all([
        User.deleteMany({ shopId: id }),
        Order.deleteMany({ shopId: id }),
        Customer.deleteMany({ shopId: id }),
        Expense.deleteMany({ shopId: id }),
        Notification.deleteMany({ targetShopId: id }),
      ]);

      res.json({ success: true, message: `Shop "${shop.name}" and associated records removed.` });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Edit Order Details
   * PUT /api/admin/orders/:id
   */
  async editOrder(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        brand,
        model,
        problemDescription,
        deviceType,
        serialOrImei,
        passcodePattern,
        status,
        cost,
        assignedTechnicianId,
      } = req.body;

      const order = await Order.findById(id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      if (brand) order.brand = brand.trim();
      if (model) order.model = model.trim();
      if (problemDescription) order.problemDescription = problemDescription.trim();
      if (deviceType) order.deviceType = deviceType;
      if (serialOrImei !== undefined) order.serialOrImei = serialOrImei?.trim();
      if (passcodePattern !== undefined) order.passcodePattern = passcodePattern?.trim();
      if (status) order.status = status;
      if (assignedTechnicianId !== undefined) {
        order.assignedTechnicianId = assignedTechnicianId ? new mongoose.Types.ObjectId(assignedTechnicianId) : undefined;
      }

      if (cost) {
        const est = cost.estimated !== undefined ? Number(cost.estimated) : order.cost.estimated;
        const fin = cost.final !== undefined ? Number(cost.final) : order.cost.final;
        const adv = cost.advancePaid !== undefined ? Number(cost.advancePaid) : order.cost.advancePaid;
        order.cost = {
          estimated: est,
          final: fin,
          advancePaid: adv,
          due: Math.max(0, fin - adv),
        };
      }

      await order.save();

      const populated = await Order.findById(id)
        .populate('shopId', 'name phone address')
        .populate('assignedTechnicianId', 'name phone')
        .populate('customerId');

      res.json({ success: true, order: populated });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Delete Order
   * DELETE /api/admin/orders/:id
   */
  async deleteOrder(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const order = await Order.findByIdAndDelete(id);
      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }
      res.json({ success: true, message: `Order ${order.jobId} deleted successfully.` });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * List Notifications
   * GET /api/admin/notifications
   */
  async getNotifications(req: AdminRequest, res: Response): Promise<void> {
    try {
      const notifications = await Notification.find()
        .populate('targetShopId', 'name phone address')
        .sort({ createdAt: -1 });

      res.json({ success: true, notifications });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Create Broadcast or Targeted Notification
   * POST /api/admin/notifications
   */
  async createNotification(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { title, message, type = 'broadcast', targetShopId, priority = 'info' } = req.body;

      if (!title || !message) {
        res.status(400).json({ success: false, message: 'Title and message are required' });
        return;
      }

      const notif = await Notification.create({
        title: title.trim(),
        message: message.trim(),
        type: type === 'direct' && targetShopId ? 'direct' : 'broadcast',
        targetShopId: type === 'direct' && targetShopId ? targetShopId : undefined,
        priority: priority || 'info',
      });

      const populated = await Notification.findById(notif._id).populate('targetShopId', 'name phone address');

      res.status(201).json({ success: true, notification: populated });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Delete Notification
   * DELETE /api/admin/notifications/:id
   */
  async deleteNotification(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notif = await Notification.findByIdAndDelete(id);
      if (!notif) {
        res.status(404).json({ success: false, message: 'Notification not found' });
        return;
      }
      res.json({ success: true, message: 'Notification deleted successfully.' });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },

  /**
   * Trigger Database Seed
   * POST /api/admin/seed
   */
  async seedData(req: AdminRequest, res: Response): Promise<void> {
    try {
      const { force = false } = req.body;
      const result = await seedMultiTenantData(Boolean(force));
      res.json({ success: true, ...result });
    } catch (error) {
      res.status(500).json({ success: false, message: (error as Error).message });
    }
  },
};
