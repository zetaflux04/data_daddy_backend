const mongoose = require('mongoose');
const { Shop } = require('../../models/Shop');
const { User } = require('../../models/User');

const shopController = {
  async getProfile(req, res) {
    try {
      const shop = await Shop.findById(req.user.shopId);
      if (!shop) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }
      return res.json({ success: true, shop });
    } catch (error) {
      console.error('getProfile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async updateProfile(req, res) {
    try {
      const { name, ownerName, phone, address, settings, logoUrl } = req.body;

      const existingShop = await Shop.findById(req.user.shopId);
      if (!existingShop) {
        return res.status(404).json({ success: false, message: 'Shop not found' });
      }

      let formattedAddress = address;
      if (typeof address === 'string') {
        formattedAddress = { street: address.trim(), city: '', state: '', pincode: '' };
      }

      const cleanPhone = phone ? phone.replace(/\D/g, '').slice(-10) : undefined;

      if (name) existingShop.name = name.trim();
      if (ownerName) existingShop.ownerName = ownerName.trim();
      if (cleanPhone) existingShop.phone = cleanPhone;
      if (formattedAddress !== undefined) existingShop.address = formattedAddress;
      if (logoUrl !== undefined) existingShop.logoUrl = logoUrl;
      if (settings) {
        existingShop.settings = {
          currency: settings.currency || existingShop.settings.currency || 'INR',
          smsNotificationsEnabled:
            settings.smsNotificationsEnabled !== undefined
              ? settings.smsNotificationsEnabled
              : existingShop.settings.smsNotificationsEnabled,
          nextJobNumber: existingShop.settings.nextJobNumber || 1001,
        };
      }

      await existingShop.save();

      // Also update owner User name & phone & avatarUrl if provided
      if (ownerName || cleanPhone || logoUrl) {
        await User.findByIdAndUpdate(req.user.userId, {
          ...(ownerName && { name: ownerName.trim() }),
          ...(cleanPhone && { phone: cleanPhone }),
          ...(logoUrl && { avatarUrl: logoUrl }),
        });
      }

      return res.json({ success: true, shop: existingShop });
    } catch (error) {
      console.error('updateProfile error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async getStaff(req, res) {
    try {
      const staff = await User.find({ shopId: req.user.shopId }).select('-__v');
      return res.json({ success: true, staff });
    } catch (error) {
      console.error('getStaff error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async addStaff(req, res) {
    try {
      const { name, phone, role } = req.body;
      if (!name || !phone) {
        return res.status(400).json({ success: false, message: 'Name and phone are required' });
      }

      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const existing = await User.findOne({ shopId: req.user.shopId, phone: cleanPhone });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Staff member already registered in this shop' });
      }

      const newStaff = await User.create({
        shopId: req.user.shopId,
        name: name.trim(),
        phone: cleanPhone,
        role: role || 'technician',
        isActive: true,
      });

      return res.status(201).json({ success: true, staff: newStaff });
    } catch (error) {
      console.error('addStaff error:', error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteStaff(req, res) {
    try {
      const { id } = req.params;
      if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Valid technician ID is required' });
      }

      const target = await User.findOne({ _id: id, shopId: req.user.shopId });
      if (!target) {
        return res.status(404).json({ success: false, message: 'Technician not found' });
      }

      if (target.role === 'owner') {
        return res.status(403).json({ success: false, message: 'Shop owner cannot be deleted' });
      }

      await User.deleteOne({ _id: id, shopId: req.user.shopId });
      return res.json({ success: true, message: 'Technician deleted successfully' });
    } catch (error) {
      console.error('deleteStaff error:', error);
      return res.status(500).json({ success: false, message: 'Server error while deleting technician: ' + error.message });
    }
  },
};

module.exports = { shopController };
