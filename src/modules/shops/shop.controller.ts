import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { Shop } from '../../models/Shop';
import { User } from '../../models/User';

export const shopController = {
  async getProfile(req: AuthRequest, res: Response): Promise<void> {
    const shop = await Shop.findById(req.user!.shopId);
    if (!shop) {
      res.status(404).json({ success: false, message: 'Shop not found' });
      return;
    }
    res.json({ success: true, shop });
  },

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    const { name, ownerName, phone, address, settings } = req.body;
    const shop = await Shop.findByIdAndUpdate(
      req.user!.shopId,
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
    res.json({ success: true, shop });
  },

  async getStaff(req: AuthRequest, res: Response): Promise<void> {
    const staff = await User.find({ shopId: req.user!.shopId }).select('-__v');
    res.json({ success: true, staff });
  },

  async addStaff(req: AuthRequest, res: Response): Promise<void> {
    const { name, phone, role } = req.body;
    if (!name || !phone) {
      res.status(400).json({ success: false, message: 'Name and phone are required' });
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);
    const existing = await User.findOne({ shopId: req.user!.shopId, phone: cleanPhone });
    if (existing) {
      res.status(400).json({ success: false, message: 'Staff member already registered in this shop' });
      return;
    }

    const newStaff = await User.create({
      shopId: req.user!.shopId,
      name: name.trim(),
      phone: cleanPhone,
      role: role || 'technician',
      isActive: true,
    });

    res.status(201).json({ success: true, staff: newStaff });
  },
};
