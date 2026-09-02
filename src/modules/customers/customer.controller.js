const { Customer } = require('../../models/Customer');
const { Order } = require('../../models/Order');

const customerController = {
  async listOrSearch(req, res) {
    const { search, dateRange, startDate, endDate, from, to, limit = 50, page = 1 } = req.query;
    const query = { shopId: req.user.shopId };

    // Date range filtering
    const now = new Date();
    let dateFilterStart = null;
    let dateFilterEnd = null;

    if (dateRange === 'today') {
      dateFilterStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      dateFilterEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (dateRange === 'week') {
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
      query.createdAt = {};
      if (dateFilterStart) query.createdAt.$gte = dateFilterStart;
      if (dateFilterEnd) query.createdAt.$lte = dateFilterEnd;
    }

    if (search && typeof search === 'string') {
      const trimmed = search.trim();
      query.$or = [
        { phone: { $regex: trimmed, $options: 'i' } },
        { name: { $regex: trimmed, $options: 'i' } },
      ];
    }

    const customers = await Customer.find(query)
      .sort({ updatedAt: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const total = await Customer.countDocuments(query);

    res.json({ success: true, customers, total });
  },

  async create(req, res) {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone are required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // If customer already exists for this shop, update info
    let customer = await Customer.findOne({ shopId: req.user.shopId, phone: cleanPhone });
    if (customer) {
      customer.name = name.trim();
      if (email) customer.email = email.trim();
      if (address) customer.address = address.trim();
      await customer.save();
    } else {
      customer = await Customer.create({
        shopId: req.user.shopId,
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim(),
        address: address?.trim() || '',
      });
    }

    res.status(201).json({ success: true, customer });
  },

  async getDetails(req, res) {
    const { id } = req.params;
    const customer = await Customer.findOne({ _id: id, shopId: req.user.shopId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const orders = await Order.find({ shopId: req.user.shopId, customerId: customer._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, customer, orders });
  },
};

module.exports = { customerController };
