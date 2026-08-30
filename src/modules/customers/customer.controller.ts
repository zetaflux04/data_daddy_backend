import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { Customer } from '../../models/Customer';
import { Order } from '../../models/Order';

export const customerController = {
  async listOrSearch(req: AuthRequest, res: Response): Promise<void> {
    const { search, limit = 50, page = 1 } = req.query;
    const query: any = { shopId: req.user!.shopId };

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

  async create(req: AuthRequest, res: Response): Promise<void> {
    const { name, phone, email, address } = req.body;
    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone are required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // If customer already exists for this shop, update info
    let customer = await Customer.findOne({ shopId: req.user!.shopId, phone: cleanPhone });
    if (customer) {
      customer.name = name.trim();
      if (email) customer.email = email.trim();
      if (address) customer.address = address.trim();
      await customer.save();
    } else {
      customer = await Customer.create({
        shopId: req.user!.shopId,
        name: name.trim(),
        phone: cleanPhone,
        email: email?.trim(),
        address: address?.trim() || '',
      });
    }

    res.status(201).json({ success: true, customer });
  },

  async getDetails(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const customer = await Customer.findOne({ _id: id, shopId: req.user!.shopId });
    if (!customer) {
      res.status(404).json({ success: false, message: 'Customer not found' });
      return;
    }

    const orders = await Order.find({ shopId: req.user!.shopId, customerId: customer._id })
      .sort({ createdAt: -1 });

    res.json({ success: true, customer, orders });
  },
};
