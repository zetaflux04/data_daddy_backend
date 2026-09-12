const { Order } = require('../../models/Order');
const { Shop } = require('../../models/Shop');
const { Customer } = require('../../models/Customer');
const { enqueueSmsNotification } = require('../../queue/smsQueue');
const mongoose = require('mongoose');

const orderController = {
  /**
   * Create New Job Card
   * POST /api/orders
   */
  async create(req, res) {
    const {
      customerId,
      customerName,
      customerPhone,
      orderType = 'repair',
      // Repair fields
      deviceType,
      brand,
      model,
      serialOrImei,
      passcodePattern,
      problemDescription,
      photos,
      // Accessory fields
      productName,
      productPrice,
      productImage,
      // Common fields
      estimatedCost = 0,
      advancePaid = 0,
      paymentMode = 'cash',
      assignedTechnicianId,
      promisedDeliveryAt,
    } = req.body;

    const hasRepairFields = !!(brand?.trim() || model?.trim() || problemDescription?.trim());
    const hasAccessoryFields = !!(productName?.trim() || (productPrice !== undefined && productPrice !== null && productPrice !== '' && Number(productPrice) > 0));

    if (orderType === 'accessory' && hasRepairFields) {
      res.status(400).json({ success: false, message: 'Accessory orders cannot include repair device details' });
      return;
    }
    if (orderType === 'repair' && hasAccessoryFields) {
      res.status(400).json({ success: false, message: 'Repair orders cannot include accessory product details' });
      return;
    }

    // Validate based on order type
    if (orderType === 'accessory') {
      if (!productName || !productName.trim()) {
        res.status(400).json({ success: false, message: 'Product name is required for accessory orders' });
        return;
      }
    } else {
      // Repair order validation
      if (!brand || !model || !problemDescription) {
        res.status(400).json({ success: false, message: 'Brand, Model, and Problem Description are required' });
        return;
      }
    }

    const shopId = req.user.shopId;
    const shop = await Shop.findById(shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'Shop not found' });
      return;
    }

    // Resolve Customer
    let resolvedCustomer;
    if (customerId) {
      resolvedCustomer = await Customer.findOne({ _id: customerId, shopId });
    }

    if (!resolvedCustomer && customerPhone && customerName) {
      const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
      resolvedCustomer = await Customer.findOne({ shopId, phone: cleanPhone });
      if (!resolvedCustomer) {
        resolvedCustomer = await Customer.create({
          shopId,
          name: customerName.trim(),
          phone: cleanPhone,
        });
      }
    }

    if (!resolvedCustomer) {
      res.status(400).json({ success: false, message: 'Customer details (name & phone) are required' });
      return;
    }

    // Generate atomic unique sequential Job/Sale ID: ACC- for accessory, JOB- for repair
    let jobId;
    if (orderType === 'accessory') {
      let nextNum = shop.settings.nextAccessoryNumber || 1001;
      while (await Order.exists({ shopId, jobId: `ACC-${nextNum}` })) {
        nextNum += 1;
      }
      jobId = `ACC-${nextNum}`;
      shop.settings.nextAccessoryNumber = nextNum + 1;
      await shop.save();
    } else {
      let nextNum = shop.settings.nextJobNumber || 1001;
      while (await Order.exists({ shopId, jobId: `JOB-${nextNum}` })) {
        nextNum += 1;
      }
      jobId = `JOB-${nextNum}`;
      shop.settings.nextJobNumber = nextNum + 1;
      await shop.save();
    }

    // Increment customer orders count
    resolvedCustomer.totalOrdersCount += 1;
    await resolvedCustomer.save();

    // Cost calculations
    let finalCost = 0;
    let advance = 0;
    let due = 0;
    const payments = [];

    if (orderType === 'accessory') {
      finalCost = Number(productPrice || 0);
      advance = finalCost; // Accessories are 100% paid immediately upon sale
      due = 0;
      if (finalCost > 0) {
        payments.push({
          amount: finalCost,
          mode: paymentMode || 'cash',
          paidAt: new Date(),
        });
      }
    } else {
      finalCost = Number(estimatedCost);
      advance = Number(advancePaid);
      if (advance > finalCost) {
        res.status(400).json({ success: false, message: 'Advance payment cannot exceed the estimated price' });
        return;
      }
      due = Math.max(0, finalCost - advance);
      if (advance > 0) {
        payments.push({
          amount: advance,
          mode: paymentMode || 'cash',
          paidAt: new Date(),
        });
      }
    }

    // Build order data
    const orderData = {
      shopId,
      jobId,
      customerId: resolvedCustomer._id,
      customerSnapshot: {
        name: resolvedCustomer.name,
        phone: resolvedCustomer.phone,
      },
      orderType,
      status: orderType === 'accessory' ? 'delivered' : 'pending',
      cost: {
        estimated: finalCost,
        final: finalCost,
        advancePaid: advance,
        due,
      },
      payments,
      smsLogs: [],
      dates: {
        receivedAt: new Date(),
        promisedDeliveryAt: promisedDeliveryAt ? new Date(promisedDeliveryAt) : undefined,
        deliveredAt: orderType === 'accessory' ? new Date() : undefined,
      },
      invoice: {
        invoiceNumber: `INV-${jobId}`,
        issuedAt: new Date(),
      },
      createdBy: req.user.userId,
    };

    // Add type-specific fields
    if (orderType === 'accessory') {
      orderData.productName = productName.trim();
      orderData.productPrice = Number(productPrice || 0);
      const singleImage = typeof productImage === 'string' ? productImage.trim() : (productImage?.url || (Array.isArray(photos) ? photos[0] : ''));
      if (singleImage) {
        orderData.productImage = singleImage;
        orderData.photos = [singleImage];
      }
    } else {
      orderData.deviceType = deviceType || 'mobile';
      orderData.brand = brand.trim();
      orderData.model = model.trim();
      orderData.serialOrImei = serialOrImei?.trim();
      orderData.passcodePattern = passcodePattern?.trim();
      orderData.problemDescription = problemDescription.trim();
      orderData.assignedTechnicianId = assignedTechnicianId || undefined;
      // Handle photos (array of up to 5 image URLs or S3 keys)
      if (Array.isArray(photos)) {
        orderData.photos = photos.slice(0, 5).filter(Boolean);
      } else if (photos && typeof photos === 'string') {
        orderData.photos = [photos];
      }
    }

    const order = await Order.create(orderData);

    // Enqueue "Order Received" SMS notification via Fast2SMS (only for repairs)
    if (orderType === 'repair' && shop.settings.smsNotificationsEnabled) {
      await enqueueSmsNotification({
        orderId: order._id.toString(),
        phone: resolvedCustomer.phone,
        type: 'order_received',
        jobId,
        customerName: resolvedCustomer.name,
        shopName: shop.name,
        shopPhone: shop.phone,
      });
    }

    res.status(201).json({ success: true, order });
  },

  /**
   * List or Filter Orders
   * GET /api/orders?status=pending&search=...
   */
  async list(req, res) {
    const { customerId, status, search, orderType, dateRange, startDate, endDate, from, to, limit = 50, page = 1 } = req.query;
    const shopId = req.user.shopId;
    const filter = { shopId };

    if (customerId) {
      filter.customerId = customerId;
    }

    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        filter.status = { $in: status.filter((s) => s && s !== 'all') };
      } else if (typeof status === 'string') {
        const statuses = status.split(',').map((s) => s.trim()).filter((s) => s && s !== 'all');
        if (statuses.length > 1) {
          filter.status = { $in: statuses };
        } else if (statuses.length === 1) {
          filter.status = statuses[0];
        }
      }
    }

    if (orderType && typeof orderType === 'string' && orderType !== 'all') {
      filter.orderType = orderType;
    }

    // Date range filtering
    const now = new Date();
    let dateFilterStart = null;
    let dateFilterEnd = null;

    if (dateRange === 'today') {
      dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      dateFilterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'week') {
      // Start of current week (Monday)
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      dateFilterStart = new Date(now.setDate(diff));
      dateFilterStart.setHours(0, 0, 0, 0);
      dateFilterEnd = new Date();
      dateFilterEnd.setHours(23, 59, 59, 999);
    } else if (dateRange === 'month') {
      dateFilterStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      dateFilterEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (dateRange === 'year') {
      dateFilterStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      dateFilterEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (dateRange === 'custom' || startDate || from) {
      const s = startDate || from;
      const e = endDate || to;
      if (s) {
        dateFilterStart = new Date(s);
        dateFilterStart.setHours(0, 0, 0, 0);
      }
      if (e) {
        dateFilterEnd = new Date(e);
        dateFilterEnd.setHours(23, 59, 59, 999);
      }
    }

    if (dateFilterStart || dateFilterEnd) {
      filter.createdAt = {};
      if (dateFilterStart) filter.createdAt.$gte = dateFilterStart;
      if (dateFilterEnd) filter.createdAt.$lte = dateFilterEnd;
    }

    if (search && typeof search === 'string') {
      const regex = { $regex: search.trim(), $options: 'i' };
      filter.$or = [
        { jobId: regex },
        { brand: regex },
        { model: regex },
        { productName: regex },
        { 'customerSnapshot.name': regex },
        { 'customerSnapshot.phone': regex },
      ];
    }

    const orders = await Order.find(filter)
      .populate('assignedTechnicianId', 'name phone')
      .sort({ createdAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Order.countDocuments(filter);

    res.json({ success: true, orders, total });
  },

  /**
   * Get Single Order
   * GET /api/orders/:id
   */
  async getOne(req, res) {
    const id = req.params.id;
    const filter = { shopId: req.user.shopId };

    if (mongoose.Types.ObjectId.isValid(id)) {
      filter._id = id;
    } else {
      filter.jobId = id;
    }

    const order = await Order.findOne(filter)
      .populate('assignedTechnicianId', 'name phone')
      .populate('customerId', 'name phone email address');

    if (!order) {
      res.status(404).json({ success: false, message: 'Job card not found' });
      return;
    }

    res.json({ success: true, order });
  },

  /**
   * Get Public Invoice (No auth required, for customer scanning QR code)
   * GET /api/orders/public/:id
   */
  async getPublicInvoice(req, res) {
    try {
      const id = req.params.id;
      const filter = {};

      if (mongoose.Types.ObjectId.isValid(id)) {
        filter._id = id;
      } else {
        filter.$or = [{ jobId: id }, { 'invoice.invoiceNumber': id }];
      }

      const order = await Order.findOne(filter)
        .populate('shopId', 'name phone email address gstin logo ownerName')
        .populate('assignedTechnicianId', 'name phone')
        .populate('customerId', 'name phone email address');

      if (!order) {
        res.status(404).json({ success: false, message: 'Invoice not found' });
        return;
      }

      res.json({ success: true, order });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  /**
   * Update Existing Job Card / Sale
   * PUT /api/orders/:id
   */
  async update(req, res) {
    const { id } = req.params;
    const shopId = req.user.shopId;

    const order = await Order.findOne({ _id: id, shopId });
    if (!order) {
      res.status(404).json({ success: false, message: 'Job card not found' });
      return;
    }

    const {
      customerName,
      customerPhone,
      orderType,
      // Repair fields
      deviceType,
      brand,
      model,
      serialOrImei,
      passcodePattern,
      problemDescription,
      photos,
      assignedTechnicianId,
      promisedDeliveryAt,
      // Accessory fields
      productName,
      productPrice,
      productImage,
      // Financials
      estimatedCost,
      advancePaid,
      paymentMode,
    } = req.body;

    // Update customer snapshot & linked Customer model
    if (customerName || customerPhone) {
      if (customerName) order.customerSnapshot.name = customerName.trim();
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
        order.customerSnapshot.phone = cleanPhone;
      }
      if (order.customerId) {
        await Customer.updateOne(
          { _id: order.customerId, shopId },
          {
            ...(customerName && { name: customerName.trim() }),
            ...(customerPhone && { phone: customerPhone.replace(/\D/g, '').slice(-10) }),
          }
        );
      }
    }

    if (orderType && orderType !== order.orderType) {
      res.status(400).json({ success: false, message: 'Order type cannot be changed after creation' });
      return;
    }

    const currentOrderType = order.orderType || 'repair';

    if (currentOrderType === 'accessory') {
      if (productName !== undefined) order.productName = productName.trim();
      if (productPrice !== undefined) {
        const priceNum = Number(productPrice) || 0;
        order.productPrice = priceNum;
        order.cost.estimated = priceNum;
        order.cost.final = priceNum;
        order.cost.advancePaid = priceNum;
        order.cost.due = 0;
        if (order.payments && order.payments.length > 0) {
          order.payments[0].amount = priceNum;
          if (paymentMode) order.payments[0].mode = paymentMode;
        } else if (priceNum > 0) {
          order.payments = [{
            amount: priceNum,
            mode: paymentMode || 'cash',
            paidAt: new Date(),
          }];
        }
      }
      if (productImage !== undefined) {
        const singleImage = typeof productImage === 'string' ? productImage.trim() : (productImage?.url || '');
        order.productImage = singleImage || undefined;
        order.photos = singleImage ? [singleImage] : [];
      } else if (photos !== undefined) {
        const singleImage = Array.isArray(photos) ? (photos[0] || '') : (typeof photos === 'string' ? photos : '');
        order.productImage = singleImage || undefined;
        order.photos = singleImage ? [singleImage] : [];
      }
    } else {
      // Repair fields
      if (deviceType !== undefined) order.deviceType = deviceType;
      if (brand !== undefined) order.brand = brand.trim();
      if (model !== undefined) order.model = model.trim();
      if (serialOrImei !== undefined) order.serialOrImei = serialOrImei?.trim();
      if (passcodePattern !== undefined) order.passcodePattern = passcodePattern?.trim();
      if (problemDescription !== undefined) order.problemDescription = problemDescription.trim();
      if (photos !== undefined) {
        if (Array.isArray(photos)) {
          order.photos = photos.slice(0, 5).filter(Boolean);
        } else if (typeof photos === 'string') {
          order.photos = [photos];
        }
      }
      if (assignedTechnicianId !== undefined) {
        order.assignedTechnicianId = assignedTechnicianId || undefined;
      }
      if (promisedDeliveryAt !== undefined) {
        order.dates.promisedDeliveryAt = promisedDeliveryAt ? new Date(promisedDeliveryAt) : undefined;
      }

      // Cost recalculations
      if (estimatedCost !== undefined || advancePaid !== undefined) {
        const newEstimated = estimatedCost !== undefined ? Number(estimatedCost) : (order.cost.estimated || 0);
        const newAdvance = advancePaid !== undefined ? Number(advancePaid) : (order.cost.advancePaid || 0);

        if (newAdvance > newEstimated) {
          res.status(400).json({ success: false, message: 'Advance payment cannot exceed the estimated price' });
          return;
        }

        order.cost.estimated = newEstimated;
        order.cost.final = newEstimated;
        order.cost.advancePaid = newAdvance;
        order.cost.due = Math.max(0, newEstimated - newAdvance);

        if (order.payments && order.payments.length > 0) {
          order.payments[0].amount = newAdvance;
          if (paymentMode) order.payments[0].mode = paymentMode;
        } else if (newAdvance > 0) {
          order.payments = [{
            amount: newAdvance,
            mode: paymentMode || 'cash',
            paidAt: new Date(),
          }];
        }
      }
    }

    await order.save();
    await order.populate('assignedTechnicianId', 'name phone');
    await order.populate('customerId', 'name phone email address');

    res.json({ success: true, order });
  },

  /**
   * Update Status (triggers Fast2SMS where applicable)
   * PATCH /api/orders/:id/status
   * Body: { status: "repaired" | "delivered" | "unrepairable" | ... }
   */
  async updateStatus(req, res) {
    const { id } = req.params;
    const { status, serialOrImei, warranty, repairedBy, assignedTechnicianId, unrepairableReason, deliveryRemark } = req.body;

    const validStatuses = ['pending', 'in_progress', 'parts_delayed', 'repaired', 'delivered', 'unrepairable', 'canceled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const filter = { shopId: req.user.shopId };
    if (mongoose.Types.ObjectId.isValid(id)) {
      filter._id = id;
    } else {
      filter.jobId = id;
    }

    const order = await Order.findOne(filter);
    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const prevStatus = order.status;
    order.status = status;

    if (status === 'unrepairable') {
      const reason = String(unrepairableReason || '').trim();
      if (!reason) {
        res.status(400).json({ success: false, message: 'Unrepairable reason is required' });
        return;
      }
      order.unrepairableReason = reason;
    } else {
      order.unrepairableReason = undefined;
    }

    if (serialOrImei !== undefined && serialOrImei !== null) {
      order.serialOrImei = String(serialOrImei).trim();
    }

    if (warranty) {
      let expiresAt = undefined;
      const hasWarranty = !!warranty.hasWarranty;
      const period = warranty.period ? Number(warranty.period) : undefined;
      const unit = warranty.unit;

      if (hasWarranty && period && period > 0 && unit) {
        const d = new Date();
        if (unit === 'days') {
          d.setDate(d.getDate() + period);
        } else if (unit === 'months') {
          d.setMonth(d.getMonth() + period);
        } else if (unit === 'years') {
          d.setFullYear(d.getFullYear() + period);
        }
        expiresAt = d;
      }

      order.warranty = {
        hasWarranty,
        period,
        unit,
        expiresAt,
      };
    }

    if (status === 'delivered') {
      order.dates.deliveredAt = new Date();
      if (deliveryRemark !== undefined) {
        order.deliveryRemark = String(deliveryRemark).trim() || undefined;
      }
    }

    if (repairedBy) {
      const techId = repairedBy.id || repairedBy.userId;
      const isValidId = techId && mongoose.Types.ObjectId.isValid(techId);
      order.repairedBy = {
        userId: isValidId ? techId : undefined,
        name: repairedBy.name,
        role: repairedBy.role || 'technician',
      };
      if (isValidId) {
        order.assignedTechnicianId = techId;
      }
    } else if (assignedTechnicianId && mongoose.Types.ObjectId.isValid(assignedTechnicianId)) {
      order.assignedTechnicianId = assignedTechnicianId;
    }

    await order.save();
    await order.populate('assignedTechnicianId', 'name phone');

    // Trigger status SMS if enabled
    const shop = await Shop.findById(req.user.shopId);
    if (shop && shop.settings.smsNotificationsEnabled && prevStatus !== status) {
      if (status === 'repaired') {
        await enqueueSmsNotification({
          orderId: order._id.toString(),
          phone: order.customerSnapshot.phone,
          type: 'repaired',
          jobId: order.jobId,
          customerName: order.customerSnapshot.name,
          shopName: shop.name,
          shopPhone: shop.phone,
          amountDue: order.cost.due,
        });
      } else if (status === 'delivered') {
        await enqueueSmsNotification({
          orderId: order._id.toString(),
          phone: order.customerSnapshot.phone,
          type: 'delivered',
          jobId: order.jobId,
          customerName: order.customerSnapshot.name,
          shopName: shop.name,
          shopPhone: shop.phone,
        });
      }
    }

    res.json({ success: true, order });
  },

  /**
   * Add Payment
   * POST /api/orders/:id/payments
   * Body: { amount: 500, mode: "upi" | "cash" | "card", transactionRef?: string }
   */
  async addPayment(req, res) {
    const { id } = req.params;
    const { amount, mode = 'cash', transactionRef } = req.body;

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      res.status(400).json({ success: false, message: 'Valid payment amount is required' });
      return;
    }

    const order = await Order.findOne({ _id: id, shopId: req.user.shopId });
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

    // Recompute due
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    order.cost.advancePaid = totalPaid;
    order.cost.due = Math.max(0, order.cost.final - totalPaid);

    await order.save();
    await order.populate('assignedTechnicianId', 'name phone');

    res.json({ success: true, order });
  },
};

module.exports = { orderController };
