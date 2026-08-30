import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth';
import { Order } from '../../models/Order';
import { Expense } from '../../models/Expense';
import mongoose from 'mongoose';

export const analyticsController = {
  /**
   * Main Dashboard Metrics
   * GET /api/analytics/summary
   */
  async getDashboardSummary(req: AuthRequest, res: Response): Promise<void> {
    const shopId = new mongoose.Types.ObjectId(req.user!.shopId);

    // 1. Order Status Counts
    const statusCounts = await Order.aggregate([
      { $match: { shopId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap: Record<string, number> = {
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
        },
        financials: {
          totalRevenue: orderFinance.totalRevenueCollected,
          totalExpense,
          netProfit,
          totalDuesPending: orderFinance.totalDuesPending,
        },
      },
    });
  },

  /**
   * Profit and Loss Detailed Report
   * GET /api/analytics/profit-loss?from=...&to=...
   */
  async getProfitLoss(req: AuthRequest, res: Response): Promise<void> {
    const shopId = new mongoose.Types.ObjectId(req.user!.shopId);
    const { from, to } = req.query;

    const orderMatch: any = { shopId };
    const expenseMatch: any = { shopId };

    if (from || to) {
      const dateFilter: any = {};
      if (from) dateFilter.$gte = new Date(from as string);
      if (to) dateFilter.$lte = new Date(to as string);
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
