const { Expense } = require('../../models/Expense');

const expenseController = {
  async list(req, res) {
    const { from, to, category, limit = 50, page = 1 } = req.query;
    const filter = { shopId: req.user.shopId };

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .skip((+page - 1) * +limit)
      .limit(+limit);

    const totalCount = await Expense.countDocuments(filter);

    res.json({ success: true, expenses, totalCount });
  },

  async create(req, res) {
    const { category, title, amount, note, date, linkedOrderId } = req.body;
    if (!title || !amount) {
      res.status(400).json({ success: false, message: 'Title and amount are required' });
      return;
    }

    const expense = await Expense.create({
      shopId: req.user.shopId,
      category: category || 'spare_part',
      title: title.trim(),
      amount: Number(amount),
      note: note?.trim() || '',
      date: date ? new Date(date) : new Date(),
      linkedOrderId: linkedOrderId || undefined,
    });

    res.status(201).json({ success: true, expense });
  },

  async delete(req, res) {
    const { id } = req.params;
    await Expense.findOneAndDelete({ _id: id, shopId: req.user.shopId });
    res.json({ success: true, message: 'Expense deleted' });
  },
};

module.exports = { expenseController };
