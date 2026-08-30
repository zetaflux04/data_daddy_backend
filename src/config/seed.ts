import { User } from '../models/User';
import { Shop } from '../models/Shop';

export const seedTestUser = async (): Promise<void> => {
  try {
    const testPhone = '9876543210';
    let user = await User.findOne({ phone: testPhone });
    let shop = null;

    if (user) {
      shop = await Shop.findById(user.shopId);
    }

    if (!shop) {
      shop = await Shop.findOne({ phone: testPhone });
      if (!shop) {
        shop = await Shop.create({
          name: 'OK-Repair Solutions',
          ownerName: 'Sunil Verma',
          phone: testPhone,
          address: { street: 'Shop #14, Main Market', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
          subscription: {
            plan: 'pro',
            status: 'active',
          },
          settings: {
            currency: 'INR',
            smsNotificationsEnabled: true,
            nextJobNumber: 1001,
          },
        });
        console.log('🌱 Test shop created for phone:', testPhone);
      }
    }

    if (!user) {
      user = await User.create({
        shopId: shop._id,
        name: 'Sunil Verma',
        phone: testPhone,
        role: 'owner',
        isActive: true,
      });
      console.log('🌱 Test user created for phone:', testPhone, 'with OTP 123456');
    }
  } catch (error) {
    console.warn('⚠️ Seeding test user warning:', (error as Error).message);
  }
};
