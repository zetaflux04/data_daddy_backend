const { User } = require('../models/User');
const { Shop } = require('../models/Shop');
const { RepairGuide } = require('../models/RepairGuide');

const seedTestUser = async () => {
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

    // Seed guides if empty
    const guideCount = await RepairGuide.countDocuments();
    if (guideCount === 0) {
      await RepairGuide.insertMany([
        {
          title: 'iPhone 13 / 13 Pro OLED Screen Replacement & True Tone Transfer',
          brand: 'Apple',
          model: 'iPhone 13',
          problemCategory: 'display',
          summary: 'Complete guide to safely removing the broken OLED panel, transferring the proximity sensor flex, and reprogramming True Tone using JC V1S programmer.',
          difficulty: 'medium',
          isPremium: true,
          steps: [
            { stepNumber: 1, title: 'Heat & Pentalobe Screws', description: 'Remove bottom 2x P2 Pentalobe screws. Heat display perimeter at 75°C for 2 minutes.' },
            { stepNumber: 2, title: 'Opening Left Side Caution', description: 'Pry open gently from right side like a book. CAUTION: Display flex cables are on the left side!' },
            { stepNumber: 3, title: 'Disconnect Battery First', description: 'Always disconnect battery connector first to avoid blowing the backlight / OLED diode on the logic board.' },
            { stepNumber: 4, title: 'Sensor Flex Transfer', description: 'Carefully heat and transfer the microphone/proximity sensor assembly to the new screen without tearing the ribbon.' },
          ],
        },
        {
          title: 'Samsung Galaxy S22 5G Battery & USB-C Sub-board Replacement',
          brand: 'Samsung',
          model: 'Galaxy S22',
          problemCategory: 'battery',
          summary: 'Safe disassembly of glass back, thermal adhesive release with isopropyl alcohol (IPA), and sub-board replacement for slow charging or no fast charge issues.',
          difficulty: 'medium',
          isPremium: true,
          steps: [
            { stepNumber: 1, title: 'Back Glass Removal', description: 'Heat back glass to 80°C. Use thin suction cup and plastic pry cards with IPA to slice adhesive.' },
            { stepNumber: 2, title: 'Wireless Charging Coil & Bracket', description: 'Remove 16x Phillips #00 screws and unclip the plastic midframe and wireless charging coil.' },
            { stepNumber: 3, title: 'Battery Extraction', description: 'Apply 99% IPA around battery perimeter. Wait 1 min for adhesive to soften. Pry out with flat plastic tool. DO NOT puncture battery.' },
          ],
        },
        {
          title: 'Dell XPS 15 9500 No Power / 19V Motherboard Short Diagnosis',
          brand: 'Dell',
          model: 'XPS 15 9500',
          problemCategory: 'motherboard',
          summary: 'Step-by-step multimeter board tracing for 19V rail short circuit, testing charging MOSFETs and replacing bad ceramic decoupling capacitor.',
          difficulty: 'expert',
          isPremium: true,
          steps: [
            { stepNumber: 1, title: 'Visual & Thermal Check', description: 'Inspect motherboard with thermal camera or alcohol mist while applying 1V 1A to 19V main rail.' },
            { stepNumber: 2, title: 'Measuring First & Second MOSFETs', description: 'Check resistance between Gate, Drain, and Source of input charging MOSFETs.' },
            { stepNumber: 3, title: 'Replace Shorted Capacitor', description: 'Use hot air station at 380°C to lift the shorted 10uF 25V 0805 capacitor. Retest diode mode.' },
          ],
        },
      ]);
      console.log('🌱 Initial repair guides seeded into MongoDB');
    }
  } catch (error) {
    console.warn('⚠️ Seeding warning:', error.message);
  }
};

module.exports = { seedTestUser };
