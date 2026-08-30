const { Shop } = require('../../models/Shop');
const { User } = require('../../models/User');
const { Customer } = require('../../models/Customer');
const { Order } = require('../../models/Order');
const { Expense } = require('../../models/Expense');

async function seedMultiTenantData(force = false) {
  const shopCount = await Shop.countDocuments();
  if (shopCount > 0 && !force) {
    return { message: 'Database already has data. Pass force=true to re-seed.' };
  }

  if (force) {
    await Promise.all([
      Shop.deleteMany({}),
      User.deleteMany({}),
      Customer.deleteMany({}),
      Order.deleteMany({}),
      Expense.deleteMany({}),
    ]);
  }

  // 1. Create Shops
  const shop1 = await Shop.create({
    name: 'OK-Repair Solutions',
    ownerName: 'Sunil Verma',
    phone: '9876543210',
    address: { street: 'Shop 14, Galaxy Market, Andheri East', city: 'Mumbai', state: 'Maharashtra', pincode: '400069' },
    subscription: { plan: 'pro', status: 'active', expiresAt: new Date(Date.now() + 86400000 * 180) },
    settings: { currency: 'INR', smsNotificationsEnabled: true, nextJobNumber: 1045 },
  });

  const shop2 = await Shop.create({
    name: 'TechZone Mobile & Laptop Care',
    ownerName: 'Deepak Patel',
    phone: '9822334455',
    address: { street: '42 Ring Road, Near Surat Station', city: 'Surat', state: 'Gujarat', pincode: '395003' },
    subscription: { plan: 'pro', status: 'active', expiresAt: new Date(Date.now() + 86400000 * 90) },
    settings: { currency: 'INR', smsNotificationsEnabled: true, nextJobNumber: 2028 },
  });

  const shop3 = await Shop.create({
    name: 'iFix Tech Lab',
    ownerName: 'Arun Krishnan',
    phone: '9744112233',
    address: { street: '88 100ft Road, Indiranagar', city: 'Bengaluru', state: 'Karnataka', pincode: '560038' },
    subscription: { plan: 'free', status: 'active' },
    settings: { currency: 'INR', smsNotificationsEnabled: true, nextJobNumber: 3012 },
  });

  const shop4 = await Shop.create({
    name: 'RapidFix Electronics',
    ownerName: 'Manoj Sharma',
    phone: '9911223344',
    address: { street: 'G-7 Nehru Place', city: 'New Delhi', state: 'Delhi', pincode: '110019' },
    subscription: { plan: 'pro', status: 'active', expiresAt: new Date(Date.now() + 86400000 * 300) },
    settings: { currency: 'INR', smsNotificationsEnabled: true, nextJobNumber: 4050 },
  });

  // 2. Create Owners & Technicians
  // Shop 1 Users
  const user1 = await User.create({ shopId: shop1._id, name: 'Sunil Verma', phone: '9876543210', role: 'owner', isActive: true });
  const tech1_1 = await User.create({ shopId: shop1._id, name: 'Rohan Deshmukh', phone: '9811002233', role: 'technician', isActive: true });
  const tech1_2 = await User.create({ shopId: shop1._id, name: 'Vikas Kadam', phone: '9822114455', role: 'technician', isActive: true });
  const staff1_1 = await User.create({ shopId: shop1._id, name: 'Sneha Patil', phone: '9833225566', role: 'staff', isActive: true });

  // Shop 2 Users
  const user2 = await User.create({ shopId: shop2._id, name: 'Deepak Patel', phone: '9822334455', role: 'owner', isActive: true });
  const tech2_1 = await User.create({ shopId: shop2._id, name: 'Jignesh Shah', phone: '9844336677', role: 'technician', isActive: true });
  const tech2_2 = await User.create({ shopId: shop2._id, name: 'Bhavesh Parmar', phone: '9855447788', role: 'technician', isActive: true });

  // Shop 3 Users
  const user3 = await User.create({ shopId: shop3._id, name: 'Arun Krishnan', phone: '9744112233', role: 'owner', isActive: true });
  const tech3_1 = await User.create({ shopId: shop3._id, name: 'Karthik Rao', phone: '9733221100', role: 'technician', isActive: true });

  // Shop 4 Users
  const user4 = await User.create({ shopId: shop4._id, name: 'Manoj Sharma', phone: '9911223344', role: 'owner', isActive: true });
  const tech4_1 = await User.create({ shopId: shop4._id, name: 'Amit Tyagi', phone: '9922334411', role: 'technician', isActive: true });

  // 3. Create Customers
  // Shop 1 Customers
  const c1_1 = await Customer.create({ shopId: shop1._id, name: 'Amit Sharma', phone: '9823456781', email: 'amit.sharma@gmail.com', address: 'B-12, Sector 18, Noida', totalOrdersCount: 2 });
  const c1_2 = await Customer.create({ shopId: shop1._id, name: 'Pooja Patel', phone: '9712345678', email: 'pooja.p@yahoo.com', address: 'A-45, Ring Road, Surat', totalOrdersCount: 1 });
  const c1_3 = await Customer.create({ shopId: shop1._id, name: 'Rahul Mehta', phone: '9988776655', address: '104, Sunrise Heights, Mumbai', totalOrdersCount: 3 });

  // Shop 2 Customers
  const c2_1 = await Customer.create({ shopId: shop2._id, name: 'Hardik Trivedi', phone: '9877665544', email: 'hardik.t@outlook.com', address: 'Bhatar Road, Surat', totalOrdersCount: 2 });
  const c2_2 = await Customer.create({ shopId: shop2._id, name: 'Neha Singhania', phone: '9866554433', address: 'Ghod Dod Road, Surat', totalOrdersCount: 1 });

  // Shop 3 Customers
  const c3_1 = await Customer.create({ shopId: shop3._id, name: 'Sanjay Reddy', phone: '9755443322', email: 'sanjay.r@gmail.com', address: 'Koramangala 4th Block, Bengaluru', totalOrdersCount: 1 });

  // Shop 4 Customers
  const c4_1 = await Customer.create({ shopId: shop4._id, name: 'Vikram Choudhary', phone: '9933445566', address: 'Lajpat Nagar, New Delhi', totalOrdersCount: 2 });

  // 4. Create Orders with Realistic Customer Issues
  await Order.create({
    shopId: shop1._id,
    jobId: 'JOB-1042',
    customerId: c1_1._id,
    customerSnapshot: { name: c1_1.name, phone: c1_1.phone },
    deviceType: 'mobile',
    brand: 'Apple',
    model: 'iPhone 13',
    serialOrImei: '356789123456789',
    passcodePattern: '1234',
    problemDescription: 'Shattered front OLED glass, touch erratic on upper left half. Needs display combo replacement and TrueTone calibration.',
    status: 'pending',
    assignedTechnicianId: tech1_1._id,
    cost: { estimated: 4500, final: 4500, advancePaid: 1000, due: 3500 },
    payments: [{ amount: 1000, mode: 'upi', transactionRef: 'UPI-9812491', paidAt: new Date(Date.now() - 3600000 * 2) }],
    smsLogs: [{ type: 'order_received', status: 'sent', providerRef: 'F2S_99120', sentAt: new Date(Date.now() - 3600000 * 2) }],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 2), promisedDeliveryAt: new Date(Date.now() + 3600000 * 24) },
    invoice: { invoiceNumber: 'INV-JOB-1042', issuedAt: new Date() },
    createdBy: user1._id,
  });

  await Order.create({
    shopId: shop1._id,
    jobId: 'JOB-1041',
    customerId: c1_2._id,
    customerSnapshot: { name: c1_2.name, phone: c1_2.phone },
    deviceType: 'laptop',
    brand: 'Dell',
    model: 'Inspiron 15 3511',
    serialOrImei: 'DELL-981249A',
    problemDescription: 'Laptop overheating and shutting down randomly within 15 minutes of booting. Fan makes loud grinding noise. Thermal paste dried.',
    status: 'in_progress',
    assignedTechnicianId: tech1_2._id,
    cost: { estimated: 2200, final: 2200, advancePaid: 500, due: 1700 },
    payments: [{ amount: 500, mode: 'cash', paidAt: new Date(Date.now() - 3600000 * 18) }],
    smsLogs: [{ type: 'order_received', status: 'sent', providerRef: 'F2S_98941', sentAt: new Date(Date.now() - 3600000 * 18) }],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 18), promisedDeliveryAt: new Date(Date.now() + 3600000 * 6) },
    invoice: { invoiceNumber: 'INV-JOB-1041', issuedAt: new Date() },
    createdBy: user1._id,
  });

  await Order.create({
    shopId: shop1._id,
    jobId: 'JOB-1040',
    customerId: c1_3._id,
    customerSnapshot: { name: c1_3.name, phone: c1_3.phone },
    deviceType: 'mobile',
    brand: 'Samsung',
    model: 'Galaxy S22',
    serialOrImei: 'SM-S901B-128',
    problemDescription: 'Battery draining fast (drops from 80% to 20% in 1 hr). Back glass slightly lifted due to swollen lithium pouch cell.',
    status: 'repaired',
    assignedTechnicianId: tech1_1._id,
    cost: { estimated: 2800, final: 2800, advancePaid: 2800, due: 0 },
    payments: [{ amount: 2800, mode: 'upi', transactionRef: 'UPI-771829', paidAt: new Date(Date.now() - 3600000 * 8) }],
    smsLogs: [
      { type: 'order_received', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 24) },
      { type: 'repaired', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 8) },
    ],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 24), promisedDeliveryAt: new Date(Date.now() - 3600000 * 4) },
    invoice: { invoiceNumber: 'INV-JOB-1040', issuedAt: new Date() },
    createdBy: user1._id,
  });

  await Order.create({
    shopId: shop2._id,
    jobId: 'JOB-2025',
    customerId: c2_1._id,
    customerSnapshot: { name: c2_1.name, phone: c2_1.phone },
    deviceType: 'mobile',
    brand: 'OnePlus',
    model: 'OnePlus 11R',
    serialOrImei: 'OP-11R-8812',
    problemDescription: 'Water damage after heavy rain. Phone does not power on, no charging vibration. Customer urgently needs photos retrieved.',
    status: 'in_progress',
    assignedTechnicianId: tech2_1._id,
    cost: { estimated: 5500, final: 5500, advancePaid: 1500, due: 4000 },
    payments: [{ amount: 1500, mode: 'upi', transactionRef: 'GPAY-441029', paidAt: new Date(Date.now() - 3600000 * 12) }],
    smsLogs: [{ type: 'order_received', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 12) }],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 12) },
    invoice: { invoiceNumber: 'INV-JOB-2025', issuedAt: new Date() },
    createdBy: user2._id,
  });

  await Order.create({
    shopId: shop2._id,
    jobId: 'JOB-2026',
    customerId: c2_2._id,
    customerSnapshot: { name: c2_2.name, phone: c2_2.phone },
    deviceType: 'laptop',
    brand: 'HP',
    model: 'Pavilion Gaming 15',
    serialOrImei: 'HP-PVG-3391',
    problemDescription: 'Right hinge cracked and pulling display bezel apart. Keyboard backlight flickering intermittently.',
    status: 'parts_delayed',
    assignedTechnicianId: tech2_2._id,
    cost: { estimated: 3200, final: 3200, advancePaid: 1000, due: 2200 },
    payments: [{ amount: 1000, mode: 'cash', paidAt: new Date(Date.now() - 3600000 * 36) }],
    smsLogs: [{ type: 'order_received', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 36) }],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 36) },
    invoice: { invoiceNumber: 'INV-JOB-2026', issuedAt: new Date() },
    createdBy: user2._id,
  });

  await Order.create({
    shopId: shop3._id,
    jobId: 'JOB-3010',
    customerId: c3_1._id,
    customerSnapshot: { name: c3_1.name, phone: c3_1.phone },
    deviceType: 'tablet',
    brand: 'Apple',
    model: 'iPad Air 5th Gen (M1)',
    serialOrImei: 'DMP881290K',
    problemDescription: 'Type-C charging port loose, only charges when cable held at a specific upward angle.',
    status: 'delivered',
    assignedTechnicianId: tech3_1._id,
    cost: { estimated: 2400, final: 2400, advancePaid: 2400, due: 0 },
    payments: [{ amount: 2400, mode: 'card', transactionRef: 'POS-Swipe-91', paidAt: new Date(Date.now() - 3600000 * 48) }],
    smsLogs: [
      { type: 'order_received', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 72) },
      { type: 'repaired', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 50) },
      { type: 'delivered', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 48) },
    ],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 72), deliveredAt: new Date(Date.now() - 3600000 * 48) },
    invoice: { invoiceNumber: 'INV-JOB-3010', issuedAt: new Date() },
    createdBy: user3._id,
  });

  await Order.create({
    shopId: shop4._id,
    jobId: 'JOB-4048',
    customerId: c4_1._id,
    customerSnapshot: { name: c4_1.name, phone: c4_1.phone },
    deviceType: 'mobile',
    brand: 'Google',
    model: 'Pixel 7 Pro',
    serialOrImei: 'G-P7P-99120',
    problemDescription: 'Camera glass cracked over periscope telephoto lens. Photos look foggy and focus hunts continuously.',
    status: 'pending',
    assignedTechnicianId: tech4_1._id,
    cost: { estimated: 3800, final: 3800, advancePaid: 500, due: 3300 },
    payments: [{ amount: 500, mode: 'upi', transactionRef: 'PTM-88129', paidAt: new Date(Date.now() - 3600000 * 5) }],
    smsLogs: [{ type: 'order_received', status: 'sent', sentAt: new Date(Date.now() - 3600000 * 5) }],
    dates: { receivedAt: new Date(Date.now() - 3600000 * 5) },
    invoice: { invoiceNumber: 'INV-JOB-4048', issuedAt: new Date() },
    createdBy: user4._id,
  });

  return {
    message: 'Seeded successfully: 4 shops, 8 staff/technicians, 7 customers, and 7 orders with realistic customer issues!',
  };
}

module.exports = { seedMultiTenantData };
