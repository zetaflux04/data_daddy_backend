const { Order } = require('../../models/Order');
const { Expense } = require('../../models/Expense');
const mongoose = require('mongoose');

const analyticsController = {
  /**
   * Main Dashboard Metrics
   * GET /api/analytics/summary
   */
  async getDashboardSummary(req, res) {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);

    // 1. Order Status Counts
    const statusCounts = await Order.aggregate([
      { $match: { shopId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap = {
      pending: 0,
      in_progress: 0,
      parts_delayed: 0,
      repaired: 0,
      delivered: 0,
    };
    statusCounts.forEach((item) => {
      if (item._id in statusMap) statusMap[item._id] = item.count;
    });

    // 2. Financial Aggregation from Orders (Total collected vs pending due)
    const financialAgg = await Order.aggregate([
      { $match: { shopId } },
      {
        $group: {
          _id: null,
          totalRevenueCollected: { $sum: '$cost.advancePaid' },
          totalDuesPending: { $sum: '$cost.due' },
          totalEstimatedValue: { $sum: '$cost.final' },
        },
      },
    ]);

    const orderFinance = financialAgg[0] || {
      totalRevenueCollected: 0,
      totalDuesPending: 0,
      totalEstimatedValue: 0,
    };

    // 3. Total Expenses
    const expenseAgg = await Expense.aggregate([
      { $match: { shopId } },
      { $group: { _id: null, totalExpense: { $sum: '$amount' } } },
    ]);

    const totalExpense = expenseAgg[0]?.totalExpense || 0;
    const netProfit = orderFinance.totalRevenueCollected - totalExpense;

    // 4. Today's quick numbers
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayOrdersCount = await Order.countDocuments({
      shopId,
      createdAt: { $gte: startOfToday },
    });

    // 5. Live Weekly Revenue Breakdown (Mon to Sun of current week)
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now7 = new Date();
    const currentDayOfWeek = now7.getDay(); // 0 is Sun, 1 is Mon...
    const mondayDiff = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
    
    const startOfWeek = new Date(now7.getFullYear(), now7.getMonth(), now7.getDate() + mondayDiff, 0, 0, 0, 0);
    const startOfLastWeek = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    const endOfLastWeek = new Date(startOfWeek.getTime() - 1);

    // Aggregate payments received this week
    const thisWeekPayments = await Order.aggregate([
      { $match: { shopId } },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.paidAt': { $gte: startOfWeek },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$payments.paidAt' }, // 1 = Sun, 2 = Mon, 3 = Tue...
          totalAmount: { $sum: '$payments.amount' },
        },
      },
    ]);

    // Aggregate payments received last week for live comparison
    const lastWeekPayments = await Order.aggregate([
      { $match: { shopId } },
      { $unwind: '$payments' },
      {
        $match: {
          'payments.paidAt': { $gte: startOfLastWeek, $lte: endOfLastWeek },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$payments.amount' },
        },
      },
    ]);

    const dayNumberToDayName = { 1: 'Sun', 2: 'Mon', 3: 'Tue', 4: 'Wed', 5: 'Thu', 6: 'Fri', 7: 'Sat' };
    const dailyMap = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    let thisWeekTotalRevenue = 0;

    thisWeekPayments.forEach((item) => {
      const dName = dayNumberToDayName[item._id];
      if (dName && dName in dailyMap) {
        dailyMap[dName] = item.totalAmount || 0;
        thisWeekTotalRevenue += item.totalAmount || 0;
      }
    });

    // Fallback: If no payments array records yet, aggregate by Order.createdAt for this week
    if (thisWeekTotalRevenue === 0 && orderFinance.totalRevenueCollected > 0) {
      const thisWeekOrders = await Order.find({
        shopId,
        createdAt: { $gte: startOfWeek },
      });
      thisWeekOrders.forEach((ord) => {
        const dName = dayNames[new Date(ord.createdAt).getDay()];
        const amt = ord.cost?.advancePaid || 0;
        if (dName in dailyMap) {
          dailyMap[dName] += amt;
          thisWeekTotalRevenue += amt;
        }
      });
    }

    const lastWeekTotal = lastWeekPayments[0]?.totalAmount || 0;
    let revenueGrowthPct = 0;
    if (lastWeekTotal > 0) {
      revenueGrowthPct = Math.round(((thisWeekTotalRevenue - lastWeekTotal) / lastWeekTotal) * 100 * 10) / 10;
    } else if (thisWeekTotalRevenue > 0) {
      revenueGrowthPct = 100;
    }

    const weeklyData = [
      { day: 'Mon', amount: dailyMap['Mon'] },
      { day: 'Tue', amount: dailyMap['Tue'] },
      { day: 'Wed', amount: dailyMap['Wed'] },
      { day: 'Thu', amount: dailyMap['Thu'] },
      { day: 'Fri', amount: dailyMap['Fri'] },
      { day: 'Sat', amount: dailyMap['Sat'] },
      { day: 'Sun', amount: dailyMap['Sun'] },
    ];

    const totalJobsCount = statusMap.pending + statusMap.in_progress + statusMap.parts_delayed + statusMap.repaired + statusMap.delivered;
    const inProgressSum = statusMap.in_progress + statusMap.parts_delayed;
    const calcPct = (cnt) => (totalJobsCount > 0 ? Math.round((cnt / totalJobsCount) * 100) : 0);

    res.json({
      success: true,
      data: {
        jobs: {
          pending: statusMap.pending,
          inProgress: statusMap.in_progress,
          partsDelayed: statusMap.parts_delayed,
          readyForPickup: statusMap.repaired,
          delivered: statusMap.delivered,
          todayNew: todayOrdersCount,
          total: totalJobsCount,
        },
        financials: {
          totalRevenue: orderFinance.totalRevenueCollected,
          totalExpense,
          netProfit,
          totalDuesPending: orderFinance.totalDuesPending,
          thisWeekRevenue: thisWeekTotalRevenue,
          revenueGrowthPct,
        },
        charts: {
          weeklyRevenue: weeklyData,
          statusDistribution: [
            { label: 'Pending', key: 'pending', count: statusMap.pending, percentage: calcPct(statusMap.pending), color: '#F97316' },
            { label: 'In Progress', key: 'in_progress', count: inProgressSum, percentage: calcPct(inProgressSum), color: '#3B82F6' },
            { label: 'Ready', key: 'ready', count: statusMap.repaired, percentage: calcPct(statusMap.repaired), color: '#10B981' },
            { label: 'Delivered', key: 'delivered', count: statusMap.delivered, percentage: calcPct(statusMap.delivered), color: '#8B5CF6' },
          ],
        },
      },
    });
  },

  /**
   * Profit and Loss Detailed Report
   * GET /api/analytics/profit-loss?from=...&to=...
   */
  async getProfitLoss(req, res) {
    const shopId = new mongoose.Types.ObjectId(req.user.shopId);
    const { from, to } = req.query;

    const orderMatch = { shopId };
    const expenseMatch = { shopId };

    if (from || to) {
      const dateFilter = {};
      if (from) dateFilter.$gte = new Date(from);
      if (to) dateFilter.$lte = new Date(to);
      orderMatch.createdAt = dateFilter;
      expenseMatch.date = dateFilter;
    }

    // Revenue by Payment Mode
    const revenueByMode = await Order.aggregate([
      { $match: orderMatch },
      { $unwind: '$payments' },
      {
        $group: {
          _id: '$payments.mode',
          total: { $sum: '$payments.amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    // Expenses by Category
    const expensesByCategory = await Expense.aggregate([
      { $match: expenseMatch },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = revenueByMode.reduce((sum, item) => sum + item.total, 0);
    const totalExpenses = expensesByCategory.reduce((sum, item) => sum + item.total, 0);
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMarginPct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
        },
        revenueByMode,
        expensesByCategory,
      },
    });
  },
};

module.exports = { analyticsController };
